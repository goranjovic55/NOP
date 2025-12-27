"""
Advanced ping service with support for different protocols and ports (like hping3)
"""
import asyncio
import subprocess
import re
import time
import ipaddress
from typing import Optional, Dict, List, Any
from datetime import datetime


class PingService:
    """
    Service for advanced ping operations supporting multiple protocols and ports.
    Provides functionality similar to hping3 for testing firewall rules and services.
    """

    def _validate_target(self, target: str) -> str:
        """
        Validate and sanitize target hostname or IP address.
        
        Args:
            target: Target IP or hostname to validate
            
        Returns:
            Validated target string
            
        Raises:
            ValueError: If target is invalid
        """
        # Remove whitespace
        target = target.strip()
        
        # Check if empty
        if not target:
            raise ValueError("Target cannot be empty")
        
        # Try to parse as IP address first
        try:
            ipaddress.ip_address(target)
            return target
        except ValueError:
            pass
        
        # Validate as hostname (RFC 1123)
        # Allow alphanumeric, hyphens, dots, max 253 chars
        if len(target) > 253:
            raise ValueError("Hostname too long")
        
        # Check for valid hostname pattern
        hostname_pattern = re.compile(
            r'^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*$'
        )
        
        if not hostname_pattern.match(target):
            raise ValueError("Invalid hostname format")
        
        return target

    async def icmp_ping(
        self,
        target: str,
        count: int = 4,
        timeout: int = 5,
        packet_size: int = 56
    ) -> Dict[str, Any]:
        """
        Perform standard ICMP ping
        
        Args:
            target: Target IP or hostname
            count: Number of packets to send
            timeout: Timeout in seconds
            packet_size: Size of packet data in bytes
            
        Returns:
            Dictionary with ping results
        """
        try:
            # Validate target
            validated_target = self._validate_target(target)
            
            # Validate numeric parameters
            count = max(1, min(100, count))
            timeout = max(1, min(30, timeout))
            packet_size = max(1, min(65500, packet_size))
            
            cmd = [
                'ping',
                '-c', str(count),
                '-W', str(timeout),
                '-s', str(packet_size),
                validated_target
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            output = stdout.decode('utf-8')
            
            return self._parse_ping_output(output, 'ICMP')
            
        except Exception as e:
            return {
                'protocol': 'ICMP',
                'target': target,
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    async def tcp_ping(
        self,
        target: str,
        port: int,
        count: int = 4,
        timeout: int = 5
    ) -> Dict[str, Any]:
        """
        Perform TCP ping by attempting TCP connections
        
        Args:
            target: Target IP or hostname
            port: Target port
            count: Number of connection attempts
            timeout: Timeout in seconds per attempt
            
        Returns:
            Dictionary with ping results
        """
        # Validate target
        validated_target = self._validate_target(target)
        
        # Validate port
        if not isinstance(port, int) or port < 1 or port > 65535:
            raise ValueError("Port must be between 1 and 65535")
        
        # Validate numeric parameters
        count = max(1, min(100, count))
        timeout = max(1, min(30, timeout))
        results = []
        successful = 0
        failed = 0
        min_time = float('inf')
        max_time = 0
        total_time = 0
        
        for i in range(count):
            start_time = time.time()
            try:
                reader, writer = await asyncio.wait_for(
                    asyncio.open_connection(validated_target, port),
                    timeout=timeout
                )
                elapsed = (time.time() - start_time) * 1000  # Convert to ms
                writer.close()
                await writer.wait_closed()
                
                results.append({
                    'seq': i + 1,
                    'status': 'success',
                    'time_ms': round(elapsed, 2)
                })
                successful += 1
                total_time += elapsed
                min_time = min(min_time, elapsed)
                max_time = max(max_time, elapsed)
                
            except asyncio.TimeoutError:
                results.append({
                    'seq': i + 1,
                    'status': 'timeout',
                    'time_ms': timeout * 1000
                })
                failed += 1
            except Exception as e:
                results.append({
                    'seq': i + 1,
                    'status': 'failed',
                    'error': str(e)
                })
                failed += 1
            
            # Small delay between pings
            if i < count - 1:
                await asyncio.sleep(0.5)
        
        avg_time = total_time / successful if successful > 0 else 0
        
        return {
            'protocol': 'TCP',
            'target': validated_target,
            'port': port,
            'count': count,
            'successful': successful,
            'failed': failed,
            'packet_loss': round((failed / count) * 100, 2),
            'min_ms': round(min_time, 2) if successful > 0 else None,
            'max_ms': round(max_time, 2) if successful > 0 else None,
            'avg_ms': round(avg_time, 2) if successful > 0 else None,
            'results': results,
            'timestamp': datetime.now().isoformat()
        }

    async def udp_ping(
        self,
        target: str,
        port: int,
        count: int = 4,
        timeout: int = 5
    ) -> Dict[str, Any]:
        """
        Perform UDP ping by sending UDP packets
        
        Args:
            target: Target IP or hostname
            port: Target port
            count: Number of packets to send
            timeout: Timeout in seconds
            
        Returns:
            Dictionary with ping results
        """
        # Validate target
        validated_target = self._validate_target(target)
        
        # Validate port
        if not isinstance(port, int) or port < 1 or port > 65535:
            raise ValueError("Port must be between 1 and 65535")
        
        # Validate numeric parameters
        count = max(1, min(100, count))
        timeout = max(1, min(30, timeout))
        results = []
        
        for i in range(count):
            start_time = time.time()
            try:
                # Create UDP socket
                loop = asyncio.get_event_loop()
                transport, protocol = await loop.create_datagram_endpoint(
                    lambda: asyncio.DatagramProtocol(),
                    remote_addr=(validated_target, port)
                )
                
                # Send test packet
                transport.sendto(b'PING')
                elapsed = (time.time() - start_time) * 1000
                
                results.append({
                    'seq': i + 1,
                    'status': 'sent',
                    'time_ms': round(elapsed, 2),
                    'note': 'UDP is connectionless - packet sent but no ack expected'
                })
                
                transport.close()
                
            except Exception as e:
                results.append({
                    'seq': i + 1,
                    'status': 'failed',
                    'error': str(e)
                })
            
            if i < count - 1:
                await asyncio.sleep(0.5)
        
        return {
            'protocol': 'UDP',
            'target': validated_target,
            'port': port,
            'count': count,
            'results': results,
            'note': 'UDP is connectionless - these are send confirmations, not responses',
            'timestamp': datetime.now().isoformat()
        }

    async def http_ping(
        self,
        target: str,
        port: int = 80,
        count: int = 4,
        timeout: int = 5,
        use_https: bool = False
    ) -> Dict[str, Any]:
        """
        Perform HTTP/HTTPS ping
        
        Args:
            target: Target IP or hostname
            port: Target port
            count: Number of requests
            timeout: Timeout in seconds
            use_https: Use HTTPS instead of HTTP
            
        Returns:
            Dictionary with ping results
        """
        # Validate target
        validated_target = self._validate_target(target)
        
        # Validate port
        if not isinstance(port, int) or port < 1 or port > 65535:
            raise ValueError("Port must be between 1 and 65535")
        
        # Validate numeric parameters
        count = max(1, min(100, count))
        timeout = max(1, min(30, timeout))
        results = []
        successful = 0
        failed = 0
        min_time = float('inf')
        max_time = 0
        total_time = 0
        
        protocol_str = 'https' if use_https else 'http'
        # Construct URL with validated components
        # Port is already validated as integer in range 1-65535
        url = f"{protocol_str}://{validated_target}:{port}/"
        
        for i in range(count):
            start_time = time.time()
            try:
                # Use curl for HTTP requests
                cmd = ['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', '-m', str(timeout), url]
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                stdout, _ = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout + 1
                )
                
                elapsed = (time.time() - start_time) * 1000
                status_code = stdout.decode('utf-8').strip()
                
                results.append({
                    'seq': i + 1,
                    'status': 'success',
                    'http_code': status_code,
                    'time_ms': round(elapsed, 2)
                })
                successful += 1
                total_time += elapsed
                min_time = min(min_time, elapsed)
                max_time = max(max_time, elapsed)
                
            except asyncio.TimeoutError:
                results.append({
                    'seq': i + 1,
                    'status': 'timeout'
                })
                failed += 1
            except Exception as e:
                results.append({
                    'seq': i + 1,
                    'status': 'failed',
                    'error': str(e)
                })
                failed += 1
            
            if i < count - 1:
                await asyncio.sleep(0.5)
        
        avg_time = total_time / successful if successful > 0 else 0
        
        return {
            'protocol': 'HTTPS' if use_https else 'HTTP',
            'target': validated_target,
            'port': port,
            'url': url,
            'count': count,
            'successful': successful,
            'failed': failed,
            'packet_loss': round((failed / count) * 100, 2),
            'min_ms': round(min_time, 2) if successful > 0 else None,
            'max_ms': round(max_time, 2) if successful > 0 else None,
            'avg_ms': round(avg_time, 2) if successful > 0 else None,
            'results': results,
            'timestamp': datetime.now().isoformat()
        }

    def _parse_ping_output(self, output: str, protocol: str) -> Dict[str, Any]:
        """Parse standard ping command output"""
        try:
            lines = output.split('\n')
            
            # Extract statistics
            stats_match = re.search(r'(\d+) packets transmitted, (\d+) received', output)
            rtt_match = re.search(r'min/avg/max(?:/mdev)? = ([\d.]+)/([\d.]+)/([\d.]+)', output)
            
            if stats_match:
                transmitted = int(stats_match.group(1))
                received = int(stats_match.group(2))
                packet_loss = ((transmitted - received) / transmitted * 100) if transmitted > 0 else 100
            else:
                transmitted = received = 0
                packet_loss = 100
            
            result = {
                'protocol': protocol,
                'transmitted': transmitted,
                'received': received,
                'packet_loss': round(packet_loss, 2),
                'raw_output': output,
                'timestamp': datetime.now().isoformat()
            }
            
            if rtt_match:
                result['min_ms'] = float(rtt_match.group(1))
                result['avg_ms'] = float(rtt_match.group(2))
                result['max_ms'] = float(rtt_match.group(3))
            
            return result
            
        except Exception as e:
            return {
                'protocol': protocol,
                'status': 'parse_error',
                'error': str(e),
                'raw_output': output,
                'timestamp': datetime.now().isoformat()
            }

    async def advanced_ping(
        self,
        target: str,
        protocol: str = 'icmp',
        port: Optional[int] = None,
        count: int = 4,
        timeout: int = 5,
        packet_size: int = 56,
        use_https: bool = False
    ) -> Dict[str, Any]:
        """
        Unified advanced ping method supporting multiple protocols
        
        Args:
            target: Target IP or hostname
            protocol: Protocol type (icmp, tcp, udp, http)
            port: Port number (required for tcp, udp, http)
            count: Number of pings
            timeout: Timeout in seconds
            packet_size: Packet size for ICMP
            use_https: Use HTTPS for HTTP pings
            
        Returns:
            Dictionary with ping results
        """
        protocol = protocol.lower()
        
        # Validate protocol
        if protocol not in ['icmp', 'tcp', 'udp', 'http']:
            raise ValueError(f"Unsupported protocol: {protocol}. Use: icmp, tcp, udp, or http")
        
        if protocol == 'icmp':
            return await self.icmp_ping(target, count, timeout, packet_size)
        elif protocol == 'tcp':
            if port is None:
                raise ValueError("Port is required for TCP ping")
            return await self.tcp_ping(target, port, count, timeout)
        elif protocol == 'udp':
            if port is None:
                raise ValueError("Port is required for UDP ping")
            return await self.udp_ping(target, port, count, timeout)
        elif protocol == 'http':
            if port is None:
                port = 443 if use_https else 80
            return await self.http_ping(target, port, count, timeout, use_https)
        else:
            raise ValueError(f"Unsupported protocol: {protocol}")


# Global service instance
ping_service = PingService()
