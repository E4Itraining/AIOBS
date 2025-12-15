"""
AIOBS Drift Detection Tests
Comprehensive tests for data drift, concept drift, and prediction drift
"""
import pytest
import math
import random
import statistics
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


# =============================================================================
# Drift Detection Implementations for Testing
# =============================================================================

class DriftType(Enum):
    DATA = "data"
    CONCEPT = "concept"
    PREDICTION = "prediction"


@dataclass
class DriftResult:
    drift_type: DriftType
    score: float
    is_significant: bool
    p_value: Optional[float]
    affected_features: List[str]
    details: Dict


class DriftDetector:
    """Drift detection algorithms"""

    def __init__(self, threshold: float = 0.05):
        self.threshold = threshold

    def kolmogorov_smirnov_test(
        self,
        reference: List[float],
        current: List[float]
    ) -> Tuple[float, float]:
        """
        Kolmogorov-Smirnov test for distribution comparison
        Returns (statistic, p_value)
        """
        if not reference or not current:
            return 0.0, 1.0

        # Sort both samples
        ref_sorted = sorted(reference)
        curr_sorted = sorted(current)

        n1, n2 = len(ref_sorted), len(curr_sorted)

        # Combine and sort all values
        all_values = sorted(set(ref_sorted + curr_sorted))

        # Compute empirical CDFs
        max_diff = 0.0
        for val in all_values:
            # CDF for reference
            cdf_ref = sum(1 for x in ref_sorted if x <= val) / n1
            # CDF for current
            cdf_curr = sum(1 for x in curr_sorted if x <= val) / n2
            # Maximum difference
            diff = abs(cdf_ref - cdf_curr)
            max_diff = max(max_diff, diff)

        # Approximate p-value using asymptotic formula
        en = math.sqrt(n1 * n2 / (n1 + n2))
        p_value = 2 * math.exp(-2 * (max_diff * en) ** 2)
        p_value = min(1.0, max(0.0, p_value))

        return max_diff, p_value

    def population_stability_index(
        self,
        reference: List[float],
        current: List[float],
        bins: int = 10
    ) -> float:
        """
        Population Stability Index (PSI) for distribution comparison
        PSI < 0.1: No significant change
        0.1 <= PSI < 0.25: Moderate change
        PSI >= 0.25: Significant change
        """
        if not reference or not current:
            return 0.0

        # Create bins based on reference distribution
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
                    counts[-1] += 1  # Last bin includes max
            return counts

        ref_counts = get_bin_counts(reference)
        curr_counts = get_bin_counts(current)

        # Convert to proportions with smoothing
        n_ref, n_curr = len(reference), len(current)
        epsilon = 0.0001  # Smoothing factor

        psi = 0.0
        for ref_c, curr_c in zip(ref_counts, curr_counts):
            ref_pct = (ref_c + epsilon) / (n_ref + bins * epsilon)
            curr_pct = (curr_c + epsilon) / (n_curr + bins * epsilon)
            psi += (curr_pct - ref_pct) * math.log(curr_pct / ref_pct)

        return psi

    def jensen_shannon_divergence(
        self,
        reference: List[float],
        current: List[float],
        bins: int = 10
    ) -> float:
        """
        Jensen-Shannon Divergence - symmetric measure of distribution difference
        Returns value between 0 (identical) and 1 (maximally different)
        """
        if not reference or not current:
            return 0.0

        # Create histograms
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

        # Compute M = 0.5 * (P + Q)
        m = [(pi + qi) / 2 for pi, qi in zip(p, q)]

        # KL divergence helper
        def kl_div(a: List[float], b: List[float]) -> float:
            return sum(ai * math.log(ai / bi) for ai, bi in zip(a, b))

        # JS divergence = 0.5 * KL(P||M) + 0.5 * KL(Q||M)
        js = 0.5 * kl_div(p, m) + 0.5 * kl_div(q, m)
        return min(1.0, math.sqrt(js))  # Return square root for interpretability

    def wasserstein_distance(
        self,
        reference: List[float],
        current: List[float]
    ) -> float:
        """
        Wasserstein (Earth Mover's) distance between distributions
        Also known as Kantorovich-Rubinstein distance
        """
        if not reference or not current:
            return 0.0

        ref_sorted = sorted(reference)
        curr_sorted = sorted(current)

        # Normalize by range to get comparable distances
        all_vals = ref_sorted + curr_sorted
        val_range = max(all_vals) - min(all_vals)
        if val_range == 0:
            return 0.0

        # Compute CDFs at all unique points
        all_points = sorted(set(ref_sorted + curr_sorted))
        n_ref, n_curr = len(ref_sorted), len(curr_sorted)

        distance = 0.0
        prev_point = all_points[0]

        for point in all_points[1:]:
            # CDF values at previous point
            cdf_ref = sum(1 for x in ref_sorted if x <= prev_point) / n_ref
            cdf_curr = sum(1 for x in curr_sorted if x <= prev_point) / n_curr

            # Add area of rectangle
            distance += abs(cdf_ref - cdf_curr) * (point - prev_point)
            prev_point = point

        return distance / val_range  # Normalized

    def detect_concept_drift(
        self,
        predictions: List[float],
        labels: List[float],
        window_size: int = 50
    ) -> Tuple[bool, float]:
        """
        Detect concept drift using error rate monitoring (ADWIN-like)
        Returns (drift_detected, drift_score)
        """
        if len(predictions) < window_size * 2 or len(labels) < window_size * 2:
            return False, 0.0

        # Compute errors
        errors = [abs(p - l) for p, l in zip(predictions, labels)]

        # Split into windows
        first_half = errors[:len(errors) // 2]
        second_half = errors[len(errors) // 2:]

        # Compare error rates
        first_rate = statistics.mean(first_half)
        second_rate = statistics.mean(second_half)

        # Compute drift score
        if first_rate == 0:
            drift_score = second_rate
        else:
            drift_score = abs(second_rate - first_rate) / first_rate

        return drift_score > self.threshold, drift_score

    def detect_prediction_drift(
        self,
        reference_preds: List[float],
        current_preds: List[float]
    ) -> DriftResult:
        """
        Detect prediction drift using multiple metrics
        """
        # Compute various drift metrics
        ks_stat, ks_pvalue = self.kolmogorov_smirnov_test(reference_preds, current_preds)
        psi = self.population_stability_index(reference_preds, current_preds)
        js_div = self.jensen_shannon_divergence(reference_preds, current_preds)

        # Aggregate score
        score = (ks_stat + psi / 0.25 + js_div) / 3

        return DriftResult(
            drift_type=DriftType.PREDICTION,
            score=min(1.0, score),
            is_significant=ks_pvalue < self.threshold or psi >= 0.1,
            p_value=ks_pvalue,
            affected_features=["predictions"],
            details={
                "ks_statistic": ks_stat,
                "ks_pvalue": ks_pvalue,
                "psi": psi,
                "js_divergence": js_div
            }
        )


# =============================================================================
# Drift Detection Tests
# =============================================================================

class TestKolmogorovSmirnovTest:
    """Tests for KS test implementation"""

    def test_identical_distributions(self):
        """KS test should return 0 for identical distributions"""
        detector = DriftDetector()
        data = [random.gauss(0, 1) for _ in range(100)]
        stat, pvalue = detector.kolmogorov_smirnov_test(data, data.copy())

        assert stat == 0.0
        assert pvalue == 1.0

    def test_similar_distributions_high_pvalue(self):
        """Similar distributions should have high p-value"""
        detector = DriftDetector()
        random.seed(42)
        ref = [random.gauss(0, 1) for _ in range(200)]
        curr = [random.gauss(0, 1) for _ in range(200)]

        stat, pvalue = detector.kolmogorov_smirnov_test(ref, curr)

        assert stat < 0.2  # Small difference
        assert pvalue > 0.05  # Not significant

    def test_different_distributions_low_pvalue(self):
        """Different distributions should have low p-value"""
        detector = DriftDetector()
        ref = [random.gauss(0, 1) for _ in range(200)]
        curr = [random.gauss(2, 1) for _ in range(200)]  # Shifted mean

        stat, pvalue = detector.kolmogorov_smirnov_test(ref, curr)

        assert stat > 0.3  # Large difference
        assert pvalue < 0.05  # Significant

    def test_different_variance_detected(self):
        """Changes in variance should be detected"""
        detector = DriftDetector()
        ref = [random.gauss(0, 1) for _ in range(200)]
        curr = [random.gauss(0, 3) for _ in range(200)]  # Increased variance

        stat, pvalue = detector.kolmogorov_smirnov_test(ref, curr)

        assert stat > 0.15

    def test_empty_data_handling(self):
        """Should handle empty data gracefully"""
        detector = DriftDetector()
        stat, pvalue = detector.kolmogorov_smirnov_test([], [1, 2, 3])

        assert stat == 0.0
        assert pvalue == 1.0

    def test_single_element(self):
        """Should handle single element data"""
        detector = DriftDetector()
        stat, pvalue = detector.kolmogorov_smirnov_test([1.0], [2.0])

        assert stat == 1.0  # Maximum difference


class TestPopulationStabilityIndex:
    """Tests for PSI implementation"""

    def test_identical_distributions_psi_zero(self):
        """PSI should be near 0 for identical distributions"""
        detector = DriftDetector()
        data = [random.gauss(50, 10) for _ in range(1000)]
        psi = detector.population_stability_index(data, data.copy())

        assert psi < 0.01

    def test_slight_shift_low_psi(self):
        """Slight distribution shift should have low PSI"""
        detector = DriftDetector()
        random.seed(42)
        ref = [random.gauss(50, 10) for _ in range(1000)]
        curr = [random.gauss(52, 10) for _ in range(1000)]  # Small shift

        psi = detector.population_stability_index(ref, curr)

        assert psi < 0.1  # No significant change

    def test_moderate_shift_moderate_psi(self):
        """Moderate distribution shift should have moderate PSI"""
        detector = DriftDetector()
        ref = [random.gauss(50, 10) for _ in range(1000)]
        curr = [random.gauss(60, 10) for _ in range(1000)]  # Moderate shift

        psi = detector.population_stability_index(ref, curr)

        assert 0.1 <= psi < 0.25  # Moderate change

    def test_large_shift_high_psi(self):
        """Large distribution shift should have high PSI"""
        detector = DriftDetector()
        ref = [random.gauss(50, 10) for _ in range(1000)]
        curr = [random.gauss(80, 10) for _ in range(1000)]  # Large shift

        psi = detector.population_stability_index(ref, curr)

        assert psi >= 0.25  # Significant change

    def test_psi_symmetry(self):
        """PSI should be approximately symmetric"""
        detector = DriftDetector()
        ref = [random.gauss(50, 10) for _ in range(500)]
        curr = [random.gauss(60, 10) for _ in range(500)]

        psi1 = detector.population_stability_index(ref, curr)
        psi2 = detector.population_stability_index(curr, ref)

        # Should be approximately equal (may differ slightly due to binning)
        assert abs(psi1 - psi2) < 0.05


class TestJensenShannonDivergence:
    """Tests for Jensen-Shannon divergence"""

    def test_identical_distributions_zero(self):
        """JS divergence should be 0 for identical distributions"""
        detector = DriftDetector()
        data = [random.gauss(0, 1) for _ in range(500)]
        js = detector.jensen_shannon_divergence(data, data.copy())

        assert js < 0.05  # Near zero

    def test_js_bounded_zero_one(self):
        """JS divergence should be between 0 and 1"""
        detector = DriftDetector()
        ref = [random.uniform(0, 1) for _ in range(100)]
        curr = [random.uniform(5, 10) for _ in range(100)]

        js = detector.jensen_shannon_divergence(ref, curr)

        assert 0 <= js <= 1

    def test_js_symmetric(self):
        """JS divergence should be symmetric"""
        detector = DriftDetector()
        ref = [random.gauss(0, 1) for _ in range(200)]
        curr = [random.gauss(2, 1) for _ in range(200)]

        js1 = detector.jensen_shannon_divergence(ref, curr)
        js2 = detector.jensen_shannon_divergence(curr, ref)

        assert abs(js1 - js2) < 0.01

    def test_js_increases_with_divergence(self):
        """JS should increase with distribution divergence"""
        detector = DriftDetector()
        random.seed(42)
        ref = [random.gauss(0, 1) for _ in range(300)]

        js_small = detector.jensen_shannon_divergence(
            ref, [random.gauss(0.5, 1) for _ in range(300)]
        )
        js_medium = detector.jensen_shannon_divergence(
            ref, [random.gauss(2, 1) for _ in range(300)]
        )
        js_large = detector.jensen_shannon_divergence(
            ref, [random.gauss(5, 1) for _ in range(300)]
        )

        assert js_small < js_medium < js_large


class TestWassersteinDistance:
    """Tests for Wasserstein distance"""

    def test_identical_distributions_zero(self):
        """Wasserstein should be 0 for identical distributions"""
        detector = DriftDetector()
        data = [random.gauss(0, 1) for _ in range(200)]
        w = detector.wasserstein_distance(data, data.copy())

        assert w < 0.01

    def test_shifted_mean_detected(self):
        """Wasserstein should detect mean shift"""
        detector = DriftDetector()
        ref = [random.gauss(0, 1) for _ in range(200)]
        curr = [random.gauss(2, 1) for _ in range(200)]

        w = detector.wasserstein_distance(ref, curr)

        assert w > 0.1  # Detects shift

    def test_wasserstein_sensitive_to_shift_magnitude(self):
        """Wasserstein should increase with shift magnitude"""
        detector = DriftDetector()
        random.seed(42)
        ref = [random.gauss(0, 1) for _ in range(300)]

        w_small = detector.wasserstein_distance(
            ref, [random.gauss(1, 1) for _ in range(300)]
        )
        w_large = detector.wasserstein_distance(
            ref, [random.gauss(3, 1) for _ in range(300)]
        )

        assert w_small < w_large


class TestConceptDriftDetection:
    """Tests for concept drift detection"""

    def test_no_drift_stable_error_rate(self):
        """No drift when error rate is stable"""
        detector = DriftDetector(threshold=0.3)
        random.seed(42)

        # Consistent error rate
        predictions = [random.gauss(0.5, 0.1) for _ in range(200)]
        labels = [0.5] * 200

        drift_detected, score = detector.detect_concept_drift(predictions, labels)

        assert not drift_detected
        assert score < 0.3

    def test_drift_increasing_error_rate(self):
        """Drift detected when error rate increases"""
        detector = DriftDetector(threshold=0.3)

        # First half: low error, second half: high error
        predictions = [0.5] * 100 + [0.9] * 100
        labels = [0.5] * 200

        drift_detected, score = detector.detect_concept_drift(predictions, labels)

        assert drift_detected
        assert score > 0.3

    def test_insufficient_data(self):
        """Should handle insufficient data"""
        detector = DriftDetector()
        drift_detected, score = detector.detect_concept_drift([0.5] * 10, [0.5] * 10)

        assert not drift_detected
        assert score == 0.0


class TestPredictionDriftDetection:
    """Tests for prediction drift detection"""

    def test_no_drift_same_predictions(self):
        """No drift for similar prediction distributions"""
        detector = DriftDetector()
        random.seed(42)

        ref = [random.gauss(0.5, 0.1) for _ in range(200)]
        curr = [random.gauss(0.5, 0.1) for _ in range(200)]

        result = detector.detect_prediction_drift(ref, curr)

        assert result.drift_type == DriftType.PREDICTION
        assert not result.is_significant
        assert result.score < 0.5

    def test_drift_shifted_predictions(self):
        """Drift detected for shifted predictions"""
        detector = DriftDetector()

        ref = [random.gauss(0.5, 0.1) for _ in range(200)]
        curr = [random.gauss(0.8, 0.1) for _ in range(200)]  # Shifted

        result = detector.detect_prediction_drift(ref, curr)

        assert result.is_significant
        assert result.score > 0.3
        assert result.details["psi"] > 0.1

    def test_drift_result_details(self):
        """Drift result should contain detailed metrics"""
        detector = DriftDetector()
        ref = [random.uniform(0, 1) for _ in range(100)]
        curr = [random.uniform(0.5, 1.5) for _ in range(100)]

        result = detector.detect_prediction_drift(ref, curr)

        assert "ks_statistic" in result.details
        assert "ks_pvalue" in result.details
        assert "psi" in result.details
        assert "js_divergence" in result.details


# =============================================================================
# Multi-feature Drift Detection Tests
# =============================================================================

class TestMultiFeatureDrift:
    """Tests for multi-feature drift scenarios"""

    def test_detect_single_feature_drift(self):
        """Should detect drift in a single feature"""
        detector = DriftDetector()

        features_ref = {
            "feature_a": [random.gauss(0, 1) for _ in range(100)],
            "feature_b": [random.gauss(5, 2) for _ in range(100)],
            "feature_c": [random.gauss(10, 3) for _ in range(100)],
        }

        features_curr = {
            "feature_a": [random.gauss(0, 1) for _ in range(100)],  # No drift
            "feature_b": [random.gauss(10, 2) for _ in range(100)],  # Drifted!
            "feature_c": [random.gauss(10, 3) for _ in range(100)],  # No drift
        }

        drifted_features = []
        for name in features_ref:
            _, pvalue = detector.kolmogorov_smirnov_test(
                features_ref[name], features_curr[name]
            )
            if pvalue < 0.05:
                drifted_features.append(name)

        assert "feature_b" in drifted_features

    def test_detect_correlated_feature_drift(self):
        """Should handle correlated feature drift"""
        detector = DriftDetector()
        random.seed(42)

        # Reference: correlated features
        base_ref = [random.gauss(0, 1) for _ in range(100)]
        features_ref = {
            "x": base_ref,
            "y": [v + random.gauss(0, 0.1) for v in base_ref],  # y = x + noise
        }

        # Current: different correlation
        base_curr = [random.gauss(0, 1) for _ in range(100)]
        features_curr = {
            "x": base_curr,
            "y": [v * 2 + random.gauss(0, 0.1) for v in base_curr],  # y = 2x + noise
        }

        # Check ratio distribution drift
        ratio_ref = [y / (x + 1e-10) for x, y in zip(features_ref["x"], features_ref["y"])]
        ratio_curr = [y / (x + 1e-10) for x, y in zip(features_curr["x"], features_curr["y"])]

        _, pvalue = detector.kolmogorov_smirnov_test(ratio_ref, ratio_curr)
        assert pvalue < 0.05  # Correlation change detected


# =============================================================================
# Drift Severity Classification Tests
# =============================================================================

class TestDriftSeverity:
    """Tests for drift severity classification"""

    @pytest.mark.parametrize("psi,expected_severity", [
        (0.05, "none"),
        (0.15, "moderate"),
        (0.30, "severe"),
        (0.50, "critical"),
    ])
    def test_psi_severity_classification(self, psi, expected_severity):
        """PSI values should map to correct severity"""
        def classify_psi_severity(psi_value: float) -> str:
            if psi_value < 0.1:
                return "none"
            elif psi_value < 0.25:
                return "moderate"
            elif psi_value < 0.4:
                return "severe"
            else:
                return "critical"

        assert classify_psi_severity(psi) == expected_severity


# =============================================================================
# Continuous Drift Monitoring Tests
# =============================================================================

class TestContinuousDriftMonitoring:
    """Tests for continuous drift monitoring scenarios"""

    def test_sliding_window_drift_detection(self):
        """Should detect drift with sliding window approach"""
        detector = DriftDetector()
        random.seed(42)

        # Simulate streaming data with drift at t=500
        data_stream = (
            [random.gauss(0, 1) for _ in range(500)] +  # Before drift
            [random.gauss(2, 1) for _ in range(500)]     # After drift
        )

        window_size = 100
        drift_detected_at = None

        for i in range(window_size, len(data_stream) - window_size, 50):
            ref_window = data_stream[i - window_size:i]
            curr_window = data_stream[i:i + window_size]

            _, pvalue = detector.kolmogorov_smirnov_test(ref_window, curr_window)

            if pvalue < 0.01 and drift_detected_at is None:
                drift_detected_at = i
                break

        assert drift_detected_at is not None
        assert 400 <= drift_detected_at <= 600  # Detected near drift point

    def test_gradual_drift_detection(self):
        """Should detect gradual drift over time"""
        detector = DriftDetector()

        # Gradual drift: mean increases slowly
        n_points = 1000
        data = [random.gauss(i / 500, 1) for i in range(n_points)]  # Mean: 0 -> 2

        # Compare first quarter vs last quarter
        first_quarter = data[:n_points // 4]
        last_quarter = data[-n_points // 4:]

        _, pvalue = detector.kolmogorov_smirnov_test(first_quarter, last_quarter)

        assert pvalue < 0.05  # Gradual drift detected

    def test_periodic_pattern_not_flagged_as_drift(self):
        """Periodic patterns should not be flagged as drift"""
        detector = DriftDetector()
        random.seed(42)

        # Periodic data (e.g., daily patterns)
        period = 24
        n_periods = 10

        # Two consecutive periods should be similar
        period1 = [math.sin(2 * math.pi * i / period) + random.gauss(0, 0.1)
                   for i in range(period)]
        period2 = [math.sin(2 * math.pi * i / period) + random.gauss(0, 0.1)
                   for i in range(period)]

        _, pvalue = detector.kolmogorov_smirnov_test(period1, period2)

        assert pvalue > 0.05  # No drift detected


# =============================================================================
# Edge Cases and Robustness Tests
# =============================================================================

class TestDriftEdgeCases:
    """Edge cases and robustness tests"""

    def test_single_value_distributions(self):
        """Should handle single-value distributions"""
        detector = DriftDetector()

        ref = [1.0] * 100
        curr = [1.0] * 100

        psi = detector.population_stability_index(ref, curr)
        assert psi == 0.0

    def test_very_small_samples(self):
        """Should handle very small samples gracefully"""
        detector = DriftDetector()

        ref = [1.0, 2.0, 3.0]
        curr = [4.0, 5.0, 6.0]

        stat, pvalue = detector.kolmogorov_smirnov_test(ref, curr)

        assert 0 <= stat <= 1
        assert 0 <= pvalue <= 1

    def test_outliers_handling(self):
        """Should handle outliers appropriately"""
        detector = DriftDetector()
        random.seed(42)

        ref = [random.gauss(0, 1) for _ in range(100)]
        curr = [random.gauss(0, 1) for _ in range(98)] + [100, -100]  # Outliers

        psi = detector.population_stability_index(ref, curr)

        # Should detect some change due to outliers
        assert psi > 0.01

    def test_numerical_stability(self):
        """Should be numerically stable with extreme values"""
        detector = DriftDetector()

        ref = [1e-10, 1e-9, 1e-8]
        curr = [1e-10, 1e-9, 1e-8]

        psi = detector.population_stability_index(ref, curr)
        js = detector.jensen_shannon_divergence(ref, curr)

        assert not math.isnan(psi)
        assert not math.isnan(js)
        assert not math.isinf(psi)
        assert not math.isinf(js)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
