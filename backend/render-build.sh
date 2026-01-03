#!/bin/bash
set -e

# Navigate to backend directory
cd backend 2>/dev/null || cd /opt/render/project/src/backend || pwd

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Fetching Prisma binaries..."
# Fetch binaries explicitly
python -m prisma py fetch || prisma py fetch || echo "Binary fetch attempted"

echo "Generating Prisma client..."
python -m prisma generate --schema=./prisma/schema.prisma || \
prisma generate --schema=./prisma/schema.prisma || \
python -m prisma generate || \
prisma generate

echo "Copying Prisma binary to backend directory for runtime..."
# Find and copy the binary to the backend directory so it's available at runtime
BINARY_CACHE="/opt/render/.cache/prisma-python/binaries"
if [ -d "$BINARY_CACHE" ]; then
    # Find the binary in cache
    BINARY=$(find "$BINARY_CACHE" -name "prisma-query-engine-debian-openssl-3.0.x" -type f 2>/dev/null | head -1)
    if [ -n "$BINARY" ] && [ -f "$BINARY" ]; then
        echo "Found binary at: $BINARY"
        cp "$BINARY" ./prisma-query-engine-debian-openssl-3.0.x
        chmod +x ./prisma-query-engine-debian-openssl-3.0.x
        echo "Binary copied to backend directory"
    else
        echo "Binary not found in cache, trying alternative locations..."
        # Try to find it in venv or other locations
        find . -name "prisma-query-engine-*" -type f 2>/dev/null | head -1 | while read b; do
            if [ -n "$b" ]; then
                cp "$b" ./prisma-query-engine-debian-openssl-3.0.x 2>/dev/null && \
                chmod +x ./prisma-query-engine-debian-openssl-3.0.x && \
                echo "Binary copied from: $b" || true
            fi
        done
    fi
else
    echo "Cache directory not found, trying to find binary in venv..."
    find . -name "prisma-query-engine-*" -type f 2>/dev/null | head -1 | while read b; do
        if [ -n "$b" ]; then
            cp "$b" ./prisma-query-engine-debian-openssl-3.0.x 2>/dev/null && \
            chmod +x ./prisma-query-engine-debian-openssl-3.0.x && \
            echo "Binary copied from: $b" || true
        fi
    done
fi

echo "Build completed!"
