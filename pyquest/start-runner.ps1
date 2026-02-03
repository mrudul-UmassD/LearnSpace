#!/usr/bin/env pwsh
# Start PyQuest Runner Service
# This script starts the Docker runner service needed for code execution

Write-Host "🐳 Starting PyQuest Runner Service..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not responding"
    }
} catch {
    Write-Host "❌ Docker is not running or not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Docker Desktop and make sure it's running:" -ForegroundColor Yellow
    Write-Host "https://www.docker.com/products/docker-desktop" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ Docker is running" -ForegroundColor Green
Write-Host ""

# Start the runner service
Write-Host "Starting runner service..." -ForegroundColor Cyan
docker-compose up runner

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Runner service started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The runner service is now available at: http://localhost:8080" -ForegroundColor Cyan
    Write-Host "You can now use the 'Run Tests' button in the app" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Failed to start runner service" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try running: docker-compose build runner" -ForegroundColor Yellow
    exit 1
}
