# PyQuest - Docker Deployment Guide

## Quick Start

### Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- Git
- 4GB RAM minimum
- 10GB disk space

### 1. Clone and Setup

```bash
cd pyquest
cp .env.docker .env
```

Edit `.env` and change:
- `POSTGRES_PASSWORD` - Use a strong password
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`

### 2. Build and Run

```bash
# Build all services
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Check health
docker-compose ps
```

### 3. Initialize Database

```bash
# Run Prisma migrations
docker-compose exec web npx prisma migrate deploy

# (Optional) Seed database
docker-compose exec web npx prisma db seed
```

### 4. Access Application

- **Web App**: http://localhost:3000
- **Runner Service**: http://localhost:8080/health
- **Database**: localhost:5432

### 5. Test Code Execution

```bash
# Health check
curl http://localhost:8080/health

# Test runner directly
curl -X POST http://localhost:8080/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello, World!\")",
    "tests": [{
      "type": "output",
      "expected": "Hello, World!",
      "description": "Test print"
    }]
  }'
```

## Architecture

```
┌─────────────────┐
│   Web Browser   │
└────────┬────────┘
         │ HTTP :3000
┌────────▼────────┐
│   Next.js Web   │
│   (Container)   │
└────┬───────┬────┘
     │       │
     │       │ HTTP :8080
     │       │
┌────▼───┐ ┌▼──────────────┐
│   DB   │ │ Runner Service│
│  :5432 │ │  (Sandboxed)  │
└────────┘ └───────────────┘
```

## Services

### Web (Next.js)

- **Port**: 3000
- **Image**: Built from Dockerfile
- **Dependencies**: db, runner
- **Health**: `/api/health`

### Database (PostgreSQL)

- **Port**: 5432
- **Image**: postgres:16-alpine
- **Volume**: postgres_data
- **Health**: pg_isready

### Runner (Python Executor)

- **Port**: 8080
- **Image**: Built from services/runner/Dockerfile
- **Security**:
  - Read-only filesystem
  - No network access (for code)
  - CPU limit: 0.5 cores
  - Memory limit: 256MB
  - Execution timeout: 2s
  - Output limit: 1MB
- **Health**: `/health`

## Security Features

### Runner Service Isolation

1. **Container Security**
   - Read-only root filesystem
   - Writable `/tmp` only (64MB, no-exec)
   - Non-root user (UID 1000)
   - Dropped all capabilities except essential
   - no-new-privileges security option

2. **Resource Limits**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '0.5'
         memory: 256M
   ```

3. **Execution Limits**
   - Timeout: 2 seconds
   - Output: 1MB max
   - Code size: 100KB max

4. **No Network Access**
   - Container has network for API
   - Executed code runs in isolated subprocess
   - No external network calls from user code

### Network Isolation

- Internal bridge network (`pyquest-network`)
- Web service only exposed port
- Database and runner not directly accessible

## Common Commands

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f runner
docker-compose logs -f db
```

### Restart Services

```bash
# All services
docker-compose restart

# Specific service
docker-compose restart runner
```

### Stop Services

```bash
# Stop and remove containers
docker-compose down

# Stop and remove volumes (⚠️ deletes database)
docker-compose down -v
```

### Rebuild After Changes

```bash
# Rebuild specific service
docker-compose build web
docker-compose build runner

# Rebuild and restart
docker-compose up -d --build
```

### Database Management

```bash
# Access PostgreSQL shell
docker-compose exec db psql -U pyquest

# Run migrations
docker-compose exec web npx prisma migrate deploy

# Reset database (⚠️ destructive)
docker-compose exec web npx prisma migrate reset

# View database
docker-compose exec web npx prisma studio
```

## Troubleshooting

### Runner Service Not Responding

```bash
# Check runner health
docker-compose exec runner python3 -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8080/health').read())"

# Check runner logs
docker-compose logs runner

# Restart runner
docker-compose restart runner
```

### Database Connection Issues

```bash
# Check database health
docker-compose exec db pg_isready -U pyquest

# Verify connection from web
docker-compose exec web node -e "const { PrismaClient } = require('@prisma/client'); new PrismaClient().\$connect().then(() => console.log('Connected')).catch(e => console.error(e))"
```

### Port Conflicts

If ports are already in use:

1. Edit `.env`:
   ```
   PORT=3001
   POSTGRES_PORT=5433
   ```

2. Update `docker-compose.yml` ports section

3. Restart:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Code Execution Timeouts

Runner enforces 2-second limit. For legitimate long-running code:

1. Edit `services/runner/app.py`:
   ```python
   MAX_EXECUTION_TIME = 5  # Increase to 5 seconds
   ```

2. Rebuild:
   ```bash
   docker-compose build runner
   docker-compose restart runner
   ```

## Development vs Production

### Development Mode

```bash
# Use docker-compose.dev.yml
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Hot reload enabled
# Debug logs enabled
# Source code mounted as volumes
```

### Production Deployment

1. **Environment Variables**
   - Generate strong passwords
   - Use production database
   - Set proper `NEXTAUTH_URL`

2. **Resource Limits**
   - Adjust based on load
   - Monitor CPU/memory usage

3. **Logging**
   - Configure log aggregation
   - Set up alerts

4. **Backups**
   - Regular database backups
   - Volume snapshots

5. **Monitoring**
   - Health check endpoints
   - Prometheus metrics
   - Error tracking (Sentry)

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.yml
services:
  runner:
    deploy:
      replicas: 3  # Run 3 runner instances
```

### Load Balancing

Add nginx or traefik as reverse proxy:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - web
```

## Monitoring

### Health Checks

```bash
# Web service
curl http://localhost:3000/api/health

# Runner service
curl http://localhost:8080/health

# Database
docker-compose exec db pg_isready
```

### Resource Usage

```bash
# All containers
docker stats

# Specific container
docker stats pyquest-runner
```

## Performance Tuning

### Database

```yaml
# docker-compose.yml
db:
  command:
    - "postgres"
    - "-c"
    - "max_connections=100"
    - "-c"
    - "shared_buffers=256MB"
```

### Runner Service

Adjust based on load:

```yaml
runner:
  deploy:
    resources:
      limits:
        cpus: '1.0'      # Increase CPU
        memory: 512M     # Increase memory
```

### Next.js

```dockerfile
# Dockerfile - Production optimizations
ENV NODE_OPTIONS="--max-old-space-size=2048"
```

## Cleanup

```bash
# Stop services
docker-compose down

# Remove volumes
docker-compose down -v

# Remove images
docker rmi pyquest-web pyquest-runner

# Prune all unused Docker resources
docker system prune -a
```

## Support

- **Documentation**: See README.md
- **Issues**: GitHub Issues
- **Security**: security@pyquest.dev
