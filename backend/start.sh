#!/bin/bash

# Wait for database to be ready
echo "Waiting for database..."
# Simple wait loop
for i in {1..30}; do
    # Use python to check if postgres is ready
    if python -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.connect(('postgres', 5432))" 2>/dev/null; then
        break
    fi
    echo "Database not ready yet, waiting..."
    sleep 1
done

# Initialize database and seed admin user
echo "Initializing database..."
python -m app.core.init_db
if [ $? -ne 0 ]; then
    echo "Database initialization failed! Exiting."
    exit 1
fi

# Start the application
echo "Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
