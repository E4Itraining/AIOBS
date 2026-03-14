/**
 * Semantic Drift Type Definitions
 * Detects changes in operational meaning of AI outputs beyond statistical drift.
 * A model can remain within normal statistical bounds while its outputs'
 * operational significance has been compromised (adversarial semantic shift).
 */

import {
  ISO8601,
  UUID,
  NormalizedScore,
  SeverityScore,
  TrendIndicator,
  TimeWindow,
} from './common';

// ============================================================================
// Semantic Drift Detection
// ============================================================================

/** Complete semantic drift analysis result */
export interface SemanticDriftAnalysis {
  id: UUID;
  modelId: string;
  timestamp: ISO8601;
  window: TimeWindow;

  /** Overall semantic drift score */
  overallScore: SeverityScore;
  driftDetected: boolean;

  /** Isolation Forest anomaly detection results */
  isolationForest: IsolationForestResult;

  /** VAE reconstruction analysis */
  vaeAnalysis: VAEAnalysisResult;

  /** Operational context analysis */
  contextAnalysis: SemanticContextResult;

  /** Generated alerts */
  alerts: SemanticAlert[];

  /** Recommended actions */
  recommendedActions: SemanticDriftAction[];

  /** Evidence chain for AI Act compliance */
  evidence: SemanticDriftEvidence;
}

// ============================================================================
// Isolation Forest Results
// ============================================================================

/** Isolation Forest anomaly detection on inference streams */
export interface IsolationForestResult {
  /** Anomaly score (higher = more anomalous) */
  anomalyScore: NormalizedScore;

  /** Number of anomalous samples detected */
  anomalousCount: number;
  totalSamples: number;
  anomalyRate: NormalizedScore;

  /** Contamination threshold used */
  contaminationThreshold: number;

  /** Per-feature anomaly contribution */
  featureContributions: FeatureAnomalyContribution[];

  /** Detected anomaly clusters */
  clusters: AnomalyCluster[];
}

export interface FeatureAnomalyContribution {
  featureName: string;
  contribution: NormalizedScore;
  isolationDepth: number;
  isAnomaly: boolean;
}

export interface AnomalyCluster {
  id: string;
  size: number;
  centroid: number[];
  avgAnomalyScore: NormalizedScore;
  firstSeen: ISO8601;
  lastSeen: ISO8601;
}

// ============================================================================
// VAE (Variational Autoencoder) Analysis
// ============================================================================

/** VAE reconstruction-based semantic drift detection */
export interface VAEAnalysisResult {
  /** Reconstruction error (higher = more drift) */
  reconstructionError: number;
  reconstructionThreshold: number;
  isAnomalous: boolean;

  /** Latent space analysis */
  latentSpaceDrift: NormalizedScore;
  latentDimensions: LatentDimensionAnalysis[];

  /** KL divergence from reference distribution */
  klDivergence: number;
  klThreshold: number;

  /** Embedding distance from reference centroid */
  embeddingDistance: number;
  embeddingDistanceThreshold: number;
}

export interface LatentDimensionAnalysis {
  dimension: number;
  meanShift: number;
  varianceRatio: number;
  isSignificant: boolean;
}

// ============================================================================
// Semantic Context Analysis
// ============================================================================

/** Analysis of operational meaning changes vs statistical drift */
export interface SemanticContextResult {
  /** Whether the statistical distribution is normal but meaning shifted */
  statisticallyNormal: boolean;
  semanticallyShifted: boolean;

  /** Operational domain coherence score */
  domainCoherence: NormalizedScore;

  /** Decision boundary integrity */
  decisionBoundaryShift: NormalizedScore;

  /** Output-to-action mapping consistency */
  actionMappingConsistency: NormalizedScore;

  /** Temporal consistency of semantic meaning */
  temporalConsistency: NormalizedScore;

  /** Detected semantic shifts */
  detectedShifts: SemanticShift[];

  /** Correlation between statistical and semantic drift */
  statisticalSemanticCorrelation: NormalizedScore;
}

export interface SemanticShift {
  id: UUID;
  timestamp: ISO8601;
  shiftType: SemanticShiftType;
  magnitude: NormalizedScore;
  confidence: NormalizedScore;
  affectedOutputs: string[];
  description: string;
  /** Whether this shift indicates potential adversarial compromise */
  adversarialIndicator: boolean;
}

export type SemanticShiftType =
  | 'meaning_inversion'        // Output means the opposite
  | 'context_displacement'     // Valid output in wrong operational context
  | 'confidence_manipulation'  // Confidence scores misaligned with actual quality
  | 'boundary_erosion'         // Decision boundaries gradually shifted
  | 'label_semantic_drift'     // Labels drift in meaning while staying valid
  | 'operational_decorrelation'; // Outputs decorrelate from operational intent

// ============================================================================
// Semantic Alerts
// ============================================================================

export interface SemanticAlert {
  id: UUID;
  timestamp: ISO8601;
  modelId: string;

  severity: 'critical' | 'high' | 'medium' | 'low';
  category: SemanticAlertCategory;
  title: string;
  description: string;

  /** Confidence in the alert's accuracy */
  confidenceScore: NormalizedScore;

  /** Source detection methods that triggered this alert */
  detectionSources: SemanticDetectionSource[];

  /** Operational impact assessment */
  operationalImpact: OperationalImpact;

  /** MITRE ATT&CK ICS mapping (if applicable) */
  mitreMapping?: string;

  /** Evidence for AI Act traceability */
  evidence: AlertEvidence;

  /** Whether this alert has been acknowledged */
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: ISO8601;
}

export type SemanticAlertCategory =
  | 'adversarial_semantic_shift'
  | 'gradual_meaning_drift'
  | 'context_integrity_violation'
  | 'decision_boundary_compromise'
  | 'confidence_calibration_attack'
  | 'operational_coherence_loss';

export type SemanticDetectionSource =
  | 'isolation_forest'
  | 'vae_reconstruction'
  | 'context_analyzer'
  | 'temporal_correlation'
  | 'cross_model_consistency';

export interface OperationalImpact {
  /** Systems/processes affected */
  affectedSystems: string[];
  /** Estimated impact severity on operations */
  severity: 'mission_critical' | 'operational' | 'informational';
  /** Whether this could affect safety-critical decisions */
  safetyCritical: boolean;
  /** Recommended immediate actions */
  immediateActions: string[];
}

export interface AlertEvidence {
  /** Unique evidence chain ID */
  chainId: UUID;
  /** Timestamps of detection pipeline stages */
  detectionTimeline: { stage: string; timestamp: ISO8601 }[];
  /** Raw metrics that triggered the alert */
  triggeringMetrics: Record<string, number>;
  /** Snapshot of model state at detection time */
  modelStateHash: string;
  /** Exportable as JSON/PDF for AI Act compliance */
  exportFormat: 'json' | 'pdf';
}

// ============================================================================
// Actions & Evidence
// ============================================================================

export interface SemanticDriftAction {
  type: 'quarantine' | 'investigate' | 'rollback' | 'retrain' | 'alert_soc' | 'monitor';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  estimatedImpact: string;
  automated: boolean;
}

/** Evidence chain for full traceability */
export interface SemanticDriftEvidence {
  chainId: UUID;
  modelId: string;
  analysisTimestamp: ISO8601;

  /** Complete detection pipeline trace */
  detectionPipeline: DetectionPipelineStep[];

  /** Raw data fingerprints */
  dataFingerprints: DataFingerprint[];

  /** Model state at time of analysis */
  modelState: ModelStateSnapshot;

  /** Export-ready evidence package */
  exportable: boolean;
}

export interface DetectionPipelineStep {
  step: string;
  timestamp: ISO8601;
  input: string;
  output: string;
  confidence: NormalizedScore;
}

export interface DataFingerprint {
  datasetId: string;
  hash: string;
  sampleCount: number;
  timestamp: ISO8601;
}

export interface ModelStateSnapshot {
  modelId: string;
  version: string;
  checksum: string;
  deploymentTimestamp: ISO8601;
  configuration: Record<string, string>;
}

// ============================================================================
// Configuration
// ============================================================================

export interface SemanticDriftConfig {
  /** Isolation Forest parameters */
  isolationForest: {
    nEstimators: number;
    contamination: number;
    maxSamples: number;
    windowSize: number;
  };

  /** VAE parameters */
  vae: {
    latentDimensions: number;
    reconstructionThreshold: number;
    klThreshold: number;
    embeddingDistanceThreshold: number;
  };

  /** Context analyzer parameters */
  contextAnalyzer: {
    domainCoherenceThreshold: number;
    temporalConsistencyWindow: TimeWindow;
    decisionBoundaryTolerance: number;
  };

  /** Alert thresholds */
  alerting: {
    criticalThreshold: number;
    highThreshold: number;
    mediumThreshold: number;
    minConfidence: number;
  };

  /** Evidence generation */
  evidence: {
    enabled: boolean;
    retentionDays: number;
    autoExport: boolean;
  };
}
