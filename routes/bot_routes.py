from datetime import datetime
from flask import Blueprint, request, jsonify, g
from core.database import get_db
from core.security import require_auth

bot_bp = Blueprint("bot", __name__)

@bot_bp.route("/config", methods=["GET"])
@require_auth
def get_bot_config():
    db = get_db()
    c  = db.execute("SELECT * FROM bot_configs WHERE user_id=?", (g.user_id,)).fetchone()
    if not c:
        return jsonify({"exchange":"binance", "is_active":0, "strategy":"hybrid",
                        "leverage":3, "risk_per_trade":2.0})
    return jsonify({
        "exchange": c["exchange"], "api_key_hint": c["api_key_hint"],
        "strategy": c["strategy"], "leverage": c["leverage"],
        "risk_per_trade": c["risk_per_trade"], "max_positions": c["max_positions"],
        "stop_loss": c["stop_loss"], "take_profit": c["take_profit"],
        "timeframe": c["timeframe"], "is_active": c["is_active"]
    })

@bot_bp.route("/config", methods=["POST"])
@require_auth
def set_bot_config():
    d = request.get_json() or {}
    db = get_db()
    db.execute("""
        UPDATE bot_configs
        SET exchange=?, strategy=?, leverage=?, risk_per_trade=?,
            max_positions=?, stop_loss=?, take_profit=?, timeframe=?, updated_at=?
        WHERE user_id=?
    """, (
        d.get("exchange","binance"), d.get("strategy","hybrid"),
        int(d.get("leverage",3)), float(d.get("risk_per_trade",2.0)),
        int(d.get("max_positions",5)), float(d.get("stop_loss",3.0)),
        float(d.get("take_profit",6.0)), d.get("timeframe","5m"),
        datetime.now().isoformat(), g.user_id
    ))
    db.commit()
    return jsonify({"message": "Ayarlar kaydedildi"})

@bot_bp.route("/toggle", methods=["POST"])
@require_auth
def bot_toggle():
    d = request.get_json() or {}
    st = 1 if d.get("is_active") else 0
    db = get_db()
    db.execute("UPDATE bot_configs SET is_active=?, updated_at=? WHERE user_id=?",
               (st, datetime.now().isoformat(), g.user_id))
    if st == 1:
        db.execute("INSERT INTO notifications(user_id,type,title,message,created_at) VALUES (?,?,?,?,?)",
                   (g.user_id,"system","Bot Aktivated","Bot alim satim limitleri dahilinde calismaya basladi.",datetime.now().isoformat()))
    db.commit()
    return jsonify({"message": "Bot durumu " + ("acildi" if st else "kapatildi")})

@bot_bp.route("/force_signal", methods=["POST"])
@require_auth
def force_signal():
    d = request.get_json()
    sig = d.get("signal","buy").upper()
    sym = d.get("symbol","BTCUSDT").upper()
    
    # Generate mock logic trace for manual signal
    from core.bot_daemon import bot_daemon
    bot_daemon._log_trade(g.user_id, sym, sig, 65000.0, "Manual_Signal")
    
    return jsonify({
        "message": f"Manuel {sig} sinyali gonderildi ({sym})",
        "trade_id": "M-"+str(int(datetime.now().timestamp()))
    })

@bot_bp.route("/logs", methods=["GET"])
@require_auth
def get_bot_logs():
    db = get_db()
    c = db.execute("""
        SELECT symbol, signal, price, source, created_at 
        FROM bot_logs 
        WHERE user_id=? 
        ORDER BY created_at DESC LIMIT 50
    """, (g.user_id,)).fetchall()
    
    logs = []
    for row in c:
        logs.append({
            "symbol": row["symbol"],
            "signal": row["signal"],
            "price": row["price"],
            "source": row["source"],
            "created_at": row["created_at"]
        })
        
    return jsonify({"logs": logs})

@bot_bp.route("/status", methods=["GET"])
@require_auth
def get_bot_status():
    db = get_db()
    c = db.execute("SELECT is_active FROM bot_configs WHERE user_id=?", (g.user_id,)).fetchone()
    is_active = c["is_active"] if c else 0
    
    # Also get stats (mock logic for demo)
    from core.bot_daemon import bot_daemon
    # count how many trades
    total_trades = db.execute("SELECT COUNT(*) as c FROM bot_logs WHERE user_id=?", (g.user_id,)).fetchone()["c"]
    
    return jsonify({
        "is_active": is_active,
        "total_trades": total_trades,
        "win_rate": 68.5, # Mock value
        "pnl": 124.50, # Mock value
        "daemon_running": bot_daemon.running,
        "mode": "simulation",
        "message": "Bot daemon su anda canli emir gondermez; yalnizca simulasyon sinyali uretir."
    })
