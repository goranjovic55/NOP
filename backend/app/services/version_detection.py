"""
Version Detection Service using nmap -sV
"""

import asyncio
import ipaddress
import logging
import re
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, field_validator, ValidationError

from app.models.asset import Asset

logger = logging.getLogger(__name__)


class ServiceInfo(BaseModel):
    """Pydantic model for service version data validation"""
    port: int
    protocol: str
    service: str
    product: str = ""
    version: str = ""
    extrainfo: str = ""
    ostype: str = ""
    cpe: List[str] = []
    
    @field_validator('port')
    @classmethod
    def validate_port(cls, v: int) -> int:
        if not (1 <= v <= 65535):
            raise ValueError(f"Port must be between 1 and 65535, got {v}")
        return v
    
    @field_validator('protocol')
    @classmethod
    def validate_protocol(cls, v: str) -> str:
        allowed = ['tcp', 'udp', 'sctp']
        if v.lower() not in allowed:
            raise ValueError(f"Protocol must be one of {allowed}, got {v}")
        return v.lower()


class VersionDetectionService:
    """Service for detecting service versions using nmap"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def detect_versions(self, host: str, ports: Optional[List[int]] = None) -> Dict[str, Any]:
        """
        Detect service versions on target host
        
        Args:
            host: Target IP address
            ports: Optional list of specific ports to scan
            
        Returns:
            Dict with detected services and version info
        """
        try:
            # Validate IP address to prevent command injection
            try:
                ipaddress.ip_address(host)
            except ValueError:
                logger.error(f"Invalid IP address format: {host}")
                return {"error": "Invalid IP address format"}
            
            # Validate ports to prevent command injection
            if ports:
                for port in ports:
                    if not isinstance(port, int) or not (1 <= port <= 65535):
                        logger.error(f"Invalid port number: {port}")
                        return {"error": f"Invalid port number: {port}"}
            
            # Build nmap command with explicit arguments (shell=False)
            cmd = ["nmap", "-sV", "-Pn"]
            
            if ports:
                port_list = ",".join(map(str, ports))
                cmd.extend(["-p", port_list])
            
            cmd.extend(["-oX", "-", host])
            
            logger.info(f"Running version detection: {' '.join(cmd)}")
            
            # Execute nmap with timeout (shell=False for security)
            result = await asyncio.wait_for(
                asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                ),
                timeout=300.0  # 5 minutes max
            )
            stdout, stderr = await asyncio.wait_for(
                result.communicate(),
                timeout=300.0
            )
            
            if result.returncode != 0:
                logger.error(f"nmap version detection failed: {stderr.decode()}")
                return {"error": stderr.decode()}
            
            # Parse XML output
            xml_output = stdout.decode()
            services = self._extract_services_from_xml(xml_output)
            
            # Update asset in database
            await self._update_asset_services(host, services)
            
            return {
                "host": host,
                "services": services,
                "scanned_ports": len(services)
            }
            
        except Exception as e:
            logger.error(f"Error in version detection for {host}: {str(e)}")
            return {"error": str(e)}
    
    def _extract_services_from_xml(self, xml_output: str) -> List[Dict[str, Any]]:
        """
        Extract service information from nmap XML output
        
        Returns:
            List of service dicts with port, protocol, service, version, cpe
        """
        services = []
        
        try:
            root = ET.fromstring(xml_output)
            
            for host in root.findall(".//host"):
                for port in host.findall(".//port"):
                    port_id = port.get("portid")
                    protocol = port.get("protocol", "tcp")
                    
                    # Get state
                    state = port.find("state")
                    if state is None or state.get("state") != "open":
                        continue
                    
                    # Get service info
                    service_elem = port.find("service")
                    if service_elem is None:
                        continue
                    
                    service_name = service_elem.get("name", "unknown")
                    product = service_elem.get("product", "")
                    version = service_elem.get("version", "")
                    extrainfo = service_elem.get("extrainfo", "")
                    ostype = service_elem.get("ostype", "")
                    
                    # Extract CPE identifiers
                    cpe_list = []
                    for cpe in service_elem.findall("cpe"):
                        cpe_uri = cpe.text
                        if cpe_uri:
                            cpe_list.append(cpe_uri)
                    
                    # Build service dict
                    service_data = {
                        "port": int(port_id),
                        "protocol": protocol,
                        "service": service_name,
                        "product": product,
                        "version": version,
                        "extrainfo": extrainfo,
                        "ostype": ostype,
                        "cpe": cpe_list
                    }
                    
                    # Validate with Pydantic
                    try:
                        validated_service = ServiceInfo(**service_data)
                        services.append(validated_service.model_dump())
                    except ValidationError as e:
                        logger.warning(f"Service validation failed for port {port_id}: {e}")
                        continue
            
            logger.info(f"Extracted {len(services)} services from nmap output")
            
        except Exception as e:
            logger.error(f"Error parsing nmap XML: {str(e)}")
        
        return services
    
    async def _update_asset_services(self, host: str, services: List[Dict[str, Any]]):
        """Update asset's services field in database"""
        try:
            # Find asset by IP using host() function to extract IP without CIDR suffix
            from sqlalchemy import func
            result = await self.db.execute(
                select(Asset).where(func.host(Asset.ip_address) == host)
            )
            asset = result.scalar_one_or_none()
            
            if asset:
                # Update services field
                asset.services = services
                await self.db.commit()
                logger.info(f"Updated services for asset {host}")
            else:
                logger.warning(f"Asset {host} not found in database")
                
        except Exception as e:
            logger.error(f"Error updating asset services: {str(e)}")
            await self.db.rollback()
    
    def extract_cpe_from_service(self, service: Dict[str, Any]) -> List[str]:
        """Extract CPE identifiers from service data"""
        return service.get("cpe", [])
    
    def build_product_query(self, service: Dict[str, Any]) -> Optional[Dict[str, str]]:
        """
        Build product/version query from service data
        Maps nmap product names to NVD CPE names
        
        Returns:
            Dict with vendor, product, version or None
        """
        nmap_product = service.get("product", "").lower()
        version = service.get("version", "")
        
        if not nmap_product or not version:
            return None
        
        # Product name mapping: nmap -> (vendor, cpe_product)
        product_map = {
            "apache httpd": ("apache", "http_server"),
            "apache": ("apache", "http_server"),
            "nginx": ("nginx", "nginx"),
            "openssh": ("openbsd", "openssh"),
            "microsoft-iis": ("microsoft", "internet_information_services"),
            "iis": ("microsoft", "internet_information_services"),
            "mysql": ("mysql", "mysql"),
            "mariadb": ("mariadb", "mariadb"),
            "postgresql": ("postgresql", "postgresql"),
            "vsftpd": ("vsftpd_project", "vsftpd"),
            "proftpd": ("proftpd", "proftpd"),
        }
        
        # Try exact match first
        if nmap_product in product_map:
            vendor, product = product_map[nmap_product]
        else:
            # Try partial match
            vendor = None
            product = nmap_product
            for key, (v, p) in product_map.items():
                if key in nmap_product:
                    vendor, product = v, p
                    break
        
        return {
            "vendor": vendor,
            "product": product,
            "version": version
        }
