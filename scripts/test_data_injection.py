#!/usr/bin/env python3
"""
AIOBS Test Data Injection Script
Injects realistic test data into the AIOBS platform for demonstration and testing.

Usage:
    python scripts/test_data_injection.py                    # Full injection
    python scripts/test_data_injection.py --dry-run          # Preview without injection
    python scripts/test_data_injection.py --metrics-only     # Only inject metrics
    python scripts/test_data_injection.py --days 7           # Generate 7 days of history
    python scripts/test_data_injection.py --models 3         # Generate data for 3 models
"""

import argparse
import asyncio
import hashlib
import json
import math
import random
import sys
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import httpx

# Default configuration
DEFAULT_BASE_URL = "http://localhost:8000"
DEFAULT_DAYS = 7
DEFAULT_MODELS = 5


# =============================================================================
# Data Models
# =============================================================================


@dataclass
class ModelConfig:
    """Configuration for a simulated AI model"""

    model_id: str
    model_name: str
    model_type: str
    domain: str
    baseline_latency_ms: float
    baseline_throughput: float
    baseline_error_rate: float
    drift_tendency: float = 0.1  # How likely to drift
    cost_per_inference: float = 0.001


# Sample AI models to simulate
SAMPLE_MODELS = [
    ModelConfig(
        model_id="fraud-detector-v1",
        model_name="Fraud Detection Model v1",
        model_type="classification",
        domain="fintech",
        baseline_latency_ms=85,
        baseline_throughput=1800,
        baseline_error_rate=0.001,
        drift_tendency=0.15,
        cost_per_inference=0.002,
    ),
    ModelConfig(
        model_id="recommendation-v2",
        model_name="Recommendation Engine v2",
        model_type="ranking",
        domain="ecommerce",
        baseline_latency_ms=42,
        baseline_throughput=3200,
        baseline_error_rate=0.0002,
        drift_tendency=0.08,
        cost_per_inference=0.001,
    ),
    ModelConfig(
        model_id="churn-predictor-v1",
        model_name="Customer Churn Predictor",
        model_type="classification",
        domain="retention",
        baseline_latency_ms=35,
        baseline_throughput=950,
        baseline_error_rate=0.0005,
        drift_tendency=0.12,
        cost_per_inference=0.0015,
    ),
    ModelConfig(
        model_id="llm-assistant-v1",
        model_name="LLM Chat Assistant",
        model_type="generative",
        domain="customer_support",
        baseline_latency_ms=1200,
        baseline_throughput=120,
        baseline_error_rate=0.005,
        drift_tendency=0.05,
        cost_per_inference=0.015,
    ),
    ModelConfig(
        model_id="code-generator-v1",
        model_name="Code Generation Model",
        model_type="generative",
        domain="developer_tools",
        baseline_latency_ms=800,
        baseline_throughput=80,
        baseline_error_rate=0.003,
        drift_tendency=0.06,
        cost_per_inference=0.02,
    ),
    ModelConfig(
        model_id="sentiment-analyzer-v2",
        model_name="Sentiment Analysis Model",
        model_type="classification",
        domain="nlp",
        baseline_latency_ms=25,
        baseline_throughput=5000,
        baseline_error_rate=0.0001,
        drift_tendency=0.1,
        cost_per_inference=0.0005,
    ),
    ModelConfig(
        model_id="image-classifier-v1",
        model_name="Product Image Classifier",
        model_type="classification",
        domain="vision",
        baseline_latency_ms=150,
        baseline_throughput=600,
        baseline_error_rate=0.002,
        drift_tendency=0.07,
        cost_per_inference=0.003,
    ),
]


# =============================================================================
# Data Generators
# =============================================================================


class TimeSeriesPattern:
    """Generate realistic time-series patterns"""

    @staticmethod
    def daily_pattern(hour: int) -> float:
        """Generate daily usage pattern (higher during business hours)"""
        # Peak around 10am-2pm, low at night
        if 0 <= hour < 6:
            return 0.2 + random.uniform(-0.05, 0.05)
        elif 6 <= hour < 9:
            return 0.4 + 0.15 * (hour - 6) + random.uniform(-0.05, 0.05)
        elif 9 <= hour < 14:
            return 0.9 + random.uniform(-0.1, 0.1)
        elif 14 <= hour < 18:
            return 0.7 + random.uniform(-0.1, 0.1)
        elif 18 <= hour < 22:
            return 0.4 + random.uniform(-0.05, 0.05)
        else:
            return 0.25 + random.uniform(-0.05, 0.05)

    @staticmethod
    def weekly_pattern(weekday: int) -> float:
        """Generate weekly pattern (lower on weekends)"""
        if weekday < 5:  # Weekday
            return 1.0 + random.uniform(-0.05, 0.05)
        else:  # Weekend
            return 0.4 + random.uniform(-0.1, 0.1)

    @staticmethod
    def gradual_drift(day_index: int, total_days: int, drift_rate: float) -> float:
        """Generate gradual drift over time"""
        progress = day_index / total_days
        base_drift = progress * drift_rate
        noise = random.uniform(-0.02, 0.02)
        return base_drift + noise

    @staticmethod
    def sudden_anomaly(probability: float = 0.02) -> Tuple[bool, float]:
        """Generate sudden anomalies"""
        if random.random() < probability:
            # Anomaly detected
            severity = random.uniform(0.3, 1.0)
            return True, severity
        return False, 0.0


class MetricGenerator:
    """Generate realistic metrics for AI models"""

    def __init__(self, model: ModelConfig, seed: Optional[int] = None):
        self.model = model
        if seed:
            random.seed(seed)

    def generate_performance_metrics(
        self, timestamp: datetime, day_index: int, total_days: int
    ) -> List[Dict[str, Any]]:
        """Generate performance metrics (latency, throughput, errors)"""
        hour = timestamp.hour
        weekday = timestamp.weekday()

        # Apply patterns
        usage_multiplier = (
            TimeSeriesPattern.daily_pattern(hour)
            * TimeSeriesPattern.weekly_pattern(weekday)
        )

        # Base metrics with noise
        latency = self.model.baseline_latency_ms * (
            1 + random.uniform(-0.15, 0.25) * usage_multiplier
        )
        throughput = self.model.baseline_throughput * usage_multiplier
        error_rate = self.model.baseline_error_rate * (
            1 + random.uniform(-0.2, 0.5)
        )

        # Check for anomalies
        is_anomaly, severity = TimeSeriesPattern.sudden_anomaly(0.01)
        if is_anomaly:
            latency *= 1 + severity * 2
            error_rate *= 1 + severity * 5

        metrics = [
            {
                "name": "model_latency_ms",
                "value": round(latency, 2),
                "labels": {"model_id": self.model.model_id, "percentile": "p50"},
            },
            {
                "name": "model_latency_ms",
                "value": round(latency * 2.5, 2),
                "labels": {"model_id": self.model.model_id, "percentile": "p99"},
            },
            {
                "name": "model_throughput",
                "value": round(throughput),
                "labels": {"model_id": self.model.model_id},
            },
            {
                "name": "model_error_rate",
                "value": round(error_rate, 6),
                "labels": {"model_id": self.model.model_id},
            },
            {
                "name": "model_requests_total",
                "value": round(throughput * 60),  # Requests per hour
                "labels": {"model_id": self.model.model_id},
            },
        ]

        return metrics

    def generate_drift_metrics(
        self, timestamp: datetime, day_index: int, total_days: int
    ) -> List[Dict[str, Any]]:
        """Generate drift detection metrics"""
        drift_base = TimeSeriesPattern.gradual_drift(
            day_index, total_days, self.model.drift_tendency
        )

        data_drift = max(0, min(1, drift_base + random.uniform(-0.05, 0.08)))
        concept_drift = max(0, min(1, drift_base * 0.7 + random.uniform(-0.03, 0.05)))
        prediction_drift = max(0, min(1, drift_base * 1.2 + random.uniform(-0.04, 0.06)))

        return [
            {
                "name": "model_data_drift",
                "value": round(data_drift, 4),
                "labels": {"model_id": self.model.model_id},
            },
            {
                "name": "model_concept_drift",
                "value": round(concept_drift, 4),
                "labels": {"model_id": self.model.model_id},
            },
            {
                "name": "model_prediction_drift",
                "value": round(prediction_drift, 4),
                "labels": {"model_id": self.model.model_id},
            },
            {
                "name": "model_overall_drift",
                "value": round((data_drift + concept_drift + prediction_drift) / 3, 4),
                "labels": {"model_id": self.model.model_id},
            },
        ]

    def generate_reliability_metrics(
        self, timestamp: datetime, day_index: int, total_days: int
    ) -> List[Dict[str, Any]]:
        """Generate reliability and trust metrics"""
        # Base reliability decreases slightly over time without retraining
        reliability_decay = 1 - (day_index / total_days) * 0.1
        noise = random.uniform(-0.02, 0.02)

        confidence_calibration = max(0.7, min(1, 0.95 * reliability_decay + noise))
        prediction_stability = max(0.8, min(1, 0.92 * reliability_decay + noise))
        ood_detection_rate = max(0.85, min(1, 0.97 + random.uniform(-0.03, 0.02)))

        # Trust score composite
        trust_score = (
            confidence_calibration * 0.3
            + prediction_stability * 0.3
            + ood_detection_rate * 0.2
            + (1 - self.model.baseline_error_rate * 100) * 0.2
        )

        return [
            {
                "name": "model_confidence_calibration",
                "value": round(confidence_calibration, 4),
                "labels": {"model_id": self.model.model_id},
            },
            {
                "name": "model_prediction_stability",
                "value": round(prediction_stability, 4),
                "labels": {"model_id": self.model.model_id},
            },
            {
                "name": "model_ood_detection_rate",
                "value": round(ood_detection_rate, 4),
                "labels": {"model_id": self.model.model_id},
            },
            {
                "name": "model_trust_score",
                "value": round(trust_score, 4),
                "labels": {"model_id": self.model.model_id},
            },
        ]

    def generate_cost_metrics(
        self, timestamp: datetime, day_index: int, total_days: int
    ) -> List[Dict[str, Any]]:
        """Generate FinOps cost metrics"""
        hour = timestamp.hour
        weekday = timestamp.weekday()

        usage_multiplier = (
            TimeSeriesPattern.daily_pattern(hour)
            * TimeSeriesPattern.weekly_pattern(weekday)
        )

        inferences = self.model.baseline_throughput * 60 * usage_multiplier
        cost = inferences * self.model.cost_per_inference

        # Budget tracking (monthly)
        monthly_budget = self.model.cost_per_inference * self.model.baseline_throughput * 60 * 24 * 30
        daily_spend = cost * 24
        budget_utilization = (daily_spend * 30) / monthly_budget

        return [
            {
                "name": "model_inference_cost_usd",
                "value": round(cost, 4),
                "labels": {"model_id": self.model.model_id, "period": "hourly"},
            },
            {
                "name": "model_daily_cost_usd",
                "value": round(daily_spend, 2),
                "labels": {"model_id": self.model.model_id},
            },
            {
                "name": "model_budget_utilization",
                "value": round(budget_utilization, 4),
                "labels": {"model_id": self.model.model_id},
            },
            {
                "name": "model_cost_per_inference",
                "value": self.model.cost_per_inference,
                "labels": {"model_id": self.model.model_id},
            },
        ]

    def generate_carbon_metrics(
        self, timestamp: datetime, day_index: int, total_days: int
    ) -> List[Dict[str, Any]]:
        """Generate GreenOps carbon/energy metrics"""
        hour = timestamp.hour
        weekday = timestamp.weekday()

        usage_multiplier = (
            TimeSeriesPattern.daily_pattern(hour)
            * TimeSeriesPattern.weekly_pattern(weekday)
        )

        # Energy consumption in kWh
        base_energy = 0.0001 * self.model.baseline_latency_ms  # Proxy for compute
        energy_kwh = base_energy * self.model.baseline_throughput * 60 * usage_multiplier

        # Carbon intensity varies by time (grid mix)
        # Lower at night (more renewables), higher during peak
        carbon_intensity = 400 + 100 * math.sin(hour * math.pi / 12)  # gCO2/kWh
        carbon_footprint = energy_kwh * carbon_intensity / 1000  # kg CO2

        return [
            {
                "name": "model_energy_kwh",
                "value": round(energy_kwh, 6),
                "labels": {"model_id": self.model.model_id, "period": "hourly"},
            },
            {
                "name": "model_carbon_intensity",
                "value": round(carbon_intensity, 2),
                "labels": {"model_id": self.model.model_id, "unit": "gCO2_per_kWh"},
            },
            {
                "name": "model_carbon_footprint_kg",
                "value": round(carbon_footprint, 4),
                "labels": {"model_id": self.model.model_id, "period": "hourly"},
            },
        ]

    def generate_security_metrics(
        self, timestamp: datetime, day_index: int, total_days: int
    ) -> List[Dict[str, Any]]:
        """Generate security metrics (prompt injection, etc.)"""
        hour = timestamp.hour

        # Security events are more common during active hours
        activity = TimeSeriesPattern.daily_pattern(hour)

        # Prompt injection attempts (for LLM models)
        if self.model.model_type == "generative":
            injection_attempts = int(random.uniform(0, 20) * activity)
            blocked = int(injection_attempts * 0.95)  # 95% blocked
            jailbreak_attempts = int(random.uniform(0, 5) * activity)
        else:
            injection_attempts = int(random.uniform(0, 3) * activity)
            blocked = injection_attempts
            jailbreak_attempts = 0

        data_leak_score = random.uniform(0.01, 0.08)
        security_score = 1 - (injection_attempts - blocked) * 0.01 - data_leak_score

        return [
            {
                "name": "model_prompt_injection_attempts",
                "value": injection_attempts,
                "labels": {"model_id": self.model.model_id, "period": "hourly"},
            },
            {
                "name": "model_prompt_injection_blocked",
                "value": blocked,
                "labels": {"model_id": self.model.model_id, "period": "hourly"},
            },
            {
                "name": "model_jailbreak_attempts",
                "value": jailbreak_attempts,
                "labels": {"model_id": self.model.model_id, "period": "hourly"},
            },
            {
                "name": "model_data_leak_risk",
                "value": round(data_leak_score, 4),
                "labels": {"model_id": self.model.model_id},
            },
            {
                "name": "model_security_score",
                "value": round(max(0, min(1, security_score)), 4),
                "labels": {"model_id": self.model.model_id},
            },
        ]

    def generate_all_metrics(
        self, timestamp: datetime, day_index: int, total_days: int
    ) -> List[Dict[str, Any]]:
        """Generate all metrics for a single timestamp"""
        metrics = []
        metrics.extend(self.generate_performance_metrics(timestamp, day_index, total_days))
        metrics.extend(self.generate_drift_metrics(timestamp, day_index, total_days))
        metrics.extend(self.generate_reliability_metrics(timestamp, day_index, total_days))
        metrics.extend(self.generate_cost_metrics(timestamp, day_index, total_days))
        metrics.extend(self.generate_carbon_metrics(timestamp, day_index, total_days))
        metrics.extend(self.generate_security_metrics(timestamp, day_index, total_days))

        # Add timestamp to all metrics
        for metric in metrics:
            metric["timestamp"] = timestamp.isoformat()

        return metrics


class EventGenerator:
    """Generate realistic events for AI systems"""

    EVENT_TYPES = [
        ("drift_detected", "medium", "Model drift detected"),
        ("slo_breach", "high", "SLO violation detected"),
        ("cost_spike", "medium", "Unexpected cost increase"),
        ("model_update", "info", "Model deployment completed"),
        ("security", "high", "Security threat detected"),
        ("anomaly", "medium", "Anomaly detected in predictions"),
        ("incident", "critical", "Service degradation detected"),
    ]

    def __init__(self, models: List[ModelConfig]):
        self.models = models

    def generate_events(
        self, start_time: datetime, end_time: datetime, events_per_day: int = 10
    ) -> List[Dict[str, Any]]:
        """Generate random events over a time period"""
        events = []
        current = start_time

        while current < end_time:
            # Generate events for this day
            num_events = random.randint(max(1, events_per_day - 5), events_per_day + 5)

            for _ in range(num_events):
                event_template = random.choice(self.EVENT_TYPES)
                model = random.choice(self.models)

                event_time = current + timedelta(
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59),
                )

                if event_time >= end_time:
                    break

                event = {
                    "event_type": event_template[0],
                    "severity": event_template[1],
                    "title": f"{event_template[2]} - {model.model_name}",
                    "description": self._generate_description(
                        event_template[0], model
                    ),
                    "timestamp": event_time.isoformat(),
                    "source_service": model.model_id,
                    "affected_services": [model.model_id],
                    "payload": {
                        "model_id": model.model_id,
                        "model_type": model.model_type,
                        "domain": model.domain,
                    },
                }
                events.append(event)

            current += timedelta(days=1)

        return sorted(events, key=lambda x: x["timestamp"])

    def _generate_description(self, event_type: str, model: ModelConfig) -> str:
        """Generate event description"""
        descriptions = {
            "drift_detected": f"Data drift score exceeded threshold for {model.model_name}. Current score: {random.uniform(0.3, 0.6):.2f}",
            "slo_breach": f"Latency SLO breached. P99 latency: {model.baseline_latency_ms * 3:.0f}ms (target: {model.baseline_latency_ms * 2:.0f}ms)",
            "cost_spike": f"Hourly inference cost increased by {random.uniform(20, 80):.0f}% for {model.model_name}",
            "model_update": f"New version of {model.model_name} deployed successfully. Canary analysis passed.",
            "security": f"Potential prompt injection attempt blocked for {model.model_name}",
            "anomaly": f"Prediction distribution anomaly detected. KL divergence: {random.uniform(0.5, 2.0):.2f}",
            "incident": f"Error rate spike detected for {model.model_name}. Current: {random.uniform(1, 5):.1f}%",
        }
        return descriptions.get(event_type, f"Event for {model.model_name}")


class LogGenerator:
    """Generate realistic logs for AI systems"""

    LOG_TEMPLATES = [
        ("info", "Inference completed", "Successfully processed {count} requests"),
        ("info", "Model loaded", "Model {model_id} loaded in {time}ms"),
        ("warning", "High latency", "Request latency {latency}ms exceeded threshold"),
        ("warning", "Drift warning", "Feature drift detected: {feature} = {value}"),
        ("error", "Inference failed", "Model inference failed: {error}"),
        ("error", "Timeout", "Request timeout after {timeout}ms"),
        ("debug", "Cache hit", "Prediction cache hit rate: {rate}%"),
        ("info", "Health check", "Model health check passed"),
    ]

    def __init__(self, models: List[ModelConfig]):
        self.models = models

    def generate_logs(
        self, start_time: datetime, end_time: datetime, logs_per_hour: int = 50
    ) -> List[Dict[str, Any]]:
        """Generate random logs over a time period"""
        logs = []
        current = start_time

        while current < end_time:
            model = random.choice(self.models)
            template = random.choice(self.LOG_TEMPLATES)

            log = {
                "level": template[0],
                "message": self._format_message(template[2], model),
                "timestamp": current.isoformat(),
                "logger": f"aiobs.models.{model.model_id}",
                "context": {
                    "model_id": model.model_id,
                    "model_type": model.model_type,
                    "trace_id": str(uuid.uuid4()),
                },
            }
            logs.append(log)

            # Advance time
            current += timedelta(seconds=random.randint(30, 300))

        return logs

    def _format_message(self, template: str, model: ModelConfig) -> str:
        """Format log message with realistic values"""
        replacements = {
            "{count}": str(random.randint(100, 5000)),
            "{model_id}": model.model_id,
            "{time}": str(random.randint(500, 3000)),
            "{latency}": str(int(model.baseline_latency_ms * random.uniform(2, 5))),
            "{feature}": random.choice(["user_engagement", "purchase_freq", "session_time"]),
            "{value}": f"{random.uniform(0.2, 0.6):.2f}",
            "{error}": random.choice(["OOM", "timeout", "invalid_input", "model_error"]),
            "{timeout}": str(random.randint(5000, 30000)),
            "{rate}": str(random.randint(60, 95)),
        }

        result = template
        for key, value in replacements.items():
            result = result.replace(key, value)
        return result


# =============================================================================
# Data Injection Client
# =============================================================================


class DataInjectionClient:
    """Client for injecting data into AIOBS API"""

    def __init__(self, base_url: str, api_key: Optional[str] = None):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.headers = {"Content-Type": "application/json"}
        if api_key:
            self.headers["X-API-Key"] = api_key

    def _build_ingestion_request(
        self,
        data_type: str,
        data: List[Dict],
        source_id: str = "test-data-injection",
    ) -> Dict[str, Any]:
        """Build a compliant ingestion request"""
        return {
            "metadata": {
                "source": "synthetic",
                "source_id": source_id,
                "environment": "development",
                "version": "1.0",
                "timestamp": datetime.utcnow().isoformat(),
                "tags": {"generator": "test_data_injection.py"},
            },
            "compliance": {
                "data_category": "operational",
                "sensitivity": "internal",
                "retention_policy": "medium",
                "consent_verified": True,
                "data_subject_rights": True,
                "cross_border_transfer": False,
                "processing_purpose": "System testing and demonstration of AIOBS platform capabilities",
                "legal_basis": "legitimate_interest",
                "data_controller": "aiobs-platform",
            },
            data_type: data,
        }

    async def inject_metrics(
        self, metrics: List[Dict], dry_run: bool = False
    ) -> Dict[str, Any]:
        """Inject metrics into AIOBS"""
        if dry_run:
            return {"status": "dry_run", "metrics_count": len(metrics)}

        request = self._build_ingestion_request("metrics", metrics)

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/ingest/metrics",
                    headers=self.headers,
                    json=request,
                )
                return response.json()
            except httpx.ConnectError:
                return {"status": "error", "message": "Could not connect to AIOBS API"}
            except Exception as e:
                return {"status": "error", "message": str(e)}

    async def inject_logs(
        self, logs: List[Dict], stream: str = "aiobs-logs", dry_run: bool = False
    ) -> Dict[str, Any]:
        """Inject logs into AIOBS"""
        if dry_run:
            return {"status": "dry_run", "logs_count": len(logs)}

        request = self._build_ingestion_request("logs", logs)
        request["stream"] = stream

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/ingest/logs",
                    headers=self.headers,
                    json=request,
                )
                return response.json()
            except httpx.ConnectError:
                return {"status": "error", "message": "Could not connect to AIOBS API"}
            except Exception as e:
                return {"status": "error", "message": str(e)}

    async def inject_events(
        self, events: List[Dict], dry_run: bool = False
    ) -> Dict[str, Any]:
        """Inject events into AIOBS"""
        if dry_run:
            return {"status": "dry_run", "events_count": len(events)}

        request = self._build_ingestion_request("events", events)
        request["channels"] = ["all", "alerts"]

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/ingest/events",
                    headers=self.headers,
                    json=request,
                )
                return response.json()
            except httpx.ConnectError:
                return {"status": "error", "message": "Could not connect to AIOBS API"}
            except Exception as e:
                return {"status": "error", "message": str(e)}

    async def check_health(self) -> Dict[str, Any]:
        """Check AIOBS API health"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(f"{self.base_url}/api/health")
                return response.json()
            except httpx.ConnectError:
                return {"status": "error", "message": "Could not connect to AIOBS API"}
            except Exception as e:
                return {"status": "error", "message": str(e)}


# =============================================================================
# Main Injection Logic
# =============================================================================


async def run_injection(args: argparse.Namespace) -> int:
    """Run the data injection process"""
    print("=" * 60, flush=True)
    print("AIOBS Test Data Injection", flush=True)
    print("=" * 60, flush=True)
    print(flush=True)

    # Configuration
    models = SAMPLE_MODELS[: args.models]
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=args.days)

    print(f"Configuration:", flush=True)
    print(f"  Base URL: {args.base_url}", flush=True)
    print(f"  Models: {len(models)}", flush=True)
    for m in models:
        print(f"    - {m.model_id} ({m.model_type})", flush=True)
    print(f"  Time range: {start_time.date()} to {end_time.date()} ({args.days} days)", flush=True)
    print(f"  Dry run: {args.dry_run}", flush=True)
    print(flush=True)

    if args.dry_run:
        print("[DRY RUN] No data will be injected - generating preview only", flush=True)
        print(flush=True)

    # Initialize client
    client = DataInjectionClient(args.base_url, args.api_key)

    # Check API health (skip in dry run or if explicitly disabled)
    if not args.dry_run and not args.skip_health_check:
        print("Checking AIOBS API health...", flush=True)
        health = await client.check_health()
        if health.get("status") == "error":
            print(f"  Warning: {health.get('message')}", flush=True)
            if not args.force:
                print("  Use --force to continue anyway, or --dry-run to preview data", flush=True)
                return 1
        else:
            print("  API is healthy", flush=True)
        print(flush=True)

    # Track totals for summary
    total_metrics = 0
    total_events = 0
    total_logs = 0

    # Generate and inject metrics
    if not args.events_only and not args.logs_only:
        print("Generating metrics...", flush=True)
        all_metrics = []

        for model in models:
            generator = MetricGenerator(model, seed=args.seed)
            current = start_time

            while current < end_time:
                day_index = (current - start_time).days
                metrics = generator.generate_all_metrics(current, day_index, args.days)
                all_metrics.extend(metrics)

                # Generate hourly data points
                current += timedelta(hours=1)

            model_metric_count = len([m for m in all_metrics if m.get('labels', {}).get('model_id') == model.model_id])
            print(f"  {model.model_id}: {model_metric_count} metrics", flush=True)

        total_metrics = len(all_metrics)
        print(f"  Total metrics: {total_metrics}", flush=True)

        # Inject in batches
        if args.dry_run:
            print(f"  [DRY RUN] Would inject {total_metrics} metrics in {(total_metrics + 999) // 1000} batches", flush=True)
        else:
            batch_size = 1000
            for i in range(0, len(all_metrics), batch_size):
                batch = all_metrics[i : i + batch_size]
                result = await client.inject_metrics(batch, dry_run=args.dry_run)
                status = result.get("status", "unknown")
                print(f"  Batch {i // batch_size + 1}: {status}", flush=True)
        print(flush=True)

    # Generate and inject events
    if not args.metrics_only and not args.logs_only:
        print("Generating events...", flush=True)
        event_generator = EventGenerator(models)
        events = event_generator.generate_events(
            start_time, end_time, events_per_day=args.events_per_day
        )
        total_events = len(events)
        print(f"  Total events: {total_events}", flush=True)

        if args.dry_run:
            print(f"  [DRY RUN] Would inject {total_events} events", flush=True)
            # Show sample events
            if events:
                print(f"  Sample events:", flush=True)
                for event in events[:3]:
                    print(f"    - [{event['severity']}] {event['title']}", flush=True)
        else:
            result = await client.inject_events(events, dry_run=args.dry_run)
            print(f"  Status: {result.get('status', 'unknown')}", flush=True)
        print(flush=True)

    # Generate and inject logs
    if not args.metrics_only and not args.events_only:
        print("Generating logs...", flush=True)
        log_generator = LogGenerator(models)
        logs = log_generator.generate_logs(
            start_time, end_time, logs_per_hour=args.logs_per_hour
        )
        total_logs = len(logs)
        print(f"  Total logs: {total_logs}", flush=True)

        if args.dry_run:
            print(f"  [DRY RUN] Would inject {total_logs} logs in {(total_logs + 499) // 500} batches", flush=True)
            # Show sample logs
            if logs:
                print(f"  Sample logs:", flush=True)
                for log in logs[:3]:
                    print(f"    - [{log['level']}] {log['message'][:60]}...", flush=True)
        else:
            # Inject in batches
            batch_size = 500
            for i in range(0, len(logs), batch_size):
                batch = logs[i : i + batch_size]
                result = await client.inject_logs(batch, dry_run=args.dry_run)
                status = result.get("status", "unknown")
                if i == 0 or (i + batch_size) >= len(logs):
                    print(f"  Batch {i // batch_size + 1}: {status}", flush=True)
        print(flush=True)

    # Print summary
    print("=" * 60, flush=True)
    if args.dry_run:
        print("DRY RUN SUMMARY", flush=True)
        print("=" * 60, flush=True)
        print(f"  Would generate and inject:", flush=True)
        if total_metrics > 0:
            print(f"    - {total_metrics:,} metrics", flush=True)
        if total_events > 0:
            print(f"    - {total_events:,} events", flush=True)
        if total_logs > 0:
            print(f"    - {total_logs:,} logs", flush=True)
        print(flush=True)
        print("To actually inject the data, run without --dry-run:", flush=True)
        print(f"  python scripts/test_data_injection.py --base-url {args.base_url}", flush=True)
    else:
        print("INJECTION COMPLETE", flush=True)
        print("=" * 60, flush=True)
        print(f"  Successfully injected:", flush=True)
        if total_metrics > 0:
            print(f"    - {total_metrics:,} metrics", flush=True)
        if total_events > 0:
            print(f"    - {total_events:,} events", flush=True)
        if total_logs > 0:
            print(f"    - {total_logs:,} logs", flush=True)
    print("=" * 60, flush=True)

    return 0


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Inject test data into AIOBS platform",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help=f"AIOBS API base URL (default: {DEFAULT_BASE_URL})",
    )
    parser.add_argument(
        "--api-key",
        help="API key for authentication",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=DEFAULT_DAYS,
        help=f"Number of days of historical data to generate (default: {DEFAULT_DAYS})",
    )
    parser.add_argument(
        "--models",
        type=int,
        default=DEFAULT_MODELS,
        help=f"Number of models to simulate (default: {DEFAULT_MODELS}, max: {len(SAMPLE_MODELS)})",
    )
    parser.add_argument(
        "--events-per-day",
        type=int,
        default=10,
        help="Average events per day (default: 10)",
    )
    parser.add_argument(
        "--logs-per-hour",
        type=int,
        default=50,
        help="Average logs per hour (default: 50)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        help="Random seed for reproducible data generation",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Generate data but don't inject it",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Continue even if API health check fails",
    )
    parser.add_argument(
        "--skip-health-check",
        action="store_true",
        help="Skip API health check",
    )
    parser.add_argument(
        "--metrics-only",
        action="store_true",
        help="Only inject metrics",
    )
    parser.add_argument(
        "--events-only",
        action="store_true",
        help="Only inject events",
    )
    parser.add_argument(
        "--logs-only",
        action="store_true",
        help="Only inject logs",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output",
    )

    args = parser.parse_args()

    # Validate models count
    if args.models > len(SAMPLE_MODELS):
        args.models = len(SAMPLE_MODELS)
        print(f"Note: Limited to {len(SAMPLE_MODELS)} available model configurations", flush=True)

    # Run injection
    try:
        exit_code = asyncio.run(run_injection(args))
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\nInterrupted by user", flush=True)
        sys.exit(1)
    except Exception as e:
        print(f"\nError: {e}", flush=True)
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
