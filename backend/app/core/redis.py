"""
Redis connection and utilities
"""

import redis.asyncio as redis
from app.core.config import settings

# Redis connection pool
redis_pool = None

async def get_redis_pool():
    """Get Redis connection pool"""
    global redis_pool
    if redis_pool is None:
        redis_pool = redis.ConnectionPool.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
    return redis_pool

async def get_redis() -> redis.Redis:
    """Get Redis client"""
    pool = await get_redis_pool()
    return redis.Redis(connection_pool=pool)

async def close_redis():
    """Close Redis connection pool"""
    global redis_pool
    if redis_pool:
        await redis_pool.disconnect()
        redis_pool = None