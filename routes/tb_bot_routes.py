from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone
from core.database import get_db
from core.security import require_auth
from core.logger import logger
from core.tb_symbols import ALLOWED_TB_SYMBOLS, DEFAULT_TB_SYMBOL, require_tb_symbol

tb_bot_api_bp = Blueprint("tb_bot_api", __name__)

def get_default_config(user_id):
    return {
        "user_id": user_id,
        "symbol": DEFAULT_TB_SYMBOL,
        "trading_mode": "demo",
        "bot_enabled": 0,
        "timeframe": "15m",
        "direction_mode": "long_short",
        "leverage": 3,
        "margin_type": "ISOLATED",
        "wait_candle_close": 1,
        "prevent_same_signal_reentry": 1,
        "opposite_signal_behavior": "close_position",
        "order_type": "MARKET",
        "control_interval_seconds": 10,
        "trend_filter_enabled": 1,
        "trend_filter_timeframe": "1h",
        "trend_filter_method": "EMA200",
        "volatility_filter_mode": "normal",
        "max_slippage_percent": 0.2,
        "max_order_retries": 3,
        "retry_delay_seconds": 2,
        "cancel_if_price_moves": 1,
        "retry_same_candle": 0,
        "risk_per_trade_percent": 1.0,
        "max_daily_loss_percent": 3.0,
        "daily_profit_target_percent": 4.0,
        "max_open_positions": 1,
        "max_daily_trades": 5,
        "consecutive_loss_limit": 3,
        "cooldown_minutes": 15,
        "stop_loss_type": "ATR",
        "atr_multiplier": 1.5,
        "take_profit_type": "RISK_REWARD",
        "risk_reward_ratio": 2.0,
        "break_even_enabled": 0,
        "break_even_trigger_r": 0.8,
        "break_even_mode": "MOVE_SL_TO_ENTRY",
        "partial_tp_enabled": 0,
        "tp1_r": 1.0,
        "tp1_close_percent": 50.0,
        "tp2_r": 1.5,
        "tp2_close_percent": 50.0,
        "reduce_risk_after_losses_enabled": 0,
        "reduce_risk_after_losses_count": 2,
        "reduced_risk_percent": 0.25,
        "stop_after_losses_enabled": 0,
        "stop_after_losses_count": 3,
        "no_trade_zone_enabled": 0,
        "ema200_avoid_enabled": 0,
        "ema200_avoid_percent": 0.15,
        "atr_min_filter_enabled": 0,
        "atr_max_filter_enabled": 0,
        "wick_filter_enabled": 0,
        "spread_filter_enabled": 0,
        "trailing_stop_enabled": 0
    }

def get_active_demo_profile(user_id, bot_enabled=0):
    return {
        "user_id": user_id,
        "symbol": DEFAULT_TB_SYMBOL,
        "trading_mode": "demo",
        "bot_enabled": int(bot_enabled or 0),
        "timeframe": "15m",
        "direction_mode": "long_short",
        "leverage": 5,
        "margin_type": "ISOLATED",
        "wait_candle_close": 1,
        "prevent_same_signal_reentry": 1,
        "opposite_signal_behavior": "close_position",
        "order_type": "MARKET",
        "control_interval_seconds": 5,
        "trend_filter_enabled": 1,
        "trend_filter_timeframe": "1h",
        "trend_filter_method": "EMA200",
        "volatility_filter_mode": "normal",
        "max_slippage_percent": 0.2,
        "max_order_retries": 1,
        "retry_delay_seconds": 2,
        "cancel_if_price_moves": 1,
        "retry_same_candle": 0,
        "risk_per_trade_percent": 0.5,
        "max_daily_loss_percent": 2.0,
        "daily_profit_target_percent": 3.0,
        "max_open_positions": 1,
        "max_daily_trades": 6,
        "consecutive_loss_limit": 3,
        "cooldown_minutes": 5,
        "stop_loss_type": "ATR",
        "atr_multiplier": 1.2,
        "take_profit_type": "PARTIAL_TP",
        "risk_reward_ratio": 1.5,
        "break_even_enabled": 1,
        "break_even_trigger_r": 0.8,
        "break_even_mode": "MOVE_SL_TO_ENTRY",
        "partial_tp_enabled": 1,
        "tp1_r": 1.0,
        "tp1_close_percent": 50.0,
        "tp2_r": 1.5,
        "tp2_close_percent": 50.0,
        "reduce_risk_after_losses_enabled": 1,
        "reduce_risk_after_losses_count": 2,
        "reduced_risk_percent": 0.25,
        "stop_after_losses_enabled": 1,
        "stop_after_losses_count": 3,
        "no_trade_zone_enabled": 1,
        "ema200_avoid_enabled": 1,
        "ema200_avoid_percent": 0.15,
        "atr_min_filter_enabled": 1,
        "atr_max_filter_enabled": 1,
        "wick_filter_enabled": 1,
        "spread_filter_enabled": 1,
        "trailing_stop_enabled": 0,
    }

CONFIG_COLUMNS = [
    "user_id", "symbol", "trading_mode", "bot_enabled", "timeframe", "direction_mode", "leverage", "margin_type",
    "wait_candle_close", "prevent_same_signal_reentry", "opposite_signal_behavior", "order_type",
    "control_interval_seconds", "trend_filter_enabled", "trend_filter_timeframe", "trend_filter_method",
    "volatility_filter_mode", "max_slippage_percent", "max_order_retries", "retry_delay_seconds",
    "cancel_if_price_moves", "retry_same_candle", "risk_per_trade_percent", "max_daily_loss_percent",
    "daily_profit_target_percent", "max_open_positions", "max_daily_trades", "consecutive_loss_limit",
    "cooldown_minutes", "stop_loss_type", "atr_multiplier", "take_profit_type", "risk_reward_ratio",
    "break_even_enabled", "break_even_trigger_r", "break_even_mode", "partial_tp_enabled",
    "tp1_r", "tp1_close_percent", "tp2_r", "tp2_close_percent",
    "reduce_risk_after_losses_enabled", "reduce_risk_after_losses_count", "reduced_risk_percent",
    "stop_after_losses_enabled", "stop_after_losses_count", "no_trade_zone_enabled",
    "ema200_avoid_enabled", "ema200_avoid_percent", "atr_min_filter_enabled", "atr_max_filter_enabled",
    "wick_filter_enabled", "spread_filter_enabled",
    "trailing_stop_enabled", "created_at", "updated_at"
]

def insert_config(db, config):
    now = datetime.now(timezone.utc).isoformat()
    row = dict(config)
    row.setdefault("created_at", now)
    row.setdefault("updated_at", now)
    placeholders = ", ".join(["?"] * len(CONFIG_COLUMNS))
    db.execute(
        f"INSERT INTO tb_bot_config ({', '.join(CONFIG_COLUMNS)}) VALUES ({placeholders})",
        tuple(row.get(column) for column in CONFIG_COLUMNS)
    )

def update_config(db, user_id, config, preserve_bot_enabled=False):
    row = dict(config)
    row["updated_at"] = datetime.now(timezone.utc).isoformat()
    protected = {"id", "user_id", "created_at"}
    if preserve_bot_enabled:
        protected.add("bot_enabled")
    columns = [column for column in CONFIG_COLUMNS if column not in protected]
    set_sql = ", ".join(f"{column}=?" for column in columns)
    db.execute(
        f"UPDATE tb_bot_config SET {set_sql} WHERE user_id=?",
        tuple(row.get(column) for column in columns) + (user_id,)
    )

def ensure_config(db, user_id, bot_enabled=None):
    row = db.execute("SELECT * FROM tb_bot_config WHERE user_id=?", (user_id,)).fetchone()
    if row:
        config = dict(row)
        if config.get("symbol") not in ALLOWED_TB_SYMBOLS:
            config["symbol"] = DEFAULT_TB_SYMBOL
            db.execute(
                "UPDATE tb_bot_config SET symbol=?, trading_mode='demo', updated_at=? WHERE user_id=?",
                (DEFAULT_TB_SYMBOL, datetime.now(timezone.utc).isoformat(), user_id),
            )
            db.commit()
        return config
    config = get_default_config(user_id)
    if bot_enabled is not None:
        config["bot_enabled"] = int(bot_enabled)
    insert_config(db, config)
    db.commit()
    return config

def ensure_state(db, user_id, symbol=DEFAULT_TB_SYMBOL):
    symbol = require_tb_symbol(symbol)
    row = db.execute("SELECT * FROM tb_bot_state WHERE user_id=? AND symbol=?", (user_id, symbol)).fetchone()
    if row:
        return dict(row)
    now = datetime.now(timezone.utc).isoformat()
    existing = db.execute("SELECT id FROM tb_bot_state WHERE user_id=?", (user_id,)).fetchone()
    if existing:
        db.execute(
            """
            UPDATE tb_bot_state
            SET symbol=?, last_signal=NULL, last_signal_time=NULL, last_candle_time=NULL,
                current_decision=NULL, cooldown_until=NULL, updated_at=?
            WHERE id=?
            """,
            (symbol, now, existing["id"]),
        )
    else:
        db.execute("INSERT INTO tb_bot_state (user_id, symbol, updated_at) VALUES (?, ?, ?)", (user_id, symbol, now))
    db.commit()
    return {"user_id": user_id, "symbol": symbol, "updated_at": now}

def has_active_api_key(db, user_id):
    row = db.execute(
        "SELECT id FROM user_api_keys WHERE user_id=? AND is_active=1 AND is_valid=1 LIMIT 1",
        (user_id,)
    ).fetchone()
    if row:
        return True
    legacy = db.execute(
        "SELECT api_key, api_secret FROM bot_configs WHERE user_id=?",
        (user_id,)
    ).fetchone()
    return bool(legacy and legacy["api_key"] and legacy["api_secret"])

def _choice(value, field, allowed):
    if value not in allowed:
        raise ValueError(f"{field} için izin verilen değerler: {', '.join(map(str, allowed))}")
    return value

def _bool_int(value, field):
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, int) and value in (0, 1):
        return value
    if isinstance(value, str) and value.strip() in ("0", "1"):
        return int(value.strip())
    raise ValueError(f"{field} sadece 0 veya 1 olabilir.")

def _int_range(value, field, min_value, max_value):
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} tam sayı olmalıdır.")
    if number < min_value or number > max_value:
        raise ValueError(f"{field} {min_value}-{max_value} aralığında olmalıdır.")
    return number

def _float_range(value, field, min_value, max_value):
    if isinstance(value, str):
        value = value.replace("%", "").replace(",", ".").strip()
        if ":" in value:
            value = value.split(":")[-1]
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} sayı olmalıdır.")
    if number < min_value or number > max_value:
        raise ValueError(f"{field} {min_value}-{max_value} aralığında olmalıdır.")
    return round(number, 4)

def _norm_token(value):
    return str(value or "").strip().lower()

def _norm_trading_mode(value):
    token = _norm_token(value)
    if token in ("binance_demo", "demo", "demo_trading"):
        return "demo"
    return token

def _norm_direction_mode(value):
    token = _norm_token(value)
    if token in ("long_short", "long+short", "long + short", "both"):
        return "long_short"
    if token in ("long_only", "sadece long"):
        return "long_only"
    if token in ("short_only", "sadece short"):
        return "short_only"
    return token

def _norm_opposite_behavior(value):
    token = _norm_token(value)
    if token in ("close_position", "close position", "pozisyonu kapat"):
        return "close_position"
    if token in ("reverse_trade", "reverse trade", "ters işleme geç", "ters isleme gec"):
        return "reverse_trade"
    return token

def _norm_volatility(value):
    token = _norm_token(value)
    if token in ("normal",):
        return "normal"
    if token in ("strict", "katı", "kati"):
        return "strict"
    if token in ("off", "kapalı", "kapali"):
        return "off"
    return token

def _norm_take_profit_type(value):
    token = _norm_token(value)
    if token in ("risk_reward", "risk/reward", "rr"):
        return "RISK_REWARD"
    if token in ("partial_tp", "partial take profit", "parcali take profit", "parçalı take profit"):
        return "PARTIAL_TP"
    return str(value or "").strip().upper()

def _norm_break_even_mode(value):
    token = _norm_token(value)
    if token in ("move_sl_to_entry", "entry", "stopu entryye cek", "stop'u entry'ye çek"):
        return "MOVE_SL_TO_ENTRY"
    return str(value or "").strip().upper()

def validate_config_payload(data, user_id):
    defaults = get_default_config(user_id)
    clean = dict(defaults)

    clean["symbol"] = _choice(str(data.get("symbol", defaults["symbol"])).upper(), "Sembol", list(ALLOWED_TB_SYMBOLS))
    clean["trading_mode"] = _choice(_norm_trading_mode(data.get("trading_mode", defaults["trading_mode"])), "Çalışma modu", ["demo"])
    clean["bot_enabled"] = _bool_int(data.get("bot_enabled", defaults["bot_enabled"]), "Bot durumu")
    clean["timeframe"] = _choice(data.get("timeframe", defaults["timeframe"]), "Timeframe", ["5m", "15m", "1h"])
    clean["direction_mode"] = _choice(_norm_direction_mode(data.get("direction_mode", defaults["direction_mode"])), "Yön", ["long_short", "long_only", "short_only"])
    clean["leverage"] = _int_range(data.get("leverage", defaults["leverage"]), "Kaldıraç", 1, 100)
    clean["margin_type"] = _choice(str(data.get("margin_type", defaults["margin_type"])).upper(), "Margin tipi", ["ISOLATED"])

    clean["wait_candle_close"] = _bool_int(data.get("wait_candle_close", defaults["wait_candle_close"]), "Mum kapanışı bekle")
    clean["prevent_same_signal_reentry"] = _bool_int(data.get("prevent_same_signal_reentry", defaults["prevent_same_signal_reentry"]), "Aynı sinyalde tekrar")
    clean["opposite_signal_behavior"] = _choice(_norm_opposite_behavior(data.get("opposite_signal_behavior", defaults["opposite_signal_behavior"])), "Ters sinyal davranışı", ["close_position", "wait", "reverse_trade"])
    clean["order_type"] = _choice(str(data.get("order_type", defaults["order_type"])).upper(), "Emir tipi", ["MARKET", "LIMIT"])
    clean["control_interval_seconds"] = _choice(_int_range(data.get("control_interval_seconds", defaults["control_interval_seconds"]), "Kontrol aralığı", 5, 60), "Kontrol aralığı", [5, 10, 30, 60])
    clean["trend_filter_enabled"] = _bool_int(data.get("trend_filter_enabled", defaults["trend_filter_enabled"]), "Trend filtresi")
    clean["trend_filter_timeframe"] = _choice(data.get("trend_filter_timeframe", defaults["trend_filter_timeframe"]), "Trend timeframe", ["1h"])
    clean["trend_filter_method"] = _choice(data.get("trend_filter_method", defaults["trend_filter_method"]), "Trend metodu", ["EMA200"])
    clean["volatility_filter_mode"] = _choice(_norm_volatility(data.get("volatility_filter_mode", defaults["volatility_filter_mode"])), "Volatilite filtresi", ["off", "normal", "strict"])
    clean["max_slippage_percent"] = _choice(_float_range(data.get("max_slippage_percent", defaults["max_slippage_percent"]), "Maksimum slippage", 0.1, 0.5), "Maksimum slippage", [0.1, 0.2, 0.3, 0.5])

    clean["max_order_retries"] = _int_range(data.get("max_order_retries", defaults["max_order_retries"]), "Emir denemesi", 1, 10)
    clean["retry_delay_seconds"] = _int_range(data.get("retry_delay_seconds", defaults["retry_delay_seconds"]), "Deneme bekleme süresi", 1, 60)
    clean["cancel_if_price_moves"] = _bool_int(data.get("cancel_if_price_moves", defaults["cancel_if_price_moves"]), "Fiyat kaçarsa iptal")
    clean["retry_same_candle"] = _bool_int(data.get("retry_same_candle", defaults["retry_same_candle"]), "Aynı mumda tekrar deneme")

    clean["risk_per_trade_percent"] = _float_range(data.get("risk_per_trade_percent", defaults["risk_per_trade_percent"]), "İşlem başı risk", 0.1, 10)
    clean["max_daily_loss_percent"] = _float_range(data.get("max_daily_loss_percent", defaults["max_daily_loss_percent"]), "Maksimum günlük zarar", 1, 50)
    clean["daily_profit_target_percent"] = _float_range(data.get("daily_profit_target_percent", defaults["daily_profit_target_percent"]), "Günlük hedef kâr", 1, 100)
    clean["max_open_positions"] = _int_range(data.get("max_open_positions", defaults["max_open_positions"]), "Maksimum açık pozisyon", 1, 10)
    clean["max_daily_trades"] = _int_range(data.get("max_daily_trades", defaults["max_daily_trades"]), "Günlük maksimum işlem", 1, 100)
    clean["consecutive_loss_limit"] = _int_range(data.get("consecutive_loss_limit", defaults["consecutive_loss_limit"]), "Arka arkaya zarar", 1, 20)
    clean["cooldown_minutes"] = _int_range(data.get("cooldown_minutes", defaults["cooldown_minutes"]), "Cooldown süresi", 1, 1440)

    clean["stop_loss_type"] = _choice(data.get("stop_loss_type", defaults["stop_loss_type"]), "Stop-loss tipi", ["ATR"])
    clean["atr_multiplier"] = _float_range(data.get("atr_multiplier", defaults["atr_multiplier"]), "ATR çarpanı", 0.5, 5)
    clean["take_profit_type"] = _choice(_norm_take_profit_type(data.get("take_profit_type", defaults["take_profit_type"])), "Take-profit tipi", ["RISK_REWARD", "PARTIAL_TP"])
    clean["risk_reward_ratio"] = _float_range(data.get("risk_reward_ratio", defaults["risk_reward_ratio"]), "Risk/Reward oranı", 0.5, 10)
    clean["break_even_enabled"] = _bool_int(data.get("break_even_enabled", defaults["break_even_enabled"]), "Break-even stop")
    clean["break_even_trigger_r"] = _float_range(data.get("break_even_trigger_r", defaults["break_even_trigger_r"]), "Break-even trigger", 0.1, 10)
    clean["break_even_mode"] = _choice(_norm_break_even_mode(data.get("break_even_mode", defaults["break_even_mode"])), "Break-even davranisi", ["MOVE_SL_TO_ENTRY"])
    clean["partial_tp_enabled"] = _bool_int(data.get("partial_tp_enabled", defaults["partial_tp_enabled"]), "Parcali take-profit")
    clean["tp1_r"] = _float_range(data.get("tp1_r", defaults["tp1_r"]), "TP1 R seviyesi", 0.1, 10)
    clean["tp1_close_percent"] = _float_range(data.get("tp1_close_percent", defaults["tp1_close_percent"]), "TP1 kapanacak oran", 1, 100)
    clean["tp2_r"] = _float_range(data.get("tp2_r", defaults["tp2_r"]), "TP2 R seviyesi", 0.1, 20)
    clean["tp2_close_percent"] = _float_range(data.get("tp2_close_percent", defaults["tp2_close_percent"]), "TP2 kapanacak oran", 1, 100)
    clean["reduce_risk_after_losses_enabled"] = _bool_int(data.get("reduce_risk_after_losses_enabled", defaults["reduce_risk_after_losses_enabled"]), "Zarar sonrasi risk dusurme")
    clean["reduce_risk_after_losses_count"] = _int_range(data.get("reduce_risk_after_losses_count", defaults["reduce_risk_after_losses_count"]), "Risk dusurme zarar sayisi", 1, 20)
    clean["reduced_risk_percent"] = _float_range(data.get("reduced_risk_percent", defaults["reduced_risk_percent"]), "Dusurulmus risk", 0.05, 10)
    clean["stop_after_losses_enabled"] = _bool_int(data.get("stop_after_losses_enabled", defaults["stop_after_losses_enabled"]), "Zarar sonrasi bot durdurma")
    clean["stop_after_losses_count"] = _int_range(data.get("stop_after_losses_count", defaults["stop_after_losses_count"]), "Bot durdurma zarar sayisi", 1, 20)
    clean["no_trade_zone_enabled"] = _bool_int(data.get("no_trade_zone_enabled", defaults["no_trade_zone_enabled"]), "No-trade zone")
    clean["ema200_avoid_enabled"] = _bool_int(data.get("ema200_avoid_enabled", defaults["ema200_avoid_enabled"]), "EMA200 yakinlik filtresi")
    clean["ema200_avoid_percent"] = _float_range(data.get("ema200_avoid_percent", defaults["ema200_avoid_percent"]), "EMA200 yakinlik esigi", 0.01, 5)
    clean["atr_min_filter_enabled"] = _bool_int(data.get("atr_min_filter_enabled", defaults["atr_min_filter_enabled"]), "ATR minimum filtresi")
    clean["atr_max_filter_enabled"] = _bool_int(data.get("atr_max_filter_enabled", defaults["atr_max_filter_enabled"]), "ATR maksimum filtresi")
    clean["wick_filter_enabled"] = _bool_int(data.get("wick_filter_enabled", defaults["wick_filter_enabled"]), "Fitil filtresi")
    clean["spread_filter_enabled"] = _bool_int(data.get("spread_filter_enabled", defaults["spread_filter_enabled"]), "Spread/slippage filtresi")
    clean["trailing_stop_enabled"] = _bool_int(data.get("trailing_stop_enabled", defaults["trailing_stop_enabled"]), "Trailing stop")

    return clean

@tb_bot_api_bp.route("/config", methods=["GET"])
@require_auth
def get_config():
    db = get_db()
    c = db.execute("SELECT * FROM tb_bot_config WHERE user_id=?", (g.user_id,)).fetchone()
    if not c:
        return jsonify(get_default_config(g.user_id))
    return jsonify(dict(c))

@tb_bot_api_bp.route("/config", methods=["POST"])
@require_auth
def set_config():
    data = request.get_json() or {}
    try:
        data = validate_config_payload(data, g.user_id)
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400

    db = get_db()
    c = db.execute("SELECT id FROM tb_bot_config WHERE user_id=?", (g.user_id,)).fetchone()
    
    # Check max leverage logic
    if int(data.get("leverage", 3)) > 125:
        return jsonify({"error": "Maksimum kaldıraç 125x olabilir."}), 400
        
    now = datetime.now(timezone.utc).isoformat()
    
    data["updated_at"] = now
    if not c:
        data["created_at"] = now
        insert_config(db, data)
    else:
        update_config(db, g.user_id, data)
    ensure_state(db, g.user_id, data["symbol"])
    db.commit()
    saved = db.execute("SELECT * FROM tb_bot_config WHERE user_id=?", (g.user_id,)).fetchone()
    return jsonify({"success": True, "message": "Ayarlar kaydedildi", "config": dict(saved) if saved else data})

@tb_bot_api_bp.route("/apply-recommended", methods=["POST"])
@require_auth
def apply_recommended():
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    c = db.execute("SELECT id, bot_enabled FROM tb_bot_config WHERE user_id=?", (g.user_id,)).fetchone()
    def_cfg = get_active_demo_profile(g.user_id, c["bot_enabled"] if c else 0)
    def_cfg["updated_at"] = now

    if not c:
        def_cfg["created_at"] = now
        insert_config(db, def_cfg)
    else:
        update_config(db, g.user_id, def_cfg, preserve_bot_enabled=True)

    ensure_state(db, g.user_id, def_cfg["symbol"])
    db.execute(
        "INSERT INTO tb_bot_logs (user_id, symbol, category, message, status, created_at) VALUES (?, ?, 'SYSTEM', 'TB Aktif Demo Profil v2 ayarları uygulandı', 'INFO', ?)",
        (g.user_id, def_cfg["symbol"], now)
    )
    db.execute(
        "INSERT INTO tb_bot_logs (user_id, symbol, category, message, status, created_at) VALUES (?, ?, 'PROFILE', 'TB Aktif Demo Profil v2', 'INFO', ?)",
        (g.user_id, def_cfg["symbol"], now)
    )
    db.commit()
    saved = db.execute("SELECT * FROM tb_bot_config WHERE user_id=?", (g.user_id,)).fetchone()
    return jsonify({
        "success": True,
        "profile": "TB Aktif Demo Profil v2",
        "profile_name": "TB Aktif Demo Profil v2",
        "symbol": def_cfg["symbol"],
        "message": f"{def_cfg['symbol']} için önerilen ayarlar uygulandı.",
        "config": dict(saved) if saved else def_cfg
    })
@tb_bot_api_bp.route("/status", methods=["GET"])
@require_auth
def get_status():
    db = get_db()
    config = ensure_config(db, g.user_id)
    try:
        symbol = require_tb_symbol(request.args.get("symbol") or config.get("symbol"))
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    if symbol != config.get("symbol"):
        config["symbol"] = symbol
    state_row = ensure_state(db, g.user_id, symbol)
    c = db.execute("SELECT bot_enabled FROM tb_bot_config WHERE user_id=?", (g.user_id,)).fetchone()
    state = db.execute("SELECT * FROM tb_bot_state WHERE user_id=? AND symbol=?", (g.user_id, symbol)).fetchone()
    stats = db.execute("""
        SELECT
            COUNT(*) AS total_trades,
            COALESCE(SUM(CASE WHEN status IN ('OPEN', 'PARTIAL_TP1') THEN 1 ELSE 0 END), 0) AS open_positions,
            COALESCE(SUM(CASE WHEN realized_pnl IS NOT NULL THEN realized_pnl ELSE 0 END), 0) AS realized_pnl,
            COALESCE(SUM(CASE WHEN date(closed_at)=date('now') AND realized_pnl IS NOT NULL THEN realized_pnl ELSE 0 END), 0) AS daily_pnl
        FROM tb_trades
        WHERE user_id=? AND symbol=?
    """, (g.user_id, symbol)).fetchone()

    return jsonify({
        "bot_enabled": c["bot_enabled"] if c else 0,
        "api_ready": has_active_api_key(db, g.user_id),
        "config": config,
        "state": dict(state) if state else state_row,
        "stats": dict(stats) if stats else {"total_trades": 0, "open_positions": 0, "realized_pnl": 0, "daily_pnl": 0}
    })

@tb_bot_api_bp.route("/start", methods=["POST"])
@require_auth
def start_bot():
    db = get_db()
    config = ensure_config(db, g.user_id, bot_enabled=0)
    symbol = require_tb_symbol(config.get("symbol"))
    ensure_state(db, g.user_id, symbol)
    if not has_active_api_key(db, g.user_id):
        return jsonify({"success": False, "error": "Botu başlatmak için önce aktif ve geçerli Binance Demo API anahtarı ekleyin."}), 400
    db.execute("UPDATE tb_bot_config SET bot_enabled=1, updated_at=? WHERE user_id=?", (datetime.now(timezone.utc).isoformat(), g.user_id))
    db.execute("UPDATE tb_bot_state SET emergency_stopped=0 WHERE user_id=?", (g.user_id,))
    db.execute(
        "INSERT INTO tb_bot_logs (user_id, symbol, category, message, status, created_at) VALUES (?, ?, 'SYSTEM', 'Bot başlatıldı.', 'INFO', ?)",
        (g.user_id, symbol, datetime.now(timezone.utc).isoformat())
    )
    db.commit()
    return jsonify({"success": True, "message": "Bot başlatıldı."})

@tb_bot_api_bp.route("/stop", methods=["POST"])
@require_auth
def stop_bot():
    db = get_db()
    config = ensure_config(db, g.user_id, bot_enabled=0)
    symbol = require_tb_symbol(config.get("symbol"))
    ensure_state(db, g.user_id, symbol)
    db.execute("UPDATE tb_bot_config SET bot_enabled=0, updated_at=? WHERE user_id=?", (datetime.now(timezone.utc).isoformat(), g.user_id))
    db.execute(
        "INSERT INTO tb_bot_logs (user_id, symbol, category, message, status, created_at) VALUES (?, ?, 'SYSTEM', 'Bot durduruldu.', 'INFO', ?)",
        (g.user_id, symbol, datetime.now(timezone.utc).isoformat())
    )
    db.commit()
    return jsonify({"success": True, "message": "Bot durduruldu."})

@tb_bot_api_bp.route("/emergency-stop", methods=["POST"])
@require_auth
def emergency_stop():
    db = get_db()
    config = ensure_config(db, g.user_id, bot_enabled=0)
    symbol = require_tb_symbol(config.get("symbol"))
    ensure_state(db, g.user_id, symbol)
    now = datetime.now(timezone.utc).isoformat()
    db.execute("UPDATE tb_bot_config SET bot_enabled=0, updated_at=? WHERE user_id=?", (now, g.user_id))
    
    state = db.execute("SELECT id FROM tb_bot_state WHERE user_id=? AND symbol=?", (g.user_id, symbol)).fetchone()
    if state:
        db.execute("UPDATE tb_bot_state SET emergency_stopped=1, updated_at=? WHERE id=?", (now, state["id"]))
    else:
        db.execute("INSERT INTO tb_bot_state (user_id, symbol, emergency_stopped, updated_at) VALUES (?, ?, 1, ?)", (g.user_id, symbol, now))
        
    db.execute("INSERT INTO tb_bot_logs (user_id, symbol, category, message, status, created_at) VALUES (?, ?, 'SYSTEM', 'ACİL DURDURMA TETİKLENDİ!', 'ERROR', ?)", (g.user_id, symbol, now))
    db.commit()
    return jsonify({"success": True, "message": "Acil durdurma aktifleştirildi."})

@tb_bot_api_bp.route("/logs", methods=["GET"])
@require_auth
def get_logs():
    db = get_db()
    config = ensure_config(db, g.user_id)
    try:
        symbol = require_tb_symbol(request.args.get("symbol") or config.get("symbol"))
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    rows = db.execute(
        "SELECT * FROM tb_bot_logs WHERE user_id=? AND symbol=? ORDER BY id DESC LIMIT 100",
        (g.user_id, symbol),
    ).fetchall()
    return jsonify({"logs": [dict(r) for r in rows]})

@tb_bot_api_bp.route("/position", methods=["GET"])
@require_auth
def get_position():
    db = get_db()
    config = ensure_config(db, g.user_id)
    try:
        symbol = require_tb_symbol(request.args.get("symbol") or config.get("symbol"))
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    row = db.execute(
        "SELECT * FROM tb_trades WHERE user_id=? AND status IN ('OPEN', 'PARTIAL_TP1') AND symbol=? ORDER BY id DESC LIMIT 1",
        (g.user_id, symbol),
    ).fetchone()
    other = db.execute(
        """
        SELECT symbol FROM tb_trades
        WHERE user_id=? AND status IN ('OPEN', 'PARTIAL_TP1') AND symbol<>?
        ORDER BY id DESC LIMIT 1
        """,
        (g.user_id, symbol),
    ).fetchone()
    if row:
        return jsonify({"position": dict(row), "symbol": symbol, "other_open_symbol": other["symbol"] if other else None})
    return jsonify({"position": None, "symbol": symbol, "other_open_symbol": other["symbol"] if other else None})

