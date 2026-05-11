# Admin Dashboard Kullanım Kılavuzu

## Genel Bakış
Admin dashboard'ı 7 ana sekmeden oluşur ve Binance Testnet üzerinden demo trading yapmanıza olanak sağlar.

## Sekmeler

### 1. 📊 Piyasa
- Canlı kripto piyasa verileri
- Top 20 coin listesi
- Fiyat, hacim, piyasa değeri bilgileri
- 7 günlük sparkline grafikleri
- Arama ve filtreleme (Yükselenler/Düşenler)
- Otomatik güncelleme

### 2. 🤖 Bot Paneli
- OTT (Optimized Trend Tracker) sinyalleri
- Canlı TradingView grafikleri
- Gerçek zamanlı işlem akışı
- Manuel sinyal gönderme (BUY/SELL)
- Bot başlat/durdur kontrolü
- Backtest sonuçları ve istatistikler

**Özellikler:**
- Sembol seçimi (BTC, ETH, SOL, BNB, XRP, AVAX, DOGE, LINK)
- Timeframe seçimi (5m, 15m, 1h, 4h, 1d)
- OTT parametreleri (Period, Percent)
- Güncel fiyat ve değişim
- Trend yönü ve sinyal göstergeleri

### 3. ⚙️ Strateji
Profesyonel trading stratejisi yönetimi:

**OTT Stratejisi:**
- Period ayarı (1-50)
- Percent ayarı (0.1-10%)
- Aktif/Pasif durumu

**Risk Yönetimi:**
- Risk profili seçimi (Muhafazakar/Dengeli/Agresif)
- Stop Loss % (1-10%)
- Take Profit % (1-20%)

**Pozisyon Yönetimi:**
- Maksimum açık pozisyon sayısı (1-20)
- Pozisyon başına sermaye % (5-100%)
- Varsayılan kaldıraç (1-125x)

**Parite Seçimi:**
- BTC/USDT, ETH/USDT, SOL/USDT
- BNB/USDT, XRP/USDT, AVAX/USDT
- DOGE/USDT, LINK/USDT

**Zaman Dilimi:**
- 1m, 5m, 15m, 30m, 1h, 4h, 1d

### 4. 📝 Loglar
- Gerçek zamanlı sistem logları
- İşlem kayıtları
- Hata mesajları
- API bağlantı durumu
- Terminal benzeri arayüz

### 5. 📈 Futures (Kaldıraçlı İşlemler)
**İstatistikler:**
- Toplam bakiye (USDT)
- Unrealized PnL
- Kullanılabilir margin
- Açık pozisyon sayısı

**Hızlı İşlem:**
- Sembol seçimi
- Kaldıraç ayarı (1-125x)
- Miktar girişi (coin)
- LONG/SHORT butonları
- Market emri ile anında pozisyon açma

**Açık Pozisyonlar Tablosu:**
- Sembol
- Yön (LONG/SHORT)
- Miktar
- Giriş fiyatı
- Mark fiyatı
- Unrealized PnL
- Kaldıraç
- Kapat butonu

### 6. 💰 Spot (Spot İşlemler)
**İstatistikler:**
- USDT bakiye
- Toplam varlık değeri
- Varlık sayısı
- Açık emir sayısı

**Hızlı İşlem:**
- Sembol seçimi
- USDT tutarı
- BUY/SELL butonları
- Market emri ile anında alım/satım

**İki Kolon Görünüm:**
- Sol: Spot bakiyeler tablosu
- Sağ: Açık emirler tablosu

### 7. 💼 Portföy
**Spot/Futures Sekmeleri:**
- Sekme bazlı görünüm
- Otomatik 15 saniye yenileme

**Spot Görünümü:**
- Varlık bakiyeleri (Kullanılabilir/Kilitli/Toplam)
- Açık emirler
- İşlem geçmişi
- Hızlı alım/satım

**Futures Görünümü:**
- Açık pozisyonlar (PnL ile)
- Futures bakiyeler
- Kaldıraç ayarlama
- Pozisyon açma/kapatma
- İşlem geçmişi

## API Yapılandırması

### Binance Testnet API
1. Dashboard'da "API Ayarları" sekmesine gidin
2. API Key ve Secret'ı girin
3. "Kaydet ve Doğrula" butonuna tıklayın
4. Sistem otomatik olarak bağlantıyı test eder

**API Bilgileri (.env dosyasında):**
```
BINANCE_API_KEY=4NUxROIeNoR2clwRQ71gZslT4t5G2s5OTMGO2WlxlUl6GtgK2GFJdUnNETJDStzk
BINANCE_API_SECRET=Kx3AqKRW4eL1nyheXHlb5C8EUC9qLBhVnmbOZRBptJuM3mUnhcMovmpulCmX1rGJ
```

**Testnet URL'leri:**
- Spot: https://testnet.binance.vision
- Futures: https://testnet.binancefuture.com

## Kullanım Senaryoları

### Senaryo 1: Futures Pozisyon Açma
1. "Futures" sekmesine git
2. Sembol seç (örn: BTCUSDT)
3. Kaldıraç ayarla (örn: 10x)
4. Miktar gir (örn: 0.01 BTC)
5. "LONG" veya "SHORT" butonuna tıkla
6. Onay ver
7. Pozisyon "Açık Pozisyonlar" tablosunda görünür

### Senaryo 2: Spot Alım Yapma
1. "Spot" sekmesine git
2. Sembol seç (örn: ETHUSDT)
3. USDT tutarı gir (örn: 100)
4. "BUY" butonuna tıkla
5. Onay ver
6. İşlem gerçekleşir ve bakiye güncellenir

### Senaryo 3: OTT Sinyali ile İşlem
1. "Bot Paneli" sekmesine git
2. Sembol ve timeframe seç
3. OTT parametrelerini ayarla
4. "Botu Başlat" butonuna tıkla
5. Gerçek zamanlı sinyaller "İşlem Akışı" panelinde görünür
6. Manuel sinyal göndermek için "LONG/BUY" veya "SHORT/SELL" butonlarını kullan

### Senaryo 4: Strateji Ayarlama
1. "Strateji" sekmesine git
2. Risk profilini seç (Muhafazakar/Dengeli/Agresif)
3. Stop Loss ve Take Profit % ayarla
4. İşlem yapılacak pariteleri seç
5. Zaman dilimlerini belirle
6. "Ayarları Kaydet" butonuna tıkla

## Güvenlik Notları
- Binance Testnet kullanıldığı için gerçek para riski yoktur
- API anahtarları veritabanında saklanır
- Tüm istekler JWT token ile korunur
- HMAC SHA256 signature ile API güvenliği sağlanır

## Teknik Detaylar

### Frontend
- Vanilla JavaScript
- Lightweight Charts (TradingView)
- Responsive tasarım
- Otomatik yenileme mekanizması

### Backend
- Flask (Python)
- SQLite veritabanı
- Binance Futures API entegrasyonu
- RESTful API endpoints

### Özellikler
- Gerçek zamanlı veri akışı
- Otomatik token yenileme
- Hata yönetimi ve toast bildirimleri
- Mobile responsive tasarım
- Dark mode arayüz

## Sorun Giderme

### API Bağlantı Hatası
- API anahtarlarını kontrol edin
- Testnet URL'lerinin doğru olduğundan emin olun
- İnternet bağlantınızı kontrol edin

### Pozisyon Açılamıyor
- Yeterli bakiye olduğundan emin olun
- Kaldıraç limitlerini kontrol edin (1-125x)
- Minimum işlem miktarını kontrol edin

### Grafik Yüklenmiyor
- Sayfayı yenileyin (F5)
- Tarayıcı cache'ini temizleyin
- JavaScript hatalarını console'da kontrol edin

## Destek
- Email: sup.tb.tr@gmail.com
- Demo hesap: admin@tbot.com / 12345
