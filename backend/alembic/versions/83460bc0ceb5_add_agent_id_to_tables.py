"""add_agent_id_to_tables

Revision ID: 83460bc0ceb5
Revises: 001_add_cve_tables
Create Date: 2026-01-03 10:06:50.970878

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '83460bc0ceb5'
down_revision = '001_add_cve_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add agent_id column to assets table
    op.add_column('assets', 
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        'fk_assets_agent_id', 'assets', 'agents',
        ['agent_id'], ['id'], ondelete='SET NULL'
    )
    op.create_index('idx_assets_agent_id', 'assets', ['agent_id'])
    
    # Add agent_id column to traffic table
    op.add_column('traffic',
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        'fk_traffic_agent_id', 'traffic', 'agents',
        ['agent_id'], ['id'], ondelete='SET NULL'
    )
    op.create_index('idx_traffic_agent_id', 'traffic', ['agent_id'])
    
    # Add agent_id column to discovered_hosts table
    op.add_column('discovered_hosts',
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        'fk_discovered_hosts_agent_id', 'discovered_hosts', 'agents',
        ['agent_id'], ['id'], ondelete='SET NULL'
    )
    op.create_index('idx_discovered_hosts_agent_id', 'discovered_hosts', ['agent_id'])


def downgrade() -> None:
    # Remove from discovered_hosts
    op.drop_index('idx_discovered_hosts_agent_id', 'discovered_hosts')
    op.drop_constraint('fk_discovered_hosts_agent_id', 'discovered_hosts', type_='foreignkey')
    op.drop_column('discovered_hosts', 'agent_id')
    
    # Remove from traffic
    op.drop_index('idx_traffic_agent_id', 'traffic')
    op.drop_constraint('fk_traffic_agent_id', 'traffic', type_='foreignkey')
    op.drop_column('traffic', 'agent_id')
    
    # Remove from assets
    op.drop_index('idx_assets_agent_id', 'assets')
    op.drop_constraint('fk_assets_agent_id', 'assets', type_='foreignkey')
    op.drop_column('assets', 'agent_id')
