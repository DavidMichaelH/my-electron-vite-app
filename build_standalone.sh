#!/bin/bash

# Build script for macOS
# This script builds the Python backend and packages the Electron app

set -e  # Exit on error

echo "========================================="
echo "Building Standalone App for macOS"
echo "========================================="

# Step 1: Build Python backend
echo ""
echo "Step 1: Building Python backend with PyInstaller..."
cd backend

if [ ! -f "dist/backend" ]; then
    echo "Building backend executable..."
    pyinstaller backend.spec
else
    echo "Backend already built. Remove backend/dist/backend to rebuild."
fi

# Check if backend was built successfully
if [ ! -f "dist/backend" ]; then
    echo "Error: Backend executable not found at backend/dist/backend"
    exit 1
fi

echo "Backend built successfully: $(ls -lh dist/backend | awk '{print $5}')"
cd ..

# Step 2: Build and package Electron app
echo ""
echo "Step 2: Building Electron app..."
npm run build:mac

echo ""
echo "========================================="
echo "Build Complete!"
echo "========================================="
echo ""
echo "Your app is ready at:"
if [ -d "dist/mac-arm64" ]; then
    echo "  dist/mac-arm64/*.app"
    echo "  dist/*.dmg"
elif [ -d "dist/mac" ]; then
    echo "  dist/mac/*.app"
    echo "  dist/*.dmg"
fi
echo ""
