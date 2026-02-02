# PyQuest Runner Service

Secure Docker-based Python code execution service for PyQuest.

## Features

- **Isolated Execution**: Runs in Docker container with no network access
- **Security**: Read-only filesystem except /tmp, non-root user
- **Resource Limits**: CPU/memory limits enforced by Docker
- **Timeouts**: 2-second hard limit on code execution
- **Output Limits**: 1MB maximum for stdout/stderr
- **Infinite Loop Protection**: Signal-based timeout enforcement

## API

### POST /run

Execute Python code with tests.

**Request:**
```json
{
  "code": "print('Hello, World!')",
  "tests": [
    {
      "type": "output",
      "expected": "Hello, World!",
      "description": "Should print Hello, World!"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "stdout": "Hello, World!",
  "stderr": "",
  "testResults": [
    {
      "description": "Should print Hello, World!",
      "passed": true,
      "expected": "Hello, World!",
      "actual": "Hello, World!"
    }
  ],
  "executionTimeMs": 45,
  "allPassed": true
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "pyquest-runner",
  "version": "1.0.0"
}
```

## Test Types

1. **output** - Exact stdout match
2. **variable_exists** - Check variable is defined
3. **variable_type** - Check variable type (str, int, float, list)
4. **variable_value** - Check variable value
5. **function_call** - Check function output appears in stdout
6. **list_contains** - Check list contains item
7. **list_length** - Check list length

## Local Testing

```bash
# Build image
docker build -t pyquest-runner .

# Run container
docker run -p 8080:8080 \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --memory="256m" \
  --cpus="0.5" \
  --network=none \
  pyquest-runner

# Test endpoint
curl -X POST http://localhost:8080/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello\")",
    "tests": [{"type": "output", "expected": "Hello", "description": "Test"}]
  }'
```

## Security

- ✅ No network access (enforced by Docker)
- ✅ Read-only root filesystem (enforced by Docker)
- ✅ Writable /tmp only (tmpfs, no exec)
- ✅ Non-root user (UID 1000)
- ✅ CPU limit: 0.5 cores
- ✅ Memory limit: 256MB
- ✅ Execution timeout: 2 seconds
- ✅ Output limit: 1MB
- ✅ Code size limit: 100KB

## Resource Limits

Configured in docker-compose.yml:

```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 256M
    reservations:
      cpus: '0.25'
      memory: 128M
```

## Integration

Called by Next.js `/api/run` endpoint:

```typescript
const response = await fetch('http://runner:8080/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code, tests })
});
```
