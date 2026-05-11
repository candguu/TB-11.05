from typing import Dict, Any, List
from core.binance_api import BinanceFuturesClient
from core.logger import logger
from core.tb_symbols import require_tb_symbol
import math

class TBExecutionEngine:
    """
    Sinyal ve Risk Engine kararlarını Binance Demo API üzerinde çalıştırır.
    """
    
    def __init__(self, api_key: str, api_secret: str, expected_symbol: str = None):
        self.client = BinanceFuturesClient(api_key, api_secret)
        self.expected_symbol = require_tb_symbol(expected_symbol) if expected_symbol else None

    def _symbol_ok(self, symbol: str) -> bool:
        try:
            symbol = require_tb_symbol(symbol)
        except ValueError as exc:
            logger.error(f"Order symbol rejected: {exc}")
            return False
        logger.info(f"Order symbol check: {symbol}")
        if self.expected_symbol and symbol != self.expected_symbol:
            logger.error(f"Order symbol mismatch: config={self.expected_symbol} order={symbol}")
            return False
        return True
        
    def get_account_balance(self) -> float:
        """Kullanılabilir USDT bakiyesini döner."""
        res = self.client.get_balance()
        if not res["ok"]:
            logger.error(f"Failed to get balance: {res.get('error')}")
            return 0.0
            
        for b in res["data"]:
            if b["asset"] == "USDT":
                return float(b["availableBalance"])
        return 0.0
        
    def setup_symbol(self, symbol: str, leverage: int, margin_type: str) -> bool:
        """Kaldıraç ve Margin Tipi ayarlar."""
        if not self._symbol_ok(symbol):
            return False
        res_lev = self.client.set_leverage(symbol, leverage)
        if not res_lev["ok"] and "-4028" not in str(res_lev.get("error", "")): # -4028 leverage already set
            logger.error(f"Set leverage error for {symbol}: {res_lev.get('error')}")
            return False
            
        res_mar = self.client.set_margin_type(symbol, margin_type)
        if not res_mar["ok"] and "-4046" not in str(res_mar.get("error", "")): # -4046 margin type already set
            logger.error(f"Set margin type error for {symbol}: {res_mar.get('error')}")
            return False
            
        return True

    def execute_market_order(self, symbol: str, side: str, quantity: float) -> Dict[str, Any]:
        """Market emir gönderir."""
        if not self._symbol_ok(symbol):
            return {"success": False, "error": "Symbol config ile uyuşmuyor"}
        res = self.client.place_order(symbol=symbol, side=side, order_type="MARKET", quantity=quantity)
        if not res["ok"]:
            return {"success": False, "error": res.get("error")}
            
        return {
            "success": True,
            "order_id": res["data"].get("orderId"),
            "fill_price": float(res["data"].get("avgPrice", 0) or 0)
        }
        
    def place_stop_loss(self, symbol: str, side: str, quantity: float, stop_price: float) -> Dict[str, Any]:
        """Stop loss emri gönderir."""
        # Eğer Long açtıysak, SL için side=SELL olmalı
        # Eğer Short açtıysak, SL için side=BUY olmalı
        if not self._symbol_ok(symbol):
            return {"success": False, "error": "Symbol config ile uyuşmuyor"}
        sl_side = "SELL" if side == "BUY" else "BUY"
        res = self.client.place_order(
            symbol=symbol, 
            side=sl_side, 
            order_type="STOP_MARKET", 
            quantity=quantity, 
            price=stop_price,
            reduce_only=True
        )
        return {"success": res["ok"], "data": res.get("data"), "error": res.get("error")}
        
    def place_take_profit(self, symbol: str, side: str, quantity: float, take_profit: float) -> Dict[str, Any]:
        """Take profit emri gönderir."""
        if not self._symbol_ok(symbol):
            return {"success": False, "error": "Symbol config ile uyuşmuyor"}
        tp_side = "SELL" if side == "BUY" else "BUY"
        res = self.client.place_order(
            symbol=symbol, 
            side=tp_side, 
            order_type="TAKE_PROFIT_MARKET", 
            quantity=quantity, 
            price=take_profit,
            reduce_only=True
        )
        return {"success": res["ok"], "data": res.get("data"), "error": res.get("error")}

    def close_position(self, symbol: str, side: str, quantity: float) -> Dict[str, Any]:
        """Açık olan pozisyonu market emriyle kapatır."""
        if not self._symbol_ok(symbol):
            return {"success": False, "error": "Symbol config ile uyuşmuyor"}
        close_side = "SELL" if side == "LONG" else "BUY"
        res = self.client.place_order(
            symbol=symbol, 
            side=close_side, 
            order_type="MARKET", 
            quantity=quantity,
            reduce_only=True
        )
        return {"success": res["ok"], "data": res.get("data"), "error": res.get("error")}
        
    def cancel_all_orders(self, symbol: str) -> bool:
        if not self._symbol_ok(symbol):
            return False
        res = self.client.cancel_all_orders(symbol)
        return res["ok"]
