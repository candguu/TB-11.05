"""
Environment Variables Validator
=================================
Uygulama başlangıcında gerekli environment variable'ları kontrol eder.
"""

import os
import sys
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

class EnvValidator:
    """Environment variable validation."""
    
    # Zorunlu değişkenler
    REQUIRED_VARS = [
        'SECRET_KEY',
        'ADMIN_EMAIL',
        'ADMIN_PASSWORD',
    ]
    
    # Opsiyonel ama önerilen değişkenler
    RECOMMENDED_VARS = [
        'ALLOWED_ORIGINS',
        'LOG_LEVEL',
        'DB_PATH',
        'BINANCE_API_KEY',
        'BINANCE_API_SECRET',
    ]
    
    # Değişken açıklamaları
    VAR_DESCRIPTIONS = {
        'SECRET_KEY': 'Uygulama güvenlik anahtarı (en az 32 karakter)',
        'ADMIN_EMAIL': 'Admin kullanıcı email adresi',
        'ADMIN_PASSWORD': 'Admin kullanıcı şifresi (en az 8 karakter)',
        'ALLOWED_ORIGINS': 'CORS için izin verilen origin\'ler (virgülle ayrılmış)',
        'LOG_LEVEL': 'Log seviyesi (DEBUG, INFO, WARNING, ERROR, CRITICAL)',
        'DB_PATH': 'Veritabanı dosya yolu',
        'BINANCE_API_KEY': 'Binance API anahtarı',
        'BINANCE_API_SECRET': 'Binance API secret',
        'PORT': 'Sunucu port numarası (default: 5000)',
        'DEBUG': 'Debug modu (true/false)',
    }

    @staticmethod
    def _safe_print(message: str = ""):
        """Print validation output without crashing on legacy Windows codepages."""
        try:
            print(message)
        except UnicodeEncodeError:
            encoding = getattr(sys.stdout, "encoding", None) or "utf-8"
            safe = str(message).encode(encoding, errors="replace").decode(encoding, errors="replace")
            print(safe)
    
    @classmethod
    def validate(cls, strict: bool = True) -> Dict[str, any]:
        """
        Environment variable'ları validate et.
        
        Args:
            strict: True ise eksik zorunlu değişken varsa uygulama durur
        
        Returns:
            Validation sonuçları
        """
        missing_required = []
        missing_recommended = []
        warnings = []
        
        # Zorunlu değişkenleri kontrol et
        for var in cls.REQUIRED_VARS:
            value = os.getenv(var)
            if not value:
                missing_required.append(var)
            else:
                # Değer kontrolü
                warning = cls._validate_value(var, value)
                if warning:
                    warnings.append(warning)
        
        # Önerilen değişkenleri kontrol et
        for var in cls.RECOMMENDED_VARS:
            value = os.getenv(var)
            if not value:
                missing_recommended.append(var)
        
        # Sonuçları yazdır
        cls._print_results(missing_required, missing_recommended, warnings)
        
        # Strict modda eksik zorunlu değişken varsa çık
        if strict and missing_required:
            sys.exit(1)
        
        return {
            'valid': len(missing_required) == 0,
            'missing_required': missing_required,
            'missing_recommended': missing_recommended,
            'warnings': warnings
        }
    
    @classmethod
    def _validate_value(cls, var: str, value: str) -> Optional[str]:
        """Değişken değerini kontrol et ve uyarı döndür."""
        
        if var == 'SECRET_KEY':
            if len(value) < 32:
                return f"{var}: En az 32 karakter olmalı (şu an: {len(value)})"
        
        elif var == 'ADMIN_PASSWORD':
            if len(value) < 8:
                return f"{var}: En az 8 karakter olmalı"
        
        elif var == 'ADMIN_EMAIL':
            if '@' not in value:
                return f"{var}: Geçersiz email formatı"
        
        elif var == 'LOG_LEVEL':
            valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
            if value.upper() not in valid_levels:
                return f"{var}: Geçersiz değer. Geçerli değerler: {', '.join(valid_levels)}"
        
        elif var == 'DEBUG':
            if value.lower() not in ['true', 'false', '1', '0']:
                return f"{var}: 'true' veya 'false' olmalı"
        
        return None
    
    @classmethod
    def _print_results(cls, missing_required: List[str], 
                      missing_recommended: List[str], 
                      warnings: List[str]):
        """Validation sonuçlarını yazdır."""
        
        cls._safe_print("\n" + "="*70)
        cls._safe_print("ENVIRONMENT VARIABLES VALIDATION")
        cls._safe_print("="*70)
        
        if not missing_required and not warnings:
            cls._safe_print("OK: Tüm zorunlu değişkenler tanımlı ve geçerli")
        
        if missing_required:
            cls._safe_print("\nEKSIK ZORUNLU DEĞIŞKENLER:")
            for var in missing_required:
                desc = cls.VAR_DESCRIPTIONS.get(var, "")
                cls._safe_print(f"   - {var}")
                if desc:
                    cls._safe_print(f"     -> {desc}")
            cls._safe_print("\nLütfen .env dosyasını kontrol edin!")
        
        if warnings:
            cls._safe_print("\nUYARILAR:")
            for warning in warnings:
                cls._safe_print(f"   - {warning}")
        
        if missing_recommended:
            cls._safe_print("\nÖNERİLEN (opsiyonel) DEĞIŞKENLER:")
            for var in missing_recommended:
                desc = cls.VAR_DESCRIPTIONS.get(var, "")
                cls._safe_print(f"   - {var}")
                if desc:
                    cls._safe_print(f"     -> {desc}")
        
        cls._safe_print("="*70 + "\n")
    
    @classmethod
    def generate_example_env(cls, output_path: str = ".env.example"):
        """Örnek .env dosyası oluştur."""
        
        lines = [
            "# TB Trading Bot - Environment Variables",
            "# ========================================",
            "",
            "# ZORUNLU DEĞIŞKENLER",
            "# -------------------",
        ]
        
        for var in cls.REQUIRED_VARS:
            desc = cls.VAR_DESCRIPTIONS.get(var, "")
            if desc:
                lines.append(f"# {desc}")
            
            # Örnek değer
            if var == 'SECRET_KEY':
                lines.append(f"{var}=your-secret-key-min-32-characters-long")
            elif var == 'ADMIN_EMAIL':
                lines.append(f"{var}=admin@tbot.com")
            elif var == 'ADMIN_PASSWORD':
                lines.append(f"{var}=your-strong-password")
            else:
                lines.append(f"{var}=")
            
            lines.append("")
        
        lines.extend([
            "# OPSIYONEL DEĞIŞKENLER",
            "# ---------------------",
        ])
        
        for var in cls.RECOMMENDED_VARS:
            desc = cls.VAR_DESCRIPTIONS.get(var, "")
            if desc:
                lines.append(f"# {desc}")
            
            # Örnek değer
            if var == 'ALLOWED_ORIGINS':
                lines.append(f"{var}=http://localhost:5000,https://your-app.onrender.com")
            elif var == 'LOG_LEVEL':
                lines.append(f"{var}=INFO")
            elif var == 'DB_PATH':
                lines.append(f"{var}=./tb_database.db")
            else:
                lines.append(f"{var}=")
            
            lines.append("")
        
        lines.extend([
            "# DİĞER AYARLAR",
            "# -------------",
            "# Port numarası (default: 5000)",
            "PORT=5000",
            "",
            "# Debug modu (production'da false olmalı)",
            "DEBUG=false",
            "",
        ])
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        
        print(f"✅ Örnek .env dosyası oluşturuldu: {output_path}")

def validate_environment(strict: bool = True) -> Dict[str, any]:
    """
    Environment variable'ları validate et.
    
    Args:
        strict: True ise eksik zorunlu değişken varsa uygulama durur
    
    Returns:
        Validation sonuçları
    """
    return EnvValidator.validate(strict=strict)

if __name__ == "__main__":
    # Script olarak çalıştırıldığında
    import argparse
    
    parser = argparse.ArgumentParser(description='Environment variables validator')
    parser.add_argument('--generate-example', action='store_true',
                       help='Generate example .env file')
    parser.add_argument('--no-strict', action='store_true',
                       help='Don\'t exit on missing required variables')
    
    args = parser.parse_args()
    
    if args.generate_example:
        EnvValidator.generate_example_env()
    else:
        validate_environment(strict=not args.no_strict)
