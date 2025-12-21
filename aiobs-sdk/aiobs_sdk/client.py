"""
AIOBS SDK Client
Synchronous and asynchronous clients for AIOBS API
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urljoin

import httpx

from .models import Event, IngestBatch, IngestResponse, Log, Metric, Trace
from .exceptions import (
    AIObsError,
    AuthenticationError,
    ConnectionError,
    RateLimitError,
    ServerError,
    ValidationError,
)
from .batch import BatchContext

logger = logging.getLogger("aiobs_sdk")


class BaseClient:
    """Base client with common functionality"""

    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        api_key: Optional[str] = None,
        environment: Optional[str] = None,
        timeout: float = 30.0,
        max_retries: int = 3,
        verify_ssl: bool = True,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.environment = environment
        self.timeout = timeout
        self.max_retries = max_retries
        self.verify_ssl = verify_ssl

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers"""
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "aiobs-sdk-python/0.1.0",
        }

        if self.api_key:
            headers["X-API-Key"] = self.api_key

        if self.environment:
            headers["X-Environment"] = self.environment

        return headers

    def _build_url(self, path: str) -> str:
        """Build full URL from path"""
        return urljoin(self.base_url + "/", path.lstrip("/"))

    def _handle_response_error(self, response: httpx.Response) -> None:
        """Handle error responses"""
        status = response.status_code
        body = response.text

        if status == 401:
            raise AuthenticationError(
                "Authentication failed - check API key",
                status_code=status,
                response_body=body,
            )
        elif status == 429:
            retry_after = response.headers.get("Retry-After")
            raise RateLimitError(
                "Rate limit exceeded",
                retry_after=int(retry_after) if retry_after else None,
                response_body=body,
            )
        elif status == 400:
            raise ValidationError(
                f"Validation error: {body}",
                status_code=status,
                response_body=body,
            )
        elif status >= 500:
            raise ServerError(
                f"Server error: {body}",
                status_code=status,
                response_body=body,
            )
        elif status >= 400:
            raise AIObsError(
                f"Request failed: {body}",
                status_code=status,
                response_body=body,
            )


class AIObsClient(BaseClient):
    """
    Synchronous AIOBS client for metrics, logs, and events ingestion.

    Example:
        client = AIObsClient(
            base_url="https://aiobs.example.com",
            api_key="your-api-key",
        )

        # Send metrics
        client.ingest_metrics([
            Metric(name="latency_ms", value=45.2, labels={"model": "fraud-v1"}),
        ])
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._client: Optional[httpx.Client] = None

    def _get_client(self) -> httpx.Client:
        """Get or create HTTP client"""
        if self._client is None:
            self._client = httpx.Client(
                timeout=self.timeout,
                verify=self.verify_ssl,
                headers=self._get_headers(),
            )
        return self._client

    def close(self) -> None:
        """Close the HTTP client"""
        if self._client:
            self._client.close()
            self._client = None

    def __enter__(self) -> "AIObsClient":
        return self

    def __exit__(self, *args) -> None:
        self.close()

    def health(self) -> Dict[str, Any]:
        """Check AIOBS server health"""
        try:
            client = self._get_client()
            response = client.get(self._build_url("/health"))
            response.raise_for_status()
            return response.json()
        except httpx.ConnectError as e:
            raise ConnectionError("Failed to connect to AIOBS server", original_error=e)

    def ingest_metrics(self, metrics: List[Metric]) -> IngestResponse:
        """
        Ingest metrics to AIOBS.

        Args:
            metrics: List of Metric objects

        Returns:
            IngestResponse with ingestion status
        """
        client = self._get_client()
        url = self._build_url("/api/ingest/metrics")

        payload = {
            "metrics": [m.model_dump(mode="json") for m in metrics],
            "timestamp": datetime.utcnow().isoformat(),
        }

        try:
            response = client.post(url, json=payload)

            if response.status_code >= 400:
                self._handle_response_error(response)

            data = response.json()
            return IngestResponse(
                success=data.get("success", True),
                items_received=len(metrics),
                items_processed=data.get("processed", len(metrics)),
            )

        except httpx.ConnectError as e:
            raise ConnectionError("Failed to connect to AIOBS server", original_error=e)

    def ingest_logs(self, logs: List[Log]) -> IngestResponse:
        """
        Ingest logs to AIOBS.

        Args:
            logs: List of Log objects

        Returns:
            IngestResponse with ingestion status
        """
        client = self._get_client()
        url = self._build_url("/api/ingest/logs")

        payload = {
            "logs": [log.to_dict() for log in logs],
            "timestamp": datetime.utcnow().isoformat(),
        }

        try:
            response = client.post(url, json=payload)

            if response.status_code >= 400:
                self._handle_response_error(response)

            data = response.json()
            return IngestResponse(
                success=data.get("success", True),
                items_received=len(logs),
                items_processed=data.get("processed", len(logs)),
            )

        except httpx.ConnectError as e:
            raise ConnectionError("Failed to connect to AIOBS server", original_error=e)

    def ingest_events(self, events: List[Event]) -> IngestResponse:
        """
        Ingest events to AIOBS.

        Args:
            events: List of Event objects

        Returns:
            IngestResponse with ingestion status
        """
        client = self._get_client()
        url = self._build_url("/api/ingest/events")

        payload = {
            "events": [e.model_dump(mode="json") for e in events],
            "timestamp": datetime.utcnow().isoformat(),
        }

        try:
            response = client.post(url, json=payload)

            if response.status_code >= 400:
                self._handle_response_error(response)

            data = response.json()
            return IngestResponse(
                success=data.get("success", True),
                items_received=len(events),
                items_processed=data.get("processed", len(events)),
            )

        except httpx.ConnectError as e:
            raise ConnectionError("Failed to connect to AIOBS server", original_error=e)

    def ingest_batch(self, batch: IngestBatch) -> IngestResponse:
        """
        Ingest a batch of metrics, logs, and events.

        Args:
            batch: IngestBatch containing metrics, logs, events

        Returns:
            IngestResponse with ingestion status
        """
        client = self._get_client()
        url = self._build_url("/api/ingest/batch")

        payload = {
            "metrics": [m.model_dump(mode="json") for m in batch.metrics],
            "logs": [log.to_dict() for log in batch.logs],
            "events": [e.model_dump(mode="json") for e in batch.events],
            "timestamp": datetime.utcnow().isoformat(),
        }

        try:
            response = client.post(url, json=payload)

            if response.status_code >= 400:
                self._handle_response_error(response)

            data = response.json()
            return IngestResponse(
                success=data.get("success", True),
                items_received=batch.total_items,
                items_processed=data.get("processed", batch.total_items),
            )

        except httpx.ConnectError as e:
            raise ConnectionError("Failed to connect to AIOBS server", original_error=e)

    def batch(self) -> BatchContext:
        """
        Create a batch context for accumulating data.

        Example:
            with client.batch() as batch:
                batch.add_metric(Metric(...))
                batch.add_log(Log(...))
            # Auto-sends on exit
        """
        return BatchContext(self)


class AsyncAIObsClient(BaseClient):
    """
    Asynchronous AIOBS client for metrics, logs, and events ingestion.

    Example:
        async with AsyncAIObsClient(base_url="https://aiobs.example.com") as client:
            await client.ingest_metrics([...])
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client"""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                verify=self.verify_ssl,
                headers=self._get_headers(),
            )
        return self._client

    async def close(self) -> None:
        """Close the HTTP client"""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self) -> "AsyncAIObsClient":
        return self

    async def __aexit__(self, *args) -> None:
        await self.close()

    async def health(self) -> Dict[str, Any]:
        """Check AIOBS server health"""
        try:
            client = await self._get_client()
            response = await client.get(self._build_url("/health"))
            response.raise_for_status()
            return response.json()
        except httpx.ConnectError as e:
            raise ConnectionError("Failed to connect to AIOBS server", original_error=e)

    async def ingest_metrics(self, metrics: List[Metric]) -> IngestResponse:
        """Ingest metrics to AIOBS (async)"""
        client = await self._get_client()
        url = self._build_url("/api/ingest/metrics")

        payload = {
            "metrics": [m.model_dump(mode="json") for m in metrics],
            "timestamp": datetime.utcnow().isoformat(),
        }

        try:
            response = await client.post(url, json=payload)

            if response.status_code >= 400:
                self._handle_response_error(response)

            data = response.json()
            return IngestResponse(
                success=data.get("success", True),
                items_received=len(metrics),
                items_processed=data.get("processed", len(metrics)),
            )

        except httpx.ConnectError as e:
            raise ConnectionError("Failed to connect to AIOBS server", original_error=e)

    async def ingest_logs(self, logs: List[Log]) -> IngestResponse:
        """Ingest logs to AIOBS (async)"""
        client = await self._get_client()
        url = self._build_url("/api/ingest/logs")

        payload = {
            "logs": [log.to_dict() for log in logs],
            "timestamp": datetime.utcnow().isoformat(),
        }

        try:
            response = await client.post(url, json=payload)

            if response.status_code >= 400:
                self._handle_response_error(response)

            data = response.json()
            return IngestResponse(
                success=data.get("success", True),
                items_received=len(logs),
                items_processed=data.get("processed", len(logs)),
            )

        except httpx.ConnectError as e:
            raise ConnectionError("Failed to connect to AIOBS server", original_error=e)

    async def ingest_events(self, events: List[Event]) -> IngestResponse:
        """Ingest events to AIOBS (async)"""
        client = await self._get_client()
        url = self._build_url("/api/ingest/events")

        payload = {
            "events": [e.model_dump(mode="json") for e in events],
            "timestamp": datetime.utcnow().isoformat(),
        }

        try:
            response = await client.post(url, json=payload)

            if response.status_code >= 400:
                self._handle_response_error(response)

            data = response.json()
            return IngestResponse(
                success=data.get("success", True),
                items_received=len(events),
                items_processed=data.get("processed", len(events)),
            )

        except httpx.ConnectError as e:
            raise ConnectionError("Failed to connect to AIOBS server", original_error=e)
