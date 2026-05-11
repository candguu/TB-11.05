"""
Rate Limiting Middleware
=========================
API endpoint'lerini rate limiting ile korur.
"""

import time
from functools import wraps
from flask import request, jsonify, g
from collections import defaultdict
from threading import Lock

class RateLimiter:
    """Basit in-memory rate limiter."""
    
    def __init__(self):
        self.requests = defaultdict(list)
        self.lock = Lock()
    
    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, dict]:
        """
        Rate limit kontrolü yap.
        
        Args:
            key: Unique identifier (user_id, IP, vb.)
            max_requests: Zaman penceresi içinde izin verilen maksimum istek
            window_seconds: Zaman penceresi (saniye)
        
        Returns:
            (allowed, info) tuple
        """
        with self.lock:
            now = time.time()
            window_start = now - window_seconds
            
            # Eski istekleri temizle
            self.requests[key] = [
                req_time for req_time in self.requests[key]
                if req_time > window_start
            ]
            
            current_count = len(self.requests[key])
            
            if current_count >= max_requests:
                oldest_request = min(self.requests[key])
                retry_after = int(oldest_request + window_seconds - now) + 1
                
                return False, {
                    "limit": max_requests,
                    "remaining": 0,
                    "reset": int(oldest_request + window_seconds),
                    "retry_after": retry_after
                }
            
            # Yeni isteği kaydet
            self.requests[key].append(now)
            
            return True, {
                "limit": max_requests,
                "remaining": max_requests - current_count - 1,
                "reset": int(now + window_seconds)
            }
    
    def cleanup_old_entries(self, max_age_seconds: int = 3600):
        """Eski kayıtları temizle (memory leak önleme)."""
        with self.lock:
            now = time.time()
            cutoff = now - max_age_seconds
            
            keys_to_delete = []
            for key, timestamps in self.requests.items():
                # Tüm timestamp'ler eski ise key'i sil
                if all(t < cutoff for t in timestamps):
                    keys_to_delete.append(key)
            
            for key in keys_to_delete:
                del self.requests[key]

# Global rate limiter instance
rate_limiter = RateLimiter()

def rate_limit(max_requests: int = 60, window_seconds: int = 60, key_func=None):
    """
    Rate limiting decorator.
    
    Args:
        max_requests: Maksimum istek sayısı
        window_seconds: Zaman penceresi (saniye)
        key_func: Rate limit key'i oluşturan fonksiyon (default: user_id veya IP)
    
    Usage:
        @rate_limit(max_requests=10, window_seconds=60)
        def my_endpoint():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Rate limit key'i belirle
            if key_func:
                key = key_func()
            else:
                # Önce user_id'yi dene, yoksa IP kullan
                key = getattr(g, 'user_id', None)
                if key is None:
                    key = request.remote_addr or 'unknown'
                key = f"rate_limit:{key}"
            
            # Rate limit kontrolü
            allowed, info = rate_limiter.is_allowed(key, max_requests, window_seconds)
            
            # Response header'larını ekle
            response_headers = {
                'X-RateLimit-Limit': str(info['limit']),
                'X-RateLimit-Remaining': str(info['remaining']),
                'X-RateLimit-Reset': str(info['reset'])
            }
            
            if not allowed:
                from core.logger import logger
                logger.warning(
                    f"Rate limit exceeded | Key: {key} | "
                    f"Limit: {max_requests}/{window_seconds}s"
                )
                
                response = jsonify({
                    "error": "Rate limit asildi",
                    "message": f"{window_seconds} saniye icinde maksimum {max_requests} istek yapabilirsiniz",
                    "retry_after": info['retry_after']
                })
                response.status_code = 429
                response.headers.update(response_headers)
                response.headers['Retry-After'] = str(info['retry_after'])
                return response
            
            # İsteği işle
            response = f(*args, **kwargs)
            
            # Response header'larını ekle
            if hasattr(response, 'headers'):
                response.headers.update(response_headers)
            
            return response
        
        return decorated_function
    return decorator

# Önceden tanımlı rate limit profilleri
def strict_rate_limit(f):
    """Sıkı rate limit: 10 istek/dakika"""
    return rate_limit(max_requests=10, window_seconds=60)(f)

def moderate_rate_limit(f):
    """Orta rate limit: 30 istek/dakika"""
    return rate_limit(max_requests=30, window_seconds=60)(f)

def relaxed_rate_limit(f):
    """Gevşek rate limit: 100 istek/dakika"""
    return rate_limit(max_requests=100, window_seconds=60)(f)
