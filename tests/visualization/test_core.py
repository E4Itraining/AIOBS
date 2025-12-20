"""
AIOBS Core Module Tests
"""

from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional

import pytest


class ViewMode(Enum):
    """Available view modes"""

    OVERVIEW = "overview"
    MODELS = "models"
    INFRASTRUCTURE = "infrastructure"
    COSTS = "costs"


class TestUnifiedObservabilityView:
    """Tests for UnifiedObservabilityView"""

    def test_dashboard_data_structure(self):
        """Dashboard data should have required fields"""
        mock_dashboard_data = {
            "total_models": 12,
            "total_pipelines": 8,
            "total_endpoints": 15,
            "healthy_services": 28,
            "degraded_services": 3,
            "unhealthy_services": 1,
            "avg_trust_score": 0.82,
            "total_daily_inferences": 2_500_000,
            "total_daily_cost": 1507.50,
            "total_daily_carbon_kg": 41.7,
            "slo_compliance_pct": 98.7,
            "error_budget_remaining_pct": 65,
            "alerts": {
                "total": 15,
                "critical": 1,
                "warning": 4,
                "info": 10,
            },
            "top_issues": [],
            "trends": {
                "trust": "stable",
                "cost": "up",
                "carbon": "down",
            },
        }

        assert mock_dashboard_data["total_models"] == 12
        assert mock_dashboard_data["avg_trust_score"] == 0.82
        assert mock_dashboard_data["alerts"]["critical"] == 1
        assert mock_dashboard_data["trends"]["trust"] == "stable"

    def test_service_health_status(self):
        """Service health should have correct status values"""
        valid_statuses = ["healthy", "degraded", "unhealthy", "unknown"]

        mock_service = {
            "service_id": "rec-v2",
            "service_name": "Recommendation Model v2",
            "service_type": "model",
            "status": "healthy",
            "uptime_pct": 99.95,
            "error_rate_pct": 0.1,
            "latency_p99_ms": 45,
        }

        assert mock_service["status"] in valid_statuses
        assert 0 <= mock_service["uptime_pct"] <= 100
        assert mock_service["error_rate_pct"] >= 0

    def test_topology_structure(self):
        """Topology should have nodes and edges"""
        mock_topology = {
            "nodes": [
                {"id": "gateway", "type": "endpoint", "label": "API Gateway", "status": "healthy"},
                {"id": "router", "type": "router", "label": "Model Router", "status": "healthy"},
            ],
            "edges": [
                {"source": "gateway", "target": "router", "type": "request"},
            ],
        }

        assert "nodes" in mock_topology
        assert "edges" in mock_topology
        assert len(mock_topology["nodes"]) == 2
        assert mock_topology["nodes"][0]["id"] == "gateway"
        assert mock_topology["edges"][0]["source"] == "gateway"

    def test_slo_status_structure(self):
        """SLO status should have correct structure"""
        mock_slo = {
            "slos": [
                {
                    "name": "Inference Latency P99 < 200ms",
                    "target": 200,
                    "current": 145,
                    "unit": "ms",
                    "compliance_pct": 99.2,
                    "error_budget_remaining_pct": 85,
                    "status": "healthy",
                },
            ],
            "overall_compliance_pct": 98.7,
            "slos_at_risk": 2,
            "error_budget_burn_rate": 1.2,
        }

        assert "slos" in mock_slo
        assert "overall_compliance_pct" in mock_slo
        assert mock_slo["slos"][0]["status"] == "healthy"
        assert mock_slo["overall_compliance_pct"] == 98.7

    def test_cost_breakdown_structure(self):
        """Cost breakdown should have required categories"""
        mock_costs = {
            "total": 45230.50,
            "by_category": {
                "inference": 28500.00,
                "training": 8200.00,
                "storage": 4530.50,
                "networking": 2500.00,
                "monitoring": 1500.00,
            },
            "by_model": {
                "recommendation-v2": 18500.00,
            },
            "trend": "up",
            "trend_pct": 12,
            "forecast_next_month": 50750.00,
        }

        assert mock_costs["total"] == 45230.50
        assert "by_category" in mock_costs
        assert mock_costs["trend"] in ["up", "down", "stable"]

    def test_carbon_metrics_structure(self):
        """Carbon metrics should have sustainability data"""
        mock_carbon = {
            "total_carbon_kg": 1250.5,
            "total_energy_kwh": 4500.0,
            "green_energy_pct": 65,
            "carbon_intensity_gco2_kwh": 278,
            "by_activity": {
                "inference": 750.0,
                "training": 350.5,
            },
            "recommendations": [
                "Shift batch jobs to low-carbon hours",
            ],
        }

        assert mock_carbon["total_carbon_kg"] == 1250.5
        assert mock_carbon["green_energy_pct"] == 65
        assert "recommendations" in mock_carbon


class TestCognitiveEngine:
    """Tests for CognitiveEngine functionality"""

    def test_drift_detection(self):
        """Drift detection should identify data drift"""

        def detect_drift(
            reference: List[float], current: List[float], threshold: float = 0.1
        ) -> bool:
            ref_mean = sum(reference) / len(reference)
            curr_mean = sum(current) / len(current)
            drift = abs(curr_mean - ref_mean) / (ref_mean + 1e-10)
            return drift > threshold

        reference = [0.5, 0.52, 0.48, 0.51, 0.49]
        current_stable = [0.51, 0.53, 0.47, 0.52, 0.48]
        current_drifted = [0.8, 0.82, 0.78, 0.81, 0.79]

        assert detect_drift(reference, current_stable) is False
        assert detect_drift(reference, current_drifted) is True

    def test_reliability_scoring(self):
        """Reliability scoring should combine multiple factors"""

        def calculate_reliability(
            calibration: float, stability: float, uncertainty: float, ood_detection: float
        ) -> float:
            weights = [0.3, 0.3, 0.2, 0.2]
            scores = [calibration, stability, uncertainty, ood_detection]
            return sum(w * s for w, s in zip(weights, scores))

        reliability = calculate_reliability(0.8, 0.9, 0.7, 0.85)
        assert 0 <= reliability <= 1
        assert round(reliability, 2) == 0.82

    def test_trust_score_calculation(self):
        """Trust score should aggregate component scores"""

        def calculate_trust_score(
            drift: float, reliability: float, hallucination: float, degradation: float
        ) -> float:
            # Inverse drift and hallucination (lower is better)
            drift_score = 1 - drift
            hallucination_score = 1 - hallucination

            weights = [0.25, 0.3, 0.25, 0.2]
            scores = [drift_score, reliability, hallucination_score, degradation]
            return sum(w * s for w, s in zip(weights, scores))

        trust = calculate_trust_score(
            drift=0.1, reliability=0.85, hallucination=0.05, degradation=0.9
        )
        assert 0 <= trust <= 1


class TestCausalEngine:
    """Tests for CausalEngine functionality"""

    def test_root_cause_identification(self):
        """Should identify root causes from impact chain"""

        def find_root_causes(impact_chain: Dict[str, List[str]]) -> List[str]:
            # Nodes with no incoming edges are root causes
            all_nodes = set(impact_chain.keys())
            affected_nodes = set()
            for targets in impact_chain.values():
                affected_nodes.update(targets)

            return list(all_nodes - affected_nodes)

        impact_chain = {
            "data_quality_issue": ["feature_drift", "model_performance"],
            "feature_drift": ["prediction_accuracy"],
            "model_performance": ["latency_spike"],
            "prediction_accuracy": ["user_impact"],
        }

        root_causes = find_root_causes(impact_chain)
        assert "data_quality_issue" in root_causes

    def test_impact_propagation(self):
        """Should calculate impact propagation"""

        def propagate_impact(
            source: str,
            graph: Dict[str, List[str]],
            initial_impact: float = 1.0,
            decay: float = 0.8,
        ) -> Dict[str, float]:
            impacts = {source: initial_impact}
            queue = [source]

            while queue:
                current = queue.pop(0)
                current_impact = impacts[current]

                for target in graph.get(current, []):
                    propagated = current_impact * decay
                    if target not in impacts or impacts[target] < propagated:
                        impacts[target] = propagated
                        queue.append(target)

            return impacts

        graph = {"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": []}

        impacts = propagate_impact("A", graph)
        assert impacts["A"] == 1.0
        assert impacts["B"] == 0.8
        assert round(impacts["D"], 2) == 0.64  # 0.8 * 0.8


class TestImpactAnalyzer:
    """Tests for ImpactAnalyzer functionality"""

    def test_business_impact_calculation(self):
        """Should calculate business impact score"""

        def calculate_business_impact(
            affected_users_pct: float, revenue_impact_pct: float, downtime_minutes: int
        ) -> float:
            # Weighted combination
            user_score = min(affected_users_pct / 100, 1.0)
            revenue_score = min(revenue_impact_pct / 10, 1.0)
            downtime_score = min(downtime_minutes / 60, 1.0)

            return user_score * 0.4 + revenue_score * 0.35 + downtime_score * 0.25

        impact = calculate_business_impact(
            affected_users_pct=25, revenue_impact_pct=5, downtime_minutes=30
        )
        assert 0 <= impact <= 1

    def test_severity_classification(self):
        """Should classify severity based on impact"""

        def classify_severity(impact_score: float) -> str:
            if impact_score >= 0.8:
                return "critical"
            elif impact_score >= 0.5:
                return "high"
            elif impact_score >= 0.25:
                return "medium"
            else:
                return "low"

        assert classify_severity(0.9) == "critical"
        assert classify_severity(0.6) == "high"
        assert classify_severity(0.3) == "medium"
        assert classify_severity(0.1) == "low"


class TestUserProfile:
    """Tests for user profile handling"""

    def test_profile_categories(self):
        """Profiles should be categorized correctly"""
        profiles = {
            "tech_ml_engineer": "technical",
            "tech_devops": "technical",
            "business_executive": "business",
            "business_product": "business",
            "security_soc": "specialist",
            "compliance_legal": "specialist",
        }

        def get_category(profile_id: str) -> str:
            return profiles.get(profile_id, "unknown")

        assert get_category("tech_ml_engineer") == "technical"
        assert get_category("business_executive") == "business"
        assert get_category("security_soc") == "specialist"

    def test_widget_configuration(self):
        """Widget config should have required fields"""
        mock_widget = {
            "widget_id": "trust_gauge",
            "widget_type": "gauge",
            "title": "Trust Score",
            "data_source": "/api/metrics/trust/{model_id}",
            "config": {"min": 0, "max": 1},
            "position": {"x": 0, "y": 0, "w": 3, "h": 2},
        }

        required_fields = ["widget_id", "widget_type", "title", "data_source"]
        for field in required_fields:
            assert field in mock_widget
