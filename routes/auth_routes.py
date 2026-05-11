import re
import os
import time
import secrets
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from flask import Blueprint, request, jsonify, g
from core.database import get_db
from core.security import _create_token, _verify_password
from core.rate_limiter import rate_limit, strict_rate_limit
from core.validators import validate_request, Validator, LOGIN_SCHEMA, REGISTER_SCHEMA
from core.logger import logger, log_security_event
from core.constants import (
    MAX_LOGIN_ATTEMPTS, LOGIN_ATTEMPT_WINDOW_MINUTES,
    EMAIL_VERIFICATION_EXPIRY_HOURS, PASSWORD_RESET_EXPIRY_MINUTES,
    TOKEN_EXPIRY_DAYS, ERROR_MESSAGES, SUCCESS_MESSAGES
)

auth_bp = Blueprint("auth", __name__)

_login_attempts: dict = defaultdict(list)
LOGIN_MAX_ATTEMPTS = MAX_LOGIN_ATTEMPTS
LOGIN_WINDOW_SEC   = LOGIN_ATTEMPT_WINDOW_MINUTES * 60
REQUIRE_EMAIL_VERIFICATION = os.getenv("REQUIRE_EMAIL_VERIFICATION", "false").lower() == "true"

EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')

# ─── LOGIN ───────────────────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
@rate_limit(max_requests=10, window_seconds=60)  # 10 login denemesi/dakika
@validate_request(LOGIN_SCHEMA)
def login():
    data = request.validated_data
    email = data['email']
    pw = data['password']

    ip  = request.remote_addr or "unknown"
    now = time.time()
    attempts = _login_attempts[ip]
    _login_attempts[ip] = [t for t in attempts if now - t < LOGIN_WINDOW_SEC]
    
    if len(_login_attempts[ip]) >= LOGIN_MAX_ATTEMPTS:
        retry_after = int(LOGIN_WINDOW_SEC - (now - _login_attempts[ip][0]))
        log_security_event("login_rate_limit", details=f"IP: {ip}, Email: {email}")
        return jsonify({"error": f"Çok fazla deneme. {retry_after} saniye bekleyin."}), 429
    
    _login_attempts[ip].append(now)

    db   = get_db()
    user = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    
    if not user or not _verify_password(pw, user["password_hash"]):
        log_security_event("login_failed", details=f"Email: {email}, IP: {ip}")
        return jsonify({"error": ERROR_MESSAGES['INVALID_CREDENTIALS']}), 401
    
    if not user["is_active"]:
        log_security_event("login_inactive_account", user_id=user["id"], details=f"Email: {email}")
        return jsonify({"error": "Hesap devre dışı"}), 403
    
    if REQUIRE_EMAIL_VERIFICATION and not user["is_verified"]:
        return jsonify({"error": "Lutfen once e-posta adresinizi dogrulayin"}), 403

    now_iso = datetime.now(timezone.utc).isoformat()
    token = _create_token(user["id"], user["role"])
    db.execute("UPDATE users SET last_login=? WHERE id=?", (now_iso, user["id"]))
    db.execute("INSERT INTO sessions (user_id,token,created_at,expires_at) VALUES (?,?,?,?)",
               (user["id"], token, now_iso,
                (datetime.now(timezone.utc)+timedelta(days=TOKEN_EXPIRY_DAYS)).isoformat()))
    db.commit()
    
    logger.info(f"User logged in successfully: {email} (ID: {user['id']})")
    log_security_event("login_success", user_id=user["id"], details=f"Email: {email}, IP: {ip}")

    return jsonify({
        "message": SUCCESS_MESSAGES['LOGIN_SUCCESS'],
        "token":   token,
        "user": {"id":user["id"],"first_name":user["first_name"],"last_name":user["last_name"],
                 "email":user["email"],"phone":user["phone"],"role":user["role"]}
    })

# ─── REGISTER ────────────────────────────────────────────────────────────────
@auth_bp.route("/register", methods=["POST"])
@rate_limit(max_requests=5, window_seconds=300)  # 5 kayıt/5 dakika
@validate_request(REGISTER_SCHEMA)
def register():
    data = request.validated_data
    first = data['first_name']
    last = data['last_name']
    email = data['email']
    pw = data['password']
    phone = data.get('phone', '')

    db = get_db()
    if db.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone():
        logger.warning(f"Registration attempt with existing email: {email}")
        return jsonify({"error": ERROR_MESSAGES['EMAIL_EXISTS']}), 400

    from core.security import _hash_password
    pw_hash = _hash_password(pw)
    now = datetime.now(timezone.utc).isoformat()
    is_verified = 0 if REQUIRE_EMAIL_VERIFICATION else 1
    
    try:
        db.execute("INSERT INTO users (first_name,last_name,email,phone,password_hash,is_verified,created_at) VALUES (?,?,?,?,?,?,?)",
                   (first, last, email, phone, pw_hash, is_verified, now))
        uid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        db.execute("INSERT INTO bot_configs (user_id, updated_at) VALUES (?, ?)", (uid, now))
        db.execute("INSERT INTO notifications (user_id, type, title, message, created_at) VALUES (?,?,?,?,?)",
                   (uid, "welcome", "Hoş Geldiniz!", "Kaydınız tamamlandı. TB Platformuna hoş geldiniz.", now))

        if REQUIRE_EMAIL_VERIFICATION:
            token = secrets.token_urlsafe(32)
            expires = (datetime.now(timezone.utc) + timedelta(hours=EMAIL_VERIFICATION_EXPIRY_HOURS)).isoformat()
            db.execute("INSERT INTO email_verifications (user_id, token, created_at, expires_at) VALUES (?,?,?,?)",
                       (uid, token, now, expires))

        db.commit()
        
        logger.info(f"New user registered: {email} (ID: {uid})")
        log_security_event("user_registered", user_id=uid, details=f"Email: {email}")

        if REQUIRE_EMAIL_VERIFICATION:
            try:
                from core.mailer import send_verification
                send_verification(email, first, token)
            except Exception as e:
                logger.error(f"Failed to send verification email to {email}: {e}", exc_info=True)

        return jsonify({
            "message": SUCCESS_MESSAGES['REGISTER_SUCCESS'] + (" E-posta dogrulama linki gonderildi." if REQUIRE_EMAIL_VERIFICATION else " Giriş yapabilirsiniz."),
            "email": email
        }), 201
        
    except Exception as e:
        logger.error(f"Registration error for {email}: {e}", exc_info=True)
        return jsonify({"error": ERROR_MESSAGES['DATABASE_ERROR']}), 500

# ─── E-POSTA DOĞRULAMA ───────────────────────────────────────────────────────
@auth_bp.route("/verify-email", methods=["POST"])
def verify_email():
    d     = request.get_json() or {}
    token = (d.get("token") or "").strip()
    if not token:
        return jsonify({"error": "Token gerekli"}), 400

    db  = get_db()
    now = datetime.now(timezone.utc).isoformat()
    row = db.execute("SELECT * FROM email_verifications WHERE token=?", (token,)).fetchone()

    if not row:
        return jsonify({"error": "Geçersiz doğrulama linki"}), 400
    if row["used"]:
        return jsonify({"error": "Bu link daha önce kullanılmış"}), 400
    if now > row["expires_at"]:
        return jsonify({"error": "Doğrulama linki süresi dolmuş"}), 400

    db.execute("UPDATE users SET is_verified=1 WHERE id=?", (row["user_id"],))
    db.execute("UPDATE email_verifications SET used=1 WHERE id=?", (row["id"],))

    # Otomatik token oluşturup giriş yaptır
    user = db.execute("SELECT * FROM users WHERE id=?", (row["user_id"],)).fetchone()
    login_token = _create_token(user["id"], user["role"])
    db.execute("INSERT INTO sessions (user_id,token,created_at,expires_at) VALUES (?,?,?,?)",
               (user["id"], login_token, now,
                (datetime.now(timezone.utc)+timedelta(days=7)).isoformat()))
    db.commit()

    return jsonify({
        "message": "E-posta adresiniz başarıyla doğrulandı!",
        "token":   login_token,
        "user": {"id":user["id"],"first_name":user["first_name"],"last_name":user["last_name"],
                 "email":user["email"],"phone":user["phone"],"role":user["role"]}
    })

# ─── DOĞRULAMA MAİLİ YENİDEN GÖNDER ─────────────────────────────────────────
@auth_bp.route("/resend-verification", methods=["POST"])
def resend_verification():
    d     = request.get_json() or {}
    email = (d.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "E-posta gerekli"}), 400

    db   = get_db()
    user = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not user:
        return jsonify({"message": "E-posta gönderildi (eğer hesap varsa)"}), 200
    if user["is_verified"]:
        return jsonify({"error": "Bu hesap zaten doğrulanmış"}), 400

    # Eski tokenları geçersiz kıl
    db.execute("UPDATE email_verifications SET used=1 WHERE user_id=?", (user["id"],))
    token   = secrets.token_urlsafe(32)
    now     = datetime.now(timezone.utc).isoformat()
    expires = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    db.execute("INSERT INTO email_verifications (user_id, token, created_at, expires_at) VALUES (?,?,?,?)",
               (user["id"], token, now, expires))
    db.commit()

    try:
        from core.mailer import send_verification
        send_verification(email, user["first_name"], token)
    except Exception as e:
        print(f"[AUTH] Mail gönderme hatası: {e}")

    return jsonify({"message": "Doğrulama maili tekrar gönderildi"})

# ─── ŞİFRE SIFIRLAMA — KOD GÖNDER ───────────────────────────────────────────
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    d     = request.get_json() or {}
    email = (d.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "E-posta gerekli"}), 400

    db   = get_db()
    user = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    # Güvenlik: kullanıcı yoksa da aynı mesajı ver
    if not user:
        return jsonify({"message": "Kod gönderildi (eğer hesap varsa)"}), 200

    # Eski kodları geçersiz kıl
    db.execute("UPDATE password_resets SET used=1 WHERE user_id=?", (user["id"],))
    code    = str(secrets.randbelow(900000) + 100000)  # 6 haneli
    now     = datetime.now(timezone.utc).isoformat()
    expires = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    db.execute("INSERT INTO password_resets (user_id, code, created_at, expires_at) VALUES (?,?,?,?)",
               (user["id"], code, now, expires))
    db.commit()

    # E-posta gönderme işlemi
    mail_sent = False
    try:
        from core.mailer import send_reset_code
        mail_sent = send_reset_code(email, user["first_name"], code)
        print(f"[AUTH] Reset code mail gönderildi: {email}, kod: {code}, başarılı: {mail_sent}")
    except Exception as e:
        print(f"[AUTH] Reset mail hatası: {e}")
        import traceback
        traceback.print_exc()

    if mail_sent:
        return jsonify({"message": "Şifre sıfırlama kodu e-posta adresinize gönderildi"})
    else:
        # E-posta gönderilemedi ama güvenlik için aynı mesajı ver
        print(f"[AUTH] E-posta gönderilemedi ama kullanıcıya başarılı mesajı veriliyor: {email}")
        return jsonify({"message": "Şifre sıfırlama kodu e-posta adresinize gönderildi"})

# ─── ŞİFRE SIFIRLAMA — KOD DOĞRULA ──────────────────────────────────────────
@auth_bp.route("/verify-reset-code", methods=["POST"])
def verify_reset_code():
    d     = request.get_json() or {}
    email = (d.get("email") or "").strip().lower()
    code  = (d.get("code")  or "").strip()
    if not email or not code:
        return jsonify({"error": "E-posta ve kod gerekli"}), 400

    db   = get_db()
    now  = datetime.now(timezone.utc).isoformat()
    user = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not user:
        return jsonify({"error": "Geçersiz kod"}), 400

    row = db.execute(
        "SELECT * FROM password_resets WHERE user_id=? AND code=? AND used=0 ORDER BY id DESC LIMIT 1",
        (user["id"], code)
    ).fetchone()

    if not row:
        return jsonify({"error": "Geçersiz veya hatalı kod"}), 400
    if now > row["expires_at"]:
        return jsonify({"error": "Kodun süresi dolmuş. Yeni kod isteyin."}), 400

    # Kod doğru, geçici reset token üret
    reset_token = secrets.token_urlsafe(24)
    # Kodu kullanılmış işaretle değil, reset_token'ı code alanında sakla (basit yaklaşım)
    db.execute("UPDATE password_resets SET code=? WHERE id=?", (reset_token, row["id"]))
    db.commit()

    return jsonify({"message": "Kod doğrulandı", "reset_token": reset_token})

# ─── ŞİFRE SIFIRLAMA — YENİ ŞİFRE ───────────────────────────────────────────
@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    d           = request.get_json() or {}
    email       = (d.get("email")       or "").strip().lower()
    reset_token = (d.get("reset_token") or "").strip()
    new_pw      = (d.get("new_password") or "")

    if not all([email, reset_token, new_pw]):
        return jsonify({"error": "Tüm alanlar gerekli"}), 400
    if len(new_pw) < 8:
        return jsonify({"error": "Şifre en az 8 karakter olmalı"}), 400

    db   = get_db()
    now  = datetime.now(timezone.utc).isoformat()
    user = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not user:
        return jsonify({"error": "Geçersiz işlem"}), 400

    row = db.execute(
        "SELECT * FROM password_resets WHERE user_id=? AND code=? AND used=0 ORDER BY id DESC LIMIT 1",
        (user["id"], reset_token)
    ).fetchone()
    if not row:
        return jsonify({"error": "Geçersiz veya süresi dolmuş işlem"}), 400
    if now > row["expires_at"]:
        return jsonify({"error": "İşlem süresi dolmuş. Yeniden başlayın."}), 400

    from core.security import _hash_password
    db.execute("UPDATE users SET password_hash=? WHERE id=?", (_hash_password(new_pw), user["id"]))
    db.execute("UPDATE password_resets SET used=1 WHERE id=?", (row["id"],))
    # Tüm oturumları kapat
    db.execute("UPDATE sessions SET revoked=1 WHERE user_id=?", (user["id"],))
    db.commit()

    return jsonify({"message": "Şifreniz başarıyla güncellendi! Giriş yapabilirsiniz."})

# ─── LOGOUT ──────────────────────────────────────────────────────────────────
@auth_bp.route("/logout", methods=["POST"])
def logout():
    token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if token:
        db = get_db()
        db.execute("UPDATE sessions SET revoked=1 WHERE token=?", (token,))
        db.commit()
    return jsonify({"message": "Çıkış yapıldı"})
