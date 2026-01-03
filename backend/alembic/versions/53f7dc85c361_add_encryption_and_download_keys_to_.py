"""add_encryption_and_download_keys_to_agents

Revision ID: 53f7dc85c361
Revises: 83460bc0ceb5
Create Date: 2026-01-03 10:18:50.388561

"""
from alembic import op
import sqlalchemy as sa
import secrets


# revision identifiers, used by Alembic.
revision = '53f7dc85c361'
down_revision = '83460bc0ceb5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add encryption_key column (for encrypted tunnel)
    op.add_column('agents', 
        sa.Column('encryption_key', sa.String(255), nullable=True)
    )
    
    # Add download_token column (for remote download links)
    op.add_column('agents',
        sa.Column('download_token', sa.String(255), nullable=True)
    )
    
    # Generate keys for existing agents
    connection = op.get_bind()
    connection.execute(
        sa.text("""
            UPDATE agents 
            SET encryption_key = md5(random()::text),
                download_token = md5(random()::text)
            WHERE encryption_key IS NULL OR download_token IS NULL
        """)
    )
    
    # Make columns non-nullable after populating
    op.alter_column('agents', 'encryption_key', nullable=False)
    op.alter_column('agents', 'download_token', nullable=False)
    
    # Add unique constraint on download_token
    op.create_unique_constraint('uq_agents_download_token', 'agents', ['download_token'])


def downgrade() -> None:
    op.drop_constraint('uq_agents_download_token', 'agents', type_='unique')
    op.drop_column('agents', 'download_token')
    op.drop_column('agents', 'encryption_key')
