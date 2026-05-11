from typing import Any, Dict, List

from core.ott_indicator import calc_ema, calc_ott


class TBSignalEngine:
    """Produces OTT signals and applies trend/no-trade-zone filters."""

    def evaluate_signal(
        self,
        candles_15m: List[Dict[str, Any]],
        candles_1h: List[Dict[str, Any]],
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        if len(candles_15m) < 100 or len(candles_1h) < 220:
            return {"decision": "WAIT", "reason": "Yetersiz mum verisi", "raw_signal": None}

        closes_tf = [c["c"] for c in candles_15m]
        ott_data = calc_ott(
            closes_tf,
            length=config.get("ott_period", 2),
            percent=config.get("ott_percent", 1.4),
        )
        dirs = ott_data["dir"]
        if len(dirs) < 2:
            return {"decision": "WAIT", "reason": "OTT hesaplanamadi", "raw_signal": None}

        raw_signal = None
        if dirs[-1] == 1 and dirs[-2] == -1:
            raw_signal = "BUY"
        elif dirs[-1] == -1 and dirs[-2] == 1:
            raw_signal = "SELL"

        trend_status = "NEUTRAL"
        last_ema = None
        if config.get("trend_filter_enabled", 1):
            closes_1h = [c["c"] for c in candles_1h]
            ema_1h = calc_ema(closes_1h, length=200)
            last_ema = ema_1h[-1] if ema_1h else None
            last_1h_close = closes_1h[-1] if closes_1h else None
            if last_ema and last_1h_close:
                trend_status = "BULLISH" if last_1h_close > last_ema else "BEARISH" if last_1h_close < last_ema else "NEUTRAL"
        else:
            trend_status = "DISABLED"

        ntz = self._no_trade_zone(candles_15m, last_ema, config)
        if ntz["blocked"]:
            return {
                "decision": "WAIT",
                "reason": ntz["reason"],
                "raw_signal": raw_signal,
                "trend": trend_status,
                "category": "NO_TRADE_ZONE",
                "no_trade_zone_status": ntz,
            }

        if not raw_signal:
            return {
                "decision": "WAIT",
                "reason": "Sinyal yok",
                "raw_signal": None,
                "trend": trend_status,
                "no_trade_zone_status": ntz,
            }

        if int(config.get("volume_filter_enabled", 1)) and self._volume_too_weak(candles_15m):
            return {
                "decision": "WAIT",
                "reason": "Hacim zayıf, sinyal bekletiliyor.",
                "raw_signal": raw_signal,
                "trend": trend_status,
                "no_trade_zone_status": ntz,
            }

        if int(config.get("adx_filter_enabled", 1)):
            adx = self._calculate_adx(candles_15m)
            if adx is not None and adx < float(config.get("adx_min", 15)):
                return {
                    "decision": "WAIT",
                    "reason": "ADX zayıf, trend gücü yetersiz.",
                    "raw_signal": raw_signal,
                    "trend": trend_status,
                    "no_trade_zone_status": ntz,
                }

        if config.get("trend_filter_enabled", 1):
            if raw_signal == "BUY" and trend_status != "BULLISH":
                return {
                    "decision": "WAIT",
                    "reason": "OTT BUY verdi ancak 1H trend filtresi onaylamadi.",
                    "raw_signal": raw_signal,
                    "trend": trend_status,
                    "no_trade_zone_status": ntz,
                }
            if raw_signal == "SELL" and trend_status != "BEARISH":
                return {
                    "decision": "WAIT",
                    "reason": "OTT SELL verdi ancak 1H trend filtresi onaylamadi.",
                    "raw_signal": raw_signal,
                    "trend": trend_status,
                    "no_trade_zone_status": ntz,
                }

        return {
            "decision": "CONFIRMED",
            "reason": f"OTT {raw_signal} ve Trend {trend_status} uygun.",
            "raw_signal": raw_signal,
            "trend": trend_status,
            "no_trade_zone_status": ntz,
            "signal_price": closes_tf[-1],
        }

    def _no_trade_zone(self, candles: List[Dict[str, Any]], ema200_1h, config: Dict[str, Any]) -> Dict[str, Any]:
        status = {"enabled": bool(int(config.get("no_trade_zone_enabled", 0))), "blocked": False, "reason": None}
        if not status["enabled"] or not candles:
            return status

        price = float(candles[-1]["c"])
        if int(config.get("ema200_avoid_enabled", 0)) and ema200_1h:
            distance_percent = abs(price - float(ema200_1h)) / price * 100
            status["ema200_distance_percent"] = round(distance_percent, 4)
            if distance_percent < float(config.get("ema200_avoid_percent", 0.15)):
                status.update({"blocked": True, "reason": "Fiyat EMA200 cevresinde sikismis, no-trade zone aktif."})
                return status

        atr = self._calculate_atr(candles)
        atr_percent = (atr / price * 100) if price else 0
        status["atr_percent"] = round(atr_percent, 4)
        if int(config.get("atr_min_filter_enabled", 0)) and atr_percent < 0.05:
            status.update({"blocked": True, "reason": "ATR cok dusuk, piyasa yatay."})
            return status
        if int(config.get("atr_max_filter_enabled", 0)) and atr_percent > 3.0:
            status.update({"blocked": True, "reason": "ATR cok yuksek, piyasa asiri oynak."})
            return status

        if int(config.get("wick_filter_enabled", 0)) and self._has_excessive_wicks(candles[-3:]):
            status.update({"blocked": True, "reason": "Son mumlarda asiri fitil var."})
            return status

        return status

    def _calculate_atr(self, candles: List[Dict[str, Any]], period: int = 14) -> float:
        if len(candles) < period + 1:
            return 0.0
        ranges = []
        for i in range(1, len(candles)):
            high = candles[i]["h"]
            low = candles[i]["l"]
            prev_close = candles[i - 1]["c"]
            ranges.append(max(high - low, abs(high - prev_close), abs(low - prev_close)))
        return sum(ranges[-period:]) / period

    def _has_excessive_wicks(self, candles: List[Dict[str, Any]]) -> bool:
        wicky = 0
        for candle in candles:
            high = float(candle["h"])
            low = float(candle["l"])
            open_ = float(candle["o"])
            close = float(candle["c"])
            candle_range = max(high - low, 0)
            if candle_range <= 0:
                continue
            body_high = max(open_, close)
            body_low = min(open_, close)
            wick_ratio = ((high - body_high) + (body_low - low)) / candle_range
            if wick_ratio >= 0.65:
                wicky += 1
        return wicky >= 2

    def _volume_too_weak(self, candles: List[Dict[str, Any]]) -> bool:
        if len(candles) < 21:
            return False
        recent_avg = sum(float(c["v"]) for c in candles[-21:-1]) / 20
        return recent_avg > 0 and float(candles[-1]["v"]) < recent_avg * 0.4

    def _calculate_adx(self, candles: List[Dict[str, Any]], period: int = 14) -> float | None:
        if len(candles) < period + 2:
            return None
        plus_dm = []
        minus_dm = []
        tr_list = []
        for i in range(1, len(candles)):
            high = float(candles[i]["h"])
            low = float(candles[i]["l"])
            prev_high = float(candles[i - 1]["h"])
            prev_low = float(candles[i - 1]["l"])
            prev_close = float(candles[i - 1]["c"])
            up_move = high - prev_high
            down_move = prev_low - low
            plus_dm.append(up_move if up_move > down_move and up_move > 0 else 0)
            minus_dm.append(down_move if down_move > up_move and down_move > 0 else 0)
            tr_list.append(max(high - low, abs(high - prev_close), abs(low - prev_close)))
        tr = sum(tr_list[-period:])
        if tr <= 0:
            return None
        plus_di = 100 * (sum(plus_dm[-period:]) / tr)
        minus_di = 100 * (sum(minus_dm[-period:]) / tr)
        denom = plus_di + minus_di
        return None if denom <= 0 else 100 * abs(plus_di - minus_di) / denom
