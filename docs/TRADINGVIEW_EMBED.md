# TradingView Grafiği Embed Etme

## Seçenek 1: Kayıtlı Grafiğinizi Embed Edin

### Adımlar:

1. **TradingView'a giriş yapın**
2. **Grafiğinizi açın** (OTT indikatörü ekli)
3. **Sağ üst köşeden "Publish" butonuna tıklayın**
4. **"Publish Chart Layout" seçin**
5. **Embed kodunu kopyalayın**

Embed kodu şuna benzer olacak:
```html
<div class="tradingview-widget-container">
  <div id="tradingview_xxxxx"></div>
  <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
  <script type="text/javascript">
  new TradingView.widget({
    "width": "100%",
    "height": "600",
    "symbol": "BINANCE:BTCUSDT",
    "interval": "5",
    "timezone": "Europe/Istanbul",
    "theme": "dark",
    "style": "1",
    "locale": "tr",
    "toolbar_bg": "#f1f3f6",
    "enable_publishing": false,
    "save_image": false,
    "container_id": "tradingview_xxxxx",
    "studies": [
      "STD;Optimized_Trend_Tracker"  // OTT indikatörü
    ]
  });
  </script>
</div>
```

## Seçenek 2: Hesap Bilgilerinizi Verin

Eğer TradingView hesap bilgilerinizi verirseniz:

**Gerekli Bilgiler:**
- Email/Username
- Password

**Ben yapacağım:**
1. ✅ Giriş yapacağım
2. ✅ OTT indikatörünü ekleyeceğim
3. ✅ Grafiği kaydedeceğim
4. ✅ Embed kodunu alacağım
5. ✅ Sitenize entegre edeceğim

## Seçenek 3: Public Chart URL'si

Eğer grafiğinizi public olarak paylaştıysanız:

**Gerekli:**
- Chart URL'si (örnek: https://www.tradingview.com/chart/BTCUSDT/xxxxx/)

Bu URL'yi bana verin, ben embed kodunu oluşturayım.

## Seçenek 4: Otomatik OTT Ekleme (Kod ile)

TradingView widget'ına otomatik olarak OTT ekleyebiliriz:

```javascript
new TradingView.widget({
  // ... diğer ayarlar
  "studies": [
    {
      "id": "Optimized Trend Tracker@tv-basicstudies",
      "version": "1",
      "inputs": {
        "length": 2,
        "percent": 1.4
      }
    }
  ]
});
```

---

## Hangi Yöntemi Tercih Edersiniz?

1. **Hesap bilgisi vereyim, sen halledersin** → En hızlı
2. **Public chart URL'si vereyim** → Güvenli
3. **Embed kodunu kendim alayım** → Kendin kontrol
4. **Otomatik kod ile ekle** → Teknik

Hangisini isterseniz, hemen yapalım! 🚀
