"""
AIOBS Visualization - Data Models
Pydantic schemas for type-safe API and data handling
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# ============================================================================
# ENUMS - User Profiles & Categories
# ============================================================================


class UserProfile(str, Enum):
    """User profile types for adaptive UI"""

    # Technical profiles
    TECH_ML_ENGINEER = "tech_ml_engineer"
    TECH_DEVOPS = "tech_devops"
    TECH_DATA_SCIENTIST = "tech_data_scientist"
    # Business profiles
    BUSINESS_PRODUCT = "business_product"
    BUSINESS_EXECUTIVE = "business_executive"
    # Specialist profiles
    SECURITY_SOC = "security_soc"
    COMPLIANCE_LEGAL = "compliance_legal"
    SUSTAINABILITY_ESG = "sustainability_esg"
    # Governance profiles (French IT roles)
    GOVERNANCE_DSI = "governance_dsi"  # Directeur des Systèmes d'Information
    GOVERNANCE_RSI = "governance_rsi"  # Responsable des Systèmes d'Information
    PRIVACY_DPO = "privacy_dpo"  # Data Protection Officer
    LEGAL_COUNSEL = "legal_counsel"  # Juriste / Legal Counsel


class RiskLevel(str, Enum):
    """Risk severity levels"""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


class TrendDirection(str, Enum):
    """Trend direction indicators"""

    UP = "up"
    DOWN = "down"
    STABLE = "stable"
    VOLATILE = "volatile"


class MetricCategory(str, Enum):
    """Categories of metrics for filtering"""

    COGNITIVE = "cognitive"
    PERFORMANCE = "performance"
    COST = "cost"
    CARBON = "carbon"
    SECURITY = "security"
    COMPLIANCE = "compliance"


# ============================================================================
# CORE METRICS MODELS
# ============================================================================


class TrustScore(BaseModel):
    """Overall trust score with breakdown"""

    model_config = ConfigDict(extra="forbid")

    overall: float = Field(..., ge=0, le=1, description="Overall trust score 0-1")
    drift_component: float = Field(..., ge=0, le=1)
    reliability_component: float = Field(..., ge=0, le=1)
    hallucination_component: float = Field(..., ge=0, le=1)
    degradation_component: float = Field(..., ge=0, le=1)
    trend: TrendDirection = TrendDirection.STABLE
    last_updated: datetime


class DriftMetrics(BaseModel):
    """Drift detection metrics"""

    data_drift_score: float = Field(..., ge=0, le=1)
    concept_drift_score: float = Field(..., ge=0, le=1)
    prediction_drift_score: float = Field(..., ge=0, le=1)
    feature_drifts: Dict[str, float] = Field(default_factory=dict)
    drift_detected: bool = False
    drift_severity: RiskLevel = RiskLevel.NONE


class ReliabilityMetrics(BaseModel):
    """Model reliability metrics"""

    confidence_calibration: float = Field(..., ge=0, le=1)
    prediction_stability: float = Field(..., ge=0, le=1)
    uncertainty_quality: float = Field(..., ge=0, le=1)
    ood_detection_rate: float = Field(..., ge=0, le=1)


class CostMetrics(BaseModel):
    """FinOps cost metrics"""

    inference_cost_per_1k: float = Field(..., ge=0)
    daily_cost: float = Field(..., ge=0)
    monthly_projection: float = Field(..., ge=0)
    cost_trend: TrendDirection = TrendDirection.STABLE
    cost_anomaly_detected: bool = False
    budget_utilization_pct: float = Field(..., ge=0, le=100)


class CarbonMetrics(BaseModel):
    """GreenOps carbon metrics"""

    carbon_intensity_gco2_kwh: float = Field(..., ge=0)
    energy_consumption_kwh: float = Field(..., ge=0)
    carbon_footprint_kgco2: float = Field(..., ge=0)
    green_energy_pct: float = Field(..., ge=0, le=100)
    carbon_trend: TrendDirection = TrendDirection.STABLE


class SecurityMetrics(BaseModel):
    """Security posture metrics"""

    prompt_injection_attempts: int = Field(..., ge=0)
    data_leak_risks: int = Field(..., ge=0)
    jailbreak_attempts: int = Field(..., ge=0)
    security_score: float = Field(..., ge=0, le=1)
    risk_level: RiskLevel = RiskLevel.LOW


# ============================================================================
# MODEL & SYSTEM SNAPSHOTS
# ============================================================================


class ModelSnapshot(BaseModel):
    """Complete model health snapshot"""

    model_config = ConfigDict(protected_namespaces=())

    model_id: str
    model_name: str
    model_version: str
    environment: str = "production"

    # Core metrics
    trust_score: TrustScore
    drift: DriftMetrics
    reliability: ReliabilityMetrics

    # Extended metrics (optional)
    cost: Optional[CostMetrics] = None
    carbon: Optional[CarbonMetrics] = None
    security: Optional[SecurityMetrics] = None

    # Performance
    latency_p50_ms: float = Field(..., ge=0)
    latency_p99_ms: float = Field(..., ge=0)
    throughput_rps: float = Field(..., ge=0)
    error_rate_pct: float = Field(..., ge=0, le=100)

    # Metadata
    last_updated: datetime
    alerts_count: int = 0


class SystemOverview(BaseModel):
    """System-wide overview for dashboards"""

    total_models: int
    healthy_models: int
    degraded_models: int
    critical_models: int

    avg_trust_score: float = Field(..., ge=0, le=1)
    total_daily_cost: float = Field(..., ge=0)
    total_carbon_kgco2: float = Field(..., ge=0)

    active_alerts: int
    slo_compliance_pct: float = Field(..., ge=0, le=100)

    last_updated: datetime


# ============================================================================
# IMPACT ANALYSIS MODELS
# ============================================================================


class ImpactNode(BaseModel):
    """Node in impact analysis graph"""

    node_id: str
    node_type: str  # model, feature, infrastructure, business_metric
    name: str
    impact_score: float = Field(..., ge=-1, le=1)
    confidence: float = Field(..., ge=0, le=1)


class ImpactEdge(BaseModel):
    """Edge in impact analysis graph"""

    source_id: str
    target_id: str
    weight: float = Field(..., ge=0, le=1)
    relationship_type: str  # causal, correlation, dependency


class ImpactAnalysis(BaseModel):
    """Complete impact analysis result"""

    analysis_id: str
    trigger_event: str
    affected_scope: List[str]

    nodes: List[ImpactNode]
    edges: List[ImpactEdge]

    root_causes: List[str]
    recommendations: List[str]

    business_impact_score: float = Field(..., ge=0, le=1)
    estimated_cost_impact: float

    created_at: datetime


# ============================================================================
# DASHBOARD & UI MODELS
# ============================================================================


class DashboardWidget(BaseModel):
    """Widget configuration for dynamic dashboards"""

    widget_id: str
    widget_type: str  # chart, gauge, table, alert_list, kpi_card
    title: str
    data_source: str
    config: Dict[str, Any] = Field(default_factory=dict)
    position: Dict[str, int] = Field(default_factory=dict)  # x, y, w, h
    refresh_interval_sec: int = 30


class ProfileDashboard(BaseModel):
    """Dashboard configuration per profile"""

    profile: UserProfile
    name: str
    description: str
    widgets: List[DashboardWidget]
    default_time_range: str = "1h"
    theme: str = "light"


class NavigationItem(BaseModel):
    """Navigation menu item"""

    id: str
    label: str
    icon: str
    route: str
    badge: Optional[int] = None
    children: List["NavigationItem"] = Field(default_factory=list)


# ============================================================================
# API RESPONSE MODELS
# ============================================================================


class APIResponse(BaseModel):
    """Standard API response wrapper"""

    success: bool = True
    data: Any = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PaginatedResponse(BaseModel):
    """Paginated API response"""

    items: List[Any]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool
