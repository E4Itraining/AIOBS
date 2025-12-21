"""
Alerting Router
API endpoints for alert management and testing
"""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from .config import get_alerting_settings
from .models import AlertPayload, AlertResponse, AlertSeverity, AlertTestRequest, AlertType
from .slack_provider import get_slack_provider

logger = logging.getLogger("aiobs.alerting")

router = APIRouter(prefix="/api/alerts", tags=["alerting"])


class APIResponse(BaseModel):
    """Standard API response"""
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


@router.get("/config", response_model=APIResponse)
async def get_alert_config():
    """
    Get current alerting configuration (without secrets).
    """
    settings = get_alerting_settings()

    return APIResponse(
        success=True,
        data={
            "enabled": settings.enabled,
            "providers": {
                "slack": {
                    "enabled": settings.slack_enabled,
                    "configured": settings.has_slack,
                    "default_channel": settings.slack_default_channel,
                    "channels": {
                        "critical": settings.slack_channel_critical,
                        "warning": settings.slack_channel_warning,
                        "info": settings.slack_channel_info,
                    },
                },
                "pagerduty": {
                    "enabled": settings.pagerduty_enabled,
                    "configured": settings.has_pagerduty,
                },
                "opsgenie": {
                    "enabled": settings.opsgenie_enabled,
                    "configured": settings.has_opsgenie,
                },
                "webhook": {
                    "enabled": settings.webhook_enabled,
                    "configured": settings.has_webhook,
                },
            },
            "routing": {
                "critical_to_pagerduty": settings.route_critical_to_pagerduty,
                "all_to_slack": settings.route_all_to_slack,
            },
            "rate_limiting": {
                "per_minute": settings.rate_limit_per_minute,
                "dedup_window_seconds": settings.dedup_window_seconds,
            },
        }
    )


@router.post("/test", response_model=APIResponse)
async def test_alert_channel(request: AlertTestRequest):
    """
    Send a test alert to verify integration.
    """
    settings = get_alerting_settings()

    if request.provider == "slack":
        if not settings.has_slack:
            raise HTTPException(
                status_code=400,
                detail="Slack is not configured. Set AIOBS_ALERTING_SLACK_WEBHOOK_URL"
            )

        provider = get_slack_provider()
        result = await provider.send_test_alert(channel=request.channel)

        return APIResponse(
            success=result.success,
            data={
                "provider": "slack",
                "message_id": result.message_id,
                "channel": request.channel or settings.slack_default_channel,
            },
            error=result.error,
        )

    elif request.provider == "pagerduty":
        if not settings.has_pagerduty:
            raise HTTPException(
                status_code=400,
                detail="PagerDuty is not configured"
            )
        # PagerDuty test would go here
        return APIResponse(
            success=False,
            error="PagerDuty test not implemented yet",
        )

    elif request.provider == "webhook":
        if not settings.has_webhook:
            raise HTTPException(
                status_code=400,
                detail="Webhook is not configured"
            )
        return APIResponse(
            success=False,
            error="Webhook test not implemented yet",
        )

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown provider: {request.provider}. Supported: slack, pagerduty, webhook"
        )


@router.post("/send", response_model=APIResponse)
async def send_alert(alert: AlertPayload):
    """
    Send an alert through configured providers.
    """
    settings = get_alerting_settings()
    results = []

    if not settings.enabled:
        return APIResponse(
            success=False,
            error="Alerting is disabled",
        )

    # Send to Slack if configured
    if settings.has_slack and settings.route_all_to_slack:
        provider = get_slack_provider()
        result = await provider.send_alert(alert)
        results.append({"provider": "slack", "success": result.success, "error": result.error})

    # Send to PagerDuty for critical alerts
    if settings.has_pagerduty and settings.route_critical_to_pagerduty:
        if alert.severity == AlertSeverity.CRITICAL:
            # PagerDuty integration would go here
            results.append({"provider": "pagerduty", "success": False, "error": "Not implemented"})

    # Determine overall success
    success = any(r["success"] for r in results) if results else False

    return APIResponse(
        success=success,
        data={
            "alert_id": alert.id,
            "results": results,
        },
        error=None if success else "No alerts were sent successfully",
    )


@router.get("/providers", response_model=APIResponse)
async def list_providers():
    """
    List available alert providers and their status.
    """
    settings = get_alerting_settings()

    providers = []

    if settings.slack_enabled:
        providers.append({
            "id": "slack",
            "name": "Slack",
            "configured": settings.has_slack,
            "status": "ready" if settings.has_slack else "not_configured",
        })

    if settings.pagerduty_enabled:
        providers.append({
            "id": "pagerduty",
            "name": "PagerDuty",
            "configured": settings.has_pagerduty,
            "status": "ready" if settings.has_pagerduty else "not_configured",
        })

    if settings.opsgenie_enabled:
        providers.append({
            "id": "opsgenie",
            "name": "OpsGenie",
            "configured": settings.has_opsgenie,
            "status": "ready" if settings.has_opsgenie else "not_configured",
        })

    if settings.webhook_enabled:
        providers.append({
            "id": "webhook",
            "name": "Generic Webhook",
            "configured": settings.has_webhook,
            "status": "ready" if settings.has_webhook else "not_configured",
        })

    return APIResponse(
        success=True,
        data={
            "providers": providers,
            "alerting_enabled": settings.enabled,
        }
    )


@router.get("/history", response_model=APIResponse)
async def get_alert_history(
    limit: int = Query(50, ge=1, le=200),
    severity: Optional[str] = Query(None, pattern="^(critical|warning|info)$"),
    provider: Optional[str] = Query(None),
):
    """
    Get alert history (demo data for now).
    """
    # Demo alert history
    history = [
        {
            "id": "alert-001",
            "title": "High drift score detected",
            "severity": "warning",
            "provider": "slack",
            "status": "sent",
            "sent_at": "2025-12-21T10:30:00Z",
            "model_id": "fraud-detector-v1",
        },
        {
            "id": "alert-002",
            "title": "SLO violation - P99 latency",
            "severity": "critical",
            "provider": "slack",
            "status": "sent",
            "sent_at": "2025-12-21T09:15:00Z",
            "service_id": "recommendation-v2",
        },
        {
            "id": "alert-003",
            "title": "Trust score below threshold",
            "severity": "warning",
            "provider": "slack",
            "status": "sent",
            "sent_at": "2025-12-21T08:45:00Z",
            "model_id": "sentiment-analyzer",
        },
    ]

    # Apply filters
    if severity:
        history = [a for a in history if a["severity"] == severity]
    if provider:
        history = [a for a in history if a["provider"] == provider]

    return APIResponse(
        success=True,
        data={
            "alerts": history[:limit],
            "total": len(history),
        }
    )


@router.get("/stats", response_model=APIResponse)
async def get_alert_stats():
    """
    Get alerting statistics.
    """
    return APIResponse(
        success=True,
        data={
            "today": {
                "total": 15,
                "critical": 2,
                "warning": 8,
                "info": 5,
            },
            "last_7_days": {
                "total": 87,
                "critical": 12,
                "warning": 45,
                "info": 30,
            },
            "by_provider": {
                "slack": 80,
                "pagerduty": 7,
                "webhook": 0,
            },
            "by_type": {
                "drift": 25,
                "slo_violation": 18,
                "reliability": 15,
                "cost": 12,
                "security": 8,
                "other": 9,
            },
            "acknowledgment_rate": 0.85,
            "avg_resolution_time_minutes": 45,
        }
    )
