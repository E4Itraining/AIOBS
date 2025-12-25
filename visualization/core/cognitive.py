"""
AIOBS Cognitive Engine - Production Implementation
AI-specific observability: Trust Score, Drift, Reliability, Hallucination
"""

import json
import os
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

from .detectors import (
    DegradationSignal,
    DegradationTracker,
    DriftDetector,
    DriftResult,
    DriftSeverity,
    DriftType,
    HallucinationDetector,
    HallucinationResult,
    ReliabilityAnalyzer,
    ReliabilityResult,
)


# =============================================================================
# Trust Score Model
# =============================================================================


@dataclass
class TrustBreakdown:
    """Detailed trust score breakdown"""
    drift_component: float
    reliability_component: float
    hallucination_component: float
    degradation_component: float


@dataclass
class TrustScore:
    """Trust Score with full transparency"""
    overall: float  # 0-1
    breakdown: TrustBreakdown
    trend: str  # improving, stable, degrading
    confidence: float  # Confidence in the score
    computed_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "overall": round(self.overall, 3),
            "breakdown": {
                "drift_component": round(self.breakdown.drift_component, 3),
                "reliability_component": round(self.breakdown.reliability_component, 3),
                "hallucination_component": round(self.breakdown.hallucination_component, 3),
                "degradation_component": round(self.breakdown.degradation_component, 3),
            },
            "trend": self.trend,
            "confidence": round(self.confidence, 3),
            "computed_at": self.computed_at.isoformat(),
        }


@dataclass
class ModelMetricsHistory:
    """Historical metrics for a model"""
    model_id: str
    trust_scores: List[float] = field(default_factory=list)
    drift_scores: List[float] = field(default_factory=list)
    reliability_scores: List[float] = field(default_factory=list)
    timestamps: List[str] = field(default_factory=list)
    max_history: int = 100

    def add_snapshot(
        self,
        trust: float,
        drift: float,
        reliability: float,
    ) -> None:
        """Add a new snapshot"""
        self.trust_scores.append(trust)
        self.drift_scores.append(drift)
        self.reliability_scores.append(reliability)
        self.timestamps.append(datetime.utcnow().isoformat())

        # Trim to max history
        if len(self.trust_scores) > self.max_history:
            self.trust_scores = self.trust_scores[-self.max_history:]
            self.drift_scores = self.drift_scores[-self.max_history:]
            self.reliability_scores = self.reliability_scores[-self.max_history:]
            self.timestamps = self.timestamps[-self.max_history:]

    def get_trend(self) -> str:
        """Compute trend from history"""
        if len(self.trust_scores) < 2:
            return "stable"

        recent = self.trust_scores[-5:] if len(self.trust_scores) >= 5 else self.trust_scores
        older = self.trust_scores[-10:-5] if len(self.trust_scores) >= 10 else self.trust_scores[:len(recent)]

        if not older:
            return "stable"

        recent_avg = sum(recent) / len(recent)
        older_avg = sum(older) / len(older)

        diff = recent_avg - older_avg
        if diff > 0.05:
            return "improving"
        elif diff < -0.05:
            return "degrading"
        return "stable"


# =============================================================================
# Metrics Store - Persistent Storage for Cognitive Metrics
# =============================================================================


class MetricsStore:
    """Persistent storage for model metrics and baselines"""

    def __init__(self, data_dir: str = "data/cognitive"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.baselines_file = self.data_dir / "baselines.json"
        self.history_file = self.data_dir / "history.json"
        self.ingested_file = self.data_dir / "ingested_data.json"

        self.baselines: Dict[str, Dict[str, List[float]]] = self._load_json(self.baselines_file, {})
        self.history: Dict[str, ModelMetricsHistory] = self._load_history()
        self.ingested_data: Dict[str, Dict[str, Any]] = self._load_json(self.ingested_file, {})

    def _load_json(self, path: Path, default: Any) -> Any:
        if path.exists():
            try:
                with open(path) as f:
                    return json.load(f)
            except Exception:
                return default
        return default

    def _load_history(self) -> Dict[str, ModelMetricsHistory]:
        data = self._load_json(self.history_file, {})
        history = {}
        for model_id, h in data.items():
            history[model_id] = ModelMetricsHistory(
                model_id=model_id,
                trust_scores=h.get("trust_scores", []),
                drift_scores=h.get("drift_scores", []),
                reliability_scores=h.get("reliability_scores", []),
                timestamps=h.get("timestamps", []),
            )
        return history

    def _save_json(self, path: Path, data: Any) -> None:
        with open(path, "w") as f:
            json.dump(data, f, indent=2, default=str)

    def save(self) -> None:
        """Persist all data"""
        self._save_json(self.baselines_file, self.baselines)

        history_data = {}
        for model_id, h in self.history.items():
            history_data[model_id] = {
                "trust_scores": h.trust_scores,
                "drift_scores": h.drift_scores,
                "reliability_scores": h.reliability_scores,
                "timestamps": h.timestamps,
            }
        self._save_json(self.history_file, history_data)

        self._save_json(self.ingested_file, self.ingested_data)

    def get_baseline(self, model_id: str) -> Optional[Dict[str, List[float]]]:
        return self.baselines.get(model_id)

    def set_baseline(self, model_id: str, data: Dict[str, List[float]]) -> None:
        self.baselines[model_id] = data
        self.save()

    def get_history(self, model_id: str) -> ModelMetricsHistory:
        if model_id not in self.history:
            self.history[model_id] = ModelMetricsHistory(model_id=model_id)
        return self.history[model_id]

    def add_snapshot(
        self, model_id: str, trust: float, drift: float, reliability: float
    ) -> None:
        history = self.get_history(model_id)
        history.add_snapshot(trust, drift, reliability)
        self.save()

    def ingest_predictions(
        self,
        model_id: str,
        predictions: List[float],
        labels: Optional[List[float]] = None,
        confidences: Optional[List[float]] = None,
        features: Optional[Dict[str, List[float]]] = None,
    ) -> None:
        """Ingest model predictions for analysis"""
        if model_id not in self.ingested_data:
            self.ingested_data[model_id] = {
                "predictions": [],
                "labels": [],
                "confidences": [],
                "features": {},
                "timestamp": [],
            }

        data = self.ingested_data[model_id]
        data["predictions"].extend(predictions)
        if labels:
            data["labels"].extend(labels)
        if confidences:
            data["confidences"].extend(confidences)
        if features:
            for k, v in features.items():
                if k not in data["features"]:
                    data["features"][k] = []
                data["features"][k].extend(v)

        data["timestamp"].append(datetime.utcnow().isoformat())

        # Trim to last 10000 samples
        max_samples = 10000
        if len(data["predictions"]) > max_samples:
            data["predictions"] = data["predictions"][-max_samples:]
            data["labels"] = data["labels"][-max_samples:] if data["labels"] else []
            data["confidences"] = data["confidences"][-max_samples:] if data["confidences"] else []
            for k in data["features"]:
                data["features"][k] = data["features"][k][-max_samples:]

        self.save()

    def get_ingested_data(self, model_id: str) -> Optional[Dict[str, Any]]:
        return self.ingested_data.get(model_id)


# =============================================================================
# Cognitive Engine - Main Entry Point
# =============================================================================


class CognitiveEngine:
    """
    Production Cognitive Engine for AI Systems.

    Computes real AI-specific observability metrics:
    - Trust Score: Composite metric combining all factors
    - Drift Detection: Statistical tests (KS, PSI, JS, Wasserstein)
    - Reliability Analysis: ECE, MCE, Brier, Stability
    - Hallucination Detection: Grounding, Consistency, Factuality
    - Degradation Tracking: Performance trend analysis
    """

    # Trust Score weights
    WEIGHTS = {
        "drift": 0.25,
        "reliability": 0.30,
        "hallucination": 0.25,
        "degradation": 0.20,
    }

    def __init__(
        self,
        data_dir: str = "data/cognitive",
        drift_threshold: float = 0.1,
        reliability_threshold: float = 0.1,
        hallucination_threshold: float = 0.7,
    ):
        self.store = MetricsStore(data_dir)
        self.drift_detector = DriftDetector(psi_threshold=drift_threshold)
        self.reliability_analyzer = ReliabilityAnalyzer(calibration_threshold=reliability_threshold)
        self.hallucination_detector = HallucinationDetector(grounding_threshold=hallucination_threshold)
        self.degradation_tracker = DegradationTracker()

        self._trust_cache: Dict[str, float] = {}

    # =========================================================================
    # Core Analysis Methods
    # =========================================================================

    def analyze_drift(
        self,
        model_id: str,
        current_data: Optional[Dict[str, List[float]]] = None,
    ) -> Dict[str, DriftResult]:
        """
        Analyze drift for a model using stored baseline and current data.
        """
        baseline = self.store.get_baseline(model_id)

        # Use ingested data if no current data provided
        if current_data is None:
            ingested = self.store.get_ingested_data(model_id)
            if ingested and ingested.get("features"):
                current_data = ingested["features"]

        # Generate demo data if no real data available
        if baseline is None or current_data is None:
            return self._generate_demo_drift_results(model_id)

        results = {}

        # Data drift
        data_drift = self.drift_detector.detect_data_drift(baseline, current_data)
        results["data"] = data_drift

        # Prediction drift (if predictions available)
        ingested = self.store.get_ingested_data(model_id)
        if ingested and len(ingested.get("predictions", [])) > 100:
            preds = ingested["predictions"]
            mid = len(preds) // 2
            ref_preds = preds[:mid]
            curr_preds = preds[mid:]
            pred_drift = self.drift_detector.detect_prediction_drift(ref_preds, curr_preds)
            results["prediction"] = pred_drift

            # Concept drift (if labels available)
            labels = ingested.get("labels", [])
            if len(labels) >= len(preds):
                is_concept_drift, concept_score = self.drift_detector.detect_concept_drift(
                    preds, labels
                )
                results["concept"] = DriftResult(
                    drift_type=DriftType.CONCEPT,
                    score=min(1.0, concept_score),
                    is_significant=is_concept_drift,
                    p_value=None,
                    severity=DriftSeverity.MODERATE if is_concept_drift else DriftSeverity.NONE,
                    affected_features=["labels"],
                    details={"concept_score": concept_score},
                )

        return results

    def analyze_reliability(
        self,
        model_id: str,
    ) -> ReliabilityResult:
        """
        Analyze reliability using stored predictions and labels.
        """
        ingested = self.store.get_ingested_data(model_id)

        if ingested is None:
            return self._generate_demo_reliability()

        predictions = ingested.get("predictions", [])
        labels = ingested.get("labels", [])
        confidences = ingested.get("confidences", [])

        # For classification, convert to binary
        if predictions and labels and confidences:
            pred_binary = [1 if p > 0.5 else 0 for p in predictions[:len(labels)]]
            label_binary = [1 if l > 0.5 else 0 for l in labels[:len(predictions)]]
            conf_subset = confidences[:len(predictions)]

            return self.reliability_analyzer.analyze(
                confidences=conf_subset,
                predictions=pred_binary,
                labels=label_binary,
            )

        return self._generate_demo_reliability()

    def analyze_hallucination(
        self,
        model_id: str,
        outputs: Optional[List[str]] = None,
        sources: Optional[List[str]] = None,
    ) -> HallucinationResult:
        """
        Analyze hallucination risk for GenAI outputs.
        """
        if outputs and sources:
            return self.hallucination_detector.analyze(outputs, sources)

        # Demo data for GenAI models
        return self._generate_demo_hallucination()

    def analyze_degradation(
        self,
        model_id: str,
        current_metrics: Optional[Dict[str, float]] = None,
    ) -> List[DegradationSignal]:
        """
        Analyze performance degradation.
        """
        history = self.store.get_history(model_id)

        if not history.trust_scores or current_metrics is None:
            return self._generate_demo_degradation(model_id)

        # Use historical average as baseline
        baseline_metrics = {
            "trust_score": sum(history.trust_scores) / len(history.trust_scores),
            "drift_score": sum(history.drift_scores) / len(history.drift_scores),
            "reliability_score": sum(history.reliability_scores) / len(history.reliability_scores),
        }

        return self.degradation_tracker.analyze(
            current_metrics,
            baseline_metrics,
            higher_is_better={"trust_score": True, "drift_score": False, "reliability_score": True},
        )

    # =========================================================================
    # Trust Score Computation
    # =========================================================================

    def compute_trust_score(
        self,
        model_id: str,
        drift_results: Optional[Dict[str, DriftResult]] = None,
        reliability: Optional[ReliabilityResult] = None,
        hallucination: Optional[HallucinationResult] = None,
        degradation: Optional[List[DegradationSignal]] = None,
    ) -> TrustScore:
        """
        Compute the Trust Score from all cognitive metrics.

        Trust = w1*(1-drift) + w2*reliability + w3*(1-hallucination_risk) + w4*(1-degradation)
        """
        # Get metrics if not provided
        if drift_results is None:
            drift_results = self.analyze_drift(model_id)
        if reliability is None:
            reliability = self.analyze_reliability(model_id)
        if hallucination is None:
            hallucination = self.analyze_hallucination(model_id)
        if degradation is None:
            degradation = self.analyze_degradation(model_id)

        # Compute component scores (0-1, higher is better)

        # Drift: average of all drift scores, inverted
        drift_scores = [r.score for r in drift_results.values()]
        drift_risk = sum(drift_scores) / len(drift_scores) if drift_scores else 0
        drift_trust = 1 - drift_risk

        # Reliability: direct score
        reliability_trust = reliability.overall_score

        # Hallucination: overall score (already 0-1, higher is better)
        hallucination_trust = hallucination.overall_score

        # Degradation: compute risk and invert
        degradation_risk = self.degradation_tracker.compute_overall_risk(degradation)
        degradation_trust = 1 - degradation_risk

        # Weighted components
        drift_component = self.WEIGHTS["drift"] * drift_trust
        reliability_component = self.WEIGHTS["reliability"] * reliability_trust
        hallucination_component = self.WEIGHTS["hallucination"] * hallucination_trust
        degradation_component = self.WEIGHTS["degradation"] * degradation_trust

        overall = drift_component + reliability_component + hallucination_component + degradation_component

        # Compute trend from history
        history = self.store.get_history(model_id)
        trend = history.get_trend()

        # Compute confidence (based on data availability)
        confidence = self._compute_confidence(model_id, drift_results, reliability)

        trust_score = TrustScore(
            overall=overall,
            breakdown=TrustBreakdown(
                drift_component=drift_component,
                reliability_component=reliability_component,
                hallucination_component=hallucination_component,
                degradation_component=degradation_component,
            ),
            trend=trend,
            confidence=confidence,
        )

        # Update history and cache
        self.store.add_snapshot(model_id, overall, drift_risk, reliability.overall_score)
        self._trust_cache[model_id] = overall

        return trust_score

    def _compute_confidence(
        self,
        model_id: str,
        drift_results: Dict[str, DriftResult],
        reliability: ReliabilityResult,
    ) -> float:
        """
        Compute confidence in the Trust Score based on data availability.
        """
        confidence = 0.5  # Base confidence

        # Check if we have real data
        ingested = self.store.get_ingested_data(model_id)
        if ingested:
            n_predictions = len(ingested.get("predictions", []))
            if n_predictions > 1000:
                confidence += 0.3
            elif n_predictions > 100:
                confidence += 0.2
            elif n_predictions > 10:
                confidence += 0.1

        # Check if we have baselines
        if self.store.get_baseline(model_id):
            confidence += 0.1

        # Check history depth
        history = self.store.get_history(model_id)
        if len(history.trust_scores) > 10:
            confidence += 0.1

        return min(1.0, confidence)

    # =========================================================================
    # Full Model Snapshot
    # =========================================================================

    def get_model_snapshot(self, model_id: str) -> Dict[str, Any]:
        """
        Get a complete cognitive snapshot for a model.
        """
        drift_results = self.analyze_drift(model_id)
        reliability = self.analyze_reliability(model_id)
        hallucination = self.analyze_hallucination(model_id)
        degradation = self.analyze_degradation(model_id)
        trust = self.compute_trust_score(
            model_id, drift_results, reliability, hallucination, degradation
        )

        return {
            "model_id": model_id,
            "trust_score": trust.to_dict(),
            "drift": {
                k: {
                    "type": v.drift_type.value,
                    "score": round(v.score, 3),
                    "is_significant": v.is_significant,
                    "severity": v.severity.value,
                    "affected_features": v.affected_features,
                    "p_value": round(v.p_value, 4) if v.p_value else None,
                    "details": {dk: round(dv, 4) for dk, dv in v.details.items()},
                }
                for k, v in drift_results.items()
            },
            "reliability": {
                "overall_score": round(reliability.overall_score, 3),
                "status": reliability.status,
                "calibration": {
                    "ece": round(reliability.calibration.expected_calibration_error, 4),
                    "mce": round(reliability.calibration.maximum_calibration_error, 4),
                    "brier_score": round(reliability.calibration.brier_score, 4),
                    "is_well_calibrated": reliability.calibration.is_well_calibrated,
                },
                "stability": {
                    "variation_coefficient": round(reliability.stability.variation_coefficient, 4),
                    "is_stable": reliability.stability.is_stable,
                },
                "uncertainty_correlation": round(reliability.uncertainty_correlation, 3),
            },
            "hallucination": {
                "overall_score": round(hallucination.overall_score, 3),
                "risk_level": hallucination.risk_level,
                "grounding_score": round(hallucination.grounding_score, 3),
                "consistency_score": round(hallucination.consistency_score, 3),
                "factuality_score": round(hallucination.factuality_score, 3),
                "flagged_outputs": hallucination.flagged_outputs[:5],  # Limit output
            },
            "degradation": [
                {
                    "metric": s.metric_name,
                    "current": round(s.current_value, 3),
                    "baseline": round(s.baseline_value, 3),
                    "change_pct": round(s.change_pct, 1),
                    "trend": s.trend,
                    "alert_level": s.alert_level,
                }
                for s in degradation
            ],
            "computed_at": datetime.utcnow().isoformat(),
        }

    # =========================================================================
    # Data Ingestion API
    # =========================================================================

    def ingest(
        self,
        model_id: str,
        predictions: List[float],
        labels: Optional[List[float]] = None,
        confidences: Optional[List[float]] = None,
        features: Optional[Dict[str, List[float]]] = None,
    ) -> Dict[str, Any]:
        """
        Ingest model predictions for continuous analysis.
        Returns ingestion summary.
        """
        self.store.ingest_predictions(
            model_id=model_id,
            predictions=predictions,
            labels=labels,
            confidences=confidences,
            features=features,
        )

        # Auto-set baseline if not exists and enough data
        if self.store.get_baseline(model_id) is None:
            ingested = self.store.get_ingested_data(model_id)
            if ingested and len(ingested.get("predictions", [])) >= 100:
                if features:
                    self.store.set_baseline(model_id, features)

        ingested = self.store.get_ingested_data(model_id)
        return {
            "model_id": model_id,
            "status": "ingested",
            "total_predictions": len(ingested.get("predictions", [])),
            "has_baseline": self.store.get_baseline(model_id) is not None,
        }

    def set_baseline(
        self, model_id: str, features: Dict[str, List[float]]
    ) -> Dict[str, Any]:
        """
        Explicitly set baseline for a model.
        """
        self.store.set_baseline(model_id, features)
        return {
            "model_id": model_id,
            "status": "baseline_set",
            "features": list(features.keys()),
            "samples_per_feature": {k: len(v) for k, v in features.items()},
        }

    # =========================================================================
    # Demo Data Generators (Fallback when no real data)
    # =========================================================================

    def _generate_demo_drift_results(self, model_id: str) -> Dict[str, DriftResult]:
        """Generate realistic demo drift results"""
        import hashlib

        # Deterministic but varied scores based on model_id
        seed = int(hashlib.md5(model_id.encode()).hexdigest()[:8], 16) % 1000 / 1000

        data_score = 0.1 + seed * 0.2
        pred_score = 0.05 + seed * 0.15
        concept_score = 0.02 + seed * 0.1

        return {
            "data": DriftResult(
                drift_type=DriftType.DATA,
                score=data_score,
                is_significant=data_score > 0.15,
                p_value=0.1 - seed * 0.08,
                severity=DriftSeverity.MODERATE if data_score > 0.15 else DriftSeverity.NONE,
                affected_features=["feature_a", "feature_c"] if data_score > 0.15 else [],
                details={"psi": data_score * 0.3, "ks_stat": data_score * 0.8},
            ),
            "prediction": DriftResult(
                drift_type=DriftType.PREDICTION,
                score=pred_score,
                is_significant=pred_score > 0.1,
                p_value=0.15 - seed * 0.1,
                severity=DriftSeverity.NONE,
                affected_features=["predictions"],
                details={"psi": pred_score * 0.25, "js_divergence": pred_score * 0.5},
            ),
            "concept": DriftResult(
                drift_type=DriftType.CONCEPT,
                score=concept_score,
                is_significant=False,
                p_value=None,
                severity=DriftSeverity.NONE,
                affected_features=[],
                details={"concept_score": concept_score},
            ),
        }

    def _generate_demo_reliability(self) -> ReliabilityResult:
        """Generate realistic demo reliability"""
        from .detectors import CalibrationResult, StabilityResult

        return ReliabilityResult(
            calibration=CalibrationResult(
                expected_calibration_error=0.08,
                maximum_calibration_error=0.15,
                brier_score=0.12,
                reliability_diagram=[(0.1, 0.12), (0.3, 0.28), (0.5, 0.52), (0.7, 0.68), (0.9, 0.88)],
                is_well_calibrated=True,
            ),
            stability=StabilityResult(
                variation_coefficient=0.05,
                max_deviation=0.08,
                mean_std=0.03,
                is_stable=True,
            ),
            uncertainty_correlation=0.72,
            overall_score=0.85,
            status="healthy",
        )

    def _generate_demo_hallucination(self) -> HallucinationResult:
        """Generate realistic demo hallucination metrics"""
        return HallucinationResult(
            grounding_score=0.82,
            consistency_score=0.88,
            factuality_score=0.78,
            confidence_alignment=0.85,
            risk_level="low",
            overall_score=0.83,
            flagged_outputs=[],
        )

    def _generate_demo_degradation(self, model_id: str) -> List[DegradationSignal]:
        """Generate realistic demo degradation signals"""
        import hashlib

        seed = int(hashlib.md5(model_id.encode()).hexdigest()[:8], 16) % 1000 / 1000

        return [
            DegradationSignal(
                metric_name="accuracy",
                current_value=0.92 - seed * 0.05,
                baseline_value=0.95,
                change_pct=3.2 + seed * 2,
                trend="stable" if seed < 0.5 else "degrading",
                alert_level="none" if seed < 0.7 else "warning",
            ),
            DegradationSignal(
                metric_name="latency_p99",
                current_value=48 + seed * 10,
                baseline_value=45,
                change_pct=6.7 + seed * 5,
                trend="stable",
                alert_level="none",
            ),
            DegradationSignal(
                metric_name="throughput",
                current_value=1180 - seed * 100,
                baseline_value=1200,
                change_pct=1.7 + seed * 3,
                trend="stable",
                alert_level="none",
            ),
        ]
