---
title: Contributing to NOP
type: guide
category: development
last_updated: 2026-01-14
---

# Contributing to NOP

Thank you for your interest in contributing to the Network Observatory Platform! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Changes](#submitting-changes)
- [Documentation](#documentation)

## Code of Conduct

We expect all contributors to:
- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Git
- Node.js 18+ and npm (for frontend development)
- Python 3.11+ (for backend development)
- Code editor (VS Code recommended)

### Development Environment Setup

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/yourusername/NOP.git
   cd NOP
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start services**:
   ```bash
   docker-compose up -d
   ```

4. **Verify setup**:
   - Frontend: http://localhost:12000
   - Backend API: http://localhost:12001/docs

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Critical production fixes

### Creating a Feature

1. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes**:
   - Write code following our [coding standards](#coding-standards)
   - Add tests for new functionality
   - Update documentation as needed

3. **Commit changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

4. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

## Coding Standards

### Backend (Python)

- **Style**: Follow [PEP 8](https://pep8.org/)
- **Type hints**: Use type annotations
- **Docstrings**: Google-style docstrings
- **Linting**: Use `black`, `flake8`, `mypy`

**Example**:
```python
from typing import List, Optional

def get_assets(limit: int = 100, offset: int = 0) -> List[Asset]:
    """Retrieve assets from the database.
    
    Args:
        limit: Maximum number of assets to return
        offset: Number of assets to skip
        
    Returns:
        List of Asset objects
        
    Raises:
        DatabaseError: If database connection fails
    """
    # Implementation
    pass
```

**Linting**:
```bash
cd backend
black app/
flake8 app/
mypy app/
```

### Frontend (TypeScript/React)

- **Style**: Consistent with existing codebase
- **Type safety**: Use TypeScript strictly
- **Components**: Functional components with hooks
- **Naming**: PascalCase for components, camelCase for functions

**Example**:
```typescript
interface AssetCardProps {
  asset: Asset;
  onSelect: (id: string) => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, onSelect }) => {
  const handleClick = () => {
    onSelect(asset.id);
  };

  return (
    <div className="asset-card" onClick={handleClick}>
      {/* Component content */}
    </div>
  );
};
```

**Linting**:
```bash
cd frontend
npm run lint
npm run type-check
```

### General Guidelines

1. **Files < 500 lines** - Break up large files
2. **Functions < 50 lines** - Keep functions focused
3. **Meaningful names** - Use descriptive variable/function names
4. **Comments** - Explain "why", not "what"
5. **Error handling** - Always handle errors explicitly
6. **Security** - Never commit secrets or credentials

## Testing Guidelines

### Backend Tests

Located in `backend/tests/`:

**Run tests**:
```bash
cd backend
pytest
```

**Write tests**:
```python
import pytest
from app.services.ping_service import PingService

def test_validate_target_valid_ip():
    """Test IP address validation."""
    service = PingService()
    result = service._validate_target("192.168.1.1")
    assert result == "192.168.1.1"

def test_validate_target_invalid():
    """Test invalid target rejection."""
    service = PingService()
    with pytest.raises(ValueError):
        service._validate_target("invalid..host")
```

### Frontend Tests

Located in `frontend/src/__tests__/`:

**Run tests**:
```bash
cd frontend
npm test
```

**Write tests**:
```typescript
import { render, screen } from '@testing-library/react';
import AssetCard from '../components/AssetCard';

describe('AssetCard', () => {
  it('renders asset information', () => {
    const asset = { id: '1', ip: '192.168.1.1', hostname: 'test' };
    render(<AssetCard asset={asset} onSelect={() => {}} />);
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
  });
});
```

### Test Coverage

- Aim for >80% code coverage
- Focus on critical paths and edge cases
- Test both success and failure scenarios

## Submitting Changes

### Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Run all tests** and ensure they pass
4. **Update CHANGELOG** (if applicable)
5. **Create pull request** with clear description

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] No new warnings
```

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged
4. Celebrate! 🎉

## Documentation

### When to Update Docs

- Adding new features
- Changing APIs or behavior
- Fixing bugs that affect documented behavior
- Adding configuration options

### Documentation Structure

- `docs/guides/` - User guides and tutorials
- `docs/technical/` - API and technical documentation
- `docs/architecture/` - System architecture
- `docs/features/` - Feature descriptions
- `docs/development/` - Development docs

### Writing Documentation

- Use clear, concise language
- Include code examples
- Add diagrams where helpful
- Keep formatting consistent
- Test all code examples

## Project Structure

Understanding the codebase:

```
backend/
├── app/
│   ├── api/          # API endpoints
│   ├── core/         # Core configuration
│   ├── models/       # Database models
│   ├── schemas/      # Pydantic schemas
│   ├── services/     # Business logic
│   └── utils/        # Utility functions

frontend/
├── src/
│   ├── components/   # Reusable components
│   ├── pages/        # Page components
│   ├── services/     # API services
│   └── store/        # State management
```

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Join our community chat (if available)

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to NOP! 🚀
