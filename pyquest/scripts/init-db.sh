#!/bin/bash
# PostgreSQL initialization script
# Runs on first database creation

set -e

echo "Initializing PyQuest database..."

# Create any additional database users or extensions here
# This file runs as the postgres user

# Example: Create read-only user for analytics
# psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
#     CREATE USER readonly_user WITH PASSWORD 'readonly_password';
#     GRANT CONNECT ON DATABASE $POSTGRES_DB TO readonly_user;
#     GRANT USAGE ON SCHEMA public TO readonly_user;
#     GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
#     ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_user;
# EOSQL

echo "Database initialization complete!"
