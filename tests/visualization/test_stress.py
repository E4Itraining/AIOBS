"""
AIOBS Stress and Load Tests
Tests for performance under load, stress conditions, and resource constraints
"""
import pytest
import asyncio
import time
import random
import statistics
import threading
import concurrent.futures
from datetime import datetime, timedelta
from typing import List, Dict, Any, Callable, Tuple
from dataclasses import dataclass, field
from enum import Enum
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))


# =============================================================================
# Load Test Framework
# =============================================================================

@dataclass
class LoadTestResult:
    """Result of a load test"""
    total_requests: int
    successful_requests: int
    failed_requests: int
    total_duration_seconds: float
    requests_per_second: float
    avg_latency_ms: float
    p50_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    max_latency_ms: float
    errors: List[str] = field(default_factory=list)


class LoadTestRunner:
    """Runs load tests with configurable parameters"""

    def __init__(
        self,
        target_rps: int = 100,
        duration_seconds: int = 10,
        concurrent_users: int = 10
    ):
        self.target_rps = target_rps
        self.duration_seconds = duration_seconds
        self.concurrent_users = concurrent_users
        self.latencies: List[float] = []
        self.errors: List[str] = []
        self.successful = 0
        self.failed = 0
        self._lock = threading.Lock()

    def _record_result(self, latency_ms: float, success: bool, error: str = None):
        """Thread-safe recording of results"""
        with self._lock:
            if success:
                self.latencies.append(latency_ms)
                self.successful += 1
            else:
                self.failed += 1
                if error:
                    self.errors.append(error)

    async def run_async(
        self,
        request_func: Callable[[], Any]
    ) -> LoadTestResult:
        """Run async load test"""
        self.latencies = []
        self.errors = []
        self.successful = 0
        self.failed = 0

        start_time = time.time()
        interval = 1.0 / self.target_rps

        async def make_request():
            req_start = time.time()
            try:
                await request_func()
                latency = (time.time() - req_start) * 1000
                self._record_result(latency, True)
            except Exception as e:
                latency = (time.time() - req_start) * 1000
                self._record_result(latency, False, str(e))

        tasks = []
        while time.time() - start_time < self.duration_seconds:
            task = asyncio.create_task(make_request())
            tasks.append(task)
            await asyncio.sleep(interval)

        await asyncio.gather(*tasks, return_exceptions=True)

        return self._compute_results(time.time() - start_time)

    def run_sync(
        self,
        request_func: Callable[[], Any]
    ) -> LoadTestResult:
        """Run synchronous load test with thread pool"""
        self.latencies = []
        self.errors = []
        self.successful = 0
        self.failed = 0

        start_time = time.time()

        def make_request():
            req_start = time.time()
            try:
                request_func()
                latency = (time.time() - req_start) * 1000
                self._record_result(latency, True)
            except Exception as e:
                latency = (time.time() - req_start) * 1000
                self._record_result(latency, False, str(e))

        with concurrent.futures.ThreadPoolExecutor(max_workers=self.concurrent_users) as executor:
            futures = []
            while time.time() - start_time < self.duration_seconds:
                future = executor.submit(make_request)
                futures.append(future)
                time.sleep(1.0 / self.target_rps)

            concurrent.futures.wait(futures)

        return self._compute_results(time.time() - start_time)

    def _compute_results(self, duration: float) -> LoadTestResult:
        """Compute load test statistics"""
        if not self.latencies:
            return LoadTestResult(
                total_requests=self.successful + self.failed,
                successful_requests=0,
                failed_requests=self.failed,
                total_duration_seconds=duration,
                requests_per_second=0,
                avg_latency_ms=0,
                p50_latency_ms=0,
                p95_latency_ms=0,
                p99_latency_ms=0,
                max_latency_ms=0,
                errors=self.errors
            )

        sorted_latencies = sorted(self.latencies)
        n = len(sorted_latencies)

        return LoadTestResult(
            total_requests=self.successful + self.failed,
            successful_requests=self.successful,
            failed_requests=self.failed,
            total_duration_seconds=duration,
            requests_per_second=self.successful / duration,
            avg_latency_ms=statistics.mean(self.latencies),
            p50_latency_ms=sorted_latencies[int(n * 0.5)],
            p95_latency_ms=sorted_latencies[int(n * 0.95)],
            p99_latency_ms=sorted_latencies[min(int(n * 0.99), n - 1)],
            max_latency_ms=max(self.latencies),
            errors=self.errors
        )


# =============================================================================
# Mock Services for Stress Testing
# =============================================================================

class MockCognitiveEngine:
    """Mock cognitive engine for stress testing"""

    def __init__(self, latency_ms: float = 10, failure_rate: float = 0.01):
        self.latency_ms = latency_ms
        self.failure_rate = failure_rate
        self.call_count = 0
        self._lock = threading.Lock()

    def process(self, data: Dict) -> Dict:
        """Process a request with simulated latency"""
        with self._lock:
            self.call_count += 1

        # Simulate processing time
        time.sleep(self.latency_ms / 1000)

        # Simulate occasional failures
        if random.random() < self.failure_rate:
            raise RuntimeError("Simulated failure")

        return {
            "trust_score": random.uniform(0.7, 0.95),
            "processed_at": datetime.utcnow().isoformat()
        }

    async def process_async(self, data: Dict) -> Dict:
        """Async version of process"""
        with self._lock:
            self.call_count += 1

        await asyncio.sleep(self.latency_ms / 1000)

        if random.random() < self.failure_rate:
            raise RuntimeError("Simulated failure")

        return {
            "trust_score": random.uniform(0.7, 0.95),
            "processed_at": datetime.utcnow().isoformat()
        }


class MockIngestionService:
    """Mock ingestion service for stress testing"""

    def __init__(self, max_batch_size: int = 1000, latency_ms: float = 50):
        self.max_batch_size = max_batch_size
        self.latency_ms = latency_ms
        self.total_ingested = 0
        self._lock = threading.Lock()

    def ingest(self, items: List[Dict]) -> Dict:
        """Ingest a batch of items"""
        if len(items) > self.max_batch_size:
            raise ValueError(f"Batch size exceeds maximum of {self.max_batch_size}")

        time.sleep(self.latency_ms / 1000)

        with self._lock:
            self.total_ingested += len(items)

        return {
            "accepted": len(items),
            "total_ingested": self.total_ingested
        }


# =============================================================================
# Stress Tests
# =============================================================================

class TestCognitiveEngineStress:
    """Stress tests for cognitive engine"""

    @pytest.fixture
    def engine(self):
        return MockCognitiveEngine(latency_ms=5, failure_rate=0.01)

    @pytest.mark.stress
    def test_sustained_load(self, engine):
        """Should handle sustained load"""
        runner = LoadTestRunner(
            target_rps=100,
            duration_seconds=5,
            concurrent_users=10
        )

        result = runner.run_sync(lambda: engine.process({"test": True}))

        # Should achieve at least 80% of target RPS
        assert result.requests_per_second >= 80
        # Should have >99% success rate
        assert result.successful_requests / result.total_requests > 0.99
        # P95 latency should be reasonable
        assert result.p95_latency_ms < 100

    @pytest.mark.stress
    def test_burst_traffic(self, engine):
        """Should handle burst traffic"""
        runner = LoadTestRunner(
            target_rps=500,
            duration_seconds=2,
            concurrent_users=50
        )

        result = runner.run_sync(lambda: engine.process({"test": True}))

        # Should handle burst without catastrophic failure
        assert result.successful_requests > 0
        # Failure rate should be bounded
        failure_rate = result.failed_requests / result.total_requests
        assert failure_rate < 0.1  # <10% failure under burst

    @pytest.mark.stress
    def test_latency_under_load(self, engine):
        """Latency should remain bounded under load"""
        runner = LoadTestRunner(
            target_rps=50,
            duration_seconds=3,
            concurrent_users=5
        )

        result = runner.run_sync(lambda: engine.process({"test": True}))

        # Average latency should be close to base latency
        assert result.avg_latency_ms < 50  # 10x base latency
        # P99 should be bounded
        assert result.p99_latency_ms < 200


class TestIngestionStress:
    """Stress tests for data ingestion"""

    @pytest.fixture
    def ingestion(self):
        return MockIngestionService(max_batch_size=1000, latency_ms=20)

    @pytest.mark.stress
    def test_high_volume_ingestion(self, ingestion):
        """Should handle high volume ingestion"""
        total_batches = 100
        batch_size = 100

        start = time.time()
        for _ in range(total_batches):
            items = [{"metric": f"m_{i}", "value": random.random()} for i in range(batch_size)]
            ingestion.ingest(items)

        duration = time.time() - start

        # Should ingest all items
        assert ingestion.total_ingested == total_batches * batch_size
        # Should complete in reasonable time
        assert duration < 10  # Less than 10 seconds

    @pytest.mark.stress
    def test_batch_size_limits(self, ingestion):
        """Should enforce batch size limits"""
        # Should accept max batch size
        items = [{"metric": f"m_{i}"} for i in range(1000)]
        result = ingestion.ingest(items)
        assert result["accepted"] == 1000

        # Should reject oversized batch
        oversized = [{"metric": f"m_{i}"} for i in range(1001)]
        with pytest.raises(ValueError):
            ingestion.ingest(oversized)


# =============================================================================
# Memory Stress Tests
# =============================================================================

class TestMemoryStress:
    """Tests for memory behavior under stress"""

    @pytest.mark.stress
    def test_large_payload_processing(self):
        """Should handle large payloads"""
        def process_large_payload(size_mb: int) -> float:
            # Create large payload
            payload = "x" * (size_mb * 1024 * 1024)
            start = time.time()

            # Simulate processing
            result = len(payload)

            return time.time() - start

        # Test various sizes
        sizes = [1, 5, 10]
        for size in sizes:
            duration = process_large_payload(size)
            assert duration < size * 2  # Should process within 2s per MB

    @pytest.mark.stress
    def test_many_small_allocations(self):
        """Should handle many small allocations"""
        start = time.time()
        objects = []

        for _ in range(100000):
            obj = {"id": random.randint(1, 1000000), "data": "x" * 100}
            objects.append(obj)

        creation_time = time.time() - start

        # Should create objects quickly
        assert creation_time < 5

        # Cleanup
        del objects


# =============================================================================
# Concurrency Stress Tests
# =============================================================================

class TestConcurrencyStress:
    """Tests for concurrent access patterns"""

    @pytest.mark.stress
    def test_thread_safety(self):
        """Data structures should be thread-safe"""
        counter = {"value": 0}
        lock = threading.Lock()
        errors = []

        def increment():
            try:
                with lock:
                    current = counter["value"]
                    time.sleep(0.001)  # Simulate processing
                    counter["value"] = current + 1
            except Exception as e:
                errors.append(str(e))

        threads = []
        for _ in range(100):
            t = threading.Thread(target=increment)
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        # Should have no race conditions
        assert counter["value"] == 100
        assert len(errors) == 0

    @pytest.mark.stress
    @pytest.mark.asyncio
    async def test_async_concurrency(self):
        """Should handle async concurrency correctly"""
        results = []
        lock = asyncio.Lock()

        async def async_operation(i: int):
            await asyncio.sleep(0.01)
            async with lock:
                results.append(i)

        tasks = [async_operation(i) for i in range(100)]
        await asyncio.gather(*tasks)

        # All operations should complete
        assert len(results) == 100
        # All values should be unique
        assert len(set(results)) == 100


# =============================================================================
# Degradation Tests
# =============================================================================

class TestGracefulDegradation:
    """Tests for graceful degradation under stress"""

    @pytest.mark.stress
    def test_circuit_breaker(self):
        """Circuit breaker should open under failures"""
        class CircuitBreaker:
            def __init__(self, failure_threshold: int = 5, reset_timeout: float = 1.0):
                self.failure_threshold = failure_threshold
                self.reset_timeout = reset_timeout
                self.failures = 0
                self.state = "closed"  # closed, open, half-open
                self.last_failure_time = None

            def call(self, func: Callable) -> Any:
                if self.state == "open":
                    if time.time() - self.last_failure_time > self.reset_timeout:
                        self.state = "half-open"
                    else:
                        raise RuntimeError("Circuit breaker is open")

                try:
                    result = func()
                    if self.state == "half-open":
                        self.state = "closed"
                        self.failures = 0
                    return result
                except Exception as e:
                    self.failures += 1
                    self.last_failure_time = time.time()
                    if self.failures >= self.failure_threshold:
                        self.state = "open"
                    raise

        cb = CircuitBreaker(failure_threshold=3)

        def failing_func():
            raise RuntimeError("Service unavailable")

        # First failures should pass through
        for _ in range(3):
            with pytest.raises(RuntimeError):
                cb.call(failing_func)

        # Circuit should be open
        assert cb.state == "open"

        # Subsequent calls should fail fast
        with pytest.raises(RuntimeError) as exc:
            cb.call(failing_func)
        assert "Circuit breaker is open" in str(exc.value)

    @pytest.mark.stress
    def test_rate_limiting_under_load(self):
        """Rate limiting should work under load"""
        class RateLimiter:
            def __init__(self, max_requests: int, window_seconds: float):
                self.max_requests = max_requests
                self.window_seconds = window_seconds
                self.requests = []
                self.lock = threading.Lock()

            def allow(self) -> bool:
                now = time.time()
                with self.lock:
                    # Clean old requests
                    self.requests = [r for r in self.requests if now - r < self.window_seconds]

                    if len(self.requests) >= self.max_requests:
                        return False

                    self.requests.append(now)
                    return True

        limiter = RateLimiter(max_requests=100, window_seconds=1.0)
        allowed = 0
        denied = 0

        def make_request():
            nonlocal allowed, denied
            if limiter.allow():
                allowed += 1
            else:
                denied += 1

        # Simulate burst of 200 requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(make_request) for _ in range(200)]
            concurrent.futures.wait(futures)

        # Should have allowed ~100 and denied ~100
        assert allowed <= 100
        assert denied >= 100


# =============================================================================
# Resource Exhaustion Tests
# =============================================================================

class TestResourceExhaustion:
    """Tests for resource exhaustion handling"""

    @pytest.mark.stress
    def test_queue_overflow_handling(self):
        """Should handle queue overflow gracefully"""
        from queue import Queue, Full

        q = Queue(maxsize=10)
        overflow_count = 0

        # Fill queue
        for i in range(10):
            q.put(i)

        # Try to add more
        for i in range(10, 20):
            try:
                q.put_nowait(i)
            except Full:
                overflow_count += 1

        # Should have overflow
        assert overflow_count == 10
        # Queue should still be functional
        assert q.qsize() == 10

    @pytest.mark.stress
    def test_timeout_handling(self):
        """Should handle timeouts properly"""
        def slow_operation(duration: float):
            time.sleep(duration)
            return "completed"

        # Test with timeout
        start = time.time()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(slow_operation, 10)
            try:
                result = future.result(timeout=0.5)
                assert False, "Should have timed out"
            except concurrent.futures.TimeoutError:
                pass

        elapsed = time.time() - start
        assert elapsed < 1.0  # Should timeout quickly


# =============================================================================
# Recovery Tests
# =============================================================================

class TestRecovery:
    """Tests for system recovery after stress"""

    @pytest.mark.stress
    def test_recovery_after_load(self):
        """System should recover after high load"""
        engine = MockCognitiveEngine(latency_ms=5)

        # Apply high load
        runner = LoadTestRunner(target_rps=200, duration_seconds=2, concurrent_users=20)
        result_during_load = runner.run_sync(lambda: engine.process({}))

        # Wait for recovery
        time.sleep(1)

        # Test post-recovery performance
        runner_post = LoadTestRunner(target_rps=50, duration_seconds=2, concurrent_users=5)
        result_post = runner_post.run_sync(lambda: engine.process({}))

        # Post-recovery latency should be similar to baseline
        assert result_post.avg_latency_ms < result_during_load.avg_latency_ms * 2


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "stress"])
