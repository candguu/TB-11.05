from datetime import datetime, timezone
from typing import Any, Dict, Optional

from core.database import get_db


class TBPositionManager:
    """Synchronizes demo position lifecycle with tb_trades."""

    def get_open_position(self, user_id: int, symbol: str) -> Optional[Dict[str, Any]]:
        db = get_db()
        row = db.execute(
            """
            SELECT * FROM tb_trades
            WHERE user_id=? AND symbol=? AND status IN ('OPEN', 'PARTIAL_TP1')
            ORDER BY id DESC
            LIMIT 1
            """,
            (user_id, symbol),
        ).fetchone()
        return dict(row) if row else None

    def manage_open_position(
        self,
        user_id: int,
        symbol: str,
        current_price: float,
        state: Dict[str, Any],
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        db = get_db()
        position = self.get_open_position(user_id, symbol)
        if not position:
            return {"has_open_position": False, "action": "NONE"}

        side = position["side"]
        entry = float(position["entry_price"])
        quantity = float(position["quantity"])
        remaining_qty = float(position.get("remaining_quantity") or quantity)
        stop_loss = position.get("stop_loss")
        tp1 = position.get("tp1_price")
        tp2 = position.get("tp2_price") or position.get("take_profit")
        break_even = position.get("break_even_price")
        now = datetime.now(timezone.utc).isoformat()

        def reached(price):
            if price is None:
                return False
            price = float(price)
            return current_price >= price if side == "LONG" else current_price <= price

        def stopped(price):
            if price is None:
                return False
            price = float(price)
            return current_price <= price if side == "LONG" else current_price >= price

        def pnl(exit_price, close_qty):
            direction = 1 if side == "LONG" else -1
            return (float(exit_price) - entry) * close_qty * direction

        if int(config.get("break_even_enabled", 0)) and not int(position.get("break_even_activated") or 0) and reached(break_even):
            db.execute(
                "UPDATE tb_trades SET stop_loss=?, break_even_activated=1 WHERE id=?",
                (entry, position["id"]),
            )
            self._log(user_id, symbol, "BREAK_EVEN", "Stop-loss entry fiyatina cekildi", "INFO")
            db.commit()
            position["stop_loss"] = entry
            stop_loss = entry

        if int(config.get("partial_tp_enabled", 0)) and not int(position.get("tp1_hit") or 0) and reached(tp1):
            close_percent = float(position.get("tp1_close_percent") or config.get("tp1_close_percent", 50.0))
            close_qty = min(remaining_qty, quantity * (close_percent / 100.0))
            new_remaining = max(0.0, remaining_qty - close_qty)
            realized = float(position.get("realized_pnl") or 0) + pnl(tp1, close_qty)
            db.execute(
                """
                UPDATE tb_trades
                SET status='PARTIAL_TP1', tp1_hit=1, remaining_quantity=?, realized_pnl=?, stop_loss=?
                WHERE id=?
                """,
                (new_remaining, realized, entry if int(config.get("break_even_enabled", 0)) else stop_loss, position["id"]),
            )
            self._log(user_id, symbol, "PARTIAL_TP", "TP1 goruldu, pozisyonun %50'si kapatildi", "INFO")
            db.commit()
            return {"has_open_position": True, "action": "PARTIAL_TP1"}

        if reached(tp2):
            close_qty = remaining_qty
            realized = float(position.get("realized_pnl") or 0) + pnl(tp2, close_qty)
            db.execute(
                """
                UPDATE tb_trades
                SET status='CLOSED_TP2', exit_price=?, realized_pnl=?, remaining_quantity=0, closed_at=?
                WHERE id=?
                """,
                (tp2, realized, now, position["id"]),
            )
            self._update_state_after_close(db, user_id, symbol, state, realized)
            self._log(user_id, symbol, "POSITION_MANAGEMENT", "TP2 goruldu, kalan pozisyon kapatildi", "SUCCESS")
            db.commit()
            return {"has_open_position": False, "action": "CLOSED_TP2"}

        if stopped(stop_loss):
            close_qty = remaining_qty
            realized = float(position.get("realized_pnl") or 0) + pnl(stop_loss, close_qty)
            db.execute(
                """
                UPDATE tb_trades
                SET status='CLOSED_SL', exit_price=?, realized_pnl=?, remaining_quantity=0, closed_at=?
                WHERE id=?
                """,
                (stop_loss, realized, now, position["id"]),
            )
            self._update_state_after_close(db, user_id, symbol, state, realized)
            self._log(user_id, symbol, "POSITION_MANAGEMENT", "Stop-loss goruldu, pozisyon kapatildi", "INFO")
            db.commit()
            return {"has_open_position": False, "action": "CLOSED_SL"}

        return {"has_open_position": True, "action": "HOLD"}

    def handle_opposite_signal(
        self,
        open_pos: Dict[str, Any],
        new_signal: str,
        config: Dict[str, Any],
        execution_engine,
    ) -> Dict[str, Any]:
        behavior = config.get("opposite_signal_behavior", "close_position")
        if behavior == "wait":
            return {"action": "NONE", "reason": "Ters sinyal geldi, ayar bekle oldugu icin islem yapilmadi."}

        side = open_pos["side"]
        quantity = open_pos.get("remaining_quantity") or open_pos["quantity"]
        symbol = open_pos["symbol"]
        res = execution_engine.close_position(symbol, side, quantity)
        if not res["success"]:
            return {"action": "ERROR", "reason": f"Pozisyon kapatilamadi: {res.get('error')}"}

        execution_engine.cancel_all_orders(symbol)
        if behavior == "close_position":
            return {"action": "CLOSED", "reason": "Ters sinyal geldi, pozisyon kapatildi."}
        if behavior == "reverse_trade":
            return {"action": "REVERSE_READY", "reason": "Ters sinyal geldi, mevcut pozisyon kapatildi."}
        return {"action": "NONE", "reason": "Gecersiz opposite_signal_behavior ayari."}

    def _update_state_after_close(self, db, user_id, symbol, state, realized):
        consecutive_losses = int(state.get("consecutive_losses") or 0)
        if realized < 0:
            consecutive_losses += 1
        else:
            consecutive_losses = 0
        daily_pnl = float(state.get("daily_pnl") or 0) + float(realized or 0)
        db.execute(
            """
            UPDATE tb_bot_state
            SET consecutive_losses=?, daily_pnl=?, current_decision=?, updated_at=?
            WHERE user_id=? AND symbol=?
            """,
            (
                consecutive_losses,
                daily_pnl,
                "Pozisyon yonetimi tamamlandi.",
                datetime.now(timezone.utc).isoformat(),
                user_id,
                symbol,
            ),
        )

    def _log(self, user_id, symbol, category, message, status):
        db = get_db()
        db.execute(
            """
            INSERT INTO tb_bot_logs (user_id, symbol, category, message, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, symbol, category, message, status, datetime.now(timezone.utc).isoformat()),
        )
