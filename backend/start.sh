#!/bin/bash

# Wait for database to be ready
echo "Waiting for database..."
# Extract database host from DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
# Simple wait loop
for i in {1..30}; do
    # Use python to check if postgres is ready
    if python -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.connect(('$DB_HOST', 5432))" 2>/dev/null; then
        break
    fi
    echo "Database not ready yet, waiting..."
    sleep 1
done

# Initialize database (creates all tables from models)
echo "Initializing database..."
python -m app.core.init_db
if [ $? -ne 0 ]; then
    echo "Database initialization failed! Exiting."
    exit 1
fi

# Start the application
echo "Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 12001
