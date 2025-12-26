"""
Settings database model
"""

from sqlalchemy import Column, Integer, String, Boolean, Float, JSON
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import TIMESTAMP
from app.core.database import Base


class Settings(Base):
    """System settings model"""
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, unique=True, nullable=False, index=True)
    config = Column(JSON, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
