import math
import time
from typing import Any, Dict, List
from core.tb_market_data import get_exchange_filters


class TBRiskManager:
    """Position sizing, stop levels, partial TP levels and trade limits."""

    def calculate_atr(self, candles: List[Dict[str, Any]], period: int = 14) -> float:
        if len(candles) < period + 1:
            return 0.0

        tr_list = []
        for i in range(1, len(candles)):
            high = candles[i]["h"]
            low = candles[i]["l"]
            prev_close = candles[i - 1]["c"]
            tr_list.append(max(high - low, abs(high - prev_close), abs(low - prev_close)))

        return sum(tr_list[-period:]) / period

    def _floor_to_step(self, value: float, step: float) -> float:
        if step <= 0:
            return value
        precision = max(0, min(10, int(round(-math.log10(step))) if step < 1 else 0))
        return round(math.floor(value / step) * step, precision)

    def _round_to_tick(self, value: float, tick: float) -> float:
        if tick <= 0:
            return value
        precision = max(0, min(10, int(round(-math.log10(tick))) if tick < 1 else 0))
        return round(round(value / tick) * tick, precision)

    def evaluate_risk(
        self,
        signal: str,
        entry_price: float,
        account_balance: float,
        candles_15m: List[Dict[str, Any]],
        config: Dict[str, Any],
        state: Dict[str, Any],
    ) -> Dict[str, Any]:
        daily_trade_count = int(state.get("daily_trade_count") or 0)
        daily_pnl = float(state.get("daily_pnl") or 0)
        consecutive_losses = int(state.get("consecutive_losses") or 0)

        if daily_trade_count >= int(config.get("max_daily_trades", 5)):
            return {"allowed": False, "reason": "Gunluk islem limiti asildi", "category": "DAILY_LIMIT"}

        if daily_pnl <= -(account_balance * float(config.get("max_daily_loss_percent", 3.0)) / 100):
            return {"allowed": False, "reason": "Gunluk maksimum zarar limiti asildi", "category": "DAILY_LIMIT"}

        if daily_pnl >= (account_balance * float(config.get("daily_profit_target_percent", 4.0)) / 100):
            return {"allowed": False, "reason": "Gunluk hedef kar tamamlandi, yeni islem acilmayacak", "category": "DAILY_LIMIT"}

        if int(config.get("stop_after_losses_enabled", 0)) and consecutive_losses >= int(config.get("stop_after_losses_count", 3)):
            return {
                "allowed": False,
                "reason": "3 arka arkaya zarar nedeniyle bot yeni islem acmayi durdurdu.",
                "category": "RISK_REDUCED",
            }

        if consecutive_losses >= int(config.get("consecutive_loss_limit", 3)):
            return {"allowed": False, "reason": "Arka arkaya zarar limiti asildi", "category": "RISK_CHECK"}

        current_time = time.time()
        cooldown = float(state.get("cooldown_until") or 0)
        if current_time < cooldown:
            return {"allowed": False, "reason": "Cooldown suresi henuz dolmadi", "category": "RISK_CHECK"}

        if config.get("stop_loss_type", "ATR") != "ATR":
            return {"allowed": False, "reason": "Sadece ATR stop loss desteklenmektedir", "category": "RISK_CHECK"}

        atr = self.calculate_atr(candles_15m, 14)
        if atr <= 0:
            return {"allowed": False, "reason": "ATR hesaplanamadi", "category": "RISK_CHECK"}

        stop_distance = atr * float(config.get("atr_multiplier", 1.5))
        risk_reward_ratio = float(config.get("risk_reward_ratio", 2.0))

        if signal == "BUY":
            stop_loss = entry_price - stop_distance
            take_profit = entry_price + (stop_distance * risk_reward_ratio)
        else:
            stop_loss = entry_price + stop_distance
            take_profit = entry_price - (stop_distance * risk_reward_ratio)

        symbol = str(config.get("symbol") or "").upper()
        filters = get_exchange_filters(symbol)
        if not filters:
            return {"allowed": False, "reason": f"{symbol} exchange filter bilgisi alınamadı", "category": "RISK_CHECK"}

        stop_loss = self._round_to_tick(stop_loss, filters["tick_size"])
        take_profit = self._round_to_tick(take_profit, filters["tick_size"])
        stop_distance_abs = abs(entry_price - stop_loss)
        if stop_distance_abs == 0:
            return {"allowed": False, "reason": "Stop distance sifir olamaz", "category": "RISK_CHECK"}

        risk_percent = float(config.get("risk_per_trade_percent", 1.0))
        risk_reduced = False
        if (
            int(config.get("reduce_risk_after_losses_enabled", 0))
            and consecutive_losses >= int(config.get("reduce_risk_after_losses_count", 2))
        ):
            risk_percent = float(config.get("reduced_risk_percent", risk_percent))
            risk_reduced = True

        risk_amount = account_balance * (risk_percent / 100.0)
        raw_quantity = risk_amount / stop_distance_abs
        quantity = self._floor_to_step(raw_quantity, filters["step_size"])

        if quantity < filters["min_qty"]:
            return {"allowed": False, "reason": f"{symbol} quantity minimum şartları sağlamıyor.", "category": "RISK_CHECK"}
        if filters["min_notional"] and quantity * entry_price < filters["min_notional"]:
            return {"allowed": False, "reason": f"{symbol} minimum notional şartı sağlanmıyor.", "category": "RISK_CHECK"}

        tp1_r = float(config.get("tp1_r", 1.0))
        tp2_r = float(config.get("tp2_r", risk_reward_ratio))
        break_even_r = float(config.get("break_even_trigger_r", 0.8))
        if signal == "BUY":
            tp1 = self._round_to_tick(entry_price + (stop_distance_abs * tp1_r), filters["tick_size"])
            tp2 = self._round_to_tick(entry_price + (stop_distance_abs * tp2_r), filters["tick_size"])
            break_even_price = self._round_to_tick(entry_price + (stop_distance_abs * break_even_r), filters["tick_size"])
        else:
            tp1 = self._round_to_tick(entry_price - (stop_distance_abs * tp1_r), filters["tick_size"])
            tp2 = self._round_to_tick(entry_price - (stop_distance_abs * tp2_r), filters["tick_size"])
            break_even_price = self._round_to_tick(entry_price - (stop_distance_abs * break_even_r), filters["tick_size"])

        return {
            "allowed": True,
            "reason": "Risk limitleri uygun",
            "category": "RISK_REDUCED" if risk_reduced else "RISK_CHECK",
            "risk_percent": risk_percent,
            "risk_reduced": risk_reduced,
            "risk_amount": risk_amount,
            "quantity": quantity,
            "entry_price": entry_price,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "tp1": tp1,
            "tp2": tp2,
            "break_even": break_even_price,
            "tp1_close_percent": float(config.get("tp1_close_percent", 50.0)),
            "tp2_close_percent": float(config.get("tp2_close_percent", 50.0)),
        }
