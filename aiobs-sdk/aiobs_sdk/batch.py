"""
AIOBS SDK Batch Context
Context manager for batching ingestion requests
"""

from typing import TYPE_CHECKING, List

from .models import Event, IngestBatch, IngestResponse, Log, Metric

if TYPE_CHECKING:
    from .client import AIObsClient


class BatchContext:
    """
    Context manager for batching metrics, logs, and events.

    Automatically sends the batch when exiting the context.

    Example:
        with client.batch() as batch:
            batch.add_metric(Metric(name="latency", value=45.0))
            batch.add_log(Log(level="info", message="Request completed"))
            batch.add_event(Event(event_type="inference", title="Model inference"))
        # Auto-sends on exit
    """

    def __init__(self, client: "AIObsClient"):
        self._client = client
        self._batch = IngestBatch()
        self._response: IngestResponse | None = None

    def add_metric(self, metric: Metric) -> "BatchContext":
        """Add a metric to the batch"""
        self._batch.metrics.append(metric)
        return self

    def add_metrics(self, metrics: List[Metric]) -> "BatchContext":
        """Add multiple metrics to the batch"""
        self._batch.metrics.extend(metrics)
        return self

    def add_log(self, log: Log) -> "BatchContext":
        """Add a log to the batch"""
        self._batch.logs.append(log)
        return self

    def add_logs(self, logs: List[Log]) -> "BatchContext":
        """Add multiple logs to the batch"""
        self._batch.logs.extend(logs)
        return self

    def add_event(self, event: Event) -> "BatchContext":
        """Add an event to the batch"""
        self._batch.events.append(event)
        return self

    def add_events(self, events: List[Event]) -> "BatchContext":
        """Add multiple events to the batch"""
        self._batch.events.extend(events)
        return self

    @property
    def size(self) -> int:
        """Get the current batch size"""
        return self._batch.total_items

    @property
    def response(self) -> IngestResponse | None:
        """Get the response from the last send operation"""
        return self._response

    def send(self) -> IngestResponse:
        """Manually send the batch"""
        if self._batch.is_empty():
            return IngestResponse(
                success=True,
                items_received=0,
                items_processed=0,
            )

        self._response = self._client.ingest_batch(self._batch)

        # Clear the batch after sending
        self._batch = IngestBatch()

        return self._response

    def __enter__(self) -> "BatchContext":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        # Only send if no exception occurred
        if exc_type is None and not self._batch.is_empty():
            self.send()
