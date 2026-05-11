"""
Binance Demo API İstemcisi
===========================
Binance Demo Trading (demo.binance.com) API ile iletişim kurar.
HMAC-SHA256 imzalama, zaman damgası ve tüm endpoint'leri yönetir.
"""

import time
import hmac
import hashlib
import requests
from urllib.parse import urlencode


class BinanceClient:
    """Binance Demo Mode Spot API istemcisi."""

    # Binance Demo Mode base URL
    BASE_URL = "https://demo-api.binance.com/api"

    def __init__(self, api_key: str, api_secret: str):
        self.api_key = api_key
        self.api_secret = api_secret
        self.session = requests.Session()
        self.session.headers.update({
            "X-MBX-APIKEY": self.api_key,
            "Content-Type": "application/x-www-form-urlencoded",
        })

    def _sign(self, params: dict) -> dict:
        """Parametrelere timestamp + signature ekle."""
        params["timestamp"] = int(time.time() * 1000)
        query = urlencode(params, doseq=True)
        signature = hmac.new(
            self.api_secret.encode("utf-8"),
            query.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        params["signature"] = signature
        return params

    def _request(self, method: str, path: str, params: dict = None, signed: bool = True):
        """API isteği gönder."""
        params = params or {}
        url = f"{self.BASE_URL}{path}"

        if signed:
            params = self._sign(params)

        try:
            if method == "GET":
                resp = self.session.get(url, params=params, timeout=3)
            elif method == "POST":
                resp = self.session.post(url, data=params, timeout=3)
            elif method == "DELETE":
                resp = self.session.delete(url, params=params, timeout=3)
            else:
                raise ValueError(f"Desteklenmeyen HTTP metodu: {method}")

            data = resp.json()

            if resp.status_code != 200:
                return {"ok": False, "code": data.get("code", -1),
                        "error": data.get("msg", "Bilinmeyen hata"),
                        "status": resp.status_code}

            return {"ok": True, "data": data}

        except requests.exceptions.Timeout:
            return {"ok": False, "error": "Bağlantı zaman aşımına uğradı"}
        except requests.exceptions.ConnectionError:
            return {"ok": False, "error": "Binance API'ye bağlanılamadı"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ─── Hesap Bilgileri ───────────────────────────

    def get_account(self):
        """Hesap bilgilerini ve bakiyeleri getir."""
        return self._request("GET", "/v3/account")

    def test_connectivity(self):
        """API key'in geçerliliğini test et (account bilgisi çekerek)."""
        result = self._request("GET", "/v3/account")
        if result["ok"]:
            return {"ok": True, "message": "Bağlantı başarılı"}
        return result

    # ─── Bakiye ───────────────────────────────────

    def get_balances(self):
        """Sıfırdan büyük bakiyeleri döndür."""
        result = self.get_account()
        if not result["ok"]:
            return result

        balances = []
        for b in result["data"].get("balances", []):
            free = float(b["free"])
            locked = float(b["locked"])
            if free > 0 or locked > 0:
                balances.append({
                    "asset": b["asset"],
                    "free": free,
                    "locked": locked,
                    "total": free + locked,
                })
        return {"ok": True, "data": balances}

    # ─── Emir İşlemleri ──────────────────────────

    def place_order(self, symbol: str, side: str, order_type: str = "MARKET",
                    quantity: float = None, quote_order_qty: float = None,
                    price: float = None, time_in_force: str = None):
        """
        Yeni emir gönder.
        - side: BUY / SELL
        - order_type: LIMIT / MARKET
        - quantity: Coin miktarı (MARKET SELL veya LIMIT için)
        - quote_order_qty: USDT miktarı (MARKET BUY için)
        - price: Limit fiyatı (LIMIT emirleri için)
        """
        params = {
            "symbol": symbol.upper(),
            "side": side.upper(),
            "type": order_type.upper(),
        }

        if order_type.upper() == "LIMIT":
            if not price or not quantity:
                return {"ok": False, "error": "LIMIT emri için fiyat ve miktar gerekli"}
            params["price"] = f"{price:.8f}".rstrip("0").rstrip(".")
            params["quantity"] = f"{quantity:.8f}".rstrip("0").rstrip(".")
            params["timeInForce"] = time_in_force or "GTC"

        elif order_type.upper() == "MARKET":
            if side.upper() == "BUY":
                if quote_order_qty:
                    params["quoteOrderQty"] = f"{quote_order_qty:.8f}".rstrip("0").rstrip(".")
                elif quantity:
                    params["quantity"] = f"{quantity:.8f}".rstrip("0").rstrip(".")
                else:
                    return {"ok": False, "error": "MARKET BUY için miktar veya USDT tutarı gerekli"}
            else:
                if not quantity:
                    return {"ok": False, "error": "MARKET SELL için miktar gerekli"}
                params["quantity"] = f"{quantity:.8f}".rstrip("0").rstrip(".")

        return self._request("POST", "/v3/order", params)

    def cancel_order(self, symbol: str, order_id: int):
        """Açık emri iptal et."""
        params = {"symbol": symbol.upper(), "orderId": order_id}
        return self._request("DELETE", "/v3/order", params)

    # ─── Emir Sorgulama ──────────────────────────

    def get_open_orders(self, symbol: str = None):
        """Açık emirleri getir."""
        params = {}
        if symbol:
            params["symbol"] = symbol.upper()
        return self._request("GET", "/v3/openOrders", params)

    def get_all_orders(self, symbol: str, limit: int = 50):
        """Tüm emir geçmişini getir."""
        params = {"symbol": symbol.upper(), "limit": limit}
        return self._request("GET", "/v3/allOrders", params)

    def get_my_trades(self, symbol: str, limit: int = 50):
        """İşlem geçmişini getir."""
        params = {"symbol": symbol.upper(), "limit": limit}
        return self._request("GET", "/v3/myTrades", params)

    # ─── Piyasa Verisi (imzasız) ──────────────

    def get_ticker_price(self, symbol: str = None):
        """Anlık fiyat bilgisi."""
        params = {}
        if symbol:
            params["symbol"] = symbol.upper()
        return self._request("GET", "/v3/ticker/price", params, signed=False)

    def get_exchange_info(self, symbol: str = None):
        """Sembol bilgilerini getir (lot size, min notional vb.)."""
        params = {}
        if symbol:
            params["symbol"] = symbol.upper()
        return self._request("GET", "/v3/exchangeInfo", params, signed=False)


class BinanceFuturesClient:
    """Binance Demo Mode Futures (USDT-M) API istemcisi."""

    # Binance Demo Futures base URL
    BASE_URL = "https://demo-fapi.binance.com/fapi"

    def __init__(self, api_key: str, api_secret: str):
        self.api_key = api_key
        self.api_secret = api_secret
        self.session = requests.Session()
        self.session.headers.update({
            "X-MBX-APIKEY": self.api_key,
            "Content-Type": "application/x-www-form-urlencoded",
        })

    def _sign(self, params: dict) -> dict:
        params["timestamp"] = int(time.time() * 1000)
        query = urlencode(params, doseq=True)
        signature = hmac.new(
            self.api_secret.encode("utf-8"),
            query.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        params["signature"] = signature
        return params

    def _request(self, method: str, path: str, params: dict = None, signed: bool = True):
        params = params or {}
        url = f"{self.BASE_URL}{path}"
        if signed:
            params = self._sign(params)
        try:
            if method == "GET":
                resp = self.session.get(url, params=params, timeout=3)
            elif method == "POST":
                resp = self.session.post(url, data=params, timeout=3)
            elif method == "DELETE":
                resp = self.session.delete(url, params=params, timeout=3)
            else:
                raise ValueError(f"Desteklenmeyen HTTP metodu: {method}")
            data = resp.json()
            if resp.status_code != 200:
                return {"ok": False, "code": data.get("code", -1),
                        "error": data.get("msg", "Bilinmeyen hata"),
                        "status": resp.status_code}
            return {"ok": True, "data": data}
        except requests.exceptions.Timeout:
            return {"ok": False, "error": "Bağlantı zaman aşımına uğradı"}
        except requests.exceptions.ConnectionError:
            return {"ok": False, "error": "Futures API'ye bağlanılamadı"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ─── Hesap Bilgileri ───────────────────────────

    def get_account(self):
        """Futures hesap bilgilerini getir."""
        return self._request("GET", "/v2/account")

    def get_balance(self):
        """Futures bakiyelerini getir."""
        return self._request("GET", "/v2/balance")

    def test_connectivity(self):
        result = self._request("GET", "/v2/balance")
        if result["ok"]:
            return {"ok": True, "message": "Futures bağlantısı başarılı"}
        return result

    # ─── Kaldıraç Ayarı ─────────────────────────

    def set_leverage(self, symbol: str, leverage: int):
        """Kaldıraç oranını ayarla (1-125)."""
        params = {"symbol": symbol.upper(), "leverage": min(max(leverage, 1), 125)}
        return self._request("POST", "/v1/leverage", params)

    def get_leverage_brackets(self, symbol: str = None):
        """Kaldıraç limitlerini getir."""
        params = {}
        if symbol:
            params["symbol"] = symbol.upper()
        return self._request("GET", "/v1/leverageBracket", params)

    def set_margin_type(self, symbol: str, margin_type: str = "CROSSED"):
        """Margin tipini ayarla: ISOLATED veya CROSSED."""
        params = {"symbol": symbol.upper(), "marginType": margin_type.upper()}
        return self._request("POST", "/v1/marginType", params)

    # ─── Emir İşlemleri ──────────────────────────

    def place_order(self, symbol: str, side: str, order_type: str = "MARKET",
                    quantity: float = None, price: float = None,
                    time_in_force: str = None, reduce_only: bool = False):
        """
        Futures emri gönder.
        - side: BUY (LONG) / SELL (SHORT)
        - order_type: LIMIT / MARKET / STOP_MARKET / TAKE_PROFIT_MARKET
        """
        params = {
            "symbol": symbol.upper(),
            "side": side.upper(),
            "type": order_type.upper(),
        }
        if reduce_only:
            params["reduceOnly"] = "true"

        if order_type.upper() == "LIMIT":
            if not price or not quantity:
                return {"ok": False, "error": "LIMIT emri için fiyat ve miktar gerekli"}
            params["price"] = f"{price:.8f}".rstrip("0").rstrip(".")
            params["quantity"] = f"{quantity:.8f}".rstrip("0").rstrip(".")
            params["timeInForce"] = time_in_force or "GTC"

        elif order_type.upper() == "MARKET":
            if not quantity:
                return {"ok": False, "error": "MARKET emri için miktar gerekli"}
            params["quantity"] = f"{quantity:.8f}".rstrip("0").rstrip(".")

        elif order_type.upper() in ("STOP_MARKET", "TAKE_PROFIT_MARKET"):
            if not quantity:
                return {"ok": False, "error": "Stop emri için miktar gerekli"}
            params["quantity"] = f"{quantity:.8f}".rstrip("0").rstrip(".")
            if price:
                params["stopPrice"] = f"{price:.8f}".rstrip("0").rstrip(".")

        return self._request("POST", "/v1/order", params)

    def cancel_order(self, symbol: str, order_id: int):
        params = {"symbol": symbol.upper(), "orderId": order_id}
        return self._request("DELETE", "/v1/order", params)

    def cancel_all_orders(self, symbol: str):
        params = {"symbol": symbol.upper()}
        return self._request("DELETE", "/v1/allOpenOrders", params)

    # ─── Pozisyon & Emir Sorgulama ──────────────

    def get_positions(self):
        """Açık pozisyonları getir."""
        result = self.get_account()
        if not result["ok"]:
            return result
        positions = []
        for p in result["data"].get("positions", []):
            amt = float(p.get("positionAmt", 0))
            if amt != 0:
                positions.append({
                    "symbol": p["symbol"],
                    "side": "LONG" if amt > 0 else "SHORT",
                    "positionAmt": abs(amt),
                    "entryPrice": float(p.get("entryPrice", 0)),
                    "markPrice": float(p.get("markPrice", 0)),
                    "unrealizedPnl": float(p.get("unrealizedProfit", 0)),
                    "leverage": int(p.get("leverage", 1)),
                    "marginType": p.get("marginType", "cross"),
                })
        return {"ok": True, "data": positions}

    def get_open_orders(self, symbol: str = None):
        params = {}
        if symbol:
            params["symbol"] = symbol.upper()
        return self._request("GET", "/v1/openOrders", params)

    def get_all_orders(self, symbol: str, limit: int = 50):
        params = {"symbol": symbol.upper(), "limit": limit}
        return self._request("GET", "/v1/allOrders", params)

    def get_my_trades(self, symbol: str, limit: int = 50):
        params = {"symbol": symbol.upper(), "limit": limit}
        return self._request("GET", "/v1/userTrades", params)

    def get_income_history(self, symbol: str = None, limit: int = 50):
        """PnL geçmişi, fonlama ücreti vb."""
        params = {"limit": limit}
        if symbol:
            params["symbol"] = symbol.upper()
        return self._request("GET", "/v1/income", params)
