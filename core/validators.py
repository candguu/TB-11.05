"""
Input Validation Utilities
============================
API endpoint'leri için input validation.
"""

import re
from functools import wraps
from flask import request, jsonify
from typing import Any, Callable, Dict, List, Optional

class ValidationError(Exception):
    """Validation hatası."""
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")

class Validator:
    """Input validation helper."""
    
    @staticmethod
    def required(value: Any, field_name: str) -> Any:
        """Zorunlu alan kontrolü."""
        if value is None or (isinstance(value, str) and not value.strip()):
            raise ValidationError(field_name, "Bu alan zorunludur")
        return value
    
    @staticmethod
    def email(value: str, field_name: str = "email") -> str:
        """Email formatı kontrolü."""
        if not value:
            raise ValidationError(field_name, "Email adresi gerekli")
        
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, value):
            raise ValidationError(field_name, "Geçersiz email formatı")
        
        return value.lower().strip()
    
    @staticmethod
    def string(value: Any, field_name: str, min_length: int = None, 
               max_length: int = None, pattern: str = None) -> str:
        """String validasyonu."""
        if not isinstance(value, str):
            raise ValidationError(field_name, "String değer bekleniyor")
        
        value = value.strip()
        
        if min_length and len(value) < min_length:
            raise ValidationError(field_name, f"En az {min_length} karakter olmalı")
        
        if max_length and len(value) > max_length:
            raise ValidationError(field_name, f"En fazla {max_length} karakter olabilir")
        
        if pattern and not re.match(pattern, value):
            raise ValidationError(field_name, "Geçersiz format")
        
        return value
    
    @staticmethod
    def integer(value: Any, field_name: str, min_val: int = None, 
                max_val: int = None) -> int:
        """Integer validasyonu."""
        try:
            value = int(value)
        except (ValueError, TypeError):
            raise ValidationError(field_name, "Tam sayı değer bekleniyor")
        
        if min_val is not None and value < min_val:
            raise ValidationError(field_name, f"En az {min_val} olmalı")
        
        if max_val is not None and value > max_val:
            raise ValidationError(field_name, f"En fazla {max_val} olabilir")
        
        return value
    
    @staticmethod
    def float_number(value: Any, field_name: str, min_val: float = None, 
                     max_val: float = None) -> float:
        """Float validasyonu."""
        try:
            value = float(value)
        except (ValueError, TypeError):
            raise ValidationError(field_name, "Sayısal değer bekleniyor")
        
        if min_val is not None and value < min_val:
            raise ValidationError(field_name, f"En az {min_val} olmalı")
        
        if max_val is not None and value > max_val:
            raise ValidationError(field_name, f"En fazla {max_val} olabilir")
        
        return value
    
    @staticmethod
    def boolean(value: Any, field_name: str) -> bool:
        """Boolean validasyonu."""
        if isinstance(value, bool):
            return value
        
        if isinstance(value, str):
            value_lower = value.lower()
            if value_lower in ('true', '1', 'yes', 'on'):
                return True
            if value_lower in ('false', '0', 'no', 'off'):
                return False
        
        if isinstance(value, int):
            return bool(value)
        
        raise ValidationError(field_name, "Boolean değer bekleniyor")
    
    @staticmethod
    def choice(value: Any, field_name: str, choices: List[Any]) -> Any:
        """Seçeneklerden biri olmalı."""
        if value not in choices:
            raise ValidationError(
                field_name, 
                f"Geçersiz değer. Seçenekler: {', '.join(map(str, choices))}"
            )
        return value
    
    @staticmethod
    def symbol(value: str, field_name: str = "symbol") -> str:
        """Trading sembolü validasyonu."""
        value = Validator.string(value, field_name, min_length=3, max_length=20)
        value = value.upper()
        
        # Sadece harf ve sayı
        if not re.match(r'^[A-Z0-9]+$', value):
            raise ValidationError(field_name, "Geçersiz sembol formatı")
        
        return value
    
    @staticmethod
    def side(value: str, field_name: str = "side") -> str:
        """Trading side validasyonu (BUY/SELL)."""
        return Validator.choice(value.upper(), field_name, ['BUY', 'SELL'])
    
    @staticmethod
    def order_type(value: str, field_name: str = "type") -> str:
        """Order type validasyonu."""
        return Validator.choice(
            value.upper(), 
            field_name, 
            ['MARKET', 'LIMIT', 'STOP_MARKET', 'TAKE_PROFIT_MARKET']
        )
    
    @staticmethod
    def leverage(value: Any, field_name: str = "leverage") -> int:
        """Kaldıraç validasyonu (1-125)."""
        return Validator.integer(value, field_name, min_val=1, max_val=125)
    
    @staticmethod
    def percentage(value: Any, field_name: str) -> float:
        """Yüzde validasyonu (0-100)."""
        return Validator.float_number(value, field_name, min_val=0, max_val=100)

def validate_request(schema: Dict[str, Callable]):
    """
    Request body validasyonu için decorator.
    
    Args:
        schema: Field name -> validation function mapping
    
    Usage:
        @validate_request({
            'email': lambda v: Validator.email(v, 'email'),
            'password': lambda v: Validator.string(v, 'password', min_length=8)
        })
        def register():
            data = request.validated_data
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # JSON body'yi al
                data = request.get_json(silent=True) or {}
                
                # Her field'ı validate et
                validated_data = {}
                for field_name, validator_func in schema.items():
                    value = data.get(field_name)
                    try:
                        validated_data[field_name] = validator_func(value)
                    except ValidationError as e:
                        return jsonify({
                            "error": "Validation hatası",
                            "field": e.field,
                            "message": e.message
                        }), 400
                
                # Validated data'yı request'e ekle
                request.validated_data = validated_data
                
                return f(*args, **kwargs)
                
            except Exception as e:
                from core.logger import logger
                logger.error(f"Validation error: {e}", exc_info=True)
                return jsonify({
                    "error": "Validation hatası",
                    "message": str(e)
                }), 400
        
        return decorated_function
    return decorator

# Önceden tanımlı validation schema'ları
TRADING_ORDER_SCHEMA = {
    'symbol': lambda v: Validator.symbol(v, 'symbol'),
    'side': lambda v: Validator.side(v, 'side'),
    'type': lambda v: Validator.order_type(v, 'type'),
    'quantity': lambda v: Validator.float_number(v, 'quantity', min_val=0.00000001) if v else None,
    'price': lambda v: Validator.float_number(v, 'price', min_val=0.00000001) if v else None,
}

LOGIN_SCHEMA = {
    'email': lambda v: Validator.email(v, 'email'),
    'password': lambda v: Validator.required(v, 'password'),
}

REGISTER_SCHEMA = {
    'first_name': lambda v: Validator.string(v, 'first_name', min_length=2, max_length=50),
    'last_name': lambda v: Validator.string(v, 'last_name', min_length=2, max_length=50),
    'email': lambda v: Validator.email(v, 'email'),
    'password': lambda v: Validator.string(v, 'password', min_length=8, max_length=100),
    'phone': lambda v: Validator.string(v, 'phone', max_length=20) if v else None,
}
