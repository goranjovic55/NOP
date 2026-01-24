"""
Protocol Analysis API Endpoints

Provides REST endpoints for protocol dissection, topology discovery,
and protocol statistics.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Optional, Any
from pydantic import BaseModel

from app.services.DPIService import dpi_service


router = APIRouter()


# Response models
class VLANTopologyResponse(BaseModel):
    """VLAN topology response"""
    vlans: Dict[int, List[str]]  # vlan_id -> list of MAC addresses
    total_vlans: int


class MulticastGroupResponse(BaseModel):
    """Multicast group information"""
    group_address: str
    protocol: str
    members: List[str]
    packet_count: int
    first_seen: float
    last_seen: float


class LLDPNeighborResponse(BaseModel):
    """LLDP neighbor information"""
    chassis_id: str
    port_id: str
    ttl: int
    system_name: Optional[str]
    system_description: Optional[str]
    capabilities: List[str]
    source_mac: Optional[str]
    first_seen: float
    last_seen: float


class CDPNeighborResponse(BaseModel):
    """CDP neighbor information"""
    device_id: str
    platform: Optional[str]
    addresses: List[str]
    capabilities: List[str]
    source_mac: Optional[str]
    first_seen: float
    last_seen: float


class TopologySummaryResponse(BaseModel):
    """Topology summary response"""
    lldp_neighbors: int
    cdp_neighbors: int
    vlans: List[int]
    multicast_groups: int
    stp_bridges: int
    stp_root_bridge: Optional[str]
    classified_devices: Dict[str, str]


class DeviceTypeResponse(BaseModel):
    """Device type classification"""
    identifier: str
    device_type: str


# Endpoints

@router.get("/topology/summary", response_model=TopologySummaryResponse)
async def get_topology_summary():
    """
    Get a summary of discovered network topology.
    
    Returns counts of LLDP/CDP neighbors, VLANs, multicast groups,
    and STP information.
    """
    summary = dpi_service.get_topology_summary()
    return TopologySummaryResponse(**summary)


@router.get("/topology/vlans", response_model=VLANTopologyResponse)
async def get_vlan_topology():
    """
    Get VLAN topology showing which MAC addresses are on which VLANs.
    
    This is detected from 802.1Q VLAN-tagged traffic.
    """
    vlans = dpi_service.get_vlan_topology()
    return VLANTopologyResponse(
        vlans=vlans,
        total_vlans=len(vlans)
    )


@router.get("/topology/multicast", response_model=List[MulticastGroupResponse])
async def get_multicast_groups():
    """
    Get discovered multicast groups and their members.
    
    Tracks IGMP, mDNS, SSDP, and other multicast protocols.
    """
    groups = dpi_service.get_multicast_groups()
    return [MulticastGroupResponse(**g) for g in groups]


@router.get("/topology/lldp", response_model=List[LLDPNeighborResponse])
async def get_lldp_neighbors():
    """
    Get LLDP-discovered network devices.
    
    LLDP (Link Layer Discovery Protocol) is used by switches and routers
    to advertise their identity and capabilities.
    """
    neighbors = dpi_service.get_lldp_neighbors()
    return [LLDPNeighborResponse(**n) for n in neighbors]


@router.get("/topology/cdp", response_model=List[CDPNeighborResponse])
async def get_cdp_neighbors():
    """
    Get CDP-discovered network devices.
    
    CDP (Cisco Discovery Protocol) is Cisco's proprietary protocol
    for device discovery.
    """
    neighbors = dpi_service.get_cdp_neighbors()
    return [CDPNeighborResponse(**n) for n in neighbors]


@router.get("/device-type/{identifier}", response_model=DeviceTypeResponse)
async def get_device_type(identifier: str):
    """
    Get the classified device type for a MAC or IP address.
    
    Returns "switch", "router", or "host" based on observed traffic patterns.
    """
    device_type = dpi_service.get_device_type(identifier)
    return DeviceTypeResponse(
        identifier=identifier,
        device_type=device_type
    )


@router.get("/protocols/ports")
async def get_known_protocols():
    """
    Get the list of known protocols and their associated ports.
    """
    return {
        "protocols": [
            {"port": port, "protocol": info[0], "category": info[1], "confidence": info[2]}
            for port, info in dpi_service.PORT_MAP.items()
        ],
        "total": len(dpi_service.PORT_MAP)
    }


@router.post("/topology/clear")
async def clear_topology_data():
    """
    Clear all topology tracking data.
    
    Use this to reset the topology discovery state.
    """
    dpi_service.clear_topology_data()
    return {"status": "ok", "message": "Topology data cleared"}


@router.get("/capabilities")
async def get_dpi_capabilities():
    """
    Get DPI service capabilities.
    
    Shows which protocol layers are available for dissection.
    """
    from app.services.DPIService import (
        LLDP_AVAILABLE, CDP_AVAILABLE, STP_AVAILABLE, IGMP_AVAILABLE
    )
    
    return {
        "layers": {
            "l2": {
                "ethernet": True,
                "vlan_8021q": True,
                "lldp": LLDP_AVAILABLE,
                "cdp": CDP_AVAILABLE,
                "stp": STP_AVAILABLE,
            },
            "l3": {
                "ipv4": True,
                "arp": True,
                "icmp": True,
                "igmp": IGMP_AVAILABLE,
            },
            "l4": {
                "tcp": True,
                "udp": True,
            },
            "l7": {
                "dns": True,
                "http_detection": True,
                "ssh_detection": True,
                "tls_detection": True,
                "industrial_protocols": ["Modbus", "BACnet"],
            }
        },
        "features": {
            "vlan_tracking": True,
            "multicast_tracking": True,
            "device_classification": True,
            "protocol_classification": True,
            "topology_inference": True,
        }
    }
