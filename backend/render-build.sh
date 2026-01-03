#!/bin/bash
set -e

# Navigate to backend directory
cd backend 2>/dev/null || cd /opt/render/project/src/backend || pwd

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Fetching Prisma binaries..."
# Try to fetch binaries - this is critical for Prisma to work
python -m prisma py fetch 2>/dev/null || \
prisma py fetch 2>/dev/null || \
echo "Note: Binary fetch attempted"

echo "Generating Prisma client..."
python -m prisma generate --schema=./prisma/schema.prisma || \
prisma generate --schema=./prisma/schema.prisma || \
python -m prisma generate || \
prisma generate

echo "Build completed!"
