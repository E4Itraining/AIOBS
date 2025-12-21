"""
Alerting Models
Alert payload and response models
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AlertSeverity(str, Enum):
    """Alert severity levels"""
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


class AlertType(str, Enum):
    """Alert types"""
    DRIFT = "drift"
    RELIABILITY = "reliability"
    HALLUCINATION = "hallucination"
    LATENCY = "latency"
    ERROR_RATE = "error_rate"
    COST = "cost"
    SLO_VIOLATION = "slo_violation"
    SECURITY = "security"
    COMPLIANCE = "compliance"
    CUSTOM = "custom"


class AlertStatus(str, Enum):
    """Alert status"""
    FIRING = "firing"
    RESOLVED = "resolved"
    ACKNOWLEDGED = "acknowledged"
    SILENCED = "silenced"


class AlertPayload(BaseModel):
    """Alert payload for all providers"""
    id: str = Field(description="Unique alert ID")
    title: str = Field(description="Alert title")
    description: str = Field(description="Alert description")
    severity: AlertSeverity = Field(default=AlertSeverity.WARNING)
    alert_type: AlertType = Field(default=AlertType.CUSTOM)
    status: AlertStatus = Field(default=AlertStatus.FIRING)

    # Source information
    model_id: Optional[str] = None
    service_id: Optional[str] = None
    source: str = Field(default="aiobs")

    # Metrics
    metric_name: Optional[str] = None
    metric_value: Optional[float] = None
    threshold: Optional[float] = None

    # Timestamps
    triggered_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None

    # Additional context
    labels: Dict[str, str] = Field(default_factory=dict)
    annotations: Dict[str, str] = Field(default_factory=dict)

    # Links
    dashboard_url: Optional[str] = None
    runbook_url: Optional[str] = None

    class Config:
        use_enum_values = True


class AlertResponse(BaseModel):
    """Response from alert provider"""
    success: bool
    provider: str
    message_id: Optional[str] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AlertConfig(BaseModel):
    """Alert configuration for updates"""
    slack_enabled: Optional[bool] = None
    slack_webhook_url: Optional[str] = None
    slack_default_channel: Optional[str] = None
    pagerduty_enabled: Optional[bool] = None
    pagerduty_routing_key: Optional[str] = None
    rate_limit_per_minute: Optional[int] = None


class AlertTestRequest(BaseModel):
    """Request to test alert channel"""
    provider: str = Field(description="Provider to test: slack, pagerduty, webhook")
    channel: Optional[str] = Field(default=None, description="Optional channel override")
    severity: AlertSeverity = Field(default=AlertSeverity.INFO)


class SlackBlock(BaseModel):
    """Slack Block Kit block"""
    type: str
    text: Optional[Dict[str, Any]] = None
    fields: Optional[List[Dict[str, Any]]] = None
    elements: Optional[List[Dict[str, Any]]] = None
    accessory: Optional[Dict[str, Any]] = None


class SlackMessage(BaseModel):
    """Slack message with Block Kit"""
    channel: str
    text: str  # Fallback text
    blocks: List[Dict[str, Any]] = Field(default_factory=list)
    attachments: List[Dict[str, Any]] = Field(default_factory=list)
    thread_ts: Optional[str] = None
    unfurl_links: bool = False
    unfurl_media: bool = True
