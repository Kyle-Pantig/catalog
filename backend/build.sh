#!/bin/bash
set -e

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Installing Node.js for Prisma..."
# Check if node is already installed
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo "Fetching Prisma binaries..."
cd /opt/render/project/src/backend || cd backend
prisma py fetch

echo "Generating Prisma client..."
prisma generate

echo "Build completed successfully!"

