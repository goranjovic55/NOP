#!/bin/bash
# Run pytest with coverage for the NOP backend

cd backend

echo "=== Running Backend Tests with Coverage ==="
pytest \
  --cov=app \
  --cov-report=html \
  --cov-report=term \
  -v \
  tests/

echo ""
echo "Coverage report generated in backend/htmlcov/index.html"
