#!/bin/sh

# Run migrations if RUN_MIGRATIONS is set to true
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running database migrations..."
  prisma migrate deploy
fi

# Start the application
echo "Starting application on port ${PORT:-8000}..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}

