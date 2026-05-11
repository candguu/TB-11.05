"""
TB Trading Bot - Ana Backend Sunucu
=====================================
Kurulum:
    pip install flask flask-cors requests bcrypt pyjwt python-dotenv

Çalıştır:
    python main.py

Tarayıcı: http://localhost:5000
"""

import os
import sys
from flask import Flask, request, g
from flask_cors import CORS
from dotenv import load_dotenv
from core.database import init_db, close_db
import time

# Ortam değişkenlerini yükle
load_dotenv()

# Environment validation
from core.env_validator import validate_environment
validate_environment(strict=True)

# Logger'ı başlat
from core.logger import logger, log_api_call

# Uygulamayı Oluştur
app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True

# CORS Ayarları
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5000").split(",")
CORS(app, supports_credentials=True, origins=ALLOWED_ORIGINS)

logger.info(f"Application starting with CORS origins: {ALLOWED_ORIGINS}")

# Blueprint'leri İçe Aktar ve Kaydet
from routes.auth_routes import auth_bp
from routes.bot_routes import bot_bp
from routes.user_routes import user_bp
from routes.market_routes import market_bp
from routes.page_routes import page_bp
from routes.chart_routes import chart_bp, tb_bot_chart_bp
from routes.ott_routes import ott_bp
from routes.trading_routes import trading_bp
from routes.binance_routes import binance_bp
from routes.tb_bot_routes import tb_bot_api_bp

app.register_blueprint(page_bp)
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(bot_bp, url_prefix="/api/bot")
app.register_blueprint(user_bp, url_prefix="/api/user")
app.register_blueprint(market_bp, url_prefix="/api/market")
app.register_blueprint(chart_bp, url_prefix="/api/chart")
app.register_blueprint(tb_bot_chart_bp, url_prefix="/api/tb-bot")
app.register_blueprint(tb_bot_api_bp, url_prefix="/api/tb-bot")
app.register_blueprint(ott_bp, url_prefix="/api/ott")
app.register_blueprint(trading_bp, url_prefix="/api/trading")
app.register_blueprint(binance_bp, url_prefix="/api/binance")

logger.info("All blueprints registered successfully")

# Request logging middleware
@app.before_request
def before_request():
    g.start_time = time.time()

@app.after_request
def after_request(response):
    if hasattr(g, 'start_time'):
        duration_ms = (time.time() - g.start_time) * 1000
        user_id = getattr(g, 'user_id', None)
        
        # API çağrılarını logla (static dosyalar hariç)
        if request.path.startswith('/api/'):
            log_api_call(
                endpoint=request.path,
                method=request.method,
                status_code=response.status_code,
                duration_ms=duration_ms,
                user_id=user_id
            )
    
    # ═══════════════════════════════════════════════════════════
    # STATIC DOSYA CACHE (PERFORMANS İYİLEŞTİRMESİ)
    # ═══════════════════════════════════════════════════════════
    if request.path.startswith('/static/'):
        # 1 yıl cache (31536000 saniye)
        response.cache_control.max_age = 31536000
        response.cache_control.public = True
        # Expires header ekle
        from datetime import datetime, timedelta
        expires = datetime.utcnow() + timedelta(days=365)
        response.headers['Expires'] = expires.strftime('%a, %d %b %Y %H:%M:%S GMT')
    
    return response

# Error handlers
@app.errorhandler(404)
def not_found(error):
    logger.warning(f"404 Not Found: {request.path}")
    from flask import jsonify
    return jsonify({"error": "Endpoint bulunamadı"}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"500 Internal Server Error: {error}", exc_info=True)
    from flask import jsonify
    return jsonify({"error": "Sunucu hatası"}), 500

@app.errorhandler(Exception)
def handle_exception(error):
    logger.error(f"Unhandled exception: {error}", exc_info=True)
    from flask import jsonify
    return jsonify({"error": "Beklenmeyen bir hata oluştu"}), 500

# Uygulama Kapanırken DB Bağlantısını Kapat
app.teardown_appcontext(close_db)

if __name__ == "__main__":
    PORT = int(os.getenv("PORT", 5000))
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"
    
    # ═══════════════════════════════════════════════════════════
    # PRODUCTION'DA SADECE ERROR LOGLA (PERFORMANS İYİLEŞTİRMESİ)
    # ═══════════════════════════════════════════════════════════
    if not DEBUG:
        import logging
        logger.setLevel(logging.ERROR)
        # API call logging'i de kapat (performans için)
        import core.logger as logger_module
        logger_module.API_LOGGING_ENABLED = False
        logger.info("🔇 Production mode: Logging level set to ERROR only, API logging disabled")
    
    logger.info("="*70)
    logger.info(f"TB Trading Bot Starting ({'DEBUG' if DEBUG else 'PRODUCTION'} mode)")
    logger.info(f"Port: {PORT}")
    logger.info(f"Allowed Origins: {', '.join(ALLOWED_ORIGINS)}")
    logger.info("="*70)
    
    # DB'yi başlat
    with app.app_context():
        try:
            init_db(app)
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Database initialization failed: {e}", exc_info=True)
            sys.exit(1)
        
    # Start background bot daemon
    from core.bot_daemon import bot_daemon
    try:
        bot_daemon.start(app)
        logger.info("Bot daemon started successfully")
    except Exception as e:
        logger.error(f"Bot daemon start failed: {e}", exc_info=True)
        
    logger.info(f"Server running at http://localhost:{PORT}")
    logger.info("Press CTRL+C to stop")
    
    try:
        app.run(host="0.0.0.0", port=PORT, debug=DEBUG, use_reloader=False)
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
    finally:
        logger.info("Shutting down bot daemon...")
        bot_daemon.stop()
        logger.info("Application stopped gracefully")
