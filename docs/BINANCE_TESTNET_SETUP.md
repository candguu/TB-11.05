# Binance Testnet API Kurulum Rehberi

## ⚠️ ÖNEMLİ: API Anahtarları Hakkında

Binance'de **Spot** ve **Futures** için AYRI API anahtarları gereklidir!

## Adım 1: Binance Testnet Hesabı Oluşturma

### Futures Testnet (Önerilen)
1. https://testnet.binancefuture.com adresine gidin
2. Sağ üstten "Register" butonuna tıklayın
3. Email ile kayıt olun
4. Email'inizi doğrulayın

### Spot Testnet (Opsiyonel)
1. https://testnet.binance.vision adresine gidin
2. GitHub hesabınızla giriş yapın

## Adım 2: Futures API Anahtarı Oluşturma

1. https://testnet.binancefuture.com adresine giriş yapın
2. Sağ üstteki profil ikonuna tıklayın
3. "API Management" seçeneğine tıklayın
4. "Create API" butonuna tıklayın
5. API Key Label girin (örn: "TB Trading Bot")
6. "Create" butonuna tıklayın
7. **API Key** ve **Secret Key**'i kopyalayın ve güvenli bir yere kaydedin

### API İzinleri
Aşağıdaki izinlerin aktif olduğundan emin olun:
- ✅ Enable Reading
- ✅ Enable Futures
- ✅ Enable Spot & Margin Trading (opsiyonel)
- ❌ Enable Withdrawals (GEREKLİ DEĞİL - güvenlik için kapalı tutun)

## Adım 3: API Anahtarlarını Sisteme Ekleme

### Yöntem 1: Dashboard Üzerinden (Önerilen)
1. TB Trading Bot'a admin olarak giriş yapın
2. "API Ayarları" sekmesine gidin
3. API Key ve Secret Key'i yapıştırın
4. "Kaydet ve Doğrula" butonuna tıklayın
5. Sistem otomatik olarak bağlantıyı test edecektir

### Yöntem 2: .env Dosyası Üzerinden
1. Proje klasöründeki `.env` dosyasını açın
2. Aşağıdaki satırları güncelleyin:
```env
BINANCE_API_KEY=your_futures_api_key_here
BINANCE_API_SECRET=your_futures_secret_key_here
```
3. Sunucuyu yeniden başlatın: `python main.py`

## Adım 4: Test Bakiyesi Alma

Binance Futures Testnet otomatik olarak test bakiyesi verir:
- **10,000 USDT** başlangıç bakiyesi
- Gerçek para riski YOK
- Sınırsız işlem yapabilirsiniz

### Bakiye Yenileme
Eğer bakiyeniz biterse:
1. https://testnet.binancefuture.com adresine gidin
2. Profil > "Reset Account" seçeneğine tıklayın
3. Bakiyeniz 10,000 USDT'ye sıfırlanır

## Adım 5: Bağlantıyı Test Etme

### Dashboard'dan Test
1. "Portföy" sekmesine gidin
2. Üst kısımda "API Durumu" kartını kontrol edin
3. "✓ Aktif" yazıyorsa bağlantı başarılı
4. Bakiye bilgileri görünmelidir

### Manuel Test
Terminal'de şu komutu çalıştırın:
```bash
python test_api.py
```

Başarılı çıktı:
```
1. Logging in...
   Status: 200
   Token: 7b22757365...

2. Checking API key status...
   Status: 200
   Response: {
     "configured": true,
     "valid": true,
     "hint": "4NUxROIe..."
   }

3. Getting balance...
   Status: 200
   Response: {
     "asset": "USDT",
     "balance": 10000.0,
     "availableBalance": 10000.0
   }
```

## Sorun Giderme

### Hata: "Invalid API-key, IP, or permissions for action"

**Çözüm 1: API İzinlerini Kontrol Edin**
- Testnet hesabınıza giriş yapın
- API Management > API Key'inizi seçin
- "Enable Futures" izninin aktif olduğundan emin olun

**Çözüm 2: Yeni API Key Oluşturun**
- Eski API key'i silin
- Yeni bir API key oluşturun
- Tüm gerekli izinleri verin
- Yeni anahtarları sisteme girin

**Çözüm 3: IP Kısıtlamasını Kaldırın**
- API Management'ta IP restriction'ı "Unrestricted" yapın
- Testnet için güvenli (gerçek para yok)

### Hata: "Timestamp for this request is outside of the recvWindow"

**Çözüm:**
- Bilgisayarınızın saat ayarını kontrol edin
- Otomatik saat senkronizasyonunu açın
- Windows: Ayarlar > Zaman ve Dil > Otomatik ayarla

### Bakiye Görünmüyor

**Kontrol Listesi:**
1. ✅ API anahtarları doğru girildi mi?
2. ✅ "Enable Futures" izni aktif mi?
3. ✅ Testnet hesabında bakiye var mı?
4. ✅ Tarayıcı console'da hata var mı? (F12)
5. ✅ Sunucu çalışıyor mu?

## API Endpoint'leri

### Futures Testnet
- Base URL: `https://testnet.binancefuture.com`
- WebSocket: `wss://stream.binancefuture.com`
- Dokümantasyon: https://developers.binance.com/docs/derivatives/usds-margined-futures

### Spot Testnet
- Base URL: `https://testnet.binance.vision`
- WebSocket: `wss://testnet.binance.vision`
- Dokümantasyon: https://developers.binance.com/docs/binance-spot-api-docs

## Güvenlik Notları

### ✅ Yapılması Gerekenler
- API anahtarlarını güvenli bir yerde saklayın
- "Enable Withdrawals" iznini KAPALI tutun
- Testnet anahtarlarını gerçek hesap anahtarlarıyla karıştırmayın

### ❌ Yapılmaması Gerekenler
- API anahtarlarını GitHub'a yüklemeyin
- API anahtarlarını başkalarıyla paylaşmayın
- Gerçek hesap anahtarlarını testnet'te kullanmayın

## Faydalı Linkler

- Futures Testnet: https://testnet.binancefuture.com
- Spot Testnet: https://testnet.binance.vision
- API Dokümantasyonu: https://developers.binance.com
- Destek: sup.tb.tr@gmail.com

## Sonraki Adımlar

API bağlantısı başarılı olduktan sonra:
1. ✅ "Futures" sekmesinden kaldıraçlı işlem yapın
2. ✅ "Spot" sekmesinden spot işlem yapın
3. ✅ "Bot Paneli"nden OTT sinyallerini takip edin
4. ✅ "Strateji" sekmesinden risk yönetimini ayarlayın
5. ✅ "Portföy" sekmesinden pozisyonlarınızı izleyin

---

**Not:** Bu rehber Binance Testnet içindir. Gerçek para riski yoktur. Tüm işlemler demo hesabında yapılır.
