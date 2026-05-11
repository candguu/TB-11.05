# TB Trading Bot

Binance API ile otomatik kripto trading botu. OTT (Optimized Trend Tracker) indikatörü ve gelişmiş risk yönetimi özellikleri ile profesyonel trading deneyimi.

## 🚀 Özellikler

- **Binance Entegrasyonu**: Spot ve Futures trading desteği
- **OTT İndikatörü**: Optimized Trend Tracker ile trend analizi
- **Gerçek Zamanlı Grafik**: TradingView entegrasyonu
- **Risk Yönetimi**: Stop-loss, take-profit ve pozisyon yönetimi
- **Portfolio Takibi**: Detaylı PnL hesaplama ve görselleştirme
- **Admin Dashboard**: Kullanıcı ve sistem yönetimi
- **🆕 Merkezi Logging**: Structured logging ve error tracking
- **🆕 Rate Limiting**: API abuse koruması
- **🆕 Input Validation**: Güvenli veri işleme
- **🆕 Environment Validation**: Otomatik yapılandırma kontrolü

## 📋 Gereksinimler

- Python 3.8+
- Binance API anahtarları
- SQLite (dahil)

## 🔧 Kurulum

### Hızlı Kurulum (Önerilen)

```bash
# Kurulum scriptini çalıştır
python setup.py
```

Bu script otomatik olarak:
- ✅ Python versiyonunu kontrol eder
- ✅ .env dosyası oluşturur (güvenli SECRET_KEY ile)
- ✅ Bağımlılıkları yükler
- ✅ Gerekli klasörleri oluşturur
- ✅ Environment validation yapar
- ✅ Test'leri çalıştırır

### Manuel Kurulum

```bash
# 1. Bağımlılıkları yükle
pip install -r requirements.txt

# 2. .env dosyası oluştur
cp .env.example .env
# .env dosyasını düzenle (SECRET_KEY, ADMIN_EMAIL, ADMIN_PASSWORD)

# 3. Environment validation
python core/env_validator.py

# 4. Uygulamayı başlat
python main.py
```

Tarayıcıda: http://localhost:5000

### Render'a Deploy

1. GitHub'a push et
2. Render.com'a git
3. "New Web Service" tıkla
4. GitHub repo'nu bağla
5. Otomatik deploy başlayacak

## ⚙️ Environment Variables

Render dashboard'dan veya `.env` dosyasından ayarla:

```env
SECRET_KEY=your-secret-key
ADMIN_EMAIL=admin@tbot.com
ADMIN_PASSWORD=your-strong-password
ALLOWED_ORIGINS=https://your-app.onrender.com
```

## 📁 Proje Yapısı

```
├── core/              # Ana iş mantığı modülleri
│   ├── binance_api.py
│   ├── bot_daemon.py
│   ├── crypto_utils.py
│   ├── database.py
│   ├── mailer.py
│   ├── ott_indicator.py
│   └── security.py
├── routes/            # Flask route'ları
├── static/            # CSS, JS, görseller
├── templates/         # HTML şablonları
├── scripts/           # Yardımcı scriptler
├── tests/             # Test dosyaları
├── docs/              # Dokümantasyon
└── main.py            # Ana uygulama

```

## 🛠️ Yardımcı Scriptler

```bash
# Admin şifre sıfırlama
python scripts/reset_admin.py

# Kullanıcı şifre sıfırlama
python scripts/reset_user_password.py

# Environment validation
python core/env_validator.py

# Örnek .env dosyası oluştur
python core/env_validator.py --generate-example

# Test'leri çalıştır
pytest tests/ -v

# Test coverage
pytest tests/ --cov=core --cov=routes
```

## 📚 Dokümantasyon

Detaylı dokümantasyon için `docs/` klasörüne bakın:

- [Binance Entegrasyonu](docs/BINANCE_INTEGRATION.md)
- [OTT Entegrasyonu](docs/OTT_INTEGRATION.md)
- [Admin Dashboard](docs/ADMIN_DASHBOARD_GUIDE.md)
- [Deploy Rehberi](docs/DEPLOY.md)
- **[🆕 Yapılan İyileştirmeler](IMPROVEMENTS.md)** - Yeni özellikler ve kullanım

## 🔒 Güvenlik

- API anahtarları şifreli saklanır
- CORS koruması aktif
- Rate limiting uygulanmıştır
- SQL injection koruması

## 📝 Lisans

Bu proje özel kullanım içindir.


