#!/usr/bin/env python3
"""
AIOBS Startup Test Runner
Runs security and drift tests at application startup
"""

import subprocess
import sys
import os
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass, asdict
from enum import Enum


class TestStatus(Enum):
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"


@dataclass
class TestResult:
    suite: str
    status: TestStatus
    passed: int
    failed: int
    skipped: int
    duration: float
    details: List[str]


@dataclass
class StartupTestReport:
    timestamp: str
    overall_status: TestStatus
    results: List[TestResult]
    total_duration: float
    recommendations: List[str]


class StartupTestRunner:
    """Runs all startup tests and generates reports"""

    def __init__(self, project_root: str = None):
        self.project_root = Path(project_root or os.path.dirname(os.path.dirname(__file__)))
        self.report_dir = self.project_root / "test-reports"
        self.report_dir.mkdir(exist_ok=True)

    def run_all_tests(self, fail_fast: bool = False) -> StartupTestReport:
        """Run all startup tests"""
        print("\n" + "=" * 60)
        print("AIOBS STARTUP TEST RUNNER")
        print("=" * 60)

        start_time = time.time()
        results: List[TestResult] = []

        # Run Python injection tests
        print("\n[1/3] Running Python injection detection tests...")
        python_result = self.run_python_tests()
        results.append(python_result)
        self._print_result(python_result)

        if fail_fast and python_result.status == TestStatus.FAILED:
            return self._create_report(results, start_time)

        # Run TypeScript drift tests
        print("\n[2/3] Running TypeScript drift detection tests...")
        ts_result = self.run_typescript_tests()
        results.append(ts_result)
        self._print_result(ts_result)

        if fail_fast and ts_result.status == TestStatus.FAILED:
            return self._create_report(results, start_time)

        # Run data injection validation
        print("\n[3/3] Running data injection validation tests...")
        injection_result = self.run_injection_validation()
        results.append(injection_result)
        self._print_result(injection_result)

        report = self._create_report(results, start_time)
        self._save_report(report)
        self._print_summary(report)

        return report

    def run_python_tests(self) -> TestResult:
        """Run Python pytest tests"""
        start_time = time.time()
        test_path = self.project_root / "visualization" / "tests"

        try:
            result = subprocess.run(
                [
                    sys.executable, "-m", "pytest",
                    str(test_path),
                    "-v",
                    "--tb=short",
                    "-q",
                    "--no-header",
                ],
                capture_output=True,
                text=True,
                timeout=300,
                cwd=str(self.project_root)
            )

            duration = time.time() - start_time
            output = result.stdout + result.stderr

            # Parse results
            passed, failed, skipped = self._parse_pytest_output(output)

            return TestResult(
                suite="Python Injection Tests",
                status=TestStatus.PASSED if result.returncode == 0 else TestStatus.FAILED,
                passed=passed,
                failed=failed,
                skipped=skipped,
                duration=duration,
                details=self._extract_details(output)
            )

        except subprocess.TimeoutExpired:
            return TestResult(
                suite="Python Injection Tests",
                status=TestStatus.ERROR,
                passed=0,
                failed=0,
                skipped=0,
                duration=300,
                details=["Test execution timed out"]
            )
        except Exception as e:
            return TestResult(
                suite="Python Injection Tests",
                status=TestStatus.ERROR,
                passed=0,
                failed=0,
                skipped=0,
                duration=time.time() - start_time,
                details=[f"Error: {str(e)}"]
            )

    def run_typescript_tests(self) -> TestResult:
        """Run TypeScript Jest tests"""
        start_time = time.time()

        try:
            result = subprocess.run(
                ["npm", "test", "--", "--passWithNoTests", "--json"],
                capture_output=True,
                text=True,
                timeout=300,
                cwd=str(self.project_root)
            )

            duration = time.time() - start_time

            # Try to parse JSON output
            try:
                # Find JSON in output
                json_start = result.stdout.find('{')
                json_end = result.stdout.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    test_output = json.loads(result.stdout[json_start:json_end])
                    passed = test_output.get("numPassedTests", 0)
                    failed = test_output.get("numFailedTests", 0)
                    skipped = test_output.get("numPendingTests", 0)
                else:
                    passed, failed, skipped = self._parse_jest_output(result.stdout + result.stderr)
            except json.JSONDecodeError:
                passed, failed, skipped = self._parse_jest_output(result.stdout + result.stderr)

            return TestResult(
                suite="TypeScript Drift Tests",
                status=TestStatus.PASSED if result.returncode == 0 else TestStatus.FAILED,
                passed=passed,
                failed=failed,
                skipped=skipped,
                duration=duration,
                details=self._extract_details(result.stdout + result.stderr)
            )

        except subprocess.TimeoutExpired:
            return TestResult(
                suite="TypeScript Drift Tests",
                status=TestStatus.ERROR,
                passed=0,
                failed=0,
                skipped=0,
                duration=300,
                details=["Test execution timed out"]
            )
        except FileNotFoundError:
            return TestResult(
                suite="TypeScript Drift Tests",
                status=TestStatus.SKIPPED,
                passed=0,
                failed=0,
                skipped=0,
                duration=time.time() - start_time,
                details=["npm not found - skipping TypeScript tests"]
            )
        except Exception as e:
            return TestResult(
                suite="TypeScript Drift Tests",
                status=TestStatus.ERROR,
                passed=0,
                failed=0,
                skipped=0,
                duration=time.time() - start_time,
                details=[f"Error: {str(e)}"]
            )

    def run_injection_validation(self) -> TestResult:
        """Run injection validation tests with sample payloads"""
        start_time = time.time()
        passed = 0
        failed = 0
        details = []

        try:
            # Import validators
            sys.path.insert(0, str(self.project_root))
            from visualization.ingestion.validators import DataValidator

            validator = DataValidator(strict_mode=True)

            # Test payloads that SHOULD be detected
            attack_payloads = [
                ("ignore previous instructions", "Prompt Injection"),
                ("'; DROP TABLE users; --", "SQL Injection"),
                ("<script>alert('xss')</script>", "XSS"),
                ("; rm -rf /", "Command Injection"),
            ]

            for payload, attack_type in attack_payloads:
                result = validator._check_injection(payload,
                    type('Result', (), {'is_valid': True, 'issues': [], 'add_issue': lambda *args, **kwargs: None})(),
                    "test_field")
                if result:
                    passed += 1
                    details.append(f"[PASS] {attack_type} detected: '{payload[:30]}...'")
                else:
                    failed += 1
                    details.append(f"[FAIL] {attack_type} NOT detected: '{payload[:30]}...'")

            # Test payloads that should NOT be detected (false positives)
            safe_payloads = [
                "cpu_usage_percentage",
                "model_accuracy_score",
                "Processing 100 records successfully",
                "User logged in from 192.168.1.1",
            ]

            for payload in safe_payloads:
                # Create a proper result object to track issues
                class ValidationResultMock:
                    def __init__(self):
                        self.is_valid = True
                        self.issues = []

                    def add_issue(self, code, msg, severity, field=None, details=None):
                        self.issues.append({"code": code})

                result_obj = ValidationResultMock()
                validator._check_injection(payload, result_obj, "test_field")

                if len(result_obj.issues) == 0:
                    passed += 1
                    details.append(f"[PASS] No false positive: '{payload[:30]}...'")
                else:
                    failed += 1
                    details.append(f"[FAIL] False positive: '{payload[:30]}...'")

            duration = time.time() - start_time

            return TestResult(
                suite="Injection Validation",
                status=TestStatus.PASSED if failed == 0 else TestStatus.FAILED,
                passed=passed,
                failed=failed,
                skipped=0,
                duration=duration,
                details=details
            )

        except Exception as e:
            return TestResult(
                suite="Injection Validation",
                status=TestStatus.ERROR,
                passed=0,
                failed=0,
                skipped=0,
                duration=time.time() - start_time,
                details=[f"Error: {str(e)}"]
            )

    def _parse_pytest_output(self, output: str) -> Tuple[int, int, int]:
        """Parse pytest output for test counts"""
        import re

        # Look for summary line like "5 passed, 2 failed, 1 skipped"
        passed = failed = skipped = 0

        passed_match = re.search(r'(\d+) passed', output)
        failed_match = re.search(r'(\d+) failed', output)
        skipped_match = re.search(r'(\d+) skipped', output)

        if passed_match:
            passed = int(passed_match.group(1))
        if failed_match:
            failed = int(failed_match.group(1))
        if skipped_match:
            skipped = int(skipped_match.group(1))

        return passed, failed, skipped

    def _parse_jest_output(self, output: str) -> Tuple[int, int, int]:
        """Parse Jest output for test counts"""
        import re

        passed = failed = skipped = 0

        # Jest format: "Tests: X passed, Y failed, Z total"
        tests_match = re.search(r'Tests:\s*(\d+)\s*passed', output)
        failed_match = re.search(r'(\d+)\s*failed', output)
        skipped_match = re.search(r'(\d+)\s*skipped', output)

        if tests_match:
            passed = int(tests_match.group(1))
        if failed_match:
            failed = int(failed_match.group(1))
        if skipped_match:
            skipped = int(skipped_match.group(1))

        return passed, failed, skipped

    def _extract_details(self, output: str, max_lines: int = 20) -> List[str]:
        """Extract relevant details from test output"""
        lines = output.strip().split('\n')

        # Filter relevant lines
        relevant = []
        for line in lines:
            line = line.strip()
            if any(kw in line.lower() for kw in ['fail', 'error', 'pass', 'assert', 'test']):
                if len(line) > 200:
                    line = line[:200] + "..."
                relevant.append(line)

        return relevant[:max_lines]

    def _create_report(self, results: List[TestResult], start_time: float) -> StartupTestReport:
        """Create final test report"""
        total_duration = time.time() - start_time

        # Determine overall status
        if any(r.status == TestStatus.ERROR for r in results):
            overall_status = TestStatus.ERROR
        elif any(r.status == TestStatus.FAILED for r in results):
            overall_status = TestStatus.FAILED
        elif all(r.status in (TestStatus.PASSED, TestStatus.SKIPPED) for r in results):
            overall_status = TestStatus.PASSED
        else:
            overall_status = TestStatus.FAILED

        # Generate recommendations
        recommendations = []
        for result in results:
            if result.status == TestStatus.FAILED:
                if "injection" in result.suite.lower():
                    recommendations.append(
                        f"Review injection detection patterns - {result.failed} tests failed"
                    )
                elif "drift" in result.suite.lower():
                    recommendations.append(
                        f"Check drift detection thresholds - {result.failed} tests failed"
                    )

        if overall_status == TestStatus.PASSED:
            recommendations.append("All startup tests passed - system is secure")

        return StartupTestReport(
            timestamp=datetime.utcnow().isoformat(),
            overall_status=overall_status,
            results=results,
            total_duration=total_duration,
            recommendations=recommendations
        )

    def _save_report(self, report: StartupTestReport):
        """Save report to file"""
        report_file = self.report_dir / f"startup-test-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"

        # Convert to dict for JSON serialization
        report_dict = {
            "timestamp": report.timestamp,
            "overall_status": report.overall_status.value,
            "total_duration": report.total_duration,
            "recommendations": report.recommendations,
            "results": [
                {
                    "suite": r.suite,
                    "status": r.status.value,
                    "passed": r.passed,
                    "failed": r.failed,
                    "skipped": r.skipped,
                    "duration": r.duration,
                    "details": r.details
                }
                for r in report.results
            ]
        }

        with open(report_file, 'w') as f:
            json.dump(report_dict, f, indent=2)

        print(f"\nReport saved to: {report_file}")

    def _print_result(self, result: TestResult):
        """Print individual test result"""
        status_icon = {
            TestStatus.PASSED: "[PASS]",
            TestStatus.FAILED: "[FAIL]",
            TestStatus.SKIPPED: "[SKIP]",
            TestStatus.ERROR: "[ERR!]",
        }

        print(f"  {status_icon[result.status]} {result.suite}")
        print(f"      Passed: {result.passed} | Failed: {result.failed} | Skipped: {result.skipped}")
        print(f"      Duration: {result.duration:.2f}s")

        if result.status in (TestStatus.FAILED, TestStatus.ERROR) and result.details:
            print("      Details:")
            for detail in result.details[:5]:
                print(f"        - {detail[:80]}")

    def _print_summary(self, report: StartupTestReport):
        """Print final summary"""
        print("\n" + "=" * 60)
        print("STARTUP TEST SUMMARY")
        print("=" * 60)

        status_text = {
            TestStatus.PASSED: "ALL TESTS PASSED",
            TestStatus.FAILED: "SOME TESTS FAILED",
            TestStatus.ERROR: "TEST ERRORS OCCURRED",
            TestStatus.SKIPPED: "TESTS SKIPPED",
        }

        total_passed = sum(r.passed for r in report.results)
        total_failed = sum(r.failed for r in report.results)
        total_skipped = sum(r.skipped for r in report.results)

        print(f"\nStatus: {status_text[report.overall_status]}")
        print(f"Total: {total_passed} passed, {total_failed} failed, {total_skipped} skipped")
        print(f"Duration: {report.total_duration:.2f}s")

        if report.recommendations:
            print("\nRecommendations:")
            for rec in report.recommendations:
                print(f"  - {rec}")

        print("\n" + "=" * 60)

        return report.overall_status == TestStatus.PASSED


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="AIOBS Startup Test Runner")
    parser.add_argument("--fail-fast", action="store_true", help="Stop on first failure")
    parser.add_argument("--quiet", action="store_true", help="Minimal output")
    parser.add_argument("--exit-code", action="store_true", help="Exit with code 1 on failure")

    args = parser.parse_args()

    runner = StartupTestRunner()
    report = runner.run_all_tests(fail_fast=args.fail_fast)

    if args.exit_code and report.overall_status != TestStatus.PASSED:
        sys.exit(1)


if __name__ == "__main__":
    main()
