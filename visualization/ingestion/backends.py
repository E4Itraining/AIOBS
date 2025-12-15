"""
AIOBS Backend Connectors
Clients for VictoriaMetrics, OpenObserve, and Redis
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
import asyncio
import json
import os
import httpx
from abc import ABC, abstractmethod


@dataclass
class BackendConfig:
    """Configuration for backend connections"""
    url: str
    username: Optional[str] = None
    password: Optional[str] = None
    timeout_seconds: int = 30
    max_retries: int = 3
    retry_delay_seconds: float = 1.0
    verify_ssl: bool = True


class BaseConnector(ABC):
    """Base abstract class for all connectors"""

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if backend is healthy"""
        pass

    @abstractmethod
    async def close(self):
        """Close the connection"""
        pass


class BackendConnector(BaseConnector):
    """Abstract base class for HTTP-based backend connectors (VictoriaMetrics, OpenObserve)"""

    def __init__(self, config: BackendConfig):
        self.config = config
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None or self._client.is_closed:
            auth = None
            if self.config.username and self.config.password:
                auth = httpx.BasicAuth(self.config.username, self.config.password)

            self._client = httpx.AsyncClient(
                base_url=self.config.url,
                auth=auth,
                timeout=httpx.Timeout(self.config.timeout_seconds),
                verify=self.config.verify_ssl
            )
        return self._client

    async def close(self):
        """Close the HTTP client"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def _request_with_retry(
        self,
        method: str,
        path: str,
        **kwargs
    ) -> httpx.Response:
        """Make HTTP request with retry logic"""
        client = await self._get_client()
        last_error = None

        for attempt in range(self.config.max_retries):
            try:
                response = await client.request(method, path, **kwargs)
                response.raise_for_status()
                return response
            except (httpx.HTTPStatusError, httpx.RequestError) as e:
                last_error = e
                if attempt < self.config.max_retries - 1:
                    await asyncio.sleep(
                        self.config.retry_delay_seconds * (2 ** attempt)
                    )

        raise last_error

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if backend is healthy"""
        pass

    @abstractmethod
    async def write(self, data: Any) -> bool:
        """Write data to backend"""
        pass

    @abstractmethod
    async def query(self, query: str) -> Any:
        """Query data from backend"""
        pass


class CacheConnector(BaseConnector):
    """Abstract base class for cache/pub-sub connectors (Redis, etc.)"""

    @abstractmethod
    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> bool:
        """Set a value in cache"""
        pass

    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        """Get a value from cache"""
        pass

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete a key from cache"""
        pass

    @abstractmethod
    async def publish(self, channel: str, message: Any) -> int:
        """Publish message to channel"""
        pass


class VictoriaMetricsClient(BackendConnector):
    """
    Client for VictoriaMetrics time-series database
    Supports remote write and PromQL queries
    """

    def __init__(self, config: Optional[BackendConfig] = None):
        if config is None:
            config = BackendConfig(
                url=os.environ.get("VICTORIA_METRICS_URL", "http://victoriametrics:8428")
            )
        super().__init__(config)

    async def health_check(self) -> bool:
        """Check VictoriaMetrics health"""
        try:
            response = await self._request_with_retry("GET", "/health")
            return response.status_code == 200
        except Exception:
            return False

    async def write(self, data: Any) -> bool:
        """
        Write metrics to VictoriaMetrics using Prometheus remote write format
        """
        if isinstance(data, list):
            # Convert list of metrics to line protocol
            lines = []
            for metric in data:
                line = self._metric_to_line_protocol(metric)
                if line:
                    lines.append(line)
            data = "\n".join(lines)

        try:
            response = await self._request_with_retry(
                "POST",
                "/api/v1/import/prometheus",
                content=data,
                headers={"Content-Type": "text/plain"}
            )
            return response.status_code in (200, 204)
        except Exception:
            return False

    async def write_metrics(self, metrics: List[Dict]) -> Dict[str, Any]:
        """
        Write multiple metrics to VictoriaMetrics

        Args:
            metrics: List of metric dicts with name, value, labels, timestamp

        Returns:
            Result dict with success status and details
        """
        if not metrics:
            return {"success": True, "written": 0}

        lines = []
        for metric in metrics:
            line = self._metric_to_line_protocol(metric)
            if line:
                lines.append(line)

        if not lines:
            return {"success": True, "written": 0}

        try:
            response = await self._request_with_retry(
                "POST",
                "/api/v1/import/prometheus",
                content="\n".join(lines),
                headers={"Content-Type": "text/plain"}
            )
            return {
                "success": response.status_code in (200, 204),
                "written": len(lines),
                "status_code": response.status_code
            }
        except Exception as e:
            return {
                "success": False,
                "written": 0,
                "error": str(e)
            }

    async def query(self, query: str, time: Optional[datetime] = None) -> Any:
        """
        Query VictoriaMetrics using PromQL

        Args:
            query: PromQL query string
            time: Optional timestamp for instant query

        Returns:
            Query result
        """
        params = {"query": query}
        if time:
            params["time"] = time.timestamp()

        try:
            response = await self._request_with_retry(
                "GET",
                "/api/v1/query",
                params=params
            )
            return response.json()
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def query_range(
        self,
        query: str,
        start: datetime,
        end: datetime,
        step: str = "1m"
    ) -> Any:
        """
        Query VictoriaMetrics range using PromQL

        Args:
            query: PromQL query string
            start: Start time
            end: End time
            step: Query step (e.g., "1m", "5m", "1h")

        Returns:
            Query result
        """
        params = {
            "query": query,
            "start": start.timestamp(),
            "end": end.timestamp(),
            "step": step
        }

        try:
            response = await self._request_with_retry(
                "GET",
                "/api/v1/query_range",
                params=params
            )
            return response.json()
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _metric_to_line_protocol(self, metric: Dict) -> Optional[str]:
        """Convert metric dict to Prometheus line protocol"""
        name = metric.get("name")
        value = metric.get("value")

        if name is None or value is None:
            return None

        # Build labels string
        labels = metric.get("labels", {})
        if labels:
            labels_str = ",".join(f'{k}="{v}"' for k, v in labels.items())
            metric_name = f"{name}{{{labels_str}}}"
        else:
            metric_name = name

        # Get timestamp
        timestamp = metric.get("timestamp")
        if timestamp:
            if isinstance(timestamp, datetime):
                ts_ms = int(timestamp.timestamp() * 1000)
            else:
                ts_ms = int(timestamp)
            return f"{metric_name} {value} {ts_ms}"

        return f"{metric_name} {value}"


class OpenObserveClient(BackendConnector):
    """
    Client for OpenObserve logs and traces storage
    """

    def __init__(self, config: Optional[BackendConfig] = None):
        if config is None:
            config = BackendConfig(
                url=os.environ.get("OPENOBSERVE_URL", "http://openobserve:5080"),
                username=os.environ.get("OPENOBSERVE_USER", "admin@aiobs.local"),
                password=os.environ.get("OPENOBSERVE_PASSWORD", "Complexpass#123")
            )
        super().__init__(config)
        self.org = "default"

    async def health_check(self) -> bool:
        """Check OpenObserve health"""
        try:
            response = await self._request_with_retry("GET", "/healthz")
            return response.status_code == 200
        except Exception:
            return False

    async def write(self, data: Any) -> bool:
        """Write logs to OpenObserve"""
        return await self.write_logs("aiobs-logs", data if isinstance(data, list) else [data])

    async def write_logs(self, stream: str, logs: List[Dict]) -> bool:
        """
        Write logs to OpenObserve

        Args:
            stream: Log stream name
            logs: List of log entries

        Returns:
            Success status
        """
        if not logs:
            return True

        # Format logs for OpenObserve
        formatted_logs = []
        for log in logs:
            entry = {
                "_timestamp": log.get("timestamp", datetime.utcnow()).isoformat() + "Z"
                    if isinstance(log.get("timestamp"), datetime)
                    else log.get("timestamp", datetime.utcnow().isoformat() + "Z"),
                "level": log.get("level", "info"),
                "message": log.get("message", ""),
                "logger": log.get("logger", "aiobs"),
            }

            # Add context fields
            context = log.get("context", {})
            for key, value in context.items():
                entry[key] = value

            # Add exception if present
            if log.get("exception"):
                entry["exception"] = log["exception"]
            if log.get("stack_trace"):
                entry["stack_trace"] = log["stack_trace"]

            formatted_logs.append(entry)

        try:
            response = await self._request_with_retry(
                "POST",
                f"/api/{self.org}/{stream}/_json",
                json=formatted_logs
            )
            return response.status_code in (200, 204)
        except Exception:
            return False

    async def query(self, query: str) -> Any:
        """Query logs from OpenObserve"""
        return await self.search_logs("aiobs-logs", query)

    async def search_logs(
        self,
        stream: str,
        query: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Search logs in OpenObserve

        Args:
            stream: Log stream name
            query: Search query
            start_time: Start of search range
            end_time: End of search range
            limit: Maximum results

        Returns:
            Search results
        """
        if start_time is None:
            start_time = datetime.utcnow() - timedelta(hours=24)
        if end_time is None:
            end_time = datetime.utcnow()

        search_body = {
            "query": {
                "sql": f"SELECT * FROM \"{stream}\" WHERE match_all('{query}') LIMIT {limit}",
                "start_time": int(start_time.timestamp() * 1000000),
                "end_time": int(end_time.timestamp() * 1000000),
            }
        }

        try:
            response = await self._request_with_retry(
                "POST",
                f"/api/{self.org}/_search",
                json=search_body
            )
            return response.json()
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def create_stream(self, stream: str) -> bool:
        """Create a new log stream"""
        try:
            response = await self._request_with_retry(
                "POST",
                f"/api/{self.org}/streams/{stream}",
                json={"stream_type": "logs"}
            )
            return response.status_code in (200, 201)
        except Exception:
            return False


class RedisClient(CacheConnector):
    """
    Async Redis client for caching and pub/sub
    Implements CacheConnector interface for consistent architecture
    """

    def __init__(
        self,
        url: Optional[str] = None,
        max_connections: int = 10
    ):
        self.url = url or os.environ.get("REDIS_URL", "redis://redis:6379")
        self.max_connections = max_connections
        self._pool = None
        self._pubsub = None

    async def _get_pool(self):
        """Get or create Redis connection pool"""
        if self._pool is None:
            import redis.asyncio as redis
            self._pool = redis.ConnectionPool.from_url(
                self.url,
                max_connections=self.max_connections,
                decode_responses=True
            )
        return self._pool

    async def _get_client(self):
        """Get Redis client from pool"""
        import redis.asyncio as redis
        pool = await self._get_pool()
        return redis.Redis(connection_pool=pool)

    async def close(self):
        """Close Redis connections"""
        if self._pool:
            await self._pool.disconnect()
            self._pool = None

    async def health_check(self) -> bool:
        """Check Redis health"""
        try:
            client = await self._get_client()
            await client.ping()
            return True
        except Exception:
            return False

    async def set(
        self,
        key: str,
        value: Any,
        ttl_seconds: Optional[int] = None
    ) -> bool:
        """Set a value in Redis"""
        try:
            client = await self._get_client()
            if isinstance(value, (dict, list)):
                value = json.dumps(value)

            if ttl_seconds:
                await client.setex(key, ttl_seconds, value)
            else:
                await client.set(key, value)
            return True
        except Exception:
            return False

    async def get(self, key: str) -> Optional[Any]:
        """Get a value from Redis"""
        try:
            client = await self._get_client()
            value = await client.get(key)
            if value:
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    return value
            return None
        except Exception:
            return None

    async def delete(self, key: str) -> bool:
        """Delete a key from Redis"""
        try:
            client = await self._get_client()
            await client.delete(key)
            return True
        except Exception:
            return False

    async def publish(self, channel: str, message: Any) -> int:
        """
        Publish message to channel

        Args:
            channel: Channel name
            message: Message to publish

        Returns:
            Number of subscribers that received the message
        """
        try:
            client = await self._get_client()
            if isinstance(message, (dict, list)):
                message = json.dumps(message)
            return await client.publish(channel, message)
        except Exception:
            return 0

    async def subscribe(self, *channels: str):
        """Subscribe to channels"""
        import redis.asyncio as redis
        client = await self._get_client()
        self._pubsub = client.pubsub()
        await self._pubsub.subscribe(*channels)
        return self._pubsub

    async def get_message(self, timeout: float = 1.0) -> Optional[Dict]:
        """Get next message from subscription"""
        if self._pubsub is None:
            return None

        try:
            message = await self._pubsub.get_message(
                ignore_subscribe_messages=True,
                timeout=timeout
            )
            if message and message.get("data"):
                try:
                    message["data"] = json.loads(message["data"])
                except (json.JSONDecodeError, TypeError):
                    pass
            return message
        except Exception:
            return None

    async def incr(self, key: str, amount: int = 1) -> int:
        """Increment a counter"""
        try:
            client = await self._get_client()
            return await client.incrby(key, amount)
        except Exception:
            return 0

    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration on a key"""
        try:
            client = await self._get_client()
            return await client.expire(key, seconds)
        except Exception:
            return False

    async def lpush(self, key: str, *values: Any) -> int:
        """Push values to list"""
        try:
            client = await self._get_client()
            encoded = [json.dumps(v) if isinstance(v, (dict, list)) else str(v) for v in values]
            return await client.lpush(key, *encoded)
        except Exception:
            return 0

    async def lrange(self, key: str, start: int = 0, end: int = -1) -> List[Any]:
        """Get range from list"""
        try:
            client = await self._get_client()
            values = await client.lrange(key, start, end)
            result = []
            for v in values:
                try:
                    result.append(json.loads(v))
                except (json.JSONDecodeError, TypeError):
                    result.append(v)
            return result
        except Exception:
            return []

    async def ltrim(self, key: str, start: int, end: int) -> bool:
        """Trim list to specified range"""
        try:
            client = await self._get_client()
            await client.ltrim(key, start, end)
            return True
        except Exception:
            return False


class BackendManager:
    """
    Manager for all backend connections
    Provides unified interface and health monitoring
    """

    def __init__(self):
        self.victoria_metrics: Optional[VictoriaMetricsClient] = None
        self.openobserve: Optional[OpenObserveClient] = None
        self.redis: Optional[RedisClient] = None
        self._initialized = False

    async def initialize(self):
        """Initialize all backend connections"""
        if self._initialized:
            return

        self.victoria_metrics = VictoriaMetricsClient()
        self.openobserve = OpenObserveClient()
        self.redis = RedisClient()

        self._initialized = True

    async def close(self):
        """Close all backend connections"""
        if self.victoria_metrics:
            await self.victoria_metrics.close()
        if self.openobserve:
            await self.openobserve.close()
        if self.redis:
            await self.redis.close()

        self._initialized = False

    async def health_check_all(self) -> Dict[str, bool]:
        """Check health of all backends"""
        if not self._initialized:
            await self.initialize()

        results = {}

        if self.victoria_metrics:
            results["victoria_metrics"] = await self.victoria_metrics.health_check()
        if self.openobserve:
            results["openobserve"] = await self.openobserve.health_check()
        if self.redis:
            results["redis"] = await self.redis.health_check()

        return results

    async def get_status(self) -> Dict[str, Any]:
        """Get detailed status of all backends"""
        health = await self.health_check_all()

        return {
            "initialized": self._initialized,
            "backends": {
                "victoria_metrics": {
                    "healthy": health.get("victoria_metrics", False),
                    "url": self.victoria_metrics.config.url if self.victoria_metrics else None
                },
                "openobserve": {
                    "healthy": health.get("openobserve", False),
                    "url": self.openobserve.config.url if self.openobserve else None
                },
                "redis": {
                    "healthy": health.get("redis", False),
                    "url": self.redis.url if self.redis else None
                }
            }
        }


# Global backend manager instance
backend_manager = BackendManager()
