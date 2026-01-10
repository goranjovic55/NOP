"""
Agent Data Ingestion Service

Handles data received from remote agents and stores it in the database
with proper agent_id tagging.
"""

import logging
from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import cast, select
from sqlalchemy.dialects.postgresql import INET
from datetime import datetime
from ipaddress import ip_address

from app.models.asset import Asset, AssetStatus
from app.models.flow import Flow

logger = logging.getLogger(__name__)


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
                logger.warning("Error processing asset %s: %s", asset_data, e)
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
        Ingest traffic statistics and flows from agent
        
        Args:
            db: Database session
            agent_id: ID of the agent that captured this traffic
            traffic: Traffic statistics and flows
            
        Returns:
            Success status
        """
        try:
            # Store traffic data in agent_metadata for POV interface access
            from app.models.agent import Agent
            from app.models.flow import Flow
            from sqlalchemy import select
            from sqlalchemy.orm.attributes import flag_modified
            from datetime import datetime
            
            result = await db.execute(
                select(Agent).where(Agent.id == agent_id)
            )
            agent = result.scalar_one_or_none()
            
            if agent:
                if not agent.agent_metadata:
                    agent.agent_metadata = {}
                
                # Store interfaces for POV mode
                logger.debug("Traffic data keys: %s", traffic.keys())
                if 'interfaces' in traffic:
                    logger.debug("Storing %d interfaces", len(traffic['interfaces']))
                    agent.agent_metadata['interfaces'] = traffic['interfaces']
                    agent.agent_metadata['last_traffic_update'] = datetime.utcnow().isoformat()
                    # Mark JSONB field as modified for SQLAlchemy
                    flag_modified(agent, 'agent_metadata')
                else:
                    logger.debug("No 'interfaces' key in traffic data")
                
                # Store flows in database
                logger.debug("Checking for flows. 'flows' in traffic: %s", 'flows' in traffic)
                if 'flows' in traffic:
                    logger.debug("flows value type: %s, length: %d", type(traffic['flows']), len(traffic['flows']) if traffic['flows'] else 0)
                
                if 'flows' in traffic and traffic['flows']:
                    flows_data = traffic['flows']
                    logger.debug("Processing %d flows from agent %s", len(flows_data), agent.name)
                    
                    for flow_data in flows_data:
                        try:
                            flow = Flow(
                                src_ip=flow_data.get('src_ip'),
                                dst_ip=flow_data.get('dst_ip'),
                                src_port=flow_data.get('src_port', 0),
                                dst_port=flow_data.get('dst_port', 0),
                                protocol=flow_data.get('protocol', 'unknown').upper(),
                                bytes_sent=flow_data.get('bytes', 0),
                                bytes_received=0,
                                packets_sent=flow_data.get('packets', 1),
                                packets_received=0,
                                first_seen=datetime.fromisoformat(flow_data.get('first_seen', datetime.utcnow().isoformat())),
                                last_seen=datetime.fromisoformat(flow_data.get('last_seen', datetime.utcnow().isoformat())),
                                source='agent',
                                agent_id=agent_id
                            )
                            db.add(flow)
                        except Exception as fe:
                            logger.warning("Error creating flow: %s", fe)
                    
                    logger.debug("Agent %s stored %d flows", agent.name, len(flows_data))
                
                await db.commit()
            
            return True
        except Exception as e:
            logger.exception("Error ingesting traffic data: %s", e)
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
            from sqlalchemy.orm.attributes import flag_modified
            
            result = await db.execute(
                select(Agent).where(Agent.id == agent_id)
            )
            agent = result.scalar_one_or_none()
            
            if agent:
                if not agent.agent_metadata:
                    agent.agent_metadata = {}
                
                agent.agent_metadata['host_info'] = host_info
                agent.agent_metadata['last_host_update'] = datetime.utcnow().isoformat()
                # Mark JSONB field as modified for SQLAlchemy
                flag_modified(agent, 'agent_metadata')
                
                await db.commit()
                return True
            
            return False
        except Exception as e:
            logger.exception("Error ingesting host data: %s", e)
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
