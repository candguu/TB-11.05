import time
import requests
import threading
from flask import Blueprint, jsonify, request

market_bp = Blueprint("market", __name__)

COINGECKO_URL = "https://api.coingecko.com/api/v3"
CACHE_TTL     = 60  # 60 saniye (rate limit'i önlemek için)

_cache = {
    "top50":  {"data": None, "ts": 0},
    "global": {"data": None, "ts": 0},
}
_cache_lock = threading.Lock()

@market_bp.route("/top50", methods=["GET"])
def market_top50():
    now = time.time()
    with _cache_lock:
        if _cache["top50"]["data"] and (now - _cache["top50"]["ts"] < CACHE_TTL):
            return jsonify(_cache["top50"]["data"])

    try:
        r = requests.get(
            f"{COINGECKO_URL}/coins/markets",
            params={
                "vs_currency": "usd",
                "order": "market_cap_desc",
                "per_page": 50,
                "page": 1,
                "sparkline": False,
                "price_change_percentage": "24h"
            },
            timeout=10
        )
        if r.status_code == 200:
            data = r.json()
            with _cache_lock:
                _cache["top50"] = {"data": data, "ts": now}
            return jsonify(data)
        else:
            with _cache_lock:
                cached = _cache["top50"]["data"]
            if cached: 
                return jsonify(cached)
            return jsonify({"error": "CoinGecko API Hatasi", "status": r.status_code}), r.status_code
    except requests.exceptions.Timeout:
        with _cache_lock:
            cached = _cache["top50"]["data"]
        if cached: 
            return jsonify(cached)
        return jsonify({"error": "CoinGecko API timeout"}), 504
    except Exception as e:
        with _cache_lock:
            cached = _cache["top50"]["data"]
        if cached: 
            return jsonify(cached)
        return jsonify({"error": str(e)}), 500

@market_bp.route("/global", methods=["GET"])
def market_global():
    now = time.time()
    with _cache_lock:
        if _cache["global"]["data"] and (now - _cache["global"]["ts"] < CACHE_TTL):
            return jsonify(_cache["global"]["data"])

    try:
        r = requests.get(f"{COINGECKO_URL}/global", timeout=10)
        if r.status_code == 200:
            data = r.json()
            with _cache_lock:
                _cache["global"] = {"data": data, "ts": now}
            return jsonify(data)
        else:
            with _cache_lock:
                cached = _cache["global"]["data"]
            if cached: 
                return jsonify(cached)
            return jsonify({"error": "Global data hatasi", "status": r.status_code}), r.status_code
    except requests.exceptions.Timeout:
        with _cache_lock:
            cached = _cache["global"]["data"]
        if cached: 
            return jsonify(cached)
        return jsonify({"error": "CoinGecko API timeout"}), 504
    except Exception as e:
        with _cache_lock:
            cached = _cache["global"]["data"]
        if cached: 
            return jsonify(cached)
        return jsonify({"error": str(e)}), 500

@market_bp.route("/binance-ticker", methods=["GET"])
def binance_ticker():
    """Proxy endpoint for Binance Futures Demo 24hr ticker data"""
    now = time.time()
    cache_key = "binance_ticker"
    
    # Initialize cache if not exists
    if cache_key not in _cache:
        _cache[cache_key] = {"data": None, "ts": 0}
    
    with _cache_lock:
        if _cache[cache_key]["data"] and (now - _cache[cache_key]["ts"] < CACHE_TTL):
            print(f"[BINANCE TICKER] Returning cached data ({len(_cache[cache_key]['data'])} tickers)")
            return jsonify(_cache[cache_key]["data"])

    try:
        # Futures Demo API - Doğru endpoint
        url = "https://demo-fapi.binance.com/fapi/v1/ticker/24hr"
        print(f"[BINANCE TICKER] Fetching from: {url}")
        
        r = requests.get(url, timeout=10)
        
        print(f"[BINANCE TICKER] Response status: {r.status_code}")
        
        if r.status_code == 200:
            data = r.json()
            print(f"[BINANCE TICKER] Received {len(data)} tickers")
            with _cache_lock:
                _cache[cache_key] = {"data": data, "ts": now}
            return jsonify(data)
        else:
            print(f"[BINANCE TICKER] Error response: {r.text[:200]}")
            with _cache_lock:
                cached = _cache[cache_key]["data"]
            if cached: 
                print(f"[BINANCE TICKER] Returning cached data after error")
                return jsonify(cached)
            return jsonify({"error": "Binance API Error", "status": r.status_code}), r.status_code
    except requests.exceptions.Timeout:
        print("[BINANCE TICKER] Timeout error")
        with _cache_lock:
            cached = _cache[cache_key]["data"]
        if cached: 
            return jsonify(cached)
        return jsonify({"error": "Binance API timeout"}), 504
    except Exception as e:
        print(f"[BINANCE TICKER] Exception: {str(e)}")
        with _cache_lock:
            cached = _cache[cache_key]["data"]
        if cached: 
            return jsonify(cached)
        return jsonify({"error": str(e)}), 500

@market_bp.route("/coingecko-markets", methods=["GET"])
def coingecko_markets():
    """Proxy endpoint for CoinGecko markets data with pagination"""
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 250))
    
    cache_key = f"coingecko_markets_p{page}"
    now = time.time()
    
    # Initialize cache if not exists
    if cache_key not in _cache:
        _cache[cache_key] = {"data": None, "ts": 0}
    
    with _cache_lock:
        if _cache[cache_key]["data"] and (now - _cache[cache_key]["ts"] < CACHE_TTL):
            print(f"[COINGECKO] Returning cached data for page {page}")
            return jsonify(_cache[cache_key]["data"])

    try:
        print(f"[COINGECKO] Fetching page {page} from CoinGecko API...")
        r = requests.get(
            f"{COINGECKO_URL}/coins/markets",
            params={
                "vs_currency": "usd",
                "order": "market_cap_desc",
                "per_page": per_page,
                "page": page,
                "sparkline": False,
                "price_change_percentage": "24h,7d"
            },
            timeout=10
        )
        print(f"[COINGECKO] Response status: {r.status_code}")
        
        if r.status_code == 200:
            data = r.json()
            print(f"[COINGECKO] Received {len(data)} coins for page {page}")
            with _cache_lock:
                _cache[cache_key] = {"data": data, "ts": now}
            return jsonify(data)
        else:
            print(f"[COINGECKO] Error: {r.status_code} - {r.text[:200]}")
            with _cache_lock:
                cached = _cache[cache_key]["data"]
            if cached: 
                print(f"[COINGECKO] Returning cached data after error")
                return jsonify(cached)
            return jsonify({"error": "CoinGecko API Error", "status": r.status_code, "message": r.text[:200]}), r.status_code
    except requests.exceptions.Timeout:
        print("[COINGECKO] Timeout error")
        with _cache_lock:
            cached = _cache[cache_key]["data"]
        if cached: 
            return jsonify(cached)
        return jsonify({"error": "CoinGecko API timeout"}), 504
    except Exception as e:
        print(f"[COINGECKO] Exception: {str(e)}")
        with _cache_lock:
            cached = _cache[cache_key]["data"]
        if cached: 
            return jsonify(cached)
        return jsonify({"error": str(e)}), 500

