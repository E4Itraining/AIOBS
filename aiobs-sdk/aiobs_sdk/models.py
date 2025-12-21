"""
AIOBS SDK Data Models
Pydantic models for metrics, logs, events, and traces
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, field_validator


class LogLevel(str, Enum):
    """Log severity levels"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class EventSeverity(str, Enum):
    """Event severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class SpanKind(str, Enum):
    """Span kinds for tracing"""
    INTERNAL = "internal"
    SERVER = "server"
    CLIENT = "client"
    PRODUCER = "producer"
    CONSUMER = "consumer"


class Metric(BaseModel):
    """
    A metric data point for AIOBS ingestion.

    Example:
        Metric(
            name="model_latency_ms",
            value=45.2,
            labels={"model": "fraud-v1", "environment": "production"},
        )
    """
    name: str = Field(
        ...,
        min_length=1,
        max_length=256,
        description="Metric name (e.g., 'model_latency_ms')"
    )
    value: float = Field(..., description="Metric value")
    timestamp: Optional[datetime] = Field(
        default=None,
        description="Metric timestamp (defaults to current time)"
    )
    labels: Dict[str, str] = Field(
        default_factory=dict,
        description="Key-value labels for metric dimensions"
    )
    metric_type: str = Field(
        default="gauge",
        pattern="^(gauge|counter|histogram|summary)$",
        description="Metric type"
    )
    unit: Optional[str] = Field(default=None, description="Metric unit (e.g., 'ms', 'bytes')")
    description: Optional[str] = Field(default=None, description="Metric description")

    @field_validator("name")
    @classmethod
    def validate_metric_name(cls, v: str) -> str:
        """Validate metric name format"""
        if not v.replace("_", "").replace(".", "").isalnum():
            raise ValueError("Metric name can only contain alphanumeric characters, underscores, and dots")
        return v

    def to_prometheus_format(self) -> str:
        """Convert to Prometheus text format"""
        labels_str = ""
        if self.labels:
            label_pairs = [f'{k}="{v}"' for k, v in self.labels.items()]
            labels_str = "{" + ",".join(label_pairs) + "}"
        return f"{self.name}{labels_str} {self.value}"


class Log(BaseModel):
    """
    A log entry for AIOBS ingestion.

    Example:
        Log(
            level="info",
            message="Model inference completed",
            context={"model_id": "fraud-v1", "latency_ms": 45},
        )
    """
    level: LogLevel = Field(default=LogLevel.INFO, description="Log level")
    message: str = Field(..., min_length=1, max_length=10000, description="Log message")
    timestamp: Optional[datetime] = Field(
        default=None,
        description="Log timestamp (defaults to current time)"
    )
    context: Dict[str, Any] = Field(
        default_factory=dict,
        description="Structured context data"
    )
    logger_name: Optional[str] = Field(default=None, description="Logger name")
    trace_id: Optional[str] = Field(default=None, description="Associated trace ID")
    span_id: Optional[str] = Field(default=None, description="Associated span ID")
    service: Optional[str] = Field(default=None, description="Service name")
    environment: Optional[str] = Field(default=None, description="Environment")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "level": self.level.value,
            "message": self.message,
            "timestamp": (self.timestamp or datetime.utcnow()).isoformat(),
            "context": self.context,
            "logger_name": self.logger_name,
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "service": self.service,
            "environment": self.environment,
        }


class Event(BaseModel):
    """
    An event for AIOBS ingestion.

    Example:
        Event(
            event_type="drift_detected",
            severity="warning",
            title="Data drift detected in fraud model",
            description="Input feature distribution shifted by 25%",
        )
    """
    event_type: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Event type identifier"
    )
    title: str = Field(..., min_length=1, max_length=500, description="Event title")
    severity: EventSeverity = Field(default=EventSeverity.INFO, description="Event severity")
    description: Optional[str] = Field(default=None, max_length=5000, description="Event description")
    timestamp: Optional[datetime] = Field(
        default=None,
        description="Event timestamp (defaults to current time)"
    )
    source: Optional[str] = Field(default=None, description="Event source")
    model_id: Optional[str] = Field(default=None, description="Associated model ID")
    service_id: Optional[str] = Field(default=None, description="Associated service ID")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    tags: List[str] = Field(default_factory=list, description="Event tags")


class Span(BaseModel):
    """
    A trace span for distributed tracing.

    Example:
        Span(
            trace_id="abc123",
            span_id="def456",
            name="model.inference",
            start_time=datetime.utcnow(),
            duration_ms=45,
        )
    """
    trace_id: str = Field(..., description="Trace ID")
    span_id: str = Field(..., description="Span ID")
    parent_span_id: Optional[str] = Field(default=None, description="Parent span ID")
    name: str = Field(..., description="Span name/operation")
    kind: SpanKind = Field(default=SpanKind.INTERNAL, description="Span kind")
    start_time: datetime = Field(..., description="Span start time")
    end_time: Optional[datetime] = Field(default=None, description="Span end time")
    duration_ms: Optional[float] = Field(default=None, description="Duration in milliseconds")
    status: str = Field(default="ok", description="Span status (ok, error)")
    attributes: Dict[str, Any] = Field(default_factory=dict, description="Span attributes")
    events: List[Dict[str, Any]] = Field(default_factory=list, description="Span events")


class Trace(BaseModel):
    """
    A complete trace with multiple spans.
    """
    trace_id: str = Field(..., description="Trace ID")
    spans: List[Span] = Field(default_factory=list, description="Trace spans")
    service: Optional[str] = Field(default=None, description="Root service name")
    start_time: Optional[datetime] = Field(default=None, description="Trace start time")
    duration_ms: Optional[float] = Field(default=None, description="Total duration")


class IngestBatch(BaseModel):
    """Batch of data for ingestion"""
    metrics: List[Metric] = Field(default_factory=list)
    logs: List[Log] = Field(default_factory=list)
    events: List[Event] = Field(default_factory=list)
    traces: List[Trace] = Field(default_factory=list)

    @property
    def total_items(self) -> int:
        return len(self.metrics) + len(self.logs) + len(self.events) + len(self.traces)

    def is_empty(self) -> bool:
        return self.total_items == 0


class IngestResponse(BaseModel):
    """Response from ingestion API"""
    success: bool
    items_received: int
    items_processed: int
    items_failed: int = 0
    errors: List[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
