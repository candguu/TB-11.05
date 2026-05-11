from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, g
from core.database import get_db
from core.security import require_auth, _hash_password, _verify_password
from core.mailer import send_reset_code
import re
import secrets

user_bp = Blueprint("user", __name__)


def _bool_value(value):
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, str):
        return 1 if value.lower() in ("1", "true", "yes", "on") else 0
    return 1 if value else 0


def _ensure_settings(db, user_id):
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT OR IGNORE INTO user_settings (user_id, updated_at) VALUES (?, ?)",
        (user_id, now)
    )

@user_bp.route("/me", methods=["GET"])
@require_auth
def get_me():
    try:
        db = get_db()
        u = db.execute("SELECT id,first_name,last_name,email,phone,country,language,role,created_at FROM users WHERE id=?", (g.user_id,)).fetchone()
        if not u:
            return jsonify({"error": "Kullanici bulunamadi"}), 404
        return jsonify({
            "id": u["id"], "first_name": u["first_name"], "last_name": u["last_name"],
            "email": u["email"], "phone": u["phone"], "country": dict(u).get("country", "TR") or "TR",
            "language": dict(u).get("language", "tr") or "tr", "role": u["role"], "created_at": u["created_at"]
        })
    except Exception as e:
        import traceback
        return jsonify({"debug_traceback": traceback.format_exc()}), 500

@user_bp.route("/password", methods=["PUT"])
@require_auth
def update_password():
    d = request.get_json() or {}
    old_pw = d.get("old_password","")
    new_pw = d.get("new_password","")
    if len(new_pw) < 6:
        return jsonify({"error": "Yeni sifre en az 6 karakter olmali"}), 400

    db = get_db()
    u = db.execute("SELECT password_hash FROM users WHERE id=?", (g.user_id,)).fetchone()
    if not _verify_password(old_pw, u["password_hash"]):
        return jsonify({"error": "Mevcut sifre yanlis"}), 400

    db.execute("UPDATE users SET password_hash=? WHERE id=?", (_hash_password(new_pw), g.user_id))
    db.commit()
    return jsonify({"message": "Sifre guncellendi"})

@user_bp.route("/notifications", methods=["GET"])
@require_auth
def get_notifications():
    db = get_db()
    nots = db.execute("SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 20", (g.user_id,)).fetchall()
    return jsonify([{
        "id": n["id"], "type": n["type"], "title": n["title"],
        "message": n["message"], "is_read": bool(n["is_read"]), "date": n["created_at"]
    } for n in nots])

@user_bp.route("/notifications/read", methods=["POST"])
@require_auth
def mark_notifications_read():
    db = get_db()
    db.execute("UPDATE notifications SET is_read=1 WHERE user_id=? AND is_read=0", (g.user_id,))
    db.commit()
    return jsonify({"message": "Okundu isaretlendi"})


@user_bp.route("/settings", methods=["GET", "PUT"])
@require_auth
def user_settings():
    db = get_db()
    _ensure_settings(db, g.user_id)
    if request.method == "PUT":
        d = request.get_json() or {}
        updates = []
        params = []
        for field in ("currency", "theme"):
            if field in d:
                updates.append(f"{field}=?")
                params.append(str(d.get(field) or "").strip())
        if "language" in d:
            db.execute("UPDATE users SET language=? WHERE id=?", ((d.get("language") or "tr").strip(), g.user_id))
        if "auto_logout_minutes" in d:
            updates.append("auto_logout_minutes=?")
            params.append(max(5, min(int(d.get("auto_logout_minutes") or 30), 1440)))
        if updates:
            updates.append("updated_at=?")
            params.append(datetime.now(timezone.utc).isoformat())
            params.append(g.user_id)
            db.execute(f"UPDATE user_settings SET {', '.join(updates)} WHERE user_id=?", params)
        db.commit()
    row = db.execute("SELECT * FROM user_settings WHERE user_id=?", (g.user_id,)).fetchone()
    u = db.execute("SELECT language FROM users WHERE id=?", (g.user_id,)).fetchone()
    return jsonify({
        "language": u["language"] if u else "tr",
        "currency": row["currency"],
        "theme": row["theme"],
        "auto_logout_minutes": row["auto_logout_minutes"],
    })


@user_bp.route("/notifications", methods=["PUT"])
@require_auth
def update_notification_settings():
    db = get_db()
    _ensure_settings(db, g.user_id)
    d = request.get_json() or {}
    db.execute(
        """UPDATE user_settings
           SET email_notifications=?, trade_notifications=?, security_alerts=?,
               price_alerts=?, updated_at=?
           WHERE user_id=?""",
        (
            _bool_value(d.get("email_notifications")),
            _bool_value(d.get("trade_notifications")),
            _bool_value(d.get("security_alerts")),
            _bool_value(d.get("price_alerts")),
            datetime.now(timezone.utc).isoformat(),
            g.user_id,
        )
    )
    db.commit()
    return jsonify({"message": "Bildirim ayarlari kaydedildi"})


@user_bp.route("/security", methods=["PUT"])
@require_auth
def update_security_settings():
    db = get_db()
    _ensure_settings(db, g.user_id)
    d = request.get_json() or {}
    auto_logout = max(5, min(int(d.get("auto_logout_minutes") or 30), 1440))
    db.execute(
        """UPDATE user_settings
           SET auto_logout_minutes=?, api_whitelist=?, updated_at=?
           WHERE user_id=?""",
        (
            auto_logout,
            _bool_value(d.get("api_whitelist")),
            datetime.now(timezone.utc).isoformat(),
            g.user_id,
        )
    )
    db.commit()
    return jsonify({"message": "Guvenlik ayarlari kaydedildi"})


@user_bp.route("/trading-settings", methods=["PUT"])
@require_auth
def update_trading_settings():
    db = get_db()
    _ensure_settings(db, g.user_id)
    d = request.get_json() or {}
    db.execute(
        "UPDATE user_settings SET auto_trading=?, updated_at=? WHERE user_id=?",
        (_bool_value(d.get("auto_trading")), datetime.now(timezone.utc).isoformat(), g.user_id)
    )
    db.commit()
    return jsonify({"message": "Trading ayarlari kaydedildi"})

@user_bp.route("/profile", methods=["PUT"])
@require_auth
def update_profile():
    d = request.get_json() or {}
    first = (d.get("first_name") or "").strip()
    last  = (d.get("last_name")  or "").strip()
    phone = (d.get("phone")      or "").strip()
    email = (d.get("email")      or "").strip()
    country = (d.get("country")  or "TR").strip()
    language = (d.get("language") or "tr").strip()
    
    # Email validation
    if email:
        email_regex = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, email):
            return jsonify({"error": "Geçerli bir e-posta adresi giriniz"}), 400
        
        # Check if email already exists for another user
        db = get_db()
        existing = db.execute("SELECT id FROM users WHERE email=? AND id!=?", (email, g.user_id)).fetchone()
        if existing:
            return jsonify({"error": "Bu e-posta adresi zaten kullanılıyor"}), 400
    
    # Turkish phone validation (05XX XXX XX XX format)
    if phone:
        phone_clean = re.sub(r'[\s\-\(\)]', '', phone)
        if not re.match(r'^(0|\+90)?5\d{9}$', phone_clean):
            return jsonify({"error": "Geçerli bir Türkiye telefon numarası giriniz (05XX XXX XX XX)"}), 400
        # Normalize to 05XXXXXXXXX format
        if phone_clean.startswith('+90'):
            phone_clean = '0' + phone_clean[3:]
        elif not phone_clean.startswith('0'):
            phone_clean = '0' + phone_clean
        phone = phone_clean

    db = get_db()
    
    # Build update query dynamically
    updates = []
    params = []
    
    if first:
        updates.append("first_name=?")
        params.append(first)
    if last:
        updates.append("last_name=?")
        params.append(last)
    if phone:
        updates.append("phone=?")
        params.append(phone)
    if email:
        updates.append("email=?")
        params.append(email)
    if country:
        updates.append("country=?")
        params.append(country)
    if language:
        updates.append("language=?")
        params.append(language)
    
    params.append(g.user_id)
    
    if updates:
        query = f"UPDATE users SET {', '.join(updates)} WHERE id=?"
        db.execute(query, params)
        db.commit()
    
    return jsonify({"message": "Profil guncellendi"})

@user_bp.route("/delete", methods=["DELETE"])
@require_auth
def delete_account():
    db = get_db()
    db.execute("DELETE FROM notifications WHERE user_id=?", (g.user_id,))
    db.execute("DELETE FROM user_settings WHERE user_id=?", (g.user_id,))
    db.execute("DELETE FROM bot_configs WHERE user_id=?", (g.user_id,))
    db.execute("DELETE FROM sessions WHERE user_id=?", (g.user_id,))
    db.execute("DELETE FROM users WHERE id=?", (g.user_id,))
    db.commit()
    return jsonify({"message": "Hesap silindi"})

# ─── ŞİFRE DEĞİŞTİRME — KOD GÖNDER ───────────────────────────────────────────
@user_bp.route("/change-password/send-code", methods=["POST"])
@require_auth
def send_password_change_code():
    """Kullanıcının e-postasına 6 haneli kod gönder"""
    db = get_db()
    u = db.execute("SELECT email, first_name FROM users WHERE id=?", (g.user_id,)).fetchone()
    if not u:
        return jsonify({"error": "Kullanıcı bulunamadı"}), 404
    
    # 6 haneli kod oluştur
    code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    # Kodu veritabanına kaydet (15 dakika geçerli)
    expires_at = (datetime.now() + timedelta(minutes=15)).isoformat()
    
    # Eski kodları sil
    db.execute("DELETE FROM password_reset_codes WHERE user_id=?", (g.user_id,))
    
    # Yeni kodu kaydet
    db.execute(
        "INSERT INTO password_reset_codes (user_id, code, expires_at) VALUES (?, ?, ?)",
        (g.user_id, code, expires_at)
    )
    db.commit()
    
    # E-posta gönder
    if send_reset_code(u["email"], u["first_name"], code):
        return jsonify({"message": "Doğrulama kodu e-postanıza gönderildi"})
    else:
        return jsonify({"error": "E-posta gönderilemedi"}), 500

# ─── ŞİFRE DEĞİŞTİRME — KODU DOĞRULA ───────────────────────────────────────────
@user_bp.route("/change-password/verify-code", methods=["POST"])
@require_auth
def verify_password_change_code():
    """Kullanıcının girdiği kodu doğrula"""
    d = request.get_json() or {}
    code = (d.get("code") or "").strip()
    
    if not code or len(code) != 6:
        return jsonify({"error": "Geçerli bir kod giriniz"}), 400
    
    db = get_db()
    saved = db.execute(
        "SELECT code, expires_at FROM password_reset_codes WHERE user_id=? ORDER BY id DESC LIMIT 1",
        (g.user_id,)
    ).fetchone()
    
    if not saved:
        return jsonify({"error": "Kod bulunamadı. Lütfen yeni kod isteyin"}), 404
    
    # Süre kontrolü
    if datetime.now() > datetime.fromisoformat(saved["expires_at"]):
        return jsonify({"error": "Kod süresi doldu. Lütfen yeni kod isteyin"}), 400
    
    # Kod kontrolü
    if saved["code"] != code:
        return jsonify({"error": "Kod hatalı"}), 400
    
    return jsonify({"message": "Kod doğrulandı"})

# ─── ŞİFRE DEĞİŞTİRME — YENİ ŞİFRE ───────────────────────────────────────────
@user_bp.route("/change-password/update", methods=["POST"])
@require_auth
def update_password_with_code():
    """Kod doğrulandıktan sonra şifreyi değiştir"""
    d = request.get_json() or {}
    code = (d.get("code") or "").strip()
    new_password = (d.get("new_password") or "").strip()
    
    if not code or len(code) != 6:
        return jsonify({"error": "Geçerli bir kod giriniz"}), 400
    
    if len(new_password) < 6:
        return jsonify({"error": "Yeni şifre en az 6 karakter olmalıdır"}), 400
    
    db = get_db()
    saved = db.execute(
        "SELECT code, expires_at FROM password_reset_codes WHERE user_id=? ORDER BY id DESC LIMIT 1",
        (g.user_id,)
    ).fetchone()
    
    if not saved:
        return jsonify({"error": "Kod bulunamadı"}), 404
    
    # Süre kontrolü
    if datetime.now() > datetime.fromisoformat(saved["expires_at"]):
        return jsonify({"error": "Kod süresi doldu"}), 400
    
    # Kod kontrolü
    if saved["code"] != code:
        return jsonify({"error": "Kod hatalı"}), 400
    
    # Şifreyi güncelle
    db.execute("UPDATE users SET password_hash=? WHERE id=?", (_hash_password(new_password), g.user_id))
    
    # Kullanılan kodu sil
    db.execute("DELETE FROM password_reset_codes WHERE user_id=?", (g.user_id,))
    db.commit()
    
    return jsonify({"message": "Şifreniz başarıyla değiştirildi"})
