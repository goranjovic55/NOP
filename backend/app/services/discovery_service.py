"""
Discovery service for managing network scans and updating assets
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Dict, Any, List
import logging
import uuid
from datetime import datetime
import ipaddress

from app.models.asset import Asset, AssetStatus, AssetType
from app.services.scanner import scanner
from app.schemas.asset import AssetCreate

logger = logging.getLogger(__name__)

class DiscoveryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def process_scan_results(self, results: Dict[str, Any], is_full_network_scan: bool = True):
        """Process nmap scan results and update assets in database"""
        if "hosts" not in results:
            logger.warning("No hosts found in scan results")
            return

        # Get all assets to check for existence
        result = await self.db.execute(select(Asset))
        all_assets = result.scalars().all()

        found_ips = set()
        for host_data in results["hosts"]:
            ip_address = None
            for addr in host_data.get("addresses", []):
                if addr.get("addrtype") == "ipv4":
                    ip_address = addr.get("addr")
                    break

            if not ip_address:
                continue

            found_ips.add(ip_address)

            # Check if asset exists
            asset = None
            for a in all_assets:
                if str(a.ip_address) == ip_address:
                    asset = a
                    break

            hostname = None
            if host_data.get("hostnames"):
                hostname = host_data["hostnames"][0].get("name")

            mac_address = None
            vendor = None
            for addr in host_data.get("addresses", []):
                if addr.get("addrtype") == "mac":
                    mac_address = addr.get("addr")
                    vendor = addr.get("vendor")
                    break

            os_name = host_data.get("os", {}).get("name")

            open_ports = []
            services = {}
            for port in host_data.get("ports", []):
                if port.get("state") == "open":
                    port_id = int(port.get("portid"))
                    open_ports.append(port_id)
                    services[str(port_id)] = port.get("service", {})

            # Determine asset type based on open ports
            asset_type = AssetType.HOST
            if 80 in open_ports or 443 in open_ports:
                asset_type = AssetType.SERVER
            if 22 in open_ports:
                asset_type = AssetType.SERVER
            if 445 in open_ports:
                asset_type = AssetType.SERVER
            if 3306 in open_ports or 5432 in open_ports:
                asset_type = AssetType.SERVER

            if asset:
                # Update existing asset
                asset.last_seen = datetime.now()
                asset.status = AssetStatus.ONLINE
                if hostname:
                    asset.hostname = hostname
                if mac_address:
                    asset.mac_address = mac_address
                if vendor:
                    asset.vendor = vendor
                if os_name:
                    asset.os_name = os_name
                asset.open_ports = open_ports
                asset.services = services
                asset.asset_type = asset_type
                logger.info(f"Updated asset: {ip_address}")
            else:
                # Create new asset
                asset = Asset(
                    ip_address=ip_address,
                    mac_address=mac_address,
                    hostname=hostname,
                    vendor=vendor,
                    os_name=os_name,
                    status=AssetStatus.ONLINE,
                    open_ports=open_ports,
                    services=services,
                    discovery_method="nmap",
                    asset_type=asset_type,
                    confidence_score=0.8
                )
                self.db.add(asset)
                logger.info(f"Created new asset: {ip_address}")

        # Mark assets that were NOT found in this scan as OFFLINE
        # ONLY if this was a full network scan.
        # If it was a manual single-host scan, we don't want to mark other assets as offline.
        if is_full_network_scan:
            for asset in all_assets:
                if str(asset.ip_address) not in found_ips:
                    asset.status = AssetStatus.OFFLINE
                    logger.info(f"Asset {asset.ip_address} marked as OFFLINE")

        await self.db.commit()
