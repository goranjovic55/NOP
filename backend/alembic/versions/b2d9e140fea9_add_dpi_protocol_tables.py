"""add_dpi_protocol_tables

Add Deep Packet Inspection tables and extend Flow model with DPI metadata

Revision ID: b2d9e140fea9
Revises: a1c8f039fea8
Create Date: 2026-01-25 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'b2d9e140fea9'
down_revision = 'a1c8f039fea8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ========== Flow table DPI extensions ==========
    # Add JSONB column for flexible DPI metadata
    op.add_column('flows', sa.Column('dpi_metadata', postgresql.JSONB(), nullable=True))
    
    # Add service label for topology visualization (e.g., "HTTP:80")
    op.add_column('flows', sa.Column('service_label', sa.String(100), nullable=True))
    op.create_index('ix_flows_service_label', 'flows', ['service_label'])
    
    # Add detected L7 protocol
    op.add_column('flows', sa.Column('detected_protocol', sa.String(50), nullable=True))
    op.create_index('ix_flows_detected_protocol', 'flows', ['detected_protocol'])
    
    # Add protocol detection confidence (0.0 - 1.0)
    op.add_column('flows', sa.Column('protocol_confidence', sa.Float(), nullable=True, default=0.0))
    
    # Add detection method: "signature", "heuristic", "port", "unknown"
    op.add_column('flows', sa.Column('detection_method', sa.String(20), nullable=True))
    
    # Add multicast/broadcast flags
    op.add_column('flows', sa.Column('is_multicast', sa.Boolean(), nullable=True, default=False))
    op.add_column('flows', sa.Column('is_broadcast', sa.Boolean(), nullable=True, default=False))
    
    # ========== Protocol Signatures table (user-defined patterns) ==========
    op.create_table('protocol_signatures',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('protocol', sa.String(50), nullable=False),
        sa.Column('pattern_type', sa.String(20), nullable=False),
        sa.Column('pattern', sa.Text(), nullable=False),
        sa.Column('offset', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('port_hint', sa.Integer(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True, default=0.8),
        sa.Column('enabled', sa.Boolean(), nullable=True, default=True),
        sa.Column('priority', sa.Integer(), nullable=True, default=100),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_protocol_signatures_protocol', 'protocol_signatures', ['protocol'])
    op.create_index('ix_protocol_signatures_enabled', 'protocol_signatures', ['enabled'])
    
    # ========== Unknown Protocols table (for learning) ==========
    op.create_table('unknown_protocols',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('src_ip', postgresql.INET(), nullable=False),
        sa.Column('dst_ip', postgresql.INET(), nullable=False),
        sa.Column('src_port', sa.Integer(), nullable=True),
        sa.Column('dst_port', sa.Integer(), nullable=True),
        sa.Column('transport_protocol', sa.String(10), nullable=False),
        sa.Column('payload_sample', sa.LargeBinary(), nullable=False),
        sa.Column('payload_hex', sa.Text(), nullable=False),
        sa.Column('payload_length', sa.Integer(), nullable=False),
        sa.Column('entropy', sa.Float(), nullable=True),
        sa.Column('has_structure', sa.Boolean(), nullable=True, default=False),
        sa.Column('is_printable', sa.Boolean(), nullable=True, default=False),
        sa.Column('packet_count', sa.Integer(), nullable=True, default=1),
        sa.Column('total_bytes', sa.BigInteger(), nullable=True, default=0),
        sa.Column('suggested_pattern', sa.Text(), nullable=True),
        sa.Column('pattern_confidence', sa.Float(), nullable=True),
        sa.Column('status', sa.String(20), nullable=True, default='new'),
        sa.Column('classified_as', sa.String(50), nullable=True),
        sa.Column('first_seen', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_seen', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_unknown_protocols_src_ip', 'unknown_protocols', ['src_ip'])
    op.create_index('ix_unknown_protocols_dst_ip', 'unknown_protocols', ['dst_ip'])
    op.create_index('ix_unknown_protocols_dst_port', 'unknown_protocols', ['dst_port'])
    op.create_index('ix_unknown_protocols_status', 'unknown_protocols', ['status'])
    op.create_index('ix_unknown_protocols_last_seen', 'unknown_protocols', ['last_seen'])
    
    # ========== Protocol Stats table (aggregated metrics) ==========
    op.create_table('protocol_stats',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('protocol', sa.String(50), nullable=False),
        sa.Column('time_bucket', sa.DateTime(timezone=True), nullable=False),
        sa.Column('packet_count', sa.BigInteger(), nullable=True, default=0),
        sa.Column('byte_count', sa.BigInteger(), nullable=True, default=0),
        sa.Column('flow_count', sa.Integer(), nullable=True, default=0),
        sa.Column('unique_sources', sa.Integer(), nullable=True, default=0),
        sa.Column('unique_destinations', sa.Integer(), nullable=True, default=0),
        sa.Column('unique_ports', sa.Integer(), nullable=True, default=0),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_protocol_stats_protocol', 'protocol_stats', ['protocol'])
    op.create_index('ix_protocol_stats_time_bucket', 'protocol_stats', ['time_bucket'])
    op.create_index('ix_protocol_stats_agent_id', 'protocol_stats', ['agent_id'])


def downgrade() -> None:
    # Drop Protocol Stats table
    op.drop_index('ix_protocol_stats_agent_id', table_name='protocol_stats')
    op.drop_index('ix_protocol_stats_time_bucket', table_name='protocol_stats')
    op.drop_index('ix_protocol_stats_protocol', table_name='protocol_stats')
    op.drop_table('protocol_stats')
    
    # Drop Unknown Protocols table
    op.drop_index('ix_unknown_protocols_last_seen', table_name='unknown_protocols')
    op.drop_index('ix_unknown_protocols_status', table_name='unknown_protocols')
    op.drop_index('ix_unknown_protocols_dst_port', table_name='unknown_protocols')
    op.drop_index('ix_unknown_protocols_dst_ip', table_name='unknown_protocols')
    op.drop_index('ix_unknown_protocols_src_ip', table_name='unknown_protocols')
    op.drop_table('unknown_protocols')
    
    # Drop Protocol Signatures table
    op.drop_index('ix_protocol_signatures_enabled', table_name='protocol_signatures')
    op.drop_index('ix_protocol_signatures_protocol', table_name='protocol_signatures')
    op.drop_table('protocol_signatures')
    
    # Remove Flow table DPI extensions
    op.drop_column('flows', 'is_broadcast')
    op.drop_column('flows', 'is_multicast')
    op.drop_column('flows', 'detection_method')
    op.drop_column('flows', 'protocol_confidence')
    op.drop_index('ix_flows_detected_protocol', table_name='flows')
    op.drop_column('flows', 'detected_protocol')
    op.drop_index('ix_flows_service_label', table_name='flows')
    op.drop_column('flows', 'service_label')
    op.drop_column('flows', 'dpi_metadata')
