"""
AIOBS Guardrails API Router
Endpoints for GenAI safety mesh: prompt injection detection,
jailbreak prevention, data leak prevention, and security posture.
"""

import random
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Query

from ..models.schemas import APIResponse

router = APIRouter(prefix="/api/guardrails", tags=["guardrails"])


# =============================================================================
# Simulated Data (production: backed by AIOBS guardrails engine)
# =============================================================================


def _generate_security_posture():
    """Generate simulated AI security posture data."""
    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "overallScore": 87,
        "riskLevel": "moderate",
        "threatsBlocked24h": 156,
        "injectionAttempts24h": 42,
        "jailbreakAttempts24h": 8,
        "dlpViolations24h": 23,
        "categories": {
            "promptInjection": {
                "score": 92,
                "blocked": 42,
                "detected": 45,
                "status": "protected",
            },
            "jailbreak": {
                "score": 88,
                "blocked": 8,
                "detected": 9,
                "status": "protected",
            },
            "dataLeakPrevention": {
                "score": 85,
                "blocked": 23,
                "detected": 28,
                "status": "monitoring",
            },
            "contentSafety": {
                "score": 94,
                "flagged": 12,
                "reviewed": 10,
                "status": "protected",
            },
            "biasDetection": {
                "score": 78,
                "detected": 5,
                "mitigated": 3,
                "status": "attention",
            },
        },
        "recentIncidents": [
            {
                "id": str(uuid.uuid4()),
                "type": "prompt_injection",
                "severity": "high",
                "timestamp": (datetime.utcnow() - timedelta(minutes=15)).isoformat() + "Z",
                "modelId": "ThreatDetector-v3",
                "blocked": True,
                "description": "Multi-step prompt injection attempt detected and blocked",
            },
            {
                "id": str(uuid.uuid4()),
                "type": "dlp_violation",
                "severity": "medium",
                "timestamp": (datetime.utcnow() - timedelta(hours=1)).isoformat() + "Z",
                "modelId": "SupportBot-v2",
                "blocked": True,
                "description": "PII data exfiltration attempt in model output",
            },
        ],
        "policyCompliance": {
            "totalPolicies": 24,
            "compliant": 21,
            "nonCompliant": 2,
            "underReview": 1,
            "complianceRate": 87.5,
        },
    }


# =============================================================================
# API Endpoints
# =============================================================================


@router.get("/security-posture")
async def get_security_posture() -> APIResponse:
    """Get AI security posture overview."""
    return APIResponse(success=True, data=_generate_security_posture())


@router.get("/metrics")
async def get_guardrails_metrics() -> APIResponse:
    """Get guardrails metrics summary."""
    return APIResponse(
        success=True,
        data={
            "totalAnalyzed": 15420,
            "threatsBlocked": 312,
            "falsePositiveRate": 2.1,
            "avgResponseTimeMs": 45,
            "uptime": 99.97,
        },
    )


@router.get("/incidents")
async def get_incidents(
    limit: int = Query(20, ge=1, le=100),
) -> APIResponse:
    """Get recent security incidents."""
    incidents = []
    types = ["prompt_injection", "jailbreak", "dlp_violation", "content_safety", "bias"]
    severities = ["critical", "high", "medium", "low"]
    for i in range(min(limit, 20)):
        incidents.append(
            {
                "id": str(uuid.uuid4()),
                "type": types[i % len(types)],
                "severity": severities[i % len(severities)],
                "timestamp": (datetime.utcnow() - timedelta(minutes=i * 30)).isoformat() + "Z",
                "modelId": f"Model-{(i % 3) + 1}",
                "blocked": random.random() > 0.1,
                "description": f"Security incident #{i + 1}",
            }
        )
    return APIResponse(success=True, data=incidents)
