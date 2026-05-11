import sqlite3
import os
from flask import g
from datetime import datetime, timezone

DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "tb_database.db"))

def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db_dir = os.path.dirname(DB_PATH)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
        db = g._database = sqlite3.connect(DB_PATH, check_same_thread=False)
        db.row_factory = sqlite3.Row
    return db

def close_db(exc=None):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()

def init_db(app):
    db_dir = os.path.dirname(DB_PATH)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name    TEXT    NOT NULL,
            last_name     TEXT    NOT NULL,
            email         TEXT    NOT NULL UNIQUE,
            phone         TEXT,
            password_hash TEXT    NOT NULL,
            role          TEXT    NOT NULL DEFAULT 'user',
            is_active     INTEGER NOT NULL DEFAULT 1,
            is_verified   INTEGER NOT NULL DEFAULT 0,
            country       TEXT    DEFAULT 'TR',
            language      TEXT    DEFAULT 'tr',
            created_at    TEXT    NOT NULL,
            last_login    TEXT
        )
    """)

    # Migration: mevcut DB'ye is_verified ekle
    try:
        c.execute("ALTER TABLE users ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0")
        conn.commit()
    except Exception:
        pass
    
    # Migration: mevcut DB'ye country ekle
    try:
        c.execute("ALTER TABLE users ADD COLUMN country TEXT DEFAULT 'TR'")
        conn.commit()
    except Exception:
        pass
    
    # Migration: mevcut DB'ye language ekle
    try:
        c.execute("ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'tr'")
        conn.commit()
    except Exception:
        pass

    c.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            token      TEXT    NOT NULL,
            created_at TEXT    NOT NULL,
            expires_at TEXT    NOT NULL,
            revoked    INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS bot_configs (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id          INTEGER NOT NULL UNIQUE,
            exchange         TEXT    DEFAULT 'binance',
            api_key          TEXT,
            api_secret       TEXT,
            api_key_hint     TEXT,
            strategy         TEXT    DEFAULT 'hybrid',
            leverage         INTEGER DEFAULT 3,
            risk_per_trade   REAL    DEFAULT 2.0,
            max_positions    INTEGER DEFAULT 5,
            stop_loss        REAL    DEFAULT 3.0,
            take_profit      REAL    DEFAULT 6.0,
            timeframe        TEXT    DEFAULT '5m',
            is_active        INTEGER DEFAULT 0,
            updated_at       TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # Migration: Add api_key and api_secret columns if they don't exist
    try:
        c.execute("ALTER TABLE bot_configs ADD COLUMN api_key TEXT")
        conn.commit()
    except Exception:
        pass
    
    try:
        c.execute("ALTER TABLE bot_configs ADD COLUMN api_secret TEXT")
        conn.commit()
    except Exception:
        pass
    
    try:
        c.execute("ALTER TABLE bot_configs ADD COLUMN label TEXT")
        conn.commit()
    except Exception:
        pass

    c.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            type       TEXT    NOT NULL,
            title      TEXT    NOT NULL,
            message    TEXT    NOT NULL,
            is_read    INTEGER NOT NULL DEFAULT 0,
            created_at TEXT    NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id              INTEGER PRIMARY KEY,
            currency             TEXT    DEFAULT 'usd',
            theme                TEXT    DEFAULT 'dark',
            email_notifications  INTEGER DEFAULT 1,
            trade_notifications  INTEGER DEFAULT 1,
            security_alerts      INTEGER DEFAULT 1,
            price_alerts         INTEGER DEFAULT 0,
            auto_logout_minutes  INTEGER DEFAULT 30,
            api_whitelist        INTEGER DEFAULT 0,
            auto_trading         INTEGER DEFAULT 0,
            updated_at           TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # E-posta doğrulama tokenları
    c.execute("""
        CREATE TABLE IF NOT EXISTS email_verifications (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            token      TEXT    NOT NULL UNIQUE,
            created_at TEXT    NOT NULL,
            expires_at TEXT    NOT NULL,
            used       INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Şifre sıfırlama kodları
    c.execute("""
        CREATE TABLE IF NOT EXISTS password_resets (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            code       TEXT    NOT NULL,
            created_at TEXT    NOT NULL,
            expires_at TEXT    NOT NULL,
            used       INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Şifre değiştirme kodları (giriş yapmış kullanıcılar için)
    c.execute("""
        CREATE TABLE IF NOT EXISTS password_reset_codes (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            code       TEXT    NOT NULL,
            expires_at TEXT    NOT NULL,
            created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Binance API anahtarları (şifreli)
    c.execute("""
        CREATE TABLE IF NOT EXISTS api_keys (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id        INTEGER NOT NULL UNIQUE,
            api_key_enc    TEXT    NOT NULL,
            api_secret_enc TEXT    NOT NULL,
            is_testnet     INTEGER NOT NULL DEFAULT 1,
            is_valid       INTEGER NOT NULL DEFAULT 0,
            created_at     TEXT    NOT NULL,
            updated_at     TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # Çoklu API desteği için yeni tablo
    c.execute("""
        CREATE TABLE IF NOT EXISTS user_api_keys (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id        INTEGER NOT NULL,
            api_key_enc    TEXT    NOT NULL,
            api_secret_enc TEXT    NOT NULL,
            label          TEXT,
            is_testnet     INTEGER NOT NULL DEFAULT 1,
            is_active      INTEGER NOT NULL DEFAULT 0,
            is_valid       INTEGER NOT NULL DEFAULT 0,
            created_at     TEXT    NOT NULL,
            updated_at     TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # Index for faster queries
    c.execute("""
        CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id 
        ON user_api_keys(user_id)
    """)
    
    c.execute("""
        CREATE INDEX IF NOT EXISTS idx_user_api_keys_active 
        ON user_api_keys(user_id, is_active)
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS bot_logs (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            symbol     TEXT    NOT NULL,
            signal     TEXT    NOT NULL,
            price      REAL    NOT NULL,
            source     TEXT    NOT NULL,
            created_at TEXT    NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # TB Bot System Tables
    c.execute("""
        CREATE TABLE IF NOT EXISTS tb_bot_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            symbol TEXT DEFAULT 'SOLUSDT',
            trading_mode TEXT DEFAULT 'demo',
            bot_enabled INTEGER DEFAULT 0,
            timeframe TEXT DEFAULT '15m',
            direction_mode TEXT DEFAULT 'long_short',
            leverage INTEGER DEFAULT 3,
            margin_type TEXT DEFAULT 'ISOLATED',
            wait_candle_close INTEGER DEFAULT 1,
            prevent_same_signal_reentry INTEGER DEFAULT 1,
            opposite_signal_behavior TEXT DEFAULT 'close_position',
            order_type TEXT DEFAULT 'MARKET',
            control_interval_seconds INTEGER DEFAULT 10,
            trend_filter_enabled INTEGER DEFAULT 1,
            trend_filter_timeframe TEXT DEFAULT '1h',
            trend_filter_method TEXT DEFAULT 'EMA200',
            volatility_filter_mode TEXT DEFAULT 'normal',
            max_slippage_percent REAL DEFAULT 0.2,
            max_order_retries INTEGER DEFAULT 3,
            retry_delay_seconds INTEGER DEFAULT 2,
            cancel_if_price_moves INTEGER DEFAULT 1,
            retry_same_candle INTEGER DEFAULT 0,
            risk_per_trade_percent REAL DEFAULT 1.0,
            max_daily_loss_percent REAL DEFAULT 3.0,
            daily_profit_target_percent REAL DEFAULT 4.0,
            max_open_positions INTEGER DEFAULT 1,
            max_daily_trades INTEGER DEFAULT 5,
            consecutive_loss_limit INTEGER DEFAULT 3,
            cooldown_minutes INTEGER DEFAULT 15,
            stop_loss_type TEXT DEFAULT 'ATR',
            atr_multiplier REAL DEFAULT 1.5,
            take_profit_type TEXT DEFAULT 'RISK_REWARD',
            risk_reward_ratio REAL DEFAULT 2.0,
            break_even_enabled INTEGER DEFAULT 0,
            break_even_trigger_r REAL DEFAULT 0.8,
            break_even_mode TEXT DEFAULT 'MOVE_SL_TO_ENTRY',
            partial_tp_enabled INTEGER DEFAULT 0,
            tp1_r REAL DEFAULT 1.0,
            tp1_close_percent REAL DEFAULT 50.0,
            tp2_r REAL DEFAULT 1.5,
            tp2_close_percent REAL DEFAULT 50.0,
            reduce_risk_after_losses_enabled INTEGER DEFAULT 0,
            reduce_risk_after_losses_count INTEGER DEFAULT 2,
            reduced_risk_percent REAL DEFAULT 0.25,
            stop_after_losses_enabled INTEGER DEFAULT 0,
            stop_after_losses_count INTEGER DEFAULT 3,
            no_trade_zone_enabled INTEGER DEFAULT 0,
            ema200_avoid_enabled INTEGER DEFAULT 0,
            ema200_avoid_percent REAL DEFAULT 0.15,
            atr_min_filter_enabled INTEGER DEFAULT 0,
            atr_max_filter_enabled INTEGER DEFAULT 0,
            wick_filter_enabled INTEGER DEFAULT 0,
            spread_filter_enabled INTEGER DEFAULT 0,
            trailing_stop_enabled INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS tb_trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            symbol TEXT NOT NULL,
            mode TEXT NOT NULL,
            side TEXT NOT NULL,
            status TEXT NOT NULL,
            entry_price REAL NOT NULL,
            exit_price REAL,
            quantity REAL NOT NULL,
            leverage INTEGER NOT NULL,
            margin_type TEXT NOT NULL,
            stop_loss REAL,
            take_profit REAL,
            tp1_price REAL,
            tp2_price REAL,
            break_even_price REAL,
            tp1_close_percent REAL DEFAULT 50.0,
            tp2_close_percent REAL DEFAULT 50.0,
            tp1_hit INTEGER DEFAULT 0,
            break_even_activated INTEGER DEFAULT 0,
            remaining_quantity REAL,
            profile_name TEXT,
            realized_pnl REAL,
            unrealized_pnl REAL,
            commission REAL,
            entry_order_id TEXT,
            sl_order_id TEXT,
            tp_order_id TEXT,
            opened_at TEXT NOT NULL,
            closed_at TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    tb_bot_config_migrations = {
        "break_even_enabled": "INTEGER DEFAULT 0",
        "break_even_trigger_r": "REAL DEFAULT 0.8",
        "break_even_mode": "TEXT DEFAULT 'MOVE_SL_TO_ENTRY'",
        "partial_tp_enabled": "INTEGER DEFAULT 0",
        "tp1_r": "REAL DEFAULT 1.0",
        "tp1_close_percent": "REAL DEFAULT 50.0",
        "tp2_r": "REAL DEFAULT 1.5",
        "tp2_close_percent": "REAL DEFAULT 50.0",
        "reduce_risk_after_losses_enabled": "INTEGER DEFAULT 0",
        "reduce_risk_after_losses_count": "INTEGER DEFAULT 2",
        "reduced_risk_percent": "REAL DEFAULT 0.25",
        "stop_after_losses_enabled": "INTEGER DEFAULT 0",
        "stop_after_losses_count": "INTEGER DEFAULT 3",
        "no_trade_zone_enabled": "INTEGER DEFAULT 0",
        "ema200_avoid_enabled": "INTEGER DEFAULT 0",
        "ema200_avoid_percent": "REAL DEFAULT 0.15",
        "atr_min_filter_enabled": "INTEGER DEFAULT 0",
        "atr_max_filter_enabled": "INTEGER DEFAULT 0",
        "wick_filter_enabled": "INTEGER DEFAULT 0",
        "spread_filter_enabled": "INTEGER DEFAULT 0",
    }
    tb_trades_migrations = {
        "tp1_price": "REAL",
        "tp2_price": "REAL",
        "break_even_price": "REAL",
        "tp1_close_percent": "REAL DEFAULT 50.0",
        "tp2_close_percent": "REAL DEFAULT 50.0",
        "tp1_hit": "INTEGER DEFAULT 0",
        "break_even_activated": "INTEGER DEFAULT 0",
        "remaining_quantity": "REAL",
        "profile_name": "TEXT",
    }
    for column, definition in tb_bot_config_migrations.items():
        try:
            c.execute(f"ALTER TABLE tb_bot_config ADD COLUMN {column} {definition}")
        except sqlite3.OperationalError as exc:
            if "duplicate column name" not in str(exc).lower():
                raise
    for column, definition in tb_trades_migrations.items():
        try:
            c.execute(f"ALTER TABLE tb_trades ADD COLUMN {column} {definition}")
        except sqlite3.OperationalError as exc:
            if "duplicate column name" not in str(exc).lower():
                raise

    c.execute("""
        CREATE TABLE IF NOT EXISTS tb_bot_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            symbol TEXT NOT NULL,
            category TEXT NOT NULL,
            signal TEXT,
            decision TEXT,
            message TEXT NOT NULL,
            status TEXT NOT NULL,
            details_json TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS tb_bot_state (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            symbol TEXT DEFAULT 'SOLUSDT',
            last_signal TEXT,
            last_signal_time TEXT,
            last_candle_time TEXT,
            current_decision TEXT,
            cooldown_until TEXT,
            consecutive_losses INTEGER DEFAULT 0,
            daily_trade_count INTEGER DEFAULT 0,
            daily_pnl REAL DEFAULT 0.0,
            emergency_stopped INTEGER DEFAULT 0,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    conn.commit()
    _create_admin_if_missing(conn)
    conn.close()
    print("[DB] Veritabani hazir ->", DB_PATH)

def _create_admin_if_missing(conn):
    from core.security import _hash_password
    admin_email    = os.getenv("ADMIN_EMAIL", "admin@tbot.com")
    admin_password = os.getenv("ADMIN_PASSWORD")
    if not admin_password:
        print("[DB] UYARI: ADMIN_PASSWORD .env dosyasinda tanimli degil, admin hesabi atlaniyor.")
        return
    c = conn.cursor()
    c.execute("SELECT id FROM users WHERE email = ?", (admin_email,))
    if c.fetchone():
        # Admin zaten var — API key'leri güncelle
        _setup_admin_api_keys(conn)
        return
    pw_hash = _hash_password(admin_password)
    now = datetime.now(timezone.utc).isoformat()
    c.execute("""
        INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_verified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, ("Admin", "TB", admin_email, "", pw_hash, "admin", 1, now))
    uid = c.lastrowid
    c.execute("INSERT INTO bot_configs (user_id, strategy, leverage, risk_per_trade, is_active, updated_at) VALUES (?,?,?,?,?,?)",
              (uid, "hybrid", 3, 2.0, 1, now))
    c.execute("INSERT INTO notifications (user_id, type, title, message, created_at) VALUES (?,?,?,?,?)",
              (uid, "welcome", "TB'ye Hos Geldiniz!", "Hesabiniz olusturuldu. Binance API anahtarinizi baglayin.", now))
    conn.commit()
    print(f"[DB] Admin hesabi olusturuldu -> {admin_email}")
    _setup_admin_api_keys(conn)

def _setup_admin_api_keys(conn):
    """Admin hesabına .env'deki Binance API key'lerini otomatik ekle."""
    api_key = os.getenv("BINANCE_API_KEY", "").strip()
    api_secret = os.getenv("BINANCE_API_SECRET", "").strip()
    if not api_key or not api_secret:
        return

    admin_email = os.getenv("ADMIN_EMAIL", "admin@tbot.com")
    c = conn.cursor()
    c.execute("SELECT id FROM users WHERE email = ?", (admin_email,))
    row = c.fetchone()
    if not row:
        return
    uid = row[0]
    now = datetime.now(timezone.utc).isoformat()

    # bot_configs tablosuna API anahtarlarını ekle (binance_routes için)
    try:
        c.execute("SELECT id FROM bot_configs WHERE user_id=?", (uid,))
        if c.fetchone():
            c.execute("""
                UPDATE bot_configs 
                SET api_key=NULL, api_secret=NULL, api_key_hint=?, updated_at=?
                WHERE user_id=?
            """, (api_key[:8] + "...", now, uid))
        else:
            c.execute("""
                INSERT INTO bot_configs (user_id, api_key, api_secret, api_key_hint, strategy, leverage, risk_per_trade, is_active, updated_at)
                VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?)
            """, (uid, api_key[:8] + "...", "hybrid", 3, 2.0, 1, now))
    except Exception as e:
        print(f"[DB] Admin bot_configs API key setup hatasi: {e}")

    # api_keys tablosuna şifreli API anahtarlarını ekle (trading_routes için)
    try:
        from core.crypto_utils import encrypt_value
        api_key_enc = encrypt_value(api_key)
        api_secret_enc = encrypt_value(api_secret)
        
        c.execute("SELECT id FROM api_keys WHERE user_id=?", (uid,))
        if c.fetchone():
            c.execute("""
                UPDATE api_keys 
                SET api_key_enc=?, api_secret_enc=?, is_valid=1, updated_at=?
                WHERE user_id=?
            """, (api_key_enc, api_secret_enc, now, uid))
        else:
            c.execute("""
                INSERT INTO api_keys (user_id, api_key_enc, api_secret_enc, is_testnet, is_valid, created_at, updated_at)
                VALUES (?, ?, ?, 1, 1, ?, ?)
            """, (uid, api_key_enc, api_secret_enc, now, now))

        from core.security import encrypt_api_key
        api_key_enc2 = encrypt_api_key(api_key)
        api_secret_enc2 = encrypt_api_key(api_secret)
        c.execute("UPDATE user_api_keys SET is_active=0 WHERE user_id=?", (uid,))
        c.execute("SELECT id FROM user_api_keys WHERE user_id=? AND label=?", (uid, "Admin API"))
        if c.fetchone():
            c.execute("""
                UPDATE user_api_keys
                SET api_key_enc=?, api_secret_enc=?, is_active=1, is_valid=1, updated_at=?
                WHERE user_id=? AND label=?
            """, (api_key_enc2, api_secret_enc2, now, uid, "Admin API"))
        else:
            c.execute("""
                INSERT INTO user_api_keys
                (user_id, api_key_enc, api_secret_enc, label, is_testnet, is_active, is_valid, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, 1, 1, ?, ?)
            """, (uid, api_key_enc2, api_secret_enc2, "Admin API", now, now))
    except Exception as e:
        print(f"[DB] Admin api_keys setup hatasi: {e}")

    conn.commit()
    print("[DB] Admin API anahtarlari otomatik baglandi")
