"""
TB Bot Configuration Manager
=============================
Bot ayarlarını yönetir ve varsayılan önerilen profili sağlar.
"""

from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import json
from core.tb_symbols import ALLOWED_TB_SYMBOLS, DEFAULT_TB_SYMBOL

@dataclass
class TBBotConfig:
    """TB Bot konfigürasyon sınıfı"""
    
    # Temel ayarlar
    user_id: int
    symbol: str = DEFAULT_TB_SYMBOL
    trading_mode: str = "demo"  # demo, live
    bot_enabled: bool = False
    
    # Trading parametreleri
    timeframe: str = "15m"
    direction_mode: str = "long_short"  # long_short, long_only, short_only
    leverage: int = 3
    margin_type: str = "ISOLATED"  # ISOLATED, CROSSED
    
    # Sinyal ayarları
    wait_candle_close: bool = True
    prevent_same_signal_reentry: bool = True
    opposite_signal_behavior: str = "close_position"  # close_position, wait, reverse_trade
    
    # Emir ayarları
    order_type: str = "MARKET"  # MARKET, LIMIT
    control_interval_seconds: int = 10
    
    # Filtreler
    trend_filter_enabled: bool = True
    trend_filter_timeframe: str = "1h"
    trend_filter_method: str = "EMA200"
    volatility_filter_mode: str = "normal"  # off, normal, strict
    
    # Emir deneme kuralları
    max_slippage_percent: float = 0.2
    max_order_retries: int = 3
    retry_delay_seconds: int = 2
    cancel_if_price_moves: bool = True
    retry_same_candle: bool = False
    
    # Risk yönetimi
    risk_per_trade_percent: float = 1.0
    max_daily_loss_percent: float = 3.0
    daily_profit_target_percent: float = 4.0
    max_open_positions: int = 1
    max_daily_trades: int = 5
    consecutive_loss_limit: int = 3
    cooldown_minutes: int = 15
    
    # Stop-loss / Take-profit
    stop_loss_type: str = "ATR"  # ATR, FIXED_PERCENT, FIXED_PRICE
    atr_multiplier: float = 1.5
    atr_period: int = 14
    take_profit_type: str = "RISK_REWARD"  # RISK_REWARD, FIXED_PERCENT, FIXED_PRICE
    risk_reward_ratio: float = 2.0
    trailing_stop_enabled: bool = False
    trailing_stop_callback_percent: float = 1.0
    
    # OTT parametreleri
    ott_period: int = 2
    ott_percent: float = 1.4
    ott_ma_type: str = "VAR"
    
    # Metadata
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    def __post_init__(self):
        """Validation ve default değerler"""
        if self.created_at is None:
            self.created_at = datetime.now(timezone.utc).isoformat()
        if self.updated_at is None:
            self.updated_at = datetime.now(timezone.utc).isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Dictionary'ye çevir"""
        return asdict(self)
    
    def to_json(self) -> str:
        """JSON string'e çevir"""
        return json.dumps(self.to_dict(), indent=2)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TBBotConfig':
        """Dictionary'den oluştur"""
        return cls(**data)
    
    @classmethod
    def from_json(cls, json_str: str) -> 'TBBotConfig':
        """JSON string'den oluştur"""
        return cls.from_dict(json.loads(json_str))
    
    @classmethod
    def get_recommended_config(cls, user_id: int) -> 'TBBotConfig':
        """Önerilen başlangıç konfigürasyonu"""
        return cls(
            user_id=user_id,
            symbol=DEFAULT_TB_SYMBOL,
            trading_mode="demo",
            bot_enabled=False,
            timeframe="15m",
            direction_mode="long_short",
            leverage=3,
            margin_type="ISOLATED",
            wait_candle_close=True,
            prevent_same_signal_reentry=True,
            opposite_signal_behavior="close_position",
            order_type="MARKET",
            control_interval_seconds=10,
            trend_filter_enabled=True,
            trend_filter_timeframe="1h",
            trend_filter_method="EMA200",
            volatility_filter_mode="normal",
            max_slippage_percent=0.2,
            max_order_retries=3,
            retry_delay_seconds=2,
            cancel_if_price_moves=True,
            retry_same_candle=False,
            risk_per_trade_percent=1.0,
            max_daily_loss_percent=3.0,
            daily_profit_target_percent=4.0,
            max_open_positions=1,
            max_daily_trades=5,
            consecutive_loss_limit=3,
            cooldown_minutes=15,
            stop_loss_type="ATR",
            atr_multiplier=1.5,
            atr_period=14,
            take_profit_type="RISK_REWARD",
            risk_reward_ratio=2.0,
            trailing_stop_enabled=False,
            trailing_stop_callback_percent=1.0,
            ott_period=2,
            ott_percent=1.4,
            ott_ma_type="VAR"
        )
    
    def validate(self) -> tuple[bool, Optional[str]]:
        """Konfigürasyonu doğrula"""
        # Symbol kontrolü
        if self.symbol not in ALLOWED_TB_SYMBOLS:
            return False, "Sadece SOLUSDT veya ETHUSDT destekleniyor"
        
        # Trading mode kontrolü
        if self.trading_mode not in ["demo"]:
            return False, "Trading mode 'demo' veya 'live' olmalı"
        
        # Live trading şimdilik kapalı
        if self.trading_mode == "live":
            return False, "Live trading henüz aktif değil"
        
        # Leverage kontrolü
        if not 1 <= self.leverage <= 125:
            return False, "Kaldıraç 1-125 arasında olmalı"
        
        # Risk kontrolü
        if not 0.1 <= self.risk_per_trade_percent <= 10:
            return False, "İşlem başı risk %0.1-%10 arasında olmalı"
        
        if not 1 <= self.max_daily_loss_percent <= 50:
            return False, "Maksimum günlük zarar %1-%50 arasında olmalı"
        
        if not 1 <= self.daily_profit_target_percent <= 100:
            return False, "Günlük hedef kâr %1-%100 arasında olmalı"
        
        # Pozisyon kontrolü
        if not 1 <= self.max_open_positions <= 10:
            return False, "Maksimum açık pozisyon 1-10 arasında olmalı"
        
        if not 1 <= self.max_daily_trades <= 100:
            return False, "Günlük maksimum işlem 1-100 arasında olmalı"
        
        # ATR kontrolü
        if self.stop_loss_type == "ATR":
            if not 0.5 <= self.atr_multiplier <= 5.0:
                return False, "ATR çarpanı 0.5-5.0 arasında olmalı"
        
        # Risk/Reward kontrolü
        if self.take_profit_type == "RISK_REWARD":
            if not 0.5 <= self.risk_reward_ratio <= 10.0:
                return False, "Risk/Reward oranı 0.5-10.0 arasında olmalı"
        
        return True, None
    
    def get_summary(self) -> str:
        """Konfigürasyon özeti"""
        return (
            f"{self.timeframe} · {self.leverage}x · {self.margin_type} · "
            f"%{self.risk_per_trade_percent} Risk · {self.stop_loss_type} Stop · "
            f"1:{self.risk_reward_ratio} RR"
        )


def create_default_config_for_user(user_id: int) -> TBBotConfig:
    """Kullanıcı için varsayılan config oluştur"""
    return TBBotConfig.get_recommended_config(user_id)
