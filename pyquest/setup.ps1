# PyQuest Setup Script
# Run this script to set up your development environment

Write-Host "🐍 PyQuest Setup Script" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "✓ Node.js $nodeVersion installed" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js is not installed. Please install Node.js 18.x or later." -ForegroundColor Red
    exit 1
}

# Check if PostgreSQL is installed
Write-Host "Checking PostgreSQL..." -ForegroundColor Yellow
$pgVersion = psql --version 2>$null
if ($pgVersion) {
    Write-Host "✓ PostgreSQL found" -ForegroundColor Green
} else {
    Write-Host "⚠ PostgreSQL not found in PATH. Make sure it's installed and configured." -ForegroundColor Yellow
}

# Check if .env file exists
Write-Host ""
Write-Host "Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path .\.env) {
    Write-Host "✓ .env file exists" -ForegroundColor Green
} else {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item .\.env.example .\.env
    Write-Host "✓ .env file created" -ForegroundColor Green
    Write-Host "⚠ Please update DATABASE_URL in .env with your PostgreSQL credentials" -ForegroundColor Yellow
}

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Generate Prisma Client
Write-Host ""
Write-Host "Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Prisma Client generated" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to generate Prisma Client" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================" -ForegroundColor Cyan
Write-Host "✓ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update your DATABASE_URL in .env if you haven't already" -ForegroundColor White
Write-Host "2. Create the database: createdb pyquest" -ForegroundColor White
Write-Host "3. Push the schema: npm run prisma:push" -ForegroundColor White
Write-Host "4. Start the dev server: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Happy coding! 🎉" -ForegroundColor Cyan
