"""
Advanced ping service with support for different protocols and ports (like hping3)
"""
import asyncio
import subprocess
import re
import time
from typing import Optional, Dict, List, Any
from datetime import datetime
from app.utils.validators import validate_ip_or_hostname, validate_port, validate_timeout


class PingService:
    """
    Service for advanced ping operations supporting multiple protocols and ports.
    Provides functionality similar to hping3 for testing firewall rules and services.
    """

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
            validated_target = validate_ip_or_hostname(target)
            count = max(1, min(100, count))
            timeout = validate_timeout(timeout, 1, 30)
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
            
            result = self._parse_ping_output(output, 'ICMP')
            result['target'] = validated_target
            return result
            
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
        Perform TCP ping using hping3 for detailed packet information
        
        Args:
            target: Target IP or hostname
            port: Target port
            count: Number of connection attempts
            timeout: Timeout in seconds per attempt
            
        Returns:
            Dictionary with ping results including raw hping3 output
        """
        validated_target = validate_ip_or_hostname(target)
        validated_port = validate_port(port)
        count = max(1, min(100, count))
        timeout = validate_timeout(timeout, 1, 30)
        
        try:
            # Use hping3 for TCP SYN ping with traceroute to show packet path
            # --traceroute = show hops, -S = SYN flag, -p = port, -c = count, -V = verbose
            cmd = [
                'hping3',
                '--traceroute',  # Always trace packet path
                '-S',  # SYN packets
                '-p', str(validated_port),
                '-c', str(count),
                '-V',  # Verbose output
                validated_target
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout * count + 5
                )
            except asyncio.TimeoutError:
                process.kill()
                return {
                    'protocol': 'TCP',
                    'target': validated_target,
                    'port': port,
                    'error': 'Operation timed out',
                    'timestamp': datetime.now().isoformat()
                }
            
            output = stdout.decode('utf-8') + stderr.decode('utf-8')
            
            # Parse hping3 output
            return self._parse_hping_output(output, 'TCP', validated_target, port, count)
            
        except FileNotFoundError:
            # Fallback if hping3 not available
            return await self._tcp_ping_fallback(validated_target, port, count, timeout)
        except Exception as e:
            return {
                'protocol': 'TCP',
                'target': validated_target,
                'port': port,
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    async def _tcp_ping_fallback(
        self,
        target: str,
        port: int,
        count: int,
        timeout: int
    ) -> Dict[str, Any]:
        """Fallback TCP ping using socket connections"""
    async def _tcp_ping_fallback(
        self,
        target: str,
        port: int,
        count: int,
        timeout: int
    ) -> Dict[str, Any]:
        """Fallback TCP ping using socket connections"""
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
                    asyncio.open_connection(target, port),
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
            'target': target,
            'port': port,
            'count': count,
            'successful': successful,
            'failed': failed,
            'packet_loss': round((failed / count) * 100, 2),
            'min_ms': round(min_time, 2) if successful > 0 else None,
            'max_ms': round(max_time, 2) if successful > 0 else None,
            'avg_ms': round(avg_time, 2) if successful > 0 else None,
            'results': results,
            'note': 'Fallback mode - hping3 not available',
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
        Perform UDP ping using hping3 for detailed packet information
        
        Args:
            target: Target IP or hostname
            port: Target port
            count: Number of packets to send
            timeout: Timeout in seconds
            
        Returns:
            Dictionary with ping results including raw hping3 output
        """
        # Validate target
        validated_target = validate_ip_or_hostname(target)
        
        # Validate port
        validated_port = validate_port(port)
        
        # Validate numeric parameters
        count = max(1, min(100, count))
        timeout = validate_timeout(timeout, 1, 30)
        
        try:
            # Use hping3 for UDP ping with traceroute to show packet path
            cmd = [
                'hping3',
                '--traceroute',  # Always trace packet path
                '--udp',  # UDP mode
                '-p', str(validated_port),
                '-c', str(count),
                '-V',  # Verbose output
                validated_target
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout * count + 5
                )
            except asyncio.TimeoutError:
                process.kill()
                return {
                    'protocol': 'UDP',
                    'target': validated_target,
                    'port': port,
                    'error': 'Operation timed out',
                    'timestamp': datetime.now().isoformat()
                }
            
            output = stdout.decode('utf-8') + stderr.decode('utf-8')
            
            # Parse hping3 output
            return self._parse_hping_output(output, 'UDP', validated_target, port, count)
            
        except FileNotFoundError:
            # Fallback if hping3 not available
            return await self._udp_ping_fallback(validated_target, port, count, timeout)
        except Exception as e:
            return {
                'protocol': 'UDP',
                'target': validated_target,
                'port': port,
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    async def _udp_ping_fallback(
        self,
        target: str,
        port: int,
        count: int,
        timeout: int
    ) -> Dict[str, Any]:
        """Fallback UDP ping using datagram sockets"""
    async def _udp_ping_fallback(
        self,
        target: str,
        port: int,
        count: int,
        timeout: int
    ) -> Dict[str, Any]:
        """Fallback UDP ping using datagram sockets"""
        results = []
        
        for i in range(count):
            start_time = time.time()
            try:
                # Create UDP socket
                loop = asyncio.get_event_loop()
                transport, protocol = await loop.create_datagram_endpoint(
                    lambda: asyncio.DatagramProtocol(),
                    remote_addr=(target, port)
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
            'target': target,
            'port': port,
            'count': count,
            'results': results,
            'note': 'Fallback mode - UDP is connectionless, these are send confirmations',
            'timestamp': datetime.now().isoformat()
        }
    
    def _parse_hping_output(
        self,
        output: str,
        protocol: str,
        target: str,
        port: int,
        count: int
    ) -> Dict[str, Any]:
        """Parse hping3 output to extract statistics and packet information"""
        try:
            lines = output.split('\n')
            
            # Parse detailed packet information
            results = []
            seq = 0
            
            for i, line in enumerate(lines):
                if 'flags=' in line:
                    # Extract packet details from hping3 output
                    packet_info = {'seq': seq + 1, 'status': 'success'}
                    
                    # TTL is usually in the previous line (e.g., "len=44 ip=8.8.8.8 ttl=118...")
                    if i > 0:
                        prev_line = lines[i - 1]
                        ttl_match = re.search(r'ttl=(\d+)', prev_line)
                        if ttl_match:
                            packet_info['ttl'] = int(ttl_match.group(1))
                        
                        # IP ID also in previous line
                        id_match = re.search(r'id=(\d+)', prev_line)
                        if id_match:
                            packet_info['ip_id'] = int(id_match.group(1))
                    
                    # Flags in current line
                    flags_match = re.search(r'flags=([A-Z]+)', line)
                    if flags_match:
                        packet_info['flags'] = flags_match.group(1)
                    
                    # RTT in current line
                    rtt_match = re.search(r'rtt=([\d.]+)', line)
                    if rtt_match:
                        packet_info['time_ms'] = float(rtt_match.group(1))
                    
                    # Window size in current line
                    win_match = re.search(r'win=(\d+)', line)
                    if win_match:
                        packet_info['window'] = int(win_match.group(1))
                    
                    # Next line often contains seq/ack for TCP
                    if i + 1 < len(lines) and 'seq=' in lines[i + 1]:
                        seq_match = re.search(r'seq=(\d+)', lines[i + 1])
                        ack_match = re.search(r'ack=(\d+)', lines[i + 1])
                        if seq_match:
                            packet_info['tcp_seq'] = int(seq_match.group(1))
                        if ack_match:
                            packet_info['tcp_ack'] = int(ack_match.group(1))
                    
                    results.append(packet_info)
                    seq += 1
            
            successful = len(results)
            failed = count - successful
            
            # Extract RTT times
            rtt_times = [r['time_ms'] for r in results if 'time_ms' in r]
            
            result = {
                'protocol': protocol,
                'target': target,
                'port': port,
                'count': count,
                'successful': successful,
                'failed': failed,
                'packet_loss': round((failed / count) * 100, 2) if count > 0 else 0,
                'results': results,
                'raw_output': output,
                'timestamp': datetime.now().isoformat()
            }
            
            if rtt_times:
                result['min_ms'] = round(min(rtt_times), 2)
                result['max_ms'] = round(max(rtt_times), 2)
                result['avg_ms'] = round(sum(rtt_times) / len(rtt_times), 2)
            
            return result
            
        except Exception as e:
            return {
                'protocol': protocol,
                'target': target,
                'port': port,
                'status': 'parse_error',
                'error': str(e),
                'raw_output': output,
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
        validated_target = validate_ip_or_hostname(target)
        
        # Validate port
        validated_port = validate_port(port)
        
        # Validate numeric parameters
        count = max(1, min(100, count))
        timeout = validate_timeout(timeout, 1, 30)
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

    async def dns_ping(
        self,
        target: str,
        port: int = 53,
        count: int = 4,
        timeout: int = 5
    ) -> Dict[str, Any]:
        """
        Perform DNS query ping to test DNS server responsiveness
        
        Args:
            target: DNS server IP or hostname
            port: DNS port (default 53)
            count: Number of queries
            timeout: Timeout in seconds
            
        Returns:
            Dictionary with ping results
        """
        # Validate target
        validated_target = validate_ip_or_hostname(target)
        
        # Validate port
        validated_port = validate_port(port)
        
        # Validate numeric parameters
        count = max(1, min(100, count))
        timeout = validate_timeout(timeout, 1, 30)
        
        results = []
        successful = 0
        failed = 0
        min_time = float('inf')
        max_time = 0
        total_time = 0
        
        for i in range(count):
            start_time = time.time()
            try:
                # Use dig for DNS queries
                cmd = [
                    'dig',
                    f'@{validated_target}',
                    '-p', str(validated_port),
                    '+time=' + str(timeout),
                    '+tries=1',
                    'google.com',  # Test query
                    '+short'
                ]
                
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout + 1
                )
                
                elapsed = (time.time() - start_time) * 1000
                response = stdout.decode('utf-8').strip()
                
                if response and process.returncode == 0:
                    results.append({
                        'seq': i + 1,
                        'status': 'success',
                        'time_ms': round(elapsed, 2),
                        'response': response[:50]  # First 50 chars of response
                    })
                    successful += 1
                    total_time += elapsed
                    min_time = min(min_time, elapsed)
                    max_time = max(max_time, elapsed)
                else:
                    results.append({
                        'seq': i + 1,
                        'status': 'failed',
                        'error': 'No response'
                    })
                    failed += 1
                
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
            'protocol': 'DNS',
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
            protocol: Protocol type (icmp, tcp, udp, http, dns)
            port: Port number (required for tcp, udp, http, dns)
            count: Number of pings
            timeout: Timeout in seconds
            packet_size: Packet size for ICMP
            use_https: Use HTTPS for HTTP pings
            
        Returns:
            Dictionary with ping results
        """
        protocol = protocol.lower()
        
        # Validate protocol
        if protocol not in ['icmp', 'tcp', 'udp', 'http', 'dns']:
            raise ValueError(f"Unsupported protocol: {protocol}. Use: icmp, tcp, udp, http, or dns")
        
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
        elif protocol == 'dns':
            if port is None:
                port = 53
            return await self.dns_ping(target, port, count, timeout)
        else:
            raise ValueError(f"Unsupported protocol: {protocol}")
    
    async def _run_traceroute(
        self,
        target: str,
        protocol: str,
        port: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Run traceroute and return list of hops.
        Uses hping3 for TCP/UDP, system traceroute for ICMP/HTTP/DNS.
        """
        hops = []
        
        if protocol == 'tcp':
            if port is None:
                raise ValueError("Port is required for TCP")
            validated_port = validate_port(port)
            trace_cmd = ['hping3', '--traceroute', '-S', '-p', str(validated_port), '-c', '30', '-V', target]
        elif protocol == 'udp':
            if port is None:
                raise ValueError("Port is required for UDP")
            validated_port = validate_port(port)
            trace_cmd = ['hping3', '--traceroute', '--udp', '-p', str(validated_port), '-c', '30', '-V', target]
        else:
            # Use system traceroute for ICMP, HTTP, DNS
            trace_cmd = ['traceroute', '-n', '-m', '30', '-w', '2', target]
        
        try:
            process = await asyncio.create_subprocess_exec(
                *trace_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT
            )
            
            stdout, _ = await asyncio.wait_for(process.communicate(), timeout=60)
            output = stdout.decode('utf-8')
            
            for line in output.split('\n'):
                # Parse hping3 traceroute output
                hop_match = re.search(r'hop=(\d+)\s+TTL\s+\d+\s+during transit from ip=([\d.]+)', line)
                if hop_match:
                    hop_num = int(hop_match.group(1))
                    hop_ip = hop_match.group(2)
                    hops.append({'hop': hop_num, 'ip': hop_ip, 'rtt_ms': None, 'status': 'transit'})
                
                # Parse hping3 hop RTT: "hop=1 hoprtt=1.9 ms"
                hoprtt_match = re.search(r'hop=(\d+)\s+hoprtt=([\d.]+)\s*ms', line)
                if hoprtt_match:
                    hop_num = int(hoprtt_match.group(1))
                    hop_rtt = float(hoprtt_match.group(2))
                    for h in hops:
                        if h['hop'] == hop_num:
                            h['rtt_ms'] = hop_rtt
                
                # Parse system traceroute output: "1  192.168.1.1  1.234 ms"
                sys_hop_match = re.match(r'\s*(\d+)\s+(\d+\.\d+\.\d+\.\d+)\s+([\d.]+)\s*ms', line)
                if sys_hop_match:
                    hops.append({
                        'hop': int(sys_hop_match.group(1)),
                        'ip': sys_hop_match.group(2),
                        'rtt_ms': float(sys_hop_match.group(3)),
                        'status': 'success'
                    })
                
                # Parse timeout hops: "2  * * *"
                timeout_match = re.match(r'\s*(\d+)\s+\*', line)
                if timeout_match and not sys_hop_match:
                    hops.append({
                        'hop': int(timeout_match.group(1)),
                        'ip': None,
                        'rtt_ms': None,
                        'status': 'timeout'
                    })
            
            # Add destination marker
            if hops:
                hops.append({'hop': max(h['hop'] for h in hops) + 1, 'ip': target, 'rtt_ms': None, 'status': 'destination'})
            
        except asyncio.TimeoutError:
            hops.append({'hop': 0, 'ip': None, 'rtt_ms': None, 'status': 'error', 'error': 'Traceroute timed out'})
        except Exception as e:
            hops.append({'hop': 0, 'ip': None, 'rtt_ms': None, 'status': 'error', 'error': str(e)})
        
        return hops
    
    async def _run_probe(
        self,
        target: str,
        protocol: str,
        port: Optional[int] = None,
        count: int = 4,
        timeout: int = 5,
        packet_size: int = 56,
        use_https: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Run packet probe and return list of packet results.
        Uses hping3 for TCP/UDP, advanced_ping for others.
        """
        packets = []
        
        if protocol == 'tcp' or protocol == 'udp':
            if protocol == 'tcp':
                if port is None:
                    raise ValueError("Port is required for TCP ping")
                validated_port = validate_port(port)
                cmd = ['hping3', '-S', '-p', str(validated_port), '-c', str(count), '-V', target]
            else:  # udp
                if port is None:
                    raise ValueError("Port is required for UDP ping")
                validated_port = validate_port(port)
                cmd = ['hping3', '--udp', '-p', str(validated_port), '-c', str(count), '-V', target]
            
            try:
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT
                )
                
                stdout, _ = await asyncio.wait_for(process.communicate(), timeout=timeout * count + 10)
                output = stdout.decode('utf-8')
                lines = output.split('\n')
                
                seq = 0
                for i, line in enumerate(lines):
                    if 'flags=' in line:
                        packet_info = {'seq': seq + 1, 'status': 'success'}
                        
                        # Look for TTL in previous line
                        if i > 0:
                            prev_line = lines[i - 1]
                            ttl_match = re.search(r'ttl=(\d+)', prev_line)
                            if ttl_match:
                                packet_info['ttl'] = int(ttl_match.group(1))
                            id_match = re.search(r'id=(\d+)', prev_line)
                            if id_match:
                                packet_info['ip_id'] = int(id_match.group(1))
                        
                        # Parse current line
                        flags_match = re.search(r'flags=([A-Z]+)', line)
                        if flags_match:
                            packet_info['flags'] = flags_match.group(1)
                        
                        rtt_match = re.search(r'rtt=([\d.]+)', line)
                        if rtt_match:
                            packet_info['time_ms'] = float(rtt_match.group(1))
                        
                        win_match = re.search(r'win=(\d+)', line)
                        if win_match:
                            packet_info['window'] = int(win_match.group(1))
                        
                        packets.append(packet_info)
                        seq += 1
                        
            except asyncio.TimeoutError:
                packets.append({'seq': 0, 'status': 'error', 'error': 'Probe timed out'})
            except Exception as e:
                packets.append({'seq': 0, 'status': 'error', 'error': str(e)})
        
        else:
            # For HTTP, ICMP, DNS - use advanced_ping
            result = await self.advanced_ping(target, protocol, port, count, timeout, packet_size, use_https)
            if result.get('results'):
                packets = result['results']
        
        return packets
    
    async def parallel_ping(
        self,
        target: str,
        protocol: str = 'icmp',
        port: Optional[int] = None,
        count: int = 4,
        timeout: int = 5,
        packet_size: int = 56,
        use_https: bool = False,
        include_route: bool = False
    ) -> Dict[str, Any]:
        """
        Run traceroute and probe in parallel for faster results.
        Returns complete results in one response.
        
        Args:
            include_route: If True, run traceroute in parallel with probe
        
        Returns:
            Dictionary with 'hops' (if include_route) and 'packets' lists
        """
        protocol = protocol.lower()
        validated_target = validate_ip_or_hostname(target)
        
        result = {
            'target': validated_target,
            'protocol': protocol,
            'port': port,
            'hops': [],
            'packets': [],
            'timestamp': datetime.now().isoformat()
        }
        
        if include_route:
            # Run both in parallel
            trace_task = asyncio.create_task(
                self._run_traceroute(validated_target, protocol, port)
            )
            probe_task = asyncio.create_task(
                self._run_probe(validated_target, protocol, port, count, timeout, packet_size, use_https)
            )
            
            # Wait for both to complete
            hops, packets = await asyncio.gather(trace_task, probe_task)
            result['hops'] = hops
            result['packets'] = packets
        else:
            # Only run probe
            packets = await self._run_probe(validated_target, protocol, port, count, timeout, packet_size, use_https)
            result['packets'] = packets
        
        # Calculate statistics
        successful = len([p for p in result['packets'] if p.get('status') == 'success'])
        failed = len(result['packets']) - successful
        rtts = [p['time_ms'] for p in result['packets'] if p.get('time_ms')]
        
        result['count'] = count
        result['successful'] = successful
        result['failed'] = failed
        result['packet_loss'] = round((failed / count) * 100, 2) if count > 0 else 0
        if rtts:
            result['min_ms'] = round(min(rtts), 2)
            result['max_ms'] = round(max(rtts), 2)
            result['avg_ms'] = round(sum(rtts) / len(rtts), 2)
        
        return result


# Global service instance
ping_service = PingService()
