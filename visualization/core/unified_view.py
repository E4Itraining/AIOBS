"""
AIOBS Unified Observability View
Single pane of glass for monitoring + observability across all AI systems
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
import random


class ViewMode(Enum):
    """Available view modes"""
    OVERVIEW = "overview"
    MODELS = "models"
    INFRASTRUCTURE = "infrastructure"
    COSTS = "costs"
    COMPLIANCE = "compliance"
    INCIDENTS = "incidents"
    CARBON = "carbon"


class TimeGranularity(Enum):
    """Time granularity for data"""
    REALTIME = "realtime"  # 1s resolution
    MINUTE = "minute"
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"


@dataclass
class MetricPoint:
    """Single metric data point"""
    timestamp: datetime
    value: float
    labels: Dict[str, str] = field(default_factory=dict)


@dataclass
class TimeSeriesData:
    """Time series data for charts"""
    metric_name: str
    unit: str
    points: List[MetricPoint]
    aggregation: str = "avg"  # avg, sum, max, min, p50, p99


@dataclass
class AlertStatus:
    """Alert status summary"""
    total: int
    critical: int
    warning: int
    info: int
    acknowledged: int
    silenced: int


@dataclass
class ServiceHealth:
    """Health status for a service/model"""
    service_id: str
    service_name: str
    service_type: str  # model, pipeline, infrastructure
    status: str  # healthy, degraded, unhealthy, unknown
    uptime_pct: float
    error_rate_pct: float
    latency_p99_ms: float
    last_check: datetime


@dataclass
class UnifiedDashboardData:
    """Complete data for unified dashboard"""
    # Overview metrics
    total_models: int
    total_pipelines: int
    total_endpoints: int

    # Health summary
    healthy_services: int
    degraded_services: int
    unhealthy_services: int

    # Key metrics
    avg_trust_score: float
    total_daily_inferences: int
    total_daily_cost: float
    total_daily_carbon_kg: float

    # SLO compliance
    slo_compliance_pct: float
    error_budget_remaining_pct: float

    # Alerts
    alerts: AlertStatus

    # Top issues
    top_issues: List[Dict]

    # Trends
    trust_trend: str  # up, down, stable
    cost_trend: str
    carbon_trend: str


class UnifiedObservabilityView:
    """
    Unified Observability View for AI Systems

    Provides a single pane of glass combining:
    - Traditional infrastructure metrics (CPU, memory, network)
    - AI-specific metrics (drift, reliability, hallucination)
    - Business metrics (cost, revenue impact, conversions)
    - Compliance status (governance, audit, SLOs)
    - Sustainability metrics (carbon, energy)

    Supports multiple view modes and time granularities.
    """

    def __init__(
        self,
        victoria_metrics_url: Optional[str] = None,
        openobserve_url: Optional[str] = None
    ):
        self.vm_url = victoria_metrics_url
        self.oo_url = openobserve_url
        self._cache: Dict[str, Any] = {}
        self._cache_ttl = timedelta(seconds=30)

    def get_dashboard_data(
        self,
        view_mode: ViewMode = ViewMode.OVERVIEW,
        time_range: timedelta = timedelta(hours=24),
        granularity: TimeGranularity = TimeGranularity.HOUR,
        filters: Optional[Dict[str, Any]] = None
    ) -> UnifiedDashboardData:
        """
        Get complete dashboard data for unified view.
        """
        # In production, fetch from VictoriaMetrics and OpenObserve
        # For now, generate realistic demo data
        return self._generate_demo_dashboard_data(time_range)

    def get_services_health(
        self,
        service_type: Optional[str] = None
    ) -> List[ServiceHealth]:
        """
        Get health status for all services.
        """
        services = self._generate_demo_services()

        if service_type:
            services = [s for s in services if s.service_type == service_type]

        return services

    def get_time_series(
        self,
        metric_names: List[str],
        time_range: timedelta = timedelta(hours=24),
        granularity: TimeGranularity = TimeGranularity.HOUR,
        filters: Optional[Dict[str, str]] = None
    ) -> Dict[str, TimeSeriesData]:
        """
        Get time series data for specified metrics.
        """
        result = {}

        for metric_name in metric_names:
            result[metric_name] = self._generate_demo_time_series(
                metric_name, time_range, granularity
            )

        return result

    def get_correlation_matrix(
        self,
        metrics: List[str],
        time_range: timedelta = timedelta(hours=24)
    ) -> Dict[str, Dict[str, float]]:
        """
        Get correlation matrix between metrics.
        Useful for identifying relationships.
        """
        matrix = {}

        for m1 in metrics:
            matrix[m1] = {}
            for m2 in metrics:
                if m1 == m2:
                    matrix[m1][m2] = 1.0
                else:
                    # Generate realistic correlations
                    matrix[m1][m2] = self._generate_correlation(m1, m2)

        return matrix

    def get_anomalies(
        self,
        time_range: timedelta = timedelta(hours=24),
        min_severity: str = "low"
    ) -> List[Dict]:
        """
        Get detected anomalies in the time range.
        """
        return self._generate_demo_anomalies()

    def get_topology(self) -> Dict:
        """
        Get service topology / dependency map.
        Returns nodes and edges for visualization.
        """
        return {
            "nodes": [
                {"id": "gateway", "type": "endpoint", "label": "API Gateway", "status": "healthy"},
                {"id": "router", "type": "router", "label": "Model Router", "status": "healthy"},
                {"id": "model-rec", "type": "model", "label": "Recommendation Model", "status": "healthy"},
                {"id": "model-fraud", "type": "model", "label": "Fraud Detection", "status": "degraded"},
                {"id": "model-churn", "type": "model", "label": "Churn Predictor", "status": "healthy"},
                {"id": "feature-store", "type": "data", "label": "Feature Store", "status": "healthy"},
                {"id": "cache", "type": "infrastructure", "label": "Redis Cache", "status": "healthy"},
                {"id": "db", "type": "infrastructure", "label": "PostgreSQL", "status": "healthy"},
                {"id": "vm", "type": "monitoring", "label": "VictoriaMetrics", "status": "healthy"},
                {"id": "oo", "type": "monitoring", "label": "OpenObserve", "status": "healthy"},
            ],
            "edges": [
                {"source": "gateway", "target": "router", "type": "request"},
                {"source": "router", "target": "model-rec", "type": "inference"},
                {"source": "router", "target": "model-fraud", "type": "inference"},
                {"source": "router", "target": "model-churn", "type": "inference"},
                {"source": "model-rec", "target": "feature-store", "type": "data"},
                {"source": "model-fraud", "target": "feature-store", "type": "data"},
                {"source": "model-churn", "target": "feature-store", "type": "data"},
                {"source": "feature-store", "target": "db", "type": "data"},
                {"source": "router", "target": "cache", "type": "cache"},
                {"source": "gateway", "target": "vm", "type": "metrics"},
                {"source": "gateway", "target": "oo", "type": "logs"},
            ]
        }

    def get_slo_status(self) -> Dict:
        """
        Get SLO/SLI status across all services.
        """
        return {
            "slos": [
                {
                    "name": "Inference Latency P99 < 200ms",
                    "target": 200,
                    "current": 145,
                    "unit": "ms",
                    "compliance_pct": 99.2,
                    "error_budget_remaining_pct": 85,
                    "status": "healthy"
                },
                {
                    "name": "Model Availability > 99.9%",
                    "target": 99.9,
                    "current": 99.95,
                    "unit": "%",
                    "compliance_pct": 100,
                    "error_budget_remaining_pct": 95,
                    "status": "healthy"
                },
                {
                    "name": "Error Rate < 1%",
                    "target": 1.0,
                    "current": 0.8,
                    "unit": "%",
                    "compliance_pct": 98.5,
                    "error_budget_remaining_pct": 60,
                    "status": "warning"
                },
                {
                    "name": "Trust Score > 0.8",
                    "target": 0.8,
                    "current": 0.82,
                    "unit": "score",
                    "compliance_pct": 97.0,
                    "error_budget_remaining_pct": 45,
                    "status": "warning"
                },
            ],
            "overall_compliance_pct": 98.7,
            "slos_at_risk": 2,
            "error_budget_burn_rate": 1.2  # >1 means burning faster than expected
        }

    def get_cost_breakdown(
        self,
        time_range: timedelta = timedelta(days=30)
    ) -> Dict:
        """
        Get cost breakdown by category.
        """
        return {
            "total": 45230.50,
            "by_category": {
                "inference": 28500.00,
                "training": 8200.00,
                "storage": 4530.50,
                "networking": 2500.00,
                "monitoring": 1500.00
            },
            "by_model": {
                "recommendation-v2": 18500.00,
                "fraud-detector-v1": 12000.00,
                "churn-predictor": 8730.50,
                "other": 6000.00
            },
            "by_environment": {
                "production": 38000.00,
                "staging": 5230.50,
                "development": 2000.00
            },
            "trend": "up",
            "trend_pct": 12,
            "forecast_next_month": 50750.00
        }

    def get_carbon_metrics(
        self,
        time_range: timedelta = timedelta(days=30)
    ) -> Dict:
        """
        Get carbon/sustainability metrics.
        """
        return {
            "total_carbon_kg": 1250.5,
            "total_energy_kwh": 4500.0,
            "green_energy_pct": 65,
            "carbon_intensity_gco2_kwh": 278,
            "by_activity": {
                "inference": 750.0,
                "training": 350.5,
                "storage": 100.0,
                "networking": 50.0
            },
            "by_region": {
                "us-east-1": 500.0,
                "eu-west-1": 350.5,
                "ap-southeast-1": 400.0
            },
            "carbon_credits_equivalent": 1.25,
            "trend": "down",
            "trend_pct": -8,
            "recommendations": [
                "Shift batch jobs to low-carbon hours (2am-6am UTC)",
                "Consider eu-west-1 for new deployments (lower carbon intensity)",
                "Enable GPU sleep mode during off-peak hours"
            ]
        }

    def get_compliance_dashboard(self) -> Dict:
        """
        Get compliance/governance dashboard data.
        """
        return {
            "overall_score": 92,
            "categories": {
                "data_governance": {"score": 95, "status": "compliant"},
                "model_documentation": {"score": 88, "status": "warning"},
                "audit_trail": {"score": 100, "status": "compliant"},
                "access_control": {"score": 90, "status": "compliant"},
                "bias_fairness": {"score": 85, "status": "warning"},
                "explainability": {"score": 92, "status": "compliant"}
            },
            "regulations": {
                "ai_act": {"status": "compliant", "last_audit": "2024-01-15"},
                "gdpr": {"status": "compliant", "last_audit": "2024-01-10"},
                "sox": {"status": "compliant", "last_audit": "2024-01-05"}
            },
            "pending_reviews": 3,
            "overdue_reviews": 1,
            "recent_audit_findings": [
                {
                    "id": "AUD-2024-001",
                    "severity": "medium",
                    "finding": "Model documentation incomplete for v2.3",
                    "status": "in_progress"
                }
            ]
        }

    # =========================================================================
    # Private Helper Methods
    # =========================================================================

    def _generate_demo_dashboard_data(
        self,
        time_range: timedelta
    ) -> UnifiedDashboardData:
        """Generate realistic demo dashboard data"""
        return UnifiedDashboardData(
            total_models=12,
            total_pipelines=8,
            total_endpoints=15,
            healthy_services=28,
            degraded_services=3,
            unhealthy_services=1,
            avg_trust_score=0.82,
            total_daily_inferences=2_500_000,
            total_daily_cost=1507.50,
            total_daily_carbon_kg=41.7,
            slo_compliance_pct=98.7,
            error_budget_remaining_pct=65,
            alerts=AlertStatus(
                total=15,
                critical=1,
                warning=4,
                info=10,
                acknowledged=8,
                silenced=2
            ),
            top_issues=[
                {
                    "id": "ISS-001",
                    "title": "Fraud model drift detected",
                    "severity": "warning",
                    "affected_service": "fraud-detector-v1",
                    "duration_minutes": 45
                },
                {
                    "id": "ISS-002",
                    "title": "Increased latency on recommendation service",
                    "severity": "warning",
                    "affected_service": "recommendation-v2",
                    "duration_minutes": 20
                },
                {
                    "id": "ISS-003",
                    "title": "Cost spike detected",
                    "severity": "info",
                    "affected_service": "inference-cluster",
                    "duration_minutes": 120
                }
            ],
            trust_trend="stable",
            cost_trend="up",
            carbon_trend="down"
        )

    def _generate_demo_services(self) -> List[ServiceHealth]:
        """Generate demo service health data"""
        return [
            ServiceHealth(
                service_id="rec-v2",
                service_name="Recommendation Model v2",
                service_type="model",
                status="healthy",
                uptime_pct=99.95,
                error_rate_pct=0.1,
                latency_p99_ms=45,
                last_check=datetime.utcnow()
            ),
            ServiceHealth(
                service_id="fraud-v1",
                service_name="Fraud Detection v1",
                service_type="model",
                status="degraded",
                uptime_pct=99.5,
                error_rate_pct=0.8,
                latency_p99_ms=120,
                last_check=datetime.utcnow()
            ),
            ServiceHealth(
                service_id="churn-v1",
                service_name="Churn Predictor",
                service_type="model",
                status="healthy",
                uptime_pct=99.99,
                error_rate_pct=0.05,
                latency_p99_ms=30,
                last_check=datetime.utcnow()
            ),
            ServiceHealth(
                service_id="feature-store",
                service_name="Feature Store",
                service_type="pipeline",
                status="healthy",
                uptime_pct=99.99,
                error_rate_pct=0.01,
                latency_p99_ms=15,
                last_check=datetime.utcnow()
            ),
            ServiceHealth(
                service_id="inference-cluster",
                service_name="Inference Cluster",
                service_type="infrastructure",
                status="healthy",
                uptime_pct=99.95,
                error_rate_pct=0.02,
                latency_p99_ms=5,
                last_check=datetime.utcnow()
            ),
        ]

    def _generate_demo_time_series(
        self,
        metric_name: str,
        time_range: timedelta,
        granularity: TimeGranularity
    ) -> TimeSeriesData:
        """Generate demo time series data"""
        # Determine number of points based on granularity
        if granularity == TimeGranularity.MINUTE:
            num_points = int(time_range.total_seconds() / 60)
        elif granularity == TimeGranularity.HOUR:
            num_points = int(time_range.total_seconds() / 3600)
        else:
            num_points = int(time_range.total_seconds() / 86400)

        num_points = min(num_points, 100)  # Cap for demo

        now = datetime.utcnow()
        points = []

        base_value = {
            "trust_score": 0.82,
            "latency_p99": 100,
            "error_rate": 0.5,
            "throughput": 1000,
            "cost": 60,
            "carbon": 1.5
        }.get(metric_name, 50)

        for i in range(num_points):
            ts = now - timedelta(hours=num_points - i)
            noise = random.uniform(-0.1, 0.1) * base_value
            points.append(MetricPoint(
                timestamp=ts,
                value=round(base_value + noise, 2)
            ))

        unit = {
            "trust_score": "score",
            "latency_p99": "ms",
            "error_rate": "%",
            "throughput": "req/s",
            "cost": "$/h",
            "carbon": "kgCO2/h"
        }.get(metric_name, "")

        return TimeSeriesData(
            metric_name=metric_name,
            unit=unit,
            points=points
        )

    def _generate_correlation(self, m1: str, m2: str) -> float:
        """Generate realistic correlation between metrics"""
        correlations = {
            ("trust_score", "error_rate"): -0.75,
            ("latency_p99", "throughput"): -0.6,
            ("cost", "throughput"): 0.85,
            ("carbon", "cost"): 0.7,
            ("trust_score", "latency_p99"): -0.4,
        }

        key = (m1, m2) if (m1, m2) in correlations else (m2, m1)
        return correlations.get(key, random.uniform(-0.3, 0.3))

    def _generate_demo_anomalies(self) -> List[Dict]:
        """Generate demo anomalies"""
        return [
            {
                "id": "ANO-001",
                "metric": "latency_p99",
                "service": "fraud-detector-v1",
                "detected_at": datetime.utcnow() - timedelta(hours=2),
                "expected_value": 80,
                "actual_value": 150,
                "severity": "warning",
                "status": "investigating"
            },
            {
                "id": "ANO-002",
                "metric": "cost",
                "service": "inference-cluster",
                "detected_at": datetime.utcnow() - timedelta(hours=5),
                "expected_value": 50,
                "actual_value": 85,
                "severity": "info",
                "status": "acknowledged"
            }
        ]
