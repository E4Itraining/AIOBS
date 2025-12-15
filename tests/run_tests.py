#!/usr/bin/env python3
"""
AIOBS Test Orchestrator
Main script to run all test suites with various configurations

Usage:
    python run_tests.py                    # Run all tests
    python run_tests.py --suite security   # Run security tests only
    python run_tests.py --continuous       # Run tests continuously
    python run_tests.py --parallel         # Run test suites in parallel
    python run_tests.py --report           # Generate HTML report
"""
import subprocess
import sys
import os
import time
import json
import argparse
import threading
import signal
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path
import concurrent.futures


# =============================================================================
# Configuration
# =============================================================================

class TestSuite(Enum):
    UNIT = "unit"
    DRIFT = "drift"
    SECURITY = "security"
    RELIABILITY = "reliability"
    CAUSAL = "causal"
    IMPACT = "impact"
    API = "api"
    STRESS = "stress"
    ALL = "all"


@dataclass
class TestConfig:
    """Test configuration"""
    suite: TestSuite = TestSuite.ALL
    parallel: bool = False
    continuous: bool = False
    continuous_interval_seconds: int = 300
    verbose: bool = True
    coverage: bool = False
    report: bool = False
    report_format: str = "html"
    max_failures: int = 0  # 0 = no limit
    timeout_seconds: int = 600
    markers: List[str] = field(default_factory=list)
    exclude_markers: List[str] = field(default_factory=list)


@dataclass
class TestResult:
    """Result of a test run"""
    suite: str
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    errors: int = 0
    duration_seconds: float = 0.0
    output: str = ""
    exit_code: int = 0
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class OrchestratorReport:
    """Complete orchestrator report"""
    start_time: datetime
    end_time: datetime
    total_suites: int
    passed_suites: int
    failed_suites: int
    total_tests: int
    total_passed: int
    total_failed: int
    total_skipped: int
    results: List[TestResult] = field(default_factory=list)


# =============================================================================
# Test Suite Definitions
# =============================================================================

TEST_SUITES = {
    TestSuite.DRIFT: {
        "path": "tests/visualization/test_drift.py",
        "markers": ["drift"],
        "description": "Data drift, concept drift, and prediction drift tests"
    },
    TestSuite.SECURITY: {
        "path": "tests/visualization/test_security.py",
        "markers": ["security"],
        "description": "Prompt injection, SQL injection, XSS, and security tests"
    },
    TestSuite.RELIABILITY: {
        "path": "tests/visualization/test_reliability.py",
        "markers": ["unit"],
        "description": "Model reliability, calibration, and hallucination tests"
    },
    TestSuite.CAUSAL: {
        "path": "tests/visualization/test_causal.py",
        "markers": ["unit"],
        "description": "Causal analysis and root cause detection tests"
    },
    TestSuite.IMPACT: {
        "path": "tests/visualization/test_impact.py",
        "markers": ["unit"],
        "description": "Business impact and cost analysis tests"
    },
    TestSuite.API: {
        "path": "tests/visualization/test_api_integration.py",
        "markers": ["integration"],
        "description": "API endpoint and integration tests"
    },
    TestSuite.STRESS: {
        "path": "tests/visualization/test_stress.py",
        "markers": ["stress"],
        "description": "Load, stress, and performance tests"
    },
    TestSuite.UNIT: {
        "path": "tests/visualization/test_core.py",
        "markers": ["unit"],
        "description": "Core unit tests"
    },
}


# =============================================================================
# Test Runner
# =============================================================================

class TestRunner:
    """Runs individual test suites"""

    def __init__(self, project_root: Path, config: TestConfig):
        self.project_root = project_root
        self.config = config

    def run_suite(self, suite: TestSuite) -> TestResult:
        """Run a single test suite"""
        suite_config = TEST_SUITES.get(suite)
        if not suite_config:
            return TestResult(
                suite=suite.value,
                exit_code=1,
                output=f"Unknown test suite: {suite.value}"
            )

        test_path = self.project_root / suite_config["path"]
        if not test_path.exists():
            return TestResult(
                suite=suite.value,
                exit_code=1,
                output=f"Test file not found: {test_path}"
            )

        # Build pytest command
        cmd = [
            sys.executable, "-m", "pytest",
            str(test_path),
            "-v" if self.config.verbose else "-q",
        ]

        # Add markers
        if self.config.markers:
            for marker in self.config.markers:
                cmd.extend(["-m", marker])

        # Exclude markers
        if self.config.exclude_markers:
            exclude_expr = " and ".join(f"not {m}" for m in self.config.exclude_markers)
            cmd.extend(["-m", exclude_expr])

        # Add coverage if requested
        if self.config.coverage:
            cmd.extend(["--cov=visualization", "--cov-report=term-missing"])

        # Add report if requested
        if self.config.report:
            report_dir = self.project_root / "test_reports"
            report_dir.mkdir(exist_ok=True)
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            report_file = report_dir / f"report_{suite.value}_{timestamp}.html"
            cmd.extend([f"--html={report_file}", "--self-contained-html"])

        # Add timeout
        cmd.extend([f"--timeout={self.config.timeout_seconds}"])

        # Add max failures
        if self.config.max_failures > 0:
            cmd.extend([f"--maxfail={self.config.max_failures}"])

        # Run pytest
        start_time = time.time()
        try:
            result = subprocess.run(
                cmd,
                cwd=str(self.project_root),
                capture_output=True,
                text=True,
                timeout=self.config.timeout_seconds
            )
            duration = time.time() - start_time

            # Parse output for counts
            output = result.stdout + result.stderr
            passed, failed, skipped, errors = self._parse_pytest_output(output)

            return TestResult(
                suite=suite.value,
                passed=passed,
                failed=failed,
                skipped=skipped,
                errors=errors,
                duration_seconds=duration,
                output=output,
                exit_code=result.returncode
            )

        except subprocess.TimeoutExpired:
            return TestResult(
                suite=suite.value,
                exit_code=124,
                output=f"Test suite timed out after {self.config.timeout_seconds}s"
            )
        except Exception as e:
            return TestResult(
                suite=suite.value,
                exit_code=1,
                output=f"Error running tests: {str(e)}"
            )

    def _parse_pytest_output(self, output: str) -> tuple:
        """Parse pytest output for test counts"""
        passed = failed = skipped = errors = 0

        # Look for summary line like "5 passed, 2 failed, 1 skipped"
        import re
        match = re.search(r'(\d+) passed', output)
        if match:
            passed = int(match.group(1))

        match = re.search(r'(\d+) failed', output)
        if match:
            failed = int(match.group(1))

        match = re.search(r'(\d+) skipped', output)
        if match:
            skipped = int(match.group(1))

        match = re.search(r'(\d+) error', output)
        if match:
            errors = int(match.group(1))

        return passed, failed, skipped, errors


# =============================================================================
# Test Orchestrator
# =============================================================================

class TestOrchestrator:
    """Orchestrates running multiple test suites"""

    def __init__(self, project_root: Path = None, config: TestConfig = None):
        self.project_root = project_root or Path(__file__).parent.parent
        self.config = config or TestConfig()
        self.runner = TestRunner(self.project_root, self.config)
        self.results: List[TestResult] = []
        self._stop_flag = False

    def run(self) -> OrchestratorReport:
        """Run test suites based on configuration"""
        start_time = datetime.utcnow()

        if self.config.continuous:
            return self._run_continuous(start_time)
        elif self.config.parallel:
            return self._run_parallel(start_time)
        else:
            return self._run_sequential(start_time)

    def _get_suites_to_run(self) -> List[TestSuite]:
        """Get list of test suites to run"""
        if self.config.suite == TestSuite.ALL:
            return [s for s in TestSuite if s != TestSuite.ALL]
        return [self.config.suite]

    def _run_sequential(self, start_time: datetime) -> OrchestratorReport:
        """Run test suites sequentially"""
        suites = self._get_suites_to_run()

        for suite in suites:
            if self._stop_flag:
                break

            print(f"\n{'='*60}")
            print(f"Running test suite: {suite.value}")
            print(f"{'='*60}")

            result = self.runner.run_suite(suite)
            self.results.append(result)

            self._print_result(result)

        return self._generate_report(start_time)

    def _run_parallel(self, start_time: datetime) -> OrchestratorReport:
        """Run test suites in parallel"""
        suites = self._get_suites_to_run()

        print(f"\nRunning {len(suites)} test suites in parallel...")

        with concurrent.futures.ThreadPoolExecutor(max_workers=len(suites)) as executor:
            future_to_suite = {
                executor.submit(self.runner.run_suite, suite): suite
                for suite in suites
            }

            for future in concurrent.futures.as_completed(future_to_suite):
                suite = future_to_suite[future]
                try:
                    result = future.result()
                    self.results.append(result)
                    self._print_result(result)
                except Exception as e:
                    self.results.append(TestResult(
                        suite=suite.value,
                        exit_code=1,
                        output=f"Exception: {str(e)}"
                    ))

        return self._generate_report(start_time)

    def _run_continuous(self, start_time: datetime) -> OrchestratorReport:
        """Run tests continuously until stopped"""
        print("\nRunning tests continuously. Press Ctrl+C to stop.\n")

        iteration = 0
        while not self._stop_flag:
            iteration += 1
            print(f"\n{'#'*60}")
            print(f"# Iteration {iteration} - {datetime.utcnow().isoformat()}")
            print(f"{'#'*60}")

            suites = self._get_suites_to_run()
            for suite in suites:
                if self._stop_flag:
                    break

                result = self.runner.run_suite(suite)
                self.results.append(result)
                self._print_result(result)

            if not self._stop_flag:
                print(f"\nSleeping for {self.config.continuous_interval_seconds}s...")
                time.sleep(self.config.continuous_interval_seconds)

        return self._generate_report(start_time)

    def stop(self):
        """Signal to stop continuous testing"""
        self._stop_flag = True

    def _print_result(self, result: TestResult):
        """Print a single test result"""
        status = "PASSED" if result.exit_code == 0 else "FAILED"
        color = "\033[92m" if result.exit_code == 0 else "\033[91m"
        reset = "\033[0m"

        print(f"\n{color}{status}{reset}: {result.suite}")
        print(f"  Passed: {result.passed}, Failed: {result.failed}, "
              f"Skipped: {result.skipped}, Errors: {result.errors}")
        print(f"  Duration: {result.duration_seconds:.2f}s")

        if result.exit_code != 0 and self.config.verbose:
            print(f"\n  Output:\n{result.output[-1000:]}")

    def _generate_report(self, start_time: datetime) -> OrchestratorReport:
        """Generate final report"""
        end_time = datetime.utcnow()

        total_passed = sum(r.passed for r in self.results)
        total_failed = sum(r.failed for r in self.results)
        total_skipped = sum(r.skipped for r in self.results)

        passed_suites = sum(1 for r in self.results if r.exit_code == 0)
        failed_suites = sum(1 for r in self.results if r.exit_code != 0)

        report = OrchestratorReport(
            start_time=start_time,
            end_time=end_time,
            total_suites=len(self.results),
            passed_suites=passed_suites,
            failed_suites=failed_suites,
            total_tests=total_passed + total_failed + total_skipped,
            total_passed=total_passed,
            total_failed=total_failed,
            total_skipped=total_skipped,
            results=self.results
        )

        self._print_report(report)

        if self.config.report:
            self._save_report(report)

        return report

    def _print_report(self, report: OrchestratorReport):
        """Print final report to console"""
        duration = (report.end_time - report.start_time).total_seconds()

        print(f"\n{'='*60}")
        print("FINAL REPORT")
        print(f"{'='*60}")
        print(f"Duration: {duration:.2f}s")
        print(f"Test Suites: {report.passed_suites} passed, {report.failed_suites} failed")
        print(f"Tests: {report.total_passed} passed, {report.total_failed} failed, "
              f"{report.total_skipped} skipped")

        if report.failed_suites > 0:
            print("\nFailed Suites:")
            for result in report.results:
                if result.exit_code != 0:
                    print(f"  - {result.suite}")

    def _save_report(self, report: OrchestratorReport):
        """Save report to file"""
        report_dir = self.project_root / "test_reports"
        report_dir.mkdir(exist_ok=True)

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        report_file = report_dir / f"orchestrator_report_{timestamp}.json"

        # Convert to serializable format
        report_dict = {
            "start_time": report.start_time.isoformat(),
            "end_time": report.end_time.isoformat(),
            "total_suites": report.total_suites,
            "passed_suites": report.passed_suites,
            "failed_suites": report.failed_suites,
            "total_tests": report.total_tests,
            "total_passed": report.total_passed,
            "total_failed": report.total_failed,
            "total_skipped": report.total_skipped,
            "results": [
                {
                    "suite": r.suite,
                    "passed": r.passed,
                    "failed": r.failed,
                    "skipped": r.skipped,
                    "errors": r.errors,
                    "duration_seconds": r.duration_seconds,
                    "exit_code": r.exit_code,
                    "timestamp": r.timestamp.isoformat()
                }
                for r in report.results
            ]
        }

        with open(report_file, "w") as f:
            json.dump(report_dict, f, indent=2)

        print(f"\nReport saved to: {report_file}")


# =============================================================================
# CLI
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="AIOBS Test Orchestrator - Run comprehensive test suites"
    )

    parser.add_argument(
        "--suite", "-s",
        type=str,
        choices=[s.value for s in TestSuite],
        default="all",
        help="Test suite to run (default: all)"
    )

    parser.add_argument(
        "--parallel", "-p",
        action="store_true",
        help="Run test suites in parallel"
    )

    parser.add_argument(
        "--continuous", "-c",
        action="store_true",
        help="Run tests continuously"
    )

    parser.add_argument(
        "--interval", "-i",
        type=int,
        default=300,
        help="Interval between continuous runs in seconds (default: 300)"
    )

    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        default=True,
        help="Verbose output"
    )

    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Quiet output"
    )

    parser.add_argument(
        "--coverage",
        action="store_true",
        help="Run with coverage reporting"
    )

    parser.add_argument(
        "--report", "-r",
        action="store_true",
        help="Generate test reports"
    )

    parser.add_argument(
        "--max-failures",
        type=int,
        default=0,
        help="Stop after N failures (0 = no limit)"
    )

    parser.add_argument(
        "--timeout",
        type=int,
        default=600,
        help="Timeout per test suite in seconds (default: 600)"
    )

    parser.add_argument(
        "--markers", "-m",
        type=str,
        nargs="+",
        default=[],
        help="Only run tests with these markers"
    )

    parser.add_argument(
        "--exclude-markers",
        type=str,
        nargs="+",
        default=[],
        help="Exclude tests with these markers"
    )

    parser.add_argument(
        "--list-suites",
        action="store_true",
        help="List available test suites"
    )

    args = parser.parse_args()

    # List suites and exit
    if args.list_suites:
        print("\nAvailable Test Suites:")
        print("-" * 40)
        for suite, config in TEST_SUITES.items():
            print(f"  {suite.value:15} - {config['description']}")
        return 0

    # Build config
    config = TestConfig(
        suite=TestSuite(args.suite),
        parallel=args.parallel,
        continuous=args.continuous,
        continuous_interval_seconds=args.interval,
        verbose=not args.quiet,
        coverage=args.coverage,
        report=args.report,
        max_failures=args.max_failures,
        timeout_seconds=args.timeout,
        markers=args.markers,
        exclude_markers=args.exclude_markers
    )

    # Create orchestrator
    orchestrator = TestOrchestrator(config=config)

    # Handle Ctrl+C for continuous mode
    def signal_handler(sig, frame):
        print("\n\nStopping tests...")
        orchestrator.stop()

    signal.signal(signal.SIGINT, signal_handler)

    # Run tests
    report = orchestrator.run()

    # Return appropriate exit code
    return 1 if report.failed_suites > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
