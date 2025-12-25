#!/bin/bash

# Wait for database to be ready
echo "Waiting for database..."
# Simple wait loop
for i in {1..30}; do
    if curl -s http://postgres:5432 > /dev/null; then
        # This is a bit hacky since postgres isn't http, but it checks if port is open
        break
    fi
    # Better way: use pg_isready if available
    if command -v pg_isready > /dev/null; then
        if pg_isready -h postgres -p 5432; then
            break
        fi
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
