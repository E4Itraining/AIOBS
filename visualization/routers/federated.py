"""
AIOBS Federated Observability API Router
Endpoints for multi-cloud and multi-vendor observability
"""
from typing import Optional, List
from fastapi import APIRouter, Query

from ..core.federated_observability import (
    FederatedObservability,
    DataResidencyRegion
)
from ..models.schemas import APIResponse

router = APIRouter(prefix="/api/federated", tags=["federated"])

# Initialize federated observability
federated = FederatedObservability()


@router.get("/dashboard")
async def get_federated_dashboard() -> APIResponse:
    """
    Get complete federated observability dashboard data.
    Includes multi-cloud metrics, vendor comparison, and data residency status.
    """
    data = federated.get_federated_dashboard()
    return APIResponse(success=True, data=data)


@router.get("/clouds")
async def get_cloud_overview(
    clouds: Optional[str] = Query(None, description="Comma-separated list of clouds to include")
) -> APIResponse:
    """
    Get unified view across cloud providers.
    """
    cloud_list = clouds.split(",") if clouds else None
    unified_view = federated.aggregate_across_clouds(cloud_list)

    return APIResponse(
        success=True,
        data={
            "total_models": unified_view.total_models,
            "total_endpoints": unified_view.total_endpoints,
            "total_regions": unified_view.total_regions,
            "by_cloud": unified_view.by_cloud,
            "by_region": unified_view.by_region,
            "health": unified_view.health_summary,
            "costs": unified_view.cost_summary,
            "carbon": unified_view.carbon_summary,
            "timestamp": unified_view.timestamp.isoformat()
        }
    )


@router.get("/vendors")
async def get_vendor_metrics(
    vendor: Optional[str] = Query(None, description="Specific vendor to query")
) -> APIResponse:
    """
    Get normalized metrics across AI vendors.
    """
    metrics = federated.normalize_vendor_metrics(vendor)

    return APIResponse(
        success=True,
        data=[
            {
                "vendor": m.vendor,
                "model": m.model,
                "latency_ms": round(m.latency_ms, 2),
                "tokens_per_second": round(m.tokens_per_second, 2),
                "cost_per_1k_tokens": m.cost_per_1k_tokens,
                "error_rate_pct": m.error_rate_pct,
                "availability_pct": m.availability_pct,
                "quality_score": m.quality_score,
                "timestamp": m.timestamp.isoformat()
            }
            for m in metrics
        ]
    )


@router.get("/vendors/compare")
async def compare_vendors(
    vendors: str = Query(..., description="Comma-separated list of vendors to compare"),
    criteria: Optional[str] = Query(None, description="Comma-separated criteria: latency,cost,quality,availability")
) -> APIResponse:
    """
    Compare AI vendors based on specified criteria.
    """
    vendor_list = vendors.split(",")
    criteria_list = criteria.split(",") if criteria else None

    comparison = federated.compare_vendors(vendor_list, criteria_list)

    return APIResponse(success=True, data=comparison)


@router.get("/traces/{trace_id}")
async def get_distributed_trace(trace_id: str) -> APIResponse:
    """
    Get distributed trace spanning across cloud boundaries.
    """
    trace = federated.trace_across_regions(trace_id)

    return APIResponse(
        success=True,
        data={
            "trace_id": trace.trace_id,
            "spans": trace.spans,
            "total_duration_ms": trace.total_duration_ms,
            "clouds_involved": trace.clouds_involved,
            "regions_involved": trace.regions_involved,
            "status": trace.status,
            "root_cause": trace.root_cause
        }
    )


@router.get("/latency")
async def get_cross_cloud_latency() -> APIResponse:
    """
    Get latency metrics for cross-cloud communications.
    """
    latency_data = federated.get_cross_cloud_latency()

    # Convert tuple keys to string keys for JSON serialization
    cloud_latency = {
        f"{k[0]}->{k[1]}": v
        for k, v in latency_data["cloud_to_cloud_latency_ms"].items()
    }
    region_latency = {
        f"{k[0]}->{k[1]}": v
        for k, v in latency_data["region_to_region_latency_ms"].items()
    }

    return APIResponse(
        success=True,
        data={
            "cloud_to_cloud": cloud_latency,
            "region_to_region": region_latency,
            "bottlenecks": latency_data["bottlenecks"]
        }
    )


@router.get("/query")
async def federated_query(
    q: str = Query(..., description="Query to execute"),
    sources: Optional[str] = Query(None, description="Comma-separated list of sources"),
    residency: Optional[str] = Query(None, description="Data residency region: eu, us, apac, global")
) -> APIResponse:
    """
    Execute a federated query across distributed data sources.
    """
    source_list = sources.split(",") if sources else None
    residency_region = None
    if residency:
        residency_map = {
            "eu": DataResidencyRegion.EU,
            "us": DataResidencyRegion.US,
            "apac": DataResidencyRegion.APAC,
            "global": DataResidencyRegion.GLOBAL
        }
        residency_region = residency_map.get(residency.lower())

    result = federated.query_federated(q, source_list, residency_region)

    return APIResponse(
        success=True,
        data={
            "query": result.query,
            "results": result.results,
            "sources": result.sources,
            "total_records": result.total_records,
            "execution_time_ms": round(result.execution_time_ms, 2),
            "data_residency_compliant": result.data_residency_compliant
        }
    )


@router.get("/residency")
async def get_data_residency_status() -> APIResponse:
    """
    Get data residency compliance status across all deployments.
    """
    status = federated.get_data_residency_status()
    return APIResponse(success=True, data=status)


@router.get("/topology")
async def get_federated_topology() -> APIResponse:
    """
    Get federated service topology across all clouds.
    """
    # Generate federated topology
    nodes = [
        # AWS nodes
        {"id": "aws-gateway", "type": "endpoint", "label": "AWS API Gateway", "cloud": "aws", "region": "us-east-1", "status": "healthy"},
        {"id": "aws-router", "type": "router", "label": "AWS Model Router", "cloud": "aws", "region": "us-east-1", "status": "healthy"},
        {"id": "aws-cache", "type": "infrastructure", "label": "AWS ElastiCache", "cloud": "aws", "region": "us-east-1", "status": "healthy"},

        # Azure nodes
        {"id": "azure-vectordb", "type": "data", "label": "Azure Cognitive Search", "cloud": "azure", "region": "westeurope", "status": "healthy"},
        {"id": "azure-storage", "type": "infrastructure", "label": "Azure Blob Storage", "cloud": "azure", "region": "westeurope", "status": "healthy"},

        # GCP nodes
        {"id": "gcp-embeddings", "type": "model", "label": "GCP Vertex Embeddings", "cloud": "gcp", "region": "us-central1", "status": "degraded"},
        {"id": "gcp-bigquery", "type": "data", "label": "BigQuery Analytics", "cloud": "gcp", "region": "us-central1", "status": "healthy"},

        # On-premise nodes
        {"id": "onprem-llm", "type": "model", "label": "Local LLM Cluster", "cloud": "on_premise", "region": "datacenter-eu", "status": "healthy"},
        {"id": "onprem-gpu", "type": "infrastructure", "label": "GPU Farm", "cloud": "on_premise", "region": "datacenter-eu", "status": "healthy"},

        # Vendor nodes
        {"id": "openai", "type": "vendor", "label": "OpenAI API", "cloud": "external", "region": "global", "status": "healthy"},
        {"id": "anthropic", "type": "vendor", "label": "Anthropic API", "cloud": "external", "region": "global", "status": "healthy"},
    ]

    edges = [
        # AWS internal
        {"source": "aws-gateway", "target": "aws-router", "type": "request", "latency_ms": 2},
        {"source": "aws-router", "target": "aws-cache", "type": "cache", "latency_ms": 1},

        # Cross-cloud connections
        {"source": "aws-router", "target": "gcp-embeddings", "type": "inference", "latency_ms": 38},
        {"source": "aws-router", "target": "azure-vectordb", "type": "data", "latency_ms": 45},
        {"source": "aws-router", "target": "onprem-llm", "type": "inference", "latency_ms": 85},

        # GCP to Azure
        {"source": "gcp-embeddings", "target": "azure-vectordb", "type": "data", "latency_ms": 52},

        # On-prem internal
        {"source": "onprem-llm", "target": "onprem-gpu", "type": "compute", "latency_ms": 1},

        # External vendors
        {"source": "aws-router", "target": "openai", "type": "api", "latency_ms": 120},
        {"source": "aws-router", "target": "anthropic", "type": "api", "latency_ms": 95},

        # Analytics
        {"source": "azure-vectordb", "target": "gcp-bigquery", "type": "analytics", "latency_ms": 65},
        {"source": "azure-storage", "target": "gcp-bigquery", "type": "analytics", "latency_ms": 70},
    ]

    return APIResponse(
        success=True,
        data={
            "nodes": nodes,
            "edges": edges,
            "cloud_summary": {
                "aws": {"nodes": 3, "status": "healthy"},
                "azure": {"nodes": 2, "status": "healthy"},
                "gcp": {"nodes": 2, "status": "degraded"},
                "on_premise": {"nodes": 2, "status": "healthy"},
                "external": {"nodes": 2, "status": "healthy"}
            }
        }
    )
