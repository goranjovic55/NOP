import asyncio
import logging
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.models.user import User
from app.core.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def reset_admin():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == "admin"))
        admin_user = result.scalar_one_or_none()
        
        hashed_password = get_password_hash("admin123")
        
        if admin_user:
            logger.info("Updating existing admin user password...")
            admin_user.hashed_password = hashed_password
        else:
            logger.info("Admin user not found, creating new one...")
            from app.models.user import UserRole
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
        
        await db.commit()
        logger.info("Admin password reset to 'admin123' successfully.")

if __name__ == "__main__":
    asyncio.run(reset_admin())
