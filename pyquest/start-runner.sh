#!/bin/bash
# Start PyQuest Runner Service
# This script starts the Docker runner service needed for code execution

echo "🐳 Starting PyQuest Runner Service..."
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running or not installed"
    echo ""
    echo "Please install Docker and make sure it's running:"
    echo "https://www.docker.com/get-started"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Start the runner service
echo "Starting runner service..."
docker-compose up runner

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Runner service started successfully!"
    echo ""
    echo "The runner service is now available at: http://localhost:8080"
    echo "You can now use the 'Run Tests' button in the app"
else
    echo ""
    echo "❌ Failed to start runner service"
    echo ""
    echo "Try running: docker-compose build runner"
    exit 1
fi
