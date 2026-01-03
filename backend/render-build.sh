#!/bin/bash
set -e

echo "=== Render Build Script ==="
echo "Current directory: $(pwd)"

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Fetch Prisma binaries explicitly
echo "Fetching Prisma binaries..."
python -m prisma py fetch

# Generate Prisma client
echo "Generating Prisma client..."
python -m prisma generate

# Copy the binary to the project directory (this persists to runtime)
echo "Copying Prisma binary to project directory..."
BINARY_PATH="/opt/render/.cache/prisma-python/binaries/5.8.0/0a83d8541752d7582de2ebc1ece46519ce72a848/prisma-query-engine-debian-openssl-3.0.x"

if [ -f "$BINARY_PATH" ]; then
    echo "Found binary at: $BINARY_PATH"
    cp "$BINARY_PATH" ./prisma-query-engine-debian-openssl-3.0.x
    chmod +x ./prisma-query-engine-debian-openssl-3.0.x
    echo "Binary copied to: $(pwd)/prisma-query-engine-debian-openssl-3.0.x"
    ls -la ./prisma-query-engine-debian-openssl-3.0.x
else
    echo "Binary not found at expected path, searching..."
    # Find binary in cache
    FOUND_BINARY=$(find /opt/render/.cache -name "prisma-query-engine-debian-openssl-3.0.x" -type f 2>/dev/null | head -1)
    if [ -n "$FOUND_BINARY" ]; then
        echo "Found binary at: $FOUND_BINARY"
        cp "$FOUND_BINARY" ./prisma-query-engine-debian-openssl-3.0.x
        chmod +x ./prisma-query-engine-debian-openssl-3.0.x
        echo "Binary copied successfully"
        ls -la ./prisma-query-engine-debian-openssl-3.0.x
    else
        echo "ERROR: Could not find Prisma binary!"
        find /opt/render/.cache -name "prisma-*" -type f 2>/dev/null || echo "No prisma files found in cache"
        exit 1
    fi
fi

echo "=== Build Complete ==="
