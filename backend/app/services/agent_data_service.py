"""
Agent Data Ingestion Service

Handles data received from remote agents and stores it in the database
with proper agent_id tagging.
"""

from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import cast, select
from sqlalchemy.dialects.postgresql import INET
from datetime import datetime
from ipaddress import ip_address

from app.models.asset import Asset, AssetStatus
from app.models.flow import Flow


class AgentDataService:
    """Service for ingesting data from agents"""
    
    @staticmethod
    async def ingest_asset_data(
        db: AsyncSession,
        agent_id: UUID,
        assets: List[Dict[str, Any]]
    ) -> int:
        """
        Ingest asset discovery data from agent
        
        Args:
            db: Database session
            agent_id: ID of the agent that discovered these assets
            assets: List of discovered assets
            
        Returns:
            Number of assets processed
        """
        processed = 0
        
        for asset_data in assets:
            try:
                ip = asset_data.get("ip")
                mac = asset_data.get("mac")
                
                if not ip:
                    continue
                
                # Check if asset already exists
                from app.models.asset import Asset
                
                result = await db.execute(
                    select(Asset).where(Asset.ip_address == cast(ip, INET))
                )
                asset = result.scalar_one_or_none()
                
                if asset:
                    # Update existing asset
                    asset.last_seen = datetime.utcnow()
                    asset.status = AssetStatus.ONLINE
                    asset.agent_id = agent_id  # Tag with agent that saw it
                    if mac and not asset.mac_address:
                        asset.mac_address = mac
                else:
                    # Create new asset
                    asset = Asset(
                        ip_address=ip,
                        mac_address=mac,
                        status=AssetStatus.ONLINE,
                        discovery_method="agent_arp",
                        agent_id=agent_id,
                        first_seen=datetime.utcnow(),
                        last_seen=datetime.utcnow()
                    )
                    db.add(asset)
                
                processed += 1
                
            except Exception as e:
                print(f"Error processing asset {asset_data}: {e}")
                continue
        
        await db.commit()
        return processed
    
    @staticmethod
    async def ingest_traffic_data(
        db: AsyncSession,
        agent_id: UUID,
        traffic: Dict[str, Any]
    ) -> bool:
        """
        Ingest traffic statistics from agent
        
        Args:
            db: Database session
            agent_id: ID of the agent that captured this traffic
            traffic: Traffic statistics
            
        Returns:
            Success status
        """
        try:
            # For now, we'll store aggregate stats
            # In a real implementation, you might store this differently
            # or update flow records with agent data
            
            # This is a placeholder - you might want to create a separate
            # AgentStats table or update flows with agent context
            
            return True
        except Exception as e:
            print(f"Error ingesting traffic data: {e}")
            return False
    
    @staticmethod
    async def ingest_host_data(
        db: AsyncSession,
        agent_id: UUID,
        host_info: Dict[str, Any]
    ) -> bool:
        """
        Ingest host system information from agent
        
        Args:
            db: Database session
            agent_id: ID of the agent reporting host info
            host_info: Host system information
            
        Returns:
            Success status
        """
        try:
            # Update agent metadata with host info
            from app.models.agent import Agent
            from sqlalchemy import select
            
            result = await db.execute(
                select(Agent).where(Agent.id == agent_id)
            )
            agent = result.scalar_one_or_none()
            
            if agent:
                if not agent.agent_metadata:
                    agent.agent_metadata = {}
                
                agent.agent_metadata['host_info'] = host_info
                agent.agent_metadata['last_host_update'] = datetime.utcnow().isoformat()
                
                await db.commit()
                return True
            
            return False
        except Exception as e:
            print(f"Error ingesting host data: {e}")
            return False
    
    @staticmethod
    async def create_flow_from_agent(
        db: AsyncSession,
        agent_id: UUID,
        flow_data: Dict[str, Any]
    ) -> Flow:
        """
        Create a flow record from agent data
        
        Args:
            db: Database session
            agent_id: ID of the agent that captured this flow
            flow_data: Flow information
            
        Returns:
            Created Flow object
        """
        flow = Flow(
            src_ip=flow_data.get("src_ip"),
            dst_ip=flow_data.get("dst_ip"),
            src_port=flow_data.get("src_port"),
            dst_port=flow_data.get("dst_port"),
            protocol=flow_data.get("protocol", "TCP"),
            bytes_sent=flow_data.get("bytes_sent", 0),
            bytes_received=flow_data.get("bytes_received", 0),
            packets_sent=flow_data.get("packets_sent", 0),
            packets_received=flow_data.get("packets_received", 0),
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow(),
            source="agent",
            agent_id=agent_id
        )
        
        db.add(flow)
        await db.commit()
        await db.refresh(flow)
        
        return flow
