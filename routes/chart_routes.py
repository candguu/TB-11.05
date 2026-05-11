"""
TB Trading Bot — Chart & OTT Indicator Routes
Binance Futures public API'den OHLCV çeker, OTT hesaplar, JSON döner.
"""
import time
import math
import threading
import requests
from bisect import bisect_right
from flask import Blueprint, jsonify, request
from core.database import get_db
from core.tb_symbols import DEFAULT_TB_SYMBOL, require_tb_symbol

chart_bp = Blueprint("chart", __name__)
tb_bot_chart_bp = Blueprint("tb_bot_chart", __name__)

BINANCE_BASE = "https://fapi.binance.com"  # Futures (public, auth gerekmez)
BINANCE_SPOT = "https://api.binance.com"

_cache: dict = {}
_cache_lock = threading.Lock()
CACHE_TTL = 30  # saniye

INTERVAL_MAP = {
    "1m": 100, "3m": 100, "5m": 100, "15m": 100,
    "30m": 100, "1h": 100, "4h": 100, "1d": 100,
}

BINANCE_MAX_PER_REQ = 1000   # Binance API per-request hard limit
CACHE_TTL = 60               # büyük veri seti için 60s cache

# ── Binance OHLCV (paginated, max 10 000 mum) ─────────────────────────────────
def fetch_klines(symbol: str, interval: str, limit: int = 500) -> list | None:
    limit = min(limit, 10_000)
    cache_key = f"{symbol}_{interval}_{limit}"
    now = time.time()
    with _cache_lock:
        if cache_key in _cache:
            data, ts = _cache[cache_key]
            if now - ts < CACHE_TTL:
                return data

    all_candles: list = []
    end_time: int | None = None          # ms timestamp, geriye doğru gidiyoruz

    # Futures URL yok, Spot'a doğrudan başla; ama önce Futures dene
    for base in [BINANCE_BASE, BINANCE_SPOT]:
        all_candles = []
        end_time    = None
        success     = True

        remaining = limit
        while remaining > 0:
            batch = min(remaining, BINANCE_MAX_PER_REQ)
            url   = (f"{base}/fapi/v1/klines" if "fapi" in base
                     else f"{base}/api/v3/klines")
            params: dict = {"symbol": symbol, "interval": interval, "limit": batch}
            if end_time:
                params["endTime"] = end_time - 1   # bir önceki mumdan öncesi

            try:
                r = requests.get(url, params=params, timeout=8)
                if r.status_code != 200:
                    success = False
                    break
                raw = r.json()
                if not raw:
                    break   # daha fazla veri yok
                chunk = [
                    {"t": int(c[0]), "T": int(c[6]), "o": float(c[1]), "h": float(c[2]),
                     "l": float(c[3]), "c": float(c[4]), "v": float(c[5])}
                    for c in raw
                ]
                all_candles = chunk + all_candles   # başa ekle (kronolojik sıra)
                end_time    = int(raw[0][0])        # en eski mumun açılış zamanı
                remaining  -= len(chunk)
                if len(chunk) < batch:
                    break   # Binance'de daha fazla veri yok
            except Exception as e:
                print(f"[CHART] Kline fetch hata ({base}): {e}")
                success = False
                break

        if success and all_candles:
            with _cache_lock:
                _cache[cache_key] = (all_candles, now)
            return all_candles

    return None if not all_candles else all_candles

def only_closed_candles(candles: list) -> list:
    now_ms = int(time.time() * 1000)
    return [c for c in candles if int(c.get("T", c["t"])) <= now_ms]

def calc_ema(values: list[float], length: int = 200) -> list[float | None]:
    if not values:
        return []
    alpha = 2 / (length + 1)
    ema: list[float | None] = [None] * len(values)
    seed: float | None = None
    for i, value in enumerate(values):
        if i == length - 1:
            seed = sum(values[:length]) / length
            ema[i] = seed
        elif i >= length and seed is not None:
            seed = value * alpha + seed * (1 - alpha)
            ema[i] = seed
    return ema

def map_hourly_ema_to_candles(candles_15m: list, candles_1h: list, ema_1h: list) -> tuple[list, list]:
    hourly_times = [c["t"] for c in candles_1h]
    mapped_ema = []
    mapped_trends = []

    for candle in candles_15m:
        hour_index = bisect_right(hourly_times, candle["t"]) - 1
        if hour_index < 0 or hour_index >= len(ema_1h) or ema_1h[hour_index] is None:
            mapped_ema.append(None)
            mapped_trends.append(None)
            continue

        ema_value = float(ema_1h[hour_index])
        mapped_ema.append(ema_value)
        mapped_trends.append("BULLISH" if candles_1h[hour_index]["c"] > ema_value else "BEARISH")

    return mapped_ema, mapped_trends

@tb_bot_chart_bp.route("/chart", methods=["GET"])
def tb_bot_chart():
    try:
        symbol = require_tb_symbol(request.args.get("symbol") or DEFAULT_TB_SYMBOL)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    interval = request.args.get("interval", "15m")
    if interval not in ("5m", "15m", "1h"):
        interval = "15m"
    requested_days = request.args.get("days", "30")
    try:
        days = int(requested_days)
    except (TypeError, ValueError):
        days = 30
    days = max(7, min(days, 90))
    candles_per_hour = 12 if interval == "5m" else 4 if interval == "15m" else 1
    display_limit = days * 24 * candles_per_hour
    candles_15m_limit = min(10_000, display_limit + 360)
    candles_1h_limit = min(10_000, (days * 24) + 260)

    candles_15m = only_closed_candles(fetch_klines(symbol, interval, limit=candles_15m_limit) or [])
    candles_1h = only_closed_candles(fetch_klines(symbol, "1h", limit=candles_1h_limit) or [])
    if len(candles_15m) < 80 or len(candles_1h) < 220:
        return jsonify({"error": f"{symbol} market data alınamadı."}), 503

    closes_15m = [c["c"] for c in candles_15m]
    ott_data = calc_ott(closes_15m, length=2, percent=1.4)

    closes_1h = [c["c"] for c in candles_1h]
    ema_1h = calc_ema(closes_1h, length=200)
    mapped_ema, mapped_trends = map_hourly_ema_to_candles(candles_15m, candles_1h, ema_1h)

    raw_candidates = (
        [{"i": i, "type": "BUY"} for i in ott_data["k_buys"]] +
        [{"i": i, "type": "SELL"} for i in ott_data["k_sells"]]
    )
    raw_signals = []
    last_raw_side = None
    for sig in sorted(raw_candidates, key=lambda x: x["i"]):
        idx = sig["i"]
        if idx <= 0 or idx >= len(candles_15m):
            continue
        if sig["type"] == last_raw_side:
            continue
        last_raw_side = sig["type"]
        raw_signals.append(sig)

    confirmed_signals = []
    seen = set()
    last_confirmed_side = None
    for sig in sorted(raw_signals, key=lambda x: x["i"]):
        idx = sig["i"]
        if idx <= 0 or idx >= len(candles_15m) or idx in seen:
            continue
        if sig["type"] == last_confirmed_side:
            continue
        trend = mapped_trends[idx]
        if sig["type"] == "BUY" and trend != "BULLISH":
            continue
        if sig["type"] == "SELL" and trend != "BEARISH":
            continue
        seen.add(idx)
        last_confirmed_side = sig["type"]
        confirmed_signals.append(sig)

    start = max(0, len(candles_15m) - display_limit)
    if confirmed_signals and confirmed_signals[-1]["i"] < start:
        start = max(0, confirmed_signals[-1]["i"] - 80)
    visible_candles = candles_15m[start:]

    visible_confirmed = [sig for sig in confirmed_signals if sig["i"] >= start]
    confirmed_times = {int(candles_15m[sig["i"]]["t"] / 1000) for sig in visible_confirmed}

    bot_markers = []
    for sig in visible_confirmed:
        idx = sig["i"]
        side = sig["type"]
        bot_markers.append({
            "time": int(candles_15m[idx]["t"] / 1000),
            "position": "belowBar" if side == "BUY" else "aboveBar",
            "color": "#00e676" if side == "BUY" else "#ff1744",
            "shape": "arrowUp" if side == "BUY" else "arrowDown",
            "text": side,
            "size": 2,
            "type": side,
            "layer": "bot",
            "price": candles_15m[idx]["c"],
            "trend": mapped_trends[idx],
        })

    raw_markers = []
    for sig in sorted(raw_signals, key=lambda x: x["i"]):
        idx = sig["i"]
        if idx < start or idx >= len(candles_15m):
            continue
        side = sig["type"]
        marker_time = int(candles_15m[idx]["t"] / 1000)
        has_confirmed_marker = marker_time in confirmed_times
        raw_markers.append({
            "time": marker_time,
            "position": "inBar" if has_confirmed_marker else ("belowBar" if side == "BUY" else "aboveBar"),
            "color": "rgba(110, 231, 183, 0.58)" if side == "BUY" else "rgba(252, 165, 165, 0.58)",
            "shape": "circle",
            "text": "",
            "size": 1,
            "type": side,
            "layer": "ott_raw",
            "price": candles_15m[idx]["c"],
        })

    annotations_by_time = {}
    for sig in raw_markers:
        annotations_by_time.setdefault(str(sig["time"]), {})["raw_signal"] = sig["type"]
    for sig in bot_markers:
        annotations_by_time.setdefault(str(sig["time"]), {})["bot_signal"] = sig["type"]
        annotations_by_time[str(sig["time"])]["bot_trend"] = sig["trend"]

    tooltip_points = []
    for i in range(start, len(candles_15m)):
        t = int(candles_15m[i]["t"] / 1000)
        notes = annotations_by_time.get(str(t), {})
        tooltip_points.append({
            "time": t,
            "ott": ott_data["ott"][i],
            "mavg": ott_data["mavg"][i],
            "ema200": mapped_ema[i],
            "raw_signal": notes.get("raw_signal"),
            "bot_signal": notes.get("bot_signal"),
            "trend": mapped_trends[i],
        })

    current_trend = mapped_trends[-1] or "WAITING"
    current_trend_text = (
        "1H Close > EMA200" if current_trend == "BULLISH"
        else "1H Close < EMA200" if current_trend == "BEARISH"
        else "EMA200 bekleniyor"
    )
    visible_raw = [sig for sig in sorted(raw_signals, key=lambda x: x["i"]) if sig["i"] >= start]
    last_visible_signal = visible_confirmed[-1] if visible_confirmed else None
    last_raw_signal = visible_raw[-1] if visible_raw else None
    latest_raw_signal = raw_signals[-1] if raw_signals else None
    latest_raw_is_current = latest_raw_signal and latest_raw_signal["i"] == len(candles_15m) - 1
    current_decision = "Sinyal Yok"
    if latest_raw_is_current:
        latest_type = latest_raw_signal["type"]
        if (latest_type == "BUY" and current_trend == "BULLISH") or (latest_type == "SELL" and current_trend == "BEARISH"):
            current_decision = "Islem Acilabilir"
        else:
            current_decision = "Bekle"

    trade_levels = {"entry": None, "stop_loss": None, "tp1": None, "tp2": None, "break_even": None}
    try:
        db = get_db()
        trade = db.execute(
            """
            SELECT entry_price, stop_loss, take_profit, tp1_price, tp2_price, break_even_price
            FROM tb_trades
            WHERE symbol=? AND status IN ('OPEN', 'PARTIAL_TP1')
            ORDER BY id DESC
            LIMIT 1
            """
            ,
            (symbol,),
        ).fetchone()
        if trade:
            trade_levels = {
                "entry": trade["entry_price"],
                "stop_loss": trade["stop_loss"],
                "tp1": trade["tp1_price"],
                "tp2": trade["tp2_price"] or trade["take_profit"],
                "break_even": trade["break_even_price"],
            }
    except Exception:
        pass

    no_trade_zone_status = {"enabled": True, "blocked": False}

    return jsonify({
        "symbol": symbol,
        "interval": interval,
        "days": days,
        "trend_interval": "1h",
        "last_signal": None if not last_visible_signal else {
            "type": last_visible_signal["type"],
            "time": int(candles_15m[last_visible_signal["i"]]["t"] / 1000),
            "price": candles_15m[last_visible_signal["i"]]["c"],
            "trend": mapped_trends[last_visible_signal["i"]],
        },
        "last_raw_signal": None if not last_raw_signal else {
            "type": last_raw_signal["type"],
            "time": int(candles_15m[last_raw_signal["i"]]["t"] / 1000),
            "price": candles_15m[last_raw_signal["i"]]["c"],
        },
        "current": {
            "price": closes_15m[-1],
            "trend": current_trend,
            "trend_text": current_trend_text,
            "ott": ott_data["ott"][-1],
            "mavg": ott_data["mavg"][-1],
            "ema200": mapped_ema[-1],
            "decision": current_decision,
        },
        "candles": [
            {
                "time": int(c["t"] / 1000),
                "open": c["o"],
                "high": c["h"],
                "low": c["l"],
                "close": c["c"],
            }
            for c in visible_candles
        ],
        "ott": [
            {"time": int(candles_15m[i]["t"] / 1000), "value": ott_data["ott"][i]}
            for i in range(start, len(candles_15m))
            if ott_data["ott"][i] is not None and not math.isnan(ott_data["ott"][i])
        ],
        "mavg": [
            {"time": int(candles_15m[i]["t"] / 1000), "value": ott_data["mavg"][i]}
            for i in range(start, len(candles_15m))
            if ott_data["mavg"][i] is not None and not math.isnan(ott_data["mavg"][i])
        ],
        "ema200": [
            {"time": int(candles_15m[i]["t"] / 1000), "value": mapped_ema[i]}
            for i in range(start, len(candles_15m))
            if mapped_ema[i] is not None
        ],
        "signals": bot_markers,
        "bot_signals": bot_markers,
        "raw_signals": raw_markers,
        "tooltip": tooltip_points,
        "trade_levels": trade_levels,
        "no_trade_zone_status": no_trade_zone_status,
        "trend_status": current_trend,
        "last_bot_signal": None if not last_visible_signal else last_visible_signal["type"],
        "current_decision": current_decision,
        "updated_at": int(time.time()),
    })

# ── OTT Hesaplama (Pine Script portuna birebir eşdeğer) ──────────────────────
def calc_var(closes: list, length: int) -> list:
    """Volatility Adjusted Ratio MA (VAR) — OTT'nin default MA'sı"""
    alpha = 2 / (length + 1)
    n = len(closes)
    var = [0.0] * n

    # 9 periyotluk UD/DD için yeterli geçmiş lazım
    for i in range(n):
        if i == 0:
            var[i] = closes[i]
            continue
        ud = max(closes[i] - closes[i-1], 0)
        dd = max(closes[i-1] - closes[i], 0)
        # sum over last 9
        start = max(0, i - 8)
        ud_sum = sum(max(closes[j] - closes[j-1], 0) for j in range(start+1, i+1))
        dd_sum = sum(max(closes[j-1] - closes[j], 0) for j in range(start+1, i+1))
        denom = ud_sum + dd_sum
        cmo = (ud_sum - dd_sum) / denom if denom != 0 else 0
        var[i] = alpha * abs(cmo) * closes[i] + (1 - alpha * abs(cmo)) * var[i-1]
    return var

def calc_ott(closes: list, length: int = 2, percent: float = 1.4) -> dict:
    """
    OTT (Optimized Trend Tracker) hesapla.
    Döner: {mavg, ott, dir, buy_signals, sell_signals}
    """
    n = len(closes)
    mavg = calc_var(closes, length)

    fark = [m * percent * 0.01 for m in mavg]

    long_stop  = [0.0] * n
    short_stop = [0.0] * n
    direction  = [1]   * n
    mt         = [0.0] * n
    ott        = [0.0] * n

    for i in range(n):
        ls = mavg[i] - fark[i]
        ss = mavg[i] + fark[i]

        if i == 0:
            long_stop[i]  = ls
            short_stop[i] = ss
        else:
            long_stop[i]  = max(ls, long_stop[i-1])  if mavg[i] > long_stop[i-1]  else ls
            short_stop[i] = min(ss, short_stop[i-1]) if mavg[i] < short_stop[i-1] else ss
            d_prev = direction[i-1]
            if d_prev == -1 and mavg[i] > short_stop[i-1]:
                direction[i] = 1
            elif d_prev == 1 and mavg[i] < long_stop[i-1]:
                direction[i] = -1
            else:
                direction[i] = d_prev

        mt[i]  = long_stop[i] if direction[i] == 1 else short_stop[i]
        ott[i] = mt[i] * (200 + percent) / 200 if mavg[i] > mt[i] else mt[i] * (200 - percent) / 200

    # Sinyaller: OTT[i-1] vs OTT[i-2] (Pine'daki OTT[2] OTT[3] gibi offset 2)
    buy_signals  = []
    sell_signals = []
    for i in range(3, n):
        prev_ott  = ott[i-1]
        prev_ott2 = ott[i-2]
        if prev_ott > prev_ott2 and ott[i-2] <= ott[i-3]:
            buy_signals.append(i)
        if prev_ott < prev_ott2 and ott[i-2] >= ott[i-3]:
            sell_signals.append(i)

    # MAVg crossover OTT sinyalleri (daha duyarlı)
    k_buys  = []
    k_sells = []
    for i in range(2, n):
        if mavg[i-1] > ott[i-1] and mavg[i-2] <= ott[i-2]:
            k_buys.append(i-1)
        if mavg[i-1] < ott[i-1] and mavg[i-2] >= ott[i-2]:
            k_sells.append(i-1)

    return {
        "mavg": mavg,
        "ott":  ott,
        "dir":  direction,
        "buy_signals":  buy_signals,
        "sell_signals": sell_signals,
        "k_buys":  k_buys,
        "k_sells": k_sells,
    }

# ── API Endpoint ─────────────────────────────────────────────────────────────
@chart_bp.route("/ohlcv", methods=["GET"])
def ohlcv():
    symbol   = request.args.get("symbol",   "BTCUSDT").upper()
    interval = request.args.get("interval", "1h")
    ott_len  = int(request.args.get("ott_length",  2))
    ott_pct  = float(request.args.get("ott_percent", 1.4))

    candles = fetch_klines(symbol, interval, limit=10_000)
    if not candles:
        return jsonify({"error": "Veri alınamadı"}), 503

    closes = [c["c"] for c in candles]
    ott_data = calc_ott(closes, length=ott_len, percent=ott_pct)

    # Son sinyal (en yakın)
    last_signal = None
    all_sigs = (
        [{"i": i, "type": "BUY",  "src": "ott"}  for i in ott_data["buy_signals"]] +
        [{"i": i, "type": "SELL", "src": "ott"}  for i in ott_data["sell_signals"]] +
        [{"i": i, "type": "BUY",  "src": "cross"} for i in ott_data["k_buys"]] +
        [{"i": i, "type": "SELL", "src": "cross"} for i in ott_data["k_sells"]]
    )
    if all_sigs:
        last = max(all_sigs, key=lambda x: x["i"])
        last_signal = {
            "type":  last["type"],
            "src":   last["src"],
            "price": candles[last["i"]]["c"],
            "time":  candles[last["i"]]["t"],
        }

    return jsonify({
        "symbol":   symbol,
        "interval": interval,
        "candles":  candles,
        "ott": {
            "mavg": ott_data["mavg"],
            "ott":  ott_data["ott"],
            "dir":  ott_data["dir"],
            "buy_signals":  ott_data["buy_signals"],
            "sell_signals": ott_data["sell_signals"],
            "k_buys":  ott_data["k_buys"],
            "k_sells": ott_data["k_sells"],
        },
        "last_signal": last_signal,
        "current_price": closes[-1],
        "current_dir": ott_data["dir"][-1],
    })
