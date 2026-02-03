# Production deployment script for Windows
# Automates the full deployment process

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "PyQuest Production Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Configuration
$COMPOSE_FILE = "docker-compose.prod.yml"
$ENV_FILE = ".env.production"

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-Path $ENV_FILE)) {
    Write-Host "Error: $ENV_FILE not found!" -ForegroundColor Red
    Write-Host "Please create it from .env.production template" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Docker is not installed" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Docker Compose is not installed" -ForegroundColor Red
    exit 1
}

Write-Host "Building Docker images..." -ForegroundColor Green
docker-compose -f $COMPOSE_FILE build --no-cache

Write-Host "Stopping existing containers..." -ForegroundColor Yellow
docker-compose -f $COMPOSE_FILE down

Write-Host "Starting services..." -ForegroundColor Green
docker-compose -f $COMPOSE_FILE up -d

Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "Running database migrations..." -ForegroundColor Green
docker-compose -f $COMPOSE_FILE exec -T web npx prisma migrate deploy

Write-Host "Checking service health..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check health endpoints
Write-Host "Checking web service health..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "Web service: OK" -ForegroundColor Green
} catch {
    Write-Host "Warning: Web health check failed" -ForegroundColor Yellow
}

Write-Host "Checking runner service health..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "Runner service: OK" -ForegroundColor Green
} catch {
    Write-Host "Warning: Runner health check failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Web UI: http://localhost:3000" -ForegroundColor White
Write-Host "Health: http://localhost:3000/api/health" -ForegroundColor White
Write-Host "Metrics: http://localhost:3000/api/metrics" -ForegroundColor White
Write-Host ""
Write-Host "View logs with: docker-compose -f $COMPOSE_FILE logs -f" -ForegroundColor Yellow
Write-Host "Stop services: docker-compose -f $COMPOSE_FILE down" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan
