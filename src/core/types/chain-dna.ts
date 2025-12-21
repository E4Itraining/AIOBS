/**
 * LLM Chain DNA Profiling Types
 *
 * Types for creating behavioral "fingerprints" of LLM chains to detect
 * mutations, drift, and anomalous behavior patterns.
 *
 * @module chain-dna
 */

import {
  UUID,
  ISO8601,
  SHA256,
  NormalizedScore,
  JSONObject,
  TimeRange,
  TrendIndicator,
  SeverityScore,
} from './common';

// ============================================================================
// Core DNA Types
// ============================================================================

/**
 * Chain DNA Profile - behavioral fingerprint of an LLM chain
 */
export interface ChainDNAProfile {
  id: UUID;
  chainId: UUID;
  name: string;
  version: string;

  /** When this profile was created */
  createdAt: ISO8601;
  /** When this profile was last updated */
  updatedAt: ISO8601;
  /** Profile generation parameters */
  generationConfig: ProfileGenerationConfig;

  /** Core DNA components */
  promptFingerprint: PromptFingerprint;
  behaviorSignature: BehaviorSignature;
  outputDistribution: OutputDistribution;
  toolUsagePattern: ToolUsagePattern;
  reasoningPattern: ReasoningPattern;

  /** Temporal patterns */
  temporalPatterns: TemporalPattern[];
  /** Context sensitivity */
  contextSensitivity: ContextSensitivity;

  /** Baseline metrics */
  baselineMetrics: BaselineMetrics;
  /** Mutation thresholds */
  mutationThresholds: MutationThresholds;

  /** Profile health */
  health: ProfileHealth;
}

export interface ProfileGenerationConfig {
  sampleSize: number;
  samplingStrategy: 'random' | 'stratified' | 'time-based';
  windowDays: number;
  embeddingModel: string;
  confidenceThreshold: NormalizedScore;
}

// ============================================================================
// Prompt Fingerprint Types
// ============================================================================

/**
 * Prompt Fingerprint - structural signature of prompts
 */
export interface PromptFingerprint {
  /** Hash of the prompt structure */
  structureHash: SHA256;
  /** Semantic embedding vector (compressed) */
  semanticEmbedding: number[];
  /** Key instruction components */
  instructionComponents: InstructionComponent[];
  /** Variable patterns */
  variablePatterns: VariablePattern[];
  /** Constraint signatures */
  constraintSignatures: ConstraintSignature[];

  /** Prompt complexity metrics */
  complexity: PromptComplexity;
  /** Style characteristics */
  styleCharacteristics: StyleCharacteristics;
}

export interface InstructionComponent {
  id: string;
  type: InstructionType;
  content: string;
  importance: NormalizedScore;
  embedding: number[];
}

export type InstructionType =
  | 'persona'
  | 'task'
  | 'constraint'
  | 'format'
  | 'example'
  | 'context'
  | 'guardrail'
  | 'output-specification';

export interface VariablePattern {
  name: string;
  type: string;
  distributionType: 'categorical' | 'numeric' | 'text' | 'mixed';
  commonValues?: string[];
  valueRange?: { min: number; max: number };
  entropy: number;
}

export interface ConstraintSignature {
  type: 'length' | 'format' | 'content' | 'style' | 'safety';
  description: string;
  strictness: NormalizedScore;
}

export interface PromptComplexity {
  tokenCount: number;
  variableCount: number;
  instructionCount: number;
  nestingDepth: number;
  conditionalBranches: number;
  complexityScore: NormalizedScore;
}

export interface StyleCharacteristics {
  formality: NormalizedScore;
  verbosity: NormalizedScore;
  directness: NormalizedScore;
  technicalLevel: NormalizedScore;
  emotionalTone: NormalizedScore;
}

// ============================================================================
// Behavior Signature Types
// ============================================================================

/**
 * Behavior Signature - how the chain typically behaves
 */
export interface BehaviorSignature {
  /** Response behavior patterns */
  responsePatterns: ResponsePattern[];
  /** Decision patterns */
  decisionPatterns: DecisionPattern[];
  /** Error handling patterns */
  errorPatterns: ErrorPattern[];
  /** Interaction patterns */
  interactionPatterns: InteractionPattern[];

  /** Behavioral centroid (average behavior vector) */
  centroid: number[];
  /** Behavioral variance */
  variance: number;
  /** Behavioral clusters */
  clusters: BehaviorCluster[];
}

export interface ResponsePattern {
  id: string;
  name: string;
  /** Pattern frequency */
  frequency: NormalizedScore;
  /** Characteristic features */
  features: PatternFeature[];
  /** Associated contexts */
  triggerContexts: string[];
  /** Expected output characteristics */
  outputCharacteristics: OutputCharacteristics;
}

export interface PatternFeature {
  name: string;
  value: number | string | boolean;
  importance: NormalizedScore;
}

export interface OutputCharacteristics {
  averageLength: number;
  lengthVariance: number;
  structureType: 'prose' | 'list' | 'code' | 'structured' | 'mixed';
  sentimentRange: { min: number; max: number };
  confidenceRange: { min: number; max: number };
}

export interface DecisionPattern {
  id: string;
  /** Decision type */
  type: 'classification' | 'routing' | 'tool-selection' | 'response-style';
  /** Decision factors */
  factors: DecisionFactor[];
  /** Typical outcomes */
  outcomes: DecisionOutcome[];
  /** Decision consistency */
  consistency: NormalizedScore;
}

export interface DecisionFactor {
  name: string;
  weight: NormalizedScore;
  type: 'input-feature' | 'context' | 'history' | 'random';
}

export interface DecisionOutcome {
  outcome: string;
  probability: NormalizedScore;
  conditions: string[];
}

export interface ErrorPattern {
  errorType: string;
  frequency: NormalizedScore;
  triggerConditions: string[];
  recoveryBehavior: string;
}

export interface InteractionPattern {
  type: 'clarification' | 'confirmation' | 'elaboration' | 'correction';
  frequency: NormalizedScore;
  triggers: string[];
  typicalResponse: string;
}

export interface BehaviorCluster {
  id: string;
  name: string;
  centroid: number[];
  size: number;
  characteristics: string[];
}

// ============================================================================
// Output Distribution Types
// ============================================================================

/**
 * Output Distribution - statistical profile of outputs
 */
export interface OutputDistribution {
  /** Semantic embedding distribution */
  semanticDistribution: SemanticDistribution;
  /** Length distribution */
  lengthDistribution: DistributionStats;
  /** Token distribution */
  tokenDistribution: TokenDistribution;
  /** Content type distribution */
  contentTypeDistribution: ContentTypeDistribution;

  /** Quality distribution */
  qualityDistribution: QualityDistribution;
  /** Confidence distribution */
  confidenceDistribution: DistributionStats;
}

export interface SemanticDistribution {
  /** Mean embedding */
  mean: number[];
  /** Covariance matrix (compressed) */
  covariance: number[][];
  /** Principal components */
  principalComponents: PrincipalComponent[];
  /** Outlier threshold */
  outlierThreshold: number;
}

export interface PrincipalComponent {
  index: number;
  variance: number;
  cumulativeVariance: number;
  direction: number[];
}

export interface DistributionStats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentiles: Record<string, number>;  // "p25", "p75", "p90", "p95", "p99"
}

export interface TokenDistribution {
  /** Average tokens per response */
  averageTokens: number;
  /** Token distribution by type */
  byType: Record<string, number>;
  /** Most common tokens */
  topTokens: { token: string; frequency: number }[];
  /** Vocabulary diversity */
  vocabularyDiversity: NormalizedScore;
}

export interface ContentTypeDistribution {
  prose: NormalizedScore;
  code: NormalizedScore;
  list: NormalizedScore;
  table: NormalizedScore;
  json: NormalizedScore;
  other: NormalizedScore;
}

export interface QualityDistribution {
  averageQuality: NormalizedScore;
  qualityVariance: number;
  byDimension: Record<string, DistributionStats>;
}

// ============================================================================
// Tool Usage Pattern Types
// ============================================================================

/**
 * Tool Usage Pattern - how tools are used in the chain
 */
export interface ToolUsagePattern {
  /** Tools available */
  availableTools: ToolInfo[];
  /** Usage statistics per tool */
  toolStats: ToolStatistics[];
  /** Tool selection patterns */
  selectionPatterns: ToolSelectionPattern[];
  /** Tool chains (sequences) */
  toolChains: ToolChain[];
  /** Overall tool reliance */
  toolReliance: NormalizedScore;
}

export interface ToolInfo {
  id: string;
  name: string;
  type: 'retrieval' | 'computation' | 'external-api' | 'code-execution' | 'search';
  description: string;
}

export interface ToolStatistics {
  toolId: string;
  usageFrequency: NormalizedScore;
  averageLatencyMs: number;
  successRate: NormalizedScore;
  errorTypes: Record<string, number>;
  averageRetries: number;
}

export interface ToolSelectionPattern {
  context: string;
  selectedTools: { toolId: string; probability: NormalizedScore }[];
  selectionReasoning: string;
}

export interface ToolChain {
  id: string;
  sequence: string[];
  frequency: NormalizedScore;
  averageDurationMs: number;
  successRate: NormalizedScore;
  description: string;
}

// ============================================================================
// Reasoning Pattern Types
// ============================================================================

/**
 * Reasoning Pattern - how the chain reasons
 */
export interface ReasoningPattern {
  /** Reasoning style */
  style: ReasoningStyle;
  /** Chain of thought patterns */
  cotPatterns: ChainOfThoughtPattern[];
  /** Inference patterns */
  inferencePatterns: InferencePattern[];
  /** Knowledge utilization */
  knowledgeUtilization: KnowledgeUtilization;

  /** Reasoning depth distribution */
  depthDistribution: DistributionStats;
  /** Reasoning consistency */
  consistency: NormalizedScore;
}

export interface ReasoningStyle {
  predominant: 'analytical' | 'intuitive' | 'systematic' | 'creative' | 'mixed';
  characteristics: ReasoningCharacteristic[];
}

export interface ReasoningCharacteristic {
  name: string;
  strength: NormalizedScore;
  examples: string[];
}

export interface ChainOfThoughtPattern {
  id: string;
  name: string;
  structure: COTStructure;
  frequency: NormalizedScore;
  effectiveness: NormalizedScore;
  typicalLength: number;
}

export interface COTStructure {
  steps: COTStep[];
  branches: number;
  backtracking: boolean;
}

export interface COTStep {
  type: 'observation' | 'analysis' | 'hypothesis' | 'verification' | 'conclusion';
  typical_content: string;
  importance: NormalizedScore;
}

export interface InferencePattern {
  type: 'deductive' | 'inductive' | 'abductive' | 'analogical';
  frequency: NormalizedScore;
  reliability: NormalizedScore;
  exampleContexts: string[];
}

export interface KnowledgeUtilization {
  internalKnowledgeReliance: NormalizedScore;
  externalKnowledgeReliance: NormalizedScore;
  citationFrequency: NormalizedScore;
  knowledgeIntegrationStyle: 'explicit' | 'implicit' | 'mixed';
}

// ============================================================================
// Temporal Pattern Types
// ============================================================================

/**
 * Temporal Pattern - time-based behavior variations
 */
export interface TemporalPattern {
  type: TemporalPatternType;
  periodicity: string;  // e.g., "hourly", "daily", "weekly"
  amplitude: number;
  phase: number;
  affectedMetrics: string[];
  significance: NormalizedScore;
}

export type TemporalPatternType =
  | 'cyclic'
  | 'seasonal'
  | 'trend'
  | 'event-driven'
  | 'drift';

// ============================================================================
// Context Sensitivity Types
// ============================================================================

/**
 * Context Sensitivity - how context affects behavior
 */
export interface ContextSensitivity {
  /** Sensitivity to different context types */
  sensitivities: ContextTypeSensitivity[];
  /** Context-behavior correlations */
  correlations: ContextBehaviorCorrelation[];
  /** Stability under context variation */
  stability: NormalizedScore;
}

export interface ContextTypeSensitivity {
  contextType: 'user-history' | 'session-state' | 'time' | 'language' | 'domain';
  sensitivity: NormalizedScore;
  impactedBehaviors: string[];
}

export interface ContextBehaviorCorrelation {
  contextFeature: string;
  behaviorMetric: string;
  correlation: number;
  significance: NormalizedScore;
}

// ============================================================================
// Baseline and Threshold Types
// ============================================================================

/**
 * Baseline Metrics - normal operating parameters
 */
export interface BaselineMetrics {
  generatedAt: ISO8601;
  samplePeriod: TimeRange;
  sampleSize: number;

  /** Performance baselines */
  latency: DistributionStats;
  throughput: DistributionStats;
  errorRate: DistributionStats;

  /** Quality baselines */
  outputQuality: DistributionStats;
  relevance: DistributionStats;
  coherence: DistributionStats;

  /** Behavioral baselines */
  outputLength: DistributionStats;
  toolUsageRate: DistributionStats;
  confidenceScore: DistributionStats;
}

/**
 * Mutation Thresholds - when to flag changes
 */
export interface MutationThresholds {
  /** Semantic drift threshold */
  semanticDriftThreshold: number;
  /** Behavioral deviation threshold */
  behavioralDeviationThreshold: number;
  /** Output distribution shift threshold */
  outputShiftThreshold: number;
  /** Tool usage change threshold */
  toolUsageChangeThreshold: number;
  /** Performance degradation threshold */
  performanceDegradationThreshold: number;

  /** Custom thresholds */
  custom: Record<string, number>;
}

export interface ProfileHealth {
  status: 'healthy' | 'stale' | 'needs-update' | 'invalid';
  lastValidated: ISO8601;
  sampleCoverage: NormalizedScore;
  confidence: NormalizedScore;
  issues: ProfileIssue[];
}

export interface ProfileIssue {
  type: 'data-gap' | 'low-sample' | 'high-variance' | 'outdated' | 'drift-detected';
  severity: 'warning' | 'error';
  description: string;
  recommendation: string;
}

// ============================================================================
// Mutation Detection Types
// ============================================================================

/**
 * Mutation Report - detected behavioral changes
 */
export interface MutationReport {
  id: UUID;
  profileId: UUID;
  generatedAt: ISO8601;
  executionId?: UUID;

  /** Overall mutation score */
  mutationScore: NormalizedScore;
  /** Mutation severity */
  severity: SeverityScore;
  /** Mutation type */
  mutationType: MutationType;

  /** Detailed analysis */
  semanticMutation: SemanticMutationAnalysis;
  behavioralMutation: BehavioralMutationAnalysis;
  outputMutation: OutputMutationAnalysis;
  toolMutation: ToolMutationAnalysis;

  /** Root cause analysis */
  rootCauseAnalysis: MutationRootCause;
  /** Recommendations */
  recommendations: MutationRecommendation[];

  /** Timeline */
  detectedAt: ISO8601;
  firstObserved?: ISO8601;
  trend: TrendIndicator;
}

export type MutationType =
  | 'semantic-drift'
  | 'behavioral-shift'
  | 'output-distribution-change'
  | 'tool-usage-change'
  | 'performance-degradation'
  | 'quality-degradation'
  | 'jailbreak-attempt'
  | 'prompt-injection'
  | 'unknown';

export interface SemanticMutationAnalysis {
  /** Similarity to baseline */
  baselineSimilarity: NormalizedScore;
  /** Drift direction */
  driftDirection: number[];
  /** Most changed components */
  changedComponents: ComponentChange[];
  /** New instructions detected */
  newInstructions: string[];
  /** Removed instructions */
  removedInstructions: string[];
}

export interface ComponentChange {
  componentId: string;
  changeType: 'modified' | 'added' | 'removed' | 'shifted';
  changeMagnitude: NormalizedScore;
  beforeValue?: JSONObject;
  afterValue?: JSONObject;
}

export interface BehavioralMutationAnalysis {
  /** Distance from behavior centroid */
  centroidDistance: number;
  /** Changed patterns */
  changedPatterns: PatternChange[];
  /** New behaviors observed */
  newBehaviors: string[];
  /** Missing expected behaviors */
  missingBehaviors: string[];
  /** Decision changes */
  decisionChanges: DecisionChange[];
}

export interface PatternChange {
  patternId: string;
  patternName: string;
  changeType: 'frequency' | 'structure' | 'outcome';
  before: JSONObject;
  after: JSONObject;
  significance: NormalizedScore;
}

export interface DecisionChange {
  decisionType: string;
  previousOutcome: string;
  newOutcome: string;
  frequencyChange: number;
}

export interface OutputMutationAnalysis {
  /** Distribution shift (KL divergence) */
  distributionShift: number;
  /** Length change */
  lengthChange: DistributionChange;
  /** Quality change */
  qualityChange: DistributionChange;
  /** Content type shift */
  contentTypeShift: Record<string, number>;
  /** New output patterns */
  newPatterns: string[];
}

export interface DistributionChange {
  before: DistributionStats;
  after: DistributionStats;
  changeSignificance: NormalizedScore;
}

export interface ToolMutationAnalysis {
  /** Tools with changed usage */
  changedTools: ToolUsageChange[];
  /** New tool usage */
  newToolUsage: string[];
  /** Abandoned tools */
  abandonedTools: string[];
  /** Chain changes */
  chainChanges: ToolChainChange[];
}

export interface ToolUsageChange {
  toolId: string;
  previousFrequency: NormalizedScore;
  currentFrequency: NormalizedScore;
  changeReason?: string;
}

export interface ToolChainChange {
  previousChain: string[];
  newChain: string[];
  frequency: NormalizedScore;
}

export interface MutationRootCause {
  identified: boolean;
  confidence: NormalizedScore;
  causes: RootCauseCandidate[];
}

export interface RootCauseCandidate {
  type: 'prompt-change' | 'model-update' | 'data-drift' | 'attack' | 'degradation' | 'unknown';
  description: string;
  probability: NormalizedScore;
  evidence: string[];
}

export interface MutationRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: 'investigate' | 'rollback' | 'retrain' | 'update-profile' | 'monitor';
  description: string;
  rationale: string;
}

// ============================================================================
// Execution Analysis Types
// ============================================================================

/**
 * Chain Execution - single execution of the chain
 */
export interface ChainExecution {
  id: UUID;
  chainId: UUID;
  timestamp: ISO8601;

  /** Input */
  input: ExecutionInput;
  /** Output */
  output: ExecutionOutput;
  /** Execution trace */
  trace: ExecutionTrace;

  /** DNA comparison */
  dnaComparison?: DNAComparison;
  /** Anomaly flags */
  anomalyFlags: AnomalyFlag[];
}

export interface ExecutionInput {
  prompt: string;
  variables: Record<string, unknown>;
  context?: JSONObject;
  userId?: string;
  sessionId?: string;
}

export interface ExecutionOutput {
  response: string;
  tokens: number;
  latencyMs: number;
  modelUsed: string;
  finishReason: string;
}

export interface ExecutionTrace {
  steps: TraceStep[];
  toolCalls: ToolCall[];
  totalDurationMs: number;
}

export interface TraceStep {
  index: number;
  type: 'llm-call' | 'tool-call' | 'processing' | 'decision';
  startTime: ISO8601;
  endTime: ISO8601;
  input?: JSONObject;
  output?: JSONObject;
  error?: string;
}

export interface ToolCall {
  toolId: string;
  input: JSONObject;
  output?: JSONObject;
  latencyMs: number;
  success: boolean;
  error?: string;
}

/**
 * DNA Comparison - compare execution to profile
 */
export interface DNAComparison {
  profileId: UUID;
  overallSimilarity: NormalizedScore;
  semanticSimilarity: NormalizedScore;
  behavioralSimilarity: NormalizedScore;
  outputSimilarity: NormalizedScore;
  deviations: Deviation[];
  withinNormalRange: boolean;
}

export interface Deviation {
  dimension: string;
  expected: number;
  actual: number;
  zscore: number;
  significant: boolean;
}

/**
 * Anomaly Flag - detected anomalous behavior
 */
export interface AnomalyFlag {
  type: AnomalyType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  evidence: string[];
  confidence: NormalizedScore;
}

export type AnomalyType =
  | 'semantic-anomaly'
  | 'behavioral-anomaly'
  | 'output-anomaly'
  | 'tool-anomaly'
  | 'performance-anomaly'
  | 'security-anomaly';

// ============================================================================
// Monitoring Types
// ============================================================================

/**
 * DNA Monitoring Configuration
 */
export interface DNAMonitoringConfig {
  id: UUID;
  chainId: UUID;
  enabled: boolean;

  /** Sampling configuration */
  sampling: SamplingConfig;
  /** Alert configuration */
  alerting: AlertConfig;
  /** Dashboard configuration */
  dashboard: DashboardConfig;

  /** Update schedule */
  profileUpdateSchedule: string;  // cron expression
}

export interface SamplingConfig {
  rate: number;  // 0-1
  strategy: 'random' | 'stratified' | 'error-biased';
  maxSamplesPerHour: number;
}

export interface AlertConfig {
  enabled: boolean;
  channels: string[];
  thresholds: AlertThreshold[];
  cooldownMinutes: number;
}

export interface AlertThreshold {
  metric: string;
  operator: 'gt' | 'lt' | 'eq';
  value: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface DashboardConfig {
  refreshIntervalSeconds: number;
  displayedMetrics: string[];
  historicalWindowHours: number;
}

/**
 * DNA Dashboard Data
 */
export interface DNADashboardData {
  profileId: UUID;
  generatedAt: ISO8601;

  /** Current health */
  currentHealth: ProfileHealth;
  /** Recent mutations */
  recentMutations: MutationReport[];
  /** Trend data */
  trends: DNATrend[];
  /** Anomaly summary */
  anomalySummary: AnomalySummary;

  /** Comparison with baseline */
  baselineComparison: BaselineComparisonData;
}

export interface DNATrend {
  metric: string;
  dataPoints: { timestamp: ISO8601; value: number }[];
  trend: TrendIndicator;
  forecast?: { timestamp: ISO8601; value: number }[];
}

export interface AnomalySummary {
  last24Hours: number;
  last7Days: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  topAnomalies: AnomalyFlag[];
}

export interface BaselineComparisonData {
  overallSimilarity: NormalizedScore;
  byDimension: Record<string, NormalizedScore>;
  driftVector: number[];
  recommendation: string;
}
