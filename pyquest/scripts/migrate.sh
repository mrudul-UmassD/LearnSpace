#!/bin/bash
# Database migration script
# Run this before deploying new versions

set -e

echo "Starting database migration..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Optional: Run seed data (comment out for production)
# echo "Seeding database..."
# npm run prisma:seed

echo "Migration complete!"
echo "Database is ready for deployment"
