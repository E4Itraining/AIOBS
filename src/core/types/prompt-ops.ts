/**
 * Prompt GitOps Types
 *
 * Git-like versioning, governance, and deployment for LLM prompts.
 * Enables enterprise-grade prompt management with approval workflows,
 * semantic diffing, and compliance gates.
 *
 * @module prompt-ops
 */

import {
  UUID,
  ISO8601,
  SHA256,
  NormalizedScore,
  JSONObject,
  TimeRange,
  ActorIdentity,
  SeverityScore,
} from './common';

// ============================================================================
// Core Prompt Types
// ============================================================================

/**
 * Prompt - a versioned prompt template
 */
export interface Prompt {
  id: UUID;
  name: string;
  description: string;
  namespace: string;

  /** Current production version */
  currentVersion: PromptVersion;
  /** All versions */
  versions: PromptVersion[];
  /** Version history summary */
  versionCount: number;

  /** Prompt metadata */
  metadata: PromptMetadata;
  /** Ownership and access */
  ownership: PromptOwnership;
  /** Deployment status */
  deploymentStatus: PromptDeploymentStatus;

  /** Associated model constraints */
  modelConstraints: ModelConstraint[];
  /** Compliance requirements */
  compliance: PromptComplianceConfig;

  createdAt: ISO8601;
  updatedAt: ISO8601;
}

/**
 * Prompt Version - immutable snapshot of a prompt
 */
export interface PromptVersion {
  id: UUID;
  promptId: UUID;
  version: string;  // Semantic versioning
  hash: SHA256;  // Content hash for integrity

  /** The actual prompt content */
  content: PromptContent;
  /** Variables/parameters */
  variables: PromptVariable[];
  /** Examples for few-shot */
  examples: PromptExample[];

  /** Change information */
  changeInfo: VersionChangeInfo;
  /** Quality metrics */
  qualityMetrics?: VersionQualityMetrics;
  /** Deployment info */
  deployment: VersionDeployment;

  createdAt: ISO8601;
  createdBy: ActorIdentity;
}

/**
 * Prompt Content - the actual template
 */
export interface PromptContent {
  /** System prompt/instruction */
  system?: string;
  /** User prompt template */
  user: string;
  /** Assistant prefill (if any) */
  assistantPrefill?: string;

  /** Format */
  format: 'text' | 'chat' | 'structured';
  /** Template engine used */
  templateEngine: 'none' | 'jinja2' | 'mustache' | 'handlebars';
  /** Character count */
  characterCount: number;
  /** Estimated token count */
  estimatedTokens: number;
}

/**
 * Prompt Variable - parameter in the template
 */
export interface PromptVariable {
  name: string;
  type: VariableType;
  description: string;
  required: boolean;
  defaultValue?: unknown;
  validation?: VariableValidation;
  sensitive: boolean;
}

export type VariableType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'date'
  | 'enum';

export interface VariableValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  enumValues?: string[];
  customValidator?: string;
}

/**
 * Prompt Example - few-shot example
 */
export interface PromptExample {
  id: UUID;
  input: Record<string, unknown>;
  expectedOutput: string;
  explanation?: string;
  category?: string;
}

export interface VersionChangeInfo {
  changeType: 'major' | 'minor' | 'patch';
  summary: string;
  details: string;
  linkedIssues?: string[];
  parentVersion?: string;
}

export interface VersionQualityMetrics {
  assessedAt: ISO8601;
  accuracyScore?: NormalizedScore;
  consistencyScore?: NormalizedScore;
  safetyScore?: NormalizedScore;
  biasScore?: NormalizedScore;
  evaluationDatasetId?: UUID;
  sampleSize?: number;
}

export interface VersionDeployment {
  status: 'draft' | 'review' | 'approved' | 'deployed' | 'deprecated' | 'archived';
  deployedAt?: ISO8601;
  deployedBy?: ActorIdentity;
  deployedEnvironments: DeployedEnvironment[];
  trafficPercentage?: number;
}

export interface DeployedEnvironment {
  environment: 'development' | 'staging' | 'production';
  deployedAt: ISO8601;
  status: 'active' | 'inactive' | 'canary';
  trafficPercentage: number;
}

// ============================================================================
// Metadata and Ownership Types
// ============================================================================

export interface PromptMetadata {
  tags: string[];
  category: string;
  useCase: string;
  language: string;
  domain?: string;
  riskLevel: 'low' | 'medium' | 'high';
  customFields: Record<string, unknown>;
}

export interface PromptOwnership {
  owner: ActorIdentity;
  team: string;
  reviewers: ActorIdentity[];
  approvers: ActorIdentity[];
  subscribers: string[];
}

export interface PromptDeploymentStatus {
  production: EnvironmentStatus;
  staging: EnvironmentStatus;
  development: EnvironmentStatus;
}

export interface EnvironmentStatus {
  deployed: boolean;
  version?: string;
  lastDeployed?: ISO8601;
  health: 'healthy' | 'degraded' | 'failing' | 'unknown';
}

export interface ModelConstraint {
  modelId?: string;
  modelFamily?: string;
  minVersion?: string;
  maxVersion?: string;
  excludeModels?: string[];
}

export interface PromptComplianceConfig {
  requiresReview: boolean;
  requiresApproval: boolean;
  approvalLevel: 'team' | 'manager' | 'compliance' | 'executive';
  piiScanRequired: boolean;
  biasScanRequired: boolean;
  securityScanRequired: boolean;
  retentionPolicy: string;
}

// ============================================================================
// Diff and Comparison Types
// ============================================================================

/**
 * Semantic Diff between prompt versions
 */
export interface PromptDiff {
  id: UUID;
  fromVersion: string;
  toVersion: string;
  generatedAt: ISO8601;

  /** Text-based diff */
  textDiff: TextDiff;
  /** Semantic analysis */
  semanticDiff: SemanticDiff;
  /** Impact analysis */
  impactAnalysis: DiffImpactAnalysis;

  /** Overall change magnitude */
  changeMagnitude: 'trivial' | 'minor' | 'moderate' | 'significant' | 'breaking';
  /** Requires review? */
  requiresReview: boolean;
}

export interface TextDiff {
  /** System prompt diff */
  systemDiff?: LineDiff[];
  /** User prompt diff */
  userDiff: LineDiff[];
  /** Variable changes */
  variableChanges: VariableChange[];
  /** Example changes */
  exampleChanges: ExampleChange[];

  /** Summary stats */
  linesAdded: number;
  linesRemoved: number;
  linesModified: number;
}

export interface LineDiff {
  lineNumber: number;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  oldContent?: string;
  newContent?: string;
  highlightedChanges?: ChangeHighlight[];
}

export interface ChangeHighlight {
  start: number;
  end: number;
  type: 'addition' | 'deletion' | 'modification';
}

export interface VariableChange {
  variableName: string;
  changeType: 'added' | 'removed' | 'modified';
  oldValue?: PromptVariable;
  newValue?: PromptVariable;
}

export interface ExampleChange {
  exampleId?: UUID;
  changeType: 'added' | 'removed' | 'modified';
  oldExample?: PromptExample;
  newExample?: PromptExample;
}

export interface SemanticDiff {
  /** Embedding similarity */
  embeddingSimilarity: NormalizedScore;
  /** Instruction changes */
  instructionChanges: InstructionChange[];
  /** Tone/style changes */
  toneChanges: ToneChange[];
  /** Constraint changes */
  constraintChanges: ConstraintChange[];
  /** Behavioral implications */
  behavioralImplications: BehavioralImplication[];
}

export interface InstructionChange {
  type: 'added' | 'removed' | 'modified' | 'reordered';
  description: string;
  impact: 'high' | 'medium' | 'low';
  oldInstruction?: string;
  newInstruction?: string;
}

export interface ToneChange {
  aspect: 'formality' | 'verbosity' | 'directness' | 'creativity' | 'safety';
  direction: 'increased' | 'decreased' | 'unchanged';
  magnitude: NormalizedScore;
}

export interface ConstraintChange {
  type: 'added' | 'removed' | 'relaxed' | 'tightened';
  constraint: string;
  impact: string;
}

export interface BehavioralImplication {
  area: string;
  description: string;
  confidence: NormalizedScore;
  riskLevel: 'high' | 'medium' | 'low';
}

export interface DiffImpactAnalysis {
  /** Expected output change */
  expectedOutputChange: NormalizedScore;
  /** Risk of regression */
  regressionRisk: SeverityScore;
  /** Backward compatibility */
  backwardCompatible: boolean;
  /** Breaking changes */
  breakingChanges: BreakingChange[];
  /** Recommendations */
  recommendations: DiffRecommendation[];
}

export interface BreakingChange {
  type: 'variable-removed' | 'variable-type-changed' | 'format-changed' | 'behavior-changed';
  description: string;
  affectedConsumers: string[];
  migrationPath?: string;
}

export interface DiffRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'review' | 'test' | 'documentation' | 'rollback-plan';
  description: string;
}

// ============================================================================
// Review and Approval Types
// ============================================================================

/**
 * Prompt Review Request (like a Pull Request)
 */
export interface PromptReviewRequest {
  id: UUID;
  promptId: UUID;
  title: string;
  description: string;

  /** Version being proposed */
  proposedVersion: PromptVersion;
  /** Base version */
  baseVersion: string;
  /** Diff */
  diff: PromptDiff;

  /** Author */
  author: ActorIdentity;
  /** Reviewers assigned */
  reviewers: ReviewerAssignment[];
  /** Current status */
  status: ReviewStatus;

  /** Reviews received */
  reviews: PromptReview[];
  /** Compliance checks */
  complianceChecks: ComplianceCheck[];
  /** Test results */
  testResults: PromptTestResult[];

  /** Timeline */
  createdAt: ISO8601;
  updatedAt: ISO8601;
  mergedAt?: ISO8601;
  closedAt?: ISO8601;
}

export type ReviewStatus =
  | 'draft'
  | 'pending-review'
  | 'changes-requested'
  | 'approved'
  | 'merged'
  | 'closed'
  | 'rejected';

export interface ReviewerAssignment {
  reviewer: ActorIdentity;
  assignedAt: ISO8601;
  required: boolean;
  reviewed: boolean;
  reviewedAt?: ISO8601;
}

export interface PromptReview {
  id: UUID;
  reviewer: ActorIdentity;
  status: 'approved' | 'changes-requested' | 'commented';
  comments: ReviewComment[];
  submittedAt: ISO8601;
}

export interface ReviewComment {
  id: UUID;
  author: ActorIdentity;
  content: string;
  lineReference?: LineReference;
  resolved: boolean;
  resolvedAt?: ISO8601;
  resolvedBy?: ActorIdentity;
  replies: ReviewComment[];
  createdAt: ISO8601;
}

export interface LineReference {
  section: 'system' | 'user' | 'assistant' | 'variable' | 'example';
  lineStart: number;
  lineEnd: number;
}

export interface ComplianceCheck {
  id: UUID;
  type: ComplianceCheckType;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  result?: ComplianceCheckResult;
  runAt?: ISO8601;
  required: boolean;
}

export type ComplianceCheckType =
  | 'pii-scan'
  | 'bias-detection'
  | 'security-scan'
  | 'toxicity-check'
  | 'prompt-injection-test'
  | 'output-validation'
  | 'custom';

export interface ComplianceCheckResult {
  passed: boolean;
  score?: NormalizedScore;
  findings: ComplianceFinding[];
  details: JSONObject;
}

export interface ComplianceFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  description: string;
  location?: string;
  recommendation: string;
}

export interface PromptTestResult {
  id: UUID;
  testSuiteId: UUID;
  testSuiteName: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  runAt?: ISO8601;
  results: TestCaseResult[];
  summary: TestSummary;
}

export interface TestCaseResult {
  testCaseId: UUID;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  input: Record<string, unknown>;
  expectedOutput?: string;
  actualOutput?: string;
  similarity?: NormalizedScore;
  latencyMs?: number;
  error?: string;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: NormalizedScore;
  averageLatencyMs: number;
}

// ============================================================================
// Deployment Types
// ============================================================================

/**
 * Prompt Deployment Configuration
 */
export interface PromptDeployment {
  id: UUID;
  promptId: UUID;
  versionId: UUID;
  environment: 'development' | 'staging' | 'production';

  /** Deployment strategy */
  strategy: DeploymentStrategy;
  /** Current status */
  status: DeploymentStatus;
  /** Traffic allocation */
  trafficAllocation: TrafficAllocation;

  /** Rollout progress */
  rolloutProgress: RolloutProgress;
  /** Health metrics */
  healthMetrics: DeploymentHealthMetrics;

  /** Timestamps */
  createdAt: ISO8601;
  startedAt?: ISO8601;
  completedAt?: ISO8601;
  createdBy: ActorIdentity;
}

export interface DeploymentStrategy {
  type: 'immediate' | 'canary' | 'blue-green' | 'rolling';
  canaryConfig?: CanaryConfig;
  rollbackConfig: RollbackConfig;
}

export interface CanaryConfig {
  initialPercentage: number;
  incrementPercentage: number;
  incrementIntervalMinutes: number;
  successThreshold: NormalizedScore;
  evaluationMetrics: string[];
}

export interface RollbackConfig {
  automatic: boolean;
  triggers: RollbackTrigger[];
  notifyOnRollback: string[];
}

export interface RollbackTrigger {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  windowMinutes: number;
}

export type DeploymentStatus =
  | 'pending'
  | 'rolling-out'
  | 'paused'
  | 'completed'
  | 'rolling-back'
  | 'rolled-back'
  | 'failed';

export interface TrafficAllocation {
  newVersion: number;
  previousVersion: number;
  lastUpdated: ISO8601;
}

export interface RolloutProgress {
  currentPhase: number;
  totalPhases: number;
  currentPercentage: number;
  targetPercentage: number;
  requestsServed: number;
  errorsEncountered: number;
}

export interface DeploymentHealthMetrics {
  errorRate: NormalizedScore;
  latencyP50Ms: number;
  latencyP99Ms: number;
  userSatisfactionScore?: NormalizedScore;
  comparisonWithBaseline: MetricComparison[];
}

export interface MetricComparison {
  metric: string;
  baselineValue: number;
  currentValue: number;
  changePercentage: number;
  status: 'improved' | 'stable' | 'degraded';
}

// ============================================================================
// A/B Testing Types
// ============================================================================

/**
 * Prompt A/B Experiment
 */
export interface PromptExperiment {
  id: UUID;
  name: string;
  description: string;
  promptId: UUID;

  /** Variants being tested */
  variants: ExperimentVariant[];
  /** Experiment configuration */
  config: ExperimentConfig;
  /** Current status */
  status: ExperimentStatus;

  /** Results */
  results?: ExperimentResults;
  /** Winner (if determined) */
  winner?: string;
  winnerReason?: string;

  /** Timestamps */
  createdAt: ISO8601;
  startedAt?: ISO8601;
  endedAt?: ISO8601;
  createdBy: ActorIdentity;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  versionId: UUID;
  trafficPercentage: number;
  isControl: boolean;
}

export interface ExperimentConfig {
  /** Minimum sample size per variant */
  minSampleSize: number;
  /** Maximum duration */
  maxDurationDays: number;
  /** Statistical significance threshold */
  significanceLevel: number;  // e.g., 0.05
  /** Primary metric */
  primaryMetric: string;
  /** Secondary metrics */
  secondaryMetrics: string[];
  /** User segmentation */
  userSegment?: UserSegment;
}

export interface UserSegment {
  type: 'all' | 'percentage' | 'attribute';
  percentage?: number;
  attributeFilter?: Record<string, unknown>;
}

export type ExperimentStatus =
  | 'draft'
  | 'scheduled'
  | 'running'
  | 'paused'
  | 'analyzing'
  | 'completed'
  | 'stopped';

export interface ExperimentResults {
  generatedAt: ISO8601;
  totalSamples: number;
  variantResults: VariantResult[];
  statisticalAnalysis: StatisticalAnalysis;
  recommendation: ExperimentRecommendation;
}

export interface VariantResult {
  variantId: string;
  sampleSize: number;
  metrics: Record<string, MetricResult>;
}

export interface MetricResult {
  value: number;
  standardError: number;
  confidenceInterval: { lower: number; upper: number };
}

export interface StatisticalAnalysis {
  primaryMetricSignificant: boolean;
  pValue: number;
  effectSize: number;
  confidenceLevel: number;
  powerAnalysis: PowerAnalysis;
}

export interface PowerAnalysis {
  currentPower: number;
  recommendedSampleSize: number;
  estimatedDaysRemaining?: number;
}

export interface ExperimentRecommendation {
  action: 'continue' | 'stop-winner' | 'stop-no-winner' | 'increase-sample';
  confidence: NormalizedScore;
  reasoning: string;
  suggestedWinner?: string;
}

// ============================================================================
// Registry Types
// ============================================================================

/**
 * Prompt Registry - central catalog of prompts
 */
export interface PromptRegistry {
  id: UUID;
  name: string;
  description: string;

  /** Prompts in this registry */
  prompts: PromptRegistryEntry[];
  /** Categories */
  categories: RegistryCategory[];
  /** Access control */
  accessControl: RegistryAccessControl;

  /** Statistics */
  statistics: RegistryStatistics;
}

export interface PromptRegistryEntry {
  promptId: UUID;
  name: string;
  namespace: string;
  category: string;
  currentVersion: string;
  deploymentStatus: PromptDeploymentStatus;
  qualityScore?: NormalizedScore;
  usageCount: number;
  lastUsed?: ISO8601;
}

export interface RegistryCategory {
  name: string;
  description: string;
  promptCount: number;
  subcategories?: RegistryCategory[];
}

export interface RegistryAccessControl {
  public: boolean;
  allowedTeams: string[];
  allowedUsers: string[];
  adminUsers: string[];
}

export interface RegistryStatistics {
  totalPrompts: number;
  activePrompts: number;
  totalVersions: number;
  totalDeployments: number;
  averageVersionsPerPrompt: number;
  mostUsedPrompts: { promptId: UUID; name: string; usageCount: number }[];
}

// ============================================================================
// Audit Types
// ============================================================================

/**
 * Prompt Audit Log Entry
 */
export interface PromptAuditEntry {
  id: UUID;
  timestamp: ISO8601;
  promptId: UUID;
  versionId?: UUID;

  /** Action performed */
  action: PromptAuditAction;
  /** Actor who performed the action */
  actor: ActorIdentity;

  /** Change details */
  details: JSONObject;
  /** Previous state (if applicable) */
  previousState?: JSONObject;
  /** New state (if applicable) */
  newState?: JSONObject;

  /** Request context */
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export type PromptAuditAction =
  | 'created'
  | 'version-created'
  | 'updated'
  | 'deleted'
  | 'review-requested'
  | 'reviewed'
  | 'approved'
  | 'rejected'
  | 'deployed'
  | 'rolled-back'
  | 'deprecated'
  | 'accessed'
  | 'exported'
  | 'experiment-started'
  | 'experiment-ended';

// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Prompt Usage Analytics
 */
export interface PromptAnalytics {
  promptId: UUID;
  period: TimeRange;
  generatedAt: ISO8601;

  /** Usage metrics */
  usage: UsageMetrics;
  /** Performance metrics */
  performance: PerformanceMetrics;
  /** Quality metrics */
  quality: QualityMetrics;
  /** Cost metrics */
  cost: CostMetrics;

  /** Version comparison */
  versionComparison?: VersionComparisonAnalytics;
  /** Trends */
  trends: AnalyticsTrend[];
}

export interface UsageMetrics {
  totalRequests: number;
  uniqueUsers: number;
  requestsPerDay: number[];
  peakUsageHour: number;
  topUseCases: { useCase: string; count: number }[];
}

export interface PerformanceMetrics {
  averageLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: NormalizedScore;
  timeoutRate: NormalizedScore;
  tokenUsage: TokenUsageMetrics;
}

export interface TokenUsageMetrics {
  averageInputTokens: number;
  averageOutputTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface QualityMetrics {
  userSatisfactionScore?: NormalizedScore;
  thumbsUpRate?: NormalizedScore;
  regenerationRate?: NormalizedScore;
  averageOutputQuality?: NormalizedScore;
}

export interface CostMetrics {
  totalCost: number;
  currency: string;
  costPerRequest: number;
  costByModel: Record<string, number>;
  projectedMonthlyCost: number;
}

export interface VersionComparisonAnalytics {
  versions: string[];
  metrics: Record<string, Record<string, number>>;
  bestPerformingVersion: string;
  recommendation: string;
}

export interface AnalyticsTrend {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
  significance: NormalizedScore;
}
