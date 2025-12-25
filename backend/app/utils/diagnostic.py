import asyncio
import logging
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine
from app.models.user import User
from app.core.config import settings
from app.core.security import verify_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_diagnostic():
    logger.info("--- NOP Backend Diagnostic ---")
    logger.info(f"DATABASE_URL: {settings.DATABASE_URL.split('@')[0]}@****")
    logger.info(f"ADMIN_PASSWORD from settings: {settings.ADMIN_PASSWORD}")
    
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(User).where(User.username == "admin"))
            admin_user = result.scalar_one_or_none()
            
            if not admin_user:
                logger.error("Admin user NOT FOUND in database!")
            else:
                logger.info(f"Admin user found: {admin_user.username}")
                logger.info(f"Admin email: {admin_user.email}")
                logger.info(f"Admin is_active: {admin_user.is_active}")
                logger.info(f"Admin role: {admin_user.role}")
                
                # Test password verification
                is_correct = verify_password(settings.ADMIN_PASSWORD, admin_user.hashed_password)
                logger.info(f"Password verification with settings.ADMIN_PASSWORD: {is_correct}")
                
                # Test common passwords if verification failed
                if not is_correct:
                    for p in ["admin123", "changeme"]:
                        if verify_password(p, admin_user.hashed_password):
                            logger.info(f"Password verification SUCCEEDED with common password: {p}")
                            break
                    else:
                        logger.error("Password verification FAILED with all tested passwords.")
        except Exception as e:
            logger.error(f"Diagnostic failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(run_diagnostic())
