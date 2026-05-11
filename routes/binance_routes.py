"""
Binance Demo Futures Trading Routes
Demo API: https://demo-fapi.binance.com
"""
import hmac
import hashlib
import time
import requests
import re
from flask import Blueprint, request, jsonify, g
from core.security import require_auth
from core.database import get_db
from datetime import datetime

binance_bp = Blueprint("binance", __name__)

# Binance Testnet Futures API
TESTNET_BASE = "https://demo-fapi.binance.com"
BINANCE_KEY_RE = re.compile(r"^[A-Za-z0-9]{64}$")


def validate_binance_credentials(api_key: str, api_secret: str):
    if not BINANCE_KEY_RE.fullmatch(api_key or ""):
        return "API key formati gecersiz. Binance demo/testnet API key 64 karakter alfanumerik olmalidir."
    if not BINANCE_KEY_RE.fullmatch(api_secret or ""):
        return "API secret formati gecersiz. Binance demo/testnet API secret 64 karakter alfanumerik olmalidir."
    return None


def _reduce_only_bool(v):
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        return v.lower() in ("true", "1")
    return bool(v)


def get_user_api_keys(user_id: int):
    """Kullanıcının aktif API anahtarlarını getir (multi-API support)"""
    from core.security import decrypt_api_key
    
    # Önce yeni tablodan aktif API'yi dene
    db = get_db()
    row = db.execute(
        """SELECT api_key_enc, api_secret_enc 
           FROM user_api_keys 
           WHERE user_id=? AND is_active=1
           LIMIT 1""",
        (user_id,)
    ).fetchone()
    
    if row:
        try:
            api_key = decrypt_api_key(row['api_key_enc'])
            api_secret = decrypt_api_key(row['api_secret_enc'])
            return api_key, api_secret
        except Exception:
            pass
    
    # Eski tablodan dene (backward compatibility)
    config = db.execute(
        "SELECT api_key, api_secret, label FROM bot_configs WHERE user_id=?",
        (user_id,)
    ).fetchone()
    
    if config and config["api_key"] and config["api_secret"]:
        return config["api_key"], config["api_secret"]
    
    # Veritabanında yoksa .env'den oku (fallback)
    return None, None


def save_active_api_key(user_id: int, api_key: str, api_secret: str, label: str, is_valid: int = 1):
    """API anahtarini sifreli tabloda aktif kayit olarak sakla."""
    from core.security import encrypt_api_key

    db = get_db()
    now = datetime.now().isoformat()
    label = (label or "API Anahtari").strip()
    api_key_enc = encrypt_api_key(api_key)
    api_secret_enc = encrypt_api_key(api_secret)

    db.execute("UPDATE user_api_keys SET is_active=0 WHERE user_id=?", (user_id,))
    db.execute(
        """INSERT INTO user_api_keys
           (user_id, api_key_enc, api_secret_enc, label, is_testnet, is_active, is_valid, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?)""",
        (user_id, api_key_enc, api_secret_enc, label, is_valid, now, now)
    )

    existing = db.execute("SELECT id FROM bot_configs WHERE user_id=?", (user_id,)).fetchone()
    if existing:
        db.execute(
            """UPDATE bot_configs
               SET api_key=NULL, api_secret=NULL, api_key_hint=?, label=?, is_active=1, updated_at=?
               WHERE user_id=?""",
            (api_key[:8] + "...", label, now, user_id)
        )
    else:
        db.execute(
            """INSERT INTO bot_configs
               (user_id, api_key, api_secret, api_key_hint, label, is_active, updated_at)
               VALUES (?, NULL, NULL, ?, ?, 1, ?)""",
            (user_id, api_key[:8] + "...", label, now)
        )
    db.commit()

def create_signature(query_string: str, secret: str) -> str:
    """HMAC SHA256 signature oluştur"""
    return hmac.new(
        secret.encode('utf-8'),
        query_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

def binance_request(endpoint: str, api_key: str, api_secret: str, params: dict = None, method: str = "GET"):
    """Binance API'ye signed request gönder"""
    credential_error = validate_binance_credentials(api_key, api_secret)
    if credential_error:
        return None, credential_error

    if params is None:
        params = {}
    
    # Timestamp ve recvWindow ekle
    params['timestamp'] = int(time.time() * 1000)
    params['recvWindow'] = 60000
    
    # Query string oluştur
    query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
    
    # Signature oluştur
    signature = create_signature(query_string, api_secret)
    query_string += f"&signature={signature}"
    
    # Request gönder
    url = f"{TESTNET_BASE}{endpoint}?{query_string}"
    headers = {'X-MBX-APIKEY': api_key}
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=5)  # 10'dan 5'e düşürdük
        elif method == "POST":
            response = requests.post(url, headers=headers, timeout=5)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=5)
        else:
            return None, "Invalid method"
        
        if response.status_code == 200:
            return response.json(), None
        else:
            return None, response.json().get('msg', 'Unknown error')
    
    except Exception as e:
        return None, str(e)

# ═══════════════════════════════════════════════════════════════
# API KEY MANAGEMENT
# ═══════════════════════════════════════════════════════════════

@binance_bp.route("/api-keys", methods=["POST"])
@require_auth
def save_api_keys():
    """API anahtarlarını kaydet"""
    data = request.get_json() or {}
    api_key = data.get("api_key", "").strip()
    api_secret = data.get("api_secret", "").strip()
    label = data.get("label", "API Anahtarı").strip()
    
    if not api_key or not api_secret:
        return jsonify({"error": "API key ve secret gerekli"}), 400

    credential_error = validate_binance_credentials(api_key, api_secret)
    if credential_error:
        return jsonify({"error": credential_error}), 400
    
    # Debug: API key uzunluğunu kontrol et
    
    # Önce Futures API'yi test et
    test_data, error = binance_request("/fapi/v2/account", api_key, api_secret)
    
    # Futures başarısız olursa Spot API'yi dene
    if error:
        print(f"Futures API error: {error}")
        # Spot API için farklı base URL kullan
        import hmac
        import hashlib
        import time
        import requests
        
        params = {'timestamp': int(time.time() * 1000), 'recvWindow': 60000}
        query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        signature = hmac.new(
            api_secret.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        query_string += f"&signature={signature}"
        
        spot_url = f"https://demo-api.binance.com/api/v3/account?{query_string}"
        headers = {'X-MBX-APIKEY': api_key}
        
        print(f"Trying Spot API: {spot_url[:80]}...")
        
        try:
            spot_response = requests.get(spot_url, headers=headers, timeout=10)
            print(f"Spot API status: {spot_response.status_code}")
            
            if spot_response.status_code == 200:
                # Spot API başarılı
                test_data = spot_response.json()
                error = None
                print("Spot API successful!")
            else:
                error_msg = spot_response.json().get('msg', 'Unknown')
                print(f"Spot API error: {error_msg}")
                return jsonify({"error": f"API anahtarları geçersiz. Spot hatası: {error_msg}"}), 400
        except Exception as e:
            print(f"Spot API exception: {str(e)}")
            return jsonify({"error": f"API bağlantı hatası: {str(e)}"}), 400
    else:
        print("Futures API successful!")
    
    save_active_api_key(g.user_id, api_key, api_secret, label, is_valid=1)
    
    return jsonify({
        "message": "API anahtarları kaydedildi",
        "hint": api_key[:8] + "..."
    })

@binance_bp.route("/api-keys/delete", methods=["DELETE"])
@require_auth
def delete_api_keys():
    """API anahtarlarını sil"""
    db = get_db()
    
    # API anahtarlarını sil
    db.execute("DELETE FROM user_api_keys WHERE user_id=?", (g.user_id,))
    db.execute(
        "UPDATE bot_configs SET api_key=NULL, api_secret=NULL, api_key_hint=NULL, label=NULL, updated_at=? WHERE user_id=?",
        (datetime.now().isoformat(), g.user_id)
    )
    db.commit()
    
    return jsonify({"message": "API anahtarları silindi"})

@binance_bp.route("/api-keys/toggle", methods=["POST"])
@require_auth
def toggle_api_status():
    """API anahtarını aktif/pasif yap"""
    db = get_db()
    
    # Mevcut durumu kontrol et
    config = db.execute(
        "SELECT is_active FROM bot_configs WHERE user_id=?",
        (g.user_id,)
    ).fetchone()
    
    if not config:
        return jsonify({"error": "API bulunamadı"}), 404
    
    # Durumu tersine çevir
    new_status = 0 if config['is_active'] else 1
    
    db.execute(
        "UPDATE user_api_keys SET is_active=? WHERE user_id=?",
        (new_status, g.user_id)
    )
    db.execute(
        "UPDATE bot_configs SET is_active=?, updated_at=? WHERE user_id=?",
        (new_status, datetime.now().isoformat(), g.user_id)
    )
    db.commit()
    
    return jsonify({
        "message": "API durumu değiştirildi",
        "is_active": new_status
    })

# ═══════════════════════════════════════════════════════════════
# MULTI-API SUPPORT
# ═══════════════════════════════════════════════════════════════

@binance_bp.route("/api-keys/test", methods=["GET"])
@require_auth
def test_endpoint():
    """Test endpoint"""
    return jsonify({"message": "Endpoint çalışıyor", "user_id": g.user_id})

@binance_bp.route("/api-keys/add", methods=["POST"])
@require_auth
def add_api_key():
    """Yeni API anahtarı ekle"""
    try:
        data = request.get_json() or {}
        api_key = data.get("api_key", "").strip()
        api_secret = data.get("api_secret", "").strip()
        label = data.get("label", "API Anahtarı")
        
        if not api_key or not api_secret:
            return jsonify({"error": "API key ve secret gerekli"}), 400

        credential_error = validate_binance_credentials(api_key, api_secret)
        if credential_error:
            return jsonify({"error": credential_error}), 400
        
        # Test API
        test_data, error = binance_request("/fapi/v2/account", api_key, api_secret)
        
        if error:
            return jsonify({"error": f"API anahtarları geçersiz: {error}"}), 400

        save_active_api_key(g.user_id, api_key, api_secret, label, is_valid=1)
        
        return jsonify({
            "message": "API anahtarı eklendi",
            "hint": api_key[:8] + "..."
        })
        
    except Exception as e:
        print(f"[ADD_API] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500

@binance_bp.route("/api-keys/list", methods=["GET"])
@require_auth
def list_api_keys():
    """Kullanıcının tüm API anahtarlarını listele"""
    db = get_db()
    
    rows = db.execute(
        """SELECT id, label, is_active, is_valid, created_at, updated_at
           FROM user_api_keys 
           WHERE user_id=?
           ORDER BY is_active DESC, created_at DESC""",
        (g.user_id,)
    ).fetchall()
    
    # Get hints for each API
    apis = []
    for row in rows:
        from core.security import decrypt_api_key
        
        # Get encrypted key
        key_row = db.execute(
            "SELECT api_key_enc FROM user_api_keys WHERE id=?",
            (row['id'],)
        ).fetchone()
        
        if key_row:
            try:
                api_key = decrypt_api_key(key_row['api_key_enc'])
                hint = api_key[:8] + "..." if len(api_key) > 8 else "***"
            except:
                hint = "***"
        else:
            hint = "***"
        
        apis.append({
            "id": row['id'],
            "label": row['label'],
            "hint": hint,
            "is_active": bool(row['is_active']),
            "is_valid": bool(row['is_valid']),
            "created_at": row['created_at'],
            "updated_at": row['updated_at']
        })
    
    return jsonify({"apis": apis})

@binance_bp.route("/api-keys/set-active", methods=["POST"])
@require_auth
def set_active_api():
    """Aktif API'yi değiştir"""
    data = request.get_json() or {}
    api_id = data.get("api_id")
    
    if not api_id:
        return jsonify({"error": "API ID gerekli"}), 400
    
    db = get_db()
    
    # Verify ownership
    row = db.execute(
        "SELECT id FROM user_api_keys WHERE id=? AND user_id=?",
        (api_id, g.user_id)
    ).fetchone()
    
    if not row:
        return jsonify({"error": "API bulunamadı"}), 404
    
    # Tüm API'leri pasif yap
    db.execute(
        "UPDATE user_api_keys SET is_active=0 WHERE user_id=?",
        (g.user_id,)
    )
    
    # Seçili API'yi aktif yap
    db.execute(
        "UPDATE user_api_keys SET is_active=1, updated_at=? WHERE id=?",
        (datetime.now().isoformat(), api_id)
    )
    db.commit()
    
    return jsonify({"message": "Aktif API değiştirildi"})

@binance_bp.route("/api-keys/<int:api_id>", methods=["DELETE"])
@require_auth
def delete_api_key_by_id(api_id):
    """Belirli bir API anahtarını sil"""
    db = get_db()
    
    # Verify ownership
    row = db.execute(
        "SELECT id, is_active FROM user_api_keys WHERE id=? AND user_id=?",
        (api_id, g.user_id)
    ).fetchone()
    
    if not row:
        return jsonify({"error": "API bulunamadı"}), 404
    
    # Sil
    db.execute("DELETE FROM user_api_keys WHERE id=?", (api_id,))
    
    # Eğer aktif API silindiyse, başka bir API'yi aktif yap
    if row['is_active']:
        first_api = db.execute(
            "SELECT id FROM user_api_keys WHERE user_id=? ORDER BY created_at DESC LIMIT 1",
            (g.user_id,)
        ).fetchone()
        
        if first_api:
            db.execute(
                "UPDATE user_api_keys SET is_active=1 WHERE id=?",
                (first_api['id'],)
            )
    
    db.commit()
    
    return jsonify({"message": "API anahtarı silindi"})

@binance_bp.route("/api-keys", methods=["GET"])
@require_auth
def get_api_keys_status():
    """Aktif API anahtarı durumunu kontrol et"""
    api_key, api_secret = get_user_api_keys(g.user_id)
    
    if not api_key:
        return jsonify({"configured": False})
    
    # Get label and is_active from bot_configs
    db = get_db()
    config = db.execute(
        "SELECT label, is_active FROM bot_configs WHERE user_id=?",
        (g.user_id,)
    ).fetchone()
    
    label = config['label'] if config and config['label'] else 'API Anahtarı'
    is_active = config['is_active'] if config else 0
    
    # Test API
    test_data, error = binance_request("/fapi/v2/account", api_key, api_secret)
    
    return jsonify({
        "configured": True,
        "valid": error is None,
        "hint": api_key[:8] + "...",
        "label": label,
        "is_active": is_active,
        "error": error,
        "type": "futures" if error is None else "unknown"
    })

# ═══════════════════════════════════════════════════════════════
# ACCOUNT & BALANCE
# ═══════════════════════════════════════════════════════════════

@binance_bp.route("/account", methods=["GET"])
@require_auth
def get_account():
    """Hesap bilgilerini getir - Margin Ratio dahil"""
    api_key, api_secret = get_user_api_keys(g.user_id)
    
    
    if not api_key:
        print("[ACCOUNT] No API key found, returning demo data")
        # Demo data döndür (API yoksa)
        return jsonify({
            "totalWalletBalance": 10000.00,
            "totalUnrealizedProfit": 0,
            "totalMarginBalance": 10000.00,
            "totalMaintMargin": 0,
            "marginRatio": 0.0,
            "availableBalance": 10000.00,
            "maxWithdrawAmount": 10000.00,
            "assets": [
                {
                    "asset": "USDT",
                    "walletBalance": 10000.00,
                    "unrealizedProfit": 0,
                    "marginBalance": 10000.00,
                    "availableBalance": 10000.00
                }
            ],
            "_demo": True
        })
    
    # Futures API
    data, error = binance_request("/fapi/v2/account", api_key, api_secret)
    
    if error:
        print(f"[ACCOUNT] Futures API error: {error}")
        return jsonify({"error": error}), 400
    
    print("[ACCOUNT] Futures API success")
    
    # Margin ratio hesapla
    total_maint_margin = float(data.get("totalMaintMargin", 0))
    total_margin_balance = float(data.get("totalMarginBalance", 0))
    
    # Margin Ratio = (Maintenance Margin / Margin Balance) * 100
    # Eğer margin balance 0 ise, margin ratio 0
    margin_ratio = 0.0
    if total_margin_balance > 0 and total_maint_margin > 0:
        margin_ratio = (total_maint_margin / total_margin_balance) * 100
    
    # Futures verilerini döndür
    return jsonify({
        "totalWalletBalance": float(data.get("totalWalletBalance", 0)),
        "totalUnrealizedProfit": float(data.get("totalUnrealizedProfit", 0)),
        "totalMarginBalance": total_margin_balance,
        "totalMaintMargin": total_maint_margin,
        "marginRatio": round(margin_ratio, 2),
        "availableBalance": float(data.get("availableBalance", 0)),
        "maxWithdrawAmount": float(data.get("maxWithdrawAmount", 0)),
        "assets": [
            {
                "asset": a["asset"],
                "walletBalance": float(a["walletBalance"]),
                "unrealizedProfit": float(a["unrealizedProfit"]),
                "marginBalance": float(a["marginBalance"]),
                "availableBalance": float(a["availableBalance"])
            }
            for a in data.get("assets", [])
            if float(a["walletBalance"]) > 0
        ]
    })

@binance_bp.route("/balance", methods=["GET"])
@require_auth
def get_balance():
    """Basit bakiye bilgisi"""
    api_key, api_secret = get_user_api_keys(g.user_id)
    
    if not api_key:
        return jsonify({"error": "API anahtarları yapılandırılmamış"}), 400
    
    data, error = binance_request("/fapi/v2/balance", api_key, api_secret)
    
    if error:
        return jsonify({"error": error}), 400
    
    # Sadece USDT bakiyesi
    usdt_balance = next((b for b in data if b["asset"] == "USDT"), None)
    
    if usdt_balance:
        return jsonify({
            "asset": "USDT",
            "balance": float(usdt_balance["balance"]),
            "availableBalance": float(usdt_balance["availableBalance"]),
            "crossWalletBalance": float(usdt_balance.get("crossWalletBalance", 0)),
            "crossUnPnl": float(usdt_balance.get("crossUnPnl", 0))
        })
    
    return jsonify({"asset": "USDT", "balance": 0, "availableBalance": 0})


@binance_bp.route("/balances", methods=["GET"])
@require_auth
def get_futures_balances_list():
    """Tüm varlık bakiyeleri — GET /fapi/v2/balance"""
    api_key, api_secret = get_user_api_keys(g.user_id)
    if not api_key:
        return jsonify({"balances": [], "count": 0, "_demo": True})
    data, error = binance_request("/fapi/v2/balance", api_key, api_secret)
    if error:
        return jsonify({"error": error}), 400
    balances = []
    for b in data:
        wb = float(b.get("balance", 0))
        ab = float(b.get("availableBalance", 0))
        if abs(wb) < 1e-12 and abs(ab) < 1e-12:
            continue
        balances.append({
            "asset": b["asset"],
            "balance": wb,
            "availableBalance": ab,
            "crossWalletBalance": float(b.get("crossWalletBalance", 0)),
            "crossUnPnl": float(b.get("crossUnPnl", 0)),
        })
    balances.sort(key=lambda x: x["balance"], reverse=True)
    return jsonify({"balances": balances, "count": len(balances)})


# ═══════════════════════════════════════════════════════════════
# POSITIONS
# ═══════════════════════════════════════════════════════════════

@binance_bp.route("/positions", methods=["GET"])
@require_auth
def get_positions():
    """Açık pozisyonları getir - Margin Ratio dahil"""
    api_key, api_secret = get_user_api_keys(g.user_id)
    
    if not api_key:
        return jsonify({"positions": [], "count": 0, "_demo": True})
    
    # Account endpoint'ini kullan (daha detaylı bilgi için)
    account_data, account_error = binance_request("/fapi/v2/account", api_key, api_secret)
    
    if account_error:
        print(f"[POSITIONS] Account API error: {account_error}")
        return jsonify({"positions": [], "count": 0, "_error": account_error})
    
    wallet_balance = float(account_data.get("totalWalletBalance", 0))
    positions_from_account = account_data.get("positions", [])
    
    # TOPLAM UNREALIZED PNL'i hesapla (Cross margin için)
    total_unrealized_pnl = sum(float(p.get("unrealizedProfit", 0)) for p in positions_from_account)
    
    # Margin Balance = Wallet Balance + Toplam Unrealized PNL
    total_margin_balance = wallet_balance + total_unrealized_pnl
    
    print(f"[MARGIN BALANCE] Wallet: {wallet_balance:.2f}, Total PNL: {total_unrealized_pnl:.2f}, Margin Balance: {total_margin_balance:.2f}")
    
    # Last prices ve Mark prices'ı 24hr ticker'dan çek
    import requests
    try:
        # Demo Futures API kullan
        ticker_res = requests.get("https://demo-fapi.binance.com/fapi/v1/ticker/24hr", timeout=3)
        ticker_data = ticker_res.json() if ticker_res.ok else []
        last_prices = {item["symbol"]: float(item["lastPrice"]) for item in ticker_data}
        
        # Premium index'ten mark price al
        premium_res = requests.get("https://demo-fapi.binance.com/fapi/v1/premiumIndex", timeout=3)
        premium_data = premium_res.json() if premium_res.ok else []
        mark_prices = {item["symbol"]: float(item["markPrice"]) for item in premium_data}
        
        print(f"[PRICES] Fetched {len(last_prices)} last prices, {len(mark_prices)} mark prices")
    except Exception as e:
        print(f"[ERROR] Failed to fetch prices: {e}")
        last_prices = {}
        mark_prices = {}
    
    # positionRisk endpoint'inden ek bilgiler al (liq price için)
    risk_data, risk_error = binance_request("/fapi/v2/positionRisk", api_key, api_secret)
    risk_map = {}
    if not risk_error:
        risk_map = {p["symbol"]: p for p in risk_data}
    
    # Sadece açık pozisyonları filtrele
    open_positions = []
    for p in positions_from_account:
        pos_amt = float(p.get("positionAmt", 0))
        if pos_amt != 0:
            symbol = p["symbol"]
            entry_price = float(p.get("entryPrice", 0))
            
            # Mark Price - Önce premium index'ten, sonra positionRisk'ten, en son account'tan
            mark_price = mark_prices.get(symbol, 0)
            if mark_price == 0 and symbol in risk_map:
                mark_price = float(risk_map[symbol].get("markPrice", 0))
            if mark_price == 0:
                mark_price = float(p.get("markPrice", 0))
            
            # Liquidation Price - positionRisk'ten al
            liq_price = 0
            if symbol in risk_map:
                liq_price = float(risk_map[symbol].get("liquidationPrice", 0))
            
            # Last price
            last_price = last_prices.get(symbol, mark_price)
            
            # MARGIN RATIO - Cross margin için TOPLAM margin balance kullan
            maint_margin = float(p.get("maintMargin", 0))
            isolated_wallet = float(p.get("isolatedWallet", 0))
            unrealized_profit = float(p.get("unrealizedProfit", 0))
            margin_type = p.get("marginType", "cross")
            
            # Margin Balance hesabı
            if margin_type == "isolated":
                # Isolated: Sadece bu pozisyonun margin'i
                margin_balance = isolated_wallet + unrealized_profit
            else:
                # Cross: Toplam wallet balance + tüm pozisyonların PNL'i
                margin_balance = total_margin_balance
            
            # Margin Ratio = (Maint Margin / Margin Balance) × 100
            margin_ratio_calculated = 0
            if margin_balance > 0 and maint_margin > 0:
                margin_ratio_calculated = (maint_margin / margin_balance) * 100
            
            # Initial Margin hesapla (pozisyon için kullanılan margin)
            leverage = int(p.get("leverage", 1))
            if margin_type == "isolated":
                initial_margin = isolated_wallet
            else:
                # Cross: (Position Value) / Leverage
                position_value = abs(pos_amt) * mark_price
                initial_margin = position_value / leverage if leverage > 0 else 0
            
            # ROE = (Unrealized PnL / Initial Margin) * 100
            roe_pct = (unrealized_profit / initial_margin * 100) if initial_margin > 0 else 0
            
            # Debug
            if symbol == "BTCUSDT" or symbol == "ETHUSDT":
                is_long = pos_amt > 0
                side_text = "LONG" if is_long else "SHORT"
                print(f"[DEBUG] {symbol} ({side_text}):")
                print(f"  Position Amount: {pos_amt}")
                print(f"  Entry Price: {entry_price}")
                print(f"  Mark Price: {mark_price}")
                print(f"  Last Price: {last_price}")
                print(f"  Leverage: {leverage}x")
                print(f"  Initial Margin: {initial_margin:.2f} USDT")
                print(f"  Unrealized PNL: {unrealized_profit:.2f}")
                print(f"  Maint Margin: {maint_margin:.2f}")
                print(f"  Margin Balance ({margin_type}): {margin_balance:.2f}")
                print(f"  Margin Ratio: {margin_ratio_calculated:.2f}%")
            
            position = {
                "symbol": symbol,
                "positionAmt": pos_amt,
                "entryPrice": entry_price,
                "markPrice": mark_price,
                "lastPrice": last_price,
                "liquidationPrice": liq_price,
                "leverage": leverage,
                "marginType": margin_type,
                "initialMargin": initial_margin,
                "roe": roe_pct,
                "maintMargin": maint_margin,
                "isolatedMargin": float(p.get("isolatedMargin", 0)),
                "isolatedWallet": isolated_wallet,
                "positionSide": p.get("positionSide", "BOTH"),
                "notional": float(p.get("notional", 0)),
                "unrealizedProfit": float(p.get("unrealizedProfit", 0)),
                "unRealizedProfit": float(p.get("unrealizedProfit", 0)),  # Backward compatibility
                "marginRatio": margin_ratio_calculated / 100,  # Decimal olarak gönder (0.0427)
                "walletBalance": wallet_balance,
            }
            
            open_positions.append(position)
    
    return jsonify({"positions": open_positions, "count": len(open_positions), "walletBalance": wallet_balance})

# ═══════════════════════════════════════════════════════════════
# ORDERS
# ═══════════════════════════════════════════════════════════════

@binance_bp.route("/order", methods=["POST"])
@require_auth
def create_order():
    """Yeni emir oluştur"""
    api_key, api_secret = get_user_api_keys(g.user_id)
    
    if not api_key:
        return jsonify({"error": "API anahtarları yapılandırılmamış"}), 400
    
    data = request.get_json() or {}
    
    
    # Gerekli parametreler
    symbol = data.get("symbol", "").upper()
    side = data.get("side", "").upper()  # BUY veya SELL
    order_type = data.get("type", "MARKET").upper()
    quantity = data.get("quantity")
    
    if not all([symbol, side, quantity]):
        return jsonify({"error": "symbol, side ve quantity gerekli"}), 400
    
    # Binance API quantity string format (bilimsel gösterimden kaçın)
    qty = float(quantity)
    qty_str = f"{qty:.8f}".rstrip('0').rstrip('.') or "0"
    
    
    # Order parametreleri
    params = {
        "symbol": symbol,
        "side": side,
        "type": order_type,
        "quantity": qty_str
    }
    
    # LIMIT order için fiyat gerekli
    if order_type == "LIMIT":
        price = data.get("price")
        if not price:
            return jsonify({"error": "LIMIT order için price gerekli"}), 400
        params["price"] = str(float(price))
        params["timeInForce"] = data.get("timeInForce", "GTC")
    elif order_type == "STOP":
        stop_price = data.get("stopPrice")
        price = data.get("price")
        if not stop_price or not price:
            return jsonify({"error": "STOP için stopPrice ve price gerekli"}), 400
        params["stopPrice"] = str(float(stop_price))
        params["price"] = str(float(price))
        params["timeInForce"] = data.get("timeInForce", "GTC")
    
    # Stop loss / Take profit
    if data.get("stopLoss"):
        params["stopPrice"] = data["stopLoss"]
    if data.get("takeProfit"):
        params["takeProfitPrice"] = data["takeProfit"]
    
    # Reduce Only (pozisyon kapatma için)
    if data.get("reduceOnly"):
        params["reduceOnly"] = "true"

    # Hedge (çift yönlü) mod: LONG / SHORT — tek yönlü modda gönderme
    ps = data.get("positionSide")
    if ps:
        ps = str(ps).upper()
        if ps in ("LONG", "SHORT", "BOTH"):
            params["positionSide"] = ps
    
    
    # Order gönder
    result, error = binance_request("/fapi/v1/order", api_key, api_secret, params, method="POST")
    
    if error:
        print(f"[ORDER] Binance API error: {error}")
        return jsonify({"error": error}), 400
    
    
    return jsonify({
        "message": "Emir oluşturuldu",
        "orderId": str(result["orderId"]),
        "symbol": result["symbol"],
        "side": result["side"],
        "type": result["type"],
        "status": result["status"],
        "executedQty": result["executedQty"],
        "price": result.get("price", result.get("avgPrice", 0))
    })

@binance_bp.route("/orders", methods=["GET"])
@require_auth
def get_open_orders():
    """Açık emirleri getir - Sadece Futures"""
    api_key, api_secret = get_user_api_keys(g.user_id)
    
    if not api_key:
        return jsonify({"orders": [], "count": 0, "_demo": True})
    
    symbol = request.args.get("symbol")
    params = {"symbol": symbol} if symbol else {}
    
    # Futures API
    data, error = binance_request("/fapi/v1/openOrders", api_key, api_secret, params)
    
    if error:
        return jsonify({"orders": [], "count": 0, "_error": error})
    
    orders = []
    for o in data:
        sp = o.get("stopPrice")
        try:
            stop_price = float(sp) if sp not in (None, "", 0, "0") else None
        except (TypeError, ValueError):
            stop_price = None
        orders.append({
            "orderId": str(o["orderId"]),
            "symbol": o["symbol"],
            "side": o["side"],
            "positionSide": o.get("positionSide", "BOTH"),
            "type": o["type"],
            "price": float(o["price"] or 0),
            "stopPrice": stop_price,
            "origQty": float(o["origQty"]),
            "executedQty": float(o["executedQty"]),
            "reduceOnly": _reduce_only_bool(o.get("reduceOnly")),
            "status": o["status"],
            "time": o["time"],
        })
    return jsonify({"orders": orders, "count": len(orders)})


@binance_bp.route("/order-history", methods=["GET"])
@require_auth
def get_order_history():
    """Emir geçmişi — Binance GET /fapi/v1/allOrders (sembol zorunlu)"""
    api_key, api_secret = get_user_api_keys(g.user_id)
    if not api_key:
        return jsonify({"orders": [], "count": 0, "_demo": True})
    symbol = request.args.get("symbol")
    if not symbol:
        return jsonify({"error": "symbol gerekli"}), 400
    try:
        limit = int(request.args.get("limit", 50))
    except ValueError:
        limit = 50
    limit = max(1, min(limit, 500))
    params = {"symbol": symbol.upper(), "limit": limit}
    data, error = binance_request("/fapi/v1/allOrders", api_key, api_secret, params)
    if error:
        return jsonify({"orders": [], "count": 0, "_error": str(error)})
    if not data:
        return jsonify({"orders": [], "count": 0})
    orders = []
    for o in data:
        sp = o.get("stopPrice")
        try:
            stop_price = float(sp) if sp not in (None, "", 0, "0") else None
        except (TypeError, ValueError):
            stop_price = None
        orders.append({
            "orderId": str(o["orderId"]),
            "symbol": o["symbol"],
            "side": o["side"],
            "positionSide": o.get("positionSide", "BOTH"),
            "type": o["type"],
            "price": float(o.get("price", 0) or 0),
            "avgPrice": float(o.get("avgPrice", 0) or 0),
            "stopPrice": stop_price,
            "origQty": float(o["origQty"]),
            "executedQty": float(o["executedQty"]),
            "status": o["status"],
            "time": o["time"],
            "reduceOnly": _reduce_only_bool(o.get("reduceOnly")),
        })
    orders.sort(key=lambda x: x["time"], reverse=True)
    return jsonify({"orders": orders, "count": len(orders)})


@binance_bp.route("/dual-side", methods=["GET"])
@require_auth
def get_dual_side_position():
    """Hedge (Position Side) modu açık mı — GET /fapi/v1/positionSide/dual"""
    api_key, api_secret = get_user_api_keys(g.user_id)
    if not api_key:
        return jsonify({"dualSidePosition": False})
    data, error = binance_request("/fapi/v1/positionSide/dual", api_key, api_secret)
    if error:
        return jsonify({"dualSidePosition": False, "_error": str(error)})
    v = data.get("dualSidePosition")
    if isinstance(v, str):
        dual = v.strip().lower() in ("true", "1", "yes")
    else:
        dual = bool(v)
    return jsonify({"dualSidePosition": dual})

@binance_bp.route("/order/<order_id>", methods=["DELETE"])
@require_auth
def cancel_order(order_id):
    """Emri iptal et (orderId büyük tam sayı olabilir — path string)."""
    api_key, api_secret = get_user_api_keys(g.user_id)
    
    if not api_key:
        return jsonify({"error": "API anahtarları yapılandırılmamış"}), 400
    
    symbol = request.args.get("symbol")
    if not symbol:
        return jsonify({"error": "symbol parametresi gerekli"}), 400
    
    params = {"symbol": symbol.upper(), "orderId": order_id}
    
    result, error = binance_request("/fapi/v1/order", api_key, api_secret, params, method="DELETE")
    
    if error:
        return jsonify({"error": error}), 400
    
    return jsonify({"message": "Emir iptal edildi", "orderId": order_id})

@binance_bp.route("/orders/all", methods=["DELETE"])
@require_auth
def cancel_all_orders():
    """Tüm açık emirleri iptal et"""
    api_key, api_secret = get_user_api_keys(g.user_id)
    
    if not api_key:
        return jsonify({"error": "API anahtarları yapılandırılmamış"}), 400
    
    symbol = request.args.get("symbol")
    if not symbol:
        return jsonify({"error": "symbol parametresi gerekli"}), 400
    
    params = {"symbol": symbol.upper()}
    
    result, error = binance_request("/fapi/v1/allOpenOrders", api_key, api_secret, params, method="DELETE")
    
    if error:
        return jsonify({"error": error}), 400
    
    return jsonify({"message": "Tüm emirler iptal edildi", "code": result.get("code", 200)})

# ═══════════════════════════════════════════════════════════════
# LEVERAGE & MARGIN
# ═══════════════════════════════════════════════════════════════

@binance_bp.route("/leverage", methods=["POST"])
@require_auth
def change_leverage():
    """Kaldıraç oranını değiştir"""
    api_key, api_secret = get_user_api_keys(g.user_id)
    
    if not api_key:
        return jsonify({"error": "API anahtarları yapılandırılmamış"}), 400
    
    data = request.get_json() or {}
    symbol = data.get("symbol", "").upper()
    leverage = data.get("leverage")
    
    if not symbol or not leverage:
        return jsonify({"error": "symbol ve leverage gerekli"}), 400
    
    if not (1 <= int(leverage) <= 100):
        return jsonify({"error": "ETHUSDT için kaldıraç 1-100 arasında olmalı"}), 400
    
    params = {"symbol": symbol, "leverage": leverage}
    
    result, error = binance_request("/fapi/v1/leverage", api_key, api_secret, params, method="POST")
    
    if error:
        return jsonify({"error": error}), 400
    
    return jsonify({
        "message": "Kaldıraç güncellendi",
        "symbol": result["symbol"],
        "leverage": result["leverage"]
    })

@binance_bp.route("/leverage-bracket", methods=["GET"])
@require_auth
def get_leverage_bracket():
    """Sembol icin Binance notional/leverage bracket limitlerini getir."""
    api_key, api_secret = get_user_api_keys(g.user_id)

    if not api_key:
        return jsonify({"error": "API anahtarlari yapilandirilmamis"}), 400

    symbol = request.args.get("symbol", "ETHUSDT").upper()
    data, error = binance_request("/fapi/v1/leverageBracket", api_key, api_secret, {"symbol": symbol})

    if error:
        return jsonify({"error": error}), 400

    row = None
    if isinstance(data, list):
        row = next((item for item in data if item.get("symbol") == symbol), data[0] if data else None)
    elif isinstance(data, dict):
        row = data

    return jsonify({
        "symbol": symbol,
        "brackets": (row or {}).get("brackets", [])
    })

@binance_bp.route("/multi-assets-mode", methods=["GET"])
@require_auth
def get_multi_assets_mode():
    """Mevcut Multi-Assets Mode durumunu getir (true=Multi, false=Single)"""
    api_key, api_secret = get_user_api_keys(g.user_id)
    if not api_key:
        return jsonify({"multiAssetsMargin": False, "_demo": True})
    data, error = binance_request("/fapi/v1/multiAssetsMargin", api_key, api_secret)
    if error:
        return jsonify({"multiAssetsMargin": False, "_error": str(error)})
    multi = data.get("multiAssetsMargin")
    if isinstance(multi, str):
        multi = multi.strip().lower() in ("true", "1", "yes")
    else:
        multi = bool(multi)
    return jsonify({"multiAssetsMargin": multi})


@binance_bp.route("/multi-assets-mode", methods=["POST"])
@require_auth
def set_multi_assets_mode():
    """Multi-Assets Mode'u değiştir (true=Multi-Asset, false=Single-Asset)"""
    api_key, api_secret = get_user_api_keys(g.user_id)
    if not api_key:
        return jsonify({"error": "API anahtarları yapılandırılmamış"}), 400
    data = request.get_json() or {}
    enable = data.get("multiAssetsMargin", data.get("enable", False))
    if isinstance(enable, str):
        enable = enable.strip().lower() in ("true", "1", "yes")
    params = {"multiAssetsMargin": "true" if enable else "false"}
    result, error = binance_request("/fapi/v1/multiAssetsMargin", api_key, api_secret, params, method="POST")
    if error:
        return jsonify({"error": error}), 400
    return jsonify({"message": "Multi-Assets Mode güncellendi", "multiAssetsMargin": enable})


@binance_bp.route("/margin-type", methods=["POST"])
@require_auth
def change_margin_type():
    """Margin tipini değiştir (ISOLATED/CROSSED)"""
    api_key, api_secret = get_user_api_keys(g.user_id)
    
    if not api_key:
        return jsonify({"error": "API anahtarları yapılandırılmamış"}), 400
    
    data = request.get_json() or {}
    symbol = data.get("symbol", "").upper()
    margin_type = data.get("marginType", "").upper()
    
    if not symbol or margin_type not in ["ISOLATED", "CROSSED"]:
        return jsonify({"error": "symbol ve marginType (ISOLATED/CROSSED) gerekli"}), 400
    
    params = {"symbol": symbol, "marginType": margin_type}
    
    result, error = binance_request("/fapi/v1/marginType", api_key, api_secret, params, method="POST")
    
    if error:
        return jsonify({"error": error}), 400
    
    return jsonify({"message": f"Margin tipi {margin_type} olarak güncellendi"})

# ═══════════════════════════════════════════════════════════════
# TRADE HISTORY
# ═══════════════════════════════════════════════════════════════

@binance_bp.route("/trades", methods=["GET"])
@require_auth
def get_trades():
    """İşlem geçmişi - Sadece Futures"""
    api_key, api_secret = get_user_api_keys(g.user_id)
    
    if not api_key:
        return jsonify({"trades": [], "count": 0, "_demo": True})
    
    symbol = request.args.get("symbol")
    limit = request.args.get("limit", 50)
    
    if not symbol:
        return jsonify({"trades": [], "count": 0})
    
    params = {"symbol": symbol.upper(), "limit": limit}
    
    # Futures API
    data, error = binance_request("/fapi/v1/userTrades", api_key, api_secret, params)
    
    if error:
        return jsonify({"trades": [], "count": 0, "_error": error})
    
    # BTC fiyatını al (komisyon çevrimi için)
    btc_price = 0
    if any(t.get("commissionAsset") == "BTC" for t in data):
        ticker_data, _ = binance_request("/fapi/v1/ticker/price", api_key, api_secret, {"symbol": "BTCUSDT"})
        if ticker_data:
            btc_price = float(ticker_data.get("price", 0))
    
    trades = []
    for t in data:
        commission = float(t["commission"])
        commission_asset = t["commissionAsset"]
        
        # Komisyonu USDT'ye çevir
        if commission_asset == "BTC" and btc_price > 0:
            commission_usdt = commission * btc_price
        elif commission_asset == "USDT":
            commission_usdt = commission
        else:
            # Diğer coinler için (ETH, BNB vs.) - şimdilik olduğu gibi bırak
            commission_usdt = commission
        
        trades.append({
            "id": t["id"],
            "orderId": t["orderId"],
            "symbol": t["symbol"],
            "side": t["side"],
            "positionSide": t.get("positionSide", "BOTH"),
            "price": float(t["price"]),
            "qty": float(t["qty"]),
            "realizedPnl": float(t["realizedPnl"]),
            "commission": commission_usdt,
            "commissionAsset": "USDT",  # Her zaman USDT olarak göster
            "originalCommission": commission,
            "originalCommissionAsset": commission_asset,
            "time": t["time"],
            "buyer": t["buyer"],
            "maker": t["maker"]
        })
    
    return jsonify({"trades": trades, "count": len(trades)})

@binance_bp.route("/income", methods=["GET"])
@require_auth
def get_income_history():
    """Gelir geçmişi (PNL, komisyon, funding vb.)"""
    api_key, api_secret = get_user_api_keys(g.user_id)
    
    if not api_key:
        return jsonify({"error": "API anahtarları yapılandırılmamış"}), 400
    
    params = {"limit": request.args.get("limit", 100)}
    
    symbol = request.args.get("symbol")
    if symbol:
        params["symbol"] = symbol.upper()
    
    data, error = binance_request("/fapi/v1/income", api_key, api_secret, params)
    
    if error:
        return jsonify({"error": error}), 400
    
    income = [
        {
            "symbol": i["symbol"],
            "incomeType": i["incomeType"],
            "income": float(i["income"]),
            "asset": i["asset"],
            "time": i["time"],
            "info": i.get("info", "")
        }
        for i in data
    ]
    
    return jsonify({"income": income, "count": len(income)})


@binance_bp.route("/pnl-history", methods=["GET"])
@require_auth
def get_pnl_history():
    """Candlestick PnL geçmişi - Günlük (24h), Haftalık (7d), Toplam (tüm zamanlar)"""
    api_key, api_secret = get_user_api_keys(g.user_id)
    
    if not api_key:
        return jsonify({"error": "API anahtarları yapılandırılmamış"}), 400
    
    # Başlangıç sermayesi (varsayılan 5000 USDT)
    initial_balance = 5000.0
    
    # Tüm income verilerini al
    params = {
        "limit": 1000,
        "incomeType": "REALIZED_PNL"
    }
    
    data, error = binance_request("/fapi/v1/income", api_key, api_secret, params)
    
    if error:
        return jsonify({"error": error}), 400
    
    if not data:
        return jsonify({
            "daily": [],
            "weekly": [],
            "total": [],
            "initialBalance": initial_balance
        })
    
    # Zaman aralıklarını hesapla
    now = int(time.time() * 1000)
    twenty_four_hours_ago = now - (24 * 60 * 60 * 1000)
    seven_days_ago = now - (7 * 24 * 60 * 60 * 1000)
    
    # Günlük: Son 24 saatlik mumlar (her saat bir mum)
    hourly_candles = {}
    for i in range(24):
        hour_start = twenty_four_hours_ago + (i * 60 * 60 * 1000)
        hourly_candles[hour_start] = []
    
    # Haftalık: Son 7 günlük mumlar (her gün bir mum)
    daily_candles = {}
    for i in range(7):
        day_start = seven_days_ago + (i * 24 * 60 * 60 * 1000)
        daily_candles[day_start] = []
    
    # Toplam: Tüm zamanların günlük mumları
    all_time_candles = {}
    
    # Income verilerini gruplara dağıt
    for income in data:
        timestamp = income["time"]
        pnl = float(income["income"])
        
        # Saatlik mumlar (son 24 saat)
        if timestamp >= twenty_four_hours_ago:
            hour_key = twenty_four_hours_ago + ((timestamp - twenty_four_hours_ago) // (60 * 60 * 1000)) * (60 * 60 * 1000)
            if hour_key in hourly_candles:
                hourly_candles[hour_key].append(pnl)
        
        # Günlük mumlar (son 7 gün)
        if timestamp >= seven_days_ago:
            day_key = seven_days_ago + ((timestamp - seven_days_ago) // (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000)
            if day_key in daily_candles:
                daily_candles[day_key].append(pnl)
        
        # Tüm zamanlar (günlük gruplar)
        day_key = timestamp - (timestamp % (24 * 60 * 60 * 1000))
        if day_key not in all_time_candles:
            all_time_candles[day_key] = []
        all_time_candles[day_key].append(pnl)
    
    # Candlestick verilerini oluştur (OHLC - Open, High, Low, Close)
    def create_candlesticks(candles_dict, initial_balance):
        sorted_keys = sorted(candles_dict.keys())
        result = []
        cumulative_balance = initial_balance
        
        for key in sorted_keys:
            pnls = candles_dict[key]
            
            if not pnls:
                # Veri yoksa önceki kapanış değerini kullan
                result.append({
                    "timestamp": key,
                    "open": cumulative_balance,
                    "high": cumulative_balance,
                    "low": cumulative_balance,
                    "close": cumulative_balance
                })
                continue
            
            # Açılış: Periyot başındaki bakiye
            open_val = cumulative_balance
            
            # Her PnL'i sırayla uygula ve min/max bul
            temp_balance = cumulative_balance
            high_val = temp_balance
            low_val = temp_balance
            
            for pnl in pnls:
                temp_balance += pnl
                high_val = max(high_val, temp_balance)
                low_val = min(low_val, temp_balance)
            
            # Kapanış: Periyot sonundaki bakiye
            close_val = temp_balance
            cumulative_balance = close_val
            
            result.append({
                "timestamp": key,
                "open": open_val,
                "high": high_val,
                "low": low_val,
                "close": close_val
            })
        
        return result
    
    return jsonify({
        "daily": create_candlesticks(hourly_candles, initial_balance),
        "weekly": create_candlesticks(daily_candles, initial_balance),
        "total": create_candlesticks(all_time_candles, initial_balance),
        "initialBalance": initial_balance
    })


# ═══════════════════════════════════════════════════════════════
# PUBLIC MARKET DATA (NO AUTH REQUIRED - PROXY FOR CORS)
# ═══════════════════════════════════════════════════════════════

@binance_bp.route("/public/orderbook", methods=["GET"])
def get_public_orderbook():
    """Order book verisi - Public API (CORS bypass)"""
    symbol = request.args.get("symbol", "ETHUSDT").upper()
    limit = request.args.get("limit", "20")
    
    try:
        url = f"https://demo-fapi.binance.com/fapi/v1/depth?symbol={symbol}&limit={limit}"
        response = requests.get(url, timeout=5)
        
        if response.ok:
            return jsonify(response.json())
        else:
            return jsonify({"error": "Failed to fetch order book"}), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@binance_bp.route("/public/trades", methods=["GET"])
def get_public_trades():
    """Market trades - Public API (CORS bypass)"""
    symbol = request.args.get("symbol", "ETHUSDT").upper()
    limit = request.args.get("limit", "50")
    
    try:
        url = f"https://demo-fapi.binance.com/fapi/v1/trades?symbol={symbol}&limit={limit}"
        response = requests.get(url, timeout=5)
        
        if response.ok:
            return jsonify(response.json())
        else:
            return jsonify({"error": "Failed to fetch trades"}), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@binance_bp.route("/public/ticker24h", methods=["GET"])
def get_public_ticker24h():
    """24h ticker statistics - Public API (CORS bypass)"""
    symbol = request.args.get("symbol", "ETHUSDT").upper()
    
    try:
        url = f"https://demo-fapi.binance.com/fapi/v1/ticker/24hr?symbol={symbol}"
        response = requests.get(url, timeout=5)
        
        if response.ok:
            return jsonify(response.json())
        else:
            return jsonify({"error": "Failed to fetch 24h stats"}), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@binance_bp.route("/public/ping", methods=["GET"])
def ping_binance():
    """Test Binance API connectivity"""
    try:
        url = "https://demo-fapi.binance.com/fapi/v1/ping"
        response = requests.get(url, timeout=5)
        
        if response.ok:
            return jsonify({"status": "ok", "message": "Binance API is accessible"})
        else:
            return jsonify({"status": "error", "message": f"HTTP {response.status_code}"}), response.status_code
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
