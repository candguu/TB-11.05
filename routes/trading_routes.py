"""
Trading Routes — Binance Demo API Entegrasyonu
================================================
API key yönetimi, bakiye sorgulama, emir gönderme/iptal,
emir geçmişi ve işlem geçmişi endpoint'leri.
"""

from datetime import datetime, timezone
import re
from flask import Blueprint, request, jsonify, g
from core.database import get_db
from core.security import require_auth
from core.crypto_utils import encrypt_value, decrypt_value
from core.binance_api import BinanceClient, BinanceFuturesClient

trading_bp = Blueprint("trading", __name__)
BINANCE_KEY_RE = re.compile(r"^[A-Za-z0-9]{64}$")


def _validate_binance_credentials(api_key: str, api_secret: str):
    if not BINANCE_KEY_RE.fullmatch(api_key or ""):
        return "API key formati gecersiz. Binance demo/testnet API key 64 karakter alfanumerik olmalidir."
    if not BINANCE_KEY_RE.fullmatch(api_secret or ""):
        return "API secret formati gecersiz. Binance demo/testnet API secret 64 karakter alfanumerik olmalidir."
    return None


def _get_client():
    """Oturumdaki kullanıcının şifreli API key'lerini çöz ve BinanceClient döndür."""
    db = get_db()
    row = db.execute("SELECT api_key_enc, api_secret_enc FROM api_keys WHERE user_id=?",
                     (g.user_id,)).fetchone()
    if not row:
        return None
    try:
        api_key = decrypt_value(row["api_key_enc"])
        api_secret = decrypt_value(row["api_secret_enc"])
        return BinanceClient(api_key, api_secret)
    except Exception as e:
        print(f"[TRADING] Key decrypt error: {e}")
        return None


def _get_futures_client():
    """Oturumdaki kullanıcının Futures istemcisini döndür."""
    db = get_db()
    row = db.execute("SELECT api_key_enc, api_secret_enc FROM api_keys WHERE user_id=?",
                     (g.user_id,)).fetchone()
    if not row:
        return None
    try:
        api_key = decrypt_value(row["api_key_enc"])
        api_secret = decrypt_value(row["api_secret_enc"])
        return BinanceFuturesClient(api_key, api_secret)
    except Exception as e:
        print(f"[TRADING] Futures key decrypt error: {e}")
        return None


# ═══════════════════════════════════════
#  API KEY YÖNETİMİ
# ═══════════════════════════════════════

@trading_bp.route("/keys", methods=["POST"])
@require_auth
def save_api_keys():
    """API key kaydet veya güncelle."""
    d = request.get_json() or {}
    api_key = (d.get("api_key") or "").strip()
    api_secret = (d.get("api_secret") or "").strip()

    if not api_key or not api_secret:
        return jsonify({"error": "API Key ve Secret zorunludur"}), 400

    credential_error = _validate_binance_credentials(api_key, api_secret)
    if credential_error:
        return jsonify({"error": credential_error}), 400

    if len(api_key) < 10 or len(api_secret) < 10:
        return jsonify({"error": "Geçersiz API key formatı"}), 400

    try:
        enc_key = encrypt_value(api_key)
        enc_secret = encrypt_value(api_secret)
    except Exception as e:
        return jsonify({"error": "Şifreleme hatası"}), 500

    now = datetime.now(timezone.utc).isoformat()
    db = get_db()

    existing = db.execute("SELECT id FROM api_keys WHERE user_id=?", (g.user_id,)).fetchone()
    if existing:
        db.execute("""
            UPDATE api_keys SET api_key_enc=?, api_secret_enc=?, is_valid=0, updated_at=?
            WHERE user_id=?
        """, (enc_key, enc_secret, now, g.user_id))
    else:
        db.execute("""
            INSERT INTO api_keys (user_id, api_key_enc, api_secret_enc, is_testnet, is_valid, created_at)
            VALUES (?, ?, ?, 1, 0, ?)
        """, (g.user_id, enc_key, enc_secret, now))
    db.commit()

    return jsonify({"message": "API anahtarları kaydedildi", "key_hint": api_key[:6] + "..." + api_key[-4:]})


@trading_bp.route("/keys", methods=["GET"])
@require_auth
def get_api_key_status():
    """API key durumunu döndür (maskelenmiş)."""
    db = get_db()
    row = db.execute("SELECT api_key_enc, is_valid, is_testnet, created_at, updated_at FROM api_keys WHERE user_id=?",
                     (g.user_id,)).fetchone()
    if not row:
        return jsonify({"connected": False})

    try:
        key_plain = decrypt_value(row["api_key_enc"])
        hint = key_plain[:6] + "..." + key_plain[-4:]
    except Exception:
        hint = "***"

    return jsonify({
        "connected": True,
        "key_hint": hint,
        "is_valid": bool(row["is_valid"]),
        "is_testnet": bool(row["is_testnet"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    })


@trading_bp.route("/keys", methods=["DELETE"])
@require_auth
def delete_api_keys():
    """API key sil."""
    db = get_db()
    db.execute("DELETE FROM api_keys WHERE user_id=?", (g.user_id,))
    db.commit()
    return jsonify({"message": "API anahtarları silindi"})


@trading_bp.route("/keys/test", methods=["POST"])
@require_auth
def test_api_connection():
    """API bağlantısını test et."""
    client = _get_client()
    if not client:
        return jsonify({"error": "API anahtarı bulunamadı. Önce kaydedin."}), 400

    result = client.test_connectivity()
    db = get_db()
    if result["ok"]:
        db.execute("UPDATE api_keys SET is_valid=1, updated_at=? WHERE user_id=?",
                   (datetime.now(timezone.utc).isoformat(), g.user_id))
        db.commit()
        return jsonify({"success": True, "message": "Binance Demo API bağlantısı başarılı ✓"})
    else:
        db.execute("UPDATE api_keys SET is_valid=0, updated_at=? WHERE user_id=?",
                   (datetime.now(timezone.utc).isoformat(), g.user_id))
        db.commit()
        return jsonify({"success": False, "error": result.get("error", "Bağlantı başarısız")}), 400


# ═══════════════════════════════════════
#  BAKİYE
# ═══════════════════════════════════════

@trading_bp.route("/balance", methods=["GET"])
@require_auth
def get_balance():
    """Hesap bakiyelerini döndür."""
    client = _get_client()
    if not client:
        return jsonify({"error": "API anahtarı bağlı değil"}), 400

    result = client.get_balances()
    if not result["ok"]:
        return jsonify({"error": result.get("error", "Bakiye alınamadı")}), 400

    return jsonify({"balances": result["data"]})


# ═══════════════════════════════════════
#  EMİR İŞLEMLERİ
# ═══════════════════════════════════════

@trading_bp.route("/order", methods=["POST"])
@require_auth
def place_order():
    """Yeni emir gönder."""
    client = _get_client()
    if not client:
        return jsonify({"error": "API anahtarı bağlı değil"}), 400

    d = request.get_json() or {}
    symbol = (d.get("symbol") or "").strip().upper()
    side = (d.get("side") or "").strip().upper()
    order_type = (d.get("type") or "MARKET").strip().upper()

    if not symbol or not side:
        return jsonify({"error": "Symbol ve side zorunludur"}), 400
    if side not in ("BUY", "SELL"):
        return jsonify({"error": "Side BUY veya SELL olmalı"}), 400

    quantity = d.get("quantity")
    quote_qty = d.get("quoteOrderQty")
    price = d.get("price")

    if quantity:
        quantity = float(quantity)
    if quote_qty:
        quote_qty = float(quote_qty)
    if price:
        price = float(price)

    result = client.place_order(
        symbol=symbol,
        side=side,
        order_type=order_type,
        quantity=quantity,
        quote_order_qty=quote_qty,
        price=price,
        time_in_force=d.get("timeInForce"),
    )

    if not result["ok"]:
        return jsonify({"error": result.get("error", "Emir gönderilemedi")}), 400

    # Bildirim oluştur
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    order_data = result["data"]
    msg = f"{side} {symbol} — {order_type} emir #{order_data.get('orderId', '?')}"
    db.execute("INSERT INTO notifications(user_id,type,title,message,created_at) VALUES(?,?,?,?,?)",
               (g.user_id, "trade", "Emir Gönderildi", msg, now))
    db.commit()

    return jsonify({"message": "Emir başarıyla gönderildi", "order": order_data})


@trading_bp.route("/order", methods=["DELETE"])
@require_auth
def cancel_order():
    """Emri iptal et."""
    client = _get_client()
    if not client:
        return jsonify({"error": "API anahtarı bağlı değil"}), 400

    d = request.get_json() or {}
    symbol = (d.get("symbol") or "").strip().upper()
    order_id = d.get("orderId")

    if not symbol or not order_id:
        return jsonify({"error": "Symbol ve orderId zorunludur"}), 400

    result = client.cancel_order(symbol, int(order_id))
    if not result["ok"]:
        return jsonify({"error": result.get("error", "Emir iptal edilemedi")}), 400

    return jsonify({"message": "Emir iptal edildi", "order": result["data"]})


# ═══════════════════════════════════════
#  EMİR GEÇMİŞİ
# ═══════════════════════════════════════

@trading_bp.route("/orders/open", methods=["GET"])
@require_auth
def open_orders():
    """Açık emirleri döndür."""
    client = _get_client()
    if not client:
        return jsonify({"error": "API anahtarı bağlı değil"}), 400

    symbol = request.args.get("symbol", "").strip().upper() or None
    result = client.get_open_orders(symbol)
    if not result["ok"]:
        return jsonify({"error": result.get("error", "Açık emirler alınamadı")}), 400

    return jsonify({"orders": result["data"]})


@trading_bp.route("/orders/history", methods=["GET"])
@require_auth
def order_history():
    """Emir geçmişini döndür."""
    client = _get_client()
    if not client:
        return jsonify({"error": "API anahtarı bağlı değil"}), 400

    symbol = request.args.get("symbol", "BTCUSDT").strip().upper()
    limit = min(int(request.args.get("limit", 50)), 100)

    result = client.get_all_orders(symbol, limit)
    if not result["ok"]:
        return jsonify({"error": result.get("error", "Emir geçmişi alınamadı")}), 400

    return jsonify({"orders": result["data"]})


# ═══════════════════════════════════════
#  İŞLEM GEÇMİŞİ
# ═══════════════════════════════════════

@trading_bp.route("/trades", methods=["GET"])
@require_auth
def trade_history():
    """İşlem (fill) geçmişini döndür."""
    client = _get_client()
    if not client:
        return jsonify({"error": "API anahtarı bağlı değil"}), 400

    symbol = request.args.get("symbol", "BTCUSDT").strip().upper()
    limit = min(int(request.args.get("limit", 50)), 100)

    result = client.get_my_trades(symbol, limit)
    if not result["ok"]:
        return jsonify({"error": result.get("error", "İşlem geçmişi alınamadı")}), 400

    return jsonify({"trades": result["data"]})


# ═══════════════════════════════════════
#  FUTURES — BAKİYE & POZİSYONLAR
# ═══════════════════════════════════════

@trading_bp.route("/futures/balance", methods=["GET"])
@require_auth
def futures_balance():
    """Futures bakiyelerini döndür."""
    client = _get_futures_client()
    if not client:
        return jsonify({"error": "API anahtarı bağlı değil"}), 400

    result = client.get_balance()
    if not result["ok"]:
        return jsonify({"error": result.get("error", "Futures bakiye alınamadı")}), 400

    # Sadece bakiyesi > 0 olanları filtrele
    balances = []
    for b in result["data"]:
        bal = float(b.get("balance", 0))
        avail = float(b.get("availableBalance", 0))
        if bal > 0 or avail > 0:
            balances.append({
                "asset": b["asset"],
                "balance": bal,
                "availableBalance": avail,
                "crossUnPnl": float(b.get("crossUnPnl", 0)),
            })
    return jsonify({"balances": balances})


@trading_bp.route("/futures/positions", methods=["GET"])
@require_auth
def futures_positions():
    """Açık futures pozisyonlarını döndür."""
    client = _get_futures_client()
    if not client:
        return jsonify({"error": "API anahtarı bağlı değil"}), 400

    result = client.get_positions()
    if not result["ok"]:
        return jsonify({"error": result.get("error", "Pozisyonlar alınamadı")}), 400

    return jsonify({"positions": result["data"]})


@trading_bp.route("/futures/account", methods=["GET"])
@require_auth
def futures_account():
    """Futures hesap özeti."""
    client = _get_futures_client()
    if not client:
        return jsonify({"error": "API anahtarı bağlı değil"}), 400

    result = client.get_account()
    if not result["ok"]:
        return jsonify({"error": result.get("error", "Hesap bilgisi alınamadı")}), 400

    data = result["data"]
    return jsonify({
        "totalWalletBalance": float(data.get("totalWalletBalance", 0)),
        "totalUnrealizedProfit": float(data.get("totalUnrealizedProfit", 0)),
        "totalMarginBalance": float(data.get("totalMarginBalance", 0)),
        "availableBalance": float(data.get("availableBalance", 0)),
        "totalPositionInitialMargin": float(data.get("totalPositionInitialMargin", 0)),
    })


# ═══════════════════════════════════════
#  FUTURES — KALDIRAÇ AYARI
# ═══════════════════════════════════════

@trading_bp.route("/futures/leverage", methods=["POST"])
@require_auth
def set_leverage():
    """Kaldıraç oranını ayarla."""
    client = _get_futures_client()
    if not client:
        return jsonify({"error": "API anahtarı bağlı değil"}), 400

    d = request.get_json() or {}
    symbol = (d.get("symbol") or "").strip().upper()
    leverage = d.get("leverage", 10)

    if not symbol:
        return jsonify({"error": "Symbol zorunludur"}), 400

    result = client.set_leverage(symbol, int(leverage))
    if not result["ok"]:
        return jsonify({"error": result.get("error", "Kaldıraç ayarlanamadı")}), 400

    return jsonify({"message": f"{symbol} kaldıracı {leverage}x olarak ayarlandı", "data": result["data"]})


@trading_bp.route("/futures/margin-type", methods=["POST"])
@require_auth
def set_margin_type():
    """Margin tipini ayarla (CROSSED/ISOLATED)."""
    client = _get_futures_client()
    if not client:
        return jsonify({"error": "API anahtarı bağlı değil"}), 400

    d = request.get_json() or {}
    symbol = (d.get("symbol") or "").strip().upper()
    margin_type = (d.get("marginType") or "CROSSED").strip().upper()

    if not symbol:
        return jsonify({"error": "Symbol zorunludur"}), 400

    result = client.set_margin_type(symbol, margin_type)
    if not result["ok"]:
        # -4046 = margin type already set — no change needed
        if result.get("code") == -4046:
            return jsonify({"message": f"Margin tipi zaten {margin_type}"})
        return jsonify({"error": result.get("error", "Margin tipi ayarlanamadı")}), 400

    return jsonify({"message": f"{symbol} margin tipi {margin_type} olarak ayarlandı"})


# ═══════════════════════════════════════
#  FUTURES — EMİR İŞLEMLERİ
# ═══════════════════════════════════════

@trading_bp.route("/futures/order", methods=["POST"])
@require_auth
def futures_order():
    """Futures emri gönder (LONG / SHORT)."""
    client = _get_futures_client()
    if not client:
        return jsonify({"error": "API anahtarı bağlı değil"}), 400

    d = request.get_json() or {}
    symbol = (d.get("symbol") or "").strip().upper()
    side = (d.get("side") or "").strip().upper()
    order_type = (d.get("type") or "MARKET").strip().upper()
    quantity = d.get("quantity")
    price = d.get("price")
    reduce_only = d.get("reduceOnly", False)

    if not symbol or not side:
        return jsonify({"error": "Symbol ve side zorunludur"}), 400
    if side not in ("BUY", "SELL"):
        return jsonify({"error": "Side BUY veya SELL olmalı"}), 400
    if not quantity:
        return jsonify({"error": "Miktar zorunludur"}), 400

    quantity = float(quantity)
    if price:
        price = float(price)

    result = client.place_order(
        symbol=symbol, side=side, order_type=order_type,
        quantity=quantity, price=price,
        time_in_force=d.get("timeInForce"),
        reduce_only=reduce_only
    )

    if not result["ok"]:
        return jsonify({"error": result.get("error", "Futures emri gönderilemedi")}), 400

    # Bildirim
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    order_data = result["data"]
    direction = "LONG" if side == "BUY" else "SHORT"
    msg = f"Futures {direction} {symbol} — {order_type} #{order_data.get('orderId', '?')}"
    db.execute("INSERT INTO notifications(user_id,type,title,message,created_at) VALUES(?,?,?,?,?)",
               (g.user_id, "futures", "Futures Emir", msg, now))
    db.commit()

    return jsonify({"message": "Futures emri gönderildi", "order": order_data})


@trading_bp.route("/futures/order", methods=["DELETE"])
@require_auth
def futures_cancel_order():
    """Futures emrini iptal et."""
    client = _get_futures_client()
    if not client:
        return jsonify({"error": "API anahtarı bağlı değil"}), 400

    d = request.get_json() or {}
    symbol = (d.get("symbol") or "").strip().upper()
    order_id = d.get("orderId")

    if not symbol or not order_id:
        return jsonify({"error": "Symbol ve orderId zorunludur"}), 400

    result = client.cancel_order(symbol, int(order_id))
    if not result["ok"]:
        return jsonify({"error": result.get("error", "Emir iptal edilemedi")}), 400

    return jsonify({"message": "Futures emri iptal edildi", "order": result["data"]})


@trading_bp.route("/futures/close-position", methods=["POST"])
@require_auth
def close_position():
    """Açık pozisyonu kapat (market emriyle)."""
    client = _get_futures_client()
    if not client:
        return jsonify({"error": "API anahtarı bağlı değil"}), 400

    d = request.get_json() or {}
    symbol = (d.get("symbol") or "").strip().upper()

    if not symbol:
        return jsonify({"error": "Symbol zorunludur"}), 400

    # Mevcut pozisyonu bul
    pos_result = client.get_positions()
    if not pos_result["ok"]:
        return jsonify({"error": "Pozisyon bilgisi alınamadı"}), 400

    pos = None
    for p in pos_result["data"]:
        if p["symbol"] == symbol:
            pos = p
            break

    if not pos:
        return jsonify({"error": f"{symbol} için açık pozisyon bulunamadı"}), 400

    # Pozisyonu kapat: LONG ise SELL, SHORT ise BUY
    close_side = "SELL" if pos["side"] == "LONG" else "BUY"
    result = client.place_order(symbol, close_side, "MARKET",
                                quantity=pos["positionAmt"], reduce_only=True)

    if not result["ok"]:
        return jsonify({"error": result.get("error", "Pozisyon kapatılamadı")}), 400

    return jsonify({"message": f"{symbol} pozisyonu kapatıldı", "order": result["data"]})


# ═══════════════════════════════════════
#  FUTURES — GEÇMİŞ
# ═══════════════════════════════════════

@trading_bp.route("/futures/orders/open", methods=["GET"])
@require_auth
def futures_open_orders():
    """Futures açık emirler."""
    client = _get_futures_client()
    if not client:
        return jsonify({"error": "API anahtarı bağlı değil"}), 400

    symbol = request.args.get("symbol", "").strip().upper() or None
    result = client.get_open_orders(symbol)
    if not result["ok"]:
        return jsonify({"error": result.get("error", "Açık emirler alınamadı")}), 400

    return jsonify({"orders": result["data"]})


@trading_bp.route("/futures/trades", methods=["GET"])
@require_auth
def futures_trades():
    """Futures işlem geçmişi."""
    client = _get_futures_client()
    if not client:
        return jsonify({"error": "API anahtarı bağlı değil"}), 400

    symbol = request.args.get("symbol", "BTCUSDT").strip().upper()
    limit = min(int(request.args.get("limit", 50)), 100)

    result = client.get_my_trades(symbol, limit)
    if not result["ok"]:
        return jsonify({"error": result.get("error", "İşlem geçmişi alınamadı")}), 400

    return jsonify({"trades": result["data"]})
