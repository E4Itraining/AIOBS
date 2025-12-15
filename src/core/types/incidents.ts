/**
 * Incident Management Type Definitions
 * AI-specific incident detection, response, and resolution
 */

import {
  ISO8601,
  UUID,
  NormalizedScore,
  ResourceIdentifier,
  ActorIdentity,
  TimeWindow,
  JSONObject,
} from './common';
import { RootCauseAnalysis, CausalChain } from './causal';
import { AISLODefinition, SLIValue } from './slo';

// ============================================================================
// Incident Definition
// ============================================================================

/** AI system incident */
export interface AIIncident {
  id: UUID;
  title: string;
  description: string;

  // Classification
  classification: IncidentClassification;

  // Lifecycle
  status: IncidentStatus;
  priority: IncidentPriority;
  severity: IncidentSeverity;

  // Timing
  detectedAt: ISO8601;
  acknowledgedAt?: ISO8601;
  resolvedAt?: ISO8601;
  closedAt?: ISO8601;

  // Duration
  timeToAcknowledge?: number;
  timeToResolve?: number;
  totalDuration?: number;

  // Affected resources
  affectedResources: AffectedResource[];

  // Impact
  impact: IncidentImpact;

  // SLO correlation
  sloImpact?: SLOImpact;

  // Root cause
  rootCauseAnalysis?: RootCauseAnalysis;

  // Response
  response: IncidentResponse;

  // Post-incident
  postmortem?: PostMortem;

  // Metadata
  labels: Record<string, string>;
  externalIds?: ExternalReference[];
  createdBy: ActorIdentity;
}

export interface IncidentClassification {
  type: AIIncidentType;
  category: IncidentCategory;
  aiSpecific: boolean;
  tags: string[];
}

export type AIIncidentType =
  | 'model_degradation'
  | 'model_failure'
  | 'drift_detected'
  | 'hallucination_spike'
  | 'data_quality'
  | 'data_pipeline_failure'
  | 'latency_spike'
  | 'availability_drop'
  | 'security_breach'
  | 'cost_anomaly'
  | 'energy_anomaly'
  | 'compliance_violation'
  | 'slo_breach'
  | 'infrastructure_failure'
  | 'dependency_failure';

export type IncidentCategory =
  | 'availability'
  | 'performance'
  | 'quality'
  | 'security'
  | 'compliance'
  | 'cost'
  | 'sustainability';

export type IncidentStatus =
  | 'detected'
  | 'acknowledged'
  | 'investigating'
  | 'identified'
  | 'mitigating'
  | 'resolved'
  | 'closed';

export type IncidentPriority = 'p1' | 'p2' | 'p3' | 'p4';

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AffectedResource {
  resource: ResourceIdentifier;
  impactType: string;
  impactSeverity: IncidentSeverity;
  recoveryStatus: 'unaffected' | 'degraded' | 'unavailable' | 'recovered';
}

export interface ExternalReference {
  system: string;
  id: string;
  url?: string;
}

// ============================================================================
// Incident Impact
// ============================================================================

export interface IncidentImpact {
  // User impact
  userImpact: UserImpact;

  // Business impact
  businessImpact: BusinessImpact;

  // Technical impact
  technicalImpact: TechnicalImpact;

  // Overall score
  overallScore: NormalizedScore;
}

export interface UserImpact {
  usersAffected: number;
  usersTotal: number;
  affectedPercent: NormalizedScore;
  impactDescription: string;
  customerSegments?: string[];
}

export interface BusinessImpact {
  revenueImpact?: number;
  currency?: string;
  transactionsAffected?: number;
  reputationRisk: 'critical' | 'high' | 'medium' | 'low' | 'none';
  slaImpact: boolean;
  contractualImplications?: string[];
}

export interface TechnicalImpact {
  servicesAffected: number;
  modelsAffected: number;
  dataIntegrityImpact: 'compromised' | 'degraded' | 'intact';
  recoveryComplexity: 'simple' | 'moderate' | 'complex';
  cascadeRisk: NormalizedScore;
}

// ============================================================================
// SLO Impact
// ============================================================================

export interface SLOImpact {
  affectedSLOs: AffectedSLO[];
  errorBudgetConsumed: number;
  worstSLIBreach: SLIBreach;
}

export interface AffectedSLO {
  sloId: UUID;
  sloName: string;
  breached: boolean;
  impactDuration: number;
  errorBudgetImpact: NormalizedScore;
}

export interface SLIBreach {
  sliId: UUID;
  sliName: string;
  targetValue: number;
  actualValue: number;
  deviationPercent: number;
}

// ============================================================================
// Incident Response
// ============================================================================

export interface IncidentResponse {
  // Response team
  commander?: ActorIdentity;
  responders: Responder[];

  // Timeline
  timeline: ResponseTimelineEntry[];

  // Actions taken
  actions: ResponseAction[];

  // Communication
  communications: Communication[];

  // Runbook
  runbookId?: UUID;
  runbookSteps?: RunbookExecution;
}

export interface Responder {
  actor: ActorIdentity;
  role: ResponderRole;
  assignedAt: ISO8601;
  acknowledgedAt?: ISO8601;
}

export type ResponderRole =
  | 'commander'
  | 'communications'
  | 'subject_matter_expert'
  | 'operations'
  | 'customer_liaison';

export interface ResponseTimelineEntry {
  timestamp: ISO8601;
  type: TimelineEntryType;
  actor: ActorIdentity;
  description: string;
  metadata?: JSONObject;
}

export type TimelineEntryType =
  | 'detection'
  | 'acknowledgment'
  | 'assignment'
  | 'status_change'
  | 'action'
  | 'communication'
  | 'escalation'
  | 'resolution'
  | 'note';

export interface ResponseAction {
  id: UUID;
  timestamp: ISO8601;
  type: ActionType;
  description: string;
  actor: ActorIdentity;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  result?: string;
  automated: boolean;
}

export type ActionType =
  | 'investigation'
  | 'mitigation'
  | 'rollback'
  | 'scale'
  | 'restart'
  | 'failover'
  | 'configuration_change'
  | 'communication'
  | 'escalation'
  | 'other';

export interface Communication {
  id: UUID;
  timestamp: ISO8601;
  type: 'internal' | 'customer' | 'executive' | 'public';
  channel: string;
  subject: string;
  content: string;
  author: ActorIdentity;
  recipients?: string[];
}

// ============================================================================
// Runbook Execution
// ============================================================================

export interface RunbookExecution {
  runbookId: UUID;
  runbookName: string;
  startedAt: ISO8601;
  completedAt?: ISO8601;
  status: 'in_progress' | 'completed' | 'aborted' | 'failed';
  steps: RunbookStepExecution[];
}

export interface RunbookStepExecution {
  stepId: UUID;
  stepName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  startedAt?: ISO8601;
  completedAt?: ISO8601;
  executor?: ActorIdentity;
  notes?: string;
  automated: boolean;
}

// ============================================================================
// Incident Detection
// ============================================================================

/** Incident detection rule */
export interface DetectionRule {
  id: UUID;
  name: string;
  description: string;
  enabled: boolean;

  // Trigger conditions
  trigger: DetectionTrigger;

  // Incident template
  incidentTemplate: IncidentTemplate;

  // Deduplication
  deduplication: DeduplicationConfig;

  // Metadata
  createdAt: ISO8601;
  updatedAt: ISO8601;
  owner: ActorIdentity;
}

export interface DetectionTrigger {
  type: 'threshold' | 'anomaly' | 'pattern' | 'composite';

  // For threshold type
  metric?: string;
  threshold?: number;
  operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  duration?: TimeWindow;

  // For anomaly type
  anomalyConfig?: AnomalyConfig;

  // For pattern type
  pattern?: string;

  // For composite type
  conditions?: DetectionTrigger[];
  operator_logic?: 'and' | 'or';
}

export interface AnomalyConfig {
  algorithm: 'isolation_forest' | 'mad' | 'zscore' | 'dbscan' | 'lstm';
  sensitivity: NormalizedScore;
  trainingWindow: TimeWindow;
  minSamples: number;
}

export interface IncidentTemplate {
  titleTemplate: string;
  descriptionTemplate: string;
  type: AIIncidentType;
  category: IncidentCategory;
  defaultPriority: IncidentPriority;
  defaultSeverity: IncidentSeverity;
  labels: Record<string, string>;
  autoAssign?: ActorIdentity[];
}

export interface DeduplicationConfig {
  enabled: boolean;
  window: TimeWindow;
  keyFields: string[];
  maxMergeCount?: number;
}

/** Detected anomaly */
export interface DetectedAnomaly {
  id: UUID;
  timestamp: ISO8601;
  detectionRuleId: UUID;

  // Anomaly details
  type: AnomalyType;
  score: NormalizedScore;
  confidence: NormalizedScore;

  // Context
  metric: string;
  value: number;
  expectedValue: number;
  deviation: number;

  // Resource
  resource: ResourceIdentifier;

  // Status
  status: 'new' | 'confirmed' | 'false_positive' | 'escalated';
  incidentId?: UUID;
}

export type AnomalyType =
  | 'spike'
  | 'drop'
  | 'trend_change'
  | 'seasonality_deviation'
  | 'outlier'
  | 'pattern_break';

// ============================================================================
// Post-Mortem
// ============================================================================

export interface PostMortem {
  id: UUID;
  incidentId: UUID;
  createdAt: ISO8601;
  completedAt?: ISO8601;
  status: 'draft' | 'in_review' | 'approved' | 'published';

  // Summary
  summary: string;
  impactSummary: string;

  // Timeline
  timeline: PostMortemTimelineEntry[];

  // Analysis
  rootCauses: PostMortemRootCause[];
  contributingFactors: string[];
  whatWorked: string[];
  whatDidntWork: string[];

  // Actions
  actionItems: PostMortemAction[];

  // Lessons learned
  lessonsLearned: string[];

  // Review
  author: ActorIdentity;
  reviewers: ActorIdentity[];
  approvedBy?: ActorIdentity;
}

export interface PostMortemTimelineEntry {
  timestamp: ISO8601;
  event: string;
  details?: string;
}

export interface PostMortemRootCause {
  description: string;
  category: string;
  preventable: boolean;
  detectedBy: 'monitoring' | 'customer_report' | 'manual' | 'automated';
}

export interface PostMortemAction {
  id: UUID;
  description: string;
  type: 'prevention' | 'detection' | 'mitigation' | 'process';
  priority: 'critical' | 'high' | 'medium' | 'low';
  owner: ActorIdentity;
  dueDate: ISO8601;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completedAt?: ISO8601;
  linkedIssueUrl?: string;
}

// ============================================================================
// Incident Workflows
// ============================================================================

/** AI-specific incident workflow */
export interface IncidentWorkflow {
  id: UUID;
  name: string;
  description: string;
  incidentTypes: AIIncidentType[];

  // Workflow stages
  stages: WorkflowStage[];

  // Automation
  automation: WorkflowAutomation;

  // Escalation
  escalation: EscalationPolicy;

  // Metadata
  createdAt: ISO8601;
  updatedAt: ISO8601;
  enabled: boolean;
}

export interface WorkflowStage {
  id: UUID;
  name: string;
  description: string;
  order: number;

  // Entry conditions
  entryConditions: StageCondition[];

  // Required actions
  requiredActions: RequiredAction[];

  // Exit conditions
  exitConditions: StageCondition[];

  // Timeout
  timeout?: TimeWindow;
  timeoutAction?: 'escalate' | 'skip' | 'alert';
}

export interface StageCondition {
  type: 'status' | 'action_completed' | 'approval' | 'metric' | 'time_elapsed';
  parameters: JSONObject;
}

export interface RequiredAction {
  type: ActionType;
  description: string;
  mandatory: boolean;
  automated: boolean;
  automationConfig?: JSONObject;
}

export interface WorkflowAutomation {
  autoAcknowledge: boolean;
  autoAssign: boolean;
  autoRunbook: boolean;
  autoResolve: boolean;
  autoResolveConditions?: StageCondition[];
}

export interface EscalationPolicy {
  enabled: boolean;
  levels: EscalationLevel[];
}

export interface EscalationLevel {
  level: number;
  delay: TimeWindow;
  notifyActors: ActorIdentity[];
  notificationChannels: string[];
  repeatInterval?: TimeWindow;
}

// ============================================================================
// Resilience Scoring
// ============================================================================

/** AI system resilience score */
export interface ResilienceScore {
  resourceId: UUID;
  timestamp: ISO8601;

  // Overall score
  overallScore: NormalizedScore;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';

  // Component scores
  components: ResilienceComponent[];

  // Historical context
  trend: 'improving' | 'stable' | 'degrading';
  incidentFrequency: number;
  mttr: number;
  mtbf: number;

  // Recommendations
  recommendations: ResilienceRecommendation[];
}

export interface ResilienceComponent {
  name: string;
  score: NormalizedScore;
  weight: number;
  factors: ResilienceFactor[];
}

export interface ResilienceFactor {
  name: string;
  status: 'good' | 'warning' | 'critical';
  description: string;
  value?: number;
}

export interface ResilienceRecommendation {
  id: UUID;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  expectedImprovement: NormalizedScore;
  effort: 'low' | 'medium' | 'high';
  category: string;
}
