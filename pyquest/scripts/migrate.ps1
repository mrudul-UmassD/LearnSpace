# Database migration script for Windows
# Run this before deploying new versions

$ErrorActionPreference = "Stop"

Write-Host "Starting database migration..." -ForegroundColor Green

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "Error: DATABASE_URL environment variable is not set" -ForegroundColor Red
    exit 1
}

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}

# Run migrations
Write-Host "Running database migrations..." -ForegroundColor Cyan
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to run migrations" -ForegroundColor Red
    exit 1
}

# Optional: Run seed data (comment out for production)
# Write-Host "Seeding database..." -ForegroundColor Cyan
# npm run prisma:seed

Write-Host "Migration complete!" -ForegroundColor Green
Write-Host "Database is ready for deployment" -ForegroundColor Green
