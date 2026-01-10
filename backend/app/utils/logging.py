"""
Structured logging utilities for the NOP backend.

Usage:
    from app.utils.logging import get_logger
    
    logger = get_logger(__name__)
    logger.info("Processing request", extra={"asset_id": asset_id})
"""

import logging
import sys
from typing import Optional

from app.core.config import settings


def get_logger(name: str, level: Optional[str] = None) -> logging.Logger:
    """
    Get a configured logger instance.
    
    Args:
        name: The logger name, typically __name__.
        level: Optional override for log level.
        
    Returns:
        A configured Logger instance.
    """
    logger = logging.getLogger(name)
    
    # Set level from settings or override
    log_level = level or settings.LOG_LEVEL
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    # Only add handler if not already configured
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(getattr(logging, log_level.upper(), logging.INFO))
        
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    return logger
