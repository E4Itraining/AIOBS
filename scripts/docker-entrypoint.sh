#!/bin/bash
# AIOBS Docker Entrypoint Script
# Runs startup tests before launching the application

set -e

echo "=========================================="
echo "AIOBS - AI Observability Hub"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
RUN_STARTUP_TESTS=${RUN_STARTUP_TESTS:-true}
FAIL_ON_TEST_FAILURE=${FAIL_ON_TEST_FAILURE:-false}
INJECT_TEST_DATA=${INJECT_TEST_DATA:-false}

# Function to run Python tests
run_python_tests() {
    echo -e "${YELLOW}[STARTUP] Running Python injection detection tests...${NC}"

    if python -m pytest visualization/tests -v --tb=short -q 2>&1; then
        echo -e "${GREEN}[STARTUP] Python tests passed${NC}"
        return 0
    else
        echo -e "${RED}[STARTUP] Python tests failed${NC}"
        return 1
    fi
}

# Function to run TypeScript tests
run_typescript_tests() {
    echo -e "${YELLOW}[STARTUP] Running TypeScript drift detection tests...${NC}"

    if npm test -- --passWithNoTests 2>&1; then
        echo -e "${GREEN}[STARTUP] TypeScript tests passed${NC}"
        return 0
    else
        echo -e "${RED}[STARTUP] TypeScript tests failed${NC}"
        return 1
    fi
}

# Function to run data injection
run_data_injection() {
    echo -e "${YELLOW}[STARTUP] Injecting test data...${NC}"

    # Wait for services to be ready
    sleep 5

    if python scripts/inject_test_data.py 2>&1; then
        echo -e "${GREEN}[STARTUP] Test data injection completed${NC}"
        return 0
    else
        echo -e "${RED}[STARTUP] Test data injection failed${NC}"
        return 1
    fi
}

# Main startup logic
main() {
    TEST_RESULTS=0

    if [ "$RUN_STARTUP_TESTS" = "true" ]; then
        echo ""
        echo "=========================================="
        echo "Running Startup Tests"
        echo "=========================================="
        echo ""

        # Run Python tests
        if ! run_python_tests; then
            TEST_RESULTS=1
        fi

        echo ""

        # Run TypeScript tests (only if node_modules exists)
        if [ -d "node_modules" ]; then
            if ! run_typescript_tests; then
                TEST_RESULTS=1
            fi
        else
            echo -e "${YELLOW}[STARTUP] Skipping TypeScript tests (node_modules not found)${NC}"
        fi

        echo ""
        echo "=========================================="

        if [ $TEST_RESULTS -eq 0 ]; then
            echo -e "${GREEN}All startup tests passed${NC}"
        else
            echo -e "${RED}Some startup tests failed${NC}"

            if [ "$FAIL_ON_TEST_FAILURE" = "true" ]; then
                echo -e "${RED}Exiting due to test failures (FAIL_ON_TEST_FAILURE=true)${NC}"
                exit 1
            fi
        fi

        echo "=========================================="
        echo ""
    fi

    # Inject test data if requested
    if [ "$INJECT_TEST_DATA" = "true" ]; then
        run_data_injection &
    fi

    # Start the main application
    echo -e "${GREEN}[STARTUP] Starting application...${NC}"
    exec "$@"
}

# Run main with all arguments
main "$@"
