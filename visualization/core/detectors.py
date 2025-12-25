"""
AIOBS Real Detectors - Production-Ready Algorithms
Statistical drift detection, reliability analysis, and hallucination detection
"""

import math
import statistics
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple


# =============================================================================
# Data Types
# =============================================================================


class DriftType(Enum):
    DATA = "data"
    CONCEPT = "concept"
    PREDICTION = "prediction"


class DriftSeverity(Enum):
    NONE = "none"
    MODERATE = "moderate"
    SEVERE = "severe"
    CRITICAL = "critical"


@dataclass
class DriftResult:
    """Drift detection result with statistical details"""
    drift_type: DriftType
    score: float  # 0-1, higher = more drift
    is_significant: bool
    p_value: Optional[float]
    severity: DriftSeverity
    affected_features: List[str]
    details: Dict[str, float] = field(default_factory=dict)
    detected_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class CalibrationResult:
    """Calibration analysis result"""
    expected_calibration_error: float  # ECE
    maximum_calibration_error: float  # MCE
    brier_score: float
    reliability_diagram: List[Tuple[float, float]]
    is_well_calibrated: bool


@dataclass
class StabilityResult:
    """Prediction stability result"""
    variation_coefficient: float
    max_deviation: float
    mean_std: float
    is_stable: bool


@dataclass
class ReliabilityResult:
    """Complete reliability analysis"""
    calibration: CalibrationResult
    stability: StabilityResult
    uncertainty_correlation: float
    overall_score: float
    status: str  # healthy, warning, critical


@dataclass
class HallucinationResult:
    """Hallucination analysis result"""
    grounding_score: float
    consistency_score: float
    factuality_score: float
    confidence_alignment: float
    risk_level: str  # low, medium, high
    overall_score: float
    flagged_outputs: List[Dict] = field(default_factory=list)


# =============================================================================
# Drift Detector - Real Statistical Tests
# =============================================================================


class DriftDetector:
    """
    Production-ready drift detection using statistical tests.

    Implements:
    - Kolmogorov-Smirnov test for distribution comparison
    - Population Stability Index (PSI) for monitoring
    - Jensen-Shannon divergence for symmetric comparison
    - Wasserstein distance for distribution shift magnitude
    """

    def __init__(
        self,
        ks_threshold: float = 0.05,
        psi_threshold: float = 0.1,
        concept_threshold: float = 0.3,
    ):
        self.ks_threshold = ks_threshold
        self.psi_threshold = psi_threshold
        self.concept_threshold = concept_threshold

    def kolmogorov_smirnov_test(
        self, reference: List[float], current: List[float]
    ) -> Tuple[float, float]:
        """
        Kolmogorov-Smirnov test for distribution comparison.
        Returns (statistic, p_value)
        """
        if not reference or not current:
            return 0.0, 1.0

        ref_sorted = sorted(reference)
        curr_sorted = sorted(current)
        n1, n2 = len(ref_sorted), len(curr_sorted)

        all_values = sorted(set(ref_sorted + curr_sorted))

        max_diff = 0.0
        for val in all_values:
            cdf_ref = sum(1 for x in ref_sorted if x <= val) / n1
            cdf_curr = sum(1 for x in curr_sorted if x <= val) / n2
            diff = abs(cdf_ref - cdf_curr)
            max_diff = max(max_diff, diff)

        # Asymptotic p-value
        en = math.sqrt(n1 * n2 / (n1 + n2))
        p_value = 2 * math.exp(-2 * (max_diff * en) ** 2)
        p_value = min(1.0, max(0.0, p_value))

        return max_diff, p_value

    def population_stability_index(
        self, reference: List[float], current: List[float], bins: int = 10
    ) -> float:
        """
        Population Stability Index (PSI).
        PSI < 0.1: No significant change
        0.1 <= PSI < 0.25: Moderate change
        PSI >= 0.25: Significant change
        """
        if not reference or not current:
            return 0.0

        min_val = min(min(reference), min(current))
        max_val = max(max(reference), max(current))

        if min_val == max_val:
            return 0.0

        bin_edges = [min_val + i * (max_val - min_val) / bins for i in range(bins + 1)]

        def get_bin_counts(data: List[float]) -> List[int]:
            counts = [0] * bins
            for val in data:
                for i in range(bins):
                    if bin_edges[i] <= val < bin_edges[i + 1]:
                        counts[i] += 1
                        break
                else:
                    counts[-1] += 1
            return counts

        ref_counts = get_bin_counts(reference)
        curr_counts = get_bin_counts(current)

        n_ref, n_curr = len(reference), len(current)
        epsilon = 0.0001

        psi = 0.0
        for ref_c, curr_c in zip(ref_counts, curr_counts):
            ref_pct = (ref_c + epsilon) / (n_ref + bins * epsilon)
            curr_pct = (curr_c + epsilon) / (n_curr + bins * epsilon)
            psi += (curr_pct - ref_pct) * math.log(curr_pct / ref_pct)

        return psi

    def jensen_shannon_divergence(
        self, reference: List[float], current: List[float], bins: int = 10
    ) -> float:
        """
        Jensen-Shannon Divergence - symmetric distribution difference.
        Returns value between 0 (identical) and 1 (maximally different).
        """
        if not reference or not current:
            return 0.0

        min_val = min(min(reference), min(current))
        max_val = max(max(reference), max(current))

        if min_val == max_val:
            return 0.0

        def histogram(data: List[float]) -> List[float]:
            counts = [0] * bins
            for val in data:
                bin_idx = int((val - min_val) / (max_val - min_val + 1e-10) * bins)
                bin_idx = min(bin_idx, bins - 1)
                counts[bin_idx] += 1
            total = sum(counts) + bins * 1e-10
            return [(c + 1e-10) / total for c in counts]

        p = histogram(reference)
        q = histogram(current)
        m = [(pi + qi) / 2 for pi, qi in zip(p, q)]

        def kl_div(a: List[float], b: List[float]) -> float:
            return sum(ai * math.log(ai / bi) for ai, bi in zip(a, b))

        js = 0.5 * kl_div(p, m) + 0.5 * kl_div(q, m)
        return min(1.0, math.sqrt(js))

    def wasserstein_distance(self, reference: List[float], current: List[float]) -> float:
        """
        Wasserstein (Earth Mover's) distance between distributions.
        """
        if not reference or not current:
            return 0.0

        ref_sorted = sorted(reference)
        curr_sorted = sorted(current)

        all_vals = ref_sorted + curr_sorted
        val_range = max(all_vals) - min(all_vals)
        if val_range == 0:
            return 0.0

        all_points = sorted(set(ref_sorted + curr_sorted))
        n_ref, n_curr = len(ref_sorted), len(curr_sorted)

        distance = 0.0
        prev_point = all_points[0]

        for point in all_points[1:]:
            cdf_ref = sum(1 for x in ref_sorted if x <= prev_point) / n_ref
            cdf_curr = sum(1 for x in curr_sorted if x <= prev_point) / n_curr
            distance += abs(cdf_ref - cdf_curr) * (point - prev_point)
            prev_point = point

        return distance / val_range

    def detect_concept_drift(
        self, predictions: List[float], labels: List[float], window_size: int = 50
    ) -> Tuple[bool, float]:
        """
        Detect concept drift using error rate monitoring (ADWIN-like).
        """
        if len(predictions) < window_size * 2 or len(labels) < window_size * 2:
            return False, 0.0

        errors = [abs(p - l) for p, l in zip(predictions, labels)]
        first_half = errors[: len(errors) // 2]
        second_half = errors[len(errors) // 2:]

        first_rate = statistics.mean(first_half)
        second_rate = statistics.mean(second_half)

        if first_rate == 0:
            drift_score = second_rate
        else:
            drift_score = abs(second_rate - first_rate) / first_rate

        return drift_score > self.concept_threshold, drift_score

    def classify_severity(self, psi: float) -> DriftSeverity:
        """Classify drift severity based on PSI value"""
        if psi < 0.1:
            return DriftSeverity.NONE
        elif psi < 0.25:
            return DriftSeverity.MODERATE
        elif psi < 0.4:
            return DriftSeverity.SEVERE
        else:
            return DriftSeverity.CRITICAL

    def detect_data_drift(
        self,
        reference: Dict[str, List[float]],
        current: Dict[str, List[float]]
    ) -> DriftResult:
        """
        Detect data drift across multiple features.
        """
        affected_features = []
        total_score = 0.0
        details = {}
        min_pvalue = 1.0

        for feature_name in reference:
            if feature_name not in current:
                continue

            ref_data = reference[feature_name]
            curr_data = current[feature_name]

            ks_stat, ks_pvalue = self.kolmogorov_smirnov_test(ref_data, curr_data)
            psi = self.population_stability_index(ref_data, curr_data)
            js_div = self.jensen_shannon_divergence(ref_data, curr_data)

            feature_score = (ks_stat + psi / 0.25 + js_div) / 3
            total_score += feature_score

            details[f"{feature_name}_ks"] = ks_stat
            details[f"{feature_name}_psi"] = psi
            details[f"{feature_name}_js"] = js_div

            if ks_pvalue < self.ks_threshold or psi >= self.psi_threshold:
                affected_features.append(feature_name)
                min_pvalue = min(min_pvalue, ks_pvalue)

        n_features = len(reference)
        avg_score = total_score / n_features if n_features > 0 else 0.0
        avg_psi = sum(v for k, v in details.items() if k.endswith("_psi")) / n_features if n_features > 0 else 0.0

        return DriftResult(
            drift_type=DriftType.DATA,
            score=min(1.0, avg_score),
            is_significant=len(affected_features) > 0,
            p_value=min_pvalue if affected_features else None,
            severity=self.classify_severity(avg_psi),
            affected_features=affected_features,
            details=details,
        )

    def detect_prediction_drift(
        self, reference_preds: List[float], current_preds: List[float]
    ) -> DriftResult:
        """
        Detect prediction distribution drift.
        """
        ks_stat, ks_pvalue = self.kolmogorov_smirnov_test(reference_preds, current_preds)
        psi = self.population_stability_index(reference_preds, current_preds)
        js_div = self.jensen_shannon_divergence(reference_preds, current_preds)
        wasserstein = self.wasserstein_distance(reference_preds, current_preds)

        score = (ks_stat + psi / 0.25 + js_div) / 3

        return DriftResult(
            drift_type=DriftType.PREDICTION,
            score=min(1.0, score),
            is_significant=ks_pvalue < self.ks_threshold or psi >= self.psi_threshold,
            p_value=ks_pvalue,
            severity=self.classify_severity(psi),
            affected_features=["predictions"],
            details={
                "ks_statistic": ks_stat,
                "ks_pvalue": ks_pvalue,
                "psi": psi,
                "js_divergence": js_div,
                "wasserstein": wasserstein,
            },
        )


# =============================================================================
# Reliability Analyzer - Real Metrics
# =============================================================================


class ReliabilityAnalyzer:
    """
    Production-ready reliability analysis.

    Implements:
    - Expected Calibration Error (ECE)
    - Maximum Calibration Error (MCE)
    - Brier Score
    - Prediction stability analysis
    - Uncertainty quality assessment
    """

    def __init__(
        self,
        n_bins: int = 10,
        calibration_threshold: float = 0.1,
        stability_threshold: float = 0.1,
    ):
        self.n_bins = n_bins
        self.calibration_threshold = calibration_threshold
        self.stability_threshold = stability_threshold

    def compute_calibration(
        self,
        confidences: List[float],
        predictions: List[int],
        labels: List[int],
    ) -> CalibrationResult:
        """
        Compute calibration metrics for a classifier.
        Well-calibrated: P(correct | confidence=p) = p
        """
        if len(confidences) != len(predictions) or len(predictions) != len(labels):
            raise ValueError("Input lengths must match")

        n = len(confidences)
        if n == 0:
            return CalibrationResult(0, 0, 0, [], True)

        bin_boundaries = [i / self.n_bins for i in range(self.n_bins + 1)]
        bin_accuracies = []
        bin_confidences = []
        bin_counts = []

        for i in range(self.n_bins):
            bin_lower = bin_boundaries[i]
            bin_upper = bin_boundaries[i + 1]

            in_bin = [
                (c, p, l)
                for c, p, l in zip(confidences, predictions, labels)
                if bin_lower <= c < bin_upper or (i == self.n_bins - 1 and c == bin_upper)
            ]

            if in_bin:
                bin_conf = [c for c, _, _ in in_bin]
                bin_acc = [1 if p == l else 0 for _, p, l in in_bin]
                bin_accuracies.append(sum(bin_acc) / len(bin_acc))
                bin_confidences.append(sum(bin_conf) / len(bin_conf))
                bin_counts.append(len(in_bin))
            else:
                bin_accuracies.append(0)
                bin_confidences.append((bin_lower + bin_upper) / 2)
                bin_counts.append(0)

        # Expected Calibration Error
        ece = sum(
            (count / n) * abs(acc - conf)
            for acc, conf, count in zip(bin_accuracies, bin_confidences, bin_counts)
            if count > 0
        )

        # Maximum Calibration Error
        mce = (
            max(
                abs(acc - conf)
                for acc, conf, count in zip(bin_accuracies, bin_confidences, bin_counts)
                if count > 0
            )
            if any(c > 0 for c in bin_counts)
            else 0
        )

        # Brier Score
        correct = [1 if p == l else 0 for p, l in zip(predictions, labels)]
        brier = sum((c - corr) ** 2 for c, corr in zip(confidences, correct)) / n

        reliability_diagram = [
            (conf, acc)
            for conf, acc, count in zip(bin_confidences, bin_accuracies, bin_counts)
            if count > 0
        ]

        return CalibrationResult(
            expected_calibration_error=ece,
            maximum_calibration_error=mce,
            brier_score=brier,
            reliability_diagram=reliability_diagram,
            is_well_calibrated=ece < self.calibration_threshold,
        )

    def compute_stability(
        self, predictions: List[List[float]]
    ) -> StabilityResult:
        """
        Compute prediction stability across multiple runs.
        """
        if not predictions or not predictions[0]:
            return StabilityResult(0, 0, 0, True)

        n_samples = len(predictions[0])
        n_runs = len(predictions)

        if n_runs < 2:
            return StabilityResult(0, 0, 0, True)

        variations = []
        max_devs = []

        for i in range(n_samples):
            sample_preds = [predictions[run][i] for run in range(n_runs)]
            mean_pred = statistics.mean(sample_preds)
            std_pred = statistics.stdev(sample_preds) if len(sample_preds) > 1 else 0

            if mean_pred != 0:
                variations.append(std_pred / abs(mean_pred))
            else:
                variations.append(std_pred)

            max_devs.append(max(sample_preds) - min(sample_preds))

        mean_cv = statistics.mean(variations)
        max_deviation = max(max_devs)
        mean_std = (
            statistics.mean(
                [
                    statistics.stdev([predictions[run][i] for run in range(n_runs)])
                    for i in range(n_samples)
                ]
            )
            if n_runs > 1
            else 0
        )

        return StabilityResult(
            variation_coefficient=mean_cv,
            max_deviation=max_deviation,
            mean_std=mean_std,
            is_stable=mean_cv < self.stability_threshold,
        )

    def compute_uncertainty_quality(
        self, uncertainties: List[float], errors: List[float]
    ) -> float:
        """
        Compute correlation between uncertainty and actual errors.
        Good uncertainty: high uncertainty correlates with high errors.
        Returns correlation coefficient (-1 to 1).
        """
        if len(uncertainties) != len(errors) or len(uncertainties) < 2:
            return 0.0

        n = len(uncertainties)
        mean_unc = sum(uncertainties) / n
        mean_err = sum(errors) / n

        numerator = sum((u - mean_unc) * (e - mean_err) for u, e in zip(uncertainties, errors))
        denom_unc = math.sqrt(sum((u - mean_unc) ** 2 for u in uncertainties))
        denom_err = math.sqrt(sum((e - mean_err) ** 2 for e in errors))

        if denom_unc == 0 or denom_err == 0:
            return 0.0

        return numerator / (denom_unc * denom_err)

    def analyze(
        self,
        confidences: Optional[List[float]] = None,
        predictions: Optional[List[int]] = None,
        labels: Optional[List[int]] = None,
        multi_run_predictions: Optional[List[List[float]]] = None,
        uncertainties: Optional[List[float]] = None,
        errors: Optional[List[float]] = None,
    ) -> ReliabilityResult:
        """
        Complete reliability analysis.
        """
        # Calibration
        if confidences and predictions and labels:
            calibration = self.compute_calibration(confidences, predictions, labels)
        else:
            calibration = CalibrationResult(0.0, 0.0, 0.0, [], True)

        # Stability
        if multi_run_predictions:
            stability = self.compute_stability(multi_run_predictions)
        else:
            stability = StabilityResult(0.0, 0.0, 0.0, True)

        # Uncertainty quality
        if uncertainties and errors:
            uncertainty_corr = self.compute_uncertainty_quality(uncertainties, errors)
        else:
            uncertainty_corr = 0.0

        # Overall score
        calibration_score = 1 - calibration.expected_calibration_error
        stability_score = 1 - min(stability.variation_coefficient, 1.0)
        uncertainty_score = (uncertainty_corr + 1) / 2  # Normalize to 0-1

        overall = (calibration_score * 0.4 + stability_score * 0.4 + uncertainty_score * 0.2)

        # Status
        if overall >= 0.8:
            status = "healthy"
        elif overall >= 0.6:
            status = "warning"
        else:
            status = "critical"

        return ReliabilityResult(
            calibration=calibration,
            stability=stability,
            uncertainty_correlation=uncertainty_corr,
            overall_score=overall,
            status=status,
        )


# =============================================================================
# Hallucination Detector - Real Analysis
# =============================================================================


class HallucinationDetector:
    """
    Production-ready hallucination detection.

    Implements:
    - Grounding score (text overlap with sources)
    - Self-consistency analysis
    - Contradiction detection
    """

    def __init__(
        self,
        grounding_threshold: float = 0.7,
        consistency_threshold: float = 0.8,
    ):
        self.grounding_threshold = grounding_threshold
        self.consistency_threshold = consistency_threshold

    def compute_grounding_score(
        self, outputs: List[str], sources: List[str]
    ) -> float:
        """
        Compute how well outputs are grounded in source material.
        Uses word overlap as a proxy for semantic grounding.
        """
        if not outputs or not sources:
            return 0.0

        total_score = 0.0
        for output in outputs:
            output_words = set(output.lower().split())
            if not output_words:
                continue

            max_overlap = 0.0
            for source in sources:
                source_words = set(source.lower().split())
                overlap = len(output_words & source_words) / len(output_words)
                max_overlap = max(max_overlap, overlap)

            total_score += max_overlap

        return total_score / len(outputs)

    def compute_consistency_score(self, responses: List[str]) -> float:
        """
        Compute self-consistency across multiple responses.
        """
        if len(responses) < 2:
            return 1.0

        n = len(responses)
        total_sim = 0.0
        count = 0

        for i in range(n):
            for j in range(i + 1, n):
                sim = self._jaccard_similarity(responses[i], responses[j])
                total_sim += sim
                count += 1

        return total_sim / count if count > 0 else 1.0

    def _jaccard_similarity(self, text1: str, text2: str) -> float:
        """Compute Jaccard similarity between two texts"""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())

        if not words1 or not words2:
            return 0.0

        intersection = len(words1 & words2)
        union = len(words1 | words2)

        return intersection / union if union > 0 else 0.0

    def detect_contradiction(self, claim: str, context: str) -> bool:
        """
        Detect if claim contradicts context.
        Simple negation-based detection.
        """
        negation_words = {"not", "never", "no", "none", "neither", "nobody", "nothing", "n't"}

        claim_words = set(claim.lower().split())
        context_words = set(context.lower().split())

        claim_has_negation = bool(claim_words & negation_words) or "n't" in claim.lower()
        context_has_negation = bool(context_words & negation_words) or "n't" in context.lower()

        return claim_has_negation != context_has_negation

    def compute_factuality_estimate(
        self, output: str, sources: List[str]
    ) -> float:
        """
        Estimate factuality based on source alignment.
        """
        if not sources:
            return 0.5

        output_words = set(output.lower().split())
        if not output_words:
            return 0.5

        # Check alignment with each source
        max_alignment = 0.0
        for source in sources:
            source_words = set(source.lower().split())

            # Content words overlap
            content_overlap = len(output_words & source_words) / len(output_words)

            # Check for contradictions
            has_contradiction = self.detect_contradiction(output, source)

            if has_contradiction:
                alignment = content_overlap * 0.5  # Penalty for contradiction
            else:
                alignment = content_overlap

            max_alignment = max(max_alignment, alignment)

        return max_alignment

    def analyze(
        self,
        outputs: List[str],
        sources: Optional[List[str]] = None,
        multiple_responses: Optional[List[List[str]]] = None,
    ) -> HallucinationResult:
        """
        Comprehensive hallucination analysis.
        """
        # Grounding score
        if sources:
            grounding = self.compute_grounding_score(outputs, sources)
        else:
            grounding = 0.5  # Unknown without sources

        # Consistency score
        if multiple_responses:
            consistencies = [
                self.compute_consistency_score(responses)
                for responses in multiple_responses
            ]
            consistency = statistics.mean(consistencies)
        else:
            consistency = 0.8  # Default for single response

        # Factuality estimate
        if sources:
            factuality_scores = [
                self.compute_factuality_estimate(output, sources)
                for output in outputs
            ]
            factuality = statistics.mean(factuality_scores) if factuality_scores else 0.5
        else:
            factuality = grounding

        # Confidence alignment (would need model confidence scores)
        confidence_alignment = 0.8

        # Overall score
        overall = (grounding + consistency + factuality + confidence_alignment) / 4

        # Risk level
        if overall >= 0.8:
            risk = "low"
        elif overall >= 0.6:
            risk = "medium"
        else:
            risk = "high"

        # Flag potentially hallucinated outputs
        flagged = []
        if sources:
            for i, output in enumerate(outputs):
                output_grounding = self.compute_grounding_score([output], sources)
                if output_grounding < self.grounding_threshold:
                    flagged.append({
                        "index": i,
                        "output": output[:200],
                        "grounding_score": output_grounding,
                        "reason": "Low grounding in source material",
                    })

        return HallucinationResult(
            grounding_score=grounding,
            consistency_score=consistency,
            factuality_score=factuality,
            confidence_alignment=confidence_alignment,
            risk_level=risk,
            overall_score=overall,
            flagged_outputs=flagged,
        )


# =============================================================================
# Degradation Tracker
# =============================================================================


@dataclass
class DegradationSignal:
    """Performance degradation signal"""
    metric_name: str
    current_value: float
    baseline_value: float
    change_pct: float
    trend: str  # improving, stable, degrading
    alert_level: str  # none, warning, critical


class DegradationTracker:
    """Track performance degradation over time"""

    def __init__(
        self,
        warning_threshold: float = 0.1,
        critical_threshold: float = 0.2,
    ):
        self.warning_threshold = warning_threshold
        self.critical_threshold = critical_threshold

    def analyze(
        self,
        current_metrics: Dict[str, float],
        baseline_metrics: Dict[str, float],
        higher_is_better: Optional[Dict[str, bool]] = None,
    ) -> List[DegradationSignal]:
        """
        Analyze degradation across metrics.
        """
        if higher_is_better is None:
            higher_is_better = {}

        signals = []

        for metric_name, current_value in current_metrics.items():
            baseline_value = baseline_metrics.get(metric_name)
            if baseline_value is None or baseline_value == 0:
                continue

            # Determine if metric is "higher is better"
            is_higher_better = higher_is_better.get(metric_name, True)

            if is_higher_better:
                change_pct = (baseline_value - current_value) / baseline_value
            else:
                change_pct = (current_value - baseline_value) / baseline_value

            # Determine trend
            if change_pct > self.critical_threshold:
                trend = "degrading"
                alert_level = "critical"
            elif change_pct > self.warning_threshold:
                trend = "degrading"
                alert_level = "warning"
            elif change_pct < -0.05:
                trend = "improving"
                alert_level = "none"
            else:
                trend = "stable"
                alert_level = "none"

            signals.append(DegradationSignal(
                metric_name=metric_name,
                current_value=current_value,
                baseline_value=baseline_value,
                change_pct=change_pct * 100,
                trend=trend,
                alert_level=alert_level,
            ))

        return signals

    def compute_overall_risk(self, signals: List[DegradationSignal]) -> float:
        """Compute overall degradation risk from signals"""
        if not signals:
            return 0.0

        risk_scores = []
        for s in signals:
            if s.alert_level == "critical":
                risk_scores.append(0.9)
            elif s.alert_level == "warning":
                risk_scores.append(0.5)
            else:
                risk_scores.append(0.1)

        return sum(risk_scores) / len(risk_scores)
