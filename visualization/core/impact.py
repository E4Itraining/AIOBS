"""
AIOBS Impact Analyzer - Business Impact Attribution
Links AI system events to business outcomes
"""

import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Tuple
from uuid import uuid4


class ImpactDomain(Enum):
    """Domains where impact is measured"""

    REVENUE = "revenue"
    COST = "cost"
    USER_EXPERIENCE = "user_experience"
    COMPLIANCE = "compliance"
    REPUTATION = "reputation"
    OPERATIONAL = "operational"
    CARBON = "carbon"


class ImpactSeverity(Enum):
    """Severity levels for impact"""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    POSITIVE = "positive"  # Beneficial impact


@dataclass
class BusinessMetric:
    """A business metric that can be impacted"""

    id: str
    name: str
    domain: ImpactDomain
    current_value: float
    baseline_value: float
    unit: str
    is_higher_better: bool = True


@dataclass
class ImpactVector:
    """Quantified impact on a specific metric"""

    metric_id: str
    metric_name: str
    domain: ImpactDomain
    delta_value: float
    delta_percentage: float
    severity: ImpactSeverity
    confidence: float
    monetary_impact: Optional[float] = None  # In currency units


@dataclass
class ImpactReport:
    """Complete impact analysis report"""

    report_id: str
    trigger_event: str
    trigger_timestamp: datetime
    analysis_window: timedelta

    # Impact breakdown
    impacts: List[ImpactVector]
    total_monetary_impact: float
    primary_domain: ImpactDomain
    overall_severity: ImpactSeverity

    # Attribution
    root_causes: List[str]
    contributing_factors: Dict[str, float]  # factor -> contribution %

    # Recommendations
    recommendations: List[str]
    mitigation_actions: List[str]

    # Metadata
    created_at: datetime = field(default_factory=datetime.utcnow)
    confidence_score: float = 0.0


class ImpactAnalyzer:
    """
    Business Impact Analyzer for AI Systems

    Connects AI events (drift, incidents, changes) to business outcomes:
    - Revenue impact from model degradation
    - Cost impact from resource usage
    - User experience impact from latency/errors
    - Compliance risk from governance violations
    - Carbon impact from infrastructure choices
    """

    # Default monetary conversion rates
    CONVERSION_RATES = {
        ImpactDomain.USER_EXPERIENCE: 10.0,  # $ per UX point
        ImpactDomain.OPERATIONAL: 50.0,  # $ per operational incident
        ImpactDomain.COMPLIANCE: 10000.0,  # $ per compliance violation
        ImpactDomain.REPUTATION: 1000.0,  # $ per reputation point
        ImpactDomain.CARBON: 50.0,  # $ per ton CO2
    }

    def __init__(
        self,
        revenue_per_conversion: float = 100.0,
        cost_per_inference: float = 0.001,
        carbon_cost_per_kg: float = 0.05,
    ):
        self.revenue_per_conversion = revenue_per_conversion
        self.cost_per_inference = cost_per_inference
        self.carbon_cost_per_kg = carbon_cost_per_kg
        self._metrics_registry: Dict[str, BusinessMetric] = {}
        self._initialize_default_metrics()

    def analyze_event_impact(
        self,
        event_type: str,
        event_data: Dict,
        affected_models: List[str],
        time_window_hours: int = 24,
    ) -> ImpactReport:
        """
        Analyze business impact of an AI system event.

        Supported event types:
        - model_drift: Feature/concept/prediction drift
        - model_degradation: Performance degradation
        - cost_anomaly: Unexpected cost increase
        - latency_spike: Response time issues
        - error_rate_increase: Higher error rates
        - security_incident: Security-related events
        - compliance_violation: Governance violations
        """
        report_id = str(uuid4())
        impacts = []

        # Analyze impact based on event type
        if event_type == "model_drift":
            impacts = self._analyze_drift_impact(event_data, affected_models)
        elif event_type == "model_degradation":
            impacts = self._analyze_degradation_impact(event_data, affected_models)
        elif event_type == "cost_anomaly":
            impacts = self._analyze_cost_impact(event_data, affected_models)
        elif event_type == "latency_spike":
            impacts = self._analyze_latency_impact(event_data, affected_models)
        elif event_type == "error_rate_increase":
            impacts = self._analyze_error_impact(event_data, affected_models)
        elif event_type == "security_incident":
            impacts = self._analyze_security_impact(event_data, affected_models)
        elif event_type == "compliance_violation":
            impacts = self._analyze_compliance_impact(event_data, affected_models)
        else:
            impacts = self._analyze_generic_impact(event_data)

        # Calculate totals
        total_monetary = sum(i.monetary_impact for i in impacts if i.monetary_impact)

        # Determine primary domain and severity
        primary_domain = self._determine_primary_domain(impacts)
        overall_severity = self._determine_overall_severity(impacts)

        # Generate recommendations
        recommendations = self._generate_recommendations(event_type, impacts)
        mitigations = self._generate_mitigations(event_type, overall_severity)

        return ImpactReport(
            report_id=report_id,
            trigger_event=event_type,
            trigger_timestamp=datetime.utcnow(),
            analysis_window=timedelta(hours=time_window_hours),
            impacts=impacts,
            total_monetary_impact=total_monetary,
            primary_domain=primary_domain,
            overall_severity=overall_severity,
            root_causes=[event_type],
            contributing_factors=self._compute_contributing_factors(impacts),
            recommendations=recommendations,
            mitigation_actions=mitigations,
            confidence_score=self._compute_confidence(impacts),
        )

    def get_impact_summary(self, time_range_hours: int = 24) -> Dict:
        """
        Get summary of all impacts over a time period.
        For visualization dashboard.
        """
        # Demo data for visualization
        return {
            "time_range_hours": time_range_hours,
            "total_events": 12,
            "total_monetary_impact": 45230.50,
            "impact_by_domain": {
                "revenue": -23500.00,
                "cost": -15730.50,
                "user_experience": -4000.00,
                "compliance": 0,
                "carbon": -2000.00,
            },
            "impact_by_severity": {"critical": 1, "high": 3, "medium": 5, "low": 3},
            "top_affected_models": [
                {"model": "recommendation-v2", "impact": -18500},
                {"model": "fraud-detector-v1", "impact": -12000},
                {"model": "churn-predictor", "impact": -8730},
            ],
            "trend": "improving",  # vs previous period
            "trend_pct": -15,  # 15% less impact than before
        }

    def project_future_impact(self, current_state: Dict, projection_days: int = 7) -> Dict:
        """
        Project future impact based on current trends.
        """
        daily_impact = current_state.get("daily_impact", 5000)

        projections = []
        cumulative = 0

        for day in range(1, projection_days + 1):
            # Apply trend factor
            trend_factor = 1 - (0.1 * day / projection_days)  # Assuming improvement
            day_impact = daily_impact * trend_factor
            cumulative += day_impact

            projections.append(
                {
                    "day": day,
                    "daily_impact": round(day_impact, 2),
                    "cumulative_impact": round(cumulative, 2),
                }
            )

        return {
            "projection_days": projection_days,
            "projections": projections,
            "best_case": round(cumulative * 0.7, 2),
            "expected": round(cumulative, 2),
            "worst_case": round(cumulative * 1.5, 2),
            "confidence": 0.75,
        }

    # =========================================================================
    # Private Analysis Methods
    # =========================================================================

    def _initialize_default_metrics(self):
        """Initialize default business metrics"""
        defaults = [
            BusinessMetric(
                "conversion_rate", "Conversion Rate", ImpactDomain.REVENUE, 0.05, 0.055, "%", True
            ),
            BusinessMetric(
                "daily_revenue", "Daily Revenue", ImpactDomain.REVENUE, 50000, 55000, "$", True
            ),
            BusinessMetric(
                "inference_cost", "Inference Cost", ImpactDomain.COST, 1500, 1200, "$", False
            ),
            BusinessMetric(
                "latency_p99", "P99 Latency", ImpactDomain.USER_EXPERIENCE, 150, 100, "ms", False
            ),
            BusinessMetric(
                "error_rate", "Error Rate", ImpactDomain.OPERATIONAL, 0.02, 0.01, "%", False
            ),
            BusinessMetric(
                "carbon_daily", "Daily Carbon", ImpactDomain.CARBON, 50, 40, "kgCO2", False
            ),
        ]

        for metric in defaults:
            self._metrics_registry[metric.id] = metric

    def _analyze_drift_impact(self, event_data: Dict, models: List[str]) -> List[ImpactVector]:
        """Analyze impact of drift events"""
        impacts = []
        drift_severity = event_data.get("drift_severity", 0.5)

        # Revenue impact from degraded predictions
        revenue_delta = -self.revenue_per_conversion * 1000 * drift_severity
        impacts.append(
            ImpactVector(
                metric_id="conversion_rate",
                metric_name="Conversion Rate",
                domain=ImpactDomain.REVENUE,
                delta_value=-0.005 * drift_severity,
                delta_percentage=-10 * drift_severity,
                severity=self._severity_from_score(drift_severity),
                confidence=0.75,
                monetary_impact=revenue_delta,
            )
        )

        # UX impact
        impacts.append(
            ImpactVector(
                metric_id="user_satisfaction",
                metric_name="User Satisfaction",
                domain=ImpactDomain.USER_EXPERIENCE,
                delta_value=-5 * drift_severity,
                delta_percentage=-5 * drift_severity,
                severity=ImpactSeverity.MEDIUM,
                confidence=0.6,
                monetary_impact=-500 * drift_severity,
            )
        )

        return impacts

    def _analyze_degradation_impact(
        self, event_data: Dict, models: List[str]
    ) -> List[ImpactVector]:
        """Analyze impact of model degradation"""
        degradation_pct = event_data.get("degradation_pct", 15)

        return [
            ImpactVector(
                metric_id="daily_revenue",
                metric_name="Daily Revenue",
                domain=ImpactDomain.REVENUE,
                delta_value=-2500 * (degradation_pct / 10),
                delta_percentage=-degradation_pct,
                severity=self._severity_from_percentage(degradation_pct),
                confidence=0.8,
                monetary_impact=-2500 * (degradation_pct / 10),
            )
        ]

    def _analyze_cost_impact(self, event_data: Dict, models: List[str]) -> List[ImpactVector]:
        """Analyze impact of cost anomalies"""
        cost_increase_pct = event_data.get("cost_increase_pct", 50)

        return [
            ImpactVector(
                metric_id="inference_cost",
                metric_name="Inference Cost",
                domain=ImpactDomain.COST,
                delta_value=1500 * (cost_increase_pct / 100),
                delta_percentage=cost_increase_pct,
                severity=self._severity_from_percentage(cost_increase_pct),
                confidence=0.95,
                monetary_impact=1500 * (cost_increase_pct / 100),
            )
        ]

    def _analyze_latency_impact(self, event_data: Dict, models: List[str]) -> List[ImpactVector]:
        """Analyze impact of latency spikes"""
        latency_increase_ms = event_data.get("latency_increase_ms", 100)

        # Every 100ms latency costs ~1% conversions
        conversion_loss_pct = latency_increase_ms / 100

        return [
            ImpactVector(
                metric_id="latency_p99",
                metric_name="P99 Latency",
                domain=ImpactDomain.USER_EXPERIENCE,
                delta_value=latency_increase_ms,
                delta_percentage=latency_increase_ms,
                severity=(
                    ImpactSeverity.HIGH if latency_increase_ms > 200 else ImpactSeverity.MEDIUM
                ),
                confidence=0.85,
                monetary_impact=-self.revenue_per_conversion * 100 * (conversion_loss_pct / 100),
            )
        ]

    def _analyze_error_impact(self, event_data: Dict, models: List[str]) -> List[ImpactVector]:
        """Analyze impact of error rate increases"""
        error_rate_delta = event_data.get("error_rate_delta", 0.05)

        return [
            ImpactVector(
                metric_id="error_rate",
                metric_name="Error Rate",
                domain=ImpactDomain.OPERATIONAL,
                delta_value=error_rate_delta,
                delta_percentage=error_rate_delta * 100,
                severity=ImpactSeverity.CRITICAL if error_rate_delta > 0.1 else ImpactSeverity.HIGH,
                confidence=0.9,
                monetary_impact=-5000 * error_rate_delta * 10,
            )
        ]

    def _analyze_security_impact(self, event_data: Dict, models: List[str]) -> List[ImpactVector]:
        """Analyze impact of security incidents"""
        return [
            ImpactVector(
                metric_id="security_score",
                metric_name="Security Posture",
                domain=ImpactDomain.REPUTATION,
                delta_value=-0.2,
                delta_percentage=-20,
                severity=ImpactSeverity.CRITICAL,
                confidence=0.7,
                monetary_impact=-50000,
            )
        ]

    def _analyze_compliance_impact(self, event_data: Dict, models: List[str]) -> List[ImpactVector]:
        """Analyze impact of compliance violations"""
        return [
            ImpactVector(
                metric_id="compliance_score",
                metric_name="Compliance Status",
                domain=ImpactDomain.COMPLIANCE,
                delta_value=-1,
                delta_percentage=-100,
                severity=ImpactSeverity.CRITICAL,
                confidence=0.95,
                monetary_impact=-100000,  # Potential fine
            )
        ]

    def _analyze_generic_impact(self, event_data: Dict) -> List[ImpactVector]:
        """Fallback generic impact analysis"""
        return [
            ImpactVector(
                metric_id="operational",
                metric_name="Operational Status",
                domain=ImpactDomain.OPERATIONAL,
                delta_value=-1,
                delta_percentage=-10,
                severity=ImpactSeverity.LOW,
                confidence=0.5,
                monetary_impact=-1000,
            )
        ]

    def _severity_from_score(self, score: float) -> ImpactSeverity:
        """Convert 0-1 score to severity"""
        if score >= 0.8:
            return ImpactSeverity.CRITICAL
        elif score >= 0.6:
            return ImpactSeverity.HIGH
        elif score >= 0.3:
            return ImpactSeverity.MEDIUM
        else:
            return ImpactSeverity.LOW

    def _severity_from_percentage(self, pct: float) -> ImpactSeverity:
        """Convert percentage change to severity"""
        if pct >= 50:
            return ImpactSeverity.CRITICAL
        elif pct >= 25:
            return ImpactSeverity.HIGH
        elif pct >= 10:
            return ImpactSeverity.MEDIUM
        else:
            return ImpactSeverity.LOW

    def _determine_primary_domain(self, impacts: List[ImpactVector]) -> ImpactDomain:
        """Determine which domain has the most impact"""
        if not impacts:
            return ImpactDomain.OPERATIONAL

        domain_totals = {}
        for impact in impacts:
            if impact.monetary_impact:
                domain_totals[impact.domain] = domain_totals.get(impact.domain, 0) + abs(
                    impact.monetary_impact
                )

        if not domain_totals:
            return impacts[0].domain

        return max(domain_totals, key=domain_totals.get)

    def _determine_overall_severity(self, impacts: List[ImpactVector]) -> ImpactSeverity:
        """Determine overall severity from individual impacts"""
        if not impacts:
            return ImpactSeverity.LOW

        severity_order = [
            ImpactSeverity.CRITICAL,
            ImpactSeverity.HIGH,
            ImpactSeverity.MEDIUM,
            ImpactSeverity.LOW,
            ImpactSeverity.POSITIVE,
        ]

        for sev in severity_order:
            if any(i.severity == sev for i in impacts):
                return sev

        return ImpactSeverity.LOW

    def _compute_contributing_factors(self, impacts: List[ImpactVector]) -> Dict[str, float]:
        """Compute contribution of each factor"""
        if not impacts:
            return {}

        total = sum(abs(i.monetary_impact or 0) for i in impacts)
        if total == 0:
            return {i.metric_name: 1.0 / len(impacts) for i in impacts}

        return {i.metric_name: abs(i.monetary_impact or 0) / total for i in impacts}

    def _compute_confidence(self, impacts: List[ImpactVector]) -> float:
        """Compute overall confidence score"""
        if not impacts:
            return 0.5

        return sum(i.confidence for i in impacts) / len(impacts)

    def _generate_recommendations(self, event_type: str, impacts: List[ImpactVector]) -> List[str]:
        """Generate recommendations based on impact analysis"""
        recommendations = {
            "model_drift": [
                "Investigate upstream data changes",
                "Consider retraining with recent data",
                "Enable drift monitoring alerts",
            ],
            "model_degradation": [
                "Review recent model changes",
                "Check for data quality issues",
                "Consider rollback to previous version",
            ],
            "cost_anomaly": [
                "Review auto-scaling configuration",
                "Analyze traffic patterns",
                "Consider cost-optimized model variants",
            ],
            "latency_spike": [
                "Check infrastructure health",
                "Review model complexity",
                "Consider caching strategies",
            ],
            "error_rate_increase": [
                "Review error logs for patterns",
                "Check input validation",
                "Enable circuit breakers",
            ],
            "security_incident": [
                "Isolate affected systems",
                "Review access logs",
                "Enable enhanced monitoring",
            ],
            "compliance_violation": [
                "Document incident thoroughly",
                "Engage compliance team",
                "Implement preventive controls",
            ],
        }

        return recommendations.get(event_type, ["Monitor situation closely"])

    def _generate_mitigations(self, event_type: str, severity: ImpactSeverity) -> List[str]:
        """Generate mitigation actions based on severity"""
        if severity == ImpactSeverity.CRITICAL:
            return [
                "Escalate to incident response team",
                "Consider service degradation or failover",
                "Notify stakeholders immediately",
            ]
        elif severity == ImpactSeverity.HIGH:
            return ["Create incident ticket", "Begin root cause analysis", "Prepare rollback plan"]
        else:
            return ["Add to monitoring watchlist", "Schedule review in next standup"]
