"""
Database initialization and initial data seeding
"""

import asyncio
import logging
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, inspect
from app.core.database import AsyncSessionLocal, engine, Base
from app.models.user import User, UserRole
from app.core.config import settings
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)


async def check_schema_needs_update(conn) -> bool:
    """Check if database schema is missing required columns.
    
    Returns True if schema needs to be recreated (missing columns detected).
    This handles the case where tables exist but are missing new columns
    that create_all() won't add.
    """
    # Key columns that must exist - add new required columns here
    required_columns = {
        'assets': ['agent_id'],
        'traffic': ['agent_id'],
        'discovered_hosts': ['agent_id'],
    }
    
    def check_columns(connection):
        inspector = inspect(connection)
        tables = inspector.get_table_names()
        
        for table, columns in required_columns.items():
            if table in tables:
                existing_cols = {col['name'] for col in inspector.get_columns(table)}
                for col in columns:
                    if col not in existing_cols:
                        logger.warning(f"Schema outdated: table '{table}' missing column '{col}'")
                        return True
        return False
    
    return await conn.run_sync(check_columns)


async def init_db():
    """Initialize database and seed initial data.
    
    Automatically detects outdated schema (missing columns) and recreates
    tables from current models. For fresh deployments, this ensures the
    complete schema is created without needing manual migrations.
    
    Set RESET_DB=true to force drop all tables and recreate from scratch.
    """
    # Check if we should force reset the database
    reset_db = os.environ.get('RESET_DB', 'false').lower() in ('true', '1', 'yes')
    
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
        async with engine.begin() as conn:
            # Check if schema is outdated (missing columns)
            schema_outdated = await check_schema_needs_update(conn)
            
            if reset_db:
                logger.info("RESET_DB=true: Dropping all existing tables...")
                await conn.run_sync(Base.metadata.drop_all)
                logger.info("Creating all tables from current models...")
            elif schema_outdated:
                logger.info("Schema outdated detected! Recreating all tables...")
                logger.warning("NOTE: Existing data will be lost. For data preservation, use Alembic migrations.")
                await conn.run_sync(Base.metadata.drop_all)
                logger.info("Creating all tables from current models...")
            else:
                logger.info("Creating tables if they don't exist...")
            
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
