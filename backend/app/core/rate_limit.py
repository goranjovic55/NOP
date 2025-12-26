"""
Rate Limiting Utility for Network Observatory Platform

Provides rate limiting for API endpoints to prevent abuse.
"""

import time
from typing import Dict, Optional, Callable
from fastapi import Request, HTTPException, status
from functools import wraps
import asyncio
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Simple in-memory rate limiter using token bucket algorithm.
    
    For production with multiple workers, consider using Redis-based limiting.
    """
    
    def __init__(self):
        self._buckets: Dict[str, Dict] = {}
        self._cleanup_task: Optional[asyncio.Task] = None
    
    def _get_key(self, request: Request, key_func: Optional[Callable] = None) -> str:
        """Get rate limit key for a request"""
        if key_func:
            return key_func(request)
        
        # Default: use client IP
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    def _get_bucket(self, key: str, rate: int, period: int) -> Dict:
        """Get or create rate limit bucket"""
        now = time.time()
        
        if key not in self._buckets:
            self._buckets[key] = {
                "tokens": rate,
                "last_update": now,
                "rate": rate,
                "period": period
            }
        
        bucket = self._buckets[key]
        
        # Refill tokens based on time passed
        time_passed = now - bucket["last_update"]
        tokens_to_add = (time_passed / period) * rate
        bucket["tokens"] = min(rate, bucket["tokens"] + tokens_to_add)
        bucket["last_update"] = now
        
        return bucket
    
    def is_allowed(
        self, 
        request: Request, 
        rate: int = 60, 
        period: int = 60,
        key_func: Optional[Callable] = None
    ) -> tuple[bool, Dict]:
        """
        Check if request is allowed under rate limit.
        
        Args:
            request: FastAPI request object
            rate: Number of requests allowed per period
            period: Time period in seconds
            key_func: Optional function to extract rate limit key
        
        Returns:
            Tuple of (allowed: bool, headers: dict)
        """
        key = self._get_key(request, key_func)
        bucket = self._get_bucket(key, rate, period)
        
        headers = {
            "X-RateLimit-Limit": str(rate),
            "X-RateLimit-Remaining": str(int(bucket["tokens"])),
            "X-RateLimit-Reset": str(int(bucket["last_update"] + period))
        }
        
        if bucket["tokens"] >= 1:
            bucket["tokens"] -= 1
            return True, headers
        
        # Calculate retry-after
        wait_time = period - (time.time() - bucket["last_update"])
        headers["Retry-After"] = str(int(max(1, wait_time)))
        
        return False, headers
    
    async def cleanup_expired_buckets(self, max_age: int = 3600):
        """Remove old rate limit buckets to prevent memory leaks"""
        while True:
            try:
                now = time.time()
                expired = [
                    key for key, bucket in self._buckets.items()
                    if now - bucket["last_update"] > max_age
                ]
                for key in expired:
                    del self._buckets[key]
                
                if expired:
                    logger.debug(f"Cleaned up {len(expired)} expired rate limit buckets")
                
            except Exception as e:
                logger.error(f"Rate limit cleanup error: {e}")
            
            await asyncio.sleep(600)  # Run every 10 minutes
    
    def start_cleanup(self):
        """Start background cleanup task"""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self.cleanup_expired_buckets())


# Global rate limiter instance
rate_limiter = RateLimiter()


def rate_limit(
    rate: int = 60,
    period: int = 60,
    key_func: Optional[Callable] = None
):
    """
    Decorator for rate limiting endpoints.
    
    Usage:
        @router.post("/login")
        @rate_limit(rate=5, period=60)  # 5 requests per minute
        async def login(request: Request, ...):
            ...
    
    Args:
        rate: Number of requests allowed per period
        period: Time period in seconds
        key_func: Optional function to extract rate limit key from request
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            allowed, headers = rate_limiter.is_allowed(request, rate, period, key_func)
            
            if not allowed:
                logger.warning(
                    f"Rate limit exceeded for {rate_limiter._get_key(request, key_func)}"
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please try again later.",
                    headers=headers
                )
            
            response = await func(request, *args, **kwargs)
            
            # Add rate limit headers to response (if possible)
            # Note: This requires the function to return a Response object
            # For other cases, consider using middleware
            
            return response
        
        return wrapper
    return decorator


# Middleware-based rate limiting
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware for global rate limiting.
    
    Applies rate limiting to all requests based on client IP.
    """
    
    def __init__(
        self, 
        app, 
        rate: int = 100, 
        period: int = 60,
        exclude_paths: Optional[list] = None
    ):
        super().__init__(app)
        self.rate = rate
        self.period = period
        self.exclude_paths = exclude_paths or ["/health", "/docs", "/openapi.json"]
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for excluded paths
        if request.url.path in self.exclude_paths:
            return await call_next(request)
        
        allowed, headers = rate_limiter.is_allowed(request, self.rate, self.period)
        
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."},
                headers=headers
            )
        
        response = await call_next(request)
        
        # Add rate limit headers to response
        for key, value in headers.items():
            response.headers[key] = value
        
        return response
