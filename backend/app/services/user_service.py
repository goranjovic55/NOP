"""
User service for user management operations
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from typing import Optional
from datetime import datetime
import uuid

from app.models.user import User, UserRole
from app.schemas.auth import UserCreate
from app.core.security import get_password_hash, verify_password


class UserService:
    """User service class"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            user_uuid = uuid.UUID(user_id)
            result = await self.db.execute(
                select(User).where(User.id == user_uuid)
            )
            return result.scalar_one_or_none()
        except (ValueError, TypeError):
            return None
    
    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        result = await self.db.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
    
    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user"""
        hashed_password = get_password_hash(user_data.password)
        
        user = User(
            username=user_data.username,
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=hashed_password,
            role=user_data.role,
            is_active=True,
            is_verified=False
        )
        
        self.db.add(user)
        try:
            await self.db.commit()
            await self.db.refresh(user)
            return user
        except IntegrityError:
            await self.db.rollback()
            raise ValueError("User with this username or email already exists")
    
    async def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """Authenticate user with username and password"""
        user = await self.get_user_by_username(username)
        if not user:
            return None
        
        if not verify_password(password, user.hashed_password):
            return None
        
        return user
    
    async def update_last_login(self, user_id: uuid.UUID) -> None:
        """Update user's last login timestamp"""
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(last_login=datetime.utcnow())
        )
        await self.db.commit()
    
    async def create_admin_user(self, username: str, email: str, password: str) -> User:
        """Create admin user (for initial setup)"""
        user_data = UserCreate(
            username=username,
            email=email,
            password=password,
            role=UserRole.ADMIN
        )
        return await self.create_user(user_data)