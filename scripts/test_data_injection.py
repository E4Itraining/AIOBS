#!/usr/bin/env python3
"""
AIOBS - Data Injection Test Script
===================================
Validates real-time data injection to Victoria Metrics, OpenObserve, and Redis.

Usage:
    python scripts/test_data_injection.py [--full] [--continuous]

Options:
    --full        Run comprehensive tests including stress testing
    --continuous  Run continuous injection for monitoring (Ctrl+C to stop)
"""

import argparse
import asyncio
import json
import random
import sys
import time
from datetime import datetime, timedelta
from typing import Any

import aiohttp

# ============================================================================
# Configuration
# ============================================================================

CONFIG = {
    # Service URLs (configurable via environment)
    "victoria_metrics_url": "http://localhost:8428",
    "openobserve_url": "http://localhost:5080",
    "openobserve_user": "admin@aiobs.local",
    "openobserve_password": "Complexpass#123",
    "openobserve_org": "default",
    "redis_url": "redis://localhost:6379",
    "backend_url": "http://localhost:3000",
    "visualization_url": "http://localhost:8000",
}

# Test Models
TEST_MODELS = [
    {"id": "fraud-detector-v1", "version": "1.0.0", "type": "classification"},
    {"id": "churn-predictor-v1", "version": "1.2.0", "type": "regression"},
    {"id": "recommendation-v2", "version": "2.1.0", "type": "embedding"},
    {"id": "sentiment-analyzer-v1", "version": "1.0.5", "type": "nlp"},
]


# ============================================================================
# Color Output
# ============================================================================

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_header(text: str) -> None:
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * 60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'=' * 60}{Colors.ENDC}\n")


def print_success(text: str) -> None:
    print(f"{Colors.GREEN}✓ {text}{Colors.ENDC}")


def print_error(text: str) -> None:
    print(f"{Colors.RED}✗ {text}{Colors.ENDC}")


def print_warning(text: str) -> None:
    print(f"{Colors.YELLOW}⚠ {text}{Colors.ENDC}")


def print_info(text: str) -> None:
    print(f"{Colors.CYAN}ℹ {text}{Colors.ENDC}")


# ============================================================================
# Victoria Metrics Tests
# ============================================================================

async def test_victoria_metrics_health(session: aiohttp.ClientSession) -> bool:
    """Test Victoria Metrics health endpoint."""
    try:
        url = f"{CONFIG['victoria_metrics_url']}/-/healthy"
        async with session.get(url, timeout=5) as resp:
            if resp.status == 200:
                print_success("Victoria Metrics is healthy")
                return True
            print_error(f"Victoria Metrics health check failed: {resp.status}")
            return False
    except Exception as e:
        print_error(f"Victoria Metrics connection failed: {e}")
        return False


async def test_victoria_metrics_write(session: aiohttp.ClientSession) -> bool:
    """Test writing metrics to Victoria Metrics."""
    try:
        url = f"{CONFIG['victoria_metrics_url']}/api/v1/import/prometheus"
        timestamp = int(time.time() * 1000)

        # Generate test metrics
        metrics_lines = []
        for model in TEST_MODELS:
            model_id = model["id"]
            metrics_lines.extend([
                f'aiobs_inference_latency_ms{{model_id="{model_id}"}} {random.uniform(10, 200):.2f} {timestamp}',
                f'aiobs_inference_throughput_rps{{model_id="{model_id}"}} {random.uniform(50, 500):.2f} {timestamp}',
                f'aiobs_drift_score{{model_id="{model_id}"}} {random.uniform(0, 0.5):.4f} {timestamp}',
                f'aiobs_model_accuracy{{model_id="{model_id}"}} {random.uniform(0.85, 0.99):.4f} {timestamp}',
                f'aiobs_trust_score{{model_id="{model_id}"}} {random.uniform(0.7, 1.0):.4f} {timestamp}',
                f'aiobs_cost_inference_dollars{{model_id="{model_id}"}} {random.uniform(0.001, 0.05):.6f} {timestamp}',
                f'aiobs_slo_compliance{{model_id="{model_id}"}} {random.uniform(0.95, 1.0):.4f} {timestamp}',
            ])

        body = "\n".join(metrics_lines)

        async with session.post(url, data=body, headers={"Content-Type": "text/plain"}, timeout=10) as resp:
            if resp.status in (200, 204):
                print_success(f"Wrote {len(metrics_lines)} metrics to Victoria Metrics")
                return True
            text = await resp.text()
            print_error(f"Victoria Metrics write failed: {resp.status} - {text}")
            return False
    except Exception as e:
        print_error(f"Victoria Metrics write error: {e}")
        return False


async def test_victoria_metrics_query(session: aiohttp.ClientSession) -> bool:
    """Test querying metrics from Victoria Metrics."""
    try:
        url = f"{CONFIG['victoria_metrics_url']}/api/v1/query"
        params = {"query": "aiobs_inference_latency_ms"}

        async with session.get(url, params=params, timeout=10) as resp:
            if resp.status == 200:
                data = await resp.json()
                result_count = len(data.get("data", {}).get("result", []))
                print_success(f"Query returned {result_count} time series")
                return True
            text = await resp.text()
            print_error(f"Victoria Metrics query failed: {resp.status} - {text}")
            return False
    except Exception as e:
        print_error(f"Victoria Metrics query error: {e}")
        return False


# ============================================================================
# OpenObserve Tests
# ============================================================================

def get_openobserve_auth() -> aiohttp.BasicAuth:
    """Get OpenObserve authentication."""
    return aiohttp.BasicAuth(
        CONFIG["openobserve_user"],
        CONFIG["openobserve_password"]
    )


async def test_openobserve_health(session: aiohttp.ClientSession) -> bool:
    """Test OpenObserve health endpoint."""
    try:
        url = f"{CONFIG['openobserve_url']}/healthz"
        async with session.get(url, timeout=5) as resp:
            if resp.status == 200:
                print_success("OpenObserve is healthy")
                return True
            print_error(f"OpenObserve health check failed: {resp.status}")
            return False
    except Exception as e:
        print_error(f"OpenObserve connection failed: {e}")
        return False


async def test_openobserve_write_logs(session: aiohttp.ClientSession) -> bool:
    """Test writing logs to OpenObserve."""
    try:
        org = CONFIG["openobserve_org"]
        stream = "aiobs_test_logs"
        url = f"{CONFIG['openobserve_url']}/api/{org}/{stream}/_json"

        # Generate test logs
        logs = []
        log_levels = ["info", "warn", "error", "debug"]
        log_messages = [
            "Model inference completed successfully",
            "High latency detected in inference pipeline",
            "Data drift threshold exceeded",
            "Feature store refreshed",
            "SLO compliance check passed",
            "Batch prediction job started",
            "Model retraining triggered",
            "Anomaly detected in input data",
        ]

        for i in range(10):
            model = random.choice(TEST_MODELS)
            logs.append({
                "_timestamp": int(time.time() * 1_000_000),  # microseconds
                "level": random.choice(log_levels),
                "message": random.choice(log_messages),
                "model_id": model["id"],
                "model_version": model["version"],
                "latency_ms": random.randint(10, 500),
                "request_id": f"req-{i:04d}",
                "environment": "test",
            })

        async with session.post(
            url,
            json=logs,
            auth=get_openobserve_auth(),
            timeout=10
        ) as resp:
            if resp.status == 200:
                print_success(f"Wrote {len(logs)} logs to OpenObserve stream '{stream}'")
                return True
            text = await resp.text()
            print_error(f"OpenObserve log write failed: {resp.status} - {text}")
            return False
    except Exception as e:
        print_error(f"OpenObserve log write error: {e}")
        return False


async def test_openobserve_write_traces(session: aiohttp.ClientSession) -> bool:
    """Test writing traces to OpenObserve."""
    try:
        org = CONFIG["openobserve_org"]
        stream = "aiobs_test_traces"
        url = f"{CONFIG['openobserve_url']}/api/{org}/{stream}/_json"

        # Generate test trace
        trace_id = f"trace-{int(time.time())}"
        base_time = int(time.time() * 1_000_000)

        spans = [
            {
                "_timestamp": base_time,
                "trace_id": trace_id,
                "span_id": "span-001",
                "parent_span_id": None,
                "operation_name": "inference_request",
                "service_name": "api-gateway",
                "duration_ms": 150,
                "status": "ok",
            },
            {
                "_timestamp": base_time + 10000,
                "trace_id": trace_id,
                "span_id": "span-002",
                "parent_span_id": "span-001",
                "operation_name": "feature_extraction",
                "service_name": "feature-store",
                "duration_ms": 45,
                "status": "ok",
            },
            {
                "_timestamp": base_time + 60000,
                "trace_id": trace_id,
                "span_id": "span-003",
                "parent_span_id": "span-001",
                "operation_name": "model_inference",
                "service_name": "inference-engine",
                "duration_ms": 80,
                "status": "ok",
            },
        ]

        async with session.post(
            url,
            json=spans,
            auth=get_openobserve_auth(),
            timeout=10
        ) as resp:
            if resp.status == 200:
                print_success(f"Wrote {len(spans)} spans to OpenObserve stream '{stream}'")
                return True
            text = await resp.text()
            print_error(f"OpenObserve trace write failed: {resp.status} - {text}")
            return False
    except Exception as e:
        print_error(f"OpenObserve trace write error: {e}")
        return False


async def test_openobserve_query(session: aiohttp.ClientSession) -> bool:
    """Test querying logs from OpenObserve."""
    try:
        org = CONFIG["openobserve_org"]
        url = f"{CONFIG['openobserve_url']}/api/{org}/_search"

        # Query last hour
        end_time = int(time.time() * 1_000_000)
        start_time = end_time - (3600 * 1_000_000)

        query = {
            "query": {
                "sql": 'SELECT * FROM "aiobs_test_logs" ORDER BY _timestamp DESC LIMIT 10',
                "start_time": start_time,
                "end_time": end_time,
                "from": 0,
                "size": 10,
            }
        }

        async with session.post(
            url,
            json=query,
            auth=get_openobserve_auth(),
            timeout=10
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                hit_count = len(data.get("hits", []))
                print_success(f"Query returned {hit_count} log entries")
                return True
            text = await resp.text()
            print_error(f"OpenObserve query failed: {resp.status} - {text}")
            return False
    except Exception as e:
        print_error(f"OpenObserve query error: {e}")
        return False


# ============================================================================
# Redis Tests
# ============================================================================

async def test_redis_connection() -> bool:
    """Test Redis connection and pub/sub."""
    try:
        import redis.asyncio as redis_async

        # Parse Redis URL
        redis_url = CONFIG["redis_url"]
        client = redis_async.from_url(redis_url)

        # Test PING
        result = await client.ping()
        if result:
            print_success("Redis PING successful")

        # Test pub/sub
        channel = "aiobs:test_events"
        test_event = {
            "event_type": "test_injection",
            "timestamp": datetime.utcnow().isoformat(),
            "source": "test_script",
            "payload": {"test": True},
        }

        subscribers = await client.publish(channel, json.dumps(test_event))
        print_success(f"Published test event to '{channel}' ({subscribers} subscribers)")

        # Test list operations (event storage)
        list_key = "aiobs:test_events_list"
        await client.lpush(list_key, json.dumps(test_event))
        await client.ltrim(list_key, 0, 99)  # Keep last 100
        list_len = await client.llen(list_key)
        print_success(f"Stored event in list '{list_key}' (length: {list_len})")

        await client.close()
        return True

    except ImportError:
        print_warning("redis package not installed, skipping Redis tests")
        return True
    except Exception as e:
        print_error(f"Redis test error: {e}")
        return False


# ============================================================================
# Backend API Tests
# ============================================================================

async def test_backend_ingestion_api(session: aiohttp.ClientSession) -> bool:
    """Test the backend ingestion API endpoints."""
    try:
        base_url = CONFIG["backend_url"]

        # Test health endpoint
        async with session.get(f"{base_url}/api/ingest/health", timeout=5) as resp:
            if resp.status == 200:
                data = await resp.json()
                print_success("Backend ingestion API is healthy")
                backends = data.get("data", {}).get("backends", {})
                for backend, status in backends.items():
                    print_info(f"  - {backend}: {status}")
            else:
                print_warning(f"Backend health check returned {resp.status}")

        # Test metrics ingestion
        metrics_payload = {
            "metrics": [
                {
                    "name": "aiobs_test_metric",
                    "value": random.uniform(0, 100),
                    "labels": {"model_id": "test-model", "env": "test"},
                    "timestamp": datetime.utcnow().isoformat(),
                }
                for _ in range(5)
            ],
            "metadata": {
                "source": "test_script",
                "source_id": "test-001",
            },
        }

        headers = {"X-API-Key": "demo-key"}
        async with session.post(
            f"{base_url}/api/ingest/metrics",
            json=metrics_payload,
            headers=headers,
            timeout=10
        ) as resp:
            if resp.status == 202:
                data = await resp.json()
                accepted = data.get("data", {}).get("accepted", 0)
                print_success(f"Backend accepted {accepted} metrics")
                return True
            text = await resp.text()
            print_error(f"Backend metrics ingestion failed: {resp.status} - {text}")
            return False

    except Exception as e:
        print_error(f"Backend API test error: {e}")
        return False


# ============================================================================
# Continuous Injection Mode
# ============================================================================

async def continuous_injection(session: aiohttp.ClientSession) -> None:
    """Run continuous data injection for monitoring."""
    print_header("Continuous Injection Mode")
    print_info("Press Ctrl+C to stop\n")

    metrics_count = 0
    logs_count = 0
    iteration = 0

    try:
        while True:
            iteration += 1
            timestamp = int(time.time() * 1000)

            # Inject metrics
            metrics_lines = []
            for model in TEST_MODELS:
                model_id = model["id"]

                # Simulate realistic metric variations
                base_latency = 50 + hash(model_id) % 100
                latency = base_latency + random.gauss(0, 10)

                base_throughput = 100 + hash(model_id) % 200
                throughput = base_throughput + random.gauss(0, 20)

                drift = 0.1 + random.gauss(0, 0.05)
                drift = max(0, min(1, drift))

                metrics_lines.extend([
                    f'aiobs_inference_latency_ms{{model_id="{model_id}"}} {latency:.2f} {timestamp}',
                    f'aiobs_inference_throughput_rps{{model_id="{model_id}"}} {throughput:.2f} {timestamp}',
                    f'aiobs_drift_score{{model_id="{model_id}"}} {drift:.4f} {timestamp}',
                    f'aiobs_model_accuracy{{model_id="{model_id}"}} {0.95 + random.gauss(0, 0.02):.4f} {timestamp}',
                    f'aiobs_trust_score{{model_id="{model_id}"}} {0.85 + random.gauss(0, 0.05):.4f} {timestamp}',
                    f'aiobs_error_budget_remaining{{model_id="{model_id}"}} {0.7 + random.gauss(0, 0.1):.4f} {timestamp}',
                ])

            # Write to Victoria Metrics
            url = f"{CONFIG['victoria_metrics_url']}/api/v1/import/prometheus"
            body = "\n".join(metrics_lines)
            try:
                async with session.post(url, data=body, headers={"Content-Type": "text/plain"}, timeout=5) as resp:
                    if resp.status in (200, 204):
                        metrics_count += len(metrics_lines)
            except Exception:
                pass

            # Inject logs every 5 iterations
            if iteration % 5 == 0:
                org = CONFIG["openobserve_org"]
                log_url = f"{CONFIG['openobserve_url']}/api/{org}/aiobs_monitoring/_json"

                logs = []
                for _ in range(3):
                    model = random.choice(TEST_MODELS)
                    level = random.choices(
                        ["info", "warn", "error"],
                        weights=[0.8, 0.15, 0.05]
                    )[0]

                    logs.append({
                        "_timestamp": int(time.time() * 1_000_000),
                        "level": level,
                        "message": f"Inference completed for {model['id']}",
                        "model_id": model["id"],
                        "latency_ms": random.randint(20, 200),
                        "batch_size": random.randint(1, 64),
                    })

                try:
                    async with session.post(
                        log_url,
                        json=logs,
                        auth=get_openobserve_auth(),
                        timeout=5
                    ) as resp:
                        if resp.status == 200:
                            logs_count += len(logs)
                except Exception:
                    pass

            # Status update every 10 iterations
            if iteration % 10 == 0:
                print(f"\r{Colors.CYAN}[{datetime.now().strftime('%H:%M:%S')}] "
                      f"Metrics: {metrics_count:,} | Logs: {logs_count:,} | "
                      f"Iteration: {iteration}{Colors.ENDC}", end="", flush=True)

            await asyncio.sleep(1)

    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Injection stopped.{Colors.ENDC}")
        print_info(f"Total metrics injected: {metrics_count:,}")
        print_info(f"Total logs injected: {logs_count:,}")


# ============================================================================
# Full Test Suite
# ============================================================================

async def run_stress_test(session: aiohttp.ClientSession) -> None:
    """Run stress test with high volume injection."""
    print_header("Stress Test")

    batch_size = 1000
    batches = 10
    total_metrics = 0

    print_info(f"Injecting {batch_size * batches:,} metrics...")

    start_time = time.time()

    for batch in range(batches):
        timestamp = int(time.time() * 1000)
        metrics_lines = []

        for i in range(batch_size):
            model = random.choice(TEST_MODELS)
            metrics_lines.append(
                f'aiobs_stress_test{{model_id="{model["id"]}",batch="{batch}",idx="{i}"}} '
                f'{random.uniform(0, 100):.2f} {timestamp}'
            )

        url = f"{CONFIG['victoria_metrics_url']}/api/v1/import/prometheus"
        body = "\n".join(metrics_lines)

        try:
            async with session.post(url, data=body, headers={"Content-Type": "text/plain"}, timeout=30) as resp:
                if resp.status in (200, 204):
                    total_metrics += len(metrics_lines)
                    print(f"\r  Batch {batch + 1}/{batches} completed", end="", flush=True)
        except Exception as e:
            print_error(f"\n  Batch {batch + 1} failed: {e}")

    elapsed = time.time() - start_time
    rate = total_metrics / elapsed if elapsed > 0 else 0

    print()
    print_success(f"Injected {total_metrics:,} metrics in {elapsed:.2f}s ({rate:.0f} metrics/sec)")


# ============================================================================
# Main
# ============================================================================

async def main() -> int:
    parser = argparse.ArgumentParser(description="AIOBS Data Injection Test")
    parser.add_argument("--full", action="store_true", help="Run full test suite including stress test")
    parser.add_argument("--continuous", action="store_true", help="Run continuous injection mode")
    args = parser.parse_args()

    print_header("AIOBS Data Injection Test")
    print_info(f"Victoria Metrics: {CONFIG['victoria_metrics_url']}")
    print_info(f"OpenObserve: {CONFIG['openobserve_url']}")
    print_info(f"Redis: {CONFIG['redis_url']}")
    print()

    results = {
        "victoria_metrics": {"health": False, "write": False, "query": False},
        "openobserve": {"health": False, "logs": False, "traces": False, "query": False},
        "redis": {"connection": False},
        "backend": {"api": False},
    }

    async with aiohttp.ClientSession() as session:
        if args.continuous:
            await continuous_injection(session)
            return 0

        # Victoria Metrics Tests
        print_header("Victoria Metrics Tests")
        results["victoria_metrics"]["health"] = await test_victoria_metrics_health(session)
        if results["victoria_metrics"]["health"]:
            results["victoria_metrics"]["write"] = await test_victoria_metrics_write(session)
            await asyncio.sleep(1)  # Wait for data to be indexed
            results["victoria_metrics"]["query"] = await test_victoria_metrics_query(session)

        # OpenObserve Tests
        print_header("OpenObserve Tests")
        results["openobserve"]["health"] = await test_openobserve_health(session)
        if results["openobserve"]["health"]:
            results["openobserve"]["logs"] = await test_openobserve_write_logs(session)
            results["openobserve"]["traces"] = await test_openobserve_write_traces(session)
            await asyncio.sleep(1)  # Wait for data to be indexed
            results["openobserve"]["query"] = await test_openobserve_query(session)

        # Redis Tests
        print_header("Redis Tests")
        results["redis"]["connection"] = await test_redis_connection()

        # Backend API Tests
        print_header("Backend API Tests")
        results["backend"]["api"] = await test_backend_ingestion_api(session)

        # Stress Test (if --full)
        if args.full:
            await run_stress_test(session)

    # Summary
    print_header("Test Summary")

    all_passed = True
    for category, tests in results.items():
        category_passed = all(tests.values())
        status = f"{Colors.GREEN}PASS{Colors.ENDC}" if category_passed else f"{Colors.RED}FAIL{Colors.ENDC}"
        print(f"  {category.replace('_', ' ').title()}: {status}")
        for test, passed in tests.items():
            symbol = "✓" if passed else "✗"
            color = Colors.GREEN if passed else Colors.RED
            print(f"    {color}{symbol} {test}{Colors.ENDC}")
        if not category_passed:
            all_passed = False

    print()
    if all_passed:
        print_success("All tests passed!")
        return 0
    else:
        print_error("Some tests failed. Check service availability.")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
