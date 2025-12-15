"""
AIOBS Metrics API Router
Endpoints for metrics, time series, and analysis
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException

from ..core import CognitiveEngine, CausalEngine, ImpactAnalyzer, UnifiedObservabilityView
from ..models.schemas import APIResponse

router = APIRouter(prefix="/api/metrics", tags=["metrics"])

# Initialize engines
cognitive_engine = CognitiveEngine()
causal_engine = CausalEngine()
impact_analyzer = ImpactAnalyzer()
unified_view = UnifiedObservabilityView()


@router.get("/cognitive/{model_id}")
async def get_cognitive_metrics(model_id: str) -> APIResponse:
    """
    Get cognitive metrics snapshot for a model.
    Includes drift, reliability, hallucination, and trust indicators.
    """
    try:
        snapshot = cognitive_engine.get_model_snapshot(model_id)
        return APIResponse(success=True, data=snapshot)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trust/{model_id}")
async def get_trust_score(model_id: str) -> APIResponse:
    """
    Get trust score and breakdown for a model.
    """
    snapshot = cognitive_engine.get_model_snapshot(model_id)
    trust_data = snapshot.get("trust")

    return APIResponse(
        success=True,
        data={
            "model_id": model_id,
            "overall_trust": trust_data.overall_trust if trust_data else 0,
            "components": {
                "drift_risk": trust_data.drift_risk if trust_data else 0,
                "reliability": trust_data.reliability if trust_data else 0,
                "hallucination_risk": trust_data.hallucination_risk if trust_data else 0,
                "degradation_risk": trust_data.degradation_risk if trust_data else 0,
            },
            "trend": trust_data.trend if trust_data else "unknown"
        }
    )


@router.get("/timeseries")
async def get_time_series(
    metrics: str = Query(..., description="Comma-separated metric names"),
    hours: int = Query(24, ge=1, le=720, description="Time range in hours"),
    granularity: str = Query("hour", description="Data granularity")
) -> APIResponse:
    """
    Get time series data for specified metrics.
    """
    metric_list = [m.strip() for m in metrics.split(",")]

    from ..core.unified_view import TimeGranularity
    gran_map = {
        "minute": TimeGranularity.MINUTE,
        "hour": TimeGranularity.HOUR,
        "day": TimeGranularity.DAY
    }
    gran = gran_map.get(granularity, TimeGranularity.HOUR)

    data = unified_view.get_time_series(
        metric_names=metric_list,
        time_range=timedelta(hours=hours),
        granularity=gran
    )

    # Convert to JSON-serializable format
    result = {}
    for name, ts in data.items():
        result[name] = {
            "metric_name": ts.metric_name,
            "unit": ts.unit,
            "points": [
                {"timestamp": p.timestamp.isoformat(), "value": p.value}
                for p in ts.points
            ]
        }

    return APIResponse(success=True, data=result)


@router.get("/correlation")
async def get_correlation_matrix(
    metrics: str = Query(..., description="Comma-separated metric names"),
    hours: int = Query(24, ge=1, le=720)
) -> APIResponse:
    """
    Get correlation matrix between metrics.
    """
    metric_list = [m.strip() for m in metrics.split(",")]
    matrix = unified_view.get_correlation_matrix(
        metrics=metric_list,
        time_range=timedelta(hours=hours)
    )

    return APIResponse(success=True, data=matrix)


@router.get("/anomalies")
async def get_anomalies(
    hours: int = Query(24, ge=1, le=720),
    min_severity: str = Query("low")
) -> APIResponse:
    """
    Get detected anomalies.
    """
    anomalies = unified_view.get_anomalies(
        time_range=timedelta(hours=hours),
        min_severity=min_severity
    )

    # Convert datetime to string
    for a in anomalies:
        if "detected_at" in a:
            a["detected_at"] = a["detected_at"].isoformat()

    return APIResponse(success=True, data=anomalies)


@router.get("/causal/graph/{scenario}")
async def get_causal_graph(scenario: str = "drift_incident") -> APIResponse:
    """
    Get a causal graph for analysis.
    Scenarios: drift_incident, cost_spike, generic
    """
    graph = causal_engine.get_demo_graph(scenario)

    # Convert to JSON-serializable format
    nodes = [
        {
            "id": n.id,
            "type": n.node_type.value,
            "name": n.name,
            "description": n.description,
            "impact_score": n.impact_score
        }
        for n in graph.nodes.values()
    ]

    edges = [
        {
            "source": e.source_id,
            "target": e.target_id,
            "type": e.edge_type.value,
            "weight": e.weight,
            "confidence": e.confidence
        }
        for e in graph.edges
    ]

    return APIResponse(
        success=True,
        data={
            "id": graph.id,
            "nodes": nodes,
            "edges": edges
        }
    )


@router.post("/impact/analyze")
async def analyze_impact(
    event_type: str = Query(...),
    affected_models: str = Query(""),
    hours: int = Query(24)
) -> APIResponse:
    """
    Analyze business impact of an event.
    """
    models = [m.strip() for m in affected_models.split(",") if m.strip()]

    report = impact_analyzer.analyze_event_impact(
        event_type=event_type,
        event_data={},
        affected_models=models,
        time_window_hours=hours
    )

    # Convert to JSON-serializable format
    return APIResponse(
        success=True,
        data={
            "report_id": report.report_id,
            "trigger_event": report.trigger_event,
            "total_monetary_impact": report.total_monetary_impact,
            "primary_domain": report.primary_domain.value,
            "overall_severity": report.overall_severity.value,
            "impacts": [
                {
                    "metric": i.metric_name,
                    "domain": i.domain.value,
                    "delta_pct": i.delta_percentage,
                    "severity": i.severity.value,
                    "monetary_impact": i.monetary_impact
                }
                for i in report.impacts
            ],
            "recommendations": report.recommendations,
            "mitigations": report.mitigation_actions
        }
    )


@router.get("/impact/summary")
async def get_impact_summary(hours: int = Query(24)) -> APIResponse:
    """
    Get impact summary for dashboard.
    """
    summary = impact_analyzer.get_impact_summary(time_range_hours=hours)
    return APIResponse(success=True, data=summary)
