"""
AIOBS Pillars API Router
Endpoints for the 5 Pillars + Simulator control endpoints.
All data comes from the stateful PillarSimulator engine.
"""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Query

from ..models.schemas import APIResponse
from ..services.pillar_simulator import get_simulator

router = APIRouter(prefix="/api/pillars", tags=["pillars"])


# ============================================================================
# Global Pillar Scores
# ============================================================================


@router.get("/scores")
async def get_pillar_scores() -> APIResponse:
    """Get scores for all 5 pillars."""
    return APIResponse(success=True, data=get_simulator().get_scores())


# ============================================================================
# 1. RELIABILITY Pillar
# ============================================================================


@router.get("/reliability")
async def get_reliability_data(hours: int = Query(24, ge=1, le=720)) -> APIResponse:
    return APIResponse(success=True, data=get_simulator().get_reliability(hours))


@router.get("/reliability/drift")
async def get_reliability_drift(
    model_id: Optional[str] = None, hours: int = Query(24, ge=1, le=720)
) -> APIResponse:
    return APIResponse(success=True, data=get_simulator().get_reliability_drift(hours))


@router.get("/reliability/metrics")
async def get_reliability_metrics(
    model_id: Optional[str] = None, hours: int = Query(24, ge=1, le=720)
) -> APIResponse:
    return APIResponse(success=True, data=get_simulator().get_reliability_metrics())


# ============================================================================
# 2. SECURITY Pillar
# ============================================================================


@router.get("/security")
async def get_security_data(hours: int = Query(24, ge=1, le=720)) -> APIResponse:
    return APIResponse(success=True, data=get_simulator().get_security())


@router.get("/security/threats")
async def get_security_threats(hours: int = Query(168, ge=1, le=720)) -> APIResponse:
    return APIResponse(success=True, data=get_simulator().get_security_threats())


@router.get("/security/incidents")
async def get_security_incidents(hours: int = Query(168, ge=1, le=720)) -> APIResponse:
    return APIResponse(success=True, data=get_simulator().get_security_incidents())


# ============================================================================
# 3. COMPLIANCE Pillar
# ============================================================================


@router.get("/compliance")
async def get_compliance_data() -> APIResponse:
    return APIResponse(success=True, data=get_simulator().get_compliance())


@router.get("/compliance/audit")
async def get_compliance_audit(days: int = Query(30, ge=1, le=365)) -> APIResponse:
    return APIResponse(success=True, data=get_simulator().get_compliance_audit())


@router.get("/compliance/aiact")
async def get_compliance_aiact() -> APIResponse:
    return APIResponse(success=True, data=get_simulator().get_compliance_aiact())


# ============================================================================
# 4. EXPLAINABILITY Pillar
# ============================================================================


@router.get("/explainability")
async def get_explainability_data() -> APIResponse:
    return APIResponse(success=True, data=get_simulator().get_explainability())


@router.get("/explainability/features")
async def get_explainability_features(model_id: Optional[str] = None) -> APIResponse:
    return APIResponse(success=True, data=get_simulator().get_explainability_features())


@router.get("/explainability/confidence")
async def get_explainability_confidence(
    model_id: Optional[str] = None, hours: int = Query(24, ge=1, le=720)
) -> APIResponse:
    return APIResponse(success=True, data=get_simulator().get_explainability_confidence(hours))


# ============================================================================
# 5. PERFORMANCE Pillar
# ============================================================================


@router.get("/performance")
async def get_performance_data(hours: int = Query(24, ge=1, le=720)) -> APIResponse:
    return APIResponse(success=True, data=get_simulator().get_performance())


@router.get("/performance/latency")
async def get_performance_latency(hours: int = Query(24, ge=1, le=720)) -> APIResponse:
    return APIResponse(success=True, data=get_simulator().get_performance_latency(hours))


@router.get("/performance/cost")
async def get_performance_cost(days: int = Query(30, ge=1, le=365)) -> APIResponse:
    return APIResponse(success=True, data=get_simulator().get_performance_cost(days))


# ============================================================================
# 6. INGESTION & COLLECTION
# ============================================================================


@router.get("/ingestion")
async def get_ingestion_data(hours: int = Query(24, ge=1, le=720)) -> APIResponse:
    return APIResponse(success=True, data=get_simulator().get_ingestion(hours))


# ============================================================================
# 7. SEMANTIC DRIFT (Differentiating Feature)
# ============================================================================


@router.get("/semantic-drift")
async def get_semantic_drift_data(hours: int = Query(24, ge=1, le=720)) -> APIResponse:
    return APIResponse(success=True, data=get_simulator().get_semantic_drift(hours))


# ============================================================================
# 7. HOMOLOGATION (Defense Certification)
# ============================================================================


@router.get("/homologation")
async def get_homologation_data() -> APIResponse:
    return APIResponse(success=True, data=get_simulator().get_homologation())


# ============================================================================
# SIMULATOR CONTROL ENDPOINTS
# ============================================================================


@router.get("/simulator/status")
async def get_simulator_status() -> APIResponse:
    """Get current simulator status."""
    return APIResponse(success=True, data=get_simulator().get_status())


@router.post("/simulator/reset")
async def reset_simulator() -> APIResponse:
    """Reset simulator to baseline values."""
    return APIResponse(success=True, data=get_simulator().reset())


@router.post("/simulator/attack")
async def inject_attack(
    attack_type: str = Body("injection"),
    severity: str = Body("high"),
    count: int = Body(1),
    model: str = Body("CyberSentinel-v1"),
) -> APIResponse:
    """Inject a security attack into the simulation."""
    result = get_simulator().inject_attack(attack_type, severity, count, model)
    return APIResponse(success=True, data=result)


@router.post("/simulator/drift")
async def inject_drift(
    drift_type: str = Body("concept"),
    intensity: float = Body(0.5),
) -> APIResponse:
    """Inject drift into reliability metrics."""
    result = get_simulator().inject_drift(drift_type, intensity)
    return APIResponse(success=True, data=result)


@router.post("/simulator/latency-spike")
async def inject_latency_spike(
    multiplier: float = Body(3.0),
) -> APIResponse:
    """Inject a latency spike into performance metrics."""
    result = get_simulator().inject_latency_spike(multiplier)
    return APIResponse(success=True, data=result)


@router.post("/simulator/data")
async def inject_data(
    pillar: str = Body(...),
    metrics: Dict[str, Any] = Body(...),
) -> APIResponse:
    """Push arbitrary metric updates to a pillar."""
    result = get_simulator().inject_data(pillar, metrics)
    return APIResponse(success=True, data=result)
