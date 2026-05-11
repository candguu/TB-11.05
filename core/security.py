import os
import json
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, g
from dotenv import load_dotenv

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY .env dosyasinda tanimli degil! Lutfen .env dosyasini kontrol edin.")

def _hash_password(password: str) -> str:
    salt = hashlib.sha256(os.urandom(32)).hexdigest()
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260000)
    return f"{salt}${hashed.hex()}"

def _verify_password(password: str, stored: str) -> bool:
    try:
        salt, hashed = stored.split("$")
        check = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260000)
        return hmac.compare_digest(check.hex(), hashed)
    except Exception:
        return False

def _create_token(user_id: int, role: str) -> str:
    payload = {
        "user_id": user_id, "role": role,
        "exp": (datetime.now(timezone.utc)+timedelta(days=7)).isoformat(),
        "jti": secrets.token_hex(16),
    }
    b64 = json.dumps(payload).encode().hex()
    sig = hmac.new(SECRET_KEY.encode(), b64.encode(), hashlib.sha256).hexdigest()
    return f"{b64}.{sig}"

def _decode_token(token: str):
    from core.database import get_db
    try:
        b64, sig = token.rsplit(".", 1)
        expected = hmac.new(SECRET_KEY.encode(), b64.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(bytes.fromhex(b64).decode())
        if datetime.now(timezone.utc) > datetime.fromisoformat(payload["exp"]):
            return None
            
        # Otorum tablosundan iptal (revoked) kontrolü
        try:
            db = get_db()
            session = db.execute("SELECT revoked FROM sessions WHERE token=?", (token,)).fetchone()
            if session and session["revoked"] == 1:
                # Session explicitly revoked
                return None
            # If session not found or any other case, allow the token (it's valid by signature and expiry)
        except Exception as e:
            print(f"[AUTH] Session check error (non-fatal): {e}")
            # Don't fail auth on DB errors - token is still valid by signature

        return payload
    except Exception as e:
        print(f"[AUTH] Token decode error: {e}")
        return None

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization","").replace("Bearer ","").strip()
        if not token:
            return jsonify({"error": "Token gerekli"}), 401
        payload = _decode_token(token)
        if not payload:
            return jsonify({"error": "Gecersiz token"}), 401
        g.user_id = payload["user_id"]
        g.role    = payload["role"]
        return f(*args, **kwargs)
    return decorated

# ═══════════════════════════════════════════════════════════════
# API KEY ENCRYPTION
# ═══════════════════════════════════════════════════════════════

def encrypt_api_key(api_key: str) -> str:
    """API anahtarını şifrele (basit XOR encryption)"""
    if not api_key:
        return ""
    
    key = SECRET_KEY.encode()
    encrypted = []
    
    for i, char in enumerate(api_key):
        key_char = key[i % len(key)]
        encrypted_char = chr(ord(char) ^ key_char)
        encrypted.append(encrypted_char)
    
    return ''.join(encrypted).encode().hex()

def decrypt_api_key(encrypted_hex: str) -> str:
    """Şifrelenmiş API anahtarını çöz"""
    if not encrypted_hex:
        return ""
    
    try:
        encrypted = bytes.fromhex(encrypted_hex).decode()
        key = SECRET_KEY.encode()
        decrypted = []
        
        for i, char in enumerate(encrypted):
            key_char = key[i % len(key)]
            decrypted_char = chr(ord(char) ^ key_char)
            decrypted.append(decrypted_char)
        
        return ''.join(decrypted)
    except:
        return ""


# New definitions intentionally override the legacy XOR helpers above. Keeping
# legacy decrypt support lets existing rows keep working during the transition.
def encrypt_api_key(api_key: str) -> str:
    if not api_key:
        return ""
    from core.crypto_utils import encrypt_value
    return encrypt_value(api_key)


def _legacy_xor_decrypt(encrypted_hex: str) -> str:
    encrypted = bytes.fromhex(encrypted_hex).decode()
    key = SECRET_KEY.encode()
    decrypted = []
    for i, char in enumerate(encrypted):
        key_char = key[i % len(key)]
        decrypted_char = chr(ord(char) ^ key_char)
        decrypted.append(decrypted_char)
    return ''.join(decrypted)


def decrypt_api_key(encrypted_text: str) -> str:
    if not encrypted_text:
        return ""
    try:
        from core.crypto_utils import decrypt_value
        return decrypt_value(encrypted_text)
    except Exception:
        try:
            return _legacy_xor_decrypt(encrypted_text)
        except Exception:
            return ""
