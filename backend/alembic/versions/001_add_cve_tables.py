"""Add CVE cache and exploit module tables

Revision ID: 001_add_cve_tables
Revises: 
Create Date: 2026-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '001_add_cve_tables'
down_revision = None
branch_labels = None
depends_on = None


def table_exists(table_name):
    """Check if a table exists in the database"""
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade():
    # Create CVE cache table if it doesn't exist
    if not table_exists('cve_cache'):
        op.create_table(
            'cve_cache',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('cve_id', sa.String(20), nullable=False, unique=True),
            sa.Column('title', sa.String(500), nullable=True),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('cvss_score', sa.Float(), nullable=True),
            sa.Column('cvss_vector', sa.String(100), nullable=True),
            sa.Column('severity', sa.String(20), nullable=True),
            sa.Column('cpe_list', postgresql.JSON(), nullable=True),
            sa.Column('affected_products', postgresql.JSON(), nullable=True),
            sa.Column('references', postgresql.JSON(), nullable=True),
            sa.Column('fetched_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()'))
        )
        
        # Create index on cve_id
        op.create_index('ix_cve_cache_cve_id', 'cve_cache', ['cve_id'])
    
    # Create exploit modules table if it doesn't exist
    if not table_exists('exploit_modules'):
        op.create_table(
            'exploit_modules',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('cve_id', sa.String(20), nullable=False),
            sa.Column('platform', sa.String(50), nullable=False),
            sa.Column('module_id', sa.String(100), nullable=True),
            sa.Column('module_path', sa.String(255), nullable=True),
            sa.Column('title', sa.String(500), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('exploit_type', sa.String(20), nullable=False),
            sa.Column('target_platform', sa.String(50), nullable=True),
            sa.Column('rank', sa.String(20), nullable=True),
            sa.Column('verified', sa.Boolean(), default=False),
            sa.Column('exploit_db_id', sa.Integer(), nullable=True),
            sa.Column('reference_url', sa.String(500), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()'))
        )
        
        # Create index on cve_id for exploit modules
        op.create_index('ix_exploit_modules_cve_id', 'exploit_modules', ['cve_id'])


def downgrade():
    op.drop_index('ix_exploit_modules_cve_id', table_name='exploit_modules')
    op.drop_table('exploit_modules')
    op.drop_index('ix_cve_cache_cve_id', table_name='cve_cache')
    op.drop_table('cve_cache')
