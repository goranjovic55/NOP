# NOP Codebase Refactoring Standards

## Overview

This document defines industry best practices and community standards for refactoring the Network Observatory Platform (NOP) codebase. It addresses current patterns, identifies areas for improvement, and establishes guidelines for consistent, maintainable code.

**Last Updated:** 2026-01-10  
**Status:** Active Standards Document

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Backend Standards (Python/FastAPI)](#backend-standards)
3. [Frontend Standards (React/TypeScript)](#frontend-standards)
4. [Architecture Standards](#architecture-standards)
5. [Code Quality Standards](#code-quality-standards)
6. [Testing Standards](#testing-standards)
7. [Security Standards](#security-standards)
8. [Priority Refactoring Items](#priority-refactoring-items)

---

## Executive Summary

### Current State Assessment

The NOP codebase demonstrates good foundational architecture with:
- ✅ Clean separation between frontend (React/TypeScript) and backend (FastAPI/Python)
- ✅ Proper use of Pydantic schemas for API validation
- ✅ Zustand for state management (appropriate for this scale)
- ✅ Async SQLAlchemy patterns for database operations
- ✅ Service layer abstraction in backend

### Areas for Improvement

| Area | Issue | Priority |
|------|-------|----------|
| Logging | Debug `print()` statements in production code | High |
| Error Handling | Inconsistent error responses across endpoints | High |
| Type Safety | Missing TypeScript strict mode, `any` types | Medium |
| Testing | Limited test coverage (only 3 test files) | Medium |
| Documentation | API docstrings incomplete | Low |

---

## Backend Standards

### 1. Remove Debug Statements

**Current Issue:** Production code contains `print()` statements for debugging.

```python
# ❌ Bad - Found in assets.py, traffic.py, agents.py
print(f"[ASSETS DEBUG] X-Agent-POV header: {request.headers.get('X-Agent-POV')}")

# ✅ Good - Use structured logging
import logging
logger = logging.getLogger(__name__)
logger.debug("Agent POV header: %s", request.headers.get('X-Agent-POV'))
```

**Files to Refactor:**
- `backend/app/api/v1/endpoints/assets.py`
- `backend/app/api/v1/endpoints/traffic.py`
- `backend/app/api/v1/endpoints/agents.py`
- `backend/app/services/SnifferService.py`
- `backend/app/services/agent_service.py`
- `backend/app/services/agent_data_service.py`

### 2. Consistent Error Handling

**Standard Pattern:**

```python
from fastapi import HTTPException, status
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Define custom exception classes
class ResourceNotFoundError(Exception):
    """Raised when a requested resource is not found."""
    pass

class ValidationError(Exception):
    """Raised when input validation fails."""
    pass

# Endpoint pattern
@router.get("/{resource_id}", response_model=ResourceResponse)
async def get_resource(
    resource_id: str,
    db: AsyncSession = Depends(get_db)
) -> ResourceResponse:
    """
    Get a specific resource by ID.
    
    Args:
        resource_id: The unique identifier of the resource.
        db: Database session dependency.
        
    Returns:
        ResourceResponse: The requested resource.
        
    Raises:
        HTTPException: 404 if resource not found, 400 if invalid ID format.
    """
    try:
        resource = await service.get_by_id(resource_id)
        if not resource:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "resource_not_found", "message": f"Resource {resource_id} not found"}
            )
        return resource
    except ValueError as e:
        logger.warning("Invalid resource ID format: %s", resource_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_id", "message": str(e)}
        )
    except Exception as e:
        logger.exception("Unexpected error fetching resource %s", resource_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "internal_error", "message": "An unexpected error occurred"}
        )
```

### 3. Service Layer Pattern

**Standard Pattern:**

```python
# backend/app/services/base_service.py
from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")
ResponseSchemaType = TypeVar("ResponseSchemaType")

class BaseService(ABC, Generic[ModelType, CreateSchemaType, UpdateSchemaType, ResponseSchemaType]):
    """Base service class with common CRUD operations."""
    
    def __init__(self, db: AsyncSession, model: type[ModelType]):
        self.db = db
        self.model = model
        self.logger = logging.getLogger(self.__class__.__name__)
    
    async def get_by_id(self, id: UUID) -> Optional[ModelType]:
        """Get a single record by ID."""
        query = select(self.model).where(self.model.id == id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Get all records with pagination."""
        query = select(self.model).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def create(self, data: CreateSchemaType) -> ModelType:
        """Create a new record."""
        obj = self.model(**data.model_dump())
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj
    
    async def update(self, id: UUID, data: UpdateSchemaType) -> Optional[ModelType]:
        """Update an existing record."""
        obj = await self.get_by_id(id)
        if not obj:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(obj, field, value)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj
    
    async def delete(self, id: UUID) -> bool:
        """Delete a record by ID."""
        obj = await self.get_by_id(id)
        if not obj:
            return False
        await self.db.delete(obj)
        await self.db.commit()
        return True
```

### 4. Response Model Consistency

**Always use `response_model` parameter:**

```python
# ❌ Bad - Missing response_model
@router.get("/online")
async def get_online_assets(db: AsyncSession = Depends(get_db)):
    ...
    return [{"ip_address": asset.ip_address, ...}]

# ✅ Good - Explicit response_model
class OnlineAssetResponse(BaseModel):
    ip_address: str
    hostname: str
    status: str

@router.get("/online", response_model=List[OnlineAssetResponse])
async def get_online_assets(db: AsyncSession = Depends(get_db)) -> List[OnlineAssetResponse]:
    ...
```

### 5. Dependency Injection Best Practices

```python
# backend/app/core/dependencies.py
from typing import Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

# Type aliases for common dependencies
DBSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

# Usage in endpoints
@router.get("/protected")
async def protected_endpoint(
    db: DBSession,
    user: CurrentUser
):
    ...
```

---

## Frontend Standards

### 1. Remove Console.log Statements

**Current Issue:** Production code contains `console.log()` for debugging.

```typescript
// ❌ Bad - Found in multiple files
console.log('Debug info:', data);

// ✅ Good - Use conditional logging or remove
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}

// ✅ Better - Create a logger utility
// frontend/src/utils/logger.ts
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: unknown[]) => isDev && console.log('[DEBUG]', ...args),
  info: (...args: unknown[]) => isDev && console.info('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};
```

**Files to Refactor:**
- `frontend/src/components/ProtocolConnection.tsx`
- `frontend/src/components/ScanSettingsModal.tsx`
- `frontend/src/pages/Assets.tsx`
- `frontend/src/pages/Access.tsx`
- `frontend/src/pages/Topology.tsx`
- `frontend/src/pages/Agents.tsx`
- `frontend/src/services/agentService.ts`

### 2. TypeScript Strict Mode

**Enable strict mode in tsconfig.json:**

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 3. Avoid `any` Type

```typescript
// ❌ Bad
const headers: any = { Authorization: `Bearer ${token}` };
const data: any = response.data;

// ✅ Good - Use proper types
interface RequestHeaders {
  Authorization: string;
  'X-Agent-POV'?: string;
}

const headers: RequestHeaders = { Authorization: `Bearer ${token}` };

// ✅ Good - Use generics for API responses
interface ApiResponse<T> {
  data: T;
  status: number;
}
```

### 4. Custom Hooks for API Calls

```typescript
// frontend/src/hooks/useAssets.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetService, Asset } from '../services/assetService';
import { useAuthStore } from '../store/authStore';
import { usePOV } from '../context/POVContext';

export function useAssets(status?: string) {
  const { token } = useAuthStore();
  const { activeAgent } = usePOV();
  
  return useQuery({
    queryKey: ['assets', status, activeAgent?.id],
    queryFn: () => assetService.getAssets(token!, status, activeAgent?.id),
    enabled: !!token,
    staleTime: 30000, // 30 seconds
  });
}

export function useDeleteAllAssets() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => assetService.deleteAllAssets(token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
```

### 5. Component Structure

```typescript
// Standard component structure
import React, { FC, useCallback, useMemo } from 'react';

// Types first
interface ComponentProps {
  id: string;
  title: string;
  onAction?: (id: string) => void;
}

// Constants
const DEFAULT_TITLE = 'Untitled';

// Component
export const Component: FC<ComponentProps> = ({ 
  id, 
  title = DEFAULT_TITLE, 
  onAction 
}) => {
  // Hooks at the top
  const memoizedValue = useMemo(() => {
    return computeExpensiveValue(title);
  }, [title]);
  
  // Event handlers
  const handleClick = useCallback(() => {
    onAction?.(id);
  }, [id, onAction]);
  
  // Render
  return (
    <div onClick={handleClick}>
      {memoizedValue}
    </div>
  );
};
```

---

## Architecture Standards

### 1. Directory Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/     # Route handlers
│   │   │   └── router.py      # Route aggregation
│   │   └── websockets/        # WebSocket handlers
│   ├── core/                  # Core configuration
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── dependencies.py    # NEW: Shared dependencies
│   │   └── security.py
│   ├── models/                # SQLAlchemy models
│   ├── schemas/               # Pydantic schemas
│   ├── services/              # Business logic
│   │   ├── base_service.py    # NEW: Base service class
│   │   └── ...
│   └── utils/                 # NEW: Utility functions
│       ├── logging.py
│       └── validators.py
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/

frontend/
├── src/
│   ├── components/            # Reusable components
│   │   ├── common/            # NEW: Shared UI components
│   │   └── ...
│   ├── context/               # React contexts
│   ├── hooks/                 # NEW: Custom hooks
│   ├── pages/                 # Page components
│   ├── services/              # API service layer
│   ├── store/                 # Zustand stores
│   ├── types/                 # NEW: TypeScript types
│   └── utils/                 # NEW: Utility functions
│       └── logger.ts
└── tests/                     # NEW: Test directory
```

### 2. API Versioning

**Always version APIs:**

```python
# Current: /api/v1/assets
# Future: /api/v2/assets (breaking changes)

# router.py
api_router_v1 = APIRouter(prefix="/api/v1")
api_router_v2 = APIRouter(prefix="/api/v2")  # For future versions
```

### 3. Environment Configuration

```python
# backend/app/core/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Use descriptive names
    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    
    # Environment-specific
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    # Feature flags
    ENABLE_OFFENSIVE_TOOLS: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    """Cached settings loader."""
    return Settings()

settings = get_settings()
```

---

## Code Quality Standards

### 1. Import Organization

```python
# Standard library imports
import logging
from datetime import datetime
from typing import Optional, List, Dict

# Third-party imports
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

# Local imports
from app.core.database import get_db
from app.services.asset_service import AssetService
from app.schemas.asset import AssetResponse
```

### 2. Docstring Standards

```python
def calculate_confidence_score(
    arp_evidence: bool,
    flow_evidence: bool,
    traceroute_evidence: bool
) -> float:
    """
    Calculate confidence score for network connection.
    
    Confidence is determined by weighted evidence from multiple sources.
    The final score is clamped between 0.0 and 1.0.
    
    Args:
        arp_evidence: Whether ARP table shows this connection.
        flow_evidence: Whether network flows confirm the connection.
        traceroute_evidence: Whether traceroute confirms the path.
    
    Returns:
        float: Confidence score between 0.0 and 1.0.
    
    Example:
        >>> calculate_confidence_score(True, True, False)
        0.7
    """
    score = 0.0
    if arp_evidence:
        score += 0.4
    if flow_evidence:
        score += 0.3
    if traceroute_evidence:
        score += 0.25
    return min(score, 1.0)
```

### 3. Error Messages

```python
# ❌ Bad - Vague error
raise HTTPException(status_code=500, detail="Error")

# ❌ Bad - Exposes internal details
raise HTTPException(status_code=500, detail=str(e))

# ✅ Good - Structured, informative, safe
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail={
        "error": "asset_not_found",
        "message": "The requested asset could not be found",
        "asset_id": asset_id
    }
)
```

---

## Testing Standards

### 1. Test File Organization

```
tests/
├── conftest.py              # Shared fixtures
├── unit/
│   ├── services/
│   │   ├── test_asset_service.py
│   │   └── test_traffic_service.py
│   └── utils/
│       └── test_validators.py
├── integration/
│   ├── api/
│   │   ├── test_assets_api.py
│   │   └── test_auth_api.py
│   └── test_database.py
└── e2e/
    └── test_discovery_flow.py
```

### 2. Test Naming Convention

```python
# test_<module>_<function>_<scenario>
def test_asset_service_get_by_id_returns_asset_when_exists():
    ...

def test_asset_service_get_by_id_returns_none_when_not_found():
    ...

def test_asset_service_create_raises_on_duplicate_ip():
    ...
```

### 3. Fixture Pattern

```python
# conftest.py
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from app.core.database import Base

@pytest_asyncio.fixture
async def db_session():
    """Create a test database session."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSession(engine) as session:
        yield session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
def sample_asset():
    """Create a sample asset for testing."""
    return {
        "ip_address": "192.168.1.100",
        "mac_address": "00:11:22:33:44:55",
        "hostname": "test-host",
        "asset_type": "host"
    }
```

---

## Security Standards

### 1. Input Validation

```python
from pydantic import BaseModel, Field, field_validator
import re

class AssetCreate(BaseModel):
    ip_address: str = Field(..., description="IPv4 or IPv6 address")
    hostname: Optional[str] = Field(None, max_length=255)
    
    @field_validator('ip_address')
    @classmethod
    def validate_ip(cls, v: str) -> str:
        """Validate IP address format."""
        import ipaddress
        try:
            ipaddress.ip_address(v)
            return v
        except ValueError:
            raise ValueError('Invalid IP address format')
    
    @field_validator('hostname')
    @classmethod
    def validate_hostname(cls, v: Optional[str]) -> Optional[str]:
        """Validate hostname format and prevent injection."""
        if v is None:
            return v
        # Only allow valid hostname characters
        if not re.match(r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})*$', v):
            raise ValueError('Invalid hostname format')
        return v
```

### 2. Authentication

```python
# Always require authentication for sensitive endpoints
@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Required!
):
    # Check permissions
    if not current_user.has_permission("assets:delete"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    ...
```

### 3. Secrets Management

```python
# ❌ Bad - Hardcoded secrets
SECRET_KEY = "your-secret-key-change-this"

# ✅ Good - Environment variables with validation
class Settings(BaseSettings):
    SECRET_KEY: str
    
    @field_validator('SECRET_KEY')
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if v == "your-secret-key-change-this":
            raise ValueError("SECRET_KEY must be changed from default")
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v
```

---

## Priority Refactoring Items

### Immediate (High Priority)

| Item | Files | Effort |
|------|-------|--------|
| Replace `print()` with logging | 6 backend files | 1 hour |
| Replace `console.log()` with logger | 7 frontend files | 1 hour |
| Add `response_model` to all endpoints | 5 endpoint files | 2 hours |

### Short-term (Medium Priority)

| Item | Files | Effort |
|------|-------|--------|
| Create base service class | New file + refactor services | 4 hours |
| Add TypeScript strict mode | tsconfig.json + fix errors | 4 hours |
| Create custom hooks for API calls | New hooks directory | 3 hours |
| Add unit tests for services | New test files | 8 hours |

### Long-term (Low Priority)

| Item | Files | Effort |
|------|-------|--------|
| Complete API documentation | All endpoint files | 8 hours |
| Add integration tests | New test files | 16 hours |
| Implement error boundary in React | New component | 2 hours |

---

## Implementation Checklist

- [x] Create `backend/app/utils/logging.py` with structured logging ✅
- [x] Create `frontend/src/utils/logger.ts` with development-only logging ✅
- [x] Replace all `print()` statements in backend ✅
- [x] Replace all `console.log()` statements in frontend ✅
- [x] Add `response_model` to endpoints missing them ✅
- [x] Create `backend/app/services/base_service.py` ✅
- [x] Create `frontend/src/hooks/` directory with custom hooks ✅
- [x] Enable TypeScript strict mode ✅ (already enabled in tsconfig.json)
- [ ] Add comprehensive unit tests
- [ ] Update API documentation

---

## References

- [FastAPI Best Practices](https://fastapi.tiangolo.com/tutorial/best-practices/)
- [SQLAlchemy 2.0 Patterns](https://docs.sqlalchemy.org/en/20/orm/quickstart.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Zustand Best Practices](https://github.com/pmndrs/zustand#best-practices)
- [Pydantic V2 Migration](https://docs.pydantic.dev/latest/migration/)
