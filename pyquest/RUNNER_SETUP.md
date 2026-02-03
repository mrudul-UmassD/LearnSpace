# Runner Service Quick Start

The PyQuest application requires a Docker-based runner service to execute Python code safely.

## Quick Start

### Option 1: Using npm script (Recommended)
```bash
npm run runner
```

### Option 2: Using Docker Compose directly
```bash
docker-compose up runner
```

### Option 3: Using the helper script
**Windows (PowerShell):**
```powershell
.\start-runner.ps1
```

**Linux/Mac:**
```bash
chmod +x start-runner.sh
./start-runner.sh
```

## What is the Runner Service?

The runner service is a sandboxed Python execution environment that:
- Runs user code in isolated Docker containers
- Has no network access (for security)
- Enforces CPU and memory limits
- Has a 2-second execution timeout
- Limits output to 1MB

## Verify Runner is Working

Once started, you can verify the runner service is working by visiting:
```
http://localhost:8080/health
```

You should see:
```json
{
  "status": "healthy",
  "service": "pyquest-runner",
  "version": "1.0.0"
}
```

## Common Issues

### "fetch failed" error when clicking "Run Tests"
**Problem:** The runner service is not running.  
**Solution:** Start the runner service using one of the commands above.

### Docker errors
**Problem:** Docker is not installed or not running.  
**Solution:** Install [Docker Desktop](https://www.docker.com/products/docker-desktop) and make sure it's running.

### Port 8080 already in use
**Problem:** Another service is using port 8080.  
**Solution:** Stop the other service or change the runner port in `docker-compose.yml`.

## Development Workflow

1. **Start runner service** (in one terminal):
   ```bash
   npm run runner
   ```

2. **Start Next.js dev server** (in another terminal):
   ```bash
   npm run dev
   ```

3. **Access the app**: http://localhost:3000

## Stopping the Runner

Press `Ctrl+C` in the terminal where the runner is running, or:

```bash
docker-compose down runner
```

## Rebuilding the Runner

If you make changes to the runner service code:

```bash
npm run runner:build
```

Then start it again:

```bash
npm run runner
```

## View Runner Logs

```bash
npm run runner:logs
```

## Additional Resources

- Full runner documentation: `services/runner/README.md`
- Docker configuration: `docker-compose.yml`
- Runner source code: `services/runner/`
