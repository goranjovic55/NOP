"""add_template_tracking_to_agents

Revision ID: a1c8f039fea8
Revises: 53f7dc85c361
Create Date: 2026-01-08 01:54:40.444682

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'a1c8f039fea8'
down_revision = '53f7dc85c361'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_template flag to distinguish templates from deployed agents
    op.add_column('agents', sa.Column('is_template', sa.Boolean(), nullable=True, default=True))
    
    # Add template_id to link deployed agents back to their template
    op.add_column('agents', sa.Column('template_id', postgresql.UUID(as_uuid=True), nullable=True))
    
    # Add hostname for deployed agents (captured from agent connection)
    op.add_column('agents', sa.Column('hostname', sa.String(255), nullable=True))
    
    # Add strain identifier for tracking obfuscation variants
    op.add_column('agents', sa.Column('strain_id', sa.String(64), nullable=True))
    
    # Set all existing agents as templates
    op.execute("UPDATE agents SET is_template = true WHERE is_template IS NULL")
    
    # Make is_template non-nullable
    op.alter_column('agents', 'is_template', nullable=False)
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_agents_template_id',
        'agents', 'agents',
        ['template_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    op.drop_constraint('fk_agents_template_id', 'agents', type_='foreignkey')
    op.drop_column('agents', 'strain_id')
    op.drop_column('agents', 'hostname')
    op.drop_column('agents', 'template_id')
    op.drop_column('agents', 'is_template')
