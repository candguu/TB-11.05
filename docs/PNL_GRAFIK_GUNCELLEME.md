# PnL Grafik Güncelleme

## Özet

Portföy sayfasındaki günlük, haftalık ve aylık PnL grafikleri gerçek veri miktarına göre dinamik olarak çizilecek şekilde güncellendi.

## Dinamik Grafik Yapısı

### Önemli: Grafikler Gerçek Veriye Göre Çizilir

Grafikler artık sadece **gerçekte var olan** verileri gösterir:

- **Veri yoksa:** "Veri Yok" mesajı
- **Tek gün veri varsa:** Düz çizgi (1 nokta)
- **Birden fazla gün varsa:** Normal grafik çizgisi

### 1. Günlük Grafik (Son 7 Gün)
- **Veri:** Son 7 gün içinde işlem yapılan günler
- **Örnek Senaryolar:**
  - Sadece bugün işlem → 1 nokta, düz çizgi
  - 3 gün işlem → 3 nokta, çizgi grafiği
  - 7 gün işlem → 7 nokta, tam grafik
- **Yüzde:** İlk gün → Son gün (en az 2 gün gerekli)

### 2. Haftalık Grafik (Son 4 Hafta)
- **Veri:** Son 4 hafta içinde işlem yapılan haftalar
- **Örnek Senaryolar:**
  - Sadece bu hafta işlem → 1 nokta, düz çizgi
  - 2 hafta işlem → 2 nokta, çizgi grafiği
  - 4 hafta işlem → 4 nokta, tam grafik
- **Yüzde:** İlk hafta → Son hafta (en az 2 hafta gerekli)

### 3. Aylık Grafik (Son 12 Ay)
- **Veri:** Son 12 ay içinde işlem yapılan aylar
- **Örnek Senaryolar:**
  - Sadece bu ay işlem → 1 nokta, düz çizgi
  - 3 ay işlem → 3 nokta, çizgi grafiği
  - 12 ay işlem → 12 nokta, tam grafik
- **Yüzde:** İlk ay → Son ay (en az 2 ay gerekli)

## Teknik Detaylar

### Backend (routes/binance_routes.py)

**Değişiklikler:**
```python
# Artık sadece veri olan günler/haftalar/aylar ekleniyor
# Boş günler için 0 değeri eklenmez

# Günlük
if timestamp >= seven_days_ago:
    day_key = timestamp - (timestamp % (24 * 60 * 60 * 1000))
    if day_key not in daily_data:
        daily_data[day_key] = 0
    daily_data[day_key] += pnl

# Veri yoksa boş array döndür
if not data:
    return jsonify({
        "daily": [],
        "weekly": [],
        "monthly": []
    })
```

### Frontend (static/js/pnl-mini-charts.js)

**Yeni Özellikler:**

1. **Veri Yok Durumu:**
```javascript
if (!data || data.length === 0) {
    ctx.fillText('Veri Yok', width / 2, height / 2);
    return;
}
```

2. **Tek Veri Noktası:**
```javascript
if (data.length === 1) {
    // Düz çizgi çiz
    ctx.moveTo(4, y);
    ctx.lineTo(width - 4, y);
    // Nokta ekle
    ctx.arc(width / 2, y, 3, 0, 2 * Math.PI);
}
```

3. **Yüzde Hesaplama:**
```javascript
if (data.length === 1) return null; // Tek veri noktası varsa değişim yok

// UI'da göster
if (dailyChange === null) {
    dailyChangeEl.textContent = 'Yetersiz veri';
    dailyChangeEl.style.color = 'rgba(255,255,255,0.4)';
}
```

## Kullanım Senaryoları

### Senaryo 1: İlk Gün (Bugün İşlem Yaptın)
```
Günlük Grafik: ━━━━━━━━━━ (düz çizgi, 1 nokta)
Yüzde: "Yetersiz veri"

Haftalık Grafik: ━━━━━━━━━━ (düz çizgi, 1 hafta)
Yüzde: "Yetersiz veri"

Aylık Grafik: ━━━━━━━━━━ (düz çizgi, 1 ay)
Yüzde: "Yetersiz veri"
```

### Senaryo 2: 3 Gün İşlem Yaptın
```
Günlük Grafik: ╱╲╱ (3 nokta, çizgi grafiği)
Yüzde: "+5.23% (7 gün)"

Haftalık Grafik: ━━━━━━━━━━ (düz çizgi, hala 1 hafta)
Yüzde: "Yetersiz veri"

Aylık Grafik: ━━━━━━━━━━ (düz çizgi, hala 1 ay)
Yüzde: "Yetersiz veri"
```

### Senaryo 3: 2 Hafta İşlem Yaptın
```
Günlük Grafik: ╱╲╱╲╱╲╱ (7+ nokta, tam grafik)
Yüzde: "+12.45% (7 gün)"

Haftalık Grafik: ╱╲ (2 nokta, çizgi grafiği)
Yüzde: "+8.30% (4 hafta)"

Aylık Grafik: ━━━━━━━━━━ (düz çizgi, hala 1 ay)
Yüzde: "Yetersiz veri"
```

### Senaryo 4: 6 Ay İşlem Yaptın
```
Günlük Grafik: ╱╲╱╲╱╲╱ (7 nokta, tam grafik)
Yüzde: "+3.45% (7 gün)"

Haftalık Grafik: ╱╲╱╲ (4 nokta, tam grafik)
Yüzde: "+15.20% (4 hafta)"

Aylık Grafik: ╱╲╱╲╱╲ (6 nokta, çizgi grafiği)
Yüzde: "+45.67% (12 ay)"
```

## Görsel Özellikler

### Renkler
- **Pozitif PnL:** Yeşil (#0ecb81)
- **Negatif PnL:** Kırmızı (#f6465d)
- **Veri Yok:** Gri (rgba(255,255,255,0.4))

### Grafik Tipleri
- **Veri Yok:** "Veri Yok" metni
- **1 Nokta:** Düz çizgi + nokta
- **2+ Nokta:** Gradient fill + çizgi grafiği

## Avantajlar

### Gerçekçi Gösterim
- Olmayan veri için sahte grafik çizilmez
- Kullanıcı gerçek durumu görür
- Yanıltıcı bilgi yok

### Dinamik Ölçeklendirme
- Grafik veri miktarına göre adapte olur
- İlk günden itibaren anlamlı
- Zaman içinde gelişir

### Kullanıcı Dostu
- "Yetersiz veri" mesajı açık
- Düz çizgi = henüz karşılaştırma yok
- Çizgi grafik = trend var

## Test

### Manuel Test
1. Yeni hesap aç (hiç işlem yok)
   - Tüm grafikler: "Veri Yok"
   
2. İlk işlemi yap
   - Tüm grafikler: Düz çizgi
   - Yüzde: "Yetersiz veri"
   
3. Ertesi gün işlem yap
   - Günlük: 2 nokta, çizgi + yüzde
   - Haftalık/Aylık: Düz çizgi
   
4. 1 hafta sonra işlem yap
   - Günlük: 7 nokta, tam grafik
   - Haftalık: 2 nokta, çizgi + yüzde
   - Aylık: Düz çizgi

## Notlar

- Grafikler gerçek Binance REALIZED_PNL verilerini kullanır
- Kümülatif gösterim (toplam kar/zarar)
- Zaman damgaları UTC formatında
- Boş günler/haftalar/aylar atlanır

---

**Güncelleme Tarihi:** 18 Mart 2026
**Durum:** Tamamlandı ✅ (Dinamik Veri Desteği)
