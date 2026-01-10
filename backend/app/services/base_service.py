"""
Base service class with reusable CRUD operations.

All service classes should inherit from this base class to ensure
consistent patterns for database operations, error handling, and logging.
"""

import logging
from typing import TypeVar, Generic, Optional, List, Type, Any, Dict
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from sqlalchemy.orm import DeclarativeBase

# Type variable for the SQLAlchemy model
ModelType = TypeVar("ModelType", bound=DeclarativeBase)

logger = logging.getLogger(__name__)


class BaseService(Generic[ModelType]):
    """
    Base service class providing common CRUD operations.
    
    Usage:
        class AssetService(BaseService[Asset]):
            def __init__(self, db: AsyncSession):
                super().__init__(db, Asset)
    """
    
    def __init__(self, db: AsyncSession, model: Type[ModelType]):
        """
        Initialize the base service.
        
        Args:
            db: AsyncSession for database operations
            model: The SQLAlchemy model class
        """
        self.db = db
        self.model = model
        self.logger = logging.getLogger(self.__class__.__name__)
    
    async def get_by_id(self, id: UUID) -> Optional[ModelType]:
        """
        Get a single record by its UUID.
        
        Args:
            id: The UUID of the record
            
        Returns:
            The record if found, None otherwise
        """
        try:
            query = select(self.model).where(self.model.id == id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            self.logger.error("Error getting %s by id %s: %s", self.model.__name__, id, e)
            raise
    
    async def get_all(
        self, 
        skip: int = 0, 
        limit: int = 100,
        order_by: Optional[Any] = None
    ) -> List[ModelType]:
        """
        Get all records with pagination.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            order_by: Column to order by (optional)
            
        Returns:
            List of records
        """
        try:
            query = select(self.model).offset(skip).limit(limit)
            if order_by is not None:
                query = query.order_by(order_by)
            result = await self.db.execute(query)
            return list(result.scalars().all())
        except Exception as e:
            self.logger.error("Error getting all %s: %s", self.model.__name__, e)
            raise
    
    async def count(self) -> int:
        """
        Get the total count of records.
        
        Returns:
            Total number of records
        """
        try:
            query = select(func.count()).select_from(self.model)
            result = await self.db.execute(query)
            return result.scalar() or 0
        except Exception as e:
            self.logger.error("Error counting %s: %s", self.model.__name__, e)
            raise
    
    async def create(self, data: Dict[str, Any]) -> ModelType:
        """
        Create a new record.
        
        Args:
            data: Dictionary of field values
            
        Returns:
            The created record
        """
        try:
            obj = self.model(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            self.logger.debug("Created %s with id %s", self.model.__name__, obj.id)
            return obj
        except Exception as e:
            await self.db.rollback()
            self.logger.error("Error creating %s: %s", self.model.__name__, e)
            raise
    
    async def update(self, id: UUID, data: Dict[str, Any]) -> Optional[ModelType]:
        """
        Update an existing record.
        
        Args:
            id: The UUID of the record to update
            data: Dictionary of field values to update
            
        Returns:
            The updated record if found, None otherwise
        """
        try:
            obj = await self.get_by_id(id)
            if not obj:
                return None
            
            for field, value in data.items():
                if hasattr(obj, field):
                    setattr(obj, field, value)
            
            await self.db.commit()
            await self.db.refresh(obj)
            self.logger.debug("Updated %s with id %s", self.model.__name__, id)
            return obj
        except Exception as e:
            await self.db.rollback()
            self.logger.error("Error updating %s with id %s: %s", self.model.__name__, id, e)
            raise
    
    async def delete(self, id: UUID) -> bool:
        """
        Delete a record by its UUID.
        
        Args:
            id: The UUID of the record to delete
            
        Returns:
            True if deleted, False if not found
        """
        try:
            query = delete(self.model).where(self.model.id == id)
            result = await self.db.execute(query)
            await self.db.commit()
            deleted = result.rowcount > 0
            if deleted:
                self.logger.debug("Deleted %s with id %s", self.model.__name__, id)
            return deleted
        except Exception as e:
            await self.db.rollback()
            self.logger.error("Error deleting %s with id %s: %s", self.model.__name__, id, e)
            raise
    
    async def delete_all(self) -> int:
        """
        Delete all records.
        
        Returns:
            Number of records deleted
        """
        try:
            query = delete(self.model)
            result = await self.db.execute(query)
            await self.db.commit()
            count = result.rowcount
            self.logger.info("Deleted %d %s records", count, self.model.__name__)
            return count
        except Exception as e:
            await self.db.rollback()
            self.logger.error("Error deleting all %s: %s", self.model.__name__, e)
            raise
    
    async def exists(self, id: UUID) -> bool:
        """
        Check if a record exists.
        
        Args:
            id: The UUID of the record
            
        Returns:
            True if exists, False otherwise
        """
        query = select(func.count()).select_from(self.model).where(self.model.id == id)
        result = await self.db.execute(query)
        return (result.scalar() or 0) > 0
