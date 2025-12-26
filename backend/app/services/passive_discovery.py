"""
Passive Discovery Service for Network Observatory Platform

Monitors network for devices using passive techniques:
- ARP table monitoring
- DHCP lease parsing
- MAC vendor lookup
"""

import asyncio
import re
import logging
import aiohttp
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


class PassiveDiscoveryService:
    """
    Passive network discovery using ARP and DHCP.
    
    This service discovers network devices without sending any probes,
    making it suitable for stealth monitoring or networks where
    active scanning is not desired.
    """
    
    # OUI lookup cache
    _vendor_cache: Dict[str, str] = {}
    
    def __init__(self):
        self._running = False
        self._last_arp_scan = None
        self._last_dhcp_scan = None
    
    async def scan_arp_table(self) -> List[Dict[str, Any]]:
        """
        Parse /proc/net/arp for discovered hosts.
        
        The ARP table contains entries for all hosts that this machine
        has recently communicated with at Layer 2.
        
        Returns:
            List of discovered host information
        """
        discovered = []
        arp_path = Path('/proc/net/arp')
        
        try:
            if not arp_path.exists():
                logger.debug("ARP table not available at /proc/net/arp")
                return discovered
            
            content = arp_path.read_text()
            lines = content.strip().split('\n')[1:]  # Skip header
            
            for line in lines:
                parts = line.split()
                if len(parts) >= 4:
                    ip = parts[0]
                    hw_type = parts[1]
                    flags = parts[2]
                    mac = parts[3].upper()
                    
                    # Skip incomplete entries and invalid MACs
                    if mac == "00:00:00:00:00:00" or flags == "0x0":
                        continue
                    
                    discovered.append({
                        "ip_address": ip,
                        "mac_address": mac,
                        "discovery_method": "arp",
                        "discovered_at": datetime.utcnow(),
                        "hw_type": hw_type,
                        "flags": flags
                    })
            
            self._last_arp_scan = datetime.utcnow()
            logger.info(f"ARP scan found {len(discovered)} hosts")
            
        except PermissionError:
            logger.warning("Permission denied reading ARP table")
        except Exception as e:
            logger.error(f"Error reading ARP table: {e}")
        
        return discovered
    
    async def parse_dhcp_leases(
        self, 
        lease_files: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Parse DHCP lease files for discovered hosts.
        
        Supports multiple common DHCP server formats:
        - ISC DHCP Server
        - dnsmasq
        
        Args:
            lease_files: List of paths to check. If None, uses common defaults.
        
        Returns:
            List of discovered host information
        """
        if lease_files is None:
            lease_files = [
                "/var/lib/dhcp/dhcpd.leases",       # ISC DHCP
                "/var/lib/misc/dnsmasq.leases",     # dnsmasq
                "/var/lib/dhcpd/dhcpd.leases",      # Alternative ISC path
                "/var/lib/NetworkManager/dnsmasq-*.leases",  # NetworkManager
            ]
        
        discovered = []
        
        for lease_file in lease_files:
            try:
                path = Path(lease_file)
                if not path.exists():
                    continue
                
                content = path.read_text()
                
                if "dnsmasq" in str(lease_file):
                    # dnsmasq format: timestamp mac ip hostname client-id
                    discovered.extend(self._parse_dnsmasq_leases(content))
                else:
                    # ISC DHCP format
                    discovered.extend(self._parse_isc_leases(content))
                
                logger.info(f"Parsed {len(discovered)} entries from {lease_file}")
                
            except PermissionError:
                logger.debug(f"Permission denied reading {lease_file}")
            except FileNotFoundError:
                continue
            except Exception as e:
                logger.debug(f"Could not parse {lease_file}: {e}")
        
        self._last_dhcp_scan = datetime.utcnow()
        return discovered
    
    def _parse_isc_leases(self, content: str) -> List[Dict[str, Any]]:
        """Parse ISC DHCP Server lease format"""
        discovered = []
        
        # Match lease blocks
        lease_pattern = r'lease\s+([\d.]+)\s*\{([^}]+)\}'
        
        for match in re.finditer(lease_pattern, content, re.MULTILINE | re.DOTALL):
            ip = match.group(1)
            lease_data = match.group(2)
            
            # Extract fields
            mac_match = re.search(r'hardware\s+ethernet\s+([a-fA-F0-9:]+)', lease_data)
            hostname_match = re.search(r'client-hostname\s+"([^"]+)"', lease_data)
            starts_match = re.search(r'starts\s+\d+\s+([\d/:\s]+)', lease_data)
            ends_match = re.search(r'ends\s+\d+\s+([\d/:\s]+)', lease_data)
            
            if mac_match:
                entry = {
                    "ip_address": ip,
                    "mac_address": mac_match.group(1).upper(),
                    "hostname": hostname_match.group(1) if hostname_match else None,
                    "discovery_method": "dhcp",
                    "discovered_at": datetime.utcnow()
                }
                
                if starts_match:
                    entry["lease_start"] = starts_match.group(1).strip()
                if ends_match:
                    entry["lease_end"] = ends_match.group(1).strip()
                
                discovered.append(entry)
        
        return discovered
    
    def _parse_dnsmasq_leases(self, content: str) -> List[Dict[str, Any]]:
        """Parse dnsmasq lease format"""
        discovered = []
        
        for line in content.strip().split('\n'):
            parts = line.split()
            if len(parts) >= 4:
                timestamp, mac, ip, hostname = parts[:4]
                
                discovered.append({
                    "ip_address": ip,
                    "mac_address": mac.upper(),
                    "hostname": hostname if hostname != "*" else None,
                    "discovery_method": "dhcp",
                    "discovered_at": datetime.utcnow(),
                    "lease_timestamp": int(timestamp)
                })
        
        return discovered
    
    async def get_mac_vendor(self, mac_address: str) -> Optional[str]:
        """
        Lookup MAC vendor from OUI database.
        
        Uses local cache first, then falls back to online API.
        
        Args:
            mac_address: MAC address in format XX:XX:XX:XX:XX:XX
        
        Returns:
            Vendor name or None if not found
        """
        # Normalize MAC
        mac = mac_address.upper().replace("-", ":")
        oui = mac[:8]  # First 3 octets
        
        # Check cache
        if oui in self._vendor_cache:
            return self._vendor_cache[oui]
        
        # Try online lookup (with timeout)
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"https://api.macvendors.com/{oui}",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 200:
                        vendor = await response.text()
                        self._vendor_cache[oui] = vendor
                        return vendor
        except asyncio.TimeoutError:
            logger.debug(f"MAC vendor lookup timed out for {oui}")
        except Exception as e:
            logger.debug(f"MAC vendor lookup failed for {oui}: {e}")
        
        return None
    
    async def discover_all(self) -> List[Dict[str, Any]]:
        """
        Run all passive discovery methods and combine results.
        
        Returns:
            Combined list of discovered hosts with duplicates merged
        """
        # Run scans in parallel
        arp_results, dhcp_results = await asyncio.gather(
            self.scan_arp_table(),
            self.parse_dhcp_leases(),
            return_exceptions=True
        )
        
        # Handle errors
        if isinstance(arp_results, Exception):
            logger.error(f"ARP scan failed: {arp_results}")
            arp_results = []
        if isinstance(dhcp_results, Exception):
            logger.error(f"DHCP scan failed: {dhcp_results}")
            dhcp_results = []
        
        # Merge results by IP address
        hosts: Dict[str, Dict[str, Any]] = {}
        
        for host in arp_results + dhcp_results:
            ip = host["ip_address"]
            if ip in hosts:
                # Merge data, preferring non-None values
                existing = hosts[ip]
                for key, value in host.items():
                    if value is not None and (key not in existing or existing[key] is None):
                        existing[key] = value
                # Track all discovery methods
                if "discovery_methods" not in existing:
                    existing["discovery_methods"] = set()
                existing["discovery_methods"].add(host["discovery_method"])
            else:
                host["discovery_methods"] = {host["discovery_method"]}
                hosts[ip] = host
        
        # Convert sets to lists for JSON serialization
        result = []
        for host in hosts.values():
            host["discovery_methods"] = list(host["discovery_methods"])
            result.append(host)
        
        # Enrich with vendor information (limit concurrent lookups)
        semaphore = asyncio.Semaphore(5)
        
        async def enrich_host(host: Dict[str, Any]) -> None:
            if host.get("mac_address"):
                async with semaphore:
                    vendor = await self.get_mac_vendor(host["mac_address"])
                    if vendor:
                        host["vendor"] = vendor
        
        await asyncio.gather(*[enrich_host(host) for host in result])
        
        logger.info(f"Passive discovery found {len(result)} unique hosts")
        return result
    
    async def start_background_discovery(
        self, 
        interval: int = 60,
        callback: Optional[callable] = None
    ) -> None:
        """
        Start continuous background discovery.
        
        Args:
            interval: Seconds between discovery runs
            callback: Optional async function to call with results
        """
        self._running = True
        logger.info(f"Starting background passive discovery (interval: {interval}s)")
        
        while self._running:
            try:
                results = await self.discover_all()
                if callback:
                    await callback(results)
            except Exception as e:
                logger.error(f"Background discovery error: {e}")
            
            await asyncio.sleep(interval)
    
    def stop_background_discovery(self) -> None:
        """Stop background discovery"""
        self._running = False
        logger.info("Stopping background passive discovery")


# Global service instance
passive_discovery = PassiveDiscoveryService()
