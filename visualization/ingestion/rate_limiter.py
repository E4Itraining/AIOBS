"""
AIOBS Rate Limiter
Token bucket and sliding window rate limiting for data ingestion
"""

from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import hashlib
import time


class RateLimitStrategy(Enum):
    """Rate limiting strategies"""
    TOKEN_BUCKET = "token_bucket"
    SLIDING_WINDOW = "sliding_window"
    FIXED_WINDOW = "fixed_window"
    LEAKY_BUCKET = "leaky_bucket"


@dataclass
class RateLimitConfig:
    """Rate limit configuration"""
    # Requests per window
    requests_per_second: int = 100
    requests_per_minute: int = 3000
    requests_per_hour: int = 100000

    # Data volume limits
    bytes_per_second: int = 10 * 1024 * 1024  # 10 MB/s
    bytes_per_minute: int = 500 * 1024 * 1024  # 500 MB/min
    bytes_per_hour: int = 10 * 1024 * 1024 * 1024  # 10 GB/h

    # Burst allowance
    burst_multiplier: float = 2.0

    # Strategy
    strategy: RateLimitStrategy = RateLimitStrategy.TOKEN_BUCKET

    # Backoff configuration
    backoff_base_seconds: float = 1.0
    backoff_max_seconds: float = 60.0
    backoff_multiplier: float = 2.0


@dataclass
class RateLimitState:
    """State for a rate limiter bucket"""
    tokens: float
    last_update: float
    request_count: int = 0
    bytes_count: int = 0
    window_start: float = field(default_factory=time.time)
    violations: int = 0


@dataclass
class RateLimitResult:
    """Result of a rate limit check"""
    allowed: bool
    remaining_requests: int
    remaining_bytes: int
    reset_time: datetime
    retry_after_seconds: Optional[float] = None
    reason: Optional[str] = None


class RateLimiter:
    """
    Advanced rate limiter for data ingestion
    Supports multiple strategies and per-source limits
    """

    def __init__(self, config: Optional[RateLimitConfig] = None):
        self.config = config or RateLimitConfig()
        self._buckets: Dict[str, RateLimitState] = {}
        self._global_state = RateLimitState(
            tokens=float(self.config.requests_per_second * self.config.burst_multiplier),
            last_update=time.time()
        )
        self._lock = asyncio.Lock()

    async def check_rate_limit(
        self,
        source_id: str,
        request_size_bytes: int = 0
    ) -> RateLimitResult:
        """
        Check if request is within rate limits

        Args:
            source_id: Unique identifier for the source
            request_size_bytes: Size of the request in bytes

        Returns:
            RateLimitResult with allowed status and metadata
        """
        async with self._lock:
            current_time = time.time()

            # Get or create bucket for this source
            bucket = self._get_or_create_bucket(source_id, current_time)

            # Refill tokens based on strategy
            self._refill_tokens(bucket, current_time)

            # Check request rate limit
            if bucket.tokens < 1:
                return self._create_denied_result(bucket, "Request rate limit exceeded")

            # Check byte rate limit
            if request_size_bytes > 0:
                bytes_remaining = self._get_bytes_remaining(bucket, current_time)
                if request_size_bytes > bytes_remaining:
                    return self._create_denied_result(bucket, "Byte rate limit exceeded")

            # Allow request and consume tokens
            bucket.tokens -= 1
            bucket.request_count += 1
            bucket.bytes_count += request_size_bytes

            return RateLimitResult(
                allowed=True,
                remaining_requests=int(bucket.tokens),
                remaining_bytes=self._get_bytes_remaining(bucket, current_time),
                reset_time=datetime.utcnow() + timedelta(seconds=60 - (current_time % 60))
            )

    async def check_global_rate_limit(self, request_size_bytes: int = 0) -> RateLimitResult:
        """Check global rate limit across all sources"""
        async with self._lock:
            current_time = time.time()
            self._refill_tokens(self._global_state, current_time)

            if self._global_state.tokens < 1:
                return self._create_denied_result(
                    self._global_state,
                    "Global rate limit exceeded"
                )

            self._global_state.tokens -= 1
            return RateLimitResult(
                allowed=True,
                remaining_requests=int(self._global_state.tokens),
                remaining_bytes=self.config.bytes_per_second,
                reset_time=datetime.utcnow() + timedelta(seconds=1)
            )

    def _get_or_create_bucket(self, source_id: str, current_time: float) -> RateLimitState:
        """Get or create a rate limit bucket for a source"""
        bucket_key = self._hash_source_id(source_id)

        if bucket_key not in self._buckets:
            self._buckets[bucket_key] = RateLimitState(
                tokens=float(self.config.requests_per_second * self.config.burst_multiplier),
                last_update=current_time,
                window_start=current_time
            )

        return self._buckets[bucket_key]

    def _refill_tokens(self, bucket: RateLimitState, current_time: float):
        """Refill tokens based on elapsed time"""
        elapsed = current_time - bucket.last_update

        if self.config.strategy == RateLimitStrategy.TOKEN_BUCKET:
            # Token bucket: add tokens at rate of requests_per_second
            tokens_to_add = elapsed * self.config.requests_per_second
            max_tokens = self.config.requests_per_second * self.config.burst_multiplier
            bucket.tokens = min(bucket.tokens + tokens_to_add, max_tokens)

        elif self.config.strategy == RateLimitStrategy.SLIDING_WINDOW:
            # Sliding window: reset window if elapsed > window size
            window_size = 60  # 1 minute window
            if elapsed > window_size:
                bucket.tokens = float(self.config.requests_per_minute)
                bucket.request_count = 0
                bucket.bytes_count = 0
                bucket.window_start = current_time

        elif self.config.strategy == RateLimitStrategy.FIXED_WINDOW:
            # Fixed window: reset at window boundaries
            window_size = 60
            if current_time - bucket.window_start >= window_size:
                bucket.tokens = float(self.config.requests_per_minute)
                bucket.request_count = 0
                bucket.bytes_count = 0
                bucket.window_start = current_time

        bucket.last_update = current_time

    def _get_bytes_remaining(self, bucket: RateLimitState, current_time: float) -> int:
        """Calculate remaining bytes in current window"""
        elapsed = current_time - bucket.window_start
        if elapsed >= 60:
            return self.config.bytes_per_minute

        return max(0, self.config.bytes_per_minute - bucket.bytes_count)

    def _create_denied_result(self, bucket: RateLimitState, reason: str) -> RateLimitResult:
        """Create a rate limit denied result"""
        bucket.violations += 1

        # Calculate retry after with exponential backoff
        backoff = min(
            self.config.backoff_base_seconds * (self.config.backoff_multiplier ** bucket.violations),
            self.config.backoff_max_seconds
        )

        return RateLimitResult(
            allowed=False,
            remaining_requests=0,
            remaining_bytes=0,
            reset_time=datetime.utcnow() + timedelta(seconds=backoff),
            retry_after_seconds=backoff,
            reason=reason
        )

    def _hash_source_id(self, source_id: str) -> str:
        """Hash source ID for bucket key"""
        return hashlib.sha256(source_id.encode()).hexdigest()[:16]

    async def get_stats(self) -> Dict:
        """Get rate limiter statistics"""
        async with self._lock:
            return {
                "active_buckets": len(self._buckets),
                "global_tokens_remaining": int(self._global_state.tokens),
                "global_requests_count": self._global_state.request_count,
                "total_violations": sum(b.violations for b in self._buckets.values()),
                "config": {
                    "requests_per_second": self.config.requests_per_second,
                    "requests_per_minute": self.config.requests_per_minute,
                    "bytes_per_second": self.config.bytes_per_second,
                    "strategy": self.config.strategy.value
                }
            }

    async def reset_bucket(self, source_id: str):
        """Reset rate limit bucket for a source"""
        async with self._lock:
            bucket_key = self._hash_source_id(source_id)
            if bucket_key in self._buckets:
                del self._buckets[bucket_key]

    async def cleanup_expired_buckets(self, max_age_seconds: int = 3600):
        """Clean up expired buckets to free memory"""
        async with self._lock:
            current_time = time.time()
            expired_keys = [
                key for key, bucket in self._buckets.items()
                if current_time - bucket.last_update > max_age_seconds
            ]
            for key in expired_keys:
                del self._buckets[key]

            return len(expired_keys)


class AdaptiveRateLimiter(RateLimiter):
    """
    Adaptive rate limiter that adjusts limits based on system load
    """

    def __init__(
        self,
        config: Optional[RateLimitConfig] = None,
        low_load_multiplier: float = 1.5,
        high_load_multiplier: float = 0.5
    ):
        super().__init__(config)
        self.low_load_multiplier = low_load_multiplier
        self.high_load_multiplier = high_load_multiplier
        self._current_load = 0.5  # 0.0 - 1.0

    async def update_load(self, load: float):
        """Update current system load (0.0 - 1.0)"""
        self._current_load = max(0.0, min(1.0, load))

    async def check_rate_limit(
        self,
        source_id: str,
        request_size_bytes: int = 0
    ) -> RateLimitResult:
        """Check rate limit with adaptive adjustment"""
        # Adjust config based on load
        original_rps = self.config.requests_per_second

        if self._current_load < 0.3:
            self.config.requests_per_second = int(original_rps * self.low_load_multiplier)
        elif self._current_load > 0.7:
            self.config.requests_per_second = int(original_rps * self.high_load_multiplier)

        result = await super().check_rate_limit(source_id, request_size_bytes)

        # Restore original config
        self.config.requests_per_second = original_rps

        return result


class DistributedRateLimiter:
    """
    Distributed rate limiter using Redis for multi-instance deployments
    """

    def __init__(
        self,
        redis_client,
        config: Optional[RateLimitConfig] = None,
        key_prefix: str = "aiobs:ratelimit:"
    ):
        self.redis = redis_client
        self.config = config or RateLimitConfig()
        self.key_prefix = key_prefix

    async def check_rate_limit(
        self,
        source_id: str,
        request_size_bytes: int = 0
    ) -> RateLimitResult:
        """Check rate limit using Redis"""
        key = f"{self.key_prefix}{self._hash_source_id(source_id)}"
        current_time = int(time.time())
        window_key = f"{key}:{current_time // 60}"

        # Use Redis pipeline for atomic operations
        pipe = self.redis.pipeline()
        pipe.incr(window_key)
        pipe.expire(window_key, 120)  # 2 minute expiry
        results = await pipe.execute()

        current_count = results[0]

        if current_count > self.config.requests_per_minute:
            return RateLimitResult(
                allowed=False,
                remaining_requests=0,
                remaining_bytes=0,
                reset_time=datetime.utcnow() + timedelta(seconds=60 - (current_time % 60)),
                retry_after_seconds=60 - (current_time % 60),
                reason="Rate limit exceeded"
            )

        return RateLimitResult(
            allowed=True,
            remaining_requests=self.config.requests_per_minute - current_count,
            remaining_bytes=self.config.bytes_per_minute,
            reset_time=datetime.utcnow() + timedelta(seconds=60 - (current_time % 60))
        )

    def _hash_source_id(self, source_id: str) -> str:
        """Hash source ID for Redis key"""
        return hashlib.sha256(source_id.encode()).hexdigest()[:16]
