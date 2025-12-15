"""
AIOBS Business Impact Tests
Tests for impact analysis, cost estimation, and business metrics
"""
import pytest
import math
import random
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
from enum import Enum


# =============================================================================
# Business Impact Implementation
# =============================================================================

class ImpactDomain(Enum):
    REVENUE = "revenue"
    COST = "cost"
    USER_EXPERIENCE = "user_experience"
    COMPLIANCE = "compliance"
    REPUTATION = "reputation"
    OPERATIONAL = "operational"
    CARBON = "carbon"


class ImpactSeverity(Enum):
    NEGLIGIBLE = "negligible"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class BusinessMetric:
    """Business metric affected by an event"""
    name: str
    domain: ImpactDomain
    baseline_value: float
    current_value: float
    unit: str
    trend: str  # up, down, stable


@dataclass
class ImpactVector:
    """Multi-dimensional impact vector"""
    revenue_impact: float = 0.0  # $ lost/gained
    cost_impact: float = 0.0  # $ additional cost
    user_impact: float = 0.0  # % users affected
    compliance_impact: float = 0.0  # 0-1 severity
    reputation_impact: float = 0.0  # 0-1 severity
    operational_impact: float = 0.0  # 0-1 severity
    carbon_impact: float = 0.0  # kg CO2


@dataclass
class ImpactReport:
    """Complete impact report"""
    event_id: str
    timestamp: datetime
    severity: ImpactSeverity
    impact_vector: ImpactVector
    affected_metrics: List[BusinessMetric]
    total_cost: float
    recommendations: List[str]


class ImpactAnalyzer:
    """Analyzes business impact of events"""

    # Severity thresholds
    SEVERITY_THRESHOLDS = {
        ImpactSeverity.NEGLIGIBLE: 0.1,
        ImpactSeverity.LOW: 0.25,
        ImpactSeverity.MEDIUM: 0.5,
        ImpactSeverity.HIGH: 0.75,
        ImpactSeverity.CRITICAL: 1.0,
    }

    # Cost per user affected per hour
    COST_PER_USER_HOUR = 0.50

    # Domain weights for overall impact
    DOMAIN_WEIGHTS = {
        ImpactDomain.REVENUE: 0.25,
        ImpactDomain.COST: 0.20,
        ImpactDomain.USER_EXPERIENCE: 0.20,
        ImpactDomain.COMPLIANCE: 0.15,
        ImpactDomain.REPUTATION: 0.10,
        ImpactDomain.OPERATIONAL: 0.05,
        ImpactDomain.CARBON: 0.05,
    }

    def __init__(self, revenue_per_hour: float = 10000.0):
        self.revenue_per_hour = revenue_per_hour

    def analyze_event_impact(
        self,
        event: Dict[str, Any],
        duration_hours: float = 1.0,
        affected_users_pct: float = 0.0
    ) -> ImpactReport:
        """
        Analyze the business impact of an event.
        """
        impact_vector = ImpactVector()

        # Revenue impact
        if event.get("type") == "outage":
            impact_vector.revenue_impact = self.revenue_per_hour * duration_hours
        elif event.get("type") == "degradation":
            impact_vector.revenue_impact = self.revenue_per_hour * duration_hours * 0.3

        # Cost impact
        impact_vector.cost_impact = self._estimate_remediation_cost(event)

        # User impact
        impact_vector.user_impact = affected_users_pct

        # Compliance impact
        if event.get("compliance_violation"):
            impact_vector.compliance_impact = event.get("compliance_severity", 0.5)

        # Reputation impact
        if affected_users_pct > 10:
            impact_vector.reputation_impact = min(1.0, affected_users_pct / 50)

        # Operational impact
        impact_vector.operational_impact = self._estimate_operational_impact(event)

        # Carbon impact
        if event.get("type") == "resource_spike":
            impact_vector.carbon_impact = self._estimate_carbon_impact(event, duration_hours)

        # Calculate severity
        severity = self._calculate_severity(impact_vector)

        # Generate recommendations
        recommendations = self._generate_recommendations(event, impact_vector, severity)

        # Calculate total cost
        total_cost = (
            impact_vector.revenue_impact +
            impact_vector.cost_impact +
            (impact_vector.user_impact / 100 * 1000000 * self.COST_PER_USER_HOUR * duration_hours)
        )

        return ImpactReport(
            event_id=event.get("id", "unknown"),
            timestamp=datetime.utcnow(),
            severity=severity,
            impact_vector=impact_vector,
            affected_metrics=[],
            total_cost=total_cost,
            recommendations=recommendations
        )

    def _estimate_remediation_cost(self, event: Dict) -> float:
        """Estimate cost to remediate the event"""
        base_cost = 500  # Base engineering cost

        severity_multipliers = {
            "critical": 10,
            "error": 5,
            "warning": 2,
            "info": 1
        }

        multiplier = severity_multipliers.get(event.get("severity", "info"), 1)
        return base_cost * multiplier

    def _estimate_operational_impact(self, event: Dict) -> float:
        """Estimate operational impact (0-1)"""
        if event.get("type") == "outage":
            return 1.0
        elif event.get("type") == "degradation":
            return 0.5
        elif event.get("type") == "error":
            return 0.3
        return 0.1

    def _estimate_carbon_impact(self, event: Dict, duration_hours: float) -> float:
        """Estimate carbon impact in kg CO2"""
        # Average server: 0.5 kg CO2 per hour
        base_carbon = 0.5
        resource_multiplier = event.get("resource_multiplier", 1.0)
        return base_carbon * resource_multiplier * duration_hours

    def _calculate_severity(self, impact: ImpactVector) -> ImpactSeverity:
        """Calculate overall severity from impact vector"""
        # Normalize impacts to 0-1 scale
        normalized = {
            ImpactDomain.REVENUE: min(1.0, impact.revenue_impact / 100000),
            ImpactDomain.COST: min(1.0, impact.cost_impact / 10000),
            ImpactDomain.USER_EXPERIENCE: impact.user_impact / 100,
            ImpactDomain.COMPLIANCE: impact.compliance_impact,
            ImpactDomain.REPUTATION: impact.reputation_impact,
            ImpactDomain.OPERATIONAL: impact.operational_impact,
            ImpactDomain.CARBON: min(1.0, impact.carbon_impact / 100),
        }

        # Weighted average
        overall = sum(
            normalized[domain] * weight
            for domain, weight in self.DOMAIN_WEIGHTS.items()
        )

        # Map to severity
        for severity, threshold in sorted(
            self.SEVERITY_THRESHOLDS.items(),
            key=lambda x: x[1]
        ):
            if overall <= threshold:
                return severity

        return ImpactSeverity.CRITICAL

    def _generate_recommendations(
        self,
        event: Dict,
        impact: ImpactVector,
        severity: ImpactSeverity
    ) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []

        if severity in (ImpactSeverity.HIGH, ImpactSeverity.CRITICAL):
            recommendations.append("Immediate escalation to on-call team required")

        if impact.revenue_impact > 10000:
            recommendations.append("Consider business continuity activation")

        if impact.user_impact > 50:
            recommendations.append("Prepare customer communication")

        if impact.compliance_impact > 0.5:
            recommendations.append("Notify compliance team")

        if impact.carbon_impact > 10:
            recommendations.append("Review resource optimization opportunities")

        if not recommendations:
            recommendations.append("Continue monitoring")

        return recommendations

    def project_future_impact(
        self,
        current_impact: ImpactVector,
        duration_hours: float,
        trend: str = "stable"
    ) -> ImpactVector:
        """Project future impact based on current state and trend"""
        multipliers = {
            "improving": 0.5,
            "stable": 1.0,
            "degrading": 2.0
        }

        multiplier = multipliers.get(trend, 1.0) * (duration_hours / 1.0)

        return ImpactVector(
            revenue_impact=current_impact.revenue_impact * multiplier,
            cost_impact=current_impact.cost_impact * multiplier,
            user_impact=min(100, current_impact.user_impact * multiplier),
            compliance_impact=min(1.0, current_impact.compliance_impact * multiplier),
            reputation_impact=min(1.0, current_impact.reputation_impact * multiplier),
            operational_impact=min(1.0, current_impact.operational_impact * multiplier),
            carbon_impact=current_impact.carbon_impact * multiplier
        )


# =============================================================================
# Business Impact Tests
# =============================================================================

class TestImpactCalculation:
    """Tests for impact calculation"""

    @pytest.fixture
    def analyzer(self):
        return ImpactAnalyzer(revenue_per_hour=10000)

    def test_outage_revenue_impact(self, analyzer):
        """Outage should calculate full revenue loss"""
        event = {"id": "e1", "type": "outage", "severity": "critical"}

        report = analyzer.analyze_event_impact(event, duration_hours=2.0)

        assert report.impact_vector.revenue_impact == 20000  # 2 hours * $10k

    def test_degradation_partial_impact(self, analyzer):
        """Degradation should calculate partial revenue loss"""
        event = {"id": "e1", "type": "degradation", "severity": "error"}

        report = analyzer.analyze_event_impact(event, duration_hours=2.0)

        assert report.impact_vector.revenue_impact == 6000  # 30% of full

    def test_user_impact_calculation(self, analyzer):
        """User impact should be recorded"""
        event = {"id": "e1", "type": "error"}

        report = analyzer.analyze_event_impact(event, affected_users_pct=25.0)

        assert report.impact_vector.user_impact == 25.0

    def test_compliance_impact(self, analyzer):
        """Compliance violation should be captured"""
        event = {
            "id": "e1",
            "type": "security",
            "compliance_violation": True,
            "compliance_severity": 0.8
        }

        report = analyzer.analyze_event_impact(event)

        assert report.impact_vector.compliance_impact == 0.8

    def test_reputation_impact_threshold(self, analyzer):
        """Reputation impact should trigger above threshold"""
        # Below threshold
        report1 = analyzer.analyze_event_impact(
            {"id": "e1", "type": "error"},
            affected_users_pct=5.0
        )
        assert report1.impact_vector.reputation_impact == 0.0

        # Above threshold
        report2 = analyzer.analyze_event_impact(
            {"id": "e2", "type": "error"},
            affected_users_pct=25.0
        )
        assert report2.impact_vector.reputation_impact == 0.5


class TestSeverityClassification:
    """Tests for severity classification"""

    @pytest.fixture
    def analyzer(self):
        return ImpactAnalyzer()

    def test_negligible_severity(self, analyzer):
        """Minor event should be negligible"""
        event = {"id": "e1", "type": "info", "severity": "info"}
        report = analyzer.analyze_event_impact(event)

        assert report.severity == ImpactSeverity.NEGLIGIBLE

    def test_critical_severity(self, analyzer):
        """Major outage should be critical"""
        event = {
            "id": "e1",
            "type": "outage",
            "severity": "critical",
            "compliance_violation": True,
            "compliance_severity": 0.9
        }
        report = analyzer.analyze_event_impact(
            event,
            duration_hours=5.0,
            affected_users_pct=80.0
        )

        assert report.severity in (ImpactSeverity.HIGH, ImpactSeverity.CRITICAL)

    @pytest.mark.parametrize("user_pct,expected_min_severity", [
        (0, ImpactSeverity.NEGLIGIBLE),
        (10, ImpactSeverity.LOW),
        (50, ImpactSeverity.MEDIUM),
        (90, ImpactSeverity.HIGH),
    ])
    def test_severity_scales_with_users(self, analyzer, user_pct, expected_min_severity):
        """Severity should scale with affected users"""
        event = {"id": "e1", "type": "degradation"}
        report = analyzer.analyze_event_impact(event, affected_users_pct=user_pct)

        severity_order = list(ImpactSeverity)
        assert severity_order.index(report.severity) >= severity_order.index(expected_min_severity)


class TestCostEstimation:
    """Tests for cost estimation"""

    @pytest.fixture
    def analyzer(self):
        return ImpactAnalyzer(revenue_per_hour=50000)

    def test_total_cost_calculation(self, analyzer):
        """Total cost should combine all factors"""
        event = {"id": "e1", "type": "outage", "severity": "critical"}

        report = analyzer.analyze_event_impact(
            event,
            duration_hours=1.0,
            affected_users_pct=10.0
        )

        # Should include revenue + remediation + user cost
        assert report.total_cost > 50000  # At least revenue impact

    def test_remediation_cost_by_severity(self, analyzer):
        """Remediation cost should vary by severity"""
        critical_event = {"id": "e1", "type": "error", "severity": "critical"}
        info_event = {"id": "e2", "type": "info", "severity": "info"}

        critical_cost = analyzer._estimate_remediation_cost(critical_event)
        info_cost = analyzer._estimate_remediation_cost(info_event)

        assert critical_cost > info_cost

    def test_carbon_impact_calculation(self, analyzer):
        """Carbon impact should be calculated for resource spikes"""
        event = {"id": "e1", "type": "resource_spike", "resource_multiplier": 5.0}

        report = analyzer.analyze_event_impact(event, duration_hours=2.0)

        # 0.5 kg base * 5 multiplier * 2 hours = 5 kg
        assert report.impact_vector.carbon_impact == 5.0


class TestRecommendations:
    """Tests for recommendation generation"""

    @pytest.fixture
    def analyzer(self):
        return ImpactAnalyzer()

    def test_escalation_for_critical(self, analyzer):
        """Critical events should recommend escalation"""
        event = {"id": "e1", "type": "outage", "severity": "critical"}
        report = analyzer.analyze_event_impact(
            event,
            duration_hours=10.0,
            affected_users_pct=90.0
        )

        assert any("escalation" in r.lower() for r in report.recommendations)

    def test_customer_comms_for_high_user_impact(self, analyzer):
        """High user impact should recommend customer communication"""
        event = {"id": "e1", "type": "degradation"}
        report = analyzer.analyze_event_impact(event, affected_users_pct=75.0)

        assert any("customer" in r.lower() or "communication" in r.lower()
                   for r in report.recommendations)

    def test_compliance_notification(self, analyzer):
        """Compliance violations should notify compliance team"""
        event = {
            "id": "e1",
            "type": "security",
            "compliance_violation": True,
            "compliance_severity": 0.8
        }
        report = analyzer.analyze_event_impact(event)

        assert any("compliance" in r.lower() for r in report.recommendations)


class TestFutureProjection:
    """Tests for future impact projection"""

    @pytest.fixture
    def analyzer(self):
        return ImpactAnalyzer()

    def test_improving_trend_reduces_impact(self, analyzer):
        """Improving trend should reduce projected impact"""
        current = ImpactVector(
            revenue_impact=10000,
            user_impact=50.0
        )

        projected = analyzer.project_future_impact(current, duration_hours=2.0, trend="improving")

        assert projected.revenue_impact < current.revenue_impact * 2

    def test_degrading_trend_increases_impact(self, analyzer):
        """Degrading trend should increase projected impact"""
        current = ImpactVector(
            revenue_impact=10000,
            user_impact=20.0
        )

        projected = analyzer.project_future_impact(current, duration_hours=2.0, trend="degrading")

        assert projected.revenue_impact > current.revenue_impact * 2

    def test_stable_trend_linear_projection(self, analyzer):
        """Stable trend should project linearly"""
        current = ImpactVector(revenue_impact=10000)

        projected = analyzer.project_future_impact(current, duration_hours=2.0, trend="stable")

        assert projected.revenue_impact == 20000

    def test_user_impact_capped_at_100(self, analyzer):
        """User impact should not exceed 100%"""
        current = ImpactVector(user_impact=60.0)

        projected = analyzer.project_future_impact(current, duration_hours=10.0, trend="degrading")

        assert projected.user_impact <= 100


# =============================================================================
# SLO/SLI Impact Tests
# =============================================================================

class TestSLOImpact:
    """Tests for SLO/SLI impact analysis"""

    def test_error_budget_burn(self):
        """Should calculate error budget burn rate"""
        def calculate_burn_rate(
            errors: int,
            requests: int,
            slo_target: float,
            window_hours: float
        ) -> float:
            """Calculate error budget burn rate"""
            if requests == 0:
                return 0.0

            error_rate = errors / requests
            allowed_error_rate = 1 - slo_target

            if allowed_error_rate == 0:
                return float('inf') if error_rate > 0 else 0.0

            # Burn rate = actual error rate / allowed error rate
            return (error_rate / allowed_error_rate)

        # Example: SLO 99.9%, actual 99.7%
        burn_rate = calculate_burn_rate(
            errors=300,
            requests=100000,
            slo_target=0.999,
            window_hours=1
        )

        assert burn_rate == 3.0  # 3x normal burn rate

    def test_slo_compliance_score(self):
        """Should calculate SLO compliance"""
        def calculate_compliance(
            actual_value: float,
            target_value: float,
            metric_type: str = "availability"
        ) -> float:
            """Calculate SLO compliance (0-1)"""
            if metric_type in ("availability", "success_rate"):
                # Higher is better
                if target_value == 0:
                    return 1.0
                return min(1.0, actual_value / target_value)
            else:
                # Lower is better (e.g., latency)
                if actual_value == 0:
                    return 1.0
                return min(1.0, target_value / actual_value)

        # Availability SLO
        compliance1 = calculate_compliance(99.5, 99.9, "availability")
        assert compliance1 < 1.0

        # Latency SLO (target: 100ms, actual: 150ms)
        compliance2 = calculate_compliance(150, 100, "latency")
        assert compliance2 < 1.0

    def test_error_budget_remaining(self):
        """Should calculate remaining error budget"""
        def calculate_remaining_budget(
            slo_target: float,
            current_success_rate: float,
            period_elapsed_pct: float
        ) -> float:
            """Calculate remaining error budget percentage"""
            total_budget = 1 - slo_target  # e.g., 0.1% for 99.9%
            budget_used = (1 - current_success_rate) * period_elapsed_pct / 100

            if total_budget == 0:
                return 0.0

            remaining = max(0, (total_budget - budget_used) / total_budget * 100)
            return remaining

        # 99.9% SLO, 99.95% actual, 50% through period
        remaining = calculate_remaining_budget(0.999, 0.9995, 50)
        assert remaining > 50  # Should have more than half remaining


# =============================================================================
# Cost Optimization Tests
# =============================================================================

class TestCostOptimization:
    """Tests for cost optimization recommendations"""

    def test_identify_cost_anomalies(self):
        """Should identify cost anomalies"""
        historical_costs = [100, 105, 98, 102, 101, 103, 99, 200]  # Last one is anomaly

        def detect_cost_anomaly(costs: List[float], threshold: float = 2.0) -> List[int]:
            """Detect cost anomalies using z-score"""
            if len(costs) < 3:
                return []

            mean = sum(costs) / len(costs)
            variance = sum((c - mean) ** 2 for c in costs) / len(costs)
            std = math.sqrt(variance)

            if std == 0:
                return []

            anomalies = []
            for i, cost in enumerate(costs):
                z_score = abs((cost - mean) / std)
                if z_score > threshold:
                    anomalies.append(i)

            return anomalies

        anomalies = detect_cost_anomaly(historical_costs)
        assert 7 in anomalies  # Last element is anomaly

    def test_cost_savings_opportunity(self):
        """Should identify cost savings opportunities"""
        resource_usage = {
            "cpu_avg_pct": 20,  # Low utilization
            "memory_avg_pct": 85,
            "gpu_avg_pct": 5,  # Very low
        }

        def identify_savings(usage: Dict[str, float], threshold: float = 30) -> List[str]:
            """Identify underutilized resources"""
            savings = []
            for resource, utilization in usage.items():
                if utilization < threshold:
                    savings.append(f"Consider downsizing {resource.split('_')[0]}")
            return savings

        savings = identify_savings(resource_usage)
        assert len(savings) == 2  # CPU and GPU underutilized


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
