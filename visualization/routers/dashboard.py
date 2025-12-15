"""
AIOBS Dashboard API Router
Endpoints for unified dashboard views
"""
from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Query

from ..core import UnifiedObservabilityView
from ..models.schemas import APIResponse

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Initialize view
unified_view = UnifiedObservabilityView()


@router.get("/overview")
async def get_overview(hours: int = Query(24, ge=1, le=720)) -> APIResponse:
    """
    Get unified dashboard overview data.
    """
    from ..core.unified_view import ViewMode, TimeGranularity

    data = unified_view.get_dashboard_data(
        view_mode=ViewMode.OVERVIEW,
        time_range=timedelta(hours=hours)
    )

    return APIResponse(
        success=True,
        data={
            "summary": {
                "total_models": data.total_models,
                "total_pipelines": data.total_pipelines,
                "total_endpoints": data.total_endpoints,
            },
            "health": {
                "healthy": data.healthy_services,
                "degraded": data.degraded_services,
                "unhealthy": data.unhealthy_services,
            },
            "key_metrics": {
                "avg_trust_score": data.avg_trust_score,
                "total_daily_inferences": data.total_daily_inferences,
                "total_daily_cost": data.total_daily_cost,
                "total_daily_carbon_kg": data.total_daily_carbon_kg,
            },
            "slo": {
                "compliance_pct": data.slo_compliance_pct,
                "error_budget_remaining_pct": data.error_budget_remaining_pct,
            },
            "alerts": {
                "total": data.alerts.total,
                "critical": data.alerts.critical,
                "warning": data.alerts.warning,
                "info": data.alerts.info,
            },
            "top_issues": data.top_issues,
            "trends": {
                "trust": data.trust_trend,
                "cost": data.cost_trend,
                "carbon": data.carbon_trend,
            }
        }
    )


@router.get("/services")
async def get_services_health(
    service_type: Optional[str] = Query(None, description="Filter by type: model, pipeline, infrastructure")
) -> APIResponse:
    """
    Get health status for all services.
    """
    services = unified_view.get_services_health(service_type)

    return APIResponse(
        success=True,
        data=[
            {
                "id": s.service_id,
                "name": s.service_name,
                "type": s.service_type,
                "status": s.status,
                "uptime_pct": s.uptime_pct,
                "error_rate_pct": s.error_rate_pct,
                "latency_p99_ms": s.latency_p99_ms,
                "last_check": s.last_check.isoformat()
            }
            for s in services
        ]
    )


@router.get("/topology")
async def get_topology() -> APIResponse:
    """
    Get service topology / dependency map.
    """
    topology = unified_view.get_topology()
    return APIResponse(success=True, data=topology)


@router.get("/slo")
async def get_slo_status() -> APIResponse:
    """
    Get SLO/SLI status across all services.
    """
    slo_data = unified_view.get_slo_status()
    return APIResponse(success=True, data=slo_data)


@router.get("/costs")
async def get_cost_breakdown(days: int = Query(30, ge=1, le=365)) -> APIResponse:
    """
    Get cost breakdown by category.
    """
    costs = unified_view.get_cost_breakdown(time_range=timedelta(days=days))
    return APIResponse(success=True, data=costs)


@router.get("/carbon")
async def get_carbon_metrics(days: int = Query(30, ge=1, le=365)) -> APIResponse:
    """
    Get carbon/sustainability metrics.
    """
    carbon = unified_view.get_carbon_metrics(time_range=timedelta(days=days))
    return APIResponse(success=True, data=carbon)


@router.get("/compliance")
async def get_compliance_dashboard() -> APIResponse:
    """
    Get compliance/governance dashboard data.
    """
    compliance = unified_view.get_compliance_dashboard()
    return APIResponse(success=True, data=compliance)


@router.get("/incidents")
async def get_incidents(
    priority: Optional[str] = Query(None, description="Filter by priority: p1, p2, p3, p4"),
    status: Optional[str] = Query(None, description="Filter by status: detected, acknowledged, investigating, mitigating, monitoring, resolved"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of incidents to return")
) -> APIResponse:
    """
    Get incidents with optional filtering by priority and status.
    """
    incidents = unified_view.get_incidents(priority=priority, status=status, limit=limit)
    return APIResponse(success=True, data=incidents)
