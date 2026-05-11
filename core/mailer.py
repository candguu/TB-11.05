"""
TB Trading Bot - Mail Gönderme Modülü
SMTP (Gmail veya başka provider) ile mail gönderir.
.env'e şunları ekleyin:
  MAIL_HOST=smtp.gmail.com
  MAIL_PORT=587
  MAIL_USER=senin@gmail.com
  MAIL_PASS=uygulama_sifresi
  MAIL_FROM=TB Trading Bot <senin@gmail.com>
  APP_URL=http://localhost:5000
"""
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

MAIL_HOST = os.getenv("MAIL_HOST", "smtp.gmail.com")
MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
MAIL_USER = os.getenv("MAIL_USER", "")
MAIL_PASS = os.getenv("MAIL_PASS", "")
MAIL_FROM = os.getenv("MAIL_FROM", f"TB Trading Bot <{MAIL_USER}>")
APP_URL   = os.getenv("APP_URL", "http://localhost:5000")

def _send(to: str, subject: str, html: str) -> bool:
    """Tek mail gönder. Başarılıysa True, hata varsa False döner."""
    if not MAIL_USER or not MAIL_PASS:
        print(f"[MAIL] UYARI: MAIL_USER/MAIL_PASS tanımlı değil. Mail gönderilmedi -> {to}")
        print(f"[MAIL] Konu: {subject}")
        print(f"[MAIL] MAIL_USER: {MAIL_USER}")
        print(f"[MAIL] MAIL_PASS: {'*' * len(MAIL_PASS) if MAIL_PASS else 'BOŞ'}")
        return False
    
    print(f"[MAIL] Mail gönderme denemesi -> {to}")
    print(f"[MAIL] SMTP: {MAIL_HOST}:{MAIL_PORT}")
    print(f"[MAIL] From: {MAIL_FROM}")
    
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = MAIL_FROM
        msg["To"]      = to
        msg.attach(MIMEText(html, "html", "utf-8"))
        
        print(f"[MAIL] SMTP bağlantısı kuruluyor...")
        with smtplib.SMTP(MAIL_HOST, MAIL_PORT) as s:
            s.ehlo()
            print(f"[MAIL] STARTTLS başlatılıyor...")
            s.starttls()
            print(f"[MAIL] Login yapılıyor...")
            s.login(MAIL_USER, MAIL_PASS)
            print(f"[MAIL] Mail gönderiliyor...")
            s.sendmail(MAIL_FROM, to, msg.as_string())
        print(f"[MAIL] ✅ Başarıyla gönderildi -> {to}")
        return True
    except Exception as e:
        print(f"[MAIL] ❌ HATA -> {to}: {e}")
        import traceback
        traceback.print_exc()
        return False

def send_verification(to: str, first_name: str, token: str) -> bool:
    link = f"{APP_URL}/verify-email?token={token}"
    html = f"""<!DOCTYPE html><html><body style="margin:0;padding:0;background:#000;font-family:Inter,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border:1px solid #1c1c1c;border-radius:16px;overflow:hidden;">
      <tr><td style="background:linear-gradient(135deg,#448aff,#00e676);padding:32px;text-align:center;">
        <div style="font-size:28px;font-weight:800;color:#000;letter-spacing:-1px;">TB</div>
        <div style="font-size:13px;color:#000;opacity:.7;margin-top:4px;">Trading Bot</div>
      </td></tr>
      <tr><td style="padding:40px 36px;">
        <h2 style="color:#fff;font-size:22px;margin:0 0 12px;">Merhaba, {first_name}! 👋</h2>
        <p style="color:#999;font-size:15px;line-height:1.7;margin:0 0 28px;">
          TB Trading Bot'a hoş geldiniz. Hesabınızı aktifleştirmek için aşağıdaki butona tıklayın.
          Bu link <strong style="color:#fff;">24 saat</strong> geçerlidir.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="{link}" style="display:inline-block;background:linear-gradient(135deg,#448aff,#00e676);color:#000;font-weight:700;font-size:15px;padding:16px 40px;border-radius:12px;text-decoration:none;letter-spacing:.3px;">
            ✉ E-postamı Doğrula
          </a>
        </div>
        <p style="color:#555;font-size:12px;line-height:1.6;margin:0;">
          Butona tıklanamıyorsanız bu linki kopyalayın:<br>
          <a href="{link}" style="color:#448aff;word-break:break-all;">{link}</a>
        </p>
      </td></tr>
      <tr><td style="padding:20px 36px;border-top:1px solid #1c1c1c;text-align:center;">
        <p style="color:#555;font-size:11px;margin:0;">Bu maili siz istemediyseniz görmezden gelebilirsiniz.<br>© 2025 TB Trading Bot</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>"""
    return _send(to, "TB Trading Bot — E-posta Adresinizi Doğrulayın", html)

def send_reset_code(to: str, first_name: str, code: str) -> bool:
    html = f"""<!DOCTYPE html><html><body style="margin:0;padding:0;background:#000;font-family:Inter,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border:1px solid #1c1c1c;border-radius:16px;overflow:hidden;">
      <tr><td style="background:linear-gradient(135deg,#ff6b35,#ff1744);padding:32px;text-align:center;">
        <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-1px;">TB</div>
        <div style="font-size:13px;color:#fff;opacity:.7;margin-top:4px;">Trading Bot</div>
      </td></tr>
      <tr><td style="padding:40px 36px;">
        <h2 style="color:#fff;font-size:22px;margin:0 0 12px;">Şifre Sıfırlama 🔐</h2>
        <p style="color:#999;font-size:15px;line-height:1.7;margin:0 0 28px;">
          Merhaba <strong style="color:#fff;">{first_name}</strong>, şifre sıfırlama talebinizi aldık.
          Aşağıdaki 6 haneli kodu girin. Kod <strong style="color:#fff;">15 dakika</strong> geçerlidir.
        </p>
        <div style="background:#111;border:1px solid #2a2a2a;border-radius:12px;padding:28px;text-align:center;margin:24px 0;">
          <div style="font-size:40px;font-weight:800;letter-spacing:16px;color:#fff;font-family:'Courier New',monospace;">{code}</div>
          <div style="color:#555;font-size:12px;margin-top:8px;">Şifre Sıfırlama Kodu</div>
        </div>
        <p style="color:#555;font-size:13px;line-height:1.6;margin:0;">
          Bu işlemi siz yapmadıysanız, hesabınız güvende demektir. Bu maili görmezden gelebilirsiniz.
        </p>
      </td></tr>
      <tr><td style="padding:20px 36px;border-top:1px solid #1c1c1c;text-align:center;">
        <p style="color:#555;font-size:11px;margin:0;">© 2025 TB Trading Bot</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>"""
    return _send(to, "TB Trading Bot — Şifre Sıfırlama Kodu", html)
