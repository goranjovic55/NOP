"""
Common error handling utilities for API endpoints
"""
from fastapi import HTTPException
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def handle_api_error(
    error: Exception,
    status_code: int = 500,
    custom_message: Optional[str] = None,
    log_error: bool = True
) -> HTTPException:
    """
    Standardized error handling for API endpoints.
    
    Args:
        error: The caught exception
        status_code: HTTP status code to return
        custom_message: Optional custom error message
        log_error: Whether to log the error
        
    Returns:
        HTTPException with appropriate status and detail
    """
    error_detail = custom_message or str(error)
    
    if log_error:
        logger.error(f"API error ({status_code}): {error_detail}", exc_info=True)
    
    raise HTTPException(status_code=status_code, detail=error_detail)


def handle_validation_error(message: str) -> HTTPException:
    """
    Handle validation errors with 400 status code.
    
    Args:
        message: Validation error message
        
    Returns:
        HTTPException with 400 status
    """
    logger.warning(f"Validation error: {message}")
    raise HTTPException(status_code=400, detail=message)


def handle_not_found(resource: str, identifier: str) -> HTTPException:
    """
    Handle not found errors with 404 status code.
    
    Args:
        resource: Type of resource not found (e.g., "User", "Asset")
        identifier: Identifier used to search for the resource
        
    Returns:
        HTTPException with 404 status
    """
    message = f"{resource} not found: {identifier}"
    logger.info(message)
    raise HTTPException(status_code=404, detail=message)


def handle_unauthorized(message: str = "Unauthorized") -> HTTPException:
    """
    Handle unauthorized access with 401 status code.
    
    Args:
        message: Error message
        
    Returns:
        HTTPException with 401 status
    """
    logger.warning(f"Unauthorized access: {message}")
    raise HTTPException(status_code=401, detail=message)
