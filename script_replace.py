import re

with open('static/js/binance-trading-minimal.js', 'r', encoding='utf-8') as f:
    text = f.read()

replacements = {
    'İşlem başarısız': 'Operation failed',
    'Yetersiz bakiye': 'Insufficient balance',
    'Minimum işlem tutarı sağlanmadı': 'Minimum order value not met',
    'Geçersiz miktar veya fiyat hassasiyeti': 'Invalid quantity or price precision',
    'Geçersiz fiyat': 'Invalid price',
    'Geçersiz miktar': 'Invalid quantity',
    'Kaldıraç ayarlanamadı': 'Could not set leverage',
    'Reduce-only kuralı ihlali': 'Reduce-only rule violated',
    'Pozisyon bulunamadı': 'Position not found',
    'Açık pozisyon yok': 'No open positions',
    'Açık emir yok': 'No open orders',
    'Emir geçmişi bulunamadı': 'No order history',
    'İşlem geçmişi bulunamadı': 'No trade history',
    'Önce fiyat girin': 'Enter price first',
    'Miktar giriniz': 'Enter quantity',
    'Lütfen giriş yapın': 'Please log in',
    'Geçerli miktar girin': 'Enter valid quantity',
    'Fiyat giriniz': 'Enter price',
    'İşlem yapılıyor...': 'Processing...',
    'Long piyasa emri oluşturuldu!': 'Long market order created!',
    'Long limit emri oluşturuldu!': 'Long limit order created!',
    'Long stop-limit emri oluşturuldu!': 'Long stop-limit order created!',
    'Short piyasa emri oluşturuldu!': 'Short market order created!',
    'Short limit emri oluşturuldu!': 'Short limit order created!',
    'Short stop-limit emri oluşturuldu!': 'Short stop-limit order created!',
    'Bağlantı hatası': 'Connection error',
    'Long aç': 'Open Long',
    'Short aç': 'Open Short',
    'API bağlı değil': 'API not connected',
    '— API Ayarlarından key girin': '— Enter key in API Settings',
    'Multi-Asset Mode aktif': 'Multi-Asset Mode active',
    'Single-Asset Mode aktif': 'Single-Asset Mode active',
    'Değiştirilemedi': 'Could not be changed',
    'İşlem açılamadı:': 'Could not open position:',
    '⚠️ Yetersiz bakiye! Binance Testnet hesabınıza https://testnet.binancefuture.com adresinden giriş yapıp ücretsiz test USDT alın.': '⚠️ Insufficient balance! Login to Binance Testnet at https://testnet.binancefuture.com to claim free test USDT.',
    'Emir iptal edildi': 'Order cancelled',
    'İptal edilemedi': 'Could not cancel',
    'Pozisyon kapatıldı': 'Position closed',
    'Kapatılamadı': 'Could not close',
    'Stop price ve limit price giriniz': 'Enter stop price and limit price',
    'Kapat (%100)': 'Close (100%)',
    'Market Kapat': 'Market Close',
    'İptal': 'Cancel',
    'Limit İptal': 'Cancel Limit',
    'Pozisyonlar': 'Positions',
    'Açık emirler': 'Open Orders',
    'Emir geçmişi': 'Order History',
    'İşlem geçmişi': 'Trade History',
    'Varlıklar': 'Assets',
    'Yükleniyor…': 'Loading...',
    'emri oluşturuldu!': 'order created!'
}

for k, v in replacements.items():
    text = text.replace(k, v)

# regex replacements for dynamic string templates
text = re.sub(r'Long \$\{currentLongOrderType\} emri oluşturuldu!', 'Long ${currentLongOrderType} order created!', text)
text = re.sub(r'Short \$\{currentShortOrderType\} emri oluşturuldu!', 'Short ${currentShortOrderType} order created!', text)

with open('static/js/binance-trading-minimal.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done replacing JS!")
