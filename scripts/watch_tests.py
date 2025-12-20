#!/usr/bin/env python3
"""
AIOBS Test Watcher - Continuous Python Test Runner with Data Collection

Usage:
    python scripts/watch_tests.py [--interval 60] [--suite all] [--output ./test_reports]
"""

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path


class TestWatcher:
    """Continuous test runner with metrics collection."""

    def __init__(self, interval: int = 60, suite: str = "all", output_dir: str = "./test_reports"):
        self.interval = interval
        self.suite = suite
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.run_count = 0
        self.results_history = []

    def run_pytest(self) -> dict:
        """Run pytest and capture results."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        json_report = self.output_dir / f"pytest_{timestamp}.json"
        html_report = self.output_dir / f"pytest_{timestamp}.html"

        cmd = [
            sys.executable, "-m", "pytest", "tests/",
            "-v", "--tb=short",
            f"--json-report-file={json_report}",
            f"--html={html_report}",
            "--self-contained-html",
        ]

        if self.suite != "all":
            cmd.extend(["-m", self.suite])

        start_time = time.time()
        result = subprocess.run(cmd, capture_output=True, text=True)
        duration = time.time() - start_time

        # Parse results
        test_result = {
            "timestamp": timestamp,
            "duration_seconds": round(duration, 2),
            "return_code": result.returncode,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "errors": 0,
        }

        # Try to parse JSON report
        if json_report.exists():
            try:
                with open(json_report) as f:
                    data = json.load(f)
                    summary = data.get("summary", {})
                    test_result["passed"] = summary.get("passed", 0)
                    test_result["failed"] = summary.get("failed", 0)
                    test_result["skipped"] = summary.get("skipped", 0)
                    test_result["errors"] = summary.get("error", 0)
            except Exception:
                pass

        return test_result

    def run_jest(self) -> dict:
        """Run Jest tests and capture results."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        cmd = ["npm", "test", "--", "--json", "--outputFile",
               str(self.output_dir / f"jest_{timestamp}.json")]

        start_time = time.time()
        result = subprocess.run(cmd, capture_output=True, text=True)
        duration = time.time() - start_time

        test_result = {
            "timestamp": timestamp,
            "duration_seconds": round(duration, 2),
            "return_code": result.returncode,
            "passed": 0,
            "failed": 0,
        }

        # Parse Jest output
        json_file = self.output_dir / f"jest_{timestamp}.json"
        if json_file.exists():
            try:
                with open(json_file) as f:
                    data = json.load(f)
                    test_result["passed"] = data.get("numPassedTests", 0)
                    test_result["failed"] = data.get("numFailedTests", 0)
            except Exception:
                pass

        return test_result

    def save_metrics(self, python_result: dict, ts_result: dict):
        """Save aggregated metrics to file."""
        metrics_file = self.output_dir / "metrics_history.jsonl"

        metrics = {
            "run_number": self.run_count,
            "timestamp": datetime.now().isoformat(),
            "python": python_result,
            "typescript": ts_result,
            "all_passed": (
                python_result["return_code"] == 0 and
                ts_result["return_code"] == 0
            ),
        }

        with open(metrics_file, "a") as f:
            f.write(json.dumps(metrics) + "\n")

        self.results_history.append(metrics)

    def print_summary(self, python_result: dict, ts_result: dict):
        """Print test run summary."""
        print("\n" + "=" * 60)
        print(f"Run #{self.run_count} Summary")
        print("=" * 60)

        print(f"\nPython Tests:")
        print(f"  Passed:  {python_result['passed']}")
        print(f"  Failed:  {python_result['failed']}")
        print(f"  Skipped: {python_result['skipped']}")
        print(f"  Duration: {python_result['duration_seconds']}s")

        print(f"\nTypeScript Tests:")
        print(f"  Passed: {ts_result['passed']}")
        print(f"  Failed: {ts_result['failed']}")
        print(f"  Duration: {ts_result['duration_seconds']}s")

        status = "PASSED" if (python_result["return_code"] == 0 and
                              ts_result["return_code"] == 0) else "FAILED"
        color = "\033[92m" if status == "PASSED" else "\033[91m"
        print(f"\n{color}Overall: {status}\033[0m")
        print("=" * 60)

    def run(self):
        """Main watch loop."""
        print(f"""
╔══════════════════════════════════════════════════════════════╗
║           AIOBS Continuous Test Watcher                      ║
╠══════════════════════════════════════════════════════════════╣
║  Interval: {self.interval}s | Suite: {self.suite:<10} | Output: {str(self.output_dir):<15} ║
╚══════════════════════════════════════════════════════════════╝
        """)

        try:
            while True:
                self.run_count += 1
                print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Starting test run #{self.run_count}...")

                python_result = self.run_pytest()
                ts_result = self.run_jest()

                self.save_metrics(python_result, ts_result)
                self.print_summary(python_result, ts_result)

                print(f"\nNext run in {self.interval} seconds... (Ctrl+C to stop)")
                time.sleep(self.interval)

        except KeyboardInterrupt:
            print("\n\nStopping test watcher...")
            print(f"Total runs: {self.run_count}")
            print(f"Results saved to: {self.output_dir}")


def main():
    parser = argparse.ArgumentParser(description="AIOBS Continuous Test Watcher")
    parser.add_argument("--interval", type=int, default=60, help="Seconds between runs")
    parser.add_argument("--suite", type=str, default="all",
                        choices=["all", "unit", "integration", "security", "drift", "stress"],
                        help="Test suite to run")
    parser.add_argument("--output", type=str, default="./test_reports", help="Output directory")

    args = parser.parse_args()

    watcher = TestWatcher(
        interval=args.interval,
        suite=args.suite,
        output_dir=args.output,
    )
    watcher.run()


if __name__ == "__main__":
    main()
