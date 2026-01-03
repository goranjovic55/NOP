# Database Patterns

Database migration and schema change patterns for safe production deployments.

## When to Use

- Schema changes (add/remove/modify columns)
- Data migrations (transforming existing data)
- Index creation on large tables
- Multi-developer migration coordination
- Rollback scenarios

## Checklist

- [ ] Migration file with descriptive name
- [ ] Both upgrade and downgrade functions tested
- [ ] Existing data handled gracefully
- [ ] Large table indexes created concurrently
- [ ] Migration order coordinated with team
- [ ] Backup taken before production migration
- [ ] Connection limits checked for long migrations

## Examples

### Alembic Migration - Adding Column Safely
```python
"""add user preferences column

Revision ID: abc123def456
Revises: previous_revision
Create Date: 2026-01-03 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'abc123def456'
down_revision = 'previous_revision'

def upgrade():
    # Add nullable column first (safe for existing data)
    op.add_column('users', 
        sa.Column('preferences', postgresql.JSONB(), nullable=True)
    )
    
    # Set default for existing rows
    op.execute("UPDATE users SET preferences = '{}'::jsonb WHERE preferences IS NULL")
    
    # Now make it non-nullable if needed
    op.alter_column('users', 'preferences',
        existing_type=postgresql.JSONB(),
        nullable=False,
        server_default=sa.text("'{}'::jsonb")
    )

def downgrade():
    op.drop_column('users', 'preferences')
```

### Renaming Column Without Data Loss
```python
"""rename email to email_address

Revision ID: def789ghi012
Revises: abc123def456
Create Date: 2026-01-03 11:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Step 1: Add new column
    op.add_column('users',
        sa.Column('email_address', sa.String(255), nullable=True)
    )
    
    # Step 2: Copy data
    op.execute("UPDATE users SET email_address = email")
    
    # Step 3: Add constraints to new column
    op.alter_column('users', 'email_address', nullable=False)
    op.create_unique_constraint('uq_users_email_address', 'users', ['email_address'])
    
    # Step 4: Drop old column (after app is updated to use new column)
    op.drop_constraint('uq_users_email', 'users', type_='unique')
    op.drop_column('users', 'email')

def downgrade():
    op.add_column('users',
        sa.Column('email', sa.String(255), nullable=True)
    )
    op.execute("UPDATE users SET email = email_address")
    op.alter_column('users', 'email', nullable=False)
    op.create_unique_constraint('uq_users_email', 'users', ['email'])
    op.drop_constraint('uq_users_email_address', 'users', type_='unique')
    op.drop_column('users', 'email_address')
```

### Creating Index Concurrently (No Table Lock)
```python
"""add index on created_at

Revision ID: ghi345jkl678
"""
from alembic import op

def upgrade():
    # CONCURRENTLY prevents table lock but takes longer
    # Note: Must run outside transaction
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS 
        ix_events_created_at ON events (created_at DESC)
    """)

def downgrade():
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_events_created_at")

# In alembic.ini, for concurrent indexes:
# transaction_per_migration = false
```

### Data Migration Pattern
```python
"""convert status string to enum

Revision ID: jkl901mno234
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import orm
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Temporary model for migration
class Scan(Base):
    __tablename__ = 'scans'
    id = sa.Column(sa.Integer, primary_key=True)
    status = sa.Column(sa.String(50))
    status_enum = sa.Column(sa.Enum('pending', 'running', 'completed', 'failed', name='scan_status'))

STATUS_MAP = {
    'waiting': 'pending',
    'in_progress': 'running',
    'done': 'completed',
    'error': 'failed',
}

def upgrade():
    # Add new enum column
    op.execute("CREATE TYPE scan_status AS ENUM ('pending', 'running', 'completed', 'failed')")
    op.add_column('scans', sa.Column('status_enum', 
        sa.Enum('pending', 'running', 'completed', 'failed', name='scan_status'), 
        nullable=True
    ))
    
    # Migrate data in batches
    bind = op.get_bind()
    session = orm.Session(bind=bind)
    
    for old_status, new_status in STATUS_MAP.items():
        session.execute(
            sa.text(f"UPDATE scans SET status_enum = :new WHERE status = :old"),
            {"new": new_status, "old": old_status}
        )
    
    session.commit()
    
    # Handle any remaining NULLs
    session.execute(sa.text("UPDATE scans SET status_enum = 'pending' WHERE status_enum IS NULL"))
    session.commit()
    
    # Make non-nullable and drop old column
    op.alter_column('scans', 'status_enum', nullable=False)
    op.drop_column('scans', 'status')
    op.alter_column('scans', 'status_enum', new_column_name='status')

def downgrade():
    # Reverse the process...
    pass
```

### Safe Migration Commands
```bash
# Generate migration from model changes
alembic revision --autogenerate -m "add_user_preferences"

# Check current migration state
alembic current

# See pending migrations
alembic history --indicate-current

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1

# Rollback to specific revision
alembic downgrade abc123

# Generate SQL without applying (for review)
alembic upgrade head --sql > migration.sql
```

## Anti-Patterns

- ❌ Adding NOT NULL column without default → ✅ Add nullable, set values, then make non-null
- ❌ Dropping columns with data → ✅ Deprecate, remove references, then drop
- ❌ `CREATE INDEX` on large tables → ✅ `CREATE INDEX CONCURRENTLY`
- ❌ No downgrade function → ✅ Always implement downgrade for rollback
- ❌ Running migrations on production without backup → ✅ Always backup first

## Related

- `backend-api` - API endpoint patterns
- `testing` - Database test patterns

---
*Created: 2026-01-03*
*Priority: High*
*Estimated Impact: 70%*
