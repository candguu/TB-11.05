import json
import time
from datetime import datetime, timezone
from core.database import get_db
from core.logger import logger
from core.tb_market_data import fetch_klines, get_closed_candles
from core.tb_signal_engine import TBSignalEngine
from core.tb_risk_manager import TBRiskManager
from core.tb_execution_engine import TBExecutionEngine
from core.tb_position_manager import TBPositionManager
from core.tb_symbols import ALLOWED_TB_SYMBOLS, DEFAULT_TB_SYMBOL

class TBBotEngine:
    def __init__(self):
        self.signal_engine = TBSignalEngine()
        self.risk_manager = TBRiskManager()
        self.position_manager = TBPositionManager()

    def process_user_bot(self, user_id: int, config: dict, api_key: str, api_secret: str):
        symbol = str(config.get("symbol") or DEFAULT_TB_SYMBOL).upper()
        timeframe = config.get("timeframe", "5m")

        if symbol not in ALLOWED_TB_SYMBOLS or config.get("trading_mode") != "demo" or not int(config.get("bot_enabled", 0)):
            return
        logger.info(f"TBBotEngine cycle started | symbol={symbol} | timeframe={timeframe}")

        db = get_db()
        state = db.execute("SELECT * FROM tb_bot_state WHERE user_id=? AND symbol=?", (user_id, symbol)).fetchone()
        if not state:
            existing_state = db.execute("SELECT id FROM tb_bot_state WHERE user_id=?", (user_id,)).fetchone()
            now = datetime.now(timezone.utc).isoformat()
            if existing_state:
                db.execute("UPDATE tb_bot_state SET symbol=?, current_decision=NULL, updated_at=? WHERE id=?", (symbol, now, existing_state["id"]))
            else:
                db.execute(
                    "INSERT INTO tb_bot_state (user_id, symbol, updated_at) VALUES (?, ?, ?)",
                    (user_id, symbol, now),
                )
            db.commit()
            state = db.execute("SELECT * FROM tb_bot_state WHERE user_id=? AND symbol=?", (user_id, symbol)).fetchone()
        state = dict(state)

        if state.get("emergency_stopped"):
            return

        candles_tf_all = fetch_klines(symbol, timeframe, 150)
        candles_1h_all = fetch_klines(symbol, "1h", 250)
        if not candles_tf_all or not candles_1h_all:
            self._log_event(user_id, symbol, "ERROR", "DATA", f"{symbol} market data alınamadı.", "ERROR")
            return
        logger.info(f"{symbol} candles fetched")

        candles_tf = get_closed_candles(candles_tf_all) if config.get("wait_candle_close", 1) else candles_tf_all
        candles_1h = get_closed_candles(candles_1h_all)
        if not candles_tf:
            return

        current_candle_time = str(candles_tf[-1]["t"])
        current_price = float(candles_tf_all[-1]["c"])
        exec_engine = TBExecutionEngine(api_key, api_secret, expected_symbol=symbol)

        pm_res = self.position_manager.manage_open_position(user_id, symbol, current_price, state, config)
        if pm_res.get("action") in ("CLOSED_TP2", "CLOSED_SL"):
            state = db.execute("SELECT * FROM tb_bot_state WHERE user_id=? AND symbol=?", (user_id, symbol)).fetchone()
            state = dict(state) if state else state

        last_candle_time = state.get("last_candle_time") if state else None
        if (
            not pm_res.get("has_open_position")
            and not int(config.get("retry_same_candle", 0))
            and last_candle_time
            and current_candle_time == str(last_candle_time)
        ):
            self._update_state(db, user_id, symbol, {"current_decision": "Ayni mumda tekrar deneme kapali."})
            return

        signal_data = self.signal_engine.evaluate_signal(candles_tf, candles_1h, config)
        logger.info(f"{symbol} decision: {signal_data.get('decision', 'WAIT')}")
        if signal_data["decision"] == "WAIT":
            category = signal_data.get("category")
            if category == "NO_TRADE_ZONE":
                self._log_event(user_id, symbol, "NO_TRADE_ZONE", signal_data.get("raw_signal"), signal_data["reason"], "WAIT")
            if state.get("current_decision") != signal_data["reason"]:
                self._update_state(db, user_id, symbol, {"current_decision": signal_data["reason"]})
            return

        raw_signal = signal_data["raw_signal"]
        open_pos = self.position_manager.get_open_position(user_id, symbol)
        if open_pos:
            same_side = (open_pos["side"] == "LONG" and raw_signal == "BUY") or (open_pos["side"] == "SHORT" and raw_signal == "SELL")
            if same_side:
                self._log_event(user_id, symbol, "POSITION_MANAGEMENT", raw_signal, "Ayni yonde pozisyon mevcut, yeni pozisyon acilmadi.", "REJECTED")
                self._update_state(db, user_id, symbol, {"last_signal": raw_signal, "last_candle_time": current_candle_time})
                return

            op_res = self.position_manager.handle_opposite_signal(open_pos, raw_signal, config, exec_engine)
            self._log_event(user_id, symbol, "POSITION_MANAGEMENT", raw_signal, op_res["reason"], "INFO")
            if op_res["action"] in ("CLOSED", "REVERSE_READY"):
                db.execute(
                    "UPDATE tb_trades SET status='CLOSED_OPPOSITE', exit_price=?, closed_at=? WHERE id=?",
                    (current_price, datetime.now(timezone.utc).isoformat(), open_pos["id"]),
                )
                db.commit()
            self._update_state(db, user_id, symbol, {"last_signal": raw_signal, "last_candle_time": current_candle_time})
            return

        d_mode = config.get("direction_mode", "long_short")
        if d_mode == "long_only" and raw_signal == "SELL":
            self._log_event(user_id, symbol, "RISK_CHECK", raw_signal, "Direction Mode sadece Long islemlere izin veriyor.", "REJECTED")
            self._update_state(db, user_id, symbol, {"last_signal": raw_signal, "last_candle_time": current_candle_time})
            return
        if d_mode == "short_only" and raw_signal == "BUY":
            self._log_event(user_id, symbol, "RISK_CHECK", raw_signal, "Direction Mode sadece Short islemlere izin veriyor.", "REJECTED")
            self._update_state(db, user_id, symbol, {"last_signal": raw_signal, "last_candle_time": current_candle_time})
            return

        signal_price = float(signal_data.get("signal_price") or candles_tf[-1]["c"])
        max_slippage = float(config.get("max_slippage_percent", 0.2))
        price_move_percent = abs(current_price - signal_price) / signal_price * 100 if signal_price else 0
        moved_against_entry = (raw_signal == "BUY" and current_price > signal_price) or (raw_signal == "SELL" and current_price < signal_price)
        if int(config.get("cancel_if_price_moves", 1)) and moved_against_entry and price_move_percent > max_slippage:
            self._log_event(user_id, symbol, "PRICE_MOVED", raw_signal, "Fiyat sinyalden uzaklasti, islem iptal edildi.", "REJECTED")
            self._update_state(db, user_id, symbol, {"last_signal": raw_signal, "last_candle_time": current_candle_time, "current_decision": "Fiyat sinyalden uzaklasti."})
            return

        balance = exec_engine.get_account_balance()
        if balance <= 0:
            self._log_event(user_id, symbol, "RISK_CHECK", raw_signal, "Hesap bakiyesi yetersiz veya okunamadi.", "ERROR")
            return

        risk_res = self.risk_manager.evaluate_risk(raw_signal, current_price, balance, candles_tf, config, state)
        if not risk_res["allowed"]:
            self._log_event(user_id, symbol, risk_res.get("category", "RISK_CHECK"), raw_signal, f"Risk reddi: {risk_res['reason']}", "REJECTED")
            self._update_state(db, user_id, symbol, {"last_signal": raw_signal, "last_candle_time": current_candle_time})
            return

        if risk_res.get("risk_reduced"):
            self._log_event(user_id, symbol, "RISK_REDUCED", raw_signal, f"Arka arkaya zarar nedeniyle risk %{risk_res['risk_percent']} seviyesine dusuruldu.", "INFO")

        self._log_event(user_id, symbol, "PROFILE", raw_signal, "TB Aktif Demo Profil v2", "INFO")
        self._log_event(user_id, symbol, "RISK_CHECK", raw_signal, f"Risk uygun. Qty: {risk_res['quantity']} (SL: {risk_res['stop_loss']}, TP1: {risk_res['tp1']}, TP2: {risk_res['tp2']})", "APPROVED")

        if not exec_engine.setup_symbol(symbol, int(config.get("leverage", 5)), config.get("margin_type", "ISOLATED")):
            self._log_event(user_id, symbol, "ORDER", raw_signal, "Kaldirac veya margin tipi ayarlanamadi, emir gonderilmedi.", "ERROR")
            return

        order_res = exec_engine.execute_market_order(symbol, raw_signal, risk_res["quantity"])
        if not order_res["success"]:
            self._log_event(user_id, symbol, "ERROR", raw_signal, f"Emir basarisiz: {order_res.get('error')}", "ERROR")
            return

        fill_price = float(order_res.get("fill_price") or current_price)
        slippage_percent = abs(fill_price - current_price) / current_price * 100 if current_price else 0
        if slippage_percent > max_slippage:
            self._log_event(user_id, symbol, "PRICE_MOVED", raw_signal, f"Slippage limiti asildi (%{slippage_percent:.2f})", "WARNING")

        exec_engine.place_stop_loss(symbol, raw_signal, risk_res["quantity"], risk_res["stop_loss"])
        if not int(config.get("partial_tp_enabled", 0)):
            exec_engine.place_take_profit(symbol, raw_signal, risk_res["quantity"], risk_res["take_profit"])

        now = datetime.now(timezone.utc).isoformat()
        db.execute(
            """
            INSERT INTO tb_trades
            (user_id, symbol, mode, side, status, entry_price, quantity, leverage, margin_type,
             stop_loss, take_profit, tp1_price, tp2_price, break_even_price, tp1_close_percent,
             tp2_close_percent, remaining_quantity, profile_name, entry_order_id, opened_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                symbol,
                "demo",
                "LONG" if raw_signal == "BUY" else "SHORT",
                "OPEN",
                fill_price,
                risk_res["quantity"],
                int(config.get("leverage", 5)),
                config.get("margin_type", "ISOLATED"),
                risk_res["stop_loss"],
                risk_res["take_profit"],
                risk_res["tp1"],
                risk_res["tp2"],
                risk_res["break_even"],
                risk_res["tp1_close_percent"],
                risk_res["tp2_close_percent"],
                risk_res["quantity"],
                "TB Aktif Demo Profil v2",
                order_res.get("order_id"),
                now,
                now,
            ),
        )

        cooldown_until = time.time() + (float(config.get("cooldown_minutes", 5)) * 60)
        self._update_state(db, user_id, symbol, {
            "last_signal": raw_signal,
            "last_candle_time": current_candle_time,
            "daily_trade_count": int(state.get("daily_trade_count") or 0) + 1,
            "cooldown_until": str(cooldown_until),
            "current_decision": "Islem basariyla acildi.",
        })
        self._log_event(user_id, symbol, "SYSTEM", raw_signal, f"Pozisyon acildi. Fiyat: {fill_price}, SL: {risk_res['stop_loss']}, TP1: {risk_res['tp1']}, TP2: {risk_res['tp2']}", "SUCCESS")
        db.commit()
    def _log_event(self, user_id, symbol, category, signal, message, status):
        try:
            db = get_db()
            db.execute("""
                INSERT INTO tb_bot_logs (user_id, symbol, category, signal, message, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_id, symbol, category, signal, message, status, datetime.now(timezone.utc).isoformat()))
            db.commit()
        except Exception as e:
            logger.error(f"TB Bot Log Error: {e}")

    def _update_state(self, db, user_id, symbol, updates):
        keys = list(updates.keys())
        keys.append("updated_at")
        values = list(updates.values())
        values.append(datetime.now(timezone.utc).isoformat())
        
        set_clause = ", ".join([f"{k}=?" for k in keys])
        values.append(user_id)
        values.append(symbol)
        
        db.execute(f"UPDATE tb_bot_state SET {set_clause} WHERE user_id=? AND symbol=?", tuple(values))
        db.commit()

