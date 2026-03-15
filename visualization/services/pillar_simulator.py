"""
AIOBS Pillar Simulator - Stateful AI engine with evolving metrics.

Maintains a persistent state that evolves over time, responding to
external events (attacks, drift injection, data pushes) and providing
realistic real-time data for all 5 Trust Pillars.
"""

import asyncio
import math
import random
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


@dataclass
class SecurityEvent:
    timestamp: str
    event_type: str  # injection, adversarial, anomaly, data_extraction
    severity: str  # low, medium, high, critical
    model: str
    description: str
    status: str = "blocked"


@dataclass
class AuditEvent:
    timestamp: str
    event_type: str
    description: str
    severity: str = "info"


class PillarSimulator:
    """
    Stateful simulator engine for the 5 Trust Pillars.

    Features:
    - Evolves metrics smoothly over time (not random snapshots)
    - Responds to external events (attacks, drift, anomalies)
    - Maintains time-series history for charts
    - Thread-safe for concurrent access
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._state_lock = threading.Lock()

        # === CORE SCORES (evolving) ===
        self.scores = {
            "reliability": 0.88,
            "security": 0.84,
            "compliance": 0.78,
            "explainability": 0.75,
            "performance": 0.91,
        }

        # === RELIABILITY STATE ===
        self.reliability = {
            "precision": 0.923,
            "recall": 0.891,
            "f1_score": 0.907,
            "drift": {
                "data_drift": 0.022,
                "concept_drift": 0.065,
                "feature_drift": 0.015,
                "status": "stable",
            },
            "models_monitored": 12,
            "trend": "up",
        }
        self.reliability_history = deque(maxlen=720)  # 720 data points
        self.drift_history = {
            "data": deque(maxlen=720),
            "concept": deque(maxlen=720),
            "feature": deque(maxlen=720),
        }
        self.models = [
            {"name": "fraud-detection-v3", "precision": 0.942, "recall": 0.918,
             "f1_score": 0.930, "drift_status": "stable", "inferences_24h": 45230},
            {"name": "recommendation-engine", "precision": 0.895, "recall": 0.852,
             "f1_score": 0.873, "drift_status": "stable", "inferences_24h": 128450},
            {"name": "chatbot-assistant", "precision": 0.887, "recall": 0.863,
             "f1_score": 0.875, "drift_status": "stable", "inferences_24h": 23180},
        ]

        # === SECURITY STATE ===
        self.security = {
            "injection_attempts": {
                "blocked": 0,
                "types": {"jailbreak": 0, "prompt_leaking": 0,
                          "role_manipulation": 0, "other": 0},
            },
            "adversarial_attacks": {"detected": 0, "blocked_rate": 1.0},
            "data_extraction_attempts": 0,
            "anomalies": 0,
            "threat_level": "low",
            "protections_active": [
                "prompt_injection_guard", "adversarial_detection",
                "data_extraction_prevention", "anomaly_detection",
                "output_validation",
            ],
        }
        self.security_events: List[SecurityEvent] = []
        self.security_incidents: List[Dict] = []

        # === COMPLIANCE STATE ===
        self.compliance = {
            "inference_traceability": 0.998,
            "models_versioned": {"current": 12, "total": 12},
            "data_lineage_coverage": 0.85,
            "ai_act_readiness": 0.78,
            "risk_classification": {
                "minimal": 5, "limited": 4, "high": 3, "unacceptable": 0,
            },
            "audit_events_30d": 18500,
        }
        self.ai_act_checklist = [
            {"item": "Documentation technique", "status": "done", "category": "Article 11"},
            {"item": "Évaluation des risques", "status": "done", "category": "Article 9"},
            {"item": "Tests de robustesse", "status": "in_progress", "category": "Article 15"},
            {"item": "Supervision humaine", "status": "in_progress", "category": "Article 14"},
            {"item": "Journalisation automatique", "status": "done", "category": "Article 12"},
            {"item": "Transparence & information", "status": "done", "category": "Article 13"},
            {"item": "Audit externe", "status": "planned", "category": "Article 43"},
            {"item": "Marquage CE", "status": "not_started", "category": "Article 49"},
        ]

        # === EXPLAINABILITY STATE ===
        self.explainability = {
            "feature_importance_coverage": 0.92,
            "avg_confidence": 0.87,
            "explanations_generated": 45200,
            "ethics_compliance": 1.0,
            "low_confidence_predictions": {
                "below_70": 0.023,
                "below_50": 0.005,
            },
            "alternatives_coverage": 0.78,
            "avg_alternatives_per_prediction": 3.2,
        }
        self.features = [
            {"name": "transaction_amount", "importance": 0.23},
            {"name": "time_since_last", "importance": 0.18},
            {"name": "merchant_category", "importance": 0.15},
            {"name": "device_type", "importance": 0.12},
            {"name": "location_risk", "importance": 0.10},
            {"name": "velocity_24h", "importance": 0.08},
            {"name": "card_age", "importance": 0.06},
            {"name": "avg_transaction", "importance": 0.04},
            {"name": "failed_attempts", "importance": 0.03},
            {"name": "new_device", "importance": 0.01},
        ]
        self.confidence_history = deque(maxlen=720)

        # === PERFORMANCE STATE ===
        self.performance = {
            "latency": {"p50": 45, "p90": 89, "p95": 112, "p99": 128},
            "throughput": {"current": 2400, "max": 5000, "unit": "req/s"},
            "cost": {"per_inference": 0.0023, "daily_total": 608.84, "trend": "down"},
            "gpu_utilization": {
                "cluster_a": 0.78, "cluster_b": 0.65, "inference": 0.82,
            },
        }
        self.latency_history = {
            "p50": deque(maxlen=720),
            "p95": deque(maxlen=720),
            "p99": deque(maxlen=720),
        }
        self.cost_history = deque(maxlen=30)  # 30 days
        self.cost_breakdown = {
            "compute_gpu": 0.65, "storage": 0.20,
            "network": 0.10, "other": 0.05,
        }
        self.cost_by_model = [
            {"model": "fraud-detection-v3", "daily_cost": 81.41,
             "per_inference": 0.0018, "trend": -0.12},
            {"model": "recommendation-engine", "daily_cost": 321.13,
             "per_inference": 0.0025, "trend": 0.05},
            {"model": "chatbot-assistant", "daily_cost": 206.30,
             "per_inference": 0.0089, "trend": -0.08},
        ]

        # === BACKGROUND TASK ===
        self._running = False
        self._tick_count = 0
        self._start_time = time.time()

        # Seed initial history
        self._seed_history()

    def _seed_history(self):
        """Populate rich initial history simulating 7 days of activity."""
        now = datetime.utcnow()

        # --- 720 data points = ~24h at 2s intervals, but we simulate 7 days worth ---
        for i in range(720):
            # Simulate hour-of-day patterns over 7 days
            hour = (i / 30) % 24  # 30 points per simulated hour
            day_phase = math.sin((hour - 6) * math.pi / 12)  # peak at noon
            daily_factor = 0.7 + 0.3 * max(0, day_phase)

            # Reliability: gradual improvement with a dip around point 400
            dip = 0.04 * math.exp(-((i - 400) ** 2) / 5000) if 350 < i < 450 else 0
            self.reliability_history.append(
                self._clamp(0.86 + 0.02 * (i / 720) - dip + random.gauss(0, 0.004), 0.75, 0.95))

            # Drift: concept drift spikes around point 380-420
            dd = 0.02 + 0.005 * math.sin(i * 0.05) + random.gauss(0, 0.002)
            cd_spike = 0.08 * math.exp(-((i - 400) ** 2) / 3000) if 350 < i < 450 else 0
            cd = 0.05 + cd_spike + 0.003 * math.sin(i * 0.03) + random.gauss(0, 0.005)
            fd = 0.012 + 0.002 * math.sin(i * 0.02) + random.gauss(0, 0.001)
            self.drift_history["data"].append(self._clamp(dd, 0, 0.15))
            self.drift_history["concept"].append(self._clamp(cd, 0, 0.25))
            self.drift_history["feature"].append(self._clamp(fd, 0, 0.08))

            # Confidence: stable with slight daily variation
            self.confidence_history.append(
                self._clamp(0.85 + 0.03 * daily_factor + random.gauss(0, 0.015), 0.7, 0.95))

            # Latency: strong diurnal pattern
            lat_base = 35 + 20 * daily_factor
            # Spike around point 500
            lat_spike = 80 * math.exp(-((i - 500) ** 2) / 1000) if 480 < i < 520 else 0
            self.latency_history["p50"].append(
                max(15, int(lat_base + lat_spike * 0.3 + random.gauss(0, 3))))
            self.latency_history["p95"].append(
                max(50, int(lat_base * 2.5 + lat_spike * 0.7 + random.gauss(0, 8))))
            self.latency_history["p99"].append(
                max(70, int(lat_base * 3.2 + lat_spike + random.gauss(0, 12))))

        # --- 30 days of cost data ---
        for i in range(30):
            weekday = i % 7
            base_cost = 560 + 20 * math.sin(i * 0.3)  # slow trend
            weekday_factor = 1.0 if weekday < 5 else 0.55 + 0.1 * weekday
            self.cost_history.append(round(base_cost * weekday_factor + random.gauss(0, 25), 2))

        # --- Pre-seed security events (last 7 days of activity) ---
        attack_types = ["injection", "adversarial", "anomaly", "jailbreak", "data_extraction"]
        models = ["chatbot-assistant", "code-generator", "customer-support",
                  "fraud-detection-v3", "recommendation-engine"]
        descriptions = [
            "Tentative de jailbreak DAN détectée et bloquée",
            "Pattern d'injection dans le prompt — filtré",
            "Requête suspecte interceptée par le garde-fou",
            "Perturbation adversariale sur l'entrée détectée",
            "Extraction de données bloquée par le filtre de sortie",
            "Pic de requêtes anormal détecté — throttling activé",
            "Tentative de contournement de rôle bloquée",
            "Prompt leaking détecté — réponse sanitisée",
        ]

        for i in range(80):  # 80 events over 7 days
            hours_ago = random.randint(1, 168)
            ts = (now - timedelta(hours=hours_ago)).isoformat()
            atype = random.choice(attack_types)
            sev = random.choices(["low", "medium", "high", "critical"],
                                 weights=[0.4, 0.3, 0.2, 0.1])[0]
            event = SecurityEvent(
                timestamp=ts,
                event_type=atype,
                severity=sev,
                model=random.choice(models),
                description=random.choice(descriptions),
                status=random.choices(["blocked", "mitigated", "investigating"],
                                      weights=[0.8, 0.15, 0.05])[0],
            )
            self.security_events.append(event)

            # Update counters
            inj = self.security["injection_attempts"]
            inj["blocked"] += 1
            if atype in ("injection", "jailbreak"):
                key = random.choice(list(inj["types"].keys()))
                inj["types"][key] += 1
            elif atype == "adversarial":
                self.security["adversarial_attacks"]["detected"] += 1
            elif atype == "data_extraction":
                self.security["data_extraction_attempts"] += 1
            elif atype == "anomaly":
                self.security["anomalies"] += 1

        # Sort events by timestamp
        self.security_events.sort(key=lambda e: e.timestamp)

        # Set initial security counters to realistic values
        self.security["injection_attempts"]["blocked"] = max(
            self.security["injection_attempts"]["blocked"], 127)
        inj_types = self.security["injection_attempts"]["types"]
        inj_types["jailbreak"] = max(inj_types["jailbreak"], 42)
        inj_types["prompt_leaking"] = max(inj_types["prompt_leaking"], 28)
        inj_types["role_manipulation"] = max(inj_types["role_manipulation"], 19)
        inj_types["other"] = max(inj_types["other"], 8)
        self.security["adversarial_attacks"]["detected"] = max(
            self.security["adversarial_attacks"]["detected"], 8)
        self.security["data_extraction_attempts"] = max(
            self.security["data_extraction_attempts"], 3)
        self.security["anomalies"] = max(self.security["anomalies"], 4)

    def _smooth_evolve(self, current: float, target: float, speed: float = 0.02) -> float:
        """Smoothly evolve a value toward a target."""
        return current + (target - current) * speed + random.gauss(0, 0.001)

    def _clamp(self, value: float, lo: float = 0.0, hi: float = 1.0) -> float:
        return max(lo, min(hi, value))

    def tick(self):
        """Advance simulation by one step. Called every ~2 seconds."""
        with self._state_lock:
            self._tick_count += 1
            t = self._tick_count

            # === Organic noise on all scores ===
            for key in self.scores:
                base = self.scores[key]
                noise = random.gauss(0, 0.002)
                diurnal = 0.005 * math.sin(t * 0.01)  # slow oscillation
                self.scores[key] = self._clamp(base + noise + diurnal, 0.5, 0.99)

            # === RELIABILITY evolution ===
            self.reliability["precision"] = self._clamp(
                self.reliability["precision"] + random.gauss(0, 0.001), 0.8, 0.99)
            self.reliability["recall"] = self._clamp(
                self.reliability["recall"] + random.gauss(0, 0.001), 0.8, 0.99)
            self.reliability["f1_score"] = self._clamp(
                2 * self.reliability["precision"] * self.reliability["recall"] /
                (self.reliability["precision"] + self.reliability["recall"]),
                0.8, 0.99)

            # Drift values evolve slowly
            drift = self.reliability["drift"]
            drift["data_drift"] = self._clamp(
                drift["data_drift"] + random.gauss(0, 0.001), 0.0, 0.2)
            drift["concept_drift"] = self._clamp(
                drift["concept_drift"] + random.gauss(0, 0.002), 0.0, 0.3)
            drift["feature_drift"] = self._clamp(
                drift["feature_drift"] + random.gauss(0, 0.0005), 0.0, 0.1)
            drift["status"] = "warning" if drift["concept_drift"] > 0.12 else "stable"

            self.reliability_history.append(self.scores["reliability"])
            self.drift_history["data"].append(drift["data_drift"])
            self.drift_history["concept"].append(drift["concept_drift"])
            self.drift_history["feature"].append(drift["feature_drift"])

            # Model metrics jitter
            for m in self.models:
                m["precision"] = self._clamp(m["precision"] + random.gauss(0, 0.001), 0.8, 0.99)
                m["recall"] = self._clamp(m["recall"] + random.gauss(0, 0.001), 0.8, 0.99)
                m["f1_score"] = self._clamp(
                    2 * m["precision"] * m["recall"] / (m["precision"] + m["recall"]), 0.8, 0.99)
                m["inferences_24h"] += random.randint(-50, 100)

            # === SECURITY: occasional baseline events ===
            if random.random() < 0.03:  # ~3% chance per tick
                self._generate_baseline_threat()

            # Threat level based on recent events
            recent = [e for e in self.security_events
                      if (datetime.utcnow() - datetime.fromisoformat(e.timestamp)).total_seconds() < 3600]
            high_count = sum(1 for e in recent if e.severity in ("high", "critical"))
            self.security["threat_level"] = (
                "critical" if high_count > 5 else
                "high" if high_count > 3 else
                "medium" if high_count > 0 else "low"
            )

            # === EXPLAINABILITY evolution ===
            self.explainability["explanations_generated"] += random.randint(5, 25)
            self.explainability["avg_confidence"] = self._clamp(
                self.explainability["avg_confidence"] + random.gauss(0, 0.002), 0.7, 0.95)
            self.confidence_history.append(self.explainability["avg_confidence"])

            # === PERFORMANCE evolution ===
            hour_factor = 1 + 0.3 * math.sin(t * 0.02)  # simulates load variations
            lat = self.performance["latency"]
            lat["p50"] = max(20, int(45 * hour_factor + random.gauss(0, 3)))
            lat["p90"] = max(50, int(89 * hour_factor + random.gauss(0, 5)))
            lat["p95"] = max(70, int(112 * hour_factor + random.gauss(0, 7)))
            lat["p99"] = max(90, int(128 * hour_factor + random.gauss(0, 10)))

            self.latency_history["p50"].append(lat["p50"])
            self.latency_history["p95"].append(lat["p95"])
            self.latency_history["p99"].append(lat["p99"])

            tp = self.performance["throughput"]
            tp["current"] = max(500, int(2400 * hour_factor + random.gauss(0, 100)))

            # GPU jitter
            gpu = self.performance["gpu_utilization"]
            gpu["cluster_a"] = self._clamp(gpu["cluster_a"] + random.gauss(0, 0.01), 0.4, 0.95)
            gpu["cluster_b"] = self._clamp(gpu["cluster_b"] + random.gauss(0, 0.01), 0.3, 0.90)
            gpu["inference"] = self._clamp(gpu["inference"] + random.gauss(0, 0.01), 0.5, 0.95)

            # Daily cost update (every ~720 ticks ≈ 24 min at 2s interval)
            if t % 720 == 0:
                daily = round(580 + random.gauss(0, 40), 2)
                self.cost_history.append(daily)
                self.performance["cost"]["daily_total"] = daily

            # === COMPLIANCE slow evolution ===
            self.compliance["audit_events_30d"] += random.randint(10, 50)

    def _generate_baseline_threat(self):
        """Generate a routine low-level security event."""
        event_type = random.choice(["injection", "adversarial", "anomaly"])
        model = random.choice(["chatbot-assistant", "code-generator", "customer-support"])
        severity = random.choices(["low", "medium"], weights=[0.7, 0.3])[0]

        event = SecurityEvent(
            timestamp=datetime.utcnow().isoformat(),
            event_type=event_type,
            severity=severity,
            model=model,
            description=random.choice([
                "Tentative de jailbreak détectée et bloquée",
                "Pattern d'injection détecté dans le prompt",
                "Requête suspecte interceptée par le filtre",
            ]),
            status="blocked",
        )
        self.security_events.append(event)
        # Keep only last 100 events
        if len(self.security_events) > 100:
            self.security_events = self.security_events[-100:]

        # Update counters
        inj = self.security["injection_attempts"]
        inj["blocked"] += 1
        if event_type == "injection":
            key = random.choice(list(inj["types"].keys()))
            inj["types"][key] += 1
        elif event_type == "adversarial":
            self.security["adversarial_attacks"]["detected"] += 1
        elif event_type == "anomaly":
            self.security["anomalies"] += 1

    # =========================================================================
    # EXTERNAL EVENT INJECTION (called by scripts/API)
    # =========================================================================

    def inject_attack(self, attack_type: str = "injection",
                      severity: str = "high", count: int = 1,
                      model: str = "chatbot-assistant") -> Dict:
        """Inject a security attack into the simulation."""
        with self._state_lock:
            events_created = []
            for _ in range(count):
                descriptions = {
                    "injection": "Attaque par prompt injection — tentative de contournement",
                    "adversarial": "Perturbation adversariale détectée sur l'entrée",
                    "data_extraction": "Tentative d'extraction de données sensibles",
                    "jailbreak": "Tentative de jailbreak DAN détectée",
                }
                event = SecurityEvent(
                    timestamp=datetime.utcnow().isoformat(),
                    event_type=attack_type,
                    severity=severity,
                    model=model,
                    description=descriptions.get(attack_type, f"Attaque de type {attack_type}"),
                    status="blocked" if random.random() > 0.1 else "investigating",
                )
                self.security_events.append(event)
                events_created.append(event)

                # Update counters
                inj = self.security["injection_attempts"]
                inj["blocked"] += 1
                if attack_type in ("injection", "jailbreak"):
                    key = random.choice(list(inj["types"].keys()))
                    inj["types"][key] += 1
                elif attack_type == "adversarial":
                    self.security["adversarial_attacks"]["detected"] += 1
                elif attack_type == "data_extraction":
                    self.security["data_extraction_attempts"] += 1

            # Impact on security score
            impact = count * (0.005 if severity == "low" else 0.01 if severity == "medium" else 0.02)
            self.scores["security"] = self._clamp(self.scores["security"] - impact, 0.5, 0.99)

            return {
                "injected": count,
                "attack_type": attack_type,
                "severity": severity,
                "security_score": round(self.scores["security"], 3),
            }

    def inject_drift(self, drift_type: str = "concept",
                     intensity: float = 0.5) -> Dict:
        """Inject drift into the reliability metrics."""
        with self._state_lock:
            drift = self.reliability["drift"]
            if drift_type in ("data", "all"):
                drift["data_drift"] = self._clamp(drift["data_drift"] + 0.05 * intensity, 0, 0.3)
            if drift_type in ("concept", "all"):
                drift["concept_drift"] = self._clamp(drift["concept_drift"] + 0.08 * intensity, 0, 0.3)
            if drift_type in ("feature", "all"):
                drift["feature_drift"] = self._clamp(drift["feature_drift"] + 0.03 * intensity, 0, 0.15)

            drift["status"] = "warning" if drift["concept_drift"] > 0.10 else "stable"

            # Impact on reliability score
            self.scores["reliability"] = self._clamp(
                self.scores["reliability"] - 0.03 * intensity, 0.5, 0.99)

            # Impact on model metrics
            for m in self.models:
                m["precision"] = self._clamp(m["precision"] - 0.02 * intensity, 0.7, 0.99)
                m["recall"] = self._clamp(m["recall"] - 0.02 * intensity, 0.7, 0.99)
                m["f1_score"] = self._clamp(
                    2 * m["precision"] * m["recall"] / (m["precision"] + m["recall"]), 0.7, 0.99)
                if intensity > 0.5:
                    m["drift_status"] = "warning"

            return {
                "drift_type": drift_type,
                "intensity": intensity,
                "current_drift": {
                    "data": round(drift["data_drift"], 4),
                    "concept": round(drift["concept_drift"], 4),
                    "feature": round(drift["feature_drift"], 4),
                },
                "reliability_score": round(self.scores["reliability"], 3),
            }

    def inject_latency_spike(self, multiplier: float = 3.0,
                             duration_ticks: int = 30) -> Dict:
        """Inject a latency spike into performance metrics."""
        with self._state_lock:
            lat = self.performance["latency"]
            lat["p50"] = int(lat["p50"] * multiplier)
            lat["p95"] = int(lat["p95"] * multiplier)
            lat["p99"] = int(lat["p99"] * multiplier)

            self.scores["performance"] = self._clamp(
                self.scores["performance"] - 0.05 * (multiplier - 1), 0.5, 0.99)

            return {
                "multiplier": multiplier,
                "latency": dict(lat),
                "performance_score": round(self.scores["performance"], 3),
            }

    def inject_data(self, pillar: str, metrics: Dict[str, Any]) -> Dict:
        """Push arbitrary metric updates to a pillar."""
        with self._state_lock:
            if pillar == "reliability":
                for k, v in metrics.items():
                    if k in self.reliability and not isinstance(self.reliability[k], dict):
                        self.reliability[k] = v
            elif pillar == "security":
                for k, v in metrics.items():
                    if k in self.security and not isinstance(self.security[k], (dict, list)):
                        self.security[k] = v
            elif pillar == "compliance":
                for k, v in metrics.items():
                    if k in self.compliance and not isinstance(self.compliance[k], dict):
                        self.compliance[k] = v
            elif pillar == "explainability":
                for k, v in metrics.items():
                    if k in self.explainability:
                        self.explainability[k] = v
            elif pillar == "performance":
                if "latency" in metrics:
                    self.performance["latency"].update(metrics["latency"])
                if "throughput" in metrics:
                    self.performance["throughput"]["current"] = metrics["throughput"]

            if "score" in metrics:
                self.scores[pillar] = self._clamp(float(metrics["score"]), 0.3, 0.99)

            return {"pillar": pillar, "updated_keys": list(metrics.keys())}

    def reset(self) -> Dict:
        """Reset simulation to baseline values."""
        with self._state_lock:
            self.scores = {
                "reliability": 0.88, "security": 0.84,
                "compliance": 0.78, "explainability": 0.75,
                "performance": 0.91,
            }
            self.reliability["drift"] = {
                "data_drift": 0.022, "concept_drift": 0.065,
                "feature_drift": 0.015, "status": "stable",
            }
            self.security["injection_attempts"] = {
                "blocked": 0,
                "types": {"jailbreak": 0, "prompt_leaking": 0,
                          "role_manipulation": 0, "other": 0},
            }
            self.security["adversarial_attacks"] = {"detected": 0, "blocked_rate": 1.0}
            self.security["data_extraction_attempts"] = 0
            self.security["anomalies"] = 0
            self.security["threat_level"] = "low"
            self.security_events.clear()

            for m in self.models:
                m["drift_status"] = "stable"
                m["precision"] = 0.90 + random.uniform(0, 0.06)
                m["recall"] = 0.85 + random.uniform(0, 0.06)
                m["f1_score"] = 2 * m["precision"] * m["recall"] / (m["precision"] + m["recall"])

            self.performance["latency"] = {"p50": 45, "p90": 89, "p95": 112, "p99": 128}

            return {"status": "reset", "scores": self.scores.copy()}

    # =========================================================================
    # DATA ACCESS (called by pillar router)
    # =========================================================================

    def get_scores(self) -> Dict:
        with self._state_lock:
            s = self.scores.copy()
            s["global"] = round(sum(s.values()) / len(s), 4)
            s["timestamp"] = datetime.utcnow().isoformat()
            return s

    def get_reliability(self, hours: int = 24) -> Dict:
        with self._state_lock:
            n = min(hours, len(self.reliability_history))
            return {
                "score": round(self.scores["reliability"], 4),
                "precision": round(self.reliability["precision"], 4),
                "recall": round(self.reliability["recall"], 4),
                "f1_score": round(self.reliability["f1_score"], 4),
                "drift": {k: round(v, 4) if isinstance(v, float) else v
                          for k, v in self.reliability["drift"].items()},
                "trend": self.reliability["trend"],
                "models_monitored": self.reliability["models_monitored"],
                "quality_trend": [round(v, 4) for v in list(self.reliability_history)[-n:]],
            }

    def get_reliability_drift(self, hours: int = 24) -> Dict:
        with self._state_lock:
            drift = self.reliability["drift"]
            n = min(hours, len(self.drift_history["data"]))
            return {
                "model_id": "all",
                "data_drift": {
                    "current": round(drift["data_drift"], 4),
                    "threshold": 0.10,
                    "trend": [round(v, 4) for v in list(self.drift_history["data"])[-n:]],
                },
                "concept_drift": {
                    "current": round(drift["concept_drift"], 4),
                    "threshold": 0.15,
                    "trend": [round(v, 4) for v in list(self.drift_history["concept"])[-n:]],
                },
                "feature_drift": {
                    "current": round(drift["feature_drift"], 4),
                    "threshold": 0.05,
                    "trend": [round(v, 4) for v in list(self.drift_history["feature"])[-n:]],
                },
                "alerts": [],
            }

    def get_reliability_metrics(self) -> Dict:
        with self._state_lock:
            return {
                "models": [
                    {k: round(v, 4) if isinstance(v, float) else v for k, v in m.items()}
                    for m in self.models
                ],
                "timestamp": datetime.utcnow().isoformat(),
            }

    def get_security(self) -> Dict:
        with self._state_lock:
            return {
                "score": round(self.scores["security"], 4),
                "injection_attempts": {
                    "blocked": self.security["injection_attempts"]["blocked"],
                    "types": self.security["injection_attempts"]["types"].copy(),
                },
                "adversarial_attacks": self.security["adversarial_attacks"].copy(),
                "data_extraction_attempts": self.security["data_extraction_attempts"],
                "anomalies": self.security["anomalies"],
                "threat_level": self.security["threat_level"],
                "protections_active": self.security["protections_active"],
            }

    def get_security_threats(self) -> Dict:
        with self._state_lock:
            threats = [
                {"id": f"threat_{i}", "type": e.event_type, "severity": e.severity,
                 "timestamp": e.timestamp, "status": e.status, "model": e.model}
                for i, e in enumerate(reversed(self.security_events[-20:]))
            ]
            return {"threats": threats}

    def get_security_incidents(self) -> Dict:
        with self._state_lock:
            incidents = [
                {"id": f"incident_{i}", "type": e.event_type, "severity": e.severity,
                 "timestamp": e.timestamp, "status": e.status, "model": e.model,
                 "description": e.description}
                for i, e in enumerate(reversed(self.security_events[-10:]))
                if e.severity in ("high", "critical", "medium")
            ]
            return {
                "incidents": incidents,
                "total_blocked_24h": self.security["injection_attempts"]["blocked"],
                "response_time_avg_ms": random.randint(5, 25),
            }

    def get_compliance(self) -> Dict:
        with self._state_lock:
            return {
                "score": round(self.scores["compliance"], 4),
                "inference_traceability": self.compliance["inference_traceability"],
                "models_versioned": self.compliance["models_versioned"].copy(),
                "data_lineage_coverage": self.compliance["data_lineage_coverage"],
                "ai_act_readiness": self.compliance["ai_act_readiness"],
                "risk_classification": self.compliance["risk_classification"].copy(),
                "audit_events_30d": self.compliance["audit_events_30d"],
            }

    def get_compliance_audit(self) -> Dict:
        with self._state_lock:
            return {
                "total_events": self.compliance["audit_events_30d"],
                "retention_days": 90,
                "models": [
                    {"name": m["name"], "daily_inferences": m["inferences_24h"],
                     "traced_pct": 100 if m["drift_status"] == "stable" else 99.9,
                     "retention": "90 days"}
                    for m in self.models
                ],
            }

    def get_compliance_aiact(self) -> Dict:
        with self._state_lock:
            return {
                "readiness_score": self.compliance["ai_act_readiness"],
                "risk_classification": self.compliance["risk_classification"].copy(),
                "checklist": [item.copy() for item in self.ai_act_checklist],
                "models_by_risk": [
                    {"name": "fraud-detection-v3", "risk_level": "high", "compliant": True},
                    {"name": "recommendation-engine", "risk_level": "limited", "compliant": True},
                    {"name": "chatbot-assistant", "risk_level": "high", "compliant": False},
                    {"name": "pricing-model-v2", "risk_level": "limited", "compliant": True},
                ],
                "next_audit": "2026-06-15",
                "last_updated": datetime.utcnow().isoformat(),
            }

    def get_explainability(self) -> Dict:
        with self._state_lock:
            return {
                "score": round(self.scores["explainability"], 4),
                "feature_importance_coverage": self.explainability["feature_importance_coverage"],
                "avg_confidence": round(self.explainability["avg_confidence"], 4),
                "explanations_generated": self.explainability["explanations_generated"],
                "ethics_compliance": self.explainability["ethics_compliance"],
                "low_confidence_predictions": self.explainability["low_confidence_predictions"].copy(),
                "alternatives_coverage": self.explainability["alternatives_coverage"],
                "avg_alternatives_per_prediction": self.explainability["avg_alternatives_per_prediction"],
            }

    def get_explainability_features(self) -> Dict:
        with self._state_lock:
            return {
                "model_id": "fraud-detection-v3",
                "features": [f.copy() for f in self.features],
                "last_updated": datetime.utcnow().isoformat(),
            }

    def get_explainability_confidence(self, hours: int = 24) -> Dict:
        with self._state_lock:
            avg = self.explainability["avg_confidence"]
            n = min(hours, len(self.confidence_history))
            return {
                "model_id": "all",
                "avg_confidence": round(avg, 4),
                "distribution": {
                    "above_90": round(max(0.4, avg - 0.25), 3),
                    "70_to_90": round(max(0.2, 1 - avg), 3),
                    "50_to_70": round(max(0.03, (1 - avg) * 0.3), 3),
                    "below_50": round(max(0.005, (1 - avg) * 0.05), 3),
                },
                "trend": [round(v, 4) for v in list(self.confidence_history)[-n:]],
                "low_confidence_alerts": random.randint(1, 5),
                "timestamp": datetime.utcnow().isoformat(),
            }

    def get_performance(self) -> Dict:
        with self._state_lock:
            return {
                "score": round(self.scores["performance"], 4),
                "latency": self.performance["latency"].copy(),
                "throughput": self.performance["throughput"].copy(),
                "cost": self.performance["cost"].copy(),
                "gpu_utilization": {k: round(v, 3) for k, v
                                    in self.performance["gpu_utilization"].items()},
            }

    def get_performance_latency(self, hours: int = 24) -> Dict:
        with self._state_lock:
            n = min(hours, len(self.latency_history["p50"]))
            return {
                "p50_trend": list(self.latency_history["p50"])[-n:],
                "p95_trend": list(self.latency_history["p95"])[-n:],
                "p99_trend": list(self.latency_history["p99"])[-n:],
                "by_model": [
                    {"model": "fraud-detection", "p50": 42, "p95": 98, "p99": 118},
                    {"model": "recommendation", "p50": 55, "p95": 125, "p99": 145},
                    {"model": "chatbot", "p50": 180, "p95": 450, "p99": 620},
                ],
            }

    def get_performance_cost(self, days: int = 7) -> Dict:
        with self._state_lock:
            n = min(days, len(self.cost_history))
            costs = list(self.cost_history)[-n:]
            return {
                "daily_costs": costs,
                "total": round(sum(costs), 2) if costs else 0,
                "average": round(sum(costs) / len(costs), 2) if costs else 0,
                "breakdown": self.cost_breakdown.copy(),
                "by_model": [m.copy() for m in self.cost_by_model],
            }

    def get_status(self) -> Dict:
        """Return simulator status for monitoring."""
        with self._state_lock:
            return {
                "running": self._running,
                "ticks": self._tick_count,
                "uptime_seconds": round(time.time() - self._start_time, 1),
                "scores": {k: round(v, 3) for k, v in self.scores.items()},
                "threat_level": self.security["threat_level"],
                "security_events_count": len(self.security_events),
                "drift_status": self.reliability["drift"]["status"],
            }


# Singleton accessor
def get_simulator() -> PillarSimulator:
    return PillarSimulator()


async def run_simulator_loop():
    """Background async loop that ticks the simulator every 2 seconds."""
    sim = get_simulator()
    sim._running = True
    while sim._running:
        sim.tick()
        await asyncio.sleep(2)
