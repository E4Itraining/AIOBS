#!/bin/bash
# =============================================================================
# AIOBS Test Runner Entrypoint
# Orchestrates test execution in container environment
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "============================================================"
echo "  AIOBS Test Runner"
echo "  AI Observability Hub - Containerized Test Execution"
echo "============================================================"
echo -e "${NC}"

# Default values from environment or fallback
SUITE="${TEST_SUITE:-all}"
VERBOSE="${TEST_VERBOSE:-true}"
COVERAGE="${TEST_COVERAGE:-false}"
REPORT="${TEST_REPORT:-true}"
PARALLEL="${TEST_PARALLEL:-false}"
TIMEOUT="${TEST_TIMEOUT:-600}"

# Parse command line arguments (override env vars)
while [[ $# -gt 0 ]]; do
    case $1 in
        --suite|-s)
            SUITE="$2"
            shift 2
            ;;
        --verbose|-v)
            VERBOSE="true"
            shift
            ;;
        --quiet|-q)
            VERBOSE="false"
            shift
            ;;
        --coverage|-c)
            COVERAGE="true"
            shift
            ;;
        --report|-r)
            REPORT="true"
            shift
            ;;
        --parallel|-p)
            PARALLEL="true"
            shift
            ;;
        --timeout|-t)
            TIMEOUT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -s, --suite SUITE    Test suite to run (default: all)"
            echo "                       Available: unit, drift, security, reliability,"
            echo "                                 causal, impact, api, stress, all"
            echo "  -v, --verbose        Verbose output (default)"
            echo "  -q, --quiet          Quiet output"
            echo "  -c, --coverage       Enable coverage reporting"
            echo "  -r, --report         Generate HTML report"
            echo "  -p, --parallel       Run tests in parallel"
            echo "  -t, --timeout SECS   Test timeout in seconds (default: 600)"
            echo "  -h, --help           Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  TEST_SUITE           Same as --suite"
            echo "  TEST_VERBOSE         Same as --verbose (true/false)"
            echo "  TEST_COVERAGE        Same as --coverage (true/false)"
            echo "  TEST_REPORT          Same as --report (true/false)"
            echo "  TEST_PARALLEL        Same as --parallel (true/false)"
            echo "  TEST_TIMEOUT         Same as --timeout"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Display configuration
echo -e "${YELLOW}Configuration:${NC}"
echo "  Suite:    $SUITE"
echo "  Verbose:  $VERBOSE"
echo "  Coverage: $COVERAGE"
echo "  Report:   $REPORT"
echo "  Parallel: $PARALLEL"
echo "  Timeout:  ${TIMEOUT}s"
echo ""

# Verify pytest is installed
echo -e "${BLUE}Checking pytest installation...${NC}"
python -m pytest --version
echo ""

# Build pytest command
PYTEST_CMD="python -m pytest"

# Add test path based on suite
case $SUITE in
    all)
        PYTEST_CMD="$PYTEST_CMD tests/"
        ;;
    unit)
        PYTEST_CMD="$PYTEST_CMD tests/visualization/test_core.py"
        ;;
    drift)
        PYTEST_CMD="$PYTEST_CMD tests/visualization/test_drift.py"
        ;;
    security)
        PYTEST_CMD="$PYTEST_CMD tests/visualization/test_security.py"
        ;;
    reliability)
        PYTEST_CMD="$PYTEST_CMD tests/visualization/test_reliability.py"
        ;;
    causal)
        PYTEST_CMD="$PYTEST_CMD tests/visualization/test_causal.py"
        ;;
    impact)
        PYTEST_CMD="$PYTEST_CMD tests/visualization/test_impact.py"
        ;;
    api)
        PYTEST_CMD="$PYTEST_CMD tests/visualization/test_api_integration.py"
        ;;
    stress)
        PYTEST_CMD="$PYTEST_CMD tests/visualization/test_stress.py --runstress"
        ;;
    *)
        echo -e "${RED}Unknown suite: $SUITE${NC}"
        exit 1
        ;;
esac

# Add verbose flag
if [ "$VERBOSE" = "true" ]; then
    PYTEST_CMD="$PYTEST_CMD -v"
else
    PYTEST_CMD="$PYTEST_CMD -q"
fi

# Add coverage
if [ "$COVERAGE" = "true" ]; then
    PYTEST_CMD="$PYTEST_CMD --cov=visualization --cov-report=term-missing --cov-report=html:/app/test_reports/coverage"
fi

# Add HTML report
if [ "$REPORT" = "true" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    PYTEST_CMD="$PYTEST_CMD --html=/app/test_reports/report_${SUITE}_${TIMESTAMP}.html --self-contained-html"
fi

# Add parallel execution
if [ "$PARALLEL" = "true" ]; then
    PYTEST_CMD="$PYTEST_CMD -n auto"
fi

# Add timeout
PYTEST_CMD="$PYTEST_CMD --timeout=$TIMEOUT"

# Run tests
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}Running tests...${NC}"
echo -e "${YELLOW}Command: $PYTEST_CMD${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# Execute pytest and capture exit code
set +e
eval $PYTEST_CMD
EXIT_CODE=$?
set -e

# Report result
echo ""
echo -e "${BLUE}============================================================${NC}"
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}Tests PASSED${NC}"
else
    echo -e "${RED}Tests FAILED (exit code: $EXIT_CODE)${NC}"
fi
echo -e "${BLUE}============================================================${NC}"

# List generated reports
if [ "$REPORT" = "true" ] || [ "$COVERAGE" = "true" ]; then
    echo ""
    echo -e "${YELLOW}Generated reports:${NC}"
    ls -la /app/test_reports/ 2>/dev/null || echo "  No reports generated"
fi

exit $EXIT_CODE
