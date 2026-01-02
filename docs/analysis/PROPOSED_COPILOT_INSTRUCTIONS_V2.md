# NOP Project Copilot Instructions

**Network Operations Platform** - Full-stack network security and management tool

---

## Project Overview

NOP is a network operations platform with:
- **Backend**: FastAPI + PostgreSQL + Redis (Python 3.11+)
- **Frontend**: React + TypeScript + Tailwind CSS
- **Infrastructure**: Docker Compose with multi-container architecture

---

## Codebase Structure

```
backend/
├── app/
│   ├── api/          # FastAPI routes
│   ├── core/         # Config, database, security
│   ├── models/       # SQLAlchemy models
│   ├── schemas/      # Pydantic schemas
│   └── services/     # Business logic

frontend/
├── src/
│   ├── pages/        # Route components
│   ├── components/   # Reusable UI components
│   ├── stores/       # Zustand state stores
│   └── services/     # API client services
```

---

## Coding Standards

### Backend (Python/FastAPI)

- **Layered architecture**: Route → Service → Model
- **Async first**: Use `async/await` for all I/O
- **Type hints**: All function signatures typed
- **Pydantic**: Use schemas for request/response validation
- **Dependency injection**: Use `Depends()` for db, auth

```python
@router.get("/{id}", response_model=AssetResponse)
async def get_asset(id: int, db: AsyncSession = Depends(get_db)) -> AssetResponse:
    """Get asset by ID."""
    result = await db.execute(select(Asset).where(Asset.id == id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset
```

### Frontend (React/TypeScript)

- **Functional components**: Use `React.FC` with TypeScript interfaces
- **Zustand**: Global state in `stores/*.ts`
- **Tailwind**: Cyberpunk theme with green/purple accents
- **Memoize callbacks**: Use `useCallback` for event handlers

```typescript
interface AssetCardProps {
  asset: Asset;
  onSelect?: (asset: Asset) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onSelect }) => {
  const handleClick = useCallback(() => onSelect?.(asset), [asset, onSelect]);
  return (
    <div className="bg-cyber-dark border border-cyber-green p-4" onClick={handleClick}>
      {asset.name}
    </div>
  );
};
```

---

## Key Components

### Backend Services

| Service | Purpose | Location |
|---------|---------|----------|
| SnifferService | Packet capture & dissection | `services/SnifferService.py` |
| NetworkScanner | NMAP integration | `services/NetworkScanner.py` |
| AccessHubService | SSH/FTP/RDP connections | `services/AccessHubService.py` |
| CVELookupService | NVD vulnerability lookup | `services/CVELookupService.py` |

### Frontend Stores

| Store | Purpose | Location |
|-------|---------|----------|
| authStore | JWT authentication | `stores/authStore.ts` |
| scanStore | Scan tab management | `stores/scanStore.ts` |
| accessStore | Connection management | `stores/accessStore.ts` |

---

## Development Commands

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Backend only
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Frontend only
cd frontend && npm install && npm run dev

# Run tests
cd backend && pytest
cd frontend && npm test

# Build production
docker-compose build
```

---

## When Making Changes

1. **Read related code first** - Understand existing patterns
2. **Match existing style** - Don't introduce new conventions
3. **Type everything** - No `any` in TypeScript, type hints in Python
4. **Test your changes** - Run tests, verify manually
5. **Keep it minimal** - Smallest change that solves the problem

---

## Theming

Use Tailwind classes with cyberpunk color palette:
- Backgrounds: `bg-cyber-dark`, `bg-cyber-gray`
- Accents: `text-cyber-green`, `border-cyber-purple`
- Interactive: `hover:bg-cyber-green/20`
