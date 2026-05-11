"""
API Key Şifreleme / Çözme Yardımcıları
========================================
Fernet simetrik şifreleme kullanarak kullanıcı API anahtarlarını
güvenli şekilde veritabanında saklamamızı sağlar.
"""

import os
import base64
import hashlib
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

def _get_fernet():
    """SECRET_KEY'den deterministik bir Fernet anahtarı türet."""
    secret = os.getenv("SECRET_KEY", "")
    if not secret:
        raise RuntimeError("SECRET_KEY .env dosyasında tanımlı değil!")
    # 32-byte key türet
    key_bytes = hashlib.sha256(secret.encode()).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)

def encrypt_value(plain_text: str) -> str:
    """Düz metni şifrele ve base64 string döndür."""
    f = _get_fernet()
    return f.encrypt(plain_text.encode()).decode()

def decrypt_value(encrypted_text: str) -> str:
    """Şifreli metni çöz ve düz metin döndür."""
    f = _get_fernet()
    return f.decrypt(encrypted_text.encode()).decode()
