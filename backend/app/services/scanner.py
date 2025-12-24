"""
Network scanning and discovery service
"""

import asyncio
import subprocess
import json
import ipaddress
import socket
from typing import List, Dict, Any, Optional
from datetime import datetime
import xml.etree.ElementTree as ET
import logging

logger = logging.getLogger(__name__)

class NetworkScanner:
    """Network scanning and discovery service"""
    
    def __init__(self):
        self.scan_results = {}
        
    async def ping_sweep(self, network: str) -> List[str]:
        """Perform ping sweep to discover live hosts"""
        try:
            # Use nmap for ping sweep
            cmd = ["nmap", "-sn", network]
            result = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await result.communicate()
            
            if result.returncode == 0:
                output = stdout.decode()
                hosts = []
                for line in output.split('\n'):
                    if "Nmap scan report for" in line:
                        # Extract IP address
                        parts = line.split()
                        if len(parts) >= 5:
                            ip = parts[-1].strip('()')
                            hosts.append(ip)
                return hosts
            else:
                logger.error(f"Ping sweep failed: {stderr.decode()}")
                return []
                
        except Exception as e:
            logger.error(f"Error in ping sweep: {str(e)}")
            return []
    
    async def port_scan(self, host: str, ports: str = "1-1000") -> Dict[str, Any]:
        """Perform port scan on a host"""
        try:
            cmd = ["nmap", "-sS", "-p", ports, "-oX", "-", host]
            result = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await result.communicate()
            
            if result.returncode == 0:
                return self._parse_nmap_xml(stdout.decode())
            else:
                logger.error(f"Port scan failed: {stderr.decode()}")
                return {"error": stderr.decode()}
                
        except Exception as e:
            logger.error(f"Error in port scan: {str(e)}")
            return {"error": str(e)}
    
    async def service_detection(self, host: str, ports: List[int]) -> Dict[str, Any]:
        """Perform service detection on specific ports"""
        try:
            port_list = ",".join(map(str, ports))
            cmd = ["nmap", "-sV", "-p", port_list, "-oX", "-", host]
            result = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await result.communicate()
            
            if result.returncode == 0:
                return self._parse_nmap_xml(stdout.decode())
            else:
                logger.error(f"Service detection failed: {stderr.decode()}")
                return {"error": stderr.decode()}
                
        except Exception as e:
            logger.error(f"Error in service detection: {str(e)}")
            return {"error": str(e)}
    
    async def os_detection(self, host: str) -> Dict[str, Any]:
        """Perform OS detection"""
        try:
            cmd = ["nmap", "-O", "-oX", "-", host]
            result = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await result.communicate()
            
            if result.returncode == 0:
                return self._parse_nmap_xml(stdout.decode())
            else:
                logger.error(f"OS detection failed: {stderr.decode()}")
                return {"error": stderr.decode()}
                
        except Exception as e:
            logger.error(f"Error in OS detection: {str(e)}")
            return {"error": str(e)}
    
    async def vulnerability_scan(self, host: str) -> Dict[str, Any]:
        """Perform basic vulnerability scanning"""
        try:
            cmd = ["nmap", "--script", "vuln", "-oX", "-", host]
            result = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await result.communicate()
            
            if result.returncode == 0:
                return self._parse_nmap_xml(stdout.decode())
            else:
                logger.error(f"Vulnerability scan failed: {stderr.decode()}")
                return {"error": stderr.decode()}
                
        except Exception as e:
            logger.error(f"Error in vulnerability scan: {str(e)}")
            return {"error": str(e)}
    
    async def comprehensive_scan(self, host: str) -> Dict[str, Any]:
        """Perform comprehensive scan including ports, services, and OS"""
        try:
            cmd = ["nmap", "-sS", "-sV", "-O", "-A", "--script", "default", "-oX", "-", host]
            result = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await result.communicate()
            
            if result.returncode == 0:
                return self._parse_nmap_xml(stdout.decode())
            else:
                logger.error(f"Comprehensive scan failed: {stderr.decode()}")
                return {"error": stderr.decode()}
                
        except Exception as e:
            logger.error(f"Error in comprehensive scan: {str(e)}")
            return {"error": str(e)}
    
    def _parse_nmap_xml(self, xml_output: str) -> Dict[str, Any]:
        """Parse nmap XML output"""
        try:
            root = ET.fromstring(xml_output)
            result = {
                "scan_time": datetime.now().isoformat(),
                "hosts": []
            }
            
            for host in root.findall("host"):
                host_info = {
                    "addresses": [],
                    "hostnames": [],
                    "ports": [],
                    "os": {},
                    "scripts": []
                }
                
                # Extract addresses
                for address in host.findall("address"):
                    host_info["addresses"].append({
                        "addr": address.get("addr"),
                        "addrtype": address.get("addrtype")
                    })
                
                # Extract hostnames
                hostnames = host.find("hostnames")
                if hostnames is not None:
                    for hostname in hostnames.findall("hostname"):
                        host_info["hostnames"].append({
                            "name": hostname.get("name"),
                            "type": hostname.get("type")
                        })
                
                # Extract ports
                ports = host.find("ports")
                if ports is not None:
                    for port in ports.findall("port"):
                        port_info = {
                            "portid": port.get("portid"),
                            "protocol": port.get("protocol"),
                            "state": port.find("state").get("state") if port.find("state") is not None else "unknown"
                        }
                        
                        # Service information
                        service = port.find("service")
                        if service is not None:
                            port_info["service"] = {
                                "name": service.get("name"),
                                "product": service.get("product"),
                                "version": service.get("version"),
                                "extrainfo": service.get("extrainfo")
                            }
                        
                        host_info["ports"].append(port_info)
                
                # Extract OS information
                os_elem = host.find("os")
                if os_elem is not None:
                    osmatch = os_elem.find("osmatch")
                    if osmatch is not None:
                        host_info["os"] = {
                            "name": osmatch.get("name"),
                            "accuracy": osmatch.get("accuracy")
                        }
                
                # Extract script results
                hostscript = host.find("hostscript")
                if hostscript is not None:
                    for script in hostscript.findall("script"):
                        host_info["scripts"].append({
                            "id": script.get("id"),
                            "output": script.get("output")
                        })
                
                result["hosts"].append(host_info)
            
            return result
            
        except ET.ParseError as e:
            logger.error(f"Error parsing nmap XML: {str(e)}")
            return {"error": f"XML parse error: {str(e)}"}
        except Exception as e:
            logger.error(f"Error processing nmap results: {str(e)}")
            return {"error": str(e)}
    
    async def discover_network(self, network: str) -> Dict[str, Any]:
        """Discover all hosts in a network"""
        try:
            # Validate network
            ipaddress.ip_network(network, strict=False)
            
            # Perform ping sweep
            live_hosts = await self.ping_sweep(network)
            
            result = {
                "network": network,
                "scan_time": datetime.now().isoformat(),
                "total_hosts": len(live_hosts),
                "hosts": []
            }
            
            # Perform basic scan on each live host
            for host in live_hosts:
                try:
                    host_result = await self.port_scan(host, "1-1000")
                    if "error" not in host_result:
                        result["hosts"].extend(host_result.get("hosts", []))
                except Exception as e:
                    logger.error(f"Error scanning host {host}: {str(e)}")
            
            return result
            
        except ValueError as e:
            return {"error": f"Invalid network: {str(e)}"}
        except Exception as e:
            logger.error(f"Error in network discovery: {str(e)}")
            return {"error": str(e)}
    
    async def test_connectivity(self, host: str, port: int, timeout: int = 5) -> bool:
        """Test connectivity to a specific host and port"""
        try:
            future = asyncio.open_connection(host, port)
            reader, writer = await asyncio.wait_for(future, timeout=timeout)
            writer.close()
            await writer.wait_closed()
            return True
        except Exception:
            return False
    
    async def banner_grab(self, host: str, port: int, timeout: int = 5) -> Optional[str]:
        """Grab banner from a service"""
        try:
            future = asyncio.open_connection(host, port)
            reader, writer = await asyncio.wait_for(future, timeout=timeout)
            
            # Try to read banner
            banner = await asyncio.wait_for(reader.read(1024), timeout=2)
            
            writer.close()
            await writer.wait_closed()
            
            return banner.decode('utf-8', errors='ignore').strip()
        except Exception as e:
            logger.debug(f"Banner grab failed for {host}:{port}: {str(e)}")
            return None

# Global scanner instance
scanner = NetworkScanner()