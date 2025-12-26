# Makefile for NOP - Network Observatory Platform
# Simplifies building and managing the project

.PHONY: help build-portable build-frontend build-backend clean install-deps test docker-build docker-up docker-down

# Default target
help:
	@echo "NOP - Network Observatory Platform"
	@echo ""
	@echo "Available targets:"
	@echo "  make build-portable    - Build portable executable (Nuitka)"
	@echo "  make build-frontend    - Build React frontend only"
	@echo "  make build-backend     - Build backend only (development)"
	@echo "  make install-deps      - Install all dependencies"
	@echo "  make clean             - Remove build artifacts"
	@echo "  make docker-build      - Build Docker images"
	@echo "  make docker-up         - Start Docker containers"
	@echo "  make docker-down       - Stop Docker containers"
	@echo "  make test              - Run tests"
	@echo ""
	@echo "Quick start (Portable):"
	@echo "  make install-deps && make build-portable"
	@echo ""
	@echo "Quick start (Docker):"
	@echo "  make docker-build && make docker-up"

# Build portable executable
build-portable: build-frontend
	@echo "Building portable executable with Nuitka..."
	@chmod +x scripts/build_portable.sh
	@./scripts/build_portable.sh

# Build portable (minimal)
build-portable-minimal: build-frontend
	@echo "Building minimal portable executable..."
	@chmod +x scripts/build_portable.sh
	@./scripts/build_portable.sh --minimal

# Build portable (no offensive tools)
build-portable-safe: build-frontend
	@echo "Building portable executable without offensive tools..."
	@chmod +x scripts/build_portable.sh
	@./scripts/build_portable.sh --no-offensive

# Build frontend only
build-frontend:
	@echo "Building React frontend..."
	@cd frontend && npm install && npm run build

# Build backend (development mode, not portable)
build-backend:
	@echo "Setting up backend for development..."
	@cd backend && pip install -r requirements.txt

# Install all dependencies
install-deps:
	@echo "Installing all dependencies..."
	@echo "Installing Node.js dependencies..."
	@cd frontend && npm install
	@echo "Installing Python dependencies..."
	@cd backend && pip install -r requirements.txt -r requirements-portable.txt
	@echo "Dependencies installed successfully!"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf frontend/build
	@rm -rf frontend/node_modules
	@rm -rf backend/dist
	@rm -rf backend/build
	@rm -rf backend/*.build
	@rm -rf backend/*.dist
	@rm -rf backend/*.onefile-build
	@rm -rf backend/frontend_build
	@find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "Clean complete!"

# Docker build
docker-build:
	@echo "Building Docker images..."
	@docker-compose build

# Start Docker containers
docker-up:
	@echo "Starting Docker containers..."
	@docker-compose up -d
	@echo "NOP is running at http://localhost:12000"

# Stop Docker containers
docker-down:
	@echo "Stopping Docker containers..."
	@docker-compose down

# Restart Docker containers
docker-restart: docker-down docker-up

# View Docker logs
docker-logs:
	@docker-compose logs -f

# Run tests (placeholder)
test:
	@echo "Running tests..."
	@cd backend && python -m pytest tests/ || echo "Tests not yet implemented"

# Development server (backend only)
dev-backend:
	@echo "Starting backend development server..."
	@cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Development server (frontend only)
dev-frontend:
	@echo "Starting frontend development server..."
	@cd frontend && npm start

# Format code
format:
	@echo "Formatting Python code..."
	@cd backend && black app/ || echo "black not installed"
	@echo "Formatting JavaScript/TypeScript code..."
	@cd frontend && npm run format || echo "prettier not configured"

# Lint code
lint:
	@echo "Linting Python code..."
	@cd backend && flake8 app/ || echo "flake8 not installed"
	@echo "Linting JavaScript/TypeScript code..."
	@cd frontend && npm run lint || echo "ESLint not configured"

# Create release package
release: clean build-portable
	@echo "Creating release package..."
	@mkdir -p release
	@cp backend/dist/nop-portable* release/ 2>/dev/null || echo "No portable executable found"
	@cp PORTABLE_README.md release/README.md
	@cp DEPLOYMENT_COMPARISON.md release/
	@tar -czf nop-release-$(shell date +%Y%m%d).tar.gz release/
	@echo "Release package created: nop-release-$(shell date +%Y%m%d).tar.gz"

# Show system info
info:
	@echo "System Information:"
	@echo "  OS: $(shell uname -s)"
	@echo "  Architecture: $(shell uname -m)"
	@echo "  Python: $(shell python3 --version 2>/dev/null || echo 'Not found')"
	@echo "  Node: $(shell node --version 2>/dev/null || echo 'Not found')"
	@echo "  npm: $(shell npm --version 2>/dev/null || echo 'Not found')"
	@echo "  Docker: $(shell docker --version 2>/dev/null || echo 'Not found')"
	@echo "  Docker Compose: $(shell docker-compose --version 2>/dev/null || echo 'Not found')"
