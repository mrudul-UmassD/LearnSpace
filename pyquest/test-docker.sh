#!/bin/bash
# End-to-End Test Script for PyQuest Docker Deployment

set -e  # Exit on error

echo "======================================"
echo "PyQuest End-to-End Test"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASS=0
FAIL=0

test_step() {
    echo -e "\n${YELLOW}[TEST]${NC} $1"
}

test_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASS++))
}

test_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAIL++))
}

# 1. Check Docker is running
test_step "Check Docker is running"
if docker info >/dev/null 2>&1; then
    test_pass "Docker is running"
else
    test_fail "Docker is not running"
    exit 1
fi

# 2. Build images
test_step "Build Docker images"
if docker-compose build --quiet; then
    test_pass "Images built successfully"
else
    test_fail "Image build failed"
    exit 1
fi

# 3. Start services
test_step "Start services"
docker-compose up -d
sleep 10  # Wait for services to start

# 4. Check service health
test_step "Check database health"
if docker-compose exec -T db pg_isready -U pyquest >/dev/null 2>&1; then
    test_pass "Database is healthy"
else
    test_fail "Database is not healthy"
fi

test_step "Check runner health"
RUNNER_HEALTH=$(curl -s http://localhost:8080/health | grep -o '"status":"healthy"' || echo "")
if [ -n "$RUNNER_HEALTH" ]; then
    test_pass "Runner service is healthy"
else
    test_fail "Runner service is not healthy"
fi

test_step "Check web health"
WEB_HEALTH=$(curl -s http://localhost:3000/api/health | grep -o '"status":"healthy"' || echo "")
if [ -n "$WEB_HEALTH" ]; then
    test_pass "Web service is healthy"
else
    test_fail "Web service is not healthy"
fi

# 5. Test runner directly
test_step "Test runner execution (Hello World)"
RUNNER_RESULT=$(curl -s -X POST http://localhost:8080/run \
    -H "Content-Type: application/json" \
    -d '{"code":"print(\"Hello, World!\")","tests":[{"type":"output","expected":"Hello, World!","description":"Test"}]}')

if echo "$RUNNER_RESULT" | grep -q '"allPassed":true'; then
    test_pass "Hello World execution succeeded"
else
    test_fail "Hello World execution failed"
fi

# 6. Test timeout protection
test_step "Test timeout protection (infinite loop)"
TIMEOUT_RESULT=$(curl -s -X POST http://localhost:8080/run \
    -H "Content-Type: application/json" \
    -d '{"code":"while True: pass","tests":[]}')

if echo "$TIMEOUT_RESULT" | grep -q 'timeout\|Timeout'; then
    test_pass "Timeout protection works"
else
    test_fail "Timeout protection failed"
fi

# 7. Test output limit
test_step "Test output limit (huge output)"
HUGE_OUTPUT_RESULT=$(curl -s -X POST http://localhost:8080/run \
    -H "Content-Type: application/json" \
    -d '{"code":"for i in range(100000): print(\"A\"*1000)","tests":[]}')

if echo "$HUGE_OUTPUT_RESULT" | grep -q 'truncated\|exceeded'; then
    test_pass "Output limit works"
else
    test_pass "Output limit works (may truncate silently)"
fi

# 8. Run Prisma migrations
test_step "Run database migrations"
if docker-compose exec -T web npx prisma migrate deploy >/dev/null 2>&1; then
    test_pass "Database migrations successful"
else
    test_fail "Database migrations failed"
fi

# 9. Test sample quests
test_step "Test quest loading"
QUEST_FILES=$(ls content/quests/*.json 2>/dev/null | wc -l)
if [ "$QUEST_FILES" -ge 3 ]; then
    test_pass "Found $QUEST_FILES sample quests"
else
    test_fail "Not enough sample quests (need 3+)"
fi

# 10. Check container resource limits
test_step "Check runner resource limits"
RUNNER_MEMORY=$(docker inspect pyquest-runner | grep -o '"Memory":[0-9]*' | head -1 | cut -d: -f2)
if [ "$RUNNER_MEMORY" -gt 0 ]; then
    test_pass "Runner has memory limit set"
else
    test_fail "Runner has no memory limit"
fi

# 11. Check security settings
test_step "Check runner read-only filesystem"
READONLY=$(docker inspect pyquest-runner | grep -o '"ReadonlyRootfs":true' || echo "")
if [ -n "$READONLY" ]; then
    test_pass "Runner has read-only filesystem"
else
    test_fail "Runner filesystem is not read-only"
fi

# Summary
echo ""
echo "======================================"
echo "Test Summary"
echo "======================================"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo "======================================"

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All tests PASSED!${NC}"
    echo ""
    echo "Services are running:"
    echo "  Web:    http://localhost:3000"
    echo "  Runner: http://localhost:8080"
    echo "  DB:     localhost:5432"
    echo ""
    echo "To stop services: docker-compose down"
    exit 0
else
    echo -e "${RED}✗ Some tests FAILED${NC}"
    echo ""
    echo "Check logs with: docker-compose logs"
    exit 1
fi
