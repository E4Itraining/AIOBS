/**
 * Autonomous Root Cause Resolution (ARC) Types
 *
 * Types for self-healing AI systems that detect, diagnose, and resolve issues
 * automatically with human oversight.
 *
 * @module autonomous
 */

import {
  UUID,
  ISO8601,
  NormalizedScore,
  JSONObject,
  TimeRange,
  SeverityScore,
  ActorIdentity,
} from './common';

// ============================================================================
// Core ARC Types
// ============================================================================

/**
 * Autonomous Resolution Session
 * Tracks a complete detect-diagnose-decide-act-verify cycle
 */
export interface ARCSession {
  id: UUID;
  createdAt: ISO8601;
  updatedAt: ISO8601;

  /** Current status of the session */
  status: ARCSessionStatus;
  /** Type of issue being resolved */
  issueType: ARCIssueType;
  /** Severity of the issue */
  severity: SeverityScore;

  /** Detection phase */
  detection: DetectionPhase;
  /** Diagnosis phase */
  diagnosis: DiagnosisPhase;
  /** Decision phase */
  decision: DecisionPhase;
  /** Action phase */
  action: ActionPhase;
  /** Verification phase */
  verification: VerificationPhase;

  /** Human oversight interactions */
  humanInteractions: HumanInteraction[];
  /** Audit trail */
  auditTrail: ARCAuditEntry[];

  /** Related incidents */
  relatedIncidentIds: UUID[];
  /** Resolution time */
  resolutionTimeMs?: number;
}

export type ARCSessionStatus =
  | 'detecting'
  | 'diagnosing'
  | 'deciding'
  | 'awaiting-approval'
  | 'executing'
  | 'verifying'
  | 'resolved'
  | 'escalated'
  | 'failed'
  | 'cancelled';

export type ARCIssueType =
  | 'drift-detected'
  | 'performance-degradation'
  | 'reliability-drop'
  | 'hallucination-spike'
  | 'latency-increase'
  | 'error-rate-spike'
  | 'cost-anomaly'
  | 'slo-breach'
  | 'security-threat'
  | 'data-quality';

// ============================================================================
// Detection Phase Types
// ============================================================================

/**
 * Detection Phase - identifies the issue
 */
export interface DetectionPhase {
  detectedAt: ISO8601;
  detector: DetectorInfo;
  signals: DetectionSignal[];
  anomalyScore: NormalizedScore;
  triggeredRules: TriggeredRule[];
  context: DetectionContext;
}

export interface DetectorInfo {
  type: 'automated' | 'manual' | 'scheduled';
  name: string;
  version: string;
  confidence: NormalizedScore;
}

export interface DetectionSignal {
  id: UUID;
  metricName: string;
  currentValue: number;
  baselineValue: number;
  deviation: number;
  deviationType: 'above' | 'below' | 'volatile';
  duration: number;  // ms
  significance: NormalizedScore;
}

export interface TriggeredRule {
  ruleId: UUID;
  ruleName: string;
  condition: string;
  threshold: number;
  actualValue: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface DetectionContext {
  affectedModels: AffectedModel[];
  affectedEndpoints: string[];
  userImpactEstimate: UserImpactEstimate;
  businessImpactEstimate: BusinessImpactEstimate;
  recentChanges: RecentChange[];
}

export interface AffectedModel {
  modelId: UUID;
  modelName: string;
  impactLevel: 'severe' | 'moderate' | 'minor';
  affectedMetrics: string[];
}

export interface UserImpactEstimate {
  usersAffected: number;
  requestsAffected: number;
  impactType: 'degraded-experience' | 'errors' | 'unavailable' | 'incorrect-results';
}

export interface BusinessImpactEstimate {
  estimatedRevenueLoss: number;
  currency: string;
  sloRisk: SLORiskLevel;
  reputationRisk: 'high' | 'medium' | 'low';
}

export type SLORiskLevel = 'breach-imminent' | 'at-risk' | 'degraded' | 'healthy';

export interface RecentChange {
  type: 'deployment' | 'config-change' | 'data-update' | 'infrastructure' | 'external';
  description: string;
  timestamp: ISO8601;
  actor?: string;
  correlationScore: NormalizedScore;
}

// ============================================================================
// Diagnosis Phase Types
// ============================================================================

/**
 * Diagnosis Phase - identifies root cause
 */
export interface DiagnosisPhase {
  startedAt: ISO8601;
  completedAt?: ISO8601;
  status: 'running' | 'completed' | 'failed' | 'timeout';

  /** Root cause analysis */
  rootCauseAnalysis: RootCauseAnalysis;
  /** Contributing factors */
  contributingFactors: ContributingFactorAnalysis[];
  /** Differential diagnosis */
  differentialDiagnosis: DifferentialDiagnosis[];

  /** Data collected during diagnosis */
  collectedData: DiagnosticData[];
  /** Analysis methodology used */
  methodology: DiagnosticMethodology;
}

export interface RootCauseAnalysis {
  identified: boolean;
  confidence: NormalizedScore;
  rootCause?: RootCause;
  alternativeCauses: AlternativeCause[];
}

export interface RootCause {
  id: UUID;
  type: RootCauseType;
  description: string;
  evidence: Evidence[];
  causalChain: CausalChainStep[];
  affectedComponent: ComponentReference;
}

export type RootCauseType =
  | 'data-drift'
  | 'concept-drift'
  | 'model-degradation'
  | 'infrastructure-failure'
  | 'config-error'
  | 'dependency-failure'
  | 'resource-exhaustion'
  | 'external-change'
  | 'training-data-issue'
  | 'prompt-regression'
  | 'unknown';

export interface Evidence {
  type: 'metric' | 'log' | 'trace' | 'event' | 'comparison';
  description: string;
  data: JSONObject;
  weight: NormalizedScore;
}

export interface CausalChainStep {
  order: number;
  event: string;
  timestamp: ISO8601;
  component: string;
  evidence: string;
}

export interface ComponentReference {
  type: 'model' | 'pipeline' | 'service' | 'infrastructure' | 'data' | 'config';
  id: string;
  name: string;
}

export interface AlternativeCause {
  description: string;
  probability: NormalizedScore;
  ruledOutReason?: string;
}

export interface ContributingFactorAnalysis {
  factor: string;
  contribution: NormalizedScore;
  type: 'primary' | 'secondary' | 'environmental';
  actionable: boolean;
}

export interface DifferentialDiagnosis {
  hypothesis: string;
  probability: NormalizedScore;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  testsToConfirm: string[];
}

export interface DiagnosticData {
  type: string;
  source: string;
  collectedAt: ISO8601;
  summary: string;
  rawDataRef?: string;
}

export interface DiagnosticMethodology {
  algorithms: string[];
  dataWindowHours: number;
  samplingRate: number;
  confidenceThreshold: NormalizedScore;
}

// ============================================================================
// Decision Phase Types
// ============================================================================

/**
 * Decision Phase - determines remediation approach
 */
export interface DecisionPhase {
  startedAt: ISO8601;
  completedAt?: ISO8601;
  status: 'analyzing' | 'ready' | 'approved' | 'rejected' | 'modified';

  /** Available remediation options */
  options: RemediationOption[];
  /** Recommended option */
  recommendation: RemediationRecommendation;
  /** Risk assessment for each option */
  riskAssessment: OptionRiskAssessment[];

  /** Decision criteria used */
  decisionCriteria: DecisionCriteria;
  /** Approval requirements */
  approvalRequirements: ApprovalRequirement;
  /** Final decision */
  finalDecision?: FinalDecision;
}

export interface RemediationOption {
  id: UUID;
  name: string;
  type: RemediationType;
  description: string;
  actions: RemediationAction[];
  estimatedDurationMs: number;
  estimatedImpact: ImpactEstimate;
  prerequisites: Prerequisite[];
  rollbackPlan: RollbackPlan;
  automatable: boolean;
  requiresApproval: boolean;
}

export type RemediationType =
  | 'rollback'
  | 'retraining'
  | 'config-change'
  | 'scaling'
  | 'failover'
  | 'cache-clear'
  | 'restart'
  | 'data-fix'
  | 'prompt-update'
  | 'traffic-shift'
  | 'composite';

export interface RemediationAction {
  order: number;
  type: ActionType;
  target: ActionTarget;
  parameters: JSONObject;
  timeout: number;
  retryPolicy?: ActionRetryPolicy;
}

export type ActionType =
  | 'api-call'
  | 'script-execution'
  | 'kubernetes-operation'
  | 'database-operation'
  | 'config-update'
  | 'notification'
  | 'wait'
  | 'condition-check';

export interface ActionTarget {
  type: string;
  identifier: string;
  environment: 'production' | 'staging' | 'development';
}

export interface ActionRetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  retryableErrors: string[];
}

export interface ImpactEstimate {
  downtime: number;  // ms
  dataLoss: boolean;
  userDisruption: 'none' | 'minimal' | 'moderate' | 'significant';
  costEstimate: number;
  successProbability: NormalizedScore;
}

export interface Prerequisite {
  type: 'resource' | 'permission' | 'state' | 'time-window';
  description: string;
  satisfied: boolean;
  blocker: boolean;
}

export interface RollbackPlan {
  available: boolean;
  automatic: boolean;
  steps: RollbackStep[];
  estimatedDurationMs: number;
  dataRecoveryPossible: boolean;
}

export interface RollbackStep {
  order: number;
  description: string;
  action: RemediationAction;
}

export interface RemediationRecommendation {
  optionId: UUID;
  confidence: NormalizedScore;
  reasoning: string[];
  tradeoffs: Tradeoff[];
  alternativeRecommendations: UUID[];
}

export interface Tradeoff {
  aspect: string;
  benefit: string;
  cost: string;
}

export interface OptionRiskAssessment {
  optionId: UUID;
  overallRisk: SeverityScore;
  risks: RiskItem[];
  mitigations: RiskMitigation[];
}

export interface RiskItem {
  type: 'failure' | 'side-effect' | 'data-loss' | 'performance' | 'security';
  description: string;
  probability: NormalizedScore;
  impact: SeverityScore;
}

export interface RiskMitigation {
  riskType: string;
  mitigation: string;
  effectiveness: NormalizedScore;
}

export interface DecisionCriteria {
  prioritizeSpeed: boolean;
  tolerateRisk: 'low' | 'medium' | 'high';
  budgetConstraint?: number;
  timeConstraint?: number;
  customCriteria: Record<string, number>;
}

export interface ApprovalRequirement {
  required: boolean;
  level: 'none' | 'team-lead' | 'manager' | 'director' | 'executive';
  approvers: string[];
  timeoutMs: number;
  defaultOnTimeout: 'approve' | 'escalate' | 'reject';
}

export interface FinalDecision {
  selectedOptionId: UUID;
  decisionType: 'automatic' | 'human-approved' | 'human-modified';
  decidedAt: ISO8601;
  decidedBy: ActorIdentity;
  modifications?: DecisionModification[];
  justification: string;
}

export interface DecisionModification {
  field: string;
  originalValue: JSONObject;
  modifiedValue: JSONObject;
  reason: string;
}

// ============================================================================
// Action Phase Types
// ============================================================================

/**
 * Action Phase - executes remediation
 */
export interface ActionPhase {
  startedAt?: ISO8601;
  completedAt?: ISO8601;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled-back' | 'paused';

  /** Option being executed */
  executingOptionId: UUID;
  /** Action execution progress */
  progress: ActionProgress;
  /** Individual action results */
  actionResults: ActionResult[];

  /** Rollback triggered? */
  rollbackTriggered: boolean;
  /** Rollback result if triggered */
  rollbackResult?: RollbackResult;

  /** Execution logs */
  executionLogs: ExecutionLog[];
}

export interface ActionProgress {
  totalActions: number;
  completedActions: number;
  currentAction: number;
  currentActionName: string;
  estimatedRemainingMs: number;
  percentComplete: number;
}

export interface ActionResult {
  actionOrder: number;
  actionType: ActionType;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt?: ISO8601;
  completedAt?: ISO8601;
  output?: JSONObject;
  error?: ActionError;
  retryCount: number;
}

export interface ActionError {
  code: string;
  message: string;
  recoverable: boolean;
  details?: JSONObject;
}

export interface RollbackResult {
  triggered: boolean;
  reason: string;
  startedAt: ISO8601;
  completedAt?: ISO8601;
  status: 'running' | 'success' | 'partial' | 'failed';
  stepsCompleted: number;
  errors: ActionError[];
}

export interface ExecutionLog {
  timestamp: ISO8601;
  level: 'debug' | 'info' | 'warn' | 'error';
  action: string;
  message: string;
  data?: JSONObject;
}

// ============================================================================
// Verification Phase Types
// ============================================================================

/**
 * Verification Phase - confirms resolution
 */
export interface VerificationPhase {
  startedAt?: ISO8601;
  completedAt?: ISO8601;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'partial';

  /** Verification checks performed */
  checks: VerificationCheck[];
  /** Metrics comparison */
  metricsComparison: MetricsComparison;
  /** User impact verification */
  userImpactVerification: UserImpactVerification;

  /** Overall verification result */
  result: VerificationResult;
  /** Monitoring period after resolution */
  monitoringPeriod: MonitoringPeriod;
}

export interface VerificationCheck {
  id: UUID;
  name: string;
  type: 'metric-threshold' | 'functional-test' | 'integration-test' | 'manual';
  status: 'pending' | 'running' | 'passed' | 'failed';
  expected: JSONObject;
  actual?: JSONObject;
  error?: string;
}

export interface MetricsComparison {
  beforeRemediation: MetricSnapshot;
  afterRemediation: MetricSnapshot;
  improvement: MetricImprovement[];
}

export interface MetricSnapshot {
  timestamp: ISO8601;
  metrics: Record<string, number>;
}

export interface MetricImprovement {
  metricName: string;
  beforeValue: number;
  afterValue: number;
  changePercent: number;
  improved: boolean;
}

export interface UserImpactVerification {
  errorRateBefore: number;
  errorRateAfter: number;
  latencyP99Before: number;
  latencyP99After: number;
  userComplaintsBefore: number;
  userComplaintsAfter: number;
  verified: boolean;
}

export interface VerificationResult {
  success: boolean;
  confidence: NormalizedScore;
  issues: VerificationIssue[];
  recommendations: string[];
}

export interface VerificationIssue {
  severity: 'critical' | 'warning' | 'info';
  description: string;
  checkId: UUID;
  suggestedAction: string;
}

export interface MonitoringPeriod {
  startedAt: ISO8601;
  endAt: ISO8601;
  status: 'active' | 'completed' | 'cancelled';
  alertThreshold: NormalizedScore;
  checkInterval: number;
  checksPerformed: number;
  alertsRaised: number;
}

// ============================================================================
// Human Interaction Types
// ============================================================================

/**
 * Human Interaction during ARC session
 */
export interface HumanInteraction {
  id: UUID;
  timestamp: ISO8601;
  type: InteractionType;
  actor: ActorIdentity;
  phase: 'detection' | 'diagnosis' | 'decision' | 'action' | 'verification';
  action: string;
  input?: JSONObject;
  outcome: string;
}

export type InteractionType =
  | 'approval'
  | 'rejection'
  | 'modification'
  | 'escalation'
  | 'override'
  | 'pause'
  | 'resume'
  | 'cancel'
  | 'feedback';

// ============================================================================
// Audit Types
// ============================================================================

/**
 * ARC Audit Entry
 */
export interface ARCAuditEntry {
  id: UUID;
  timestamp: ISO8601;
  phase: string;
  action: string;
  actor: ActorIdentity;
  details: JSONObject;
  previousState?: JSONObject;
  newState?: JSONObject;
}

// ============================================================================
// Playbook Types
// ============================================================================

/**
 * ARC Playbook - predefined remediation scripts
 */
export interface ARCPlaybook {
  id: UUID;
  name: string;
  version: string;
  description: string;

  /** Trigger conditions */
  triggers: PlaybookTrigger[];
  /** Remediation steps */
  steps: PlaybookStep[];
  /** Rollback procedure */
  rollback: PlaybookRollback;

  /** Configuration */
  config: PlaybookConfig;
  /** Metadata */
  metadata: PlaybookMetadata;
}

export interface PlaybookTrigger {
  type: 'issue-type' | 'metric-condition' | 'pattern-match';
  condition: JSONObject;
  priority: number;
}

export interface PlaybookStep {
  id: string;
  name: string;
  type: ActionType;
  action: RemediationAction;
  conditions?: StepCondition[];
  onFailure: 'continue' | 'stop' | 'rollback' | 'escalate';
  onSuccess: 'continue' | 'skip-to' | 'complete';
  skipToStep?: string;
}

export interface StepCondition {
  type: 'metric' | 'state' | 'time' | 'custom';
  expression: string;
  action: 'execute' | 'skip';
}

export interface PlaybookRollback {
  automatic: boolean;
  triggerConditions: string[];
  steps: PlaybookStep[];
}

export interface PlaybookConfig {
  requiresApproval: boolean;
  approvalLevel: ApprovalRequirement['level'];
  maxRetries: number;
  timeoutMs: number;
  cooldownMs: number;
  enabled: boolean;
}

export interface PlaybookMetadata {
  createdAt: ISO8601;
  createdBy: string;
  updatedAt: ISO8601;
  updatedBy: string;
  usageCount: number;
  successRate: NormalizedScore;
  averageResolutionMs: number;
  tags: string[];
}

// ============================================================================
// Integration Types
// ============================================================================

/**
 * Integration with ML Platforms
 */
export interface MLPlatformIntegration {
  id: UUID;
  platform: MLPlatformType;
  name: string;
  status: 'active' | 'inactive' | 'error';

  /** Connection configuration */
  connection: MLPlatformConnection;
  /** Supported operations */
  capabilities: MLPlatformCapability[];
  /** Last sync status */
  lastSync?: SyncStatus;
}

export type MLPlatformType =
  | 'mlflow'
  | 'kubeflow'
  | 'vertex-ai'
  | 'sagemaker'
  | 'azure-ml'
  | 'databricks'
  | 'weights-biases'
  | 'custom';

export interface MLPlatformConnection {
  endpoint: string;
  authType: 'oauth2' | 'api-key' | 'service-account';
  credentials: string;  // Reference to secret
  namespace?: string;
}

export type MLPlatformCapability =
  | 'model-registry'
  | 'model-deployment'
  | 'model-rollback'
  | 'experiment-tracking'
  | 'pipeline-trigger'
  | 'metrics-query';

export interface SyncStatus {
  lastSyncAt: ISO8601;
  status: 'success' | 'partial' | 'failed';
  error?: string;
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * ARC Performance Statistics
 */
export interface ARCStatistics {
  period: TimeRange;
  generatedAt: ISO8601;

  /** Session counts */
  totalSessions: number;
  successfulResolutions: number;
  failedResolutions: number;
  escalatedSessions: number;

  /** Timing statistics */
  averageResolutionTimeMs: number;
  medianResolutionTimeMs: number;
  p95ResolutionTimeMs: number;

  /** Phase statistics */
  phaseStatistics: PhaseStatistics[];
  /** Issue type breakdown */
  issueTypeBreakdown: IssueTypeStatistic[];
  /** Playbook performance */
  playbookPerformance: PlaybookStatistic[];

  /** Human intervention stats */
  humanInterventionRate: NormalizedScore;
  approvalWaitTimeMs: number;
}

export interface PhaseStatistics {
  phase: string;
  averageDurationMs: number;
  successRate: NormalizedScore;
  bottleneckFrequency: number;
}

export interface IssueTypeStatistic {
  issueType: ARCIssueType;
  count: number;
  successRate: NormalizedScore;
  averageResolutionMs: number;
}

export interface PlaybookStatistic {
  playbookId: UUID;
  playbookName: string;
  usageCount: number;
  successRate: NormalizedScore;
  averageResolutionMs: number;
}
