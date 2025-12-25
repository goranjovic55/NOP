from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
from app.core.database import get_db
from app.models.event import Event
from pydantic import BaseModel
from datetime import datetime
import uuid

router = APIRouter()

class EventResponse(BaseModel):
    id: uuid.UUID
    event_type: str
    severity: str
    title: str
    description: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=List[EventResponse])
async def get_events(
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get recent system events"""
    query = select(Event).order_by(desc(Event.timestamp)).limit(limit)
    result = await db.execute(query)
    events = result.scalars().all()
    return events
