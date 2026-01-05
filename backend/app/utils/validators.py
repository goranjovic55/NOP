"""
Common validation utilities for the application
"""
import ipaddress
import re
from typing import Union, Tuple


class NetworkValidator:
    """Validator for network-related inputs"""
    
    @staticmethod
    def validate_ip_address(ip: str) -> Tuple[bool, str]:
        """
        Validate an IP address
        
        Args:
            ip: IP address string to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            ipaddress.ip_address(ip)
            return True, ""
        except ValueError:
            return False, f"Invalid IP address: {ip}"
    
    @staticmethod
    def validate_port(port: Union[int, str], allow_zero: bool = False) -> Tuple[bool, str]:
        """
        Validate a network port number
        
        Args:
            port: Port number to validate
            allow_zero: Whether port 0 is allowed
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            port_num = int(port)
            min_port = 0 if allow_zero else 1
            if min_port <= port_num <= 65535:
                return True, ""
            return False, f"Port must be between {min_port} and 65535"
        except (ValueError, TypeError):
            return False, f"Port must be a valid integer: {port}"
    
    @staticmethod
    def validate_network_cidr(network: str) -> Tuple[bool, str]:
        """
        Validate a network in CIDR notation
        
        Args:
            network: Network string in CIDR notation (e.g., "192.168.1.0/24")
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            ipaddress.ip_network(network, strict=False)
            return True, ""
        except ValueError as e:
            return False, f"Invalid network CIDR: {str(e)}"
    
    @staticmethod
    def validate_mac_address(mac: str) -> Tuple[bool, str]:
        """
        Validate a MAC address
        
        Args:
            mac: MAC address string to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # MAC address patterns: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX
        pattern = re.compile(r'^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$')
        if pattern.match(mac):
            return True, ""
        return False, f"Invalid MAC address format: {mac}"
    
    @staticmethod
    def is_broadcast_ip(ip: str) -> bool:
        """Check if an IP address is a broadcast address"""
        try:
            ip_obj = ipaddress.ip_address(ip)
            # IPv4 broadcast
            if isinstance(ip_obj, ipaddress.IPv4Address):
                return ip.endswith('.255') or ip == '255.255.255.255'
            return False
        except ValueError:
            return False
    
    @staticmethod
    def is_multicast_ip(ip: str) -> bool:
        """Check if an IP address is a multicast address"""
        try:
            ip_obj = ipaddress.ip_address(ip)
            return ip_obj.is_multicast
        except ValueError:
            return False
    
    @staticmethod
    def is_link_local_ip(ip: str) -> bool:
        """Check if an IP address is link-local"""
        try:
            ip_obj = ipaddress.ip_address(ip)
            return ip_obj.is_link_local
        except ValueError:
            return False
    
    @staticmethod
    def is_private_ip(ip: str) -> bool:
        """Check if an IP address is private"""
        try:
            ip_obj = ipaddress.ip_address(ip)
            return ip_obj.is_private
        except ValueError:
            return False


class InputValidator:
    """Validator for general input validation"""
    
    @staticmethod
    def validate_range(value: Union[int, float], min_val: Union[int, float], 
                       max_val: Union[int, float], name: str = "Value") -> Tuple[bool, str]:
        """
        Validate a numeric value is within a range
        
        Args:
            value: Value to validate
            min_val: Minimum allowed value
            max_val: Maximum allowed value
            name: Name of the field for error messages
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            num_value = float(value)
            if min_val <= num_value <= max_val:
                return True, ""
            return False, f"{name} must be between {min_val} and {max_val}"
        except (ValueError, TypeError):
            return False, f"{name} must be a valid number"
    
    @staticmethod
    def validate_string_length(value: str, min_len: int = 0, max_len: int = None, 
                              name: str = "Value") -> Tuple[bool, str]:
        """
        Validate string length
        
        Args:
            value: String to validate
            min_len: Minimum length
            max_len: Maximum length (None for no limit)
            name: Name of the field for error messages
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not isinstance(value, str):
            return False, f"{name} must be a string"
        
        length = len(value)
        if length < min_len:
            return False, f"{name} must be at least {min_len} characters"
        
        if max_len is not None and length > max_len:
            return False, f"{name} must be at most {max_len} characters"
        
        return True, ""
    
    @staticmethod
    def validate_choice(value: str, choices: list, name: str = "Value") -> Tuple[bool, str]:
        """
        Validate value is one of allowed choices
        
        Args:
            value: Value to validate
            choices: List of allowed values
            name: Name of the field for error messages
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if value in choices:
            return True, ""
        return False, f"{name} must be one of: {', '.join(str(c) for c in choices)}"
    
    @staticmethod
    def validate_hostname(hostname: str) -> Tuple[bool, str]:
        """
        Validate a hostname according to RFC 1123
        
        Args:
            hostname: Hostname to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if len(hostname) > 253:
            return False, "Hostname too long (max 253 characters)"
        
        # Check for valid hostname pattern
        pattern = re.compile(r'^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*$')
        
        if pattern.match(hostname):
            return True, ""
        return False, "Invalid hostname format"
