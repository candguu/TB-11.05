"""
OTT (Optimized Trend Tracker) Indicator
Orijinal Pine Script: @KivancOzbilgic
Python implementasyonu: TB Trading Bot
"""
import numpy as np
import pandas as pd
from typing import Tuple, Dict, List

class OTTIndicator:
    """OTT (Optimized Trend Tracker) hesaplama sınıfı"""
    
    def __init__(self, length: int = 2, percent: float = 1.4, ma_type: str = "VAR"):
        self.length = length
        self.percent = percent
        self.ma_type = ma_type
    
    def calculate_var(self, src: pd.Series, length: int) -> pd.Series:
        """Variable Moving Average hesaplama"""
        valpha = 2 / (length + 1)
        
        # Up/Down değişimleri
        vud1 = np.where(src > src.shift(1), src - src.shift(1), 0)
        vdd1 = np.where(src < src.shift(1), src.shift(1) - src, 0)
        
        vUD = pd.Series(vud1).rolling(window=9).sum()
        vDD = pd.Series(vdd1).rolling(window=9).sum()
        
        vCMO = (vUD - vDD) / (vUD + vDD)
        vCMO = vCMO.fillna(0)
        
        # VAR hesaplama
        VAR = pd.Series(index=src.index, dtype=float)
        VAR.iloc[0] = src.iloc[0]
        
        for i in range(1, len(src)):
            VAR.iloc[i] = (valpha * abs(vCMO.iloc[i]) * src.iloc[i] + 
                          (1 - valpha * abs(vCMO.iloc[i])) * VAR.iloc[i-1])
        
        return VAR
    
    def calculate_wwma(self, src: pd.Series, length: int) -> pd.Series:
        """Welles Wilder Moving Average"""
        wwalpha = 1 / length
        WWMA = pd.Series(index=src.index, dtype=float)
        WWMA.iloc[0] = src.iloc[0]
        
        for i in range(1, len(src)):
            WWMA.iloc[i] = wwalpha * src.iloc[i] + (1 - wwalpha) * WWMA.iloc[i-1]
        
        return WWMA
    
    def calculate_zlema(self, src: pd.Series, length: int) -> pd.Series:
        """Zero Lag EMA"""
        zxLag = length // 2 if length % 2 == 0 else (length - 1) // 2
        zxEMAData = src + (src - src.shift(zxLag))
        return zxEMAData.ewm(span=length, adjust=False).mean()
    
    def calculate_tsf(self, src: pd.Series, length: int) -> pd.Series:
        """Time Series Forecast"""
        TSF = pd.Series(index=src.index, dtype=float)
        
        for i in range(length, len(src)):
            y = src.iloc[i-length:i].values
            x = np.arange(length)
            
            # Linear regression
            A = np.vstack([x, np.ones(len(x))]).T
            m, c = np.linalg.lstsq(A, y, rcond=None)[0]
            
            # Forecast
            TSF.iloc[i] = m * length + c
        
        return TSF
    
    def get_ma(self, src: pd.Series, length: int) -> pd.Series:
        """Moving Average hesaplama (tip seçimine göre)"""
        if self.ma_type == "SMA":
            return src.rolling(window=length).mean()
        elif self.ma_type == "EMA":
            return src.ewm(span=length, adjust=False).mean()
        elif self.ma_type == "WMA":
            weights = np.arange(1, length + 1)
            return src.rolling(window=length).apply(
                lambda x: np.dot(x, weights) / weights.sum(), raw=True
            )
        elif self.ma_type == "TMA":
            sma1 = src.rolling(window=(length + 1) // 2).mean()
            return sma1.rolling(window=length // 2 + 1).mean()
        elif self.ma_type == "VAR":
            return self.calculate_var(src, length)
        elif self.ma_type == "WWMA":
            return self.calculate_wwma(src, length)
        elif self.ma_type == "ZLEMA":
            return self.calculate_zlema(src, length)
        elif self.ma_type == "TSF":
            return self.calculate_tsf(src, length)
        else:
            return src.rolling(window=length).mean()
    
    def calculate(self, df: pd.DataFrame) -> Dict:
        """
        OTT indikatörünü hesapla
        
        Args:
            df: OHLCV verisi içeren DataFrame (columns: open, high, low, close, volume)
        
        Returns:
            Dict: OTT değerleri ve sinyaller
        """
        src = df['close'].copy()
        
        # Moving Average hesapla
        MAvg = self.get_ma(src, self.length)
        
        # Fark hesapla
        fark = MAvg * self.percent * 0.01
        
        # Long Stop hesapla
        longStop = MAvg - fark
        longStop_series = pd.Series(index=df.index, dtype=float)
        longStop_series.iloc[0] = longStop.iloc[0]
        
        for i in range(1, len(df)):
            if MAvg.iloc[i] > longStop_series.iloc[i-1]:
                longStop_series.iloc[i] = max(longStop.iloc[i], longStop_series.iloc[i-1])
            else:
                longStop_series.iloc[i] = longStop.iloc[i]
        
        # Short Stop hesapla
        shortStop = MAvg + fark
        shortStop_series = pd.Series(index=df.index, dtype=float)
        shortStop_series.iloc[0] = shortStop.iloc[0]
        
        for i in range(1, len(df)):
            if MAvg.iloc[i] < shortStop_series.iloc[i-1]:
                shortStop_series.iloc[i] = min(shortStop.iloc[i], shortStop_series.iloc[i-1])
            else:
                shortStop_series.iloc[i] = shortStop.iloc[i]
        
        # Direction hesapla
        direction = pd.Series(1, index=df.index)
        for i in range(1, len(df)):
            if direction.iloc[i-1] == -1 and MAvg.iloc[i] > shortStop_series.iloc[i-1]:
                direction.iloc[i] = 1
            elif direction.iloc[i-1] == 1 and MAvg.iloc[i] < longStop_series.iloc[i-1]:
                direction.iloc[i] = -1
            else:
                direction.iloc[i] = direction.iloc[i-1]
        
        # MT (Moving Trendline) hesapla
        MT = pd.Series(index=df.index, dtype=float)
        for i in range(len(df)):
            MT.iloc[i] = longStop_series.iloc[i] if direction.iloc[i] == 1 else shortStop_series.iloc[i]
        
        # OTT hesapla
        OTT = pd.Series(index=df.index, dtype=float)
        for i in range(len(df)):
            if MAvg.iloc[i] > MT.iloc[i]:
                OTT.iloc[i] = MT.iloc[i] * (200 + self.percent) / 200
            else:
                OTT.iloc[i] = MT.iloc[i] * (200 - self.percent) / 200
        
        # Pine Script'teki 'plot(nz(OTT[2]))' davranışını tam olarak kopyalamak için OTT serisini 2 bar ileri ötelenmiş(shifted) 
        # haline göre hareket ediyoruz. Böylece TradingView ile hem grafik çizimi hem sinyal logic'i birebir eşleşir.
        OTT_shifted = OTT.shift(2).bfill()
        
        # Sinyalleri tam olarak kaydırılmış seri çaprazlamaları üzerinden hesapla
        signals = self._generate_signals(src, MAvg, OTT_shifted)
        
        # Pine Script 'highlight' (OTTC) kuralı: OTT[2] > OTT[3] durumu yukarı, aksi aşağı.
        # Bu direction frontend tarafında OTT çizgi rengi (yeşil/kırmızı) için kullanılıyor.
        trend_direction = 1 if float(OTT_shifted.iloc[-1]) > float(OTT_shifted.iloc[-2]) else -1
        
        return {
            'ott': OTT_shifted,
            'mavg': MAvg,
            'direction': direction,
            'longStop': longStop_series,
            'shortStop': shortStop_series,
            'signals': signals,
            'current_ott': float(OTT_shifted.iloc[-1]),
            'current_mavg': float(MAvg.iloc[-1]),
            'current_price': float(src.iloc[-1]),
            'current_direction': trend_direction
        }
    
    def _generate_signals(self, price: pd.Series, mavg: pd.Series, ott_shifted: pd.Series) -> List[Dict]:
        """Alım/Satım sinyallerini üret (Pine Script Orijinal Mantığı)"""
        signals = []
        
        for i in range(1, len(price)):
            # Yalnızca Support Line Kesişimi (crossover(MAvg, OTT[2])) aktiftir 
            # (Kıvanç'ın kodunda showsignalsk=true, showsignalsr=false varsayılan olarak)
            is_support_buy = mavg.iloc[i] > ott_shifted.iloc[i] and mavg.iloc[i-1] <= ott_shifted.iloc[i-1]
            is_support_sell = mavg.iloc[i] < ott_shifted.iloc[i] and mavg.iloc[i-1] >= ott_shifted.iloc[i-1]
            
            if is_support_buy:
                signals.append({
                    'index': i - 1,
                    'type': 'BUY',
                    'source': 'SUPPORT_CROSS',
                    'price': float(price.iloc[i - 1]),
                    'ott': float(ott_shifted.iloc[i - 1])
                })
            elif is_support_sell:
                signals.append({
                    'index': i - 1,
                    'type': 'SELL',
                    'source': 'SUPPORT_CROSS',
                    'price': float(price.iloc[i - 1]),
                    'ott': float(ott_shifted.iloc[i - 1])
                })
        
        # Sinyalleri bar indeksine göre sıralayalım
        signals.sort(key=lambda x: x['index'])
        return signals
    
    def get_latest_signal(self, df: pd.DataFrame) -> Dict:
        """En son sinyali al"""
        result = self.calculate(df)
        signals = result['signals']
        
        if not signals:
            return {
                'signal': 'NEUTRAL',
                'source': 'NONE',
                'price': result['current_price'],
                'ott': result['current_ott'],
                'mavg': result['current_mavg'],
                'direction': 'UP' if result['current_direction'] == 1 else 'DOWN'
            }
        
        latest = signals[-1]
        return {
            'signal': latest['type'],
            'source': latest['source'],
            'price': latest['price'],
            'ott': result['current_ott'],
            'mavg': result['current_mavg'],
            'direction': 'UP' if result['current_direction'] == 1 else 'DOWN'
        }
