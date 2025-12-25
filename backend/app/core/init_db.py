"""
Database initialization and initial data seeding
"""

import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.services.user_service import UserService
from app.schemas.auth import UserCreate
from app.models.user import User, UserRole
from app.core.config import settings
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

async def init_db():
    """Initialize database and seed initial data"""
    logger.info("Initializing database...")

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if admin user exists
        result = await db.execute(select(User).where(User.username == "admin"))
        admin_user = result.scalar_one_or_none()
        
        hashed_password = get_password_hash(settings.ADMIN_PASSWORD)
        
        if not admin_user:
            logger.info("Creating initial admin user...")
            admin_user = User(
                username="admin",
                email="admin@nop.local",
                hashed_password=hashed_password,
                full_name="System Administrator",
                role=UserRole.ADMIN,
                is_active=True,
                is_verified=True
            )
            db.add(admin_user)
            logger.info(f"Admin user created with password: {settings.ADMIN_PASSWORD}")
        else:
            logger.info("Admin user already exists, updating password to match settings...")
            admin_user.hashed_password = hashed_password
            
        await db.commit()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(init_db())
