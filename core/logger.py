"""
Merkezi Logging Sistemi
========================
Tüm uygulama için tutarlı logging yapılandırması.
"""

import logging
import os
from logging.handlers import RotatingFileHandler
from datetime import datetime

def setup_logger(name: str = "TB_Bot", level: str = None) -> logging.Logger:
    """
    Uygulama için logger oluştur.
    
    Args:
        name: Logger ismi
        level: Log seviyesi (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    
    Returns:
        Yapılandırılmış logger instance
    """
    # Log seviyesini environment'tan al veya default INFO
    if level is None:
        level = os.getenv("LOG_LEVEL", "INFO").upper()
    
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level, logging.INFO))
    
    # Eğer handler zaten eklenmişse tekrar ekleme
    if logger.handlers:
        return logger
    
    # Log formatı
    formatter = logging.Formatter(
        fmt='%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler (rotating)
    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
    os.makedirs(log_dir, exist_ok=True)
    
    log_file = os.path.join(log_dir, f"tb_bot_{datetime.now().strftime('%Y%m%d')}.log")
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    # Error log dosyası (sadece ERROR ve üstü)
    error_log_file = os.path.join(log_dir, f"tb_bot_errors_{datetime.now().strftime('%Y%m%d')}.log")
    error_handler = RotatingFileHandler(
        error_log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    logger.addHandler(error_handler)
    
    return logger

# Global logger instance
logger = setup_logger()

# ═══════════════════════════════════════════════════════════
# API LOGGING KONTROLÜ (PERFORMANS İYİLEŞTİRMESİ)
# ═══════════════════════════════════════════════════════════
API_LOGGING_ENABLED = True  # main.py'den kontrol edilecek

def log_api_call(endpoint: str, method: str, status_code: int, duration_ms: float, user_id: int = None):
    """API çağrılarını logla."""
    # Production'da API logging kapalı olabilir (performans için)
    if not API_LOGGING_ENABLED:
        return
    
    logger.info(
        f"API Call | {method} {endpoint} | Status: {status_code} | "
        f"Duration: {duration_ms:.2f}ms | User: {user_id or 'Anonymous'}"
    )

def log_trade(user_id: int, symbol: str, side: str, quantity: float, price: float, status: str):
    """Trade işlemlerini logla."""
    logger.info(
        f"Trade | User: {user_id} | {side} {quantity} {symbol} @ {price} | Status: {status}"
    )

def log_security_event(event_type: str, user_id: int = None, details: str = ""):
    """Güvenlik olaylarını logla."""
    logger.warning(
        f"Security Event | Type: {event_type} | User: {user_id or 'Unknown'} | {details}"
    )
