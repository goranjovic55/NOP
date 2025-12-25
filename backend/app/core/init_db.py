"""
Database initialization and initial data seeding
"""

import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.models.user import User, UserRole
from app.core.config import settings
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

async def init_db():
    """Initialize database and seed initial data"""
    # Mask password in URL for logging
    db_url = settings.DATABASE_URL
    if "@" in db_url:
        parts = db_url.split("@")
        creds = parts[0].split("//")[-1]
        if ":" in creds:
            user = creds.split(":")[0]
            db_url = db_url.replace(creds, f"{user}:****")
    
    logger.info(f"Initializing database with URL: {db_url}")

    try:
        # Create tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created or already exist.")

        async with AsyncSessionLocal() as db:
            # Check if admin user exists
            result = await db.execute(select(User).where(User.username == "admin"))
            admin_user = result.scalar_one_or_none()

            hashed_password = get_password_hash(settings.ADMIN_PASSWORD)

            if not admin_user:
                logger.info(f"Creating initial admin user with password from settings (first 3 chars: {settings.ADMIN_PASSWORD[:3]}...)")
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
            else:
                logger.info(f"Admin user already exists. Syncing password with settings (first 3 chars: {settings.ADMIN_PASSWORD[:3]}...) and ensuring active status.")
                admin_user.hashed_password = hashed_password
                admin_user.is_active = True
                admin_user.is_verified = True
                db.add(admin_user) # Explicitly add to session to ensure update

            await db.commit()
            logger.info("Database initialization completed successfully.")
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        raise

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(init_db())
