# PyQuest 🐍✨

PyQuest is a production-grade web application for learning Python through interactive quests and a visual game map. Built with Next.js, TypeScript, Tailwind CSS, and PostgreSQL.

## 🚀 Features

- **Interactive Quests**: Learn Python through hands-on coding challenges
- **Quest Map**: Visual representation of your learning journey
- **Progress Tracking**: Track your XP, achievements, and completed quests
- **Multiple Difficulty Levels**: Beginner, Intermediate, and Advanced quests
- **Clean UI**: Modern, responsive design with Tailwind CSS
- **Type-Safe**: Full TypeScript support throughout the application
- **Database-Backed**: PostgreSQL with Prisma ORM for data persistence

## 📁 Project Structure

```
pyquest/
├── app/                      # Next.js App Router pages
│   ├── page.tsx             # Home page
│   ├── quests/              # Quest listing and detail pages
│   ├── map/                 # Interactive quest map
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── ui/                  # Reusable UI components (Button, Card, etc.)
│   ├── quest/               # Quest-specific components
│   └── map/                 # Map-related components
├── content/                 # Quest content and data
│   └── quests/              # Quest definitions
├── lib/                     # Utility functions and services
│   ├── db/                  # Database configuration
│   ├── services/            # Business logic services
│   └── utils/               # Helper utilities
├── prisma/                  # Prisma schema and migrations
│   └── schema.prisma        # Database schema
├── types/                   # TypeScript type definitions
└── public/                  # Static assets
```

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Code Quality**: ESLint + Prettier

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or later
- **npm** or **yarn** package manager
- **PostgreSQL** 14.x or later

## 🚦 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd pyquest
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file and update it with your database credentials:

```bash
cp .env.example .env
```

Edit `.env` and update the `DATABASE_URL`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/pyquest?schema=public"
```

Replace `USER` and `PASSWORD` with your PostgreSQL credentials.

### 4. Set Up the Database

Create the PostgreSQL database:

```bash
# Using psql
createdb pyquest

# Or using PostgreSQL command line
psql -U postgres
CREATE DATABASE pyquest;
\q
```

Generate Prisma Client and run migrations:

```bash
npx prisma generate
npx prisma db push
```

### 5. (Optional) Seed the Database

To populate the database with sample quests:

```bash
npx prisma db seed
```

### 6. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🎮 Usage

### Running the Application

- **Development Mode**: `npm run dev`
- **Full Docker (web + db + runner)**: `npm run dev:full`
- **Runner Service Only**: `npm run runner`
- **Build for Production**: `npm run build`
- **Start Production Server**: `npm start`
- **Lint Code**: `npm run lint`
- **Format Code**: `npx prettier --write .`

### Database Management

- **Open Prisma Studio**: `npx prisma studio`
- **Generate Prisma Client**: `npx prisma generate`
- **Push Schema Changes**: `npx prisma db push`
- **Create Migration**: `npx prisma migrate dev --name migration_name`

## 🎯 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run dev:full` | Start full docker-compose stack |
| `npm run runner` | Start runner service (Docker) |
| `npm run runner:build` | Build runner service image |
| `npm run runner:logs` | Tail runner service logs |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx prisma studio` | Open Prisma Studio GUI |
| `npx prisma generate` | Generate Prisma Client |
| `npx prisma db push` | Push schema to database |

## 📝 Adding New Quests

To add new quests, edit or create files in `content/quests/`:

```typescript
export const questsData = [
  {
    id: 'quest-id',
    title: 'Quest Title',
    description: 'Quest description',
    difficulty: 'beginner', // 'beginner' | 'intermediate' | 'advanced'
    category: 'category-name',
    order: 1,
    xpReward: 100,
    isPublished: true,
    challenges: [
      {
        title: 'Challenge Title',
        description: 'Challenge description',
        starterCode: '# Write your code here\n',
        solution: 'print("Hello, World!")',
        testCases: [
          {
            input: '',
            expectedOutput: 'Hello, World!',
            description: 'Test description',
          },
        ],
        hints: ['Hint 1', 'Hint 2'],
        order: 1,
      },
    ],
  },
];
```

## 🔧 Configuration

### ESLint & Prettier

ESLint and Prettier are configured to work together. Configuration files:

- `.eslintrc.json` - ESLint rules
- `.prettierrc` - Prettier formatting rules

### Tailwind CSS

Tailwind is configured in `tailwind.config.ts`. Custom utilities are available in `lib/utils/`.

## 🚀 Production Deployment

PyQuest includes comprehensive Docker deployment infrastructure for production environments.

### Prerequisites

- **Docker** 20.10+ and **Docker Compose** 2.0+
- **Git** for repository management
- **PostgreSQL** (managed via Docker or external service)

### Quick Deploy with Docker Compose

#### 1. Configure Environment

Create production environment file:

```bash
cp .env.production .env.production
```

Edit `.env.production` and update critical values:

```env
# Generate secure secret: openssl rand -base64 32
NEXTAUTH_SECRET="your-secure-random-secret-min-32-chars"
NEXTAUTH_URL="https://your-domain.com"

# Database credentials
POSTGRES_PASSWORD="secure-random-password"
DATABASE_URL="postgresql://pyquest:secure-random-password@db:5432/pyquest"
```

#### 2. Deploy Services

**Linux/Mac:**
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**Windows (PowerShell):**
```powershell
.\scripts\deploy.ps1
```

Or manually:
```bash
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml exec web npx prisma migrate deploy
```

#### 3. Verify Deployment

- **Web UI**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health
- **Metrics**: http://localhost:3000/api/metrics
- **Runner Health**: http://localhost:8080/health

### Production Architecture

```
┌─────────────────────────────────────────────────┐
│                   Nginx/Traefik                 │
│              (Reverse Proxy + SSL)              │
└────────────┬────────────────────────────────────┘
             │
             ├──────> Web (Next.js)  :3000
             │        - API Routes
             │        - SSR Pages
             │        - Static Assets
             │
             ├──────> Runner (Python) :8080
             │        - Code Execution
             │        - Sandboxed Environment
             │
             └──────> PostgreSQL :5432
                      - User Data
                      - Quest Progress
                      - Sessions
```

### Database Migrations

Run migrations before deploying new versions:

**Linux/Mac:**
```bash
chmod +x scripts/migrate.sh
DATABASE_URL="your-connection-string" ./scripts/migrate.sh
```

**Windows:**
```powershell
$env:DATABASE_URL="your-connection-string"
.\scripts\migrate.ps1
```

### Monitoring & Health Checks

#### Health Endpoints

- **`GET /api/health`**: Basic health check
  ```json
  {
    "status": "healthy",
    "service": "pyquest-web",
    "timestamp": "2026-02-03T10:30:00.000Z"
  }
  ```

- **`GET /api/metrics`**: Detailed metrics
  ```json
  {
    "status": "ok",
    "uptime": 3600,
    "dependencies": {
      "database": { "status": "healthy", "latency_ms": 5 },
      "runner": { "status": "healthy", "latency_ms": 12 }
    },
    "metrics": {
      "users_total": 150,
      "quest_attempts_total": 1250
    }
  }
  ```

#### Docker Management

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f runner

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop services
docker-compose -f docker-compose.prod.yml down

# Update and redeploy
git pull
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Security Configuration

Production deployment includes:

- **Rate Limiting**: 20 requests/min per user+IP (configurable)
- **Output Truncation**: 64KB stdout/stderr limits
- **Secret Redaction**: Automatic env variable redaction
- **Audit Logging**: Structured JSON logs for security events
- **Network Isolation**: Runner has no external network access
- **Read-only Filesystem**: Containers run with read-only root FS
- **Resource Limits**: CPU (1 core) and Memory (512MB) constraints

Configure via environment variables:
```env
RUN_RATE_LIMIT_MAX=20
RUN_RATE_LIMIT_WINDOW_MS=60000
RUN_CODE_MAX_CHARS=30000
RUN_STDOUT_MAX_BYTES=65536
AUDIT_LOG_TO_FILE=true
```

### Cloud Deployment Options

#### Vercel (Web Only)

1. Push code to GitHub
2. Import repository in [Vercel](https://vercel.com)
3. Configure environment variables
4. Deploy runner service separately (AWS ECS, DigitalOcean, etc.)
5. Update `RUNNER_URL` in Vercel env

#### AWS EC2 / DigitalOcean Droplet

1. Provision Ubuntu 22.04 server
2. Install Docker and Docker Compose
3. Clone repository
4. Configure `.env.production`
5. Run `./scripts/deploy.sh`
6. Configure Nginx reverse proxy with SSL (Let's Encrypt)

#### Kubernetes (Advanced)

Convert docker-compose to Kubernetes manifests:
```bash
kompose convert -f docker-compose.prod.yml
```

#### Railway / Render

Deploy services individually:
- Web: Next.js deployment
- Database: Managed PostgreSQL
- Runner: Docker container deployment

Update connection strings accordingly.

### Backup & Disaster Recovery

#### Database Backup

```bash
# Automated daily backup
docker exec pyquest-db-prod pg_dump -U pyquest pyquest > backup-$(date +%Y%m%d).sql

# Restore from backup
docker exec -i pyquest-db-prod psql -U pyquest pyquest < backup.sql
```

#### Volume Backup

```bash
# Backup PostgreSQL data volume
docker run --rm -v pyquest_postgres_data_prod:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres-data-backup.tar.gz /data
```

### Performance Tuning

#### Database Connection Pooling

Configure Prisma connection pool:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 10
  pool_timeout = 10
}
```

#### Horizontal Scaling

Scale runner and web services:
```bash
docker-compose -f docker-compose.prod.yml up -d --scale runner=3 --scale web=2
```

Add load balancer (Nginx/HAProxy) for distribution.

### Troubleshooting

#### Service Not Starting

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check container status
docker ps -a

# Restart specific service
docker-compose -f docker-compose.prod.yml restart web
```

#### Database Connection Issues

```bash
# Test database connectivity
docker-compose -f docker-compose.prod.yml exec web npx prisma db pull

# Check PostgreSQL logs
docker-compose -f docker-compose.prod.yml logs db
```

#### Out of Memory

Increase Docker resource limits in `docker-compose.prod.yml`:
```yaml
deploy:
  resources:
    limits:
      memory: 2G
```

### Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | ✅ |
| `NEXTAUTH_SECRET` | Session encryption key (32+ chars) | - | ✅ |
| `NEXTAUTH_URL` | Public URL of application | `http://localhost:3000` | ✅ |
| `RUNNER_URL` | Python runner service URL | `http://runner:8080` | ✅ |
| `NODE_ENV` | Node environment | `production` | ❌ |
| `PORT` | Web service port | `3000` | ❌ |
| `POSTGRES_USER` | Database user | `pyquest` | ❌ |
| `POSTGRES_PASSWORD` | Database password | - | ✅ |
| `POSTGRES_DB` | Database name | `pyquest` | ❌ |
| `RUN_RATE_LIMIT_MAX` | Rate limit per window | `20` | ❌ |
| `RUN_CODE_MAX_CHARS` | Max code size | `30000` | ❌ |
| `AUDIT_LOG_TO_FILE` | Enable file logging | `false` | ❌ |

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Database powered by [Prisma](https://www.prisma.io/)

---

**Happy Coding! 🎉**


This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
