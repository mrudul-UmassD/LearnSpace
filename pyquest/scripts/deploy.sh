#!/bin/bash
# Production deployment script
# Automates the full deployment process

set -e

echo "========================================="
echo "PyQuest Production Deployment"
echo "========================================="

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

# Check prerequisites
echo "Checking prerequisites..."

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found!"
    echo "Please create it from .env.production template"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' $ENV_FILE | xargs)

echo "Building Docker images..."
docker-compose -f $COMPOSE_FILE build --no-cache

echo "Stopping existing containers..."
docker-compose -f $COMPOSE_FILE down

echo "Starting services..."
docker-compose -f $COMPOSE_FILE up -d

echo "Waiting for database to be ready..."
sleep 10

echo "Running database migrations..."
docker-compose -f $COMPOSE_FILE exec -T web npx prisma migrate deploy

echo "Checking service health..."
sleep 5

# Check health endpoints
echo "Checking web service health..."
curl -f http://localhost:3000/api/health || echo "Warning: Web health check failed"

echo "Checking runner service health..."
curl -f http://localhost:8080/health || echo "Warning: Runner health check failed"

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo "Web UI: http://localhost:3000"
echo "Health: http://localhost:3000/api/health"
echo "Metrics: http://localhost:3000/api/metrics"
echo ""
echo "View logs with: docker-compose -f $COMPOSE_FILE logs -f"
echo "Stop services: docker-compose -f $COMPOSE_FILE down"
echo "========================================="
