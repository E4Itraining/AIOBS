#!/bin/bash
# =============================================================================
# AIOBS - Session Startup Test Verification
# Runs tests at the start of each Claude Code session to verify project health
# =============================================================================

set -e

echo "=============================================="
echo "AIOBS - Running Startup Tests"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

# Check and install npm dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing npm dependencies...${NC}"
    npm install --silent 2>/dev/null || {
        echo -e "${RED}Failed to install npm dependencies${NC}"
        ERRORS=$((ERRORS + 1))
    }
fi

# Run Jest tests (TypeScript)
echo ""
echo "Running TypeScript tests (Jest)..."
if npm test --silent 2>/dev/null; then
    echo -e "${GREEN}Jest tests: PASSED${NC}"
else
    echo -e "${RED}Jest tests: FAILED${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check if pytest is installed
if ! python -m pytest --version >/dev/null 2>&1; then
    echo -e "${YELLOW}Installing pytest...${NC}"
    pip install -q pytest pytest-asyncio pytest-timeout 2>/dev/null || {
        echo -e "${RED}Failed to install pytest${NC}"
        ERRORS=$((ERRORS + 1))
    }
fi

# Run pytest tests (Python)
echo ""
echo "Running Python tests (Pytest)..."
if python -m pytest tests/ -q --tb=no 2>/dev/null; then
    echo -e "${GREEN}Pytest tests: PASSED${NC}"
else
    echo -e "${RED}Pytest tests: FAILED${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "=============================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}All tests passed! Project is healthy.${NC}"
else
    echo -e "${RED}$ERRORS test suite(s) failed.${NC}"
fi
echo "=============================================="

exit $ERRORS
