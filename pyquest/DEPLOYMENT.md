# DEPLOYMENT.md - Production Deployment Guide

## Quick Start

### Prerequisites
- Docker 20.10+ and Docker Compose 2.0+
- 2GB+ RAM available
- Ports 3000, 5432, 8080 available

### Deploy in 3 Commands

```bash
# 1. Configure environment
cp .env.production .env.production
# Edit .env.production with your secrets

# 2. Deploy (Linux/Mac)
./scripts/deploy.sh

# OR Windows
.\scripts\deploy.ps1

# 3. Verify
curl http://localhost:3000/api/health
```

## Architecture

```
                    ┌─────────────────┐
                    │  Reverse Proxy  │
                    │  (Nginx/Caddy)  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐         ┌─────▼─────┐      ┌──────▼──────┐
   │   Web   │────────▶│  Runner   │      │  PostgreSQL │
   │ Next.js │         │  Python   │      │  Database   │
   │  :3000  │         │   :8080   │      │    :5432    │
   └─────────┘         └───────────┘      └─────────────┘
```

## Security Checklist

Before deploying to production, ensure:

- [ ] `NEXTAUTH_SECRET` is a secure random string (32+ chars)
- [ ] `POSTGRES_PASSWORD` is strong and unique
- [ ] `DATABASE_URL` contains correct credentials
- [ ] `NEXTAUTH_URL` points to your public domain
- [ ] `.env.production` is NOT committed to git
- [ ] SSL/TLS certificates are configured (use Let's Encrypt)
- [ ] Firewall rules allow only necessary ports
- [ ] Database backups are scheduled
- [ ] Log rotation is configured
- [ ] Resource limits are appropriate for your traffic

## Deployment Steps

### 1. Initial Setup

```bash
# Clone repository
git clone https://github.com/mrudul-UmassD/LearnSpace.git
cd LearnSpace/pyquest

# Configure environment
cp .env.production .env.production
nano .env.production  # or vim, code, etc.
```

### 2. Configure Secrets

Generate secure secrets:
```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# POSTGRES_PASSWORD
openssl rand -base64 24
```

### 3. Build and Deploy

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec web npx prisma migrate deploy

# Check health
curl http://localhost:3000/api/health
curl http://localhost:8080/health
```

## Monitoring

### Health Checks

```bash
# Web service
curl http://localhost:3000/api/health

# Detailed metrics
curl http://localhost:3000/api/metrics | jq

# Runner service
curl http://localhost:8080/health
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f runner
docker-compose -f docker-compose.prod.yml logs -f db

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 web
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df
```

## Scaling

### Horizontal Scaling

```bash
# Scale runner instances
docker-compose -f docker-compose.prod.yml up -d --scale runner=3

# Scale web instances (requires load balancer)
docker-compose -f docker-compose.prod.yml up -d --scale web=2
```

### Vertical Scaling

Edit `docker-compose.prod.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
```

## Backup & Recovery

### Database Backup

```bash
# Manual backup
docker exec pyquest-db-prod pg_dump -U pyquest pyquest > backup-$(date +%Y%m%d).sql

# Automated daily backup (crontab)
0 2 * * * docker exec pyquest-db-prod pg_dump -U pyquest pyquest > /backups/backup-$(date +\%Y\%m\%d).sql
```

### Restore Database

```bash
# Stop web service
docker-compose -f docker-compose.prod.yml stop web

# Restore
docker exec -i pyquest-db-prod psql -U pyquest pyquest < backup.sql

# Restart web service
docker-compose -f docker-compose.prod.yml start web
```

## Updates & Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and redeploy
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Run migrations if needed
docker-compose -f docker-compose.prod.yml exec web npx prisma migrate deploy
```

### Zero-Downtime Updates

```bash
# Build new image
docker-compose -f docker-compose.prod.yml build

# Rolling update (one container at a time)
docker-compose -f docker-compose.prod.yml up -d --no-deps --build web
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check container status
docker ps -a

# Restart specific service
docker-compose -f docker-compose.prod.yml restart web
```

### Database Connection Issues

```bash
# Test database connectivity
docker-compose -f docker-compose.prod.yml exec web npx prisma db pull

# Check database is running
docker-compose -f docker-compose.prod.yml ps db

# View database logs
docker-compose -f docker-compose.prod.yml logs db
```

### High Memory Usage

```bash
# Check stats
docker stats

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Adjust limits in docker-compose.prod.yml
```

### Runner Service Timeouts

```bash
# Check runner logs
docker-compose -f docker-compose.prod.yml logs runner

# Test runner directly
curl -X POST http://localhost:8080/run \
  -H "Content-Type: application/json" \
  -d '{"code":"print(\"test\")","tests":[]}'

# Increase timeout in .env.production
# RUN_CODE_MAX_CHARS=50000
```

## Cloud Deployments

### AWS EC2

1. Launch Ubuntu 22.04 instance (t3.medium or larger)
2. Install Docker and Docker Compose
3. Configure security groups (ports 80, 443, 22)
4. Setup Nginx reverse proxy with SSL
5. Deploy using steps above

### DigitalOcean

1. Create Droplet (Ubuntu, 2GB+ RAM)
2. Add SSH key
3. Install Docker
4. Clone repository and deploy
5. Configure Cloudflare or DigitalOcean DNS

### Google Cloud Run

1. Build container images
2. Push to GCR
3. Deploy services individually
4. Configure Cloud SQL for PostgreSQL
5. Setup load balancing

## Performance Optimization

### Enable Connection Pooling

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 20
  pool_timeout = 10
}
```

### Enable Caching

Add Redis for session storage:
```yaml
redis:
  image: redis:7-alpine
  restart: always
  ports:
    - "6379:6379"
```

### CDN for Static Assets

Configure Next.js to use CDN:
```javascript
// next.config.ts
assetPrefix: 'https://cdn.your-domain.com'
```

## Security Hardening

### Enable Firewall

```bash
# Ubuntu
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com
```

### Fail2ban

```bash
# Install
sudo apt install fail2ban

# Configure
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Cost Optimization

- Use spot instances for non-critical environments
- Implement auto-scaling based on load
- Use managed databases (AWS RDS) for easier backups
- Enable log rotation to save disk space
- Monitor and right-size resource limits

## Support

For issues, check:
- [GitHub Issues](https://github.com/mrudul-UmassD/LearnSpace/issues)
- [Documentation](https://github.com/mrudul-UmassD/LearnSpace/blob/main/README.md)
- Docker logs: `docker-compose logs`
