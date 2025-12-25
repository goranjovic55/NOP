"""
Database initialization script
"""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import engine, Base
from app.services.user_service import UserService
from app.models import user, asset, credential, scan, flow, event, vulnerability, topology


async def init_database():
    """Initialize database with tables and default data"""
    print("Creating database tables...")
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print("Database tables created successfully!")
    
    # Create default admin user
    async with AsyncSession(engine) as session:
        user_service = UserService(session)
        
        # Check if admin user already exists
        existing_admin = await user_service.get_user_by_username("admin")
        if not existing_admin:
            print("Creating default admin user...")
            admin_user = await user_service.create_admin_user(
                username="admin",
                email="admin@example.com",
                password="admin123"
            )
            print(f"Admin user created: {admin_user.username}")
        else:
            print("Admin user already exists")


if __name__ == "__main__":
    asyncio.run(init_database())