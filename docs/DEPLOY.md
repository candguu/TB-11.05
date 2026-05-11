# Render'a Deploy Adımları

## 1. GitHub'a Yükle

```bash
# Git başlat (eğer yoksa)
git init

# Dosyaları ekle
git add .

# Commit yap
git commit -m "Initial commit - TB Trading Bot"

# GitHub'da yeni repo oluştur (tarayıcıdan)
# Sonra bağla:
git remote add origin https://github.com/KULLANICI_ADIN/tb-trading-bot.git
git branch -M main
git push -u origin main
```

## 2. Render Hesabı Aç

1. https://render.com adresine git
2. "Get Started for Free" tıkla
3. GitHub ile giriş yap

## 3. Web Service Oluştur

1. Dashboard'da "New +" butonuna tıkla
2. "Web Service" seç
3. GitHub repo'nu bul ve "Connect" tıkla

## 4. Ayarları Yap

**Name:** tb-trading-bot (veya istediğin isim)

**Region:** Frankfurt (veya en yakın)

**Branch:** main

**Root Directory:** (boş bırak)

**Runtime:** Python 3

**Build Command:** 
```
pip install -r requirements.txt
```

**Start Command:**
```
python main.py
```

**Instance Type:** Free

## 5. Environment Variables Ekle

"Advanced" butonuna tıkla, sonra "Add Environment Variable":

| Key | Value |
|-----|-------|
| `SECRET_KEY` | (Generate'e tıkla - otomatik oluşturur) |
| `ADMIN_EMAIL` | admin@tbot.com |
| `ADMIN_PASSWORD` | GüçlüŞifre123! |
| `DEBUG` | false |
| `ALLOWED_ORIGINS` | https://tb-trading-bot.onrender.com |

**ÖNEMLİ:** `ALLOWED_ORIGINS` değerini kendi Render URL'inle değiştir!

## 6. Deploy Et

1. "Create Web Service" butonuna tıkla
2. Deploy başlayacak (5-10 dakika sürer)
3. Logları izle

## 7. Siteye Eriş

Deploy tamamlandığında:
- URL: `https://tb-trading-bot.onrender.com`
- Admin giriş: `ADMIN_EMAIL` ve `ADMIN_PASSWORD` ile

## 8. Önemli Notlar

### Ücretsiz Plan Sınırları:
- ✅ 750 saat/ay (yeterli)
- ⚠️ 15 dakika kullanılmazsa uyur
- ⚠️ İlk açılış 30-50 saniye sürer
- ✅ Otomatik SSL sertifikası
- ✅ SQLite veritabanı çalışır

### Veritabanı:
- Her deploy'da veritabanı SİLİNİR!
- Kalıcı veri için Render Disk ekle (ücretli)
- Veya PostgreSQL kullan (ücretsiz)

### Custom Domain:
- Render'da "Custom Domain" bölümünden ekleyebilirsin
- Ücretsiz planda da çalışır

## 9. Güncelleme

Kod değişikliği yaptığında:

```bash
git add .
git commit -m "Güncelleme mesajı"
git push
```

Render otomatik yeniden deploy eder.

## 10. Sorun Giderme

### Deploy başarısız olursa:
- Logs'u kontrol et
- requirements.txt'i kontrol et
- Python versiyonunu kontrol et

### Site açılmıyorsa:
- Logs'da hata var mı bak
- Environment variables doğru mu kontrol et
- ALLOWED_ORIGINS URL'i doğru mu kontrol et

### Veritabanı hatası:
- İlk deploy'da admin hesabı otomatik oluşur
- SECRET_KEY doğru ayarlanmış mı kontrol et

## Yardım

Render Docs: https://render.com/docs
