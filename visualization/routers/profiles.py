"""
AIOBS Profile-based Navigation Router
Adaptive UI based on user profiles (tech/non-tech)
"""
from typing import List, Optional
from fastapi import APIRouter, Query
from enum import Enum

from ..models.schemas import (
    APIResponse, UserProfile, DashboardWidget, ProfileDashboard, NavigationItem
)

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


# Widget configurations per profile type
PROFILE_WIDGETS = {
    # Technical ML Engineer - Focus on model metrics
    UserProfile.TECH_ML_ENGINEER: [
        DashboardWidget(
            widget_id="trust_gauge",
            widget_type="gauge",
            title="Trust Score",
            data_source="/api/metrics/trust/{model_id}",
            config={"min": 0, "max": 1, "thresholds": [0.6, 0.8]},
            position={"x": 0, "y": 0, "w": 3, "h": 2}
        ),
        DashboardWidget(
            widget_id="drift_chart",
            widget_type="line_chart",
            title="Drift Detection",
            data_source="/api/metrics/timeseries?metrics=data_drift,concept_drift",
            config={"colors": ["#ff6b6b", "#feca57"]},
            position={"x": 3, "y": 0, "w": 6, "h": 2}
        ),
        DashboardWidget(
            widget_id="reliability_breakdown",
            widget_type="radar_chart",
            title="Reliability Analysis",
            data_source="/api/metrics/cognitive/{model_id}",
            config={"metrics": ["calibration", "stability", "uncertainty", "ood"]},
            position={"x": 9, "y": 0, "w": 3, "h": 2}
        ),
        DashboardWidget(
            widget_id="model_performance",
            widget_type="multi_line",
            title="Model Performance",
            data_source="/api/metrics/timeseries?metrics=latency_p99,throughput,error_rate",
            config={},
            position={"x": 0, "y": 2, "w": 8, "h": 3}
        ),
        DashboardWidget(
            widget_id="causal_graph",
            widget_type="graph",
            title="Causal Analysis",
            data_source="/api/metrics/causal/graph/drift_incident",
            config={"layout": "hierarchical"},
            position={"x": 8, "y": 2, "w": 4, "h": 3}
        ),
    ],

    # DevOps - Focus on infrastructure and SLOs
    UserProfile.TECH_DEVOPS: [
        DashboardWidget(
            widget_id="slo_status",
            widget_type="slo_cards",
            title="SLO Status",
            data_source="/api/dashboard/slo",
            config={},
            position={"x": 0, "y": 0, "w": 12, "h": 2}
        ),
        DashboardWidget(
            widget_id="service_topology",
            widget_type="topology",
            title="Service Topology",
            data_source="/api/dashboard/topology",
            config={"layout": "force"},
            position={"x": 0, "y": 2, "w": 6, "h": 4}
        ),
        DashboardWidget(
            widget_id="services_health",
            widget_type="table",
            title="Services Health",
            data_source="/api/dashboard/services",
            config={"sortable": True, "filterable": True},
            position={"x": 6, "y": 2, "w": 6, "h": 4}
        ),
        DashboardWidget(
            widget_id="latency_chart",
            widget_type="line_chart",
            title="Latency Trends",
            data_source="/api/metrics/timeseries?metrics=latency_p50,latency_p99",
            config={},
            position={"x": 0, "y": 6, "w": 6, "h": 2}
        ),
        DashboardWidget(
            widget_id="error_rate",
            widget_type="area_chart",
            title="Error Rate",
            data_source="/api/metrics/timeseries?metrics=error_rate",
            config={"color": "#ff6b6b"},
            position={"x": 6, "y": 6, "w": 6, "h": 2}
        ),
    ],

    # Business Executive - Focus on KPIs and impact
    UserProfile.BUSINESS_EXECUTIVE: [
        DashboardWidget(
            widget_id="kpi_cards",
            widget_type="kpi_row",
            title="Key Metrics",
            data_source="/api/dashboard/overview",
            config={"metrics": ["trust_score", "daily_cost", "slo_compliance", "carbon"]},
            position={"x": 0, "y": 0, "w": 12, "h": 2}
        ),
        DashboardWidget(
            widget_id="health_donut",
            widget_type="donut_chart",
            title="System Health",
            data_source="/api/dashboard/overview",
            config={"field": "health"},
            position={"x": 0, "y": 2, "w": 4, "h": 3}
        ),
        DashboardWidget(
            widget_id="cost_breakdown",
            widget_type="pie_chart",
            title="Cost Distribution",
            data_source="/api/dashboard/costs",
            config={"field": "by_category"},
            position={"x": 4, "y": 2, "w": 4, "h": 3}
        ),
        DashboardWidget(
            widget_id="impact_summary",
            widget_type="bar_chart",
            title="Business Impact",
            data_source="/api/metrics/impact/summary",
            config={},
            position={"x": 8, "y": 2, "w": 4, "h": 3}
        ),
        DashboardWidget(
            widget_id="trust_trend",
            widget_type="sparkline_row",
            title="Trust Trends by Model",
            data_source="/api/metrics/timeseries?metrics=trust_score",
            config={},
            position={"x": 0, "y": 5, "w": 12, "h": 2}
        ),
    ],

    # Product Owner - Focus on features and user impact
    UserProfile.BUSINESS_PRODUCT: [
        DashboardWidget(
            widget_id="model_overview",
            widget_type="cards_grid",
            title="AI Features Overview",
            data_source="/api/dashboard/services?service_type=model",
            config={},
            position={"x": 0, "y": 0, "w": 12, "h": 3}
        ),
        DashboardWidget(
            widget_id="user_impact",
            widget_type="bar_chart",
            title="User Experience Impact",
            data_source="/api/metrics/impact/summary",
            config={"field": "impact_by_domain.user_experience"},
            position={"x": 0, "y": 3, "w": 6, "h": 3}
        ),
        DashboardWidget(
            widget_id="conversion_impact",
            widget_type="line_chart",
            title="Revenue Impact Trend",
            data_source="/api/metrics/impact/summary",
            config={"field": "impact_by_domain.revenue"},
            position={"x": 6, "y": 3, "w": 6, "h": 3}
        ),
    ],

    # Security SOC - Focus on threats and incidents
    UserProfile.SECURITY_SOC: [
        DashboardWidget(
            widget_id="security_score",
            widget_type="gauge",
            title="Security Posture",
            data_source="/api/dashboard/compliance",
            config={"field": "categories.access_control.score"},
            position={"x": 0, "y": 0, "w": 3, "h": 2}
        ),
        DashboardWidget(
            widget_id="threat_timeline",
            widget_type="timeline",
            title="Security Events",
            data_source="/api/metrics/anomalies",
            config={"filter": "severity:critical,high"},
            position={"x": 3, "y": 0, "w": 9, "h": 2}
        ),
        DashboardWidget(
            widget_id="incident_table",
            widget_type="table",
            title="Active Incidents",
            data_source="/api/dashboard/overview",
            config={"field": "top_issues", "filterable": True},
            position={"x": 0, "y": 2, "w": 12, "h": 3}
        ),
    ],

    # Compliance/Legal - Focus on governance
    UserProfile.COMPLIANCE_LEGAL: [
        DashboardWidget(
            widget_id="compliance_overview",
            widget_type="compliance_grid",
            title="Compliance Status",
            data_source="/api/dashboard/compliance",
            config={},
            position={"x": 0, "y": 0, "w": 12, "h": 3}
        ),
        DashboardWidget(
            widget_id="audit_findings",
            widget_type="table",
            title="Audit Findings",
            data_source="/api/dashboard/compliance",
            config={"field": "recent_audit_findings"},
            position={"x": 0, "y": 3, "w": 8, "h": 3}
        ),
        DashboardWidget(
            widget_id="regulation_status",
            widget_type="status_cards",
            title="Regulation Compliance",
            data_source="/api/dashboard/compliance",
            config={"field": "regulations"},
            position={"x": 8, "y": 3, "w": 4, "h": 3}
        ),
    ],

    # ESG/Sustainability - Focus on carbon and energy
    UserProfile.SUSTAINABILITY_ESG: [
        DashboardWidget(
            widget_id="carbon_kpi",
            widget_type="kpi_row",
            title="Carbon Metrics",
            data_source="/api/dashboard/carbon",
            config={"metrics": ["total_carbon_kg", "green_energy_pct", "carbon_intensity"]},
            position={"x": 0, "y": 0, "w": 12, "h": 2}
        ),
        DashboardWidget(
            widget_id="carbon_by_activity",
            widget_type="pie_chart",
            title="Carbon by Activity",
            data_source="/api/dashboard/carbon",
            config={"field": "by_activity"},
            position={"x": 0, "y": 2, "w": 4, "h": 3}
        ),
        DashboardWidget(
            widget_id="carbon_by_region",
            widget_type="map",
            title="Carbon by Region",
            data_source="/api/dashboard/carbon",
            config={"field": "by_region"},
            position={"x": 4, "y": 2, "w": 4, "h": 3}
        ),
        DashboardWidget(
            widget_id="recommendations",
            widget_type="list",
            title="Green Recommendations",
            data_source="/api/dashboard/carbon",
            config={"field": "recommendations"},
            position={"x": 8, "y": 2, "w": 4, "h": 3}
        ),
        DashboardWidget(
            widget_id="carbon_trend",
            widget_type="area_chart",
            title="Carbon Trend",
            data_source="/api/metrics/timeseries?metrics=carbon",
            config={"color": "#2ecc71"},
            position={"x": 0, "y": 5, "w": 12, "h": 2}
        ),
    ],
}


# Navigation items per profile
PROFILE_NAVIGATION = {
    UserProfile.TECH_ML_ENGINEER: [
        NavigationItem(id="models", label="Models", icon="cpu", route="/models"),
        NavigationItem(id="drift", label="Drift Detection", icon="activity", route="/drift"),
        NavigationItem(id="reliability", label="Reliability", icon="shield", route="/reliability"),
        NavigationItem(id="experiments", label="Experiments", icon="flask", route="/experiments"),
        NavigationItem(id="causal", label="Causal Analysis", icon="git-branch", route="/causal"),
    ],
    UserProfile.TECH_DEVOPS: [
        NavigationItem(id="services", label="Services", icon="server", route="/services"),
        NavigationItem(id="slo", label="SLO/SLI", icon="target", route="/slo"),
        NavigationItem(id="topology", label="Topology", icon="share-2", route="/topology"),
        NavigationItem(id="alerts", label="Alerts", icon="bell", route="/alerts"),
        NavigationItem(id="logs", label="Logs", icon="file-text", route="/logs"),
    ],
    UserProfile.BUSINESS_EXECUTIVE: [
        NavigationItem(id="overview", label="Overview", icon="home", route="/"),
        NavigationItem(id="impact", label="Business Impact", icon="trending-up", route="/impact"),
        NavigationItem(id="costs", label="Costs", icon="dollar-sign", route="/costs"),
        NavigationItem(id="reports", label="Reports", icon="bar-chart-2", route="/reports"),
    ],
    UserProfile.BUSINESS_PRODUCT: [
        NavigationItem(id="features", label="AI Features", icon="zap", route="/features"),
        NavigationItem(id="performance", label="Performance", icon="activity", route="/performance"),
        NavigationItem(id="user-impact", label="User Impact", icon="users", route="/user-impact"),
    ],
    UserProfile.SECURITY_SOC: [
        NavigationItem(id="security", label="Security", icon="shield", route="/security"),
        NavigationItem(id="incidents", label="Incidents", icon="alert-triangle", route="/incidents"),
        NavigationItem(id="access", label="Access Logs", icon="key", route="/access"),
        NavigationItem(id="threats", label="Threat Detection", icon="alert-octagon", route="/threats"),
    ],
    UserProfile.COMPLIANCE_LEGAL: [
        NavigationItem(id="compliance", label="Compliance", icon="check-square", route="/compliance"),
        NavigationItem(id="audit", label="Audit Trail", icon="clipboard", route="/audit"),
        NavigationItem(id="regulations", label="Regulations", icon="book", route="/regulations"),
        NavigationItem(id="evidence", label="Evidence", icon="folder", route="/evidence"),
    ],
    UserProfile.SUSTAINABILITY_ESG: [
        NavigationItem(id="carbon", label="Carbon", icon="cloud", route="/carbon"),
        NavigationItem(id="energy", label="Energy", icon="zap", route="/energy"),
        NavigationItem(id="sustainability", label="Sustainability", icon="leaf", route="/sustainability"),
        NavigationItem(id="esg-reports", label="ESG Reports", icon="file-text", route="/esg-reports"),
    ],
}


@router.get("/list")
async def list_profiles() -> APIResponse:
    """
    List all available user profiles.
    """
    profiles = [
        {
            "id": p.value,
            "name": p.name.replace("_", " ").title(),
            "category": "technical" if "TECH" in p.name else (
                "business" if "BUSINESS" in p.name else "specialist"
            ),
            "description": _get_profile_description(p)
        }
        for p in UserProfile
    ]

    return APIResponse(success=True, data=profiles)


@router.get("/{profile_id}/dashboard")
async def get_profile_dashboard(profile_id: str) -> APIResponse:
    """
    Get dashboard configuration for a specific profile.
    """
    try:
        profile = UserProfile(profile_id)
    except ValueError:
        return APIResponse(
            success=False,
            error=f"Unknown profile: {profile_id}"
        )

    widgets = PROFILE_WIDGETS.get(profile, [])

    dashboard = ProfileDashboard(
        profile=profile,
        name=_get_profile_name(profile),
        description=_get_profile_description(profile),
        widgets=widgets
    )

    return APIResponse(
        success=True,
        data={
            "profile": dashboard.profile.value,
            "name": dashboard.name,
            "description": dashboard.description,
            "widgets": [
                {
                    "id": w.widget_id,
                    "type": w.widget_type,
                    "title": w.title,
                    "data_source": w.data_source,
                    "config": w.config,
                    "position": w.position
                }
                for w in dashboard.widgets
            ],
            "default_time_range": dashboard.default_time_range,
            "theme": dashboard.theme
        }
    )


@router.get("/{profile_id}/navigation")
async def get_profile_navigation(profile_id: str) -> APIResponse:
    """
    Get navigation menu for a specific profile.
    """
    try:
        profile = UserProfile(profile_id)
    except ValueError:
        return APIResponse(
            success=False,
            error=f"Unknown profile: {profile_id}"
        )

    nav_items = PROFILE_NAVIGATION.get(profile, [])

    return APIResponse(
        success=True,
        data=[
            {
                "id": item.id,
                "label": item.label,
                "icon": item.icon,
                "route": item.route,
                "badge": item.badge
            }
            for item in nav_items
        ]
    )


def _get_profile_name(profile: UserProfile) -> str:
    """Get human-readable profile name"""
    names = {
        UserProfile.TECH_ML_ENGINEER: "ML Engineer",
        UserProfile.TECH_DEVOPS: "DevOps Engineer",
        UserProfile.TECH_DATA_SCIENTIST: "Data Scientist",
        UserProfile.BUSINESS_PRODUCT: "Product Owner",
        UserProfile.BUSINESS_EXECUTIVE: "Executive",
        UserProfile.SECURITY_SOC: "Security Analyst",
        UserProfile.COMPLIANCE_LEGAL: "Compliance Officer",
        UserProfile.SUSTAINABILITY_ESG: "ESG Manager",
    }
    return names.get(profile, profile.name)


def _get_profile_description(profile: UserProfile) -> str:
    """Get profile description"""
    descriptions = {
        UserProfile.TECH_ML_ENGINEER: "Model performance, drift detection, reliability analysis, and cognitive metrics",
        UserProfile.TECH_DEVOPS: "Infrastructure health, SLO/SLI monitoring, service topology, and operational metrics",
        UserProfile.TECH_DATA_SCIENTIST: "Data quality, feature analysis, experiment tracking, and statistical insights",
        UserProfile.BUSINESS_PRODUCT: "AI feature performance, user impact, and product metrics",
        UserProfile.BUSINESS_EXECUTIVE: "High-level KPIs, business impact, costs, and strategic overview",
        UserProfile.SECURITY_SOC: "Security posture, threat detection, incident management, and access monitoring",
        UserProfile.COMPLIANCE_LEGAL: "Regulatory compliance, audit trails, governance status, and evidence management",
        UserProfile.SUSTAINABILITY_ESG: "Carbon footprint, energy consumption, sustainability metrics, and ESG reporting",
    }
    return descriptions.get(profile, "")
