"""
OTT (Optimized Trend Tracker) API Routes
"""
from flask import Blueprint, request, jsonify
from datetime import datetime
import requests
import pandas as pd
from core.ott_indicator import OTTIndicator
from core.security import require_auth

ott_bp = Blueprint("ott", __name__)

def fetch_binance_klines(symbol: str, interval: str, limit: int = 500):
    """Binance'den mum verisi çek"""
    try:
        url = "https://api.binance.com/api/v3/klines"
        params = {
            "symbol": symbol,
            "interval": interval,
            "limit": limit
        }
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        # DataFrame'e çevir
        df = pd.DataFrame(data, columns=[
            'timestamp', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_volume', 'trades', 'taker_buy_base',
            'taker_buy_quote', 'ignore'
        ])
        
        # Tip dönüşümleri
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        for col in ['open', 'high', 'low', 'close', 'volume']:
            df[col] = df[col].astype(float)
        
        return df[['timestamp', 'open', 'high', 'low', 'close', 'volume']]
    
    except Exception as e:
        print(f"Binance API hatası: {e}")
        return None

@ott_bp.route("/calculate", methods=["POST"])
@require_auth
def calculate_ott():
    """
    OTT hesapla
    Body: {
        "symbol": "BTCUSDT",
        "interval": "5m",
        "length": 2,
        "percent": 1.4,
        "ma_type": "VAR"
    }
    """
    data = request.get_json() or {}
    
    symbol = data.get("symbol", "BTCUSDT")
    interval = data.get("interval", "5m")
    length = int(data.get("length", 2))
    percent = float(data.get("percent", 1.4))
    ma_type = data.get("ma_type", "VAR")
    
    # Binance'den veri çek
    df = fetch_binance_klines(symbol, interval, limit=500)
    
    if df is None or len(df) < 50:
        return jsonify({"error": "Veri çekilemedi"}), 500
    
    # OTT hesapla
    ott = OTTIndicator(length=length, percent=percent, ma_type=ma_type)
    result = ott.calculate(df)
    
    # Tüm değerleri döndür (grafik için 500 ms)
    last_n = len(df)
    ott_values = result['ott'].tail(last_n).fillna(0).tolist()
    mavg_values = result['mavg'].tail(last_n).fillna(0).tolist()
    timestamps = [int(x.timestamp()) for x in df['timestamp'].tail(last_n)]
    
    # Sinyallerin zamanını mapele
    mapped_signals = []
    if result['signals']:
        for sig in result['signals']:
            sig_copy = sig.copy()
            sig_copy['time'] = int(df['timestamp'].iloc[sig['index']].timestamp())
            mapped_signals.append(sig_copy)
            
    return jsonify({
        "symbol": symbol,
        "interval": interval,
        "current": {
            "price": result['current_price'],
            "ott": result['current_ott'],
            "mavg": result['current_mavg'],
            "direction": result['current_direction'],
            "trend": "BULLISH" if result['current_direction'] == 1 else "BEARISH"
        },
        "chart_data": {
            "timestamps": timestamps,
            "ott": ott_values,
            "mavg": mavg_values
        },
        "signals": mapped_signals
    })

@ott_bp.route("/signal", methods=["POST"])
@require_auth
def get_signal():
    """
    Güncel OTT sinyalini al
    Body: {
        "symbol": "BTCUSDT",
        "interval": "5m",
        "length": 2,
        "percent": 1.4
    }
    """
    data = request.get_json() or {}
    
    symbol = data.get("symbol", "BTCUSDT")
    interval = data.get("interval", "5m")
    length = int(data.get("length", 2))
    percent = float(data.get("percent", 1.4))
    ma_type = data.get("ma_type", "VAR")
    
    # Binance'den veri çek
    df = fetch_binance_klines(symbol, interval, limit=200)
    
    if df is None or len(df) < 50:
        return jsonify({"error": "Veri çekilemedi"}), 500
    
    # OTT hesapla
    ott = OTTIndicator(length=length, percent=percent, ma_type=ma_type)
    signal = ott.get_latest_signal(df)
    
    return jsonify({
        "symbol": symbol,
        "interval": interval,
        "timestamp": datetime.now().isoformat(),
        "signal": signal['signal'],
        "source": signal['source'],
        "price": signal['price'],
        "ott": signal['ott'],
        "mavg": signal['mavg'],
        "direction": signal['direction'],
        "recommendation": {
            "action": signal['signal'],
            "confidence": "HIGH" if signal['source'] == 'OTT_COLOR' else "MEDIUM",
            "description": f"OTT {signal['direction']} trend, sinyal: {signal['signal']}"
        }
    })

@ott_bp.route("/stream", methods=["GET"])
@require_auth
def stream_signals():
    """
    Canlı sinyal stream'i (polling için)
    Query params: symbol, interval, length, percent
    """
    symbol = request.args.get("symbol", "BTCUSDT")
    interval = request.args.get("interval", "5m")
    length = int(request.args.get("length", 2))
    percent = float(request.args.get("percent", 1.4))
    
    # Binance'den veri çek
    df = fetch_binance_klines(symbol, interval, limit=100)
    
    if df is None:
        return jsonify({"error": "Veri çekilemedi"}), 500
    
    # OTT hesapla
    ott = OTTIndicator(length=length, percent=percent)
    result = ott.calculate(df)
    
    # Son 5 sinyali döndür
    recent_signals = result['signals'][-5:] if result['signals'] else []
    
    return jsonify({
        "timestamp": datetime.now().isoformat(),
        "current_price": result['current_price'],
        "ott": result['current_ott'],
        "mavg": result['current_mavg'],
        "direction": result['current_direction'],
        "fark": abs(result['current_price'] - result['current_ott']),
        "signals": recent_signals
    })

@ott_bp.route("/backtest", methods=["POST"])
@require_auth
def backtest():
    """
    OTT stratejisini backtest et
    Body: {
        "symbol": "BTCUSDT",
        "interval": "5m",
        "length": 2,
        "percent": 1.4,
        "days": 7
    }
    """
    data = request.get_json() or {}
    
    symbol = data.get("symbol", "BTCUSDT")
    interval = data.get("interval", "5m")
    length = int(data.get("length", 2))
    percent = float(data.get("percent", 1.4))
    
    # Daha fazla veri çek (backtest için)
    df = fetch_binance_klines(symbol, interval, limit=1000)
    
    if df is None or len(df) < 100:
        return jsonify({"error": "Yeterli veri yok"}), 500
    
    # OTT hesapla
    ott = OTTIndicator(length=length, percent=percent)
    result = ott.calculate(df)
    
    # Basit backtest simülasyonu
    signals = result['signals']
    trades = []
    position = None
    
    for sig in signals:
        if sig['type'] == 'BUY' and position is None:
            position = {
                'entry_price': sig['price'],
                'entry_index': sig['index'],
                'type': 'LONG'
            }
        elif sig['type'] == 'SELL' and position is not None:
            pnl = sig['price'] - position['entry_price']
            pnl_pct = (pnl / position['entry_price']) * 100
            
            trades.append({
                'entry': position['entry_price'],
                'exit': sig['price'],
                'pnl': pnl,
                'pnl_pct': pnl_pct,
                'bars': sig['index'] - position['entry_index']
            })
            position = None
    
    # İstatistikler
    if trades:
        total_pnl = sum(t['pnl_pct'] for t in trades)
        winning_trades = [t for t in trades if t['pnl'] > 0]
        win_rate = (len(winning_trades) / len(trades)) * 100
        avg_win = sum(t['pnl_pct'] for t in winning_trades) / len(winning_trades) if winning_trades else 0
        losing_trades = [t for t in trades if t['pnl'] <= 0]
        avg_loss = sum(t['pnl_pct'] for t in losing_trades) / len(losing_trades) if losing_trades else 0
    else:
        total_pnl = 0
        win_rate = 0
        avg_win = 0
        avg_loss = 0
    
    return jsonify({
        "symbol": symbol,
        "interval": interval,
        "parameters": {
            "length": length,
            "percent": percent
        },
        "statistics": {
            "total_trades": len(trades),
            "winning_trades": len(winning_trades) if trades else 0,
            "losing_trades": len(losing_trades) if trades else 0,
            "win_rate": round(win_rate, 2),
            "total_pnl_pct": round(total_pnl, 2),
            "avg_win_pct": round(avg_win, 2),
            "avg_loss_pct": round(avg_loss, 2)
        },
        "trades": trades[-20:]  # Son 20 işlem
    })
