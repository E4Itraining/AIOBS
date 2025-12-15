/**
 * Drift Detection Engine
 * Detects data drift, concept drift, and prediction drift in AI models
 */

import {
  DriftMetrics,
  DataDriftMetrics,
  ConceptDriftMetrics,
  PredictionDriftMetrics,
  FeatureDriftScore,
  StatisticalTestResult,
  ChangePoint,
  ClassDriftScore,
  DriftAction,
} from '../types/cognitive';
import { NormalizedScore, SeverityScore, TimeWindow } from '../types/common';
import { DistributionMetrics } from '../types/metrics';
import { CognitiveEngineConfig, CognitiveInputData, FeatureDistribution } from './cognitive-engine';

/**
 * Drift Detection Engine
 */
export class DriftDetector {
  private config: CognitiveEngineConfig;

  constructor(config: CognitiveEngineConfig) {
    this.config = config;
  }

  /**
   * Analyze drift for a model
   */
  async analyze(modelId: string, data: CognitiveInputData): Promise<DriftMetrics> {
    const timestamp = new Date().toISOString();

    // Compute different types of drift
    const dataDrift = this.computeDataDrift(data);
    const conceptDrift = this.computeConceptDrift(data);
    const predictionDrift = this.computePredictionDrift(data);

    // Compute overall drift score
    const overallScore = this.computeOverallDriftScore(dataDrift, conceptDrift, predictionDrift);
    const driftDetected = overallScore.value > this.config.driftThreshold;

    // Generate recommended actions
    const recommendedActions = this.generateRecommendations(
      dataDrift,
      conceptDrift,
      predictionDrift,
      driftDetected
    );

    return {
      modelId,
      timestamp,
      window: this.config.driftWindow,
      dataDrift,
      conceptDrift,
      predictionDrift,
      overallDriftScore: overallScore,
      driftDetected,
      recommendedActions,
    };
  }

  /**
   * Compute data drift metrics
   */
  private computeDataDrift(data: CognitiveInputData): DataDriftMetrics {
    const referenceData = data.referenceData || [];
    const currentData = data.currentData || [];

    // Compute per-feature drift
    const featureDrift: FeatureDriftScore[] = [];
    const statisticalTests: StatisticalTestResult[] = [];

    for (const refFeature of referenceData) {
      const curFeature = currentData.find(f => f.featureName === refFeature.featureName);
      if (!curFeature) continue;

      // KS test simulation
      const ksResult = this.kolmogorovSmirnovTest(refFeature, curFeature);
      statisticalTests.push(ksResult);

      // PSI calculation
      const psiScore = this.calculatePSI(refFeature, curFeature);

      featureDrift.push({
        featureName: refFeature.featureName,
        driftScore: psiScore,
        driftType: 'distribution',
        pValue: ksResult.pValue,
        isSignificant: ksResult.isSignificant,
        referenceStats: this.toDistributionMetrics(refFeature),
        currentStats: this.toDistributionMetrics(curFeature),
      });
    }

    // Overall data drift score
    const avgDriftScore = featureDrift.length > 0
      ? featureDrift.reduce((sum, f) => sum + f.driftScore, 0) / featureDrift.length
      : 0;

    const significantFeatures = featureDrift.filter(f => f.isSignificant).length;
    const detected = significantFeatures > 0 || avgDriftScore > this.config.driftThreshold;

    return {
      score: avgDriftScore,
      detected,
      significance: significantFeatures / Math.max(featureDrift.length, 1),
      featureDrift,
      statisticalTests,
      referenceWindow: this.config.driftWindow,
      currentWindow: { duration: 24, unit: 'hours' },
    };
  }

  /**
   * Compute concept drift metrics
   */
  private computeConceptDrift(data: CognitiveInputData): ConceptDriftMetrics {
    const predictions = data.predictions || [];
    const groundTruth = data.groundTruth || [];

    // Simulate ADWIN-like change detection
    const changePoints = this.detectChangePoints(predictions, groundTruth);

    // Compute performance correlation
    const performanceHistory = data.performanceHistory || [];
    const performanceCorrelation = this.computePerformanceCorrelation(performanceHistory);

    // Overall concept drift score
    const score = changePoints.length > 0
      ? Math.min(1, changePoints.reduce((sum, cp) => sum + cp.confidence, 0) / changePoints.length)
      : 0;

    return {
      score,
      detected: changePoints.length > 0,
      significance: score,
      detectionMethod: 'adwin',
      windowSize: predictions.length,
      changePoints,
      performanceCorrelation,
    };
  }

  /**
   * Compute prediction drift metrics
   */
  private computePredictionDrift(data: CognitiveInputData): PredictionDriftMetrics {
    const predictions = data.predictions || [];

    if (predictions.length === 0) {
      return {
        score: 0,
        detected: false,
        significance: 0,
        referenceDistribution: this.emptyDistribution(),
        currentDistribution: this.emptyDistribution(),
        confidenceDrift: 0,
      };
    }

    // Split predictions into reference and current windows
    const midpoint = Math.floor(predictions.length / 2);
    const referencePreds = predictions.slice(0, midpoint);
    const currentPreds = predictions.slice(midpoint);

    // Compute confidence distributions
    const referenceConfidences = referencePreds.map(p => p.confidence);
    const currentConfidences = currentPreds.map(p => p.confidence);

    const referenceDistribution = this.computeDistribution(referenceConfidences);
    const currentDistribution = this.computeDistribution(currentConfidences);

    // Confidence drift
    const confidenceDrift = Math.abs(referenceDistribution.mean - currentDistribution.mean);

    // Overall prediction drift score
    const score = Math.min(1, confidenceDrift * 2);

    return {
      score,
      detected: score > this.config.driftThreshold,
      significance: score,
      referenceDistribution,
      currentDistribution,
      confidenceDrift,
    };
  }

  /**
   * Kolmogorov-Smirnov test simulation
   */
  private kolmogorovSmirnovTest(
    ref: FeatureDistribution,
    cur: FeatureDistribution
  ): StatisticalTestResult {
    // Simplified KS statistic based on distribution differences
    const meanDiff = Math.abs(ref.mean - cur.mean) / Math.max(ref.stdDev, 0.001);
    const stdDiff = Math.abs(ref.stdDev - cur.stdDev) / Math.max(ref.stdDev, 0.001);

    const statistic = Math.min(1, (meanDiff + stdDiff) / 2);
    const pValue = Math.max(0.001, 1 - statistic);
    const threshold = 0.05;

    return {
      testName: 'ks',
      statistic,
      pValue,
      threshold,
      isSignificant: pValue < threshold,
    };
  }

  /**
   * Calculate Population Stability Index (PSI)
   */
  private calculatePSI(ref: FeatureDistribution, cur: FeatureDistribution): NormalizedScore {
    if (ref.histogram.length === 0 || cur.histogram.length === 0) {
      return 0;
    }

    let psi = 0;
    const totalRef = ref.histogram.reduce((sum, b) => sum + b.count, 0);
    const totalCur = cur.histogram.reduce((sum, b) => sum + b.count, 0);

    for (let i = 0; i < ref.histogram.length; i++) {
      const refPct = (ref.histogram[i]?.count || 0.001) / Math.max(totalRef, 1);
      const curPct = (cur.histogram[i]?.count || 0.001) / Math.max(totalCur, 1);

      if (refPct > 0 && curPct > 0) {
        psi += (curPct - refPct) * Math.log(curPct / refPct);
      }
    }

    return Math.min(1, Math.abs(psi));
  }

  /**
   * Detect change points in prediction stream
   */
  private detectChangePoints(
    predictions: CognitiveInputData['predictions'],
    groundTruth: CognitiveInputData['groundTruth']
  ): ChangePoint[] {
    if (!predictions || predictions.length < 10) return [];

    const changePoints: ChangePoint[] = [];
    const windowSize = Math.max(10, Math.floor(predictions.length / 10));

    // Simple sliding window change detection
    for (let i = windowSize; i < predictions.length - windowSize; i++) {
      const beforeWindow = predictions.slice(i - windowSize, i);
      const afterWindow = predictions.slice(i, i + windowSize);

      const beforeAvgConf = beforeWindow.reduce((s, p) => s + p.confidence, 0) / windowSize;
      const afterAvgConf = afterWindow.reduce((s, p) => s + p.confidence, 0) / windowSize;

      const change = Math.abs(afterAvgConf - beforeAvgConf);

      if (change > 0.1) {
        changePoints.push({
          timestamp: predictions[i]?.timestamp || new Date().toISOString(),
          confidence: Math.min(1, change * 5),
          magnitude: change,
          affectedFeatures: ['confidence'],
        });
        i += windowSize; // Skip ahead to avoid overlapping detections
      }
    }

    return changePoints;
  }

  /**
   * Compute performance correlation with drift
   */
  private computePerformanceCorrelation(
    history: CognitiveInputData['performanceHistory']
  ): NormalizedScore {
    if (!history || history.length < 2) return 0;

    // Simple correlation based on accuracy trend
    const accuracies = history.map(h => h.accuracy);
    const trend = accuracies[accuracies.length - 1] - accuracies[0];

    return Math.min(1, Math.abs(trend));
  }

  /**
   * Compute overall drift score
   */
  private computeOverallDriftScore(
    data: DataDriftMetrics,
    concept: ConceptDriftMetrics,
    prediction: PredictionDriftMetrics
  ): SeverityScore {
    const weightedScore =
      data.score * 0.4 +
      concept.score * 0.35 +
      prediction.score * 0.25;

    let severity: SeverityScore['severity'];
    if (weightedScore >= 0.8) severity = 'critical';
    else if (weightedScore >= 0.6) severity = 'high';
    else if (weightedScore >= 0.4) severity = 'medium';
    else if (weightedScore >= 0.2) severity = 'low';
    else severity = 'info';

    return {
      value: weightedScore,
      severity,
      confidence: Math.max(data.significance, concept.significance, prediction.significance),
    };
  }

  /**
   * Generate drift action recommendations
   */
  private generateRecommendations(
    data: DataDriftMetrics,
    concept: ConceptDriftMetrics,
    prediction: PredictionDriftMetrics,
    driftDetected: boolean
  ): DriftAction[] {
    const actions: DriftAction[] = [];

    if (!driftDetected) {
      actions.push({
        type: 'monitor',
        priority: 'low',
        description: 'Continue monitoring - no significant drift detected',
        estimatedImpact: 'Maintain current model performance',
      });
      return actions;
    }

    if (data.detected) {
      const significantFeatures = data.featureDrift
        .filter(f => f.isSignificant)
        .map(f => f.featureName);

      actions.push({
        type: 'investigate',
        priority: data.score > 0.5 ? 'high' : 'medium',
        description: `Investigate data drift in features: ${significantFeatures.join(', ')}`,
        estimatedImpact: 'May require feature pipeline adjustment or retraining',
      });
    }

    if (concept.detected) {
      actions.push({
        type: 'retrain',
        priority: concept.score > 0.5 ? 'critical' : 'high',
        description: 'Concept drift detected - consider model retraining',
        estimatedImpact: 'Likely performance improvement after retraining',
      });
    }

    if (prediction.detected) {
      actions.push({
        type: 'alert',
        priority: 'medium',
        description: 'Prediction distribution shift detected',
        estimatedImpact: 'Monitor downstream system behavior',
      });
    }

    return actions;
  }

  /**
   * Convert FeatureDistribution to DistributionMetrics
   */
  private toDistributionMetrics(feature: FeatureDistribution): DistributionMetrics {
    return {
      mean: feature.mean,
      stdDev: feature.stdDev,
      min: feature.min,
      max: feature.max,
      percentiles: {},
      histogram: feature.histogram.map(b => ({
        lower: b.bucket,
        upper: b.bucket + 1,
        count: b.count,
      })),
    };
  }

  /**
   * Compute distribution metrics from values
   */
  private computeDistribution(values: number[]): DistributionMetrics {
    if (values.length === 0) return this.emptyDistribution();

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

    return {
      mean,
      stdDev: Math.sqrt(variance),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      percentiles: {
        '50': sorted[Math.floor(sorted.length * 0.5)],
        '90': sorted[Math.floor(sorted.length * 0.9)],
        '95': sorted[Math.floor(sorted.length * 0.95)],
        '99': sorted[Math.floor(sorted.length * 0.99)],
      },
      histogram: [],
    };
  }

  /**
   * Empty distribution for edge cases
   */
  private emptyDistribution(): DistributionMetrics {
    return {
      mean: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      percentiles: {},
      histogram: [],
    };
  }
}
