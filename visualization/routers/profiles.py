"""
AIOBS Profile-based Navigation Router
Adaptive UI based on user profiles (tech/non-tech)
"""
from typing import List, Optional
from fastapi import APIRouter, Query, Request
from enum import Enum

from ..models.schemas import (
    APIResponse, UserProfile, DashboardWidget, ProfileDashboard, NavigationItem
)
from ..i18n.translations import get_translator

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


# Widget configurations per profile type
PROFILE_WIDGETS = {
    # Technical ML Engineer - Focus on model metrics, drift, reliability, and cognitive metrics
    UserProfile.TECH_ML_ENGINEER: [
        # Row 1: KPI Overview
        DashboardWidget(
            widget_id="ml_kpi_overview",
            widget_type="kpi_row",
            title="Model Health Overview",
            data_source="/api/dashboard/overview",
            config={"metrics": ["trust_score", "model_accuracy", "drift_status", "inference_count"]},
            position={"x": 0, "y": 0, "w": 12, "h": 2}
        ),
        # Row 2: Trust & Drift
        DashboardWidget(
            widget_id="trust_gauge",
            widget_type="gauge",
            title="Trust Score",
            data_source="/api/metrics/trust/{model_id}",
            config={"min": 0, "max": 1, "thresholds": [0.6, 0.8], "animate": True},
            position={"x": 0, "y": 2, "w": 3, "h": 2}
        ),
        DashboardWidget(
            widget_id="drift_chart",
            widget_type="line_chart",
            title="Drift Detection Timeline",
            data_source="/api/metrics/timeseries?metrics=data_drift,concept_drift,feature_drift",
            config={"colors": ["#ff6b6b", "#feca57", "#48dbfb"], "show_anomalies": True},
            position={"x": 3, "y": 2, "w": 6, "h": 2}
        ),
        DashboardWidget(
            widget_id="reliability_breakdown",
            widget_type="radar_chart",
            title="Reliability Analysis",
            data_source="/api/metrics/cognitive/{model_id}",
            config={"metrics": ["calibration", "stability", "uncertainty", "ood", "robustness"]},
            position={"x": 9, "y": 2, "w": 3, "h": 2}
        ),
        # Row 3: Cognitive Metrics & Performance
        DashboardWidget(
            widget_id="cognitive_metrics",
            widget_type="cards_grid",
            title="Cognitive Metrics",
            data_source="/api/metrics/cognitive/{model_id}",
            config={"cards": ["hallucination_risk", "confidence_calibration", "uncertainty_quantification", "ood_detection"]},
            position={"x": 0, "y": 4, "w": 4, "h": 3}
        ),
        DashboardWidget(
            widget_id="model_performance",
            widget_type="multi_line",
            title="Model Performance Trends",
            data_source="/api/metrics/timeseries?metrics=latency_p99,throughput,error_rate,accuracy",
            config={"show_predictions": True},
            position={"x": 4, "y": 4, "w": 5, "h": 3}
        ),
        DashboardWidget(
            widget_id="causal_graph",
            widget_type="graph",
            title="Causal Analysis",
            data_source="/api/metrics/causal/graph/drift_incident",
            config={"layout": "hierarchical", "interactive": True},
            position={"x": 9, "y": 4, "w": 3, "h": 3}
        ),
        # Row 4: Model Inventory & Experiments
        DashboardWidget(
            widget_id="model_inventory",
            widget_type="table",
            title="Active Models",
            data_source="/api/dashboard/services?service_type=model",
            config={"sortable": True, "filterable": True, "columns": ["name", "version", "status", "trust_score", "drift_status"]},
            position={"x": 0, "y": 7, "w": 6, "h": 3}
        ),
        DashboardWidget(
            widget_id="experiment_tracker",
            widget_type="timeline",
            title="Recent Experiments & Deployments",
            data_source="/api/experiments",
            config={"show_status": True, "clickable": True},
            position={"x": 6, "y": 7, "w": 6, "h": 3}
        ),
    ],

    # Data Scientist - Focus on data quality, experiments, statistics, and model analysis
    UserProfile.TECH_DATA_SCIENTIST: [
        # Row 1: KPI Overview
        DashboardWidget(
            widget_id="ds_kpi_overview",
            widget_type="kpi_row",
            title="Data & Experiment Overview",
            data_source="/api/metrics/data_quality",
            config={"metrics": ["data_quality_score", "active_experiments", "model_count", "feature_count"]},
            position={"x": 0, "y": 0, "w": 12, "h": 2}
        ),
        # Row 2: Data Quality
        DashboardWidget(
            widget_id="data_quality_overview",
            widget_type="cards_grid",
            title="Data Quality Metrics",
            data_source="/api/metrics/data_quality",
            config={"cards": ["completeness", "accuracy", "freshness", "consistency", "uniqueness", "validity"]},
            position={"x": 0, "y": 2, "w": 6, "h": 3}
        ),
        DashboardWidget(
            widget_id="data_quality_trend",
            widget_type="multi_line",
            title="Data Quality Trends",
            data_source="/api/metrics/timeseries?metrics=completeness,accuracy,freshness",
            config={"colors": ["#10b981", "#6366f1", "#f59e0b"]},
            position={"x": 6, "y": 2, "w": 6, "h": 3}
        ),
        # Row 3: Feature Analysis
        DashboardWidget(
            widget_id="feature_drift",
            widget_type="heatmap",
            title="Feature Drift Heatmap",
            data_source="/api/metrics/drift",
            config={"view": "features", "color_scale": "red_yellow_green"},
            position={"x": 0, "y": 5, "w": 8, "h": 3}
        ),
        DashboardWidget(
            widget_id="feature_importance",
            widget_type="bar_chart",
            title="Feature Importance",
            data_source="/api/metrics/features/importance",
            config={"horizontal": True, "sorted": True},
            position={"x": 8, "y": 5, "w": 4, "h": 3}
        ),
        # Row 4: Experiments & Statistics
        DashboardWidget(
            widget_id="experiment_tracker",
            widget_type="table",
            title="Active Experiments & A/B Tests",
            data_source="/api/experiments",
            config={"sortable": True, "filterable": True, "columns": ["name", "status", "start_date", "p_value", "effect_size", "winner"]},
            position={"x": 0, "y": 8, "w": 6, "h": 3}
        ),
        DashboardWidget(
            widget_id="statistical_summary",
            widget_type="stats_grid",
            title="Statistical Insights",
            data_source="/api/metrics/statistics",
            config={"show_confidence_intervals": True},
            position={"x": 6, "y": 8, "w": 6, "h": 3}
        ),
        # Row 5: Model Comparison & Distribution
        DashboardWidget(
            widget_id="model_comparison",
            widget_type="comparison_chart",
            title="Model Performance Comparison",
            data_source="/api/metrics/models/compare",
            config={"metrics": ["accuracy", "precision", "recall", "f1", "latency", "cost"]},
            position={"x": 0, "y": 11, "w": 6, "h": 3}
        ),
        DashboardWidget(
            widget_id="prediction_distribution",
            widget_type="histogram",
            title="Prediction Distribution",
            data_source="/api/metrics/predictions/distribution",
            config={"bins": 50, "show_density": True},
            position={"x": 6, "y": 11, "w": 6, "h": 3}
        ),
    ],

    # DevOps Engineer - Focus on infrastructure, SLOs, service health, and operations
    UserProfile.TECH_DEVOPS: [
        # Row 1: KPI Overview
        DashboardWidget(
            widget_id="devops_kpi_overview",
            widget_type="kpi_row",
            title="Infrastructure Overview",
            data_source="/api/dashboard/overview",
            config={"metrics": ["slo_compliance", "uptime_percent", "active_incidents", "deployment_frequency"]},
            position={"x": 0, "y": 0, "w": 12, "h": 2}
        ),
        # Row 2: SLO Status Cards
        DashboardWidget(
            widget_id="slo_status",
            widget_type="slo_cards",
            title="SLO/SLI Status",
            data_source="/api/dashboard/slo",
            config={"show_budget": True, "show_trend": True},
            position={"x": 0, "y": 2, "w": 12, "h": 2}
        ),
        # Row 3: Topology & Health
        DashboardWidget(
            widget_id="service_topology",
            widget_type="topology",
            title="Service Topology & Dependencies",
            data_source="/api/dashboard/topology",
            config={"layout": "force", "highlight_issues": True, "show_latency": True},
            position={"x": 0, "y": 4, "w": 6, "h": 4}
        ),
        DashboardWidget(
            widget_id="services_health",
            widget_type="table",
            title="Services Health Status",
            data_source="/api/dashboard/services",
            config={"sortable": True, "filterable": True, "columns": ["name", "status", "uptime", "error_rate", "latency_p99", "last_deploy"]},
            position={"x": 6, "y": 4, "w": 6, "h": 4}
        ),
        # Row 4: Performance Metrics
        DashboardWidget(
            widget_id="latency_chart",
            widget_type="multi_line",
            title="Latency Trends (P50, P95, P99)",
            data_source="/api/metrics/timeseries?metrics=latency_p50,latency_p95,latency_p99",
            config={"colors": ["#10b981", "#f59e0b", "#ef4444"], "show_anomalies": True},
            position={"x": 0, "y": 8, "w": 4, "h": 3}
        ),
        DashboardWidget(
            widget_id="error_rate",
            widget_type="area_chart",
            title="Error Rate by Service",
            data_source="/api/metrics/timeseries?metrics=error_rate",
            config={"color": "#ff6b6b", "stacked": True},
            position={"x": 4, "y": 8, "w": 4, "h": 3}
        ),
        DashboardWidget(
            widget_id="throughput_chart",
            widget_type="area_chart",
            title="Request Throughput",
            data_source="/api/metrics/timeseries?metrics=throughput",
            config={"color": "#6366f1"},
            position={"x": 8, "y": 8, "w": 4, "h": 3}
        ),
        # Row 5: Alerts & Deployments
        DashboardWidget(
            widget_id="active_alerts",
            widget_type="table",
            title="Active Alerts & Incidents",
            data_source="/api/dashboard/overview",
            config={"field": "top_issues", "sortable": True, "show_actions": True},
            position={"x": 0, "y": 11, "w": 6, "h": 3}
        ),
        DashboardWidget(
            widget_id="deployment_history",
            widget_type="timeline",
            title="Recent Deployments",
            data_source="/api/dashboard/deployments",
            config={"show_status": True, "show_rollbacks": True},
            position={"x": 6, "y": 11, "w": 6, "h": 3}
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

    # Product Owner - Focus on AI features, user experience, and business impact
    UserProfile.BUSINESS_PRODUCT: [
        # Row 1: KPI Overview
        DashboardWidget(
            widget_id="po_kpi_overview",
            widget_type="kpi_row",
            title="Product AI Metrics",
            data_source="/api/dashboard/overview",
            config={"metrics": ["active_ai_features", "user_satisfaction", "feature_adoption", "conversion_lift"]},
            position={"x": 0, "y": 0, "w": 12, "h": 2}
        ),
        # Row 2: AI Features Overview
        DashboardWidget(
            widget_id="model_overview",
            widget_type="cards_grid",
            title="AI Features Portfolio",
            data_source="/api/dashboard/services?service_type=model",
            config={"show_status": True, "show_metrics": ["usage", "satisfaction", "reliability"]},
            position={"x": 0, "y": 2, "w": 8, "h": 3}
        ),
        DashboardWidget(
            widget_id="feature_health",
            widget_type="gauge",
            title="Overall Feature Health",
            data_source="/api/metrics/trust/{model_id}",
            config={"min": 0, "max": 100, "thresholds": [60, 80]},
            position={"x": 8, "y": 2, "w": 4, "h": 3}
        ),
        # Row 3: User Impact & Experience
        DashboardWidget(
            widget_id="user_impact",
            widget_type="bar_chart",
            title="User Experience Impact",
            data_source="/api/metrics/impact/summary",
            config={"field": "impact_by_domain.user_experience", "horizontal": True},
            position={"x": 0, "y": 5, "w": 6, "h": 3}
        ),
        DashboardWidget(
            widget_id="user_satisfaction_trend",
            widget_type="line_chart",
            title="User Satisfaction Trend",
            data_source="/api/metrics/timeseries?metrics=user_satisfaction,nps_score",
            config={"colors": ["#10b981", "#6366f1"]},
            position={"x": 6, "y": 5, "w": 6, "h": 3}
        ),
        # Row 4: Business Impact
        DashboardWidget(
            widget_id="conversion_impact",
            widget_type="multi_line",
            title="Conversion & Revenue Impact",
            data_source="/api/metrics/impact/summary",
            config={"field": "impact_by_domain.revenue", "show_baseline": True},
            position={"x": 0, "y": 8, "w": 6, "h": 3}
        ),
        DashboardWidget(
            widget_id="feature_adoption",
            widget_type="funnel",
            title="Feature Adoption Funnel",
            data_source="/api/metrics/adoption",
            config={"stages": ["exposed", "engaged", "adopted", "retained"]},
            position={"x": 6, "y": 8, "w": 6, "h": 3}
        ),
        # Row 5: Feature Performance & Roadmap
        DashboardWidget(
            widget_id="feature_performance",
            widget_type="table",
            title="Feature Performance Metrics",
            data_source="/api/dashboard/services?service_type=model",
            config={"columns": ["feature", "usage", "satisfaction", "reliability", "business_impact"], "sortable": True},
            position={"x": 0, "y": 11, "w": 6, "h": 3}
        ),
        DashboardWidget(
            widget_id="ab_test_results",
            widget_type="table",
            title="A/B Test Results",
            data_source="/api/experiments",
            config={"filter": "type:ab_test", "columns": ["name", "variant", "lift", "confidence", "status"]},
            position={"x": 6, "y": 11, "w": 6, "h": 3}
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

    # DSI (CIO) - Strategic IT governance and AI portfolio
    UserProfile.GOVERNANCE_DSI: [
        DashboardWidget(
            widget_id="strategic_kpi",
            widget_type="kpi_row",
            title="Strategic KPIs",
            data_source="/api/dashboard/overview",
            config={"metrics": ["ai_portfolio_health", "total_tco", "digital_maturity", "roi_index"]},
            position={"x": 0, "y": 0, "w": 12, "h": 2}
        ),
        DashboardWidget(
            widget_id="ai_portfolio",
            widget_type="portfolio_grid",
            title="AI Systems Portfolio",
            data_source="/api/dashboard/services",
            config={"view": "strategic", "group_by": "business_domain"},
            position={"x": 0, "y": 2, "w": 8, "h": 3}
        ),
        DashboardWidget(
            widget_id="budget_allocation",
            widget_type="sankey",
            title="IT Budget Allocation",
            data_source="/api/dashboard/costs",
            config={"field": "by_domain"},
            position={"x": 8, "y": 2, "w": 4, "h": 3}
        ),
        DashboardWidget(
            widget_id="risk_matrix",
            widget_type="heatmap",
            title="IT Risk Matrix",
            data_source="/api/dashboard/compliance",
            config={"axes": ["probability", "impact"]},
            position={"x": 0, "y": 5, "w": 6, "h": 3}
        ),
        DashboardWidget(
            widget_id="governance_score",
            widget_type="gauge",
            title="IT Governance Score",
            data_source="/api/dashboard/compliance",
            config={"field": "governance_score"},
            position={"x": 6, "y": 5, "w": 3, "h": 3}
        ),
        DashboardWidget(
            widget_id="transformation_roadmap",
            widget_type="timeline",
            title="Digital Transformation",
            data_source="/api/dashboard/roadmap",
            config={"view": "strategic"},
            position={"x": 9, "y": 5, "w": 3, "h": 3}
        ),
    ],

    # RSI - Operational IT management
    UserProfile.GOVERNANCE_RSI: [
        DashboardWidget(
            widget_id="ops_kpi",
            widget_type="kpi_row",
            title="Operational KPIs",
            data_source="/api/dashboard/overview",
            config={"metrics": ["systems_uptime", "incidents_open", "sla_compliance", "team_capacity"]},
            position={"x": 0, "y": 0, "w": 12, "h": 2}
        ),
        DashboardWidget(
            widget_id="systems_status",
            widget_type="status_grid",
            title="AI Systems Status",
            data_source="/api/dashboard/services",
            config={"sortable": True, "show_health": True},
            position={"x": 0, "y": 2, "w": 8, "h": 3}
        ),
        DashboardWidget(
            widget_id="incidents_overview",
            widget_type="table",
            title="Active Incidents",
            data_source="/api/dashboard/overview",
            config={"field": "top_issues", "priority_sort": True},
            position={"x": 8, "y": 2, "w": 4, "h": 3}
        ),
        DashboardWidget(
            widget_id="project_tracker",
            widget_type="kanban",
            title="AI Projects Status",
            data_source="/api/dashboard/projects",
            config={"columns": ["backlog", "in_progress", "review", "done"]},
            position={"x": 0, "y": 5, "w": 8, "h": 3}
        ),
        DashboardWidget(
            widget_id="resource_allocation",
            widget_type="bar_chart",
            title="Team Allocation",
            data_source="/api/dashboard/resources",
            config={"stacked": True},
            position={"x": 8, "y": 5, "w": 4, "h": 3}
        ),
    ],

    # DPO - Data Protection Officer
    UserProfile.PRIVACY_DPO: [
        DashboardWidget(
            widget_id="privacy_kpi",
            widget_type="kpi_row",
            title="Privacy KPIs",
            data_source="/api/dashboard/privacy",
            config={"metrics": ["gdpr_score", "data_breaches", "dsar_pending", "consent_rate"]},
            position={"x": 0, "y": 0, "w": 12, "h": 2}
        ),
        DashboardWidget(
            widget_id="processing_registry",
            widget_type="table",
            title="AI Processing Activities Registry",
            data_source="/api/dashboard/privacy",
            config={"field": "processing_activities", "filterable": True},
            position={"x": 0, "y": 2, "w": 8, "h": 3}
        ),
        DashboardWidget(
            widget_id="dpia_status",
            widget_type="status_cards",
            title="DPIA Status",
            data_source="/api/dashboard/privacy",
            config={"field": "dpia_assessments"},
            position={"x": 8, "y": 2, "w": 4, "h": 3}
        ),
        DashboardWidget(
            widget_id="dsar_tracker",
            widget_type="timeline",
            title="Data Subject Requests",
            data_source="/api/dashboard/privacy",
            config={"field": "dsar_requests", "show_deadlines": True},
            position={"x": 0, "y": 5, "w": 6, "h": 3}
        ),
        DashboardWidget(
            widget_id="data_flows",
            widget_type="sankey",
            title="Personal Data Flows",
            data_source="/api/dashboard/privacy",
            config={"field": "data_transfers"},
            position={"x": 6, "y": 5, "w": 6, "h": 3}
        ),
        DashboardWidget(
            widget_id="retention_compliance",
            widget_type="bar_chart",
            title="Data Retention Compliance",
            data_source="/api/dashboard/privacy",
            config={"field": "retention_status"},
            position={"x": 0, "y": 8, "w": 12, "h": 2}
        ),
    ],

    # Legal Counsel - Juriste
    UserProfile.LEGAL_COUNSEL: [
        DashboardWidget(
            widget_id="legal_kpi",
            widget_type="kpi_row",
            title="Legal Risk KPIs",
            data_source="/api/dashboard/legal",
            config={"metrics": ["legal_risk_score", "pending_reviews", "contract_compliance", "liability_exposure"]},
            position={"x": 0, "y": 0, "w": 12, "h": 2}
        ),
        DashboardWidget(
            widget_id="ai_risk_assessment",
            widget_type="risk_matrix",
            title="AI Legal Risk Assessment",
            data_source="/api/dashboard/legal",
            config={"categories": ["bias", "discrimination", "liability", "ip", "transparency"]},
            position={"x": 0, "y": 2, "w": 6, "h": 3}
        ),
        DashboardWidget(
            widget_id="regulatory_watch",
            widget_type="timeline",
            title="Regulatory Watch",
            data_source="/api/dashboard/legal",
            config={"field": "regulatory_updates", "filter": ["eu_ai_act", "gdpr", "sector_specific"]},
            position={"x": 6, "y": 2, "w": 6, "h": 3}
        ),
        DashboardWidget(
            widget_id="contract_tracker",
            widget_type="table",
            title="AI Contracts & SLAs",
            data_source="/api/dashboard/legal",
            config={"field": "contracts", "show_alerts": True},
            position={"x": 0, "y": 5, "w": 8, "h": 3}
        ),
        DashboardWidget(
            widget_id="ip_portfolio",
            widget_type="cards_grid",
            title="AI IP Portfolio",
            data_source="/api/dashboard/legal",
            config={"field": "intellectual_property"},
            position={"x": 8, "y": 5, "w": 4, "h": 3}
        ),
        DashboardWidget(
            widget_id="litigation_risk",
            widget_type="gauge",
            title="Litigation Risk Index",
            data_source="/api/dashboard/legal",
            config={"field": "litigation_risk"},
            position={"x": 0, "y": 8, "w": 4, "h": 2}
        ),
        DashboardWidget(
            widget_id="eu_ai_act_compliance",
            widget_type="compliance_grid",
            title="EU AI Act Compliance",
            data_source="/api/dashboard/compliance",
            config={"framework": "eu_ai_act", "detailed": True},
            position={"x": 4, "y": 8, "w": 8, "h": 2}
        ),
    ],
}


# Navigation items per profile (labels are i18n keys like nav.models)
PROFILE_NAVIGATION = {
    UserProfile.TECH_ML_ENGINEER: [
        NavigationItem(id="models", label="nav.models", icon="cpu", route="/models"),
        NavigationItem(id="drift", label="nav.drift", icon="activity", route="/drift"),
        NavigationItem(id="reliability", label="nav.reliability", icon="shield", route="/reliability"),
        NavigationItem(id="experiments", label="nav.experiments", icon="flask", route="/experiments"),
        NavigationItem(id="causal", label="nav.causal_analysis", icon="git-branch", route="/causal"),
    ],
    UserProfile.TECH_DATA_SCIENTIST: [
        NavigationItem(id="data-quality", label="nav.data_quality", icon="database", route="/data-quality"),
        NavigationItem(id="features", label="nav.features", icon="layers", route="/features"),
        NavigationItem(id="experiments", label="nav.experiments", icon="flask", route="/experiments"),
        NavigationItem(id="statistics", label="nav.statistics", icon="bar-chart-2", route="/statistics"),
        NavigationItem(id="models", label="nav.models", icon="cpu", route="/models"),
    ],
    UserProfile.TECH_DEVOPS: [
        NavigationItem(id="services", label="nav.services", icon="server", route="/services"),
        NavigationItem(id="slo", label="nav.slo", icon="target", route="/slo"),
        NavigationItem(id="topology", label="nav.topology", icon="share-2", route="/topology"),
        NavigationItem(id="alerts", label="nav.alerts", icon="bell", route="/alerts"),
        NavigationItem(id="logs", label="nav.logs", icon="file-text", route="/logs"),
    ],
    UserProfile.BUSINESS_EXECUTIVE: [
        NavigationItem(id="overview", label="nav.overview", icon="home", route="/"),
        NavigationItem(id="impact", label="nav.impact", icon="trending-up", route="/impact"),
        NavigationItem(id="costs", label="nav.costs", icon="dollar-sign", route="/costs"),
        NavigationItem(id="reports", label="nav.reports", icon="bar-chart-2", route="/reports"),
    ],
    UserProfile.BUSINESS_PRODUCT: [
        NavigationItem(id="features", label="nav.features", icon="zap", route="/features"),
        NavigationItem(id="performance", label="nav.performance", icon="activity", route="/performance"),
        NavigationItem(id="user-impact", label="nav.user_impact", icon="users", route="/user-impact"),
    ],
    UserProfile.SECURITY_SOC: [
        NavigationItem(id="security", label="nav.security", icon="shield", route="/security"),
        NavigationItem(id="incidents", label="nav.incidents", icon="alert-triangle", route="/incidents"),
        NavigationItem(id="access", label="nav.access_logs", icon="key", route="/access"),
        NavigationItem(id="threats", label="nav.threats", icon="alert-octagon", route="/threats"),
    ],
    UserProfile.COMPLIANCE_LEGAL: [
        NavigationItem(id="compliance", label="nav.compliance", icon="check-square", route="/compliance"),
        NavigationItem(id="audit", label="nav.audit_trail", icon="clipboard", route="/audit"),
        NavigationItem(id="regulations", label="nav.regulations", icon="book", route="/regulations"),
        NavigationItem(id="evidence", label="nav.evidence", icon="folder", route="/evidence"),
    ],
    UserProfile.SUSTAINABILITY_ESG: [
        NavigationItem(id="carbon", label="nav.carbon", icon="cloud", route="/carbon"),
        NavigationItem(id="energy", label="nav.energy", icon="zap", route="/energy"),
        NavigationItem(id="sustainability", label="nav.sustainability", icon="leaf", route="/sustainability"),
        NavigationItem(id="esg-reports", label="nav.esg_reports", icon="file-text", route="/esg-reports"),
    ],
    UserProfile.GOVERNANCE_DSI: [
        NavigationItem(id="portfolio", label="nav.ai_portfolio", icon="grid", route="/portfolio"),
        NavigationItem(id="governance", label="nav.governance", icon="landmark", route="/governance"),
        NavigationItem(id="budget", label="nav.budget", icon="wallet", route="/budget"),
        NavigationItem(id="risks", label="nav.risks", icon="alert-triangle", route="/risks"),
        NavigationItem(id="transformation", label="nav.transformation", icon="refresh-cw", route="/transformation"),
        NavigationItem(id="executive-reports", label="nav.executive_reports", icon="file-text", route="/executive-reports"),
    ],
    UserProfile.GOVERNANCE_RSI: [
        NavigationItem(id="systems", label="nav.systems", icon="server", route="/systems"),
        NavigationItem(id="projects", label="nav.projects", icon="folder-kanban", route="/projects"),
        NavigationItem(id="incidents", label="nav.incidents", icon="alert-circle", route="/incidents"),
        NavigationItem(id="resources", label="nav.resources", icon="users", route="/resources"),
        NavigationItem(id="sla", label="nav.sla_monitoring", icon="target", route="/sla"),
        NavigationItem(id="ops-reports", label="nav.ops_reports", icon="clipboard-list", route="/ops-reports"),
    ],
    UserProfile.PRIVACY_DPO: [
        NavigationItem(id="privacy-dashboard", label="nav.privacy_dashboard", icon="shield", route="/privacy"),
        NavigationItem(id="processing-registry", label="nav.processing_registry", icon="database", route="/processing-registry"),
        NavigationItem(id="dpia", label="nav.dpia", icon="file-search", route="/dpia"),
        NavigationItem(id="dsar", label="nav.dsar", icon="user-check", route="/dsar"),
        NavigationItem(id="data-flows", label="nav.data_flows", icon="share-2", route="/data-flows"),
        NavigationItem(id="privacy-incidents", label="nav.privacy_incidents", icon="alert-triangle", route="/privacy-incidents"),
    ],
    UserProfile.LEGAL_COUNSEL: [
        NavigationItem(id="legal-dashboard", label="nav.legal_dashboard", icon="scale", route="/legal"),
        NavigationItem(id="contracts", label="nav.contracts", icon="file-signature", route="/contracts"),
        NavigationItem(id="regulatory", label="nav.regulatory_watch", icon="book-open", route="/regulatory"),
        NavigationItem(id="ip", label="nav.intellectual_property", icon="lightbulb", route="/ip"),
        NavigationItem(id="liability", label="nav.liability", icon="shield-alert", route="/liability"),
        NavigationItem(id="legal-reports", label="nav.legal_reports", icon="file-text", route="/legal-reports"),
    ],
}


def _get_profile_category(profile: UserProfile) -> str:
    """Get profile category for grouping"""
    if "TECH" in profile.name:
        return "technical"
    elif "BUSINESS" in profile.name:
        return "business"
    elif "GOVERNANCE" in profile.name:
        return "governance"
    elif "PRIVACY" in profile.name or "LEGAL" in profile.name:
        return "legal_privacy"
    else:
        return "specialist"


@router.get("/list")
async def list_profiles() -> APIResponse:
    """
    List all available user profiles.
    """
    profiles = [
        {
            "id": p.value,
            "name": _get_profile_name(p),
            "category": _get_profile_category(p),
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
async def get_profile_navigation(profile_id: str, request: Request) -> APIResponse:
    """
    Get navigation menu for a specific profile.
    Labels are translated based on the current language.
    """
    try:
        profile = UserProfile(profile_id)
    except ValueError:
        return APIResponse(
            success=False,
            error=f"Unknown profile: {profile_id}"
        )

    nav_items = PROFILE_NAVIGATION.get(profile, [])

    # Get current language from request state (set by i18n middleware)
    lang = getattr(request.state, 'language', 'en')
    translator = get_translator()

    return APIResponse(
        success=True,
        data=[
            {
                "id": item.id,
                "label": translator.get(item.label, lang),
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
        UserProfile.GOVERNANCE_DSI: "CIO / DSI",
        UserProfile.GOVERNANCE_RSI: "IT Manager / RSI",
        UserProfile.PRIVACY_DPO: "Data Protection Officer",
        UserProfile.LEGAL_COUNSEL: "Legal Counsel",
    }
    return names.get(profile, profile.name)


def _get_profile_description(profile: UserProfile) -> str:
    """Get profile description"""
    descriptions = {
        UserProfile.TECH_ML_ENGINEER: "Model health monitoring, multi-drift detection (data, concept, feature), cognitive metrics, reliability analysis, and causal root cause investigation",
        UserProfile.TECH_DEVOPS: "SLO/SLI monitoring with error budgets, service topology visualization, performance metrics (P50-P99 latency), alerts management, and deployment tracking",
        UserProfile.TECH_DATA_SCIENTIST: "Data quality monitoring (completeness, accuracy, freshness), feature drift heatmaps, A/B experiments with statistical analysis, and model performance comparison",
        UserProfile.BUSINESS_PRODUCT: "AI features portfolio, user experience impact metrics, adoption funnels, A/B test results, satisfaction trends, and business impact tracking",
        UserProfile.BUSINESS_EXECUTIVE: "High-level KPIs, business impact analysis, cost distribution, and strategic overview with trust trends",
        UserProfile.SECURITY_SOC: "Security posture scoring, threat detection timeline, incident management, and access monitoring",
        UserProfile.COMPLIANCE_LEGAL: "Regulatory compliance dashboard, audit findings, and regulation status tracking",
        UserProfile.SUSTAINABILITY_ESG: "Carbon metrics tracking, energy consumption, sustainability by region/activity, and green recommendations",
        UserProfile.GOVERNANCE_DSI: "Strategic IT governance, AI portfolio management, budget allocation (Sankey), risk matrix, and digital transformation roadmap",
        UserProfile.GOVERNANCE_RSI: "Operational IT management, systems status, kanban project tracking, incidents management, and team resource allocation",
        UserProfile.PRIVACY_DPO: "GDPR compliance dashboard, processing registry, DPIA status, data subject requests with deadlines, and personal data flow visualization",
        UserProfile.LEGAL_COUNSEL: "Legal risk assessment matrix, regulatory watch timeline, AI contracts tracking, IP portfolio, and EU AI Act compliance",
    }
    return descriptions.get(profile, "")
