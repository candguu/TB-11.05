import requests
from typing import List, Dict, Any
from core.logger import logger
from core.tb_symbols import require_tb_symbol

BINANCE_FUTURES_BASE = "https://fapi.binance.com"

def fetch_klines(symbol: str, interval: str, limit: int = 500) -> List[Dict[str, Any]]:
    """
    Binance Futures API'den kline (mum) verilerini çeker.
    """
    try:
        symbol = require_tb_symbol(symbol)
        url = f"{BINANCE_FUTURES_BASE}/fapi/v1/klines?symbol={symbol}&interval={interval}&limit={limit}"
        resp = requests.get(url, timeout=10)
        if resp.status_code != 200:
            logger.error(f"{symbol} market data alınamadı. Binance kline fetch error: {resp.text}")
            return []
        
        raw = resp.json()
        if not isinstance(raw, list):
            return []
            
        candles = []
        for c in raw:
            candles.append({
                "t": int(c[0]),      # Open time
                "o": float(c[1]),    # Open
                "h": float(c[2]),    # High
                "l": float(c[3]),    # Low
                "c": float(c[4]),    # Close
                "v": float(c[5]),    # Volume
                "T": int(c[6]),      # Close time
                "closed": True       # Default true, will evaluate later
            })
            
        # Son mum (aktif mum) genellikle henüz kapanmamıştır
        if candles:
            import time
            current_time = int(time.time() * 1000)
            if current_time < candles[-1]["T"]:
                candles[-1]["closed"] = False
                
        return candles
    except Exception as e:
        logger.error(f"{symbol} market data alınamadı. fetch_klines error for {symbol} {interval}: {e}")
        return []

def get_closed_candles(candles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Kapalı mumları filtreler."""
    return [c for c in candles if c.get("closed", True)]


def get_current_price(symbol: str) -> float | None:
    try:
        symbol = require_tb_symbol(symbol)
        resp = requests.get(f"{BINANCE_FUTURES_BASE}/fapi/v1/ticker/price", params={"symbol": symbol}, timeout=8)
        if resp.status_code != 200:
            logger.error(f"{symbol} current price alınamadı. {resp.text}")
            return None
        return float(resp.json().get("price"))
    except Exception as e:
        logger.error(f"{symbol} current price alınamadı: {e}")
        return None


def get_exchange_filters(symbol: str) -> Dict[str, Any] | None:
    try:
        symbol = require_tb_symbol(symbol)
        resp = requests.get(f"{BINANCE_FUTURES_BASE}/fapi/v1/exchangeInfo", params={"symbol": symbol}, timeout=8)
        if resp.status_code != 200:
            logger.error(f"{symbol} exchange filters alınamadı. {resp.text}")
            return None
        symbols = resp.json().get("symbols") or []
        info = next((item for item in symbols if item.get("symbol") == symbol), None)
        if not info:
            logger.error(f"{symbol} exchangeInfo içinde bulunamadı.")
            return None
        filters = {item.get("filterType"): item for item in info.get("filters", [])}
        lot = filters.get("LOT_SIZE", {})
        price = filters.get("PRICE_FILTER", {})
        min_notional = filters.get("MIN_NOTIONAL", {})
        return {
            "symbol": symbol,
            "tick_size": float(price.get("tickSize", 0.01)),
            "step_size": float(lot.get("stepSize", 0.001)),
            "min_qty": float(lot.get("minQty", 0.0)),
            "min_notional": float(min_notional.get("notional", min_notional.get("minNotional", 0.0)) or 0.0),
        }
    except Exception as e:
        logger.error(f"{symbol} exchange filters alınamadı: {e}")
        return None
