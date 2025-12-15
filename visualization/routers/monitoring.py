"""
AIOBS Monitoring API Router
Real-time monitoring, drift detection, API health, and security metrics
"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Query
import random
import math

from ..models.schemas import APIResponse

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])


# =============================================================================
# API Health Checks
# =============================================================================

@router.get("/api-health")
async def get_api_health() -> APIResponse:
    """
    Get real-time API endpoint health status.
    """
    endpoints = [
        {
            "endpoint": "/api/v1/recommend",
            "method": "GET",
            "status": "healthy",
            "latency_p50_ms": 42 + random.randint(-5, 5),
            "latency_p99_ms": 145 + random.randint(-15, 15),
            "success_rate": 99.98 + random.uniform(-0.1, 0.1),
            "requests_per_min": 3200 + random.randint(-200, 200),
            "last_check": datetime.utcnow().isoformat()
        },
        {
            "endpoint": "/api/v1/predict/fraud",
            "method": "POST",
            "status": "healthy",
            "latency_p50_ms": 85 + random.randint(-10, 10),
            "latency_p99_ms": 220 + random.randint(-20, 20),
            "success_rate": 99.9 + random.uniform(-0.2, 0.1),
            "requests_per_min": 1800 + random.randint(-150, 150),
            "last_check": datetime.utcnow().isoformat()
        },
        {
            "endpoint": "/api/v1/predict/churn",
            "method": "POST",
            "status": "healthy",
            "latency_p50_ms": 35 + random.randint(-5, 5),
            "latency_p99_ms": 98 + random.randint(-10, 10),
            "success_rate": 100.0,
            "requests_per_min": 950 + random.randint(-100, 100),
            "last_check": datetime.utcnow().isoformat()
        },
        {
            "endpoint": "/api/v1/chat/completion",
            "method": "POST",
            "status": "degraded",
            "latency_p50_ms": 1200 + random.randint(-100, 200),
            "latency_p99_ms": 3500 + random.randint(-200, 500),
            "success_rate": 99.5 + random.uniform(-0.3, 0.2),
            "requests_per_min": 120 + random.randint(-20, 20),
            "last_check": datetime.utcnow().isoformat()
        },
        {
            "endpoint": "/api/v1/embeddings",
            "method": "POST",
            "status": "healthy",
            "latency_p50_ms": 65 + random.randint(-8, 8),
            "latency_p99_ms": 180 + random.randint(-15, 15),
            "success_rate": 99.95 + random.uniform(-0.1, 0.05),
            "requests_per_min": 2400 + random.randint(-200, 200),
            "last_check": datetime.utcnow().isoformat()
        }
    ]

    healthy = sum(1 for e in endpoints if e["status"] == "healthy")
    degraded = sum(1 for e in endpoints if e["status"] == "degraded")
    unhealthy = sum(1 for e in endpoints if e["status"] == "unhealthy")

    return APIResponse(
        success=True,
        data={
            "summary": {
                "total": len(endpoints),
                "healthy": healthy,
                "degraded": degraded,
                "unhealthy": unhealthy,
                "overall_status": "healthy" if unhealthy == 0 and degraded <= 1 else "degraded" if unhealthy == 0 else "unhealthy"
            },
            "endpoints": endpoints,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@router.get("/api-health/{endpoint_path:path}")
async def get_endpoint_health(endpoint_path: str) -> APIResponse:
    """
    Get detailed health metrics for a specific endpoint.
    """
    # Generate realistic historical data
    history = []
    now = datetime.utcnow()

    for i in range(60):  # Last 60 minutes
        timestamp = now - timedelta(minutes=60 - i)
        history.append({
            "timestamp": timestamp.isoformat(),
            "latency_p50_ms": 45 + random.randint(-10, 10),
            "latency_p99_ms": 150 + random.randint(-30, 30),
            "success_rate": 99.9 + random.uniform(-0.5, 0.1),
            "requests": 52 + random.randint(-10, 10),
            "errors": random.randint(0, 2) if random.random() > 0.9 else 0
        })

    return APIResponse(
        success=True,
        data={
            "endpoint": f"/{endpoint_path}",
            "current": {
                "status": "healthy",
                "latency_p50_ms": 45,
                "latency_p99_ms": 148,
                "success_rate": 99.95,
                "requests_per_min": 3200
            },
            "history": history,
            "sla": {
                "latency_target_ms": 200,
                "availability_target_pct": 99.9,
                "current_compliance": True
            }
        }
    )


# =============================================================================
# Drift Detection
# =============================================================================

@router.get("/drift")
async def get_drift_metrics(
    model_id: Optional[str] = Query(None, description="Filter by model ID")
) -> APIResponse:
    """
    Get drift detection metrics for all models or a specific model.
    """
    models = [
        {
            "model_id": "recommendation-v2",
            "model_name": "Recommendation Model v2",
            "drift_scores": {
                "data_drift": 0.12 + random.uniform(-0.02, 0.02),
                "concept_drift": 0.08 + random.uniform(-0.01, 0.01),
                "prediction_drift": 0.18 + random.uniform(-0.03, 0.03)
            },
            "overall_drift": 0.12 + random.uniform(-0.02, 0.02),
            "status": "healthy",
            "threshold": 0.3,
            "last_check": datetime.utcnow().isoformat(),
            "feature_drifts": [
                {"feature": "user_engagement_score", "drift": 0.21, "status": "monitor"},
                {"feature": "purchase_frequency", "drift": 0.18, "status": "monitor"},
                {"feature": "session_duration", "drift": 0.14, "status": "ok"},
                {"feature": "click_through_rate", "drift": 0.09, "status": "ok"},
                {"feature": "page_views", "drift": 0.06, "status": "ok"}
            ]
        },
        {
            "model_id": "fraud-detector-v1",
            "model_name": "Fraud Detection v1",
            "drift_scores": {
                "data_drift": 0.28 + random.uniform(-0.03, 0.03),
                "concept_drift": 0.15 + random.uniform(-0.02, 0.02),
                "prediction_drift": 0.22 + random.uniform(-0.03, 0.03)
            },
            "overall_drift": 0.22 + random.uniform(-0.02, 0.02),
            "status": "warning",
            "threshold": 0.3,
            "last_check": datetime.utcnow().isoformat(),
            "feature_drifts": [
                {"feature": "transaction_amount", "drift": 0.32, "status": "alert"},
                {"feature": "transaction_frequency", "drift": 0.25, "status": "monitor"},
                {"feature": "merchant_category", "drift": 0.18, "status": "monitor"},
                {"feature": "time_of_day", "drift": 0.12, "status": "ok"},
                {"feature": "device_type", "drift": 0.08, "status": "ok"}
            ]
        },
        {
            "model_id": "churn-predictor",
            "model_name": "Churn Predictor",
            "drift_scores": {
                "data_drift": 0.08 + random.uniform(-0.01, 0.01),
                "concept_drift": 0.05 + random.uniform(-0.01, 0.01),
                "prediction_drift": 0.10 + random.uniform(-0.02, 0.02)
            },
            "overall_drift": 0.08 + random.uniform(-0.01, 0.01),
            "status": "healthy",
            "threshold": 0.3,
            "last_check": datetime.utcnow().isoformat(),
            "feature_drifts": [
                {"feature": "usage_decline", "drift": 0.11, "status": "ok"},
                {"feature": "support_tickets", "drift": 0.09, "status": "ok"},
                {"feature": "payment_delays", "drift": 0.07, "status": "ok"},
                {"feature": "feature_adoption", "drift": 0.05, "status": "ok"},
                {"feature": "login_frequency", "drift": 0.04, "status": "ok"}
            ]
        }
    ]

    if model_id:
        models = [m for m in models if m["model_id"] == model_id]

    return APIResponse(
        success=True,
        data={
            "models": models,
            "summary": {
                "total_models": len(models),
                "healthy": sum(1 for m in models if m["status"] == "healthy"),
                "warning": sum(1 for m in models if m["status"] == "warning"),
                "critical": sum(1 for m in models if m["status"] == "critical")
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@router.get("/drift/{model_id}/history")
async def get_drift_history(
    model_id: str,
    hours: int = Query(24, ge=1, le=168)
) -> APIResponse:
    """
    Get historical drift data for a model.
    """
    history = []
    now = datetime.utcnow()

    for i in range(hours):
        timestamp = now - timedelta(hours=hours - i)
        # Simulate gradual drift increase
        base_drift = 0.08 + (i / hours) * 0.08
        history.append({
            "timestamp": timestamp.isoformat(),
            "data_drift": base_drift + random.uniform(-0.02, 0.02),
            "concept_drift": base_drift * 0.7 + random.uniform(-0.01, 0.01),
            "prediction_drift": base_drift * 1.2 + random.uniform(-0.02, 0.02)
        })

    return APIResponse(
        success=True,
        data={
            "model_id": model_id,
            "history": history,
            "analysis": {
                "trend": "increasing" if history[-1]["data_drift"] > history[0]["data_drift"] else "stable",
                "avg_drift": sum(h["data_drift"] for h in history) / len(history),
                "max_drift": max(h["data_drift"] for h in history),
                "drift_velocity": (history[-1]["data_drift"] - history[0]["data_drift"]) / hours
            }
        }
    )


# =============================================================================
# Security Metrics (Prompt Injection, etc.)
# =============================================================================

@router.get("/security")
async def get_security_metrics() -> APIResponse:
    """
    Get AI security metrics including prompt injection detection.
    """
    return APIResponse(
        success=True,
        data={
            "security_score": 90 + random.randint(-3, 3),
            "threats_24h": {
                "prompt_injection": {
                    "total": 48 + random.randint(-5, 5),
                    "blocked": 48 + random.randint(-5, 5),
                    "detection_rate": 100.0,
                    "false_positive_rate": 0.02
                },
                "jailbreak_attempts": {
                    "total": 15 + random.randint(-3, 3),
                    "blocked": 15 + random.randint(-3, 3),
                    "detection_rate": 100.0
                },
                "data_extraction": {
                    "total": 8 + random.randint(-2, 2),
                    "blocked": 8 + random.randint(-2, 2),
                    "detection_rate": 100.0
                },
                "other": {
                    "total": 5 + random.randint(-2, 2),
                    "blocked": 4 + random.randint(-1, 1)
                }
            },
            "auth_metrics": {
                "total_attempts": 12450 + random.randint(-500, 500),
                "successful": 12427 + random.randint(-500, 500),
                "failed": 23 + random.randint(-5, 5),
                "suspicious": 5 + random.randint(-2, 2),
                "success_rate": 99.8
            },
            "models_security": [
                {
                    "model_id": "llm-assistant",
                    "status": "secure",
                    "guardrails": True,
                    "input_validation": True,
                    "output_filtering": True,
                    "rate_limiting": "100 req/min",
                    "attacks_blocked_7d": 25
                },
                {
                    "model_id": "recommendation-v2",
                    "status": "secure",
                    "guardrails": True,
                    "input_validation": True,
                    "output_filtering": False,
                    "rate_limiting": "1000 req/min",
                    "attacks_blocked_7d": 3
                },
                {
                    "model_id": "code-generator",
                    "status": "review",
                    "guardrails": "partial",
                    "input_validation": True,
                    "output_filtering": False,
                    "rate_limiting": "50 req/min",
                    "attacks_blocked_7d": 12
                }
            ],
            "recent_threats": [
                {
                    "id": "THR-001",
                    "type": "prompt_injection",
                    "severity": "high",
                    "status": "blocked",
                    "target": "llm-assistant",
                    "pattern": "System prompt override",
                    "timestamp": (datetime.utcnow() - timedelta(minutes=2)).isoformat()
                },
                {
                    "id": "THR-002",
                    "type": "code_injection",
                    "severity": "high",
                    "status": "blocked",
                    "target": "code-generator",
                    "pattern": "SQL injection in input",
                    "timestamp": (datetime.utcnow() - timedelta(minutes=8)).isoformat()
                },
                {
                    "id": "THR-003",
                    "type": "jailbreak",
                    "severity": "medium",
                    "status": "flagged",
                    "target": "llm-assistant",
                    "pattern": "DAN prompt pattern",
                    "timestamp": (datetime.utcnow() - timedelta(minutes=15)).isoformat()
                },
                {
                    "id": "THR-004",
                    "type": "data_extraction",
                    "severity": "high",
                    "status": "blocked",
                    "target": "llm-assistant",
                    "pattern": "PII extraction attempt",
                    "timestamp": (datetime.utcnow() - timedelta(minutes=32)).isoformat()
                }
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@router.get("/security/prompt-injection")
async def get_prompt_injection_stats(
    hours: int = Query(24, ge=1, le=168)
) -> APIResponse:
    """
    Get detailed prompt injection detection statistics.
    """
    # Generate hourly stats
    hourly_stats = []
    now = datetime.utcnow()

    for i in range(hours):
        timestamp = now - timedelta(hours=hours - i)
        attempts = random.randint(0, 5) if random.random() > 0.3 else 0
        hourly_stats.append({
            "timestamp": timestamp.isoformat(),
            "attempts": attempts,
            "blocked": attempts,
            "false_positives": 0 if random.random() > 0.05 else 1
        })

    # Attack patterns
    patterns = [
        {"pattern": "System prompt override", "count": 18, "example": "Ignore all previous instructions..."},
        {"pattern": "Role playing manipulation", "count": 12, "example": "You are now DAN..."},
        {"pattern": "Context injection", "count": 9, "example": "[SYSTEM]: New instructions..."},
        {"pattern": "Encoding bypass", "count": 6, "example": "Base64/Unicode obfuscation"},
        {"pattern": "Indirect injection", "count": 3, "example": "Injection via external content"}
    ]

    return APIResponse(
        success=True,
        data={
            "summary": {
                "total_attempts": sum(h["attempts"] for h in hourly_stats),
                "blocked": sum(h["blocked"] for h in hourly_stats),
                "detection_rate": 100.0,
                "avg_detection_time_ms": 12 + random.randint(-2, 2),
                "false_positive_rate": 0.02
            },
            "hourly_stats": hourly_stats,
            "patterns": patterns,
            "models_targeted": [
                {"model": "llm-assistant", "attempts": 25},
                {"model": "code-generator", "attempts": 12},
                {"model": "chat-support", "attempts": 8}
            ]
        }
    )


# =============================================================================
# Live Metrics Stream
# =============================================================================

@router.get("/live/metrics")
async def get_live_metrics() -> APIResponse:
    """
    Get current live metrics for real-time dashboard.
    """
    # Simulate realistic metrics with some variation
    base_time = datetime.utcnow()

    return APIResponse(
        success=True,
        data={
            "timestamp": base_time.isoformat(),
            "inference": {
                "latency_p50_ms": 42 + random.randint(-5, 5),
                "latency_p99_ms": 145 + random.randint(-20, 20),
                "throughput_rpm": 8250 + random.randint(-500, 500),
                "error_rate_pct": 0.1 + random.uniform(-0.05, 0.1)
            },
            "resources": {
                "cpu_pct": 45 + random.randint(-10, 15),
                "memory_pct": 62 + random.randint(-5, 10),
                "gpu_utilization_pct": 78 + random.randint(-15, 15),
                "gpu_memory_pct": 65 + random.randint(-10, 10)
            },
            "models": {
                "active": 12,
                "healthy": 10,
                "degraded": 2,
                "unhealthy": 0
            },
            "trust_score": 0.82 + random.uniform(-0.02, 0.02),
            "drift_score": 0.12 + random.uniform(-0.02, 0.02),
            "security_score": 90 + random.randint(-2, 2)
        }
    )


@router.get("/live/timeseries")
async def get_live_timeseries(
    metric: str = Query("latency", description="Metric type: latency, throughput, errors, trust"),
    points: int = Query(60, ge=10, le=300)
) -> APIResponse:
    """
    Get time series data for live charts.
    """
    now = datetime.utcnow()
    data = []

    for i in range(points):
        timestamp = now - timedelta(seconds=(points - i) * 10)

        if metric == "latency":
            value = {
                "p50": 42 + random.randint(-8, 8) + math.sin(i / 10) * 5,
                "p99": 145 + random.randint(-20, 20) + math.sin(i / 10) * 15
            }
        elif metric == "throughput":
            value = 8250 + random.randint(-300, 300) + math.sin(i / 15) * 500
        elif metric == "errors":
            value = max(0, random.randint(0, 3) if random.random() > 0.7 else 0)
        elif metric == "trust":
            value = 0.82 + random.uniform(-0.02, 0.02) + math.sin(i / 20) * 0.02
        else:
            value = random.random() * 100

        data.append({
            "timestamp": timestamp.isoformat(),
            "value": value
        })

    return APIResponse(
        success=True,
        data={
            "metric": metric,
            "points": data,
            "resolution_seconds": 10
        }
    )


# =============================================================================
# System Health
# =============================================================================

@router.get("/health/services")
async def get_services_health() -> APIResponse:
    """
    Get health status of all system services.
    """
    services = [
        {
            "service": "API Gateway",
            "status": "healthy",
            "uptime_pct": 99.99,
            "requests_per_min": 12500 + random.randint(-500, 500),
            "latency_p99_ms": 45 + random.randint(-5, 5),
            "error_rate_pct": 0.02 + random.uniform(-0.01, 0.01)
        },
        {
            "service": "Model Router",
            "status": "healthy",
            "uptime_pct": 99.95,
            "requests_per_min": 8200 + random.randint(-400, 400),
            "latency_p99_ms": 12 + random.randint(-2, 2),
            "error_rate_pct": 0.01 + random.uniform(-0.005, 0.01)
        },
        {
            "service": "Inference Cluster",
            "status": "degraded",
            "uptime_pct": 98.5,
            "requests_per_min": 5800 + random.randint(-300, 300),
            "latency_p99_ms": 185 + random.randint(-20, 30),
            "error_rate_pct": 0.8 + random.uniform(-0.2, 0.3)
        },
        {
            "service": "Feature Store",
            "status": "healthy",
            "uptime_pct": 99.99,
            "requests_per_min": 25000 + random.randint(-1000, 1000),
            "latency_p99_ms": 5 + random.randint(-1, 1),
            "error_rate_pct": 0.0
        },
        {
            "service": "Vector DB",
            "status": "healthy",
            "uptime_pct": 99.95,
            "requests_per_min": 4500 + random.randint(-200, 200),
            "latency_p99_ms": 25 + random.randint(-3, 3),
            "error_rate_pct": 0.05 + random.uniform(-0.02, 0.02)
        },
        {
            "service": "Cache Layer",
            "status": "healthy",
            "uptime_pct": 99.99,
            "requests_per_min": 35000 + random.randint(-2000, 2000),
            "latency_p99_ms": 2 + random.randint(0, 1),
            "error_rate_pct": 0.0
        }
    ]

    return APIResponse(
        success=True,
        data={
            "services": services,
            "summary": {
                "total": len(services),
                "healthy": sum(1 for s in services if s["status"] == "healthy"),
                "degraded": sum(1 for s in services if s["status"] == "degraded"),
                "unhealthy": sum(1 for s in services if s["status"] == "unhealthy")
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    )
