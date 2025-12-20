#!/bin/bash
# =============================================================================
# AIOBS Continuous Test Monitor
# Runs tests continuously and collects metrics
# =============================================================================

set -e

# Configuration
INTERVAL=${TEST_INTERVAL:-60}          # Seconds between test runs
REPORT_DIR=${REPORT_DIR:-./test_reports}
MAX_REPORTS=${MAX_REPORTS:-100}        # Keep last N reports
SLACK_WEBHOOK=${SLACK_WEBHOOK:-""}     # Optional Slack notifications
LOG_FILE="${REPORT_DIR}/continuous_test.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create report directory
mkdir -p "${REPORT_DIR}"

# Logging function
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

# Send Slack notification (if configured)
notify_slack() {
    local status=$1
    local message=$2

    if [[ -n "${SLACK_WEBHOOK}" ]]; then
        local color="good"
        [[ "${status}" == "FAIL" ]] && color="danger"
        [[ "${status}" == "WARN" ]] && color="warning"

        curl -s -X POST "${SLACK_WEBHOOK}" \
            -H 'Content-Type: application/json' \
            -d "{\"attachments\":[{\"color\":\"${color}\",\"title\":\"AIOBS Test Monitor\",\"text\":\"${message}\"}]}" \
            > /dev/null 2>&1 || true
    fi
}

# Cleanup old reports
cleanup_reports() {
    local count=$(ls -1 "${REPORT_DIR}"/report_*.html 2>/dev/null | wc -l)
    if [[ ${count} -gt ${MAX_REPORTS} ]]; then
        local to_delete=$((count - MAX_REPORTS))
        ls -1t "${REPORT_DIR}"/report_*.html | tail -n ${to_delete} | xargs rm -f
        log "INFO" "Cleaned up ${to_delete} old reports"
    fi
}

# Run Python tests
run_python_tests() {
    local timestamp=$1
    local report_file="${REPORT_DIR}/report_python_${timestamp}.html"
    local json_file="${REPORT_DIR}/report_python_${timestamp}.json"

    log "INFO" "Running Python tests..."

    if python -m pytest tests/ \
        -v \
        --tb=short \
        --html="${report_file}" \
        --self-contained-html \
        --json-report \
        --json-report-file="${json_file}" \
        2>&1; then
        return 0
    else
        return 1
    fi
}

# Run TypeScript tests
run_typescript_tests() {
    local timestamp=$1
    local coverage_dir="${REPORT_DIR}/coverage_${timestamp}"

    log "INFO" "Running TypeScript tests..."

    if npm test -- --coverage --coverageDirectory="${coverage_dir}" 2>&1; then
        return 0
    else
        return 1
    fi
}

# Collect metrics
collect_metrics() {
    local timestamp=$1
    local metrics_file="${REPORT_DIR}/metrics_${timestamp}.json"

    # Parse test results and create metrics
    cat > "${metrics_file}" << EOF
{
    "timestamp": "${timestamp}",
    "python_tests": {
        "passed": $(grep -o '"passed": [0-9]*' "${REPORT_DIR}/report_python_${timestamp}.json" 2>/dev/null | head -1 | grep -o '[0-9]*' || echo 0),
        "failed": $(grep -o '"failed": [0-9]*' "${REPORT_DIR}/report_python_${timestamp}.json" 2>/dev/null | head -1 | grep -o '[0-9]*' || echo 0),
        "skipped": $(grep -o '"skipped": [0-9]*' "${REPORT_DIR}/report_python_${timestamp}.json" 2>/dev/null | head -1 | grep -o '[0-9]*' || echo 0)
    },
    "system": {
        "cpu_percent": $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 || echo 0),
        "memory_percent": $(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}' || echo 0)
    }
}
EOF

    log "INFO" "Metrics saved to ${metrics_file}"
}

# Main test loop
main() {
    log "INFO" "=========================================="
    log "INFO" "AIOBS Continuous Test Monitor Starting"
    log "INFO" "Interval: ${INTERVAL}s | Reports: ${REPORT_DIR}"
    log "INFO" "=========================================="

    local run_count=0
    local fail_count=0

    while true; do
        run_count=$((run_count + 1))
        local timestamp=$(date '+%Y%m%d_%H%M%S')

        echo ""
        log "INFO" "${BLUE}=== Run #${run_count} - ${timestamp} ===${NC}"

        local python_status=0
        local ts_status=0

        # Run Python tests
        if run_python_tests "${timestamp}"; then
            log "INFO" "${GREEN}Python tests: PASSED${NC}"
        else
            log "ERROR" "${RED}Python tests: FAILED${NC}"
            python_status=1
        fi

        # Run TypeScript tests
        if run_typescript_tests "${timestamp}"; then
            log "INFO" "${GREEN}TypeScript tests: PASSED${NC}"
        else
            log "ERROR" "${RED}TypeScript tests: FAILED${NC}"
            ts_status=1
        fi

        # Collect metrics
        collect_metrics "${timestamp}"

        # Cleanup old reports
        cleanup_reports

        # Summary
        if [[ ${python_status} -eq 0 && ${ts_status} -eq 0 ]]; then
            log "INFO" "${GREEN}All tests passed!${NC}"
        else
            fail_count=$((fail_count + 1))
            log "WARN" "${YELLOW}Some tests failed (${fail_count} failures total)${NC}"
            notify_slack "FAIL" "Test run #${run_count} failed at ${timestamp}"
        fi

        log "INFO" "Next run in ${INTERVAL} seconds... (Ctrl+C to stop)"
        sleep "${INTERVAL}"
    done
}

# Handle interrupts
trap 'log "INFO" "Stopping continuous test monitor..."; exit 0' SIGINT SIGTERM

# Run
main "$@"
