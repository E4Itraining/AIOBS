"""
AIOBS Data Ingestion Schemas
Pydantic models for secure data injection with Data Act compliance
"""

import hashlib
import re
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, field_validator, model_validator


class DataCategory(str, Enum):
    """Data categories per Data Act classification"""

    OPERATIONAL = "operational"  # System metrics, logs
    BEHAVIORAL = "behavioral"  # User behavior patterns
    PERFORMANCE = "performance"  # Model performance metrics
    FINANCIAL = "financial"  # Cost, revenue data
    COMPLIANCE = "compliance"  # Audit, governance
    ENVIRONMENTAL = "environmental"  # Carbon, energy
    PERSONAL = "personal"  # PII - requires special handling
    CONFIDENTIAL = "confidential"  # Business secrets


class DataSensitivity(str, Enum):
    """Data sensitivity levels"""

    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"


class RetentionPolicy(str, Enum):
    """Data retention policies"""

    EPHEMERAL = "ephemeral"  # Delete after processing
    SHORT = "short"  # 7 days
    MEDIUM = "medium"  # 30 days
    LONG = "long"  # 90 days
    ARCHIVE = "archive"  # 1 year
    PERMANENT = "permanent"  # Never delete


class IngestionSource(str, Enum):
    """Source types for data ingestion"""

    AI_MODEL = "ai_model"
    PIPELINE = "pipeline"
    INFRASTRUCTURE = "infrastructure"
    APPLICATION = "application"
    EXTERNAL_API = "external_api"
    USER_INPUT = "user_input"
    AUTOMATED_TEST = "automated_test"
    SYNTHETIC = "synthetic"


# =============================================================================
# Base Models
# =============================================================================


class DataActMetadata(BaseModel):
    """
    Data Act compliance metadata
    Required for all data ingestion to ensure EU Data Act compliance
    """

    data_category: DataCategory
    sensitivity: DataSensitivity = DataSensitivity.INTERNAL
    retention_policy: RetentionPolicy = RetentionPolicy.MEDIUM
    consent_verified: bool = False
    data_subject_rights: bool = True  # Can data subject request deletion?
    cross_border_transfer: bool = False
    processing_purpose: str = Field(..., min_length=10, max_length=500)
    legal_basis: str = Field(default="legitimate_interest")
    data_controller: str = Field(default="aiobs-platform")

    @field_validator("processing_purpose")
    @classmethod
    def validate_purpose(cls, v):
        """Ensure processing purpose is meaningful"""
        if len(v.split()) < 3:
            raise ValueError("Processing purpose must be descriptive (at least 3 words)")
        return v


class IngestionMetadata(BaseModel):
    """Common metadata for all ingestion requests"""

    source: IngestionSource
    source_id: str = Field(..., min_length=1, max_length=256)
    correlation_id: Optional[str] = None
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    environment: str = Field(
        default="production", pattern=r"^(production|staging|development|test)$"
    )
    version: str = Field(default="1.0")
    tags: Dict[str, str] = Field(default_factory=dict)

    @field_validator("source_id")
    @classmethod
    def sanitize_source_id(cls, v):
        """Sanitize source_id to prevent injection"""
        # Only allow alphanumeric, dash, underscore, dot
        sanitized = re.sub(r"[^a-zA-Z0-9_\-\.]", "", v)
        if sanitized != v:
            raise ValueError("source_id contains invalid characters")
        return v


# =============================================================================
# Metric Ingestion
# =============================================================================


class MetricValue(BaseModel):
    """Single metric value"""

    name: str = Field(..., min_length=1, max_length=256, pattern=r"^[a-zA-Z_][a-zA-Z0-9_]*$")
    value: float
    unit: Optional[str] = None
    timestamp: Optional[datetime] = None
    labels: Dict[str, str] = Field(default_factory=dict)

    @field_validator("labels")
    @classmethod
    def validate_labels(cls, v):
        """Validate and sanitize labels"""
        sanitized = {}
        for key, value in v.items():
            # Sanitize keys
            clean_key = re.sub(r"[^a-zA-Z0-9_]", "_", key)[:64]
            # Sanitize values
            clean_value = str(value)[:256]
            sanitized[clean_key] = clean_value
        return sanitized


class MetricIngestionRequest(BaseModel):
    """
    Request for ingesting metrics into VictoriaMetrics
    Supports single or batch metric ingestion
    """

    metrics: List[MetricValue] = Field(..., min_length=1, max_length=10000)
    metadata: IngestionMetadata
    compliance: DataActMetadata

    # Security fields
    api_key_hash: Optional[str] = None
    signature: Optional[str] = None

    @model_validator(mode="after")
    def compute_integrity_hash(self):
        """Compute integrity hash for audit trail"""
        content = (
            f"{len(self.metrics)}:{self.metadata.source_id}:{self.metadata.timestamp.isoformat()}"
        )
        self._integrity_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
        return self


# =============================================================================
# Log Ingestion
# =============================================================================


class LogLevel(str, Enum):
    """Log severity levels"""

    TRACE = "trace"
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class LogEntry(BaseModel):
    """Single log entry"""

    level: LogLevel = LogLevel.INFO
    message: str = Field(..., min_length=1, max_length=65536)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    logger: str = Field(default="aiobs")
    context: Dict[str, Any] = Field(default_factory=dict)
    exception: Optional[str] = None
    stack_trace: Optional[str] = None

    @field_validator("message")
    @classmethod
    def sanitize_message(cls, v):
        """Sanitize log message to prevent log injection"""
        # Remove control characters except newline and tab
        sanitized = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", v)
        return sanitized

    @field_validator("context")
    @classmethod
    def sanitize_context(cls, v):
        """Sanitize context to remove sensitive data patterns"""
        sensitive_patterns = [
            r'password["\s:=]+[^,}\s]+',
            r'api[_-]?key["\s:=]+[^,}\s]+',
            r'secret["\s:=]+[^,}\s]+',
            r'token["\s:=]+[^,}\s]+',
            r"bearer\s+[a-zA-Z0-9\-._~+/]+=*",
        ]

        context_str = str(v)
        for pattern in sensitive_patterns:
            context_str = re.sub(pattern, "[REDACTED]", context_str, flags=re.IGNORECASE)

        return v  # Return original but flag if sensitive


class LogIngestionRequest(BaseModel):
    """
    Request for ingesting logs into OpenObserve
    """

    logs: List[LogEntry] = Field(..., min_length=1, max_length=10000)
    stream: str = Field(default="aiobs-logs", pattern=r"^[a-zA-Z0-9_\-]+$")
    metadata: IngestionMetadata
    compliance: DataActMetadata


# =============================================================================
# Event Ingestion
# =============================================================================


class EventType(str, Enum):
    """Event types for real-time processing"""

    ALERT = "alert"
    INCIDENT = "incident"
    DEPLOYMENT = "deployment"
    CONFIG_CHANGE = "config_change"
    MODEL_UPDATE = "model_update"
    DRIFT_DETECTED = "drift_detected"
    ANOMALY = "anomaly"
    SLO_BREACH = "slo_breach"
    COST_SPIKE = "cost_spike"
    SECURITY = "security"
    AUDIT = "audit"
    CUSTOM = "custom"


class EventSeverity(str, Enum):
    """Event severity levels"""

    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Event(BaseModel):
    """Single event"""

    event_type: EventType
    severity: EventSeverity = EventSeverity.INFO
    title: str = Field(..., min_length=1, max_length=256)
    description: str = Field(default="", max_length=4096)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source_service: str = Field(..., min_length=1, max_length=128)
    affected_services: List[str] = Field(default_factory=list)
    payload: Dict[str, Any] = Field(default_factory=dict)
    actions: List[str] = Field(default_factory=list)
    ttl_seconds: int = Field(default=3600, ge=60, le=86400 * 30)


class EventIngestionRequest(BaseModel):
    """
    Request for ingesting events into Redis pub/sub
    Events are broadcast to WebSocket clients in real-time
    """

    events: List[Event] = Field(..., min_length=1, max_length=1000)
    channels: List[str] = Field(default_factory=lambda: ["all"])
    metadata: IngestionMetadata
    compliance: DataActMetadata


# =============================================================================
# Batch Ingestion
# =============================================================================


class BatchIngestionRequest(BaseModel):
    """
    Combined batch ingestion request
    For efficient bulk data loading
    """

    metrics: Optional[List[MetricValue]] = None
    logs: Optional[List[LogEntry]] = None
    events: Optional[List[Event]] = None
    metadata: IngestionMetadata
    compliance: DataActMetadata

    @model_validator(mode="after")
    def validate_not_empty(self):
        """Ensure at least one data type is provided"""
        if not self.metrics and not self.logs and not self.events:
            raise ValueError("At least one of metrics, logs, or events must be provided")
        return self


# =============================================================================
# Response Models
# =============================================================================


class IngestionStatus(str, Enum):
    """Ingestion status"""

    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"
    QUEUED = "queued"
    RATE_LIMITED = "rate_limited"


class IngestionResponse(BaseModel):
    """Response for ingestion requests"""

    status: IngestionStatus
    request_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Counts
    metrics_received: int = 0
    metrics_processed: int = 0
    logs_received: int = 0
    logs_processed: int = 0
    events_received: int = 0
    events_processed: int = 0

    # Errors
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)

    # Rate limiting info
    rate_limit_remaining: Optional[int] = None
    rate_limit_reset: Optional[datetime] = None

    # Compliance
    audit_id: Optional[str] = None
    integrity_hash: Optional[str] = None


# =============================================================================
# Prompt Injection & Security Testing Schemas
# =============================================================================


class TestCategory(str, Enum):
    """Security test categories"""

    PROMPT_INJECTION = "prompt_injection"
    SQL_INJECTION = "sql_injection"
    XSS = "xss"
    COMMAND_INJECTION = "command_injection"
    DATA_EXFILTRATION = "data_exfiltration"
    MODEL_MANIPULATION = "model_manipulation"
    ADVERSARIAL = "adversarial"
    FUZZING = "fuzzing"


class SecurityTestPayload(BaseModel):
    """
    Payload for security testing (prompt injection, etc.)
    Used for authorized security testing only
    """

    test_category: TestCategory
    test_id: str = Field(..., min_length=1, max_length=64)
    payload: str = Field(..., max_length=65536)
    expected_behavior: str = Field(default="reject")
    target_model: Optional[str] = None
    target_endpoint: Optional[str] = None
    authorized_by: str = Field(..., min_length=1)
    authorization_ticket: str = Field(..., min_length=1)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SecurityTestRequest(BaseModel):
    """
    Request for security testing injection
    Requires explicit authorization
    """

    tests: List[SecurityTestPayload] = Field(..., min_length=1, max_length=100)
    dry_run: bool = Field(default=True)
    report_only: bool = Field(default=True)
    metadata: IngestionMetadata
    compliance: DataActMetadata
