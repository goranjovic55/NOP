#!/bin/bash

# Wait for database to be ready
echo "Waiting for database..."
# You can add a more robust check here if needed

# Initialize database and seed admin user
echo "Initializing database..."
python -m app.core.init_db

# Start the application
echo "Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
