"""
AIOBS Reliability and Hallucination Tests
Tests for model reliability, confidence calibration, and hallucination detection
"""
import pytest
import math
import random
import statistics
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
from enum import Enum


# =============================================================================
# Reliability Metrics Implementation
# =============================================================================

@dataclass
class CalibrationResult:
    """Result of calibration analysis"""
    expected_calibration_error: float  # ECE
    maximum_calibration_error: float  # MCE
    brier_score: float
    reliability_diagram: List[Tuple[float, float]]  # (confidence, accuracy)
    is_well_calibrated: bool


@dataclass
class HallucinationResult:
    """Result of hallucination analysis"""
    grounding_score: float  # 0-1, higher = more grounded
    consistency_score: float  # 0-1, higher = more consistent
    factuality_score: float  # 0-1, higher = more factual
    confidence_alignment: float  # 0-1, confidence matches accuracy
    hallucination_risk: str  # low, medium, high
    flagged_outputs: List[Dict]


@dataclass
class StabilityResult:
    """Result of prediction stability analysis"""
    variation_coefficient: float
    max_deviation: float
    mean_std: float
    is_stable: bool


class ReliabilityAnalyzer:
    """Analyzes model reliability and trustworthiness"""

    def __init__(
        self,
        n_bins: int = 10,
        calibration_threshold: float = 0.1,
        stability_threshold: float = 0.1
    ):
        self.n_bins = n_bins
        self.calibration_threshold = calibration_threshold
        self.stability_threshold = stability_threshold

    def compute_calibration(
        self,
        confidences: List[float],
        predictions: List[int],
        labels: List[int]
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

        # Create bins
        bin_boundaries = [i / self.n_bins for i in range(self.n_bins + 1)]
        bin_accuracies = []
        bin_confidences = []
        bin_counts = []

        for i in range(self.n_bins):
            bin_lower = bin_boundaries[i]
            bin_upper = bin_boundaries[i + 1]

            # Get samples in this bin
            in_bin = [
                (c, p, l) for c, p, l in zip(confidences, predictions, labels)
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

        # Expected Calibration Error (ECE)
        ece = sum(
            (count / n) * abs(acc - conf)
            for acc, conf, count in zip(bin_accuracies, bin_confidences, bin_counts)
            if count > 0
        )

        # Maximum Calibration Error (MCE)
        mce = max(
            abs(acc - conf)
            for acc, conf, count in zip(bin_accuracies, bin_confidences, bin_counts)
            if count > 0
        ) if any(c > 0 for c in bin_counts) else 0

        # Brier Score (lower is better)
        correct = [1 if p == l else 0 for p, l in zip(predictions, labels)]
        brier = sum((c - corr) ** 2 for c, corr in zip(confidences, correct)) / n

        # Reliability diagram
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
            is_well_calibrated=ece < self.calibration_threshold
        )

    def compute_stability(
        self,
        predictions: List[List[float]],  # Multiple predictions for same inputs
    ) -> StabilityResult:
        """
        Compute prediction stability across multiple runs.
        Stable model: similar inputs should give similar outputs.
        """
        if not predictions or not predictions[0]:
            return StabilityResult(0, 0, 0, True)

        n_samples = len(predictions[0])
        n_runs = len(predictions)

        if n_runs < 2:
            return StabilityResult(0, 0, 0, True)

        # Compute per-sample statistics
        variations = []
        max_devs = []

        for i in range(n_samples):
            sample_preds = [predictions[run][i] for run in range(n_runs)]
            mean_pred = statistics.mean(sample_preds)
            std_pred = statistics.stdev(sample_preds) if len(sample_preds) > 1 else 0

            if mean_pred != 0:
                variations.append(std_pred / abs(mean_pred))  # CV
            else:
                variations.append(std_pred)

            max_devs.append(max(sample_preds) - min(sample_preds))

        mean_cv = statistics.mean(variations)
        max_deviation = max(max_devs)
        mean_std = statistics.mean([
            statistics.stdev([predictions[run][i] for run in range(n_runs)])
            for i in range(n_samples)
        ]) if n_runs > 1 else 0

        return StabilityResult(
            variation_coefficient=mean_cv,
            max_deviation=max_deviation,
            mean_std=mean_std,
            is_stable=mean_cv < self.stability_threshold
        )

    def compute_uncertainty_quality(
        self,
        uncertainties: List[float],
        errors: List[float]
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

        numerator = sum(
            (u - mean_unc) * (e - mean_err)
            for u, e in zip(uncertainties, errors)
        )

        denom_unc = math.sqrt(sum((u - mean_unc) ** 2 for u in uncertainties))
        denom_err = math.sqrt(sum((e - mean_err) ** 2 for e in errors))

        if denom_unc == 0 or denom_err == 0:
            return 0.0

        return numerator / (denom_unc * denom_err)


class HallucinationDetector:
    """Detects hallucination patterns in model outputs"""

    def __init__(
        self,
        grounding_threshold: float = 0.7,
        consistency_threshold: float = 0.8
    ):
        self.grounding_threshold = grounding_threshold
        self.consistency_threshold = consistency_threshold

    def compute_grounding_score(
        self,
        outputs: List[str],
        sources: List[str]
    ) -> float:
        """
        Compute how well outputs are grounded in source material.
        Uses simple word overlap as a proxy (real implementation would use NLI).
        """
        if not outputs or not sources:
            return 0.0

        total_score = 0.0
        for output in outputs:
            output_words = set(output.lower().split())
            max_overlap = 0.0

            for source in sources:
                source_words = set(source.lower().split())
                if output_words:
                    overlap = len(output_words & source_words) / len(output_words)
                    max_overlap = max(max_overlap, overlap)

            total_score += max_overlap

        return total_score / len(outputs)

    def compute_consistency_score(
        self,
        responses: List[str]
    ) -> float:
        """
        Compute self-consistency across multiple responses.
        Consistent model gives similar answers to same question.
        """
        if len(responses) < 2:
            return 1.0

        # Compute pairwise similarity
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

    def detect_contradiction(
        self,
        claim: str,
        context: str
    ) -> bool:
        """
        Detect if claim contradicts context.
        Simple implementation - real version would use NLI model.
        """
        # Simple negation detection
        negation_words = {"not", "never", "no", "none", "neither", "nobody", "nothing"}

        claim_words = set(claim.lower().split())
        context_words = set(context.lower().split())

        # Check if claim has negation of context words
        claim_has_negation = bool(claim_words & negation_words)
        context_has_negation = bool(context_words & negation_words)

        # Potential contradiction if negation status differs
        return claim_has_negation != context_has_negation

    def analyze(
        self,
        outputs: List[str],
        sources: Optional[List[str]] = None,
        multiple_responses: Optional[List[List[str]]] = None
    ) -> HallucinationResult:
        """
        Comprehensive hallucination analysis.
        """
        grounding = 0.5  # Default if no sources
        if sources:
            grounding = self.compute_grounding_score(outputs, sources)

        consistency = 1.0
        if multiple_responses:
            consistencies = []
            for responses in multiple_responses:
                consistencies.append(self.compute_consistency_score(responses))
            consistency = statistics.mean(consistencies)

        # Factuality is harder to assess without external knowledge
        # Using grounding as proxy
        factuality = grounding

        # Confidence alignment (placeholder - would need confidence scores)
        confidence_alignment = 0.8

        # Compute risk level
        avg_score = (grounding + consistency + factuality) / 3
        if avg_score >= 0.8:
            risk = "low"
        elif avg_score >= 0.6:
            risk = "medium"
        else:
            risk = "high"

        # Flag potentially hallucinated outputs
        flagged = []
        if sources:
            for i, output in enumerate(outputs):
                output_words = set(output.lower().split())
                max_overlap = 0.0
                for source in sources:
                    source_words = set(source.lower().split())
                    if output_words:
                        overlap = len(output_words & source_words) / len(output_words)
                        max_overlap = max(max_overlap, overlap)

                if max_overlap < self.grounding_threshold:
                    flagged.append({
                        "index": i,
                        "output": output[:100],
                        "grounding_score": max_overlap,
                        "reason": "Low grounding in source material"
                    })

        return HallucinationResult(
            grounding_score=grounding,
            consistency_score=consistency,
            factuality_score=factuality,
            confidence_alignment=confidence_alignment,
            hallucination_risk=risk,
            flagged_outputs=flagged
        )


# =============================================================================
# Reliability Tests
# =============================================================================

class TestCalibration:
    """Tests for calibration metrics"""

    @pytest.fixture
    def analyzer(self):
        return ReliabilityAnalyzer(n_bins=10)

    def test_perfectly_calibrated(self, analyzer):
        """Perfect calibration should have ECE=0"""
        # Create perfectly calibrated predictions
        confidences = []
        predictions = []
        labels = []

        random.seed(42)
        for conf in [0.1, 0.3, 0.5, 0.7, 0.9]:
            for _ in range(100):
                confidences.append(conf)
                # Make accuracy match confidence
                is_correct = random.random() < conf
                predictions.append(1)
                labels.append(1 if is_correct else 0)

        result = analyzer.compute_calibration(confidences, predictions, labels)

        assert result.expected_calibration_error < 0.1
        assert result.is_well_calibrated

    def test_overconfident_model(self, analyzer):
        """Overconfident model should have high ECE"""
        random.seed(42)

        # High confidence but low accuracy
        confidences = [0.9] * 100
        predictions = [1] * 100
        labels = [random.choice([0, 0, 0, 1]) for _ in range(100)]  # ~25% accuracy

        result = analyzer.compute_calibration(confidences, predictions, labels)

        assert result.expected_calibration_error > 0.3  # Significant miscalibration
        assert not result.is_well_calibrated

    def test_underconfident_model(self, analyzer):
        """Underconfident model should have high ECE"""
        random.seed(42)

        # Low confidence but high accuracy
        confidences = [0.3] * 100
        predictions = [1] * 100
        labels = [random.choice([1, 1, 1, 0]) for _ in range(100)]  # ~75% accuracy

        result = analyzer.compute_calibration(confidences, predictions, labels)

        assert result.expected_calibration_error > 0.3
        assert not result.is_well_calibrated

    def test_brier_score_perfect(self, analyzer):
        """Perfect predictions should have Brier score of 0"""
        confidences = [1.0] * 50 + [0.0] * 50
        predictions = [1] * 50 + [0] * 50
        labels = [1] * 50 + [0] * 50

        result = analyzer.compute_calibration(confidences, predictions, labels)

        assert result.brier_score == 0.0

    def test_brier_score_worst(self, analyzer):
        """Completely wrong predictions should have Brier score near 1"""
        confidences = [1.0] * 50 + [0.0] * 50
        predictions = [1] * 50 + [0] * 50
        labels = [0] * 50 + [1] * 50  # All wrong

        result = analyzer.compute_calibration(confidences, predictions, labels)

        assert result.brier_score == 1.0

    def test_reliability_diagram_structure(self, analyzer):
        """Reliability diagram should have correct structure"""
        random.seed(42)
        confidences = [random.random() for _ in range(100)]
        predictions = [1] * 100
        labels = [random.choice([0, 1]) for _ in range(100)]

        result = analyzer.compute_calibration(confidences, predictions, labels)

        assert len(result.reliability_diagram) > 0
        for conf, acc in result.reliability_diagram:
            assert 0 <= conf <= 1
            assert 0 <= acc <= 1

    def test_empty_input(self, analyzer):
        """Should handle empty input"""
        result = analyzer.compute_calibration([], [], [])

        assert result.expected_calibration_error == 0
        assert result.is_well_calibrated


class TestStability:
    """Tests for prediction stability"""

    @pytest.fixture
    def analyzer(self):
        return ReliabilityAnalyzer()

    def test_perfectly_stable(self, analyzer):
        """Identical predictions should have CV=0"""
        predictions = [[0.5, 0.6, 0.7]] * 5  # Same predictions across 5 runs

        result = analyzer.compute_stability(predictions)

        assert result.variation_coefficient == 0
        assert result.max_deviation == 0
        assert result.is_stable

    def test_unstable_predictions(self, analyzer):
        """Varying predictions should have high CV"""
        random.seed(42)

        # Significantly varying predictions
        predictions = [
            [random.gauss(0.5, 0.2) for _ in range(10)]
            for _ in range(5)
        ]

        result = analyzer.compute_stability(predictions)

        assert result.variation_coefficient > 0.1
        assert result.max_deviation > 0

    def test_slight_variation_stable(self, analyzer):
        """Slight variation should still be considered stable"""
        random.seed(42)

        # Small variations
        base = [0.5, 0.6, 0.7, 0.8, 0.9]
        predictions = [
            [v + random.gauss(0, 0.01) for v in base]
            for _ in range(5)
        ]

        result = analyzer.compute_stability(predictions)

        assert result.is_stable
        assert result.variation_coefficient < 0.1

    def test_single_run(self, analyzer):
        """Single run should return stable"""
        predictions = [[0.5, 0.6, 0.7]]

        result = analyzer.compute_stability(predictions)

        assert result.is_stable


class TestUncertaintyQuality:
    """Tests for uncertainty quality metrics"""

    @pytest.fixture
    def analyzer(self):
        return ReliabilityAnalyzer()

    def test_perfect_correlation(self, analyzer):
        """Perfect uncertainty-error correlation"""
        uncertainties = [0.1, 0.2, 0.3, 0.4, 0.5]
        errors = [0.1, 0.2, 0.3, 0.4, 0.5]  # Perfect correlation

        corr = analyzer.compute_uncertainty_quality(uncertainties, errors)

        assert corr > 0.99

    def test_negative_correlation(self, analyzer):
        """Negative correlation (bad uncertainty)"""
        uncertainties = [0.1, 0.2, 0.3, 0.4, 0.5]
        errors = [0.5, 0.4, 0.3, 0.2, 0.1]  # Inverse correlation

        corr = analyzer.compute_uncertainty_quality(uncertainties, errors)

        assert corr < -0.99

    def test_no_correlation(self, analyzer):
        """Random uncertainty should have low correlation"""
        random.seed(42)
        uncertainties = [random.random() for _ in range(100)]
        errors = [random.random() for _ in range(100)]

        corr = analyzer.compute_uncertainty_quality(uncertainties, errors)

        assert abs(corr) < 0.3  # Low correlation


# =============================================================================
# Hallucination Tests
# =============================================================================

class TestHallucinationDetection:
    """Tests for hallucination detection"""

    @pytest.fixture
    def detector(self):
        return HallucinationDetector()

    def test_well_grounded_output(self, detector):
        """Output grounded in sources should have high score"""
        outputs = [
            "The capital of France is Paris.",
            "Paris is located in France."
        ]
        sources = [
            "France is a country in Europe. Its capital is Paris.",
            "Paris is the capital and largest city of France."
        ]

        score = detector.compute_grounding_score(outputs, sources)

        assert score > 0.5

    def test_ungrounded_output(self, detector):
        """Output not grounded in sources should have low score"""
        outputs = [
            "Elephants can fly using their ears.",
            "The moon is made of cheese."
        ]
        sources = [
            "Elephants are large mammals that live in Africa and Asia.",
            "The moon is Earth's natural satellite."
        ]

        score = detector.compute_grounding_score(outputs, sources)

        assert score < 0.5

    def test_consistent_responses(self, detector):
        """Similar responses should have high consistency"""
        responses = [
            "The answer is 42.",
            "The answer equals 42.",
            "42 is the answer."
        ]

        score = detector.compute_consistency_score(responses)

        assert score > 0.3  # Some overlap expected

    def test_inconsistent_responses(self, detector):
        """Contradictory responses should have low consistency"""
        responses = [
            "Yes, definitely true.",
            "No, absolutely false.",
            "Maybe, I'm not sure."
        ]

        score = detector.compute_consistency_score(responses)

        assert score < 0.3

    def test_contradiction_detection(self, detector):
        """Should detect simple contradictions"""
        claim1 = "The cat is black"
        context1 = "The cat is not black"

        is_contradiction = detector.detect_contradiction(claim1, context1)
        assert is_contradiction

    def test_no_contradiction(self, detector):
        """Should not flag non-contradictions"""
        claim = "The cat is black"
        context = "The cat is black and fluffy"

        is_contradiction = detector.detect_contradiction(claim, context)
        assert not is_contradiction

    def test_full_analysis(self, detector):
        """Full hallucination analysis should return all metrics"""
        outputs = ["The sky is blue because of light scattering."]
        sources = ["Light scattering in the atmosphere makes the sky appear blue."]
        multiple_responses = [
            ["The sky is blue.", "The sky appears blue.", "Blue is the sky's color."]
        ]

        result = detector.analyze(outputs, sources, multiple_responses)

        assert 0 <= result.grounding_score <= 1
        assert 0 <= result.consistency_score <= 1
        assert 0 <= result.factuality_score <= 1
        assert result.hallucination_risk in ["low", "medium", "high"]

    def test_high_risk_flagging(self, detector):
        """High-risk outputs should be flagged"""
        outputs = [
            "Completely made up statement with no basis.",
            "Another fabricated claim."
        ]
        sources = [
            "This is the actual source material about real topics."
        ]

        result = detector.analyze(outputs, sources)

        # Should flag outputs with low grounding
        assert len(result.flagged_outputs) > 0


# =============================================================================
# Out-of-Distribution Detection Tests
# =============================================================================

class TestOODDetection:
    """Tests for out-of-distribution detection"""

    def test_in_distribution_samples(self):
        """In-distribution samples should have low OOD scores"""
        random.seed(42)

        # Training distribution: N(0, 1)
        train_mean, train_std = 0, 1

        # Test samples from same distribution
        test_samples = [random.gauss(train_mean, train_std) for _ in range(100)]

        # Simple Mahalanobis-like OOD score
        ood_scores = [abs(s - train_mean) / train_std for s in test_samples]
        avg_score = sum(ood_scores) / len(ood_scores)

        assert avg_score < 2  # Most samples within 2 std

    def test_out_distribution_samples(self):
        """Out-of-distribution samples should have high OOD scores"""
        random.seed(42)

        # Training distribution: N(0, 1)
        train_mean, train_std = 0, 1

        # Test samples from different distribution
        test_samples = [random.gauss(5, 1) for _ in range(100)]  # Shifted mean

        ood_scores = [abs(s - train_mean) / train_std for s in test_samples]
        avg_score = sum(ood_scores) / len(ood_scores)

        assert avg_score > 4  # Far from training distribution

    def test_ood_threshold_effectiveness(self):
        """OOD threshold should separate in/out distributions"""
        random.seed(42)

        train_mean, train_std = 0, 1
        threshold = 3.0  # 3 sigma

        # In-distribution
        in_dist = [random.gauss(0, 1) for _ in range(100)]
        in_scores = [abs(s - train_mean) / train_std for s in in_dist]
        in_flagged = sum(1 for s in in_scores if s > threshold)

        # Out-of-distribution
        out_dist = [random.gauss(5, 0.5) for _ in range(100)]
        out_scores = [abs(s - train_mean) / train_std for s in out_dist]
        out_flagged = sum(1 for s in out_scores if s > threshold)

        # Most in-dist should pass, most out-dist should be flagged
        assert in_flagged < 10  # <10% false positives
        assert out_flagged > 90  # >90% true positives


# =============================================================================
# Combined Trust Score Tests
# =============================================================================

class TestTrustScore:
    """Tests for combined trust score calculation"""

    def test_high_trust_good_metrics(self):
        """Good metrics should result in high trust"""
        def compute_trust(calibration: float, stability: float,
                          hallucination_risk: float, ood_rate: float) -> float:
            # Invert hallucination risk and OOD rate
            return (
                0.25 * (1 - calibration) +  # Lower ECE = higher trust
                0.25 * stability +
                0.25 * (1 - hallucination_risk) +
                0.25 * (1 - ood_rate)
            )

        trust = compute_trust(
            calibration=0.05,  # Low ECE (good)
            stability=0.95,   # High stability (good)
            hallucination_risk=0.1,  # Low risk (good)
            ood_rate=0.05     # Low OOD rate (good)
        )

        assert trust > 0.8

    def test_low_trust_bad_metrics(self):
        """Bad metrics should result in low trust"""
        def compute_trust(calibration: float, stability: float,
                          hallucination_risk: float, ood_rate: float) -> float:
            return (
                0.25 * (1 - calibration) +
                0.25 * stability +
                0.25 * (1 - hallucination_risk) +
                0.25 * (1 - ood_rate)
            )

        trust = compute_trust(
            calibration=0.4,   # High ECE (bad)
            stability=0.3,    # Low stability (bad)
            hallucination_risk=0.8,  # High risk (bad)
            ood_rate=0.5      # High OOD rate (bad)
        )

        assert trust < 0.5

    def test_trust_score_bounds(self):
        """Trust score should be bounded [0, 1]"""
        def compute_trust(calibration: float, stability: float,
                          hallucination_risk: float, ood_rate: float) -> float:
            score = (
                0.25 * (1 - calibration) +
                0.25 * stability +
                0.25 * (1 - hallucination_risk) +
                0.25 * (1 - ood_rate)
            )
            return max(0, min(1, score))

        # Test extreme values
        assert compute_trust(0, 1, 0, 0) == 1.0
        assert compute_trust(1, 0, 1, 1) == 0.0


# =============================================================================
# Degradation Detection Tests
# =============================================================================

class TestDegradationDetection:
    """Tests for performance degradation detection"""

    def test_no_degradation(self):
        """Stable metrics should not trigger degradation alert"""
        baseline = {"accuracy": 0.95, "latency_ms": 50}
        current = {"accuracy": 0.94, "latency_ms": 52}

        def detect_degradation(baseline: Dict, current: Dict,
                               threshold: float = 0.1) -> List[str]:
            degraded = []
            for metric in baseline:
                if metric in current:
                    base_val = baseline[metric]
                    curr_val = current[metric]
                    if base_val != 0:
                        # For accuracy: decrease is bad
                        # For latency: increase is bad
                        if metric == "latency_ms":
                            change = (curr_val - base_val) / base_val
                        else:
                            change = (base_val - curr_val) / base_val

                        if change > threshold:
                            degraded.append(metric)
            return degraded

        degraded = detect_degradation(baseline, current)
        assert len(degraded) == 0

    def test_accuracy_degradation(self):
        """Should detect accuracy degradation"""
        baseline = {"accuracy": 0.95}
        current = {"accuracy": 0.80}  # 15% drop

        def detect_degradation(baseline: Dict, current: Dict,
                               threshold: float = 0.1) -> List[str]:
            degraded = []
            for metric in baseline:
                if metric in current:
                    base_val = baseline[metric]
                    curr_val = current[metric]
                    if base_val != 0:
                        change = (base_val - curr_val) / base_val
                        if change > threshold:
                            degraded.append(metric)
            return degraded

        degraded = detect_degradation(baseline, current)
        assert "accuracy" in degraded

    def test_latency_degradation(self):
        """Should detect latency degradation"""
        baseline = {"latency_ms": 50}
        current = {"latency_ms": 100}  # 100% increase

        def detect_degradation(baseline: Dict, current: Dict,
                               threshold: float = 0.2) -> List[str]:
            degraded = []
            for metric in baseline:
                if metric in current:
                    base_val = baseline[metric]
                    curr_val = current[metric]
                    if base_val != 0:
                        # For latency, increase is degradation
                        change = (curr_val - base_val) / base_val
                        if change > threshold:
                            degraded.append(metric)
            return degraded

        degraded = detect_degradation(baseline, current)
        assert "latency_ms" in degraded


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
