# Runner Docker Image - NumPy & Pandas Setup

## Overview
The runner Docker image now includes NumPy and Pandas for data science quest support while maintaining reasonable image size and security.

## Image Details

### Base Image
- **Base**: `python:3.11-slim`
- **Reason**: Minimal Debian-based image (~50MB base)

### Installed Packages
- **Flask 3.0.0**: Web framework for runner service
- **Werkzeug 3.0.1**: WSGI utility library
- **NumPy 1.26.4**: Numerical computing (~20MB)
- **Pandas 2.2.1**: Data analysis library (~40MB with dependencies)

### Size Optimizations
1. **No pip cache**: `--no-cache-dir` flag removes installation cache
2. **Remove pip/setuptools**: Uninstalled after package installation to prevent runtime installs
3. **Slim base**: Using slim variant instead of full Python image saves ~500MB
4. **Security**: Non-root user (uid 1000) and read-only filesystem

### Expected Image Size
- **Estimated**: ~200-250MB total
- **Breakdown**:
  - Base Python 3.11-slim: ~50MB
  - NumPy + dependencies: ~20MB
  - Pandas + dependencies (includes NumPy): ~40MB
  - Flask + Werkzeug: ~5MB
  - Application code: <1MB

## Health Check

### Endpoint: `/health`
Verifies the runner service is operational and packages load correctly.

**Response**:
```json
{
  "status": "healthy",
  "schemaVersion": "2026-02-07",
  "python": "python3",
  "packages": {
    "numpy": "1.26.4",
    "pandas": "2.2.1"
  },
  "healthCheckMs": 45
}
```

**Health Check Tests**:
- Python executable availability
- NumPy import and version check
- Pandas import and version check
- Quick array/DataFrame creation (verifies packages work)

## Test Quests

Three test quests verify NumPy/Pandas functionality:

### Quest 34: NumPy Array Sum
- **Type**: code
- **Tests**: Basic NumPy array creation and sum operation
- **XP**: 20
- **Runtime**: <100ms

### Quest 35: Pandas DataFrame Mean
- **Type**: code
- **Tests**: DataFrame creation and mean calculation
- **XP**: 20
- **Runtime**: <150ms

### Quest 36: Data Analysis (NumPy + Pandas)
- **Type**: code
- **Tests**: NumPy to Pandas conversion and operations
- **XP**: 25
- **Runtime**: <200ms

All quests stay well under the 2-second timeout limit.

## Building the Image

```bash
cd services/runner
docker build -t pyquest-runner:latest .
```

## Running with Docker Compose

```bash
docker-compose up runner
```

The health check automatically verifies the service on startup:
- Interval: 30 seconds
- Timeout: 3 seconds
- Start period: 5 seconds
- Retries: 3

## Security Features

### Maintained
- ✅ Isolated container execution
- ✅ No network access for executed code
- ✅ Read-only filesystem (except /tmp)
- ✅ CPU/memory limits (0.5 cores, 256MB)
- ✅ 2-second execution timeout
- ✅ 1MB output limit
- ✅ Non-root user execution

### New
- ✅ pip removed after installation (prevents runtime package installs)
- ✅ Package versions pinned for reproducibility

## Usage in Quests

Students can now use NumPy and Pandas in their code:

```python
import numpy as np
import pandas as pd

# NumPy operations
data = np.array([1, 2, 3, 4, 5])
print(data.mean())

# Pandas operations
df = pd.DataFrame({'scores': [85, 90, 78, 92, 88]})
print(df['scores'].mean())
```

## Troubleshooting

### Health Check Fails
If health check fails, check:
1. Flask app is running on port 8080
2. NumPy/Pandas installed correctly
3. Package import times (should be <100ms each)

### Import Errors in Code Execution
If user code fails to import packages:
1. Check runner container logs: `docker-compose logs runner`
2. Verify packages in container: `docker exec -it <container> python3 -c "import numpy, pandas; print('OK')"`
3. Rebuild image if needed: `docker-compose build runner`

## Future Improvements

- Consider adding matplotlib for visualization (adds ~15MB)
- Add scikit-learn for ML quests (adds ~30MB)
- Implement package version caching for faster builds
