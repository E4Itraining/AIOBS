/**
 * Cognitive Metrics Engine
 * Orchestrates all cognitive metric computations for AI systems
 */

import {
  CognitiveMetricsSnapshot,
  DriftMetrics,
  ReliabilityMetrics,
  HallucinationMetrics,
  DegradationMetrics,
  TrustIndicators,
  RiskFlag,
} from '../types/cognitive';
import { NormalizedScore, TimeWindow, TrendIndicator } from '../types/common';
import { DriftDetector } from './drift-detector';
import { ReliabilityAnalyzer } from './reliability-analyzer';
import { HallucinationDetector } from './hallucination-detector';
import { DegradationTracker } from './degradation-tracker';

/**
 * Configuration for the Cognitive Metrics Engine
 */
export interface CognitiveEngineConfig {
  // Analysis windows
  defaultWindow: TimeWindow;
  driftWindow: TimeWindow;
  reliabilityWindow: TimeWindow;
  hallucinationWindow: TimeWindow;
  degradationWindow: TimeWindow;

  // Thresholds
  driftThreshold: number;
  reliabilityThreshold: number;
  hallucinationThreshold: number;
  degradationThreshold: number;

  // Trust computation weights
  trustWeights: TrustWeights;
}

export interface TrustWeights {
  drift: number;
  reliability: number;
  hallucination: number;
  degradation: number;
}

/**
 * Main Cognitive Metrics Engine
 */
export class CognitiveMetricsEngine {
  private config: CognitiveEngineConfig;
  private driftDetector: DriftDetector;
  private reliabilityAnalyzer: ReliabilityAnalyzer;
  private hallucinationDetector: HallucinationDetector;
  private degradationTracker: DegradationTracker;

  constructor(config: Partial<CognitiveEngineConfig> = {}) {
    this.config = this.mergeWithDefaults(config);
    this.driftDetector = new DriftDetector(this.config);
    this.reliabilityAnalyzer = new ReliabilityAnalyzer(this.config);
    this.hallucinationDetector = new HallucinationDetector(this.config);
    this.degradationTracker = new DegradationTracker(this.config);
  }

  /**
   * Compute complete cognitive metrics snapshot for a model
   */
  async computeSnapshot(
    modelId: string,
    data: CognitiveInputData
  ): Promise<CognitiveMetricsSnapshot> {
    const timestamp = new Date().toISOString();

    // Compute all metrics in parallel
    const [drift, reliability, hallucination, degradation] = await Promise.all([
      this.driftDetector.analyze(modelId, data),
      this.reliabilityAnalyzer.analyze(modelId, data),
      this.hallucinationDetector.analyze(modelId, data),
      this.degradationTracker.analyze(modelId, data),
    ]);

    // Compute trust indicators
    const trustIndicators = this.computeTrustIndicators(
      drift,
      reliability,
      hallucination,
      degradation
    );

    return {
      modelId,
      timestamp,
      drift,
      reliability,
      hallucination,
      degradation,
      trustIndicators,
    };
  }

  /**
   * Compute trust indicators from cognitive metrics
   */
  private computeTrustIndicators(
    drift: DriftMetrics,
    reliability: ReliabilityMetrics,
    hallucination: HallucinationMetrics,
    degradation: DegradationMetrics
  ): TrustIndicators {
    const weights = this.config.trustWeights;

    // Compute component trust scores (inverse of risk)
    const driftTrust = 1 - drift.overallDriftScore.value;
    const reliabilityTrust = reliability.overallReliability;
    const factualityTrust = hallucination.factuality.score;
    const performanceTrust = 1 - degradation.overallDegradation.value;

    // Weighted overall trust
    const overallTrust =
      (driftTrust * weights.drift +
        reliabilityTrust * weights.reliability +
        factualityTrust * weights.hallucination +
        performanceTrust * weights.degradation) /
      (weights.drift + weights.reliability + weights.hallucination + weights.degradation);

    // Detect risk flags
    const riskFlags = this.detectRiskFlags(drift, reliability, hallucination, degradation);

    // Compute trend
    const trend = this.computeTrustTrend(drift, reliability, degradation);

    return {
      overallTrust,
      driftTrust,
      reliabilityTrust,
      factualityTrust,
      performanceTrust,
      trend,
      riskFlags,
    };
  }

  /**
   * Detect risk flags from metrics
   */
  private detectRiskFlags(
    drift: DriftMetrics,
    reliability: ReliabilityMetrics,
    hallucination: HallucinationMetrics,
    degradation: DegradationMetrics
  ): RiskFlag[] {
    const flags: RiskFlag[] = [];
    const now = new Date().toISOString();

    // Drift risks
    if (drift.driftDetected) {
      const driftSeverity = drift.overallDriftScore.severity === 'info' ? 'low' : drift.overallDriftScore.severity;
      flags.push({
        type: 'drift',
        severity: driftSeverity,
        message: `Drift detected: ${drift.overallDriftScore.value.toFixed(2)} score`,
        detectedAt: now,
        autoResolved: false,
      });
    }

    // Reliability risks
    if (reliability.overallReliability < this.config.reliabilityThreshold) {
      flags.push({
        type: 'reliability',
        severity: reliability.overallReliability < 0.5 ? 'critical' : 'high',
        message: `Low reliability: ${(reliability.overallReliability * 100).toFixed(1)}%`,
        detectedAt: now,
        autoResolved: false,
      });
    }

    // Hallucination risks
    if (hallucination.overallRisk.value > this.config.hallucinationThreshold) {
      const hallucinationSeverity = hallucination.overallRisk.severity === 'info' ? 'low' : hallucination.overallRisk.severity;
      flags.push({
        type: 'hallucination',
        severity: hallucinationSeverity,
        message: `Elevated hallucination risk: ${(hallucination.overallRisk.value * 100).toFixed(1)}%`,
        detectedAt: now,
        autoResolved: false,
      });
    }

    // Degradation risks
    if (degradation.overallDegradation.value > this.config.degradationThreshold) {
      const degradationSeverity = degradation.overallDegradation.severity === 'info' ? 'low' : degradation.overallDegradation.severity;
      flags.push({
        type: 'degradation',
        severity: degradationSeverity,
        message: `Performance degradation detected`,
        detectedAt: now,
        autoResolved: false,
      });
    }

    return flags;
  }

  /**
   * Compute overall trust trend
   */
  private computeTrustTrend(
    drift: DriftMetrics,
    reliability: ReliabilityMetrics,
    degradation: DegradationMetrics
  ): TrendIndicator {
    // Combine trends from different metrics
    // For reliability: increasing is good (improving), decreasing is bad (degrading)
    // For degradation: increasing is bad (degrading), decreasing is good (improving)
    const trends = [
      drift.dataDrift.detected ? -1 : 0,
      reliability.trend.direction === 'increasing' ? 1 : reliability.trend.direction === 'decreasing' ? -1 : 0,
      degradation.trend.direction === 'decreasing' ? 1 : degradation.trend.direction === 'increasing' ? -1 : 0,
    ];

    const avgTrend = trends.reduce((a, b) => a + b, 0) / trends.length;

    let direction: TrendIndicator['direction'];
    if (avgTrend > 0.3) direction = 'increasing';
    else if (avgTrend < -0.3) direction = 'decreasing';
    else if (Math.abs(avgTrend) < 0.1) direction = 'stable';
    else direction = 'volatile';

    return {
      direction,
      magnitude: Math.abs(avgTrend),
      periodDays: this.config.defaultWindow.duration,
      significance: Math.abs(avgTrend),
    };
  }

  /**
   * Merge config with defaults
   */
  private mergeWithDefaults(config: Partial<CognitiveEngineConfig>): CognitiveEngineConfig {
    return {
      defaultWindow: config.defaultWindow || { duration: 24, unit: 'hours' },
      driftWindow: config.driftWindow || { duration: 7, unit: 'days' },
      reliabilityWindow: config.reliabilityWindow || { duration: 24, unit: 'hours' },
      hallucinationWindow: config.hallucinationWindow || { duration: 1, unit: 'hours' },
      degradationWindow: config.degradationWindow || { duration: 30, unit: 'days' },
      driftThreshold: config.driftThreshold || 0.3,
      reliabilityThreshold: config.reliabilityThreshold || 0.9,
      hallucinationThreshold: config.hallucinationThreshold || 0.2,
      degradationThreshold: config.degradationThreshold || 0.15,
      trustWeights: config.trustWeights || {
        drift: 0.25,
        reliability: 0.30,
        hallucination: 0.25,
        degradation: 0.20,
      },
    };
  }
}

/**
 * Input data structure for cognitive analysis
 */
export interface CognitiveInputData {
  // Historical predictions
  predictions: PredictionRecord[];

  // Reference data for drift detection
  referenceData?: FeatureDistribution[];
  currentData?: FeatureDistribution[];

  // Ground truth for reliability
  groundTruth?: GroundTruthRecord[];

  // Model outputs for hallucination detection
  outputs?: ModelOutput[];

  // Historical performance for degradation
  performanceHistory?: PerformanceRecord[];
}

export interface PredictionRecord {
  id: string;
  timestamp: string;
  features: Record<string, number>;
  prediction: number | string;
  confidence: number;
  latencyMs: number;
}

export interface FeatureDistribution {
  featureName: string;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  histogram: { bucket: number; count: number }[];
}

export interface GroundTruthRecord {
  predictionId: string;
  actual: number | string;
  correct: boolean;
}

export interface ModelOutput {
  id: string;
  timestamp: string;
  input: string;
  output: string;
  sources?: string[];
  confidence: number;
}

export interface PerformanceRecord {
  timestamp: string;
  accuracy: number;
  latencyP50: number;
  latencyP99: number;
  errorRate: number;
  throughput: number;
}
