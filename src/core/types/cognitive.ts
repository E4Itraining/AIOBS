/**
 * Cognitive Metrics Type Definitions
 * AI-specific metrics that capture model behavior beyond traditional metrics
 */

import {
  ISO8601,
  UUID,
  NormalizedScore,
  TrendIndicator,
  TimeWindow,
  SeverityScore,
} from './common';
import { DistributionMetrics } from './metrics';

// ============================================================================
// Drift Detection
// ============================================================================

/** Comprehensive drift metrics */
export interface DriftMetrics {
  modelId: string;
  timestamp: ISO8601;
  window: TimeWindow;

  // Types of drift
  dataDrift: DataDriftMetrics;
  conceptDrift: ConceptDriftMetrics;
  predictionDrift: PredictionDriftMetrics;

  // Overall drift score
  overallDriftScore: SeverityScore;
  driftDetected: boolean;
  recommendedActions: DriftAction[];
}

/** Data drift - changes in input feature distributions */
export interface DataDriftMetrics {
  score: NormalizedScore;
  detected: boolean;
  significance: NormalizedScore;

  // Per-feature drift
  featureDrift: FeatureDriftScore[];

  // Statistical tests
  statisticalTests: StatisticalTestResult[];

  // Reference comparison
  referenceWindow: TimeWindow;
  currentWindow: TimeWindow;
}

export interface FeatureDriftScore {
  featureName: string;
  driftScore: NormalizedScore;
  driftType: 'distribution' | 'range' | 'categorical';
  pValue: number;
  isSignificant: boolean;
  referenceStats: DistributionMetrics;
  currentStats: DistributionMetrics;
}

export interface StatisticalTestResult {
  testName: 'ks' | 'chi2' | 'psi' | 'wasserstein' | 'jsd';
  statistic: number;
  pValue: number;
  threshold: number;
  isSignificant: boolean;
}

/** Concept drift - changes in relationship between inputs and outputs */
export interface ConceptDriftMetrics {
  score: NormalizedScore;
  detected: boolean;
  significance: NormalizedScore;

  // Detection methods
  detectionMethod: 'adwin' | 'ddm' | 'eddm' | 'ph' | 'ensemble';
  windowSize: number;
  changePoints: ChangePoint[];

  // Performance degradation correlation
  performanceCorrelation: NormalizedScore;
}

export interface ChangePoint {
  timestamp: ISO8601;
  confidence: NormalizedScore;
  magnitude: number;
  affectedFeatures: string[];
}

/** Prediction drift - changes in output distributions */
export interface PredictionDriftMetrics {
  score: NormalizedScore;
  detected: boolean;
  significance: NormalizedScore;

  // Output distribution changes
  referenceDistribution: DistributionMetrics;
  currentDistribution: DistributionMetrics;

  // Class-wise drift (for classification)
  classDrift?: ClassDriftScore[];

  // Confidence distribution changes
  confidenceDrift: NormalizedScore;
}

export interface ClassDriftScore {
  className: string;
  referenceProportion: number;
  currentProportion: number;
  driftScore: NormalizedScore;
}

export interface DriftAction {
  type: 'retrain' | 'investigate' | 'alert' | 'rollback' | 'monitor';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  estimatedImpact: string;
}

// ============================================================================
// Reliability Metrics
// ============================================================================

/** Model reliability assessment */
export interface ReliabilityMetrics {
  modelId: string;
  timestamp: ISO8601;

  // Core reliability scores
  overallReliability: NormalizedScore;

  // Detailed reliability dimensions
  confidence: ConfidenceReliability;
  stability: StabilityMetrics;
  consistency: ConsistencyMetrics;
  robustness: RobustnessMetrics;

  // Reliability trend
  trend: TrendIndicator;
}

/** Confidence calibration metrics */
export interface ConfidenceReliability {
  calibrationScore: NormalizedScore;
  expectedCalibrationError: number;
  maximumCalibrationError: number;
  brierscore: number;

  // Calibration curve data
  calibrationCurve: CalibrationPoint[];

  // Over/under confidence
  overconfidence: NormalizedScore;
  underconfidence: NormalizedScore;
}

export interface CalibrationPoint {
  predictedProbability: number;
  actualFrequency: number;
  sampleCount: number;
}

/** Stability metrics */
export interface StabilityMetrics {
  score: NormalizedScore;

  // Temporal stability
  temporalVariance: number;
  outputConsistency: NormalizedScore;

  // Input perturbation stability
  perturbationSensitivity: NormalizedScore;

  // Version stability
  versionDelta: NormalizedScore;
}

/** Consistency metrics */
export interface ConsistencyMetrics {
  score: NormalizedScore;

  // Determinism
  deterministicScore: NormalizedScore;
  varianceAcrossRuns: number;

  // Semantic consistency
  semanticConsistency: NormalizedScore;

  // Cross-input consistency
  similarInputConsistency: NormalizedScore;
}

/** Robustness metrics */
export interface RobustnessMetrics {
  score: NormalizedScore;

  // Adversarial robustness
  adversarialResistance: NormalizedScore;

  // Noise tolerance
  noiseTolerance: NormalizedScore;

  // Edge case handling
  edgeCasePerformance: NormalizedScore;

  // Distribution shift tolerance
  distributionShiftTolerance: NormalizedScore;
}

// ============================================================================
// Hallucination Risk
// ============================================================================

/** Hallucination risk metrics (primarily for generative models) */
export interface HallucinationMetrics {
  modelId: string;
  timestamp: ISO8601;

  // Overall risk score
  overallRisk: SeverityScore;

  // Grounding metrics
  grounding: GroundingMetrics;

  // Factuality metrics
  factuality: FactualityMetrics;

  // Uncertainty metrics
  uncertainty: UncertaintyMetrics;

  // Detection results
  detectedHallucinations: HallucinationInstance[];
}

/** Grounding metrics - how well outputs are grounded in inputs/context */
export interface GroundingMetrics {
  score: NormalizedScore;

  // Source attribution
  attributionScore: NormalizedScore;
  citationAccuracy: NormalizedScore;

  // Context adherence
  contextRelevance: NormalizedScore;
  contextCoverage: NormalizedScore;

  // Faithfulness to source
  faithfulnessScore: NormalizedScore;
}

/** Factuality metrics */
export interface FactualityMetrics {
  score: NormalizedScore;

  // Factual consistency
  consistencyScore: NormalizedScore;

  // Contradiction detection
  contradictionRate: NormalizedScore;

  // Verifiable claims ratio
  verifiableClaimRatio: NormalizedScore;
  verifiedClaimAccuracy: NormalizedScore;
}

/** Uncertainty metrics */
export interface UncertaintyMetrics {
  // Epistemic uncertainty (model's knowledge limits)
  epistemicUncertainty: NormalizedScore;

  // Aleatoric uncertainty (inherent data noise)
  aleatoricUncertainty: NormalizedScore;

  // Total uncertainty
  totalUncertainty: NormalizedScore;

  // Uncertainty calibration
  uncertaintyCalibration: NormalizedScore;
}

export interface HallucinationInstance {
  id: UUID;
  timestamp: ISO8601;
  inputId: string;
  outputSegment: string;
  hallucinationType: HallucinationType;
  confidence: NormalizedScore;
  explanation: string;
}

export type HallucinationType =
  | 'factual_error'
  | 'unsupported_claim'
  | 'contradiction'
  | 'fabrication'
  | 'exaggeration'
  | 'misattribution';

// ============================================================================
// Performance Degradation
// ============================================================================

/** Performance degradation tracking */
export interface DegradationMetrics {
  modelId: string;
  timestamp: ISO8601;
  analysisWindow: TimeWindow;

  // Overall degradation assessment
  overallDegradation: SeverityScore;

  // Degradation dimensions
  accuracyDegradation: MetricDegradation;
  latencyDegradation: MetricDegradation;
  throughputDegradation: MetricDegradation;
  reliabilityDegradation: MetricDegradation;

  // Trend analysis
  trend: TrendIndicator;

  // Projections
  projection: DegradationProjection;

  // Recommended actions
  actions: DegradationAction[];
}

export interface MetricDegradation {
  metricName: string;
  baselineValue: number;
  currentValue: number;
  degradationPercent: number;
  trend: TrendIndicator;
  isSignificant: boolean;
  pValue: number;
}

export interface DegradationProjection {
  timeToThreshold: number | null; // days until breach, null if not degrading
  projectedValueAtThreshold: number;
  confidence: NormalizedScore;
  scenario: 'optimistic' | 'expected' | 'pessimistic';
}

export interface DegradationAction {
  type: 'retrain' | 'tune' | 'investigate' | 'replace' | 'scale';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  expectedImprovement: string;
  estimatedEffort: string;
}

// ============================================================================
// Composite Cognitive Metrics
// ============================================================================

/** Complete cognitive metrics snapshot */
export interface CognitiveMetricsSnapshot {
  modelId: string;
  timestamp: ISO8601;

  drift: DriftMetrics;
  reliability: ReliabilityMetrics;
  hallucination: HallucinationMetrics;
  degradation: DegradationMetrics;

  // Computed trust indicators
  trustIndicators: TrustIndicators;
}

export interface TrustIndicators {
  overallTrust: NormalizedScore;

  // Component trust scores
  driftTrust: NormalizedScore;
  reliabilityTrust: NormalizedScore;
  factualityTrust: NormalizedScore;
  performanceTrust: NormalizedScore;

  // Trust trend
  trend: TrendIndicator;

  // Risk flags
  riskFlags: RiskFlag[];
}

export interface RiskFlag {
  type: 'drift' | 'reliability' | 'hallucination' | 'degradation' | 'security';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  detectedAt: ISO8601;
  autoResolved: boolean;
}
