# Run Tests Button Fix - Diagnostic Report

## Problem
When clicking "Run Tests" button, users received error:
```
STDERR: fetch failed
```

## Root Cause
The frontend was making a fetch request to `/api/quests/[id]/execute`, which then tried to connect to the Python runner service. However:

1. **Missing environment variable**: `.env` file didn't specify `RUNNER_SERVICE_URL`
2. **Default URL points to Docker**: Code defaulted to `http://runner:8080` (Docker container name)
3. **Runner service not running**: The Docker runner service wasn't started in local development
4. **Unclear error messages**: No helpful guidance when runner service unavailable

## Request/Response Flow Traced

### Frontend Click Path
1. User clicks **"Run Tests"** button in `components/quest-workspace.tsx`
2. `handleRunCode()` function triggered (line 104)
3. Fetch POST to `/api/quests/${quest.id}/execute` with user code

### Backend API Path
1. Request handled by `app/api/quests/[id]/execute/route.ts`
2. Auth validation, rate limiting checks
3. Quest loaded from QuestLoader
4. Calls `runViaRunner()` from `lib/runner-client.ts`

### Runner Client Path
1. `runViaRunner()` attempts fetch to `${RUNNER_SERVICE_URL}/run`
2. Default URL: `http://runner:8080` (Docker container name)
3. **Connection fails** - container doesn't exist in local dev
4. Generic "fetch failed" error returned

## Changes Made

### 1. Enhanced Logging in `lib/runner-client.ts`
**Added:**
- Log runner service URL on every request
- Detect connection errors specifically (ECONNREFUSED, fetch failed)
- Provide actionable error message: "Make sure the runner service is running (docker-compose up runner)"

**Lines changed:** 40, 147-160

### 2. Updated `.env` File
**Added:**
```env
# Runner Service (Python code execution)
# For local development: Start the runner service with "docker-compose up runner"
# The runner service must be running for code execution to work
RUNNER_SERVICE_URL="http://localhost:8080"
```

This ensures the Next.js app connects to `localhost:8080` where the Docker runner service is exposed.

### 3. Improved Frontend Error Handling in `components/quest-workspace.tsx`
**Added:**
- Console logging for request/response debugging
- Detect "fetch failed" and ECONNREFUSED errors
- Display user-friendly message: "Cannot connect to code execution service. Please start the runner service with: docker-compose up runner"

**Lines changed:** 106-108, 150-167

### 4. Added npm Scripts in `package.json`
**New scripts:**
- `npm run runner` - Start the runner service
- `npm run runner:build` - Rebuild runner Docker image
- `npm run runner:logs` - View runner service logs

### 5. Created Helper Scripts
**PowerShell (Windows):** `start-runner.ps1`
**Bash (Linux/Mac):** `start-runner.sh`

Both scripts:
- Check if Docker is running
- Start runner service with helpful output
- Provide troubleshooting guidance

### 6. Created Documentation
**`RUNNER_SETUP.md`** - Complete guide for:
- Quick start commands
- What the runner service does
- Common issues and solutions
- Development workflow
- Troubleshooting steps

## Verification Steps

### Test 1: Verify Logging Works
1. Start Next.js: `npm run dev`
2. Click "Run Tests" (without runner)
3. Check browser console - should see:
   ```
   [runner-client] Attempting to connect to runner service at: http://localhost:8080
   [runner-client] Connection failed: http://localhost:8080 fetch failed
   [quest-workspace] Error running code: Cannot connect to code execution service...
   ```

### Test 2: Verify API Returns Structured Error
1. Check Network tab in browser DevTools
2. POST to `/api/quests/[id]/execute` should return JSON:
   ```json
   {
     "success": false,
     "error": "Runner service unavailable at http://localhost:8080...",
     "stderr": "Runner service unavailable...",
     "testResults": [],
     "allPassed": false,
     "transportError": true,
     "errorCode": "RUNNER_NETWORK_ERROR"
   }
   ```

### Test 3: Verify End-to-End with Runner
1. **Terminal 1:** `npm run runner`
2. **Terminal 2:** `npm run dev`
3. Navigate to a quest: http://localhost:3000/worlds/python-basics/quests/hello-world
4. Click "Run Tests"
5. Should see **structured response** with test results (not "fetch failed")

## Expected Behavior Now

### Without Runner Service
- Browser console shows clear error with URL
- Frontend displays: "Cannot connect to code execution service. Please start the runner service with: docker-compose up runner"
- API returns structured JSON with error details
- No cryptic "fetch failed" message

### With Runner Service
- Code executes successfully
- Test results displayed
- XP awarded if all tests pass
- Progress tracked in database

## Files Modified

1. `lib/runner-client.ts` - Enhanced logging and error detection
2. `.env` - Added RUNNER_SERVICE_URL
3. `components/quest-workspace.tsx` - Better error handling and logging
4. `package.json` - Added runner scripts
5. `start-runner.ps1` - PowerShell helper script
6. `start-runner.sh` - Bash helper script
7. `RUNNER_SETUP.md` - Complete documentation

## No Changes Made To
- Quest logic
- Test execution logic
- Database schema
- API routes (except logging)
- Docker configuration

## Developer Experience Improvements

### Before
1. Click "Run Tests" → "fetch failed" 🤔
2. No idea what's wrong
3. Check server logs - nothing helpful
4. Search codebase for runner setup
5. Eventually find docker-compose.yml

### After
1. Click "Run Tests" → Clear message with solution 💡
2. Run `npm run runner` in separate terminal
3. Click "Run Tests" again → Works! ✅

## Summary

**Problem:** Fetch failure due to missing runner service  
**Solution:** Added logging, updated config, created helper scripts and docs  
**Result:** Structured error responses with actionable guidance  
**End Condition Met:** ✅ Clicking "Run Tests" returns structured response (even if tests fail)

The fix ensures developers understand the runner service requirement and can start it easily, while maintaining security and not refactoring unrelated code.
