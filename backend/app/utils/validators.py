"""
Shared validation utilities for network operations
"""
import re
import ipaddress
from typing import Union


def validate_ip_or_hostname(target: str) -> str:
    """
    Validate and sanitize target hostname or IP address.
    
    Args:
        target: Target IP or hostname to validate
        
    Returns:
        Validated target string
        
    Raises:
        ValueError: If target is invalid
    """
    target = target.strip()
    
    if not target:
        raise ValueError("Target cannot be empty")
    
    # Try to parse as IP address first
    try:
        ipaddress.ip_address(target)
        return target
    except ValueError:
        pass
    
    # Validate as hostname (RFC 1123)
    if len(target) > 253:
        raise ValueError("Hostname too long")
    
    hostname_pattern = re.compile(
        r'^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*$'
    )
    
    if not hostname_pattern.match(target):
        raise ValueError("Invalid hostname format")
    
    return target


def validate_ip_or_network(target: str) -> bool:
    """
    Validate IP address or network CIDR notation.
    
    Args:
        target: IP address or network in CIDR notation
        
    Returns:
        True if valid, False otherwise
    """
    try:
        ipaddress.ip_address(target)
        return True
    except ValueError:
        try:
            ipaddress.ip_network(target, strict=False)
            return True
        except ValueError:
            return False


def validate_port(port: Union[int, str]) -> int:
    """
    Validate port number.
    
    Args:
        port: Port number as int or string
        
    Returns:
        Valid port number
        
    Raises:
        ValueError: If port is invalid
    """
    try:
        port_int = int(port)
        if not (1 <= port_int <= 65535):
            raise ValueError(f"Port must be between 1 and 65535, got {port_int}")
        return port_int
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid port: {port}") from e


def validate_port_range(ports: str) -> bool:
    """
    Validate port range string (e.g., '1-1000', '22,80,443').
    
    Args:
        ports: Port specification string
        
    Returns:
        True if valid, False otherwise
    """
    if not re.match(r'^[0-9,\-]+$', ports):
        return False
    
    parts = ports.replace('-', ',').split(',')
    for part in parts:
        try:
            if not (1 <= int(part) <= 65535):
                return False
        except ValueError:
            return False
    return True


def validate_timeout(timeout: Union[int, float], min_val: int = 1, max_val: int = 300) -> int:
    """
    Validate and clamp timeout value.
    
    Args:
        timeout: Timeout value in seconds
        min_val: Minimum allowed value
        max_val: Maximum allowed value
        
    Returns:
        Clamped timeout value
    """
    return max(min_val, min(max_val, int(timeout)))
