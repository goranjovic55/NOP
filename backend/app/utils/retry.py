"""
Retry utilities for handling transient failures in network operations and external service calls.
Implements exponential backoff with jitter to prevent thundering herd problems.
"""

import asyncio
import functools
import logging
import random
import time
from typing import Any, Callable, Optional, Tuple, Type, Union

logger = logging.getLogger(__name__)


class RetryError(Exception):
    """Raised when all retry attempts have been exhausted."""
    
    def __init__(self, message: str, last_exception: Exception):
        super().__init__(message)
        self.last_exception = last_exception


def calculate_backoff(
    attempt: int,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True
) -> float:
    """
    Calculate exponential backoff delay with optional jitter.
    
    Args:
        attempt: Current retry attempt number (1-indexed)
        base_delay: Base delay in seconds
        max_delay: Maximum delay in seconds
        exponential_base: Base for exponential calculation (default: 2.0)
        jitter: Whether to add random jitter (default: True)
    
    Returns:
        Delay in seconds
    """
    # Calculate exponential delay
    delay = min(base_delay * (exponential_base ** (attempt - 1)), max_delay)
    
    # Add jitter (up to 30% of delay)
    if jitter:
        jitter_amount = random.uniform(0, 0.3 * delay)
        delay += jitter_amount
    
    return delay


def retry(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    exceptions: Union[Type[Exception], Tuple[Type[Exception], ...]] = Exception,
    on_retry: Optional[Callable[[int, Exception], None]] = None,
    logger_name: Optional[str] = None
):
    """
    Decorator for retrying a function with exponential backoff.
    
    Args:
        max_attempts: Maximum number of attempts (default: 3)
        base_delay: Base delay between retries in seconds (default: 1.0)
        max_delay: Maximum delay between retries in seconds (default: 60.0)
        exponential_base: Base for exponential backoff (default: 2.0)
        exceptions: Exception types to catch and retry (default: Exception)
        on_retry: Optional callback function called on each retry
        logger_name: Optional logger name for logging retry attempts
    
    Example:
        @retry(max_attempts=3, base_delay=1.0, exceptions=(ConnectionError, TimeoutError))
        def fetch_data():
            # Code that might fail transiently
            pass
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            log = logging.getLogger(logger_name) if logger_name else logger
            
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        log.error(
                            f"All {max_attempts} retry attempts exhausted for {func.__name__}. "
                            f"Last error: {type(e).__name__}: {str(e)}"
                        )
                        raise RetryError(
                            f"Failed after {max_attempts} attempts",
                            last_exception=e
                        )
                    
                    delay = calculate_backoff(attempt, base_delay, max_delay, exponential_base)
                    
                    log.warning(
                        f"Retry {attempt}/{max_attempts} for {func.__name__} "
                        f"after {delay:.2f}s. Error: {type(e).__name__}: {str(e)}"
                    )
                    
                    if on_retry:
                        on_retry(attempt, e)
                    
                    time.sleep(delay)
            
            # This should never be reached
            raise RuntimeError("Unexpected retry loop exit")
        
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            log = logging.getLogger(logger_name) if logger_name else logger
            
            for attempt in range(1, max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        log.error(
                            f"All {max_attempts} retry attempts exhausted for {func.__name__}. "
                            f"Last error: {type(e).__name__}: {str(e)}"
                        )
                        raise RetryError(
                            f"Failed after {max_attempts} attempts",
                            last_exception=e
                        )
                    
                    delay = calculate_backoff(attempt, base_delay, max_delay, exponential_base)
                    
                    log.warning(
                        f"Retry {attempt}/{max_attempts} for {func.__name__} "
                        f"after {delay:.2f}s. Error: {type(e).__name__}: {str(e)}"
                    )
                    
                    if on_retry:
                        on_retry(attempt, e)
                    
                    await asyncio.sleep(delay)
            
            # This should never be reached
            raise RuntimeError("Unexpected retry loop exit")
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


class CircuitBreaker:
    """
    Circuit breaker pattern implementation to prevent cascading failures.
    
    States:
    - CLOSED: Normal operation, requests are allowed
    - OPEN: Too many failures, requests are blocked
    - HALF_OPEN: Testing if service has recovered
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        expected_exception: Type[Exception] = Exception
    ):
        """
        Initialize circuit breaker.
        
        Args:
            failure_threshold: Number of failures before opening circuit
            recovery_timeout: Seconds to wait before attempting recovery
            expected_exception: Exception type to catch
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.last_failure_time: Optional[float] = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Call function through circuit breaker.
        
        Args:
            func: Function to call
            *args: Positional arguments
            **kwargs: Keyword arguments
        
        Returns:
            Function result
        
        Raises:
            Exception: If circuit is open or function fails
        """
        if self.state == "OPEN":
            if self.last_failure_time is not None and time.time() - self.last_failure_time >= self.recovery_timeout:
                self.state = "HALF_OPEN"
                logger.info(f"Circuit breaker entering HALF_OPEN state for {func.__name__}")
            else:
                raise Exception(f"Circuit breaker is OPEN for {func.__name__}")
        
        try:
            result = func(*args, **kwargs)
            
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failure_count = 0
                logger.info(f"Circuit breaker CLOSED for {func.__name__}")
            
            return result
        
        except self.expected_exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
                logger.error(
                    f"Circuit breaker OPEN for {func.__name__} "
                    f"after {self.failure_count} failures"
                )
            
            raise e
    
    async def async_call(self, func: Callable, *args, **kwargs) -> Any:
        """Async version of call method."""
        if self.state == "OPEN":
            if self.last_failure_time is not None and time.time() - self.last_failure_time >= self.recovery_timeout:
                self.state = "HALF_OPEN"
                logger.info(f"Circuit breaker entering HALF_OPEN state for {func.__name__}")
            else:
                raise Exception(f"Circuit breaker is OPEN for {func.__name__}")
        
        try:
            result = await func(*args, **kwargs)
            
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failure_count = 0
                logger.info(f"Circuit breaker CLOSED for {func.__name__}")
            
            return result
        
        except self.expected_exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
                logger.error(
                    f"Circuit breaker OPEN for {func.__name__} "
                    f"after {self.failure_count} failures"
                )
            
            raise e
