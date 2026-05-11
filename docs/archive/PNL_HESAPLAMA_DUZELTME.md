# PNL, Margin ve Margin Ratio Hesaplama Düzeltmesi

## Sorun
Binance'deki pozisyonlar sekmesindeki PNL, Margin ve Margin Ratio değerleri sitenizle uyuşmuyordu.

## Çözüm

### 1. Backend Değişiklikleri (routes/binance_routes.py)

**Eski Sorun:**
- `isolatedMarginRatio` sadece isolated margin için alınıyordu
- Cross margin için margin ratio hesaplanmıyordu

**Yeni Çözüm:**
```python
# Margin Ratio - Binance'den gelen değeri kullan
if p["marginType"] == "isolated":
    position["marginRatio"] = float(p.get("isolatedMarginRatio", 0))
else:
    # Cross margin için maintenance margin ratio
    position["marginRatio"] = float(p.get("maintMarginRatio", 0))
```

### 2. Frontend Değişiklikleri (static/js/portfolio.js)

**PNL Hesaplama:**
- Binance'den gelen `unRealizedProfit` değeri DOĞRUDAN kullanılıyor
- Artık manuel hesaplama yapılmıyor

**ROI Hesaplama:**
```javascript
// Position value (notional)
const positionValue = Math.abs(posAmt) * markPrice;

// Initial Margin = Position Value / Leverage
const initialMargin = positionValue / leverage;

// ROI = (PNL / Initial Margin) * 100
const roi = initialMargin > 0 ? (unpnl / initialMargin * 100) : 0;
```

**Margin Gösterimi:**
```javascript
// Isolated için isolatedMargin, Cross için isolatedWallet kullan
const displayMargin = marginType === 'isolated' ? isolatedMargin : isolatedWallet;
```

**Margin Ratio:**
```javascript
// Binance'den gelen değeri yüzde olarak göster
const displayMarginRatio = marginRatio * 100;
```

## Binance'in Hesaplama Formülleri

### PNL (Unrealized Profit/Loss)
- **Long:** (Mark Price - Entry Price) × Position Size
- **Short:** (Entry Price - Mark Price) × Position Size

### ROI (Return on Investment)
- **Formül:** (PNL / Initial Margin) × 100
- **Initial Margin:** Position Value / Leverage
- **Position Value:** Entry Price × Position Size

### Margin
- **Isolated Margin:** Pozisyona özel ayrılmış margin
- **Cross Margin:** Tüm hesap bakiyesi kullanılır

### Margin Ratio
- **Isolated:** `isolatedMarginRatio` (Binance'den gelir)
- **Cross:** `maintMarginRatio` (Maintenance Margin Ratio)
- **Formül:** (Maintenance Margin / Margin Balance) × 100

## Test

1. Sunucuyu yeniden başlatın:
```bash
python main.py
```

2. Portfolio sayfasını açın

3. Console'da pozisyon detaylarını kontrol edin:
```
[POSITION] BTCUSDT: PNL=12.34, Margin=100.00, Ratio=0.0234
```

4. Binance'deki değerlerle karşılaştırın - artık eşleşmeli

## Önemli Notlar

- PNL değeri Binance'den DOĞRUDAN alınıyor (hesaplanmıyor)
- ROI, Initial Margin üzerinden hesaplanıyor (Binance standardı)
- Margin Ratio, Binance'den gelen değer (isolated/cross'a göre farklı)
- Tüm değerler gerçek zamanlı güncelleniyor (3 saniyede bir)

## Doğrulama

Binance'de bir pozisyon açın ve şu değerleri karşılaştırın:
- ✅ Entry Price
- ✅ Mark Price
- ✅ PNL (USDT)
- ✅ ROI (%)
- ✅ Margin (USDT)
- ✅ Margin Ratio (%)

Artık tüm değerler Binance ile birebir eşleşmeli.
