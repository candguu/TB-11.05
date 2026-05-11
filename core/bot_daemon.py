import time
import threading
import sqlite3
from datetime import datetime
import os
import random
from core.logger import logger
from core.constants import BOT_TICK_INTERVAL, SIGNAL_DEBOUNCE_SECONDS
from core.tb_symbols import ALLOWED_TB_SYMBOLS

# We need the path to database
DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "tb_database.db"))

class TradingBotDaemon:
    def __init__(self):
        self.running = False
        self.thread = None
        self.app = None
        
        # Keep track of last signal times so we don't spam
        self.last_signals = {}
        
        logger.info("TradingBotDaemon initialized")

    def get_db_connection(self):
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            return conn
        except Exception as e:
            logger.error(f"Database connection error: {e}", exc_info=True)
            raise
        
    def start(self, app=None):
        if self.running:
            logger.warning("Bot daemon already running")
            return
        if app is not None:
            self.app = app
        self.running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        logger.info("Bot daemon started in background")

    def stop(self):
        if not self.running:
            return
        self.running = False
        if self.thread:
            self.thread.join(timeout=2)
        logger.info("Bot daemon stopped")

    def _get_active_configs(self):
        try:
            conn = self.get_db_connection()
            c = conn.cursor()
            # Hem eski bot_configs hem de yeni tb_bot_config için çalışabilir, ama biz tb_bot_config kullanacağız.
            # Şimdilik tb_bot_config tablosundan bot_enabled = 1 olanları alalım
            try:
                c.execute("SELECT * FROM tb_bot_config WHERE bot_enabled = 1")
                configs = c.fetchall()
            except sqlite3.OperationalError:
                configs = []
                
            # API Key'leri almak için api_keys tablosuna da ihtiyacımız var
            active_users = []
            for cfg in configs:
                if str(cfg["symbol"]).upper() not in ALLOWED_TB_SYMBOLS:
                    logger.warning(f"Invalid TB Bot symbol skipped: {cfg['symbol']}")
                    continue
                user_id = cfg["user_id"]
                c.execute("SELECT api_key_enc, api_secret_enc FROM user_api_keys WHERE user_id = ? AND is_active = 1", (user_id,))
                keys = c.fetchone()
                if keys:
                    from core.security import decrypt_api_key
                    try:
                        api_key = decrypt_api_key(keys["api_key_enc"])
                        api_secret = decrypt_api_key(keys["api_secret_enc"])
                        active_users.append({
                            "user_id": user_id,
                            "config": dict(cfg),
                            "api_key": api_key,
                            "api_secret": api_secret
                        })
                    except Exception as e:
                        logger.error(f"Error decrypting keys for user {user_id}: {e}")
            conn.close()
            return active_users
        except Exception as e:
            logger.error(f"Error fetching active configs: {e}", exc_info=True)
            return []

    def _process_bot(self, user_data):
        """Yeni TBBotEngine üzerinden işlemi yürütür."""
        try:
            from core.tb_bot_engine import TBBotEngine
            def run_engine():
                engine = TBBotEngine()
                engine.process_user_bot(
                    user_id=user_data["user_id"],
                    config=user_data["config"],
                    api_key=user_data["api_key"],
                    api_secret=user_data["api_secret"]
                )
            if self.app is not None:
                with self.app.app_context():
                    run_engine()
            else:
                run_engine()
        except Exception as e:
            logger.error(f"Error processing bot for user {user_data['user_id']}: {e}", exc_info=True)
                
    def _run_loop(self):
        logger.info("Bot daemon main loop started")
        while self.running:
            try:
                active_users = self._get_active_configs()
                if active_users:
                    logger.debug(f"Processing {len(active_users)} active bot configs")
                for user_data in active_users:
                    self._process_bot(user_data)
            except Exception as e:
                logger.error(f"Bot loop error: {e}", exc_info=True)
                
            # Control interval configden alınabilir ama genel daemon tick'i sabit kalabilir.
            time.sleep(10) # 10 saniyede bir kontrol et

# Global instance
bot_daemon = TradingBotDaemon()
