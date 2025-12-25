"""
Cognitive Metrics Router - Production API
Real statistical analysis for AI observability
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ..core.cognitive import CognitiveEngine

logger = logging.getLogger("aiobs.cognitive")

router = APIRouter(prefix="/api/cognitive", tags=["cognitive"])

# Global engine instance
_engine: Optional[CognitiveEngine] = None


def get_engine() -> CognitiveEngine:
    """Get or create the cognitive engine instance"""
    global _engine
    if _engine is None:
        _engine = CognitiveEngine()
    return _engine


# =============================================================================
# Request/Response Models
# =============================================================================


class IngestionRequest(BaseModel):
    """Request to ingest model predictions"""
    model_id: str
    predictions: List[float]
    labels: Optional[List[float]] = None
    confidences: Optional[List[float]] = None
    features: Optional[Dict[str, List[float]]] = None


class BaselineRequest(BaseModel):
    """Request to set model baseline"""
    model_id: str
    features: Dict[str, List[float]]


class HallucinationAnalysisRequest(BaseModel):
    """Request for hallucination analysis"""
    model_id: str
    outputs: List[str]
    sources: Optional[List[str]] = None


class APIResponse(BaseModel):
    """Standard API response wrapper"""
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Demo models for backward compatibility
DEMO_MODELS = [
    {"id": "fraud-detector-v1", "name": "Fraud Detection Model v1", "type": "classification"},
    {"id": "recommendation-v2", "name": "Recommendation Engine v2", "type": "ranking"},
    {"id": "sentiment-analyzer", "name": "Sentiment Analyzer", "type": "nlp"},
    {"id": "chatbot-assistant", "name": "ChatBot Assistant", "type": "genai"},
    {"id": "image-classifier", "name": "Image Classifier", "type": "vision"},
    {"id": "forecasting-model", "name": "Demand Forecasting", "type": "timeseries"},
]


# =============================================================================
# Core API Endpoints
# =============================================================================


@router.get("/health", response_model=APIResponse)
async def get_cognitive_health():
    """
    Get health status of cognitive engine components.
    """
    engine = get_engine()

    return APIResponse(
        success=True,
        data={
            "status": "healthy",
            "engine": "production",
            "algorithms": {
                "drift_detection": ["kolmogorov_smirnov", "psi", "jensen_shannon", "wasserstein"],
                "reliability": ["ece", "mce", "brier_score", "stability"],
                "hallucination": ["grounding", "consistency", "factuality"],
            },
            "components": {
                "drift_detector": {"status": "healthy", "type": "statistical"},
                "reliability_analyzer": {"status": "healthy", "type": "calibration"},
                "hallucination_detector": {"status": "healthy", "type": "grounding"},
                "degradation_tracker": {"status": "healthy", "type": "trend"},
            },
            "models_monitored": len(DEMO_MODELS),
        }
    )


@router.get("/trust-score", response_model=APIResponse)
async def get_trust_score(
    model_id: Optional[str] = Query(None, description="Specific model ID"),
):
    """
    Get composite trust score with full breakdown.

    The Trust Score is computed as:
    Trust = 0.25*(1-drift) + 0.30*reliability + 0.25*(1-hallucination_risk) + 0.20*(1-degradation)
    """
    engine = get_engine()

    target_model = model_id or "fraud-detector-v1"
    trust = engine.compute_trust_score(target_model)

    return APIResponse(
        success=True,
        data={
            "model_id": target_model,
            **trust.to_dict(),
            "formula": "Trust = 0.25*(1-drift) + 0.30*reliability + 0.25*(1-hallucination_risk) + 0.20*(1-degradation)",
        }
    )


@router.get("/models", response_model=APIResponse)
async def list_monitored_models():
    """
    List all models with cognitive monitoring and their trust scores.
    """
    engine = get_engine()

    models_with_metrics = []
    for model in DEMO_MODELS:
        snapshot = engine.get_model_snapshot(model["id"])

        models_with_metrics.append({
            "id": model["id"],
            "name": model["name"],
            "type": model["type"],
            "trust_score": snapshot["trust_score"]["overall"],
            "trust_trend": snapshot["trust_score"]["trend"],
            "confidence": snapshot["trust_score"]["confidence"],
            "drift_status": "warning" if any(
                d["is_significant"] for d in snapshot["drift"].values()
            ) else "healthy",
            "reliability_status": snapshot["reliability"]["status"],
            "last_updated": snapshot["computed_at"],
        })

    return APIResponse(
        success=True,
        data={
            "models": models_with_metrics,
            "total": len(models_with_metrics),
        }
    )


@router.get("/models/{model_id}", response_model=APIResponse)
async def get_model_cognitive_metrics(model_id: str):
    """
    Get complete cognitive metrics for a specific model.

    Returns:
    - Trust Score with breakdown
    - Drift analysis (data, prediction, concept)
    - Reliability metrics (ECE, MCE, Brier, stability)
    - Hallucination indicators
    - Degradation signals
    """
    engine = get_engine()

    # Find model info
    model = next((m for m in DEMO_MODELS if m["id"] == model_id), None)
    if not model:
        model = {"id": model_id, "name": model_id, "type": "unknown"}

    snapshot = engine.get_model_snapshot(model_id)

    return APIResponse(
        success=True,
        data={
            "model_name": model["name"],
            "model_type": model["type"],
            **snapshot,
        }
    )


# =============================================================================
# Drift Analysis Endpoints
# =============================================================================


@router.get("/drift/{model_id}", response_model=APIResponse)
async def get_drift_metrics(model_id: str):
    """
    Get detailed drift detection metrics for a model.

    Algorithms used:
    - Kolmogorov-Smirnov test: Compares distribution CDFs
    - Population Stability Index (PSI): Monitors distribution shifts
    - Jensen-Shannon Divergence: Symmetric distribution comparison
    - Wasserstein Distance: Earth mover's distance
    """
    engine = get_engine()

    model = next((m for m in DEMO_MODELS if m["id"] == model_id), None)
    model_name = model["name"] if model else model_id

    drift_results = engine.analyze_drift(model_id)

    # Format response
    drift_data = {}
    for drift_type, result in drift_results.items():
        drift_data[drift_type] = {
            "score": round(result.score, 3),
            "is_significant": result.is_significant,
            "severity": result.severity.value,
            "p_value": round(result.p_value, 4) if result.p_value else None,
            "affected_features": result.affected_features,
            "statistical_details": {k: round(v, 4) for k, v in result.details.items()},
        }

    # Compute overall status
    overall_score = sum(r.score for r in drift_results.values()) / len(drift_results)
    status = "healthy" if overall_score < 0.15 else ("warning" if overall_score < 0.3 else "critical")

    return APIResponse(
        success=True,
        data={
            "model_id": model_id,
            "model_name": model_name,
            "overall_drift_score": round(overall_score, 3),
            "status": status,
            "drift_by_type": drift_data,
            "algorithms": ["kolmogorov_smirnov", "psi", "jensen_shannon", "wasserstein"],
        }
    )


# =============================================================================
# Reliability Analysis Endpoints
# =============================================================================


@router.get("/reliability/{model_id}", response_model=APIResponse)
async def get_reliability_metrics(model_id: str):
    """
    Get reliability analysis metrics for a model.

    Metrics computed:
    - Expected Calibration Error (ECE): Average calibration gap
    - Maximum Calibration Error (MCE): Worst calibration gap
    - Brier Score: Probability estimation accuracy
    - Stability: Prediction consistency across runs
    - Uncertainty Quality: Correlation between uncertainty and errors
    """
    engine = get_engine()

    model = next((m for m in DEMO_MODELS if m["id"] == model_id), None)
    model_name = model["name"] if model else model_id

    reliability = engine.analyze_reliability(model_id)

    return APIResponse(
        success=True,
        data={
            "model_id": model_id,
            "model_name": model_name,
            "overall_score": round(reliability.overall_score, 3),
            "status": reliability.status,
            "calibration": {
                "expected_calibration_error": round(reliability.calibration.expected_calibration_error, 4),
                "maximum_calibration_error": round(reliability.calibration.maximum_calibration_error, 4),
                "brier_score": round(reliability.calibration.brier_score, 4),
                "is_well_calibrated": reliability.calibration.is_well_calibrated,
                "reliability_diagram": reliability.calibration.reliability_diagram,
            },
            "stability": {
                "variation_coefficient": round(reliability.stability.variation_coefficient, 4),
                "max_deviation": round(reliability.stability.max_deviation, 4),
                "is_stable": reliability.stability.is_stable,
            },
            "uncertainty_quality": {
                "error_correlation": round(reliability.uncertainty_correlation, 3),
                "interpretation": "good" if reliability.uncertainty_correlation > 0.5 else "poor",
            },
        }
    )


# =============================================================================
# Hallucination Analysis Endpoints
# =============================================================================


@router.get("/hallucination/{model_id}", response_model=APIResponse)
async def get_hallucination_metrics(model_id: str):
    """
    Get hallucination risk metrics for a GenAI model.

    Metrics computed:
    - Grounding Score: How well outputs are grounded in sources
    - Consistency Score: Self-consistency across multiple responses
    - Factuality Score: Alignment with source facts
    """
    engine = get_engine()

    model = next((m for m in DEMO_MODELS if m["id"] == model_id), None)
    if model and model["type"] != "genai":
        return APIResponse(
            success=True,
            data={
                "model_id": model_id,
                "model_name": model["name"] if model else model_id,
                "applicable": False,
                "message": "Hallucination detection is most relevant for GenAI models",
            }
        )

    hallucination = engine.analyze_hallucination(model_id)

    return APIResponse(
        success=True,
        data={
            "model_id": model_id,
            "model_name": model["name"] if model else model_id,
            "applicable": True,
            "overall_score": round(hallucination.overall_score, 3),
            "risk_level": hallucination.risk_level,
            "scores": {
                "grounding": round(hallucination.grounding_score, 3),
                "consistency": round(hallucination.consistency_score, 3),
                "factuality": round(hallucination.factuality_score, 3),
                "confidence_alignment": round(hallucination.confidence_alignment, 3),
            },
            "flagged_outputs": hallucination.flagged_outputs[:10],
        }
    )


@router.post("/hallucination/analyze", response_model=APIResponse)
async def analyze_hallucination(request: HallucinationAnalysisRequest):
    """
    Analyze specific outputs for hallucination risk.

    Provide outputs and optional source documents for grounding analysis.
    """
    engine = get_engine()

    result = engine.analyze_hallucination(
        model_id=request.model_id,
        outputs=request.outputs,
        sources=request.sources,
    )

    return APIResponse(
        success=True,
        data={
            "model_id": request.model_id,
            "analyzed_outputs": len(request.outputs),
            "sources_provided": len(request.sources) if request.sources else 0,
            "overall_score": round(result.overall_score, 3),
            "risk_level": result.risk_level,
            "scores": {
                "grounding": round(result.grounding_score, 3),
                "consistency": round(result.consistency_score, 3),
                "factuality": round(result.factuality_score, 3),
            },
            "flagged_outputs": result.flagged_outputs,
        }
    )


# =============================================================================
# Degradation Analysis Endpoints
# =============================================================================


@router.get("/degradation/{model_id}", response_model=APIResponse)
async def get_degradation_metrics(model_id: str):
    """
    Get performance degradation tracking for a model.
    """
    engine = get_engine()

    model = next((m for m in DEMO_MODELS if m["id"] == model_id), None)
    model_name = model["name"] if model else model_id

    degradation = engine.analyze_degradation(model_id)

    signals = [
        {
            "metric": s.metric_name,
            "current_value": round(s.current_value, 3),
            "baseline_value": round(s.baseline_value, 3),
            "change_percent": round(s.change_pct, 1),
            "trend": s.trend,
            "alert_level": s.alert_level,
        }
        for s in degradation
    ]

    # Overall assessment
    critical_count = sum(1 for s in degradation if s.alert_level == "critical")
    warning_count = sum(1 for s in degradation if s.alert_level == "warning")

    if critical_count > 0:
        overall_status = "critical"
    elif warning_count > 0:
        overall_status = "warning"
    else:
        overall_status = "healthy"

    return APIResponse(
        success=True,
        data={
            "model_id": model_id,
            "model_name": model_name,
            "overall_status": overall_status,
            "signals": signals,
            "summary": {
                "critical_metrics": critical_count,
                "warning_metrics": warning_count,
                "healthy_metrics": len(signals) - critical_count - warning_count,
            },
        }
    )


# =============================================================================
# Ingestion Endpoints
# =============================================================================


@router.post("/ingest", response_model=APIResponse)
async def ingest_predictions(request: IngestionRequest):
    """
    Ingest model predictions for continuous cognitive analysis.

    The engine will:
    - Store predictions, labels, and confidences
    - Auto-compute baselines when enough data is collected
    - Enable real statistical drift detection
    """
    engine = get_engine()

    result = engine.ingest(
        model_id=request.model_id,
        predictions=request.predictions,
        labels=request.labels,
        confidences=request.confidences,
        features=request.features,
    )

    return APIResponse(
        success=True,
        data=result,
    )


@router.post("/baseline", response_model=APIResponse)
async def set_baseline(request: BaselineRequest):
    """
    Set baseline feature distributions for drift detection.

    The baseline represents the "expected" distribution that current
    data will be compared against.
    """
    engine = get_engine()

    result = engine.set_baseline(
        model_id=request.model_id,
        features=request.features,
    )

    return APIResponse(
        success=True,
        data=result,
    )


# =============================================================================
# Alerts Endpoint
# =============================================================================


@router.get("/alerts", response_model=APIResponse)
async def get_cognitive_alerts(
    severity: Optional[str] = Query(None, pattern="^(critical|warning|info)$"),
    model_id: Optional[str] = Query(None),
):
    """
    Get active cognitive alerts based on analysis results.
    """
    engine = get_engine()

    alerts = []

    # Generate alerts from actual analysis
    for model in DEMO_MODELS:
        if model_id and model["id"] != model_id:
            continue

        snapshot = engine.get_model_snapshot(model["id"])

        # Drift alerts
        for drift_type, drift in snapshot["drift"].items():
            if drift["is_significant"]:
                alert_severity = "critical" if drift["severity"] == "severe" else "warning"
                if severity and alert_severity != severity:
                    continue

                alerts.append({
                    "id": f"drift-{model['id']}-{drift_type}",
                    "type": "drift",
                    "subtype": drift_type,
                    "severity": alert_severity,
                    "model_id": model["id"],
                    "title": f"{drift_type.title()} drift detected",
                    "description": f"Score: {drift['score']:.2f}, Affected: {', '.join(drift['affected_features'])}",
                    "score": drift["score"],
                    "created_at": datetime.utcnow().isoformat(),
                })

        # Reliability alerts
        if snapshot["reliability"]["status"] != "healthy":
            alert_severity = "critical" if snapshot["reliability"]["status"] == "critical" else "warning"
            if not severity or alert_severity == severity:
                alerts.append({
                    "id": f"reliability-{model['id']}",
                    "type": "reliability",
                    "severity": alert_severity,
                    "model_id": model["id"],
                    "title": "Reliability degradation detected",
                    "description": f"ECE: {snapshot['reliability']['calibration']['ece']:.3f}",
                    "score": 1 - snapshot["reliability"]["overall_score"],
                    "created_at": datetime.utcnow().isoformat(),
                })

        # Hallucination alerts (for GenAI models)
        if model["type"] == "genai" and snapshot["hallucination"]["risk_level"] != "low":
            alert_severity = "critical" if snapshot["hallucination"]["risk_level"] == "high" else "warning"
            if not severity or alert_severity == severity:
                alerts.append({
                    "id": f"hallucination-{model['id']}",
                    "type": "hallucination",
                    "severity": alert_severity,
                    "model_id": model["id"],
                    "title": f"High hallucination risk ({snapshot['hallucination']['risk_level']})",
                    "description": f"Grounding: {snapshot['hallucination']['grounding_score']:.2f}",
                    "score": 1 - snapshot["hallucination"]["overall_score"],
                    "created_at": datetime.utcnow().isoformat(),
                })

        # Degradation alerts
        for degradation in snapshot["degradation"]:
            if degradation["alert_level"] in ["warning", "critical"]:
                if severity and degradation["alert_level"] != severity:
                    continue

                alerts.append({
                    "id": f"degradation-{model['id']}-{degradation['metric']}",
                    "type": "degradation",
                    "severity": degradation["alert_level"],
                    "model_id": model["id"],
                    "title": f"{degradation['metric']} degradation",
                    "description": f"Changed {degradation['change_pct']:.1f}% from baseline",
                    "metric": degradation["metric"],
                    "current": degradation["current"],
                    "baseline": degradation["baseline"],
                    "created_at": datetime.utcnow().isoformat(),
                })

    # Sort by severity
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda a: severity_order.get(a["severity"], 3))

    return APIResponse(
        success=True,
        data={
            "alerts": alerts,
            "total": len(alerts),
            "critical_count": sum(1 for a in alerts if a["severity"] == "critical"),
            "warning_count": sum(1 for a in alerts if a["severity"] == "warning"),
        }
    )
