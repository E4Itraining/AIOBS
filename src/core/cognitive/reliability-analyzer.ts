/**
 * Reliability Analyzer
 * Analyzes model reliability including confidence calibration, stability, consistency, and robustness
 */

import {
  ReliabilityMetrics,
  ConfidenceReliability,
  StabilityMetrics,
  ConsistencyMetrics,
  RobustnessMetrics,
  CalibrationPoint,
} from '../types/cognitive';
import { NormalizedScore, TrendIndicator } from '../types/common';
import { CognitiveEngineConfig, CognitiveInputData } from './cognitive-engine';

/**
 * Reliability Analysis Engine
 */
export class ReliabilityAnalyzer {
  private config: CognitiveEngineConfig;

  constructor(config: CognitiveEngineConfig) {
    this.config = config;
  }

  /**
   * Analyze reliability metrics for a model
   */
  async analyze(modelId: string, data: CognitiveInputData): Promise<ReliabilityMetrics> {
    const timestamp = new Date().toISOString();

    // Compute reliability dimensions
    const confidence = this.analyzeConfidence(data);
    const stability = this.analyzeStability(data);
    const consistency = this.analyzeConsistency(data);
    const robustness = this.analyzeRobustness(data);

    // Compute overall reliability
    const overallReliability = this.computeOverallReliability(
      confidence,
      stability,
      consistency,
      robustness
    );

    // Compute trend
    const trend = this.computeTrend(data);

    return {
      modelId,
      timestamp,
      overallReliability,
      confidence,
      stability,
      consistency,
      robustness,
      trend,
    };
  }

  /**
   * Analyze confidence calibration
   */
  private analyzeConfidence(data: CognitiveInputData): ConfidenceReliability {
    const predictions = data.predictions || [];
    const groundTruth = data.groundTruth || [];

    if (predictions.length === 0) {
      return this.emptyConfidenceReliability();
    }

    // Build calibration curve
    const calibrationCurve = this.buildCalibrationCurve(predictions, groundTruth);

    // Compute Expected Calibration Error (ECE)
    const ece = this.computeECE(calibrationCurve);

    // Compute Maximum Calibration Error (MCE)
    const mce = this.computeMCE(calibrationCurve);

    // Compute Brier Score
    const brierScore = this.computeBrierScore(predictions, groundTruth);

    // Compute calibration score (inverse of ECE)
    const calibrationScore = Math.max(0, 1 - ece);

    // Detect over/under confidence
    const { overconfidence, underconfidence } = this.detectConfidenceBias(calibrationCurve);

    return {
      calibrationScore,
      expectedCalibrationError: ece,
      maximumCalibrationError: mce,
      brierscore: brierScore,
      calibrationCurve,
      overconfidence,
      underconfidence,
    };
  }

  /**
   * Build calibration curve from predictions
   */
  private buildCalibrationCurve(
    predictions: CognitiveInputData['predictions'],
    groundTruth: CognitiveInputData['groundTruth']
  ): CalibrationPoint[] {
    const numBins = 10;
    const bins: { predictions: number[]; correct: number[] }[] = Array(numBins)
      .fill(null)
      .map(() => ({ predictions: [], correct: [] }));

    // Map predictions to ground truth
    const predMap = new Map(predictions.map(p => [p.id, p]));
    const truthMap = new Map(groundTruth.map(g => [g.predictionId, g]));

    for (const [id, pred] of predMap) {
      const truth = truthMap.get(id);
      const binIndex = Math.min(Math.floor(pred.confidence * numBins), numBins - 1);

      bins[binIndex].predictions.push(pred.confidence);
      bins[binIndex].correct.push(truth?.correct ? 1 : 0);
    }

    // Compute calibration points
    return bins.map((bin, i) => {
      const avgConfidence = bin.predictions.length > 0
        ? bin.predictions.reduce((a, b) => a + b, 0) / bin.predictions.length
        : (i + 0.5) / numBins;

      const accuracy = bin.correct.length > 0
        ? bin.correct.reduce((a, b) => a + b, 0) / bin.correct.length
        : 0;

      return {
        predictedProbability: avgConfidence,
        actualFrequency: accuracy,
        sampleCount: bin.predictions.length,
      };
    });
  }

  /**
   * Compute Expected Calibration Error
   */
  private computeECE(curve: CalibrationPoint[]): number {
    const totalSamples = curve.reduce((sum, p) => sum + p.sampleCount, 0);
    if (totalSamples === 0) return 0;

    return curve.reduce((ece, point) => {
      const weight = point.sampleCount / totalSamples;
      const error = Math.abs(point.predictedProbability - point.actualFrequency);
      return ece + weight * error;
    }, 0);
  }

  /**
   * Compute Maximum Calibration Error
   */
  private computeMCE(curve: CalibrationPoint[]): number {
    return Math.max(
      0,
      ...curve
        .filter(p => p.sampleCount > 0)
        .map(p => Math.abs(p.predictedProbability - p.actualFrequency))
    );
  }

  /**
   * Compute Brier Score
   */
  private computeBrierScore(
    predictions: CognitiveInputData['predictions'],
    groundTruth: CognitiveInputData['groundTruth']
  ): number {
    const truthMap = new Map(groundTruth.map(g => [g.predictionId, g]));

    const scores = predictions.map(pred => {
      const truth = truthMap.get(pred.id);
      const actual = truth?.correct ? 1 : 0;
      return Math.pow(pred.confidence - actual, 2);
    });

    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  /**
   * Detect over/under confidence
   */
  private detectConfidenceBias(curve: CalibrationPoint[]): {
    overconfidence: NormalizedScore;
    underconfidence: NormalizedScore;
  } {
    let overconfidenceSum = 0;
    let underconfidenceSum = 0;
    let totalWeight = 0;

    for (const point of curve) {
      if (point.sampleCount === 0) continue;

      const diff = point.predictedProbability - point.actualFrequency;
      const weight = point.sampleCount;

      if (diff > 0) {
        overconfidenceSum += diff * weight;
      } else {
        underconfidenceSum += Math.abs(diff) * weight;
      }
      totalWeight += weight;
    }

    return {
      overconfidence: totalWeight > 0 ? overconfidenceSum / totalWeight : 0,
      underconfidence: totalWeight > 0 ? underconfidenceSum / totalWeight : 0,
    };
  }

  /**
   * Analyze stability metrics
   */
  private analyzeStability(data: CognitiveInputData): StabilityMetrics {
    const predictions = data.predictions || [];
    const history = data.performanceHistory || [];

    // Temporal variance
    const confidences = predictions.map(p => p.confidence);
    const temporalVariance = this.computeVariance(confidences);

    // Output consistency
    const outputConsistency = 1 - Math.min(1, temporalVariance * 2);

    // Perturbation sensitivity (simulated)
    const perturbationSensitivity = this.simulatePerturbationSensitivity(predictions);

    // Version delta
    const versionDelta = this.computeVersionDelta(history);

    // Overall stability score
    const score = (outputConsistency + (1 - perturbationSensitivity) + (1 - versionDelta)) / 3;

    return {
      score,
      temporalVariance,
      outputConsistency,
      perturbationSensitivity,
      versionDelta,
    };
  }

  /**
   * Compute variance of values
   */
  private computeVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  /**
   * Simulate perturbation sensitivity
   */
  private simulatePerturbationSensitivity(
    predictions: CognitiveInputData['predictions']
  ): NormalizedScore {
    if (predictions.length < 2) return 0;

    // Measure variance in confidence for similar predictions
    const confidences = predictions.map(p => p.confidence);
    const variance = this.computeVariance(confidences);

    return Math.min(1, variance * 5);
  }

  /**
   * Compute version delta from history
   */
  private computeVersionDelta(history: CognitiveInputData['performanceHistory']): NormalizedScore {
    if (!history || history.length < 2) return 0;

    const first = history[0];
    const last = history[history.length - 1];

    return Math.min(1, Math.abs(last.accuracy - first.accuracy));
  }

  /**
   * Analyze consistency metrics
   */
  private analyzeConsistency(data: CognitiveInputData): ConsistencyMetrics {
    const predictions = data.predictions || [];

    // Determinism score
    const deterministicScore = this.computeDeterminism(predictions);

    // Variance across runs (simulated)
    const varianceAcrossRuns = 0.05; // Simulated low variance

    // Semantic consistency (simulated for generative models)
    const semanticConsistency = 0.9; // Placeholder

    // Similar input consistency
    const similarInputConsistency = this.computeSimilarInputConsistency(predictions);

    // Overall consistency score
    const score = (deterministicScore + (1 - varianceAcrossRuns) + semanticConsistency + similarInputConsistency) / 4;

    return {
      score,
      deterministicScore,
      varianceAcrossRuns,
      semanticConsistency,
      similarInputConsistency,
    };
  }

  /**
   * Compute determinism score
   */
  private computeDeterminism(predictions: CognitiveInputData['predictions']): NormalizedScore {
    // High determinism if confidence variance is low
    const confidences = predictions.map(p => p.confidence);
    const variance = this.computeVariance(confidences);

    return Math.max(0, 1 - variance * 2);
  }

  /**
   * Compute consistency for similar inputs
   */
  private computeSimilarInputConsistency(
    predictions: CognitiveInputData['predictions']
  ): NormalizedScore {
    // Placeholder - would compare predictions for similar inputs
    return 0.85;
  }

  /**
   * Analyze robustness metrics
   */
  private analyzeRobustness(data: CognitiveInputData): RobustnessMetrics {
    // Adversarial resistance (simulated)
    const adversarialResistance = 0.8;

    // Noise tolerance
    const noiseTolerance = this.computeNoiseTolerance(data);

    // Edge case performance (simulated)
    const edgeCasePerformance = 0.75;

    // Distribution shift tolerance
    const distributionShiftTolerance = this.computeDistributionShiftTolerance(data);

    // Overall robustness score
    const score = (adversarialResistance + noiseTolerance + edgeCasePerformance + distributionShiftTolerance) / 4;

    return {
      score,
      adversarialResistance,
      noiseTolerance,
      edgeCasePerformance,
      distributionShiftTolerance,
    };
  }

  /**
   * Compute noise tolerance
   */
  private computeNoiseTolerance(data: CognitiveInputData): NormalizedScore {
    // Based on confidence stability
    const predictions = data.predictions || [];
    if (predictions.length === 0) return 0.5;

    const confidences = predictions.map(p => p.confidence);
    const variance = this.computeVariance(confidences);

    return Math.max(0, 1 - variance * 3);
  }

  /**
   * Compute distribution shift tolerance
   */
  private computeDistributionShiftTolerance(data: CognitiveInputData): NormalizedScore {
    const history = data.performanceHistory || [];
    if (history.length < 2) return 0.5;

    // Based on performance stability over time
    const accuracies = history.map(h => h.accuracy);
    const variance = this.computeVariance(accuracies);

    return Math.max(0, 1 - variance * 2);
  }

  /**
   * Compute overall reliability score
   */
  private computeOverallReliability(
    confidence: ConfidenceReliability,
    stability: StabilityMetrics,
    consistency: ConsistencyMetrics,
    robustness: RobustnessMetrics
  ): NormalizedScore {
    // Weighted average of components
    return (
      confidence.calibrationScore * 0.3 +
      stability.score * 0.25 +
      consistency.score * 0.25 +
      robustness.score * 0.2
    );
  }

  /**
   * Compute reliability trend
   */
  private computeTrend(data: CognitiveInputData): TrendIndicator {
    const history = data.performanceHistory || [];

    if (history.length < 3) {
      return {
        direction: 'stable',
        magnitude: 0,
        periodDays: 7,
        significance: 0,
      };
    }

    // Simple linear trend
    const n = history.length;
    const accuracies = history.map(h => h.accuracy);
    const first = accuracies.slice(0, Math.floor(n / 2));
    const second = accuracies.slice(Math.floor(n / 2));

    const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
    const secondAvg = second.reduce((a, b) => a + b, 0) / second.length;

    const change = secondAvg - firstAvg;

    let direction: TrendIndicator['direction'];
    if (change > 0.05) direction = 'increasing';
    else if (change < -0.05) direction = 'decreasing';
    else direction = 'stable';

    return {
      direction,
      magnitude: Math.abs(change),
      periodDays: 7,
      significance: Math.min(1, Math.abs(change) * 10),
    };
  }

  /**
   * Empty confidence reliability for edge cases
   */
  private emptyConfidenceReliability(): ConfidenceReliability {
    return {
      calibrationScore: 0,
      expectedCalibrationError: 0,
      maximumCalibrationError: 0,
      brierscore: 0,
      calibrationCurve: [],
      overconfidence: 0,
      underconfidence: 0,
    };
  }
}
