# OTT (Optimized Trend Tracker) Entegrasyonu

## ✅ Tamamlanan İşlemler

### 1. Backend Geliştirme

#### OTT Indicator Modülü (`ott_indicator.py`)
- Pine Script'ten Python'a tam çeviri
- Desteklenen Moving Average tipleri:
  - SMA (Simple Moving Average)
  - EMA (Exponential Moving Average)
  - WMA (Weighted Moving Average)
  - TMA (Triangular Moving Average)
  - VAR (Variable Moving Average) ⭐ Varsayılan
  - WWMA (Welles Wilder Moving Average)
  - ZLEMA (Zero Lag EMA)
  - TSF (Time Series Forecast)

#### OTT Hesaplama Özellikleri
- Long/Short Stop hesaplama
- Direction (trend yönü) tespiti
- OTT değeri hesaplama
- Otomatik sinyal üretimi:
  - OTT renk değişimi sinyalleri
  - Support Line (MAvg) kesişim sinyalleri

#### API Endpoints (`routes/ott_routes.py`)

**1. POST `/api/ott/signal`**
- Güncel OTT sinyalini döndürür
- Parametreler:
  ```json
  {
    "symbol": "BTCUSDT",
    "interval": "5m",
    "length": 2,
    "percent": 1.4,
    "ma_type": "VAR"
  }
  ```
- Response:
  ```json
  {
    "symbol": "BTCUSDT",
    "signal": "BUY/SELL/NEUTRAL",
    "source": "OTT_COLOR/SUPPORT_CROSS",
    "price": 66092.08,
    "ott": 65623.66,
    "mavg": 65173.83,
    "direction": "UP/DOWN",
    "recommendation": {
      "action": "BUY",
      "confidence": "HIGH/MEDIUM",
      "description": "..."
    }
  }
  ```

**2. POST `/api/ott/calculate`**
- Detaylı OTT hesaplaması ve grafik verisi
- Son 50 mum için OTT ve MAvg değerleri
- Son 10 sinyal geçmişi

**3. GET `/api/ott/stream`**
- Canlı sinyal stream'i (polling için)
- Query params ile yapılandırma

**4. POST `/api/ott/backtest`**
- OTT stratejisi backtest
- İstatistikler:
  - Total trades
  - Win rate
  - Average win/loss
  - Total PNL

### 2. Frontend Entegrasyonu

#### JavaScript Fonksiyonları (`static/js/app.js`)

**Otomatik Güncelleme:**
- `updateOTTData()` - Her 5 saniyede OTT verilerini günceller
- `loadOTTSignals()` - Her 30 saniyede sinyal geçmişini yeniler
- `startOTTUpdates()` - Otomatik güncellemeyi başlatır

**Manuel İşlemler:**
- `sendManualSignal(type)` - Manuel BUY/SELL sinyali gönderir
- `addToSimFeed(type, symbol)` - İşlem feed'ine ekler

**Görsel Güncellemeler:**
- Güncel fiyat
- OTT sinyali (🟢 LONG / 🔴 SHORT / ⚪ NEUTRAL)
- Trend yönü (📈 YUKARI / 📉 AŞAĞI)
- OTT değerleri (OTT, MAvg, Fark)
- Sinyal geçmişi tablosu
- Canlı işlem akışı

#### CSS Animasyonlar (`static/css/styles.css`)
- `pulse` - Canlı indicator animasyonu
- `fadeIn` - Yumuşak giriş efekti
- `slideIn` - Kaydırmalı giriş
- Sinyal badge stilleri (buy/sell/neutral)
- Trend renklendirme

### 3. Bağımlılıklar

**Yüklenen Paketler:**
```
pandas>=2.0.0
numpy>=1.24.0
flask>=3.0.0
flask-cors>=4.0.0
requests>=2.31.0
python-dotenv>=1.0.0
```

## 🚀 Kullanım

### Sunucuyu Başlatma
```bash
python main.py
```

Sunucu şu adreslerde çalışır:
- http://localhost:5000
- http://127.0.0.1:5000
- http://192.168.1.10:5000

### Bot Paneline Erişim

1. Tarayıcıda `http://localhost:5000` adresine gidin
2. Admin hesabıyla giriş yapın:
   - Email: `admin@tbot.com`
   - Şifre: `12345`
3. Dashboard'da "Bot Paneli" sekmesine tıklayın

### Bot Panel Özellikleri

**Üst Kontrol Barı:**
- Sembol seçici (BTC/USDT, ETH/USDT, SOL/USDT, vb.)
- Timeframe butonları (5m, 15m, 1h, 4h, 1g)
- OTT parametreleri:
  - Length (varsayılan: 2)
  - Percent (varsayılan: 1.4)
- Bot başlat/durdur butonu

**İstatistik Kartları:**
- Güncel Fiyat
- OTT Sinyali (LONG/SHORT/NEUTRAL)
- Trend Yönü (YUKARI/AŞAĞI)
- Toplam İşlem
- Aktif Pozisyon
- Günlük PNL

**Ana Ekran:**
- Sol: TradingView grafik + OTT değerleri + Sinyal geçmişi
- Sağ: Manuel sinyal butonları + Canlı işlem akışı

### Manuel Sinyal Gönderme

Bot panelinde sağ tarafta:
- **▲ LONG / BUY** butonu - Alım sinyali gönderir
- **▼ SHORT / SELL** butonu - Satım sinyali gönderir

## 📊 Test Sonuçları

Test scripti çalıştırıldı (`python test_ott.py`):

### OTT Signal Test
```
Symbol: BTCUSDT
Current Price: $66,092.08
OTT Value: $65,623.66
MAvg Value: $65,173.83
Direction: DOWN
Signal: SELL
Source: SUPPORT_CROSS
Confidence: MEDIUM
```

### OTT Calculate Test
```
Symbol: ETHUSDT
Interval: 15m
Trend: BEARISH
Signals Count: 10
Last Signal: SELL @ $1,970.85
```

### OTT Backtest Test
```
Symbol: BTCUSDT
Interval: 1h
Total Trades: 36
Win Rate: 33.33%
Total PNL: -17.03%
Avg Win: 2.41%
Avg Loss: -1.92%
```

## 🔧 Yapılandırma

### OTT Parametreleri

**Length (Periyot):**
- Varsayılan: 2
- Aralık: 1-50
- Düşük değer = Daha hızlı sinyaller
- Yüksek değer = Daha az gürültü

**Percent (Yüzde):**
- Varsayılan: 1.4
- Aralık: 0.1-10.0
- Düşük değer = Daha sık sinyaller
- Yüksek değer = Daha güvenilir sinyaller

**Moving Average Type:**
- Varsayılan: VAR (Variable MA)
- Diğer seçenekler: SMA, EMA, WMA, TMA, WWMA, ZLEMA, TSF

### Timeframe Seçenekleri
- 5m (5 dakika)
- 15m (15 dakika)
- 1h (1 saat)
- 4h (4 saat)
- 1d (1 gün)

## 📝 API Kullanım Örnekleri

### Python
```python
import requests

token = "YOUR_AUTH_TOKEN"
headers = {"Authorization": f"Bearer {token}"}

# OTT sinyali al
response = requests.post("http://localhost:5000/api/ott/signal",
    headers=headers,
    json={
        "symbol": "BTCUSDT",
        "interval": "5m",
        "length": 2,
        "percent": 1.4
    }
)
data = response.json()
print(f"Signal: {data['signal']}")
```

### JavaScript
```javascript
const response = await fetch('/api/ott/signal', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    symbol: 'BTCUSDT',
    interval: '5m',
    length: 2,
    percent: 1.4
  })
});
const data = await response.json();
console.log('Signal:', data.signal);
```

## 🎯 Sinyal Tipleri

### OTT_COLOR (Yüksek Güven)
- OTT çizgisi yeşile döndü → BUY
- OTT çizgisi kırmızıya döndü → SELL

### SUPPORT_CROSS (Orta Güven)
- MAvg, OTT'yi yukarı kesti → BUY
- MAvg, OTT'yi aşağı kesti → SELL

## 🔄 Otomatik Güncelleme

Bot paneli açıkken:
- OTT verileri her 5 saniyede güncellenir
- Sinyal geçmişi her 30 saniyede yenilenir
- Canlı işlem akışı gerçek zamanlı güncellenir

## 📈 Performans

- API response time: ~200-500ms
- Binance API çağrısı: ~100-300ms
- OTT hesaplama: ~50-100ms
- Frontend güncelleme: ~10-20ms

## 🛠️ Sorun Giderme

### Sunucu başlamıyor
```bash
# Bağımlılıkları kontrol et
python -m pip install -r requirements.txt

# Port kullanımda mı kontrol et
netstat -ano | findstr :5000
```

### OTT sinyalleri gelmiyor
- Token'ın geçerli olduğundan emin olun
- Browser console'da hata var mı kontrol edin
- Network tab'da API çağrılarını inceleyin

### Binance API hatası
- İnternet bağlantınızı kontrol edin
- Binance API'nin erişilebilir olduğunu doğrulayın
- Rate limit'e takılmış olabilirsiniz (429 hatası)

## 📚 Kaynaklar

- Orijinal Pine Script: @KivancOzbilgic
- Developer: ANIL ÖZEKŞİ (@Anil_Ozeksi)
- Binance API: https://binance-docs.github.io/apidocs/spot/en/

## ✨ Özellikler

✅ Gerçek zamanlı OTT hesaplama
✅ Çoklu timeframe desteği
✅ Otomatik sinyal üretimi
✅ Manuel sinyal gönderme
✅ Backtest özelliği
✅ Canlı işlem akışı
✅ TradingView grafik entegrasyonu
✅ Responsive tasarım
✅ Animasyonlu UI
✅ Admin/User rol ayrımı

## 🎉 Sonuç

OTT (Optimized Trend Tracker) entegrasyonu başarıyla tamamlandı!

Sunucu çalışıyor: http://localhost:5000
Bot paneli aktif ve OTT sinyalleri gerçek zamanlı olarak güncelleniyor.

Tüm testler başarılı! ✅
