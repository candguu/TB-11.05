ALLOWED_TB_SYMBOLS = ("SOLUSDT", "ETHUSDT")
DEFAULT_TB_SYMBOL = "SOLUSDT"


def normalize_tb_symbol(value=None, default=DEFAULT_TB_SYMBOL):
    symbol = str(value or default).strip().upper()
    return symbol if symbol in ALLOWED_TB_SYMBOLS else None


def require_tb_symbol(value=None, default=DEFAULT_TB_SYMBOL):
    symbol = normalize_tb_symbol(value, default)
    if not symbol:
        raise ValueError("Sadece SOLUSDT veya ETHUSDT desteklenir.")
    return symbol


def tb_symbol_label(symbol):
    symbol = require_tb_symbol(symbol)
    return "SOL / SOLUSDT" if symbol == "SOLUSDT" else "ETH / ETHUSDT"
