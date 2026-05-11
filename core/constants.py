"""
Uygulama Sabitleri
===================
Magic number'ları ve tekrar eden değerleri merkezi bir yerde toplar.
"""

# ═══════════════════════════════════════════════════════════════
# AUTHENTICATION & SECURITY
# ═══════════════════════════════════════════════════════════════

# Token süresi (gün)
TOKEN_EXPIRY_DAYS = 7

# Session timeout (dakika)
SESSION_TIMEOUT_MINUTES = 30

# Password hashing iterasyonu
PASSWORD_HASH_ITERATIONS = 260000

# Email doğrulama token süresi (saat)
EMAIL_VERIFICATION_EXPIRY_HOURS = 24

# Şifre sıfırlama kodu süresi (dakika)
PASSWORD_RESET_EXPIRY_MINUTES = 15

# Maksimum login denemesi
MAX_LOGIN_ATTEMPTS = 5

# Login deneme penceresi (dakika)
LOGIN_ATTEMPT_WINDOW_MINUTES = 15

# ═══════════════════════════════════════════════════════════════
# RATE LIMITING
# ═══════════════════════════════════════════════════════════════

# API rate limits (istek/dakika)
RATE_LIMIT_STRICT = 10
RATE_LIMIT_MODERATE = 30
RATE_LIMIT_RELAXED = 100
RATE_LIMIT_DEFAULT = 60

# Trading endpoint rate limits
RATE_LIMIT_TRADING = 20  # 20 istek/dakika
RATE_LIMIT_MARKET_DATA = 100  # 100 istek/dakika

# ═══════════════════════════════════════════════════════════════
# TRADING
# ═══════════════════════════════════════════════════════════════

# Desteklenen exchange'ler
SUPPORTED_EXCHANGES = ['binance']

# Desteklenen stratejiler
SUPPORTED_STRATEGIES = ['hybrid', 'ott', 'scalping', 'swing']

# Kaldıraç limitleri
MIN_LEVERAGE = 1
MAX_LEVERAGE = 125
DEFAULT_LEVERAGE = 3

# Risk yönetimi
MIN_RISK_PER_TRADE = 0.5  # %0.5
MAX_RISK_PER_TRADE = 10.0  # %10
DEFAULT_RISK_PER_TRADE = 2.0  # %2

# Pozisyon limitleri
MIN_POSITIONS = 1
MAX_POSITIONS = 20
DEFAULT_MAX_POSITIONS = 5

# Stop loss / Take profit
MIN_STOP_LOSS = 0.5  # %0.5
MAX_STOP_LOSS = 20.0  # %20
DEFAULT_STOP_LOSS = 3.0  # %3

MIN_TAKE_PROFIT = 1.0  # %1
MAX_TAKE_PROFIT = 50.0  # %50
DEFAULT_TAKE_PROFIT = 6.0  # %6

# Timeframe'ler
SUPPORTED_TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d']
DEFAULT_TIMEFRAME = '5m'

# Order types
ORDER_TYPES = ['MARKET', 'LIMIT', 'STOP_MARKET', 'TAKE_PROFIT_MARKET']

# Order sides
ORDER_SIDES = ['BUY', 'SELL']

# Margin types
MARGIN_TYPES = ['ISOLATED', 'CROSSED']

# ═══════════════════════════════════════════════════════════════
# BOT DAEMON
# ═══════════════════════════════════════════════════════════════

# Bot tick interval (saniye)
BOT_TICK_INTERVAL = 5

# Signal debounce süresi (saniye)
SIGNAL_DEBOUNCE_SECONDS = 60

# Maksimum retry sayısı
MAX_RETRY_ATTEMPTS = 3

# Retry delay (saniye)
RETRY_DELAY_SECONDS = 2

# ═══════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════

# Connection pool ayarları
DB_POOL_SIZE = 10
DB_MAX_OVERFLOW = 20
DB_POOL_TIMEOUT = 30

# Query timeout (saniye)
DB_QUERY_TIMEOUT = 30

# ═══════════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════════

# Log dosyası boyutu (MB)
LOG_FILE_MAX_SIZE_MB = 10

# Log dosyası backup sayısı
LOG_FILE_BACKUP_COUNT = 5

# Log seviyeleri
LOG_LEVELS = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']

# ═══════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════

# Binance API URLs
BINANCE_SPOT_BASE_URL = "https://api.binance.com/api"
BINANCE_FUTURES_BASE_URL = "https://fapi.binance.com/fapi"
BINANCE_TESTNET_SPOT_URL = "https://testnet.binance.vision/api"
BINANCE_TESTNET_FUTURES_URL = "https://testnet.binancefuture.com/fapi"
BINANCE_DEMO_SPOT_URL = "https://demo-api.binance.com/api"
BINANCE_DEMO_FUTURES_URL = "https://demo-fapi.binance.com/fapi"

# API timeout (saniye)
API_TIMEOUT_SECONDS = 10

# ═══════════════════════════════════════════════════════════════
# VALIDATION
# ═══════════════════════════════════════════════════════════════

# String uzunluk limitleri
MIN_NAME_LENGTH = 2
MAX_NAME_LENGTH = 50
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 100
MAX_EMAIL_LENGTH = 255
MAX_PHONE_LENGTH = 20
MAX_SYMBOL_LENGTH = 20

# Numeric limitleri
MIN_QUANTITY = 0.00000001
MIN_PRICE = 0.00000001

# ═══════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════

# Notification types
NOTIFICATION_TYPES = [
    'welcome',
    'trade',
    'alert',
    'security',
    'system',
    'error'
]

# Maksimum notification sayısı (kullanıcı başına)
MAX_NOTIFICATIONS_PER_USER = 100

# ═══════════════════════════════════════════════════════════════
# USER SETTINGS
# ═══════════════════════════════════════════════════════════════

# Desteklenen para birimleri
SUPPORTED_CURRENCIES = ['usd', 'eur', 'try', 'btc']

# Desteklenen temalar
SUPPORTED_THEMES = ['light', 'dark']

# Desteklenen diller
SUPPORTED_LANGUAGES = ['tr', 'en']

# Auto logout süreleri (dakika)
AUTO_LOGOUT_OPTIONS = [15, 30, 60, 120, 240]

# ═══════════════════════════════════════════════════════════════
# PAGINATION
# ═══════════════════════════════════════════════════════════════

# Default sayfa boyutu
DEFAULT_PAGE_SIZE = 20

# Maksimum sayfa boyutu
MAX_PAGE_SIZE = 100

# ═══════════════════════════════════════════════════════════════
# CACHE
# ═══════════════════════════════════════════════════════════════

# Cache TTL (saniye)
CACHE_TTL_SHORT = 60  # 1 dakika
CACHE_TTL_MEDIUM = 300  # 5 dakika
CACHE_TTL_LONG = 3600  # 1 saat

# Market data cache
MARKET_DATA_CACHE_TTL = 5  # 5 saniye

# ═══════════════════════════════════════════════════════════════
# ERROR MESSAGES
# ═══════════════════════════════════════════════════════════════

ERROR_MESSAGES = {
    'INVALID_CREDENTIALS': 'Email veya şifre hatalı',
    'USER_NOT_FOUND': 'Kullanıcı bulunamadı',
    'EMAIL_EXISTS': 'Bu email adresi zaten kayıtlı',
    'INVALID_TOKEN': 'Geçersiz veya süresi dolmuş token',
    'UNAUTHORIZED': 'Bu işlem için yetkiniz yok',
    'RATE_LIMIT_EXCEEDED': 'Çok fazla istek gönderdiniz. Lütfen bekleyin.',
    'INVALID_API_KEY': 'Geçersiz API anahtarı',
    'INSUFFICIENT_BALANCE': 'Yetersiz bakiye',
    'INVALID_SYMBOL': 'Geçersiz trading sembolü',
    'INVALID_QUANTITY': 'Geçersiz miktar',
    'INVALID_PRICE': 'Geçersiz fiyat',
    'ORDER_FAILED': 'Emir gönderilemedi',
    'POSITION_NOT_FOUND': 'Pozisyon bulunamadı',
    'DATABASE_ERROR': 'Veritabanı hatası',
    'NETWORK_ERROR': 'Ağ bağlantı hatası',
    'UNKNOWN_ERROR': 'Bilinmeyen bir hata oluştu',
}

# ═══════════════════════════════════════════════════════════════
# SUCCESS MESSAGES
# ═══════════════════════════════════════════════════════════════

SUCCESS_MESSAGES = {
    'LOGIN_SUCCESS': 'Giriş başarılı',
    'REGISTER_SUCCESS': 'Kayıt başarılı',
    'LOGOUT_SUCCESS': 'Çıkış başarılı',
    'PASSWORD_CHANGED': 'Şifre değiştirildi',
    'SETTINGS_UPDATED': 'Ayarlar güncellendi',
    'API_KEY_SAVED': 'API anahtarı kaydedildi',
    'ORDER_PLACED': 'Emir gönderildi',
    'ORDER_CANCELLED': 'Emir iptal edildi',
    'POSITION_CLOSED': 'Pozisyon kapatıldı',
}
