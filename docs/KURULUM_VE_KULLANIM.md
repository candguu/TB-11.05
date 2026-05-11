# TB Trading Bot - Kurulum ve Kullanım Kılavuzu

## 🚀 Hızlı Başlangıç

### 1. Gereksinimler
- Python 3.12+
- İnternet bağlantısı (Binance API için)

### 2. Kurulum

```bash
# Bağımlılıkları yükle
python -m pip install -r requirements.txt
```

### 3. Çalıştırma

```bash
# Sunucuyu başlat
python main.py
```

Sunucu başladığında şu adreslerde erişilebilir:
- **Ana adres:** http://localhost:5000
- **Yerel ağ:** http://192.168.1.10:5000

## 🔐 Giriş Bilgileri

### Admin Hesabı
- **Email:** admin@tbot.com
- **Şifre:** 12345

⚠️ **Önemli:** Production'da mutlaka şifreyi değiştirin!

## 📊 Bot Paneli Kullanımı

### Adım 1: Giriş Yapın
1. Tarayıcıda http://localhost:5000 adresine gidin
2. Sağ üstteki "Giriş Yap" butonuna tıklayın
3. Admin bilgileriyle giriş yapın

### Adım 2: Bot Paneline Gidin
1. Giriş yaptıktan sonra otomatik olarak Dashboard açılır
2. Sol menüden "Bot Paneli" sekmesine tıklayın

### Adım 3: OTT Ayarlarını Yapın

**Sembol Seçimi:**
- Dropdown'dan işlem yapmak istediğiniz parityi seçin
- Örnek: BTC/USDT, ETH/USDT, SOL/USDT

**Timeframe Seçimi:**
- 5m, 15m, 1h, 4h veya 1g butonlarından birini seçin
- Kısa vadeli işlemler için: 5m veya 15m
- Uzun vadeli işlemler için: 4h veya 1g

**OTT Parametreleri:**
- **Length (Periyot):** 2 (varsayılan)
  - Düşük = Daha hızlı sinyaller
  - Yüksek = Daha az gürültü
- **Percent (Yüzde):** 1.4 (varsayılan)
  - Düşük = Daha sık sinyaller
  - Yüksek = Daha güvenilir sinyaller

### Adım 4: Sinyalleri İzleyin

**İstatistik Kartları:**
- 📊 **Güncel Fiyat:** Anlık piyasa fiyatı
- 🎯 **OTT Sinyali:** LONG/SHORT/NEUTRAL
- 📈 **Trend Yönü:** YUKARI/AŞAĞI
- 📋 **Sinyal Geçmişi:** Son OTT sinyalleri

**Sinyal Anlamları:**
- 🟢 **LONG (BUY):** Alım sinyali - Fiyat yükseliş trendinde
- 🔴 **SHORT (SELL):** Satım sinyali - Fiyat düşüş trendinde
- ⚪ **NEUTRAL:** Bekle - Net bir sinyal yok

**Sinyal Kaynakları:**
- **OTT Renk:** OTT çizgisi renk değiştirdi (Yüksek güven)
- **Support:** MAvg çizgisi OTT'yi kesti (Orta güven)

### Adım 5: Manuel İşlem Yapın

Sağ panelde manuel sinyal butonları:
- **▲ LONG / BUY:** Manuel alım sinyali gönder
- **▼ SHORT / SELL:** Manuel satım sinyali gönder

Manuel sinyal gönderdiğinizde:
- İşlem feed'ine eklenir
- Toast bildirimi gösterilir
- Canlı indicator aktif olur

## 📈 Grafik Kullanımı

**TradingView Grafik:**
- Sol panelde tam ekran TradingView grafik
- Zoom, çizim araçları ve indikatörler kullanılabilir
- Otomatik olarak seçili sembol ve timeframe'i gösterir

**OTT Değerleri (Grafik Altı):**
- **OTT:** Optimized Trend Tracker değeri
- **Support (MAvg):** Moving Average değeri
- **Fark:** Fiyat ile OTT arasındaki fark
- **Son Güncelleme:** En son veri çekme zamanı

## 🔄 Otomatik Güncelleme

Bot paneli açıkken:
- ✅ OTT verileri **her 5 saniyede** güncellenir
- ✅ Sinyal geçmişi **her 30 saniyede** yenilenir
- ✅ Canlı işlem akışı **gerçek zamanlı** güncellenir
- ✅ Grafik **manuel yenilenebilir**

## 🎯 Strateji Önerileri

### Kısa Vadeli (5m - 15m)
```
Length: 2
Percent: 1.4
Sinyal: OTT Renk + Support Cross
Risk: Orta-Yüksek
```

### Orta Vadeli (1h - 4h)
```
Length: 3-5
Percent: 1.8-2.0
Sinyal: Sadece OTT Renk
Risk: Orta
```

### Uzun Vadeli (1d)
```
Length: 5-10
Percent: 2.0-2.5
Sinyal: Sadece OTT Renk
Risk: Düşük
```

## 🛡️ Risk Yönetimi

### Öneriler:
1. **Stop Loss kullanın:** Her işlemde %2-3 stop loss
2. **Position sizing:** Sermayenin %1-2'si kadar risk
3. **Çoklu timeframe:** Farklı timeframe'lerde doğrulama
4. **Trend takibi:** Ana trend yönünde işlem yapın
5. **Sabırlı olun:** Her sinyale girmek zorunda değilsiniz

### Sinyal Filtreleme:
- ✅ Yüksek güven: OTT Renk değişimi
- ⚠️ Orta güven: Support Cross
- ❌ Düşük güven: Trend tersine sinyal

## 📱 Mobil Kullanım

Bot paneli responsive tasarıma sahip:
- Tablet ve mobil cihazlarda çalışır
- Grafik otomatik boyutlanır
- Kontroller touch-friendly

## 🔧 Sorun Giderme

### Sunucu başlamıyor
```bash
# Port kullanımda mı?
netstat -ano | findstr :5000

# Başka port kullan
# .env dosyasında PORT=5001 yapın
```

### Sinyaller gelmiyor
1. İnternet bağlantınızı kontrol edin
2. Browser console'da hata var mı bakın (F12)
3. Sayfayı yenileyin (Ctrl+F5)

### Grafik yüklenmiyor
1. TradingView widget'ı yüklendi mi kontrol edin
2. Ad-blocker kapalı mı kontrol edin
3. Sayfayı yenileyin

### API hatası (429)
- Binance rate limit'e takıldınız
- 1-2 dakika bekleyin
- Daha uzun timeframe kullanın

## 📊 Test Modu

Test için `test_ott.py` scriptini çalıştırın:

```bash
python test_ott.py
```

Bu script:
- ✅ OTT Signal API'sini test eder
- ✅ OTT Calculate API'sini test eder
- ✅ OTT Backtest API'sini test eder
- ✅ Tüm sonuçları gösterir

## 🔐 Güvenlik

### Production'da yapılması gerekenler:
1. `.env` dosyasında `SECRET_KEY` değiştirin
2. `ADMIN_PASSWORD` güçlü bir şifre yapın
3. `DEBUG=false` olduğundan emin olun
4. `ALLOWED_ORIGINS` sadece kendi domain'inizi içersin
5. HTTPS kullanın
6. Firewall kuralları ekleyin

## 📞 Destek

Sorun yaşarsanız:
1. `OTT_INTEGRATION.md` dosyasını okuyun
2. Browser console'da hataları kontrol edin
3. Sunucu loglarını inceleyin
4. Test scriptini çalıştırın

## 🎉 Başarılı Kurulum!

Eğer bu adımları tamamladıysanız:
- ✅ Sunucu çalışıyor
- ✅ Bot paneli erişilebilir
- ✅ OTT sinyalleri geliyor
- ✅ Grafik yükleniyor
- ✅ Manuel işlemler çalışıyor

**Artık trading yapabilirsiniz!** 🚀

---

**Not:** Bu bir demo/test sistemidir. Gerçek para ile işlem yapmadan önce:
- Binance API anahtarlarınızı ekleyin
- Testnet'te deneyin
- Risk yönetimi stratejinizi belirleyin
- Paper trading ile pratik yapın
