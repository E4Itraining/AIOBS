/**
 * Compliance Automation Engine Types
 *
 * Comprehensive type definitions for automated compliance checking,
 * AI Act compliance, regulatory tracking, and evidence generation.
 */

import { ISO8601, UUID, NormalizedScore, TrendIndicator } from './common';

// ============================================================================
// Regulatory Frameworks
// ============================================================================

/** Regulatory framework definition */
export interface RegulatoryFramework {
  id: UUID;
  code: string;
  name: string;
  version: string;
  jurisdiction: string[];
  effectiveDate: ISO8601;
  description: string;
  categories: FrameworkCategory[];
  requirements: Requirement[];
  riskClassification?: RiskClassificationScheme;
  metadata: FrameworkMetadata;
}

export interface FrameworkCategory {
  id: string;
  name: string;
  description: string;
  requirements: string[];
  weight: number;
}

export interface FrameworkMetadata {
  publisher: string;
  url?: string;
  lastUpdated: ISO8601;
  nextReview?: ISO8601;
  supersedes?: string;
  supersededBy?: string;
}

/** Individual compliance requirement */
export interface Requirement {
  id: UUID;
  code: string;
  frameworkId: UUID;
  category: string;
  title: string;
  description: string;
  level: 'mandatory' | 'recommended' | 'optional';
  applicability: ApplicabilityRule[];
  controls: Control[];
  evidence: EvidenceRequirement[];
  references?: string[];
  guidance?: string;
}

export interface ApplicabilityRule {
  type: 'risk-level' | 'model-type' | 'use-case' | 'data-type' | 'custom';
  condition: string;
  value: string | string[];
}

export interface Control {
  id: string;
  name: string;
  description: string;
  type: 'technical' | 'organizational' | 'procedural';
  automated: boolean;
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'annually' | 'event-driven';
  testProcedure?: string;
}

export interface EvidenceRequirement {
  type: EvidenceType;
  description: string;
  format?: string[];
  retention: number; // days
  automated: boolean;
}

export type EvidenceType =
  | 'documentation'
  | 'audit-log'
  | 'test-result'
  | 'screenshot'
  | 'report'
  | 'attestation'
  | 'metric'
  | 'configuration';

// ============================================================================
// AI Act Specific Types
// ============================================================================

/** AI Act risk classification */
export interface AIActClassification {
  id: UUID;
  systemId: UUID;
  timestamp: ISO8601;
  riskLevel: AIActRiskLevel;
  confidence: NormalizedScore;
  factors: ClassificationFactor[];
  prohibitedChecks: ProhibitedUseCheck[];
  requirements: AIActRequirement[];
  assessor: string;
  validated: boolean;
  validatedBy?: string;
  validatedAt?: ISO8601;
}

export type AIActRiskLevel =
  | 'unacceptable'
  | 'high'
  | 'limited'
  | 'minimal';

export interface ClassificationFactor {
  factor: string;
  impact: 'increases' | 'decreases' | 'neutral';
  weight: number;
  evidence: string;
  score: NormalizedScore;
}

export interface ProhibitedUseCheck {
  category: ProhibitedCategory;
  applicable: boolean;
  confidence: NormalizedScore;
  evidence?: string;
  exception?: string;
}

export type ProhibitedCategory =
  | 'subliminal-manipulation'
  | 'exploitation-vulnerable'
  | 'social-scoring'
  | 'real-time-biometric-public'
  | 'predictive-policing'
  | 'emotion-recognition-workplace'
  | 'biometric-categorization';

export interface AIActRequirement {
  article: string;
  title: string;
  description: string;
  applicableRiskLevels: AIActRiskLevel[];
  status: 'compliant' | 'partial' | 'non-compliant' | 'not-assessed';
  dueDate?: ISO8601;
  evidence?: string[];
}

/** Risk classification scheme */
export interface RiskClassificationScheme {
  levels: RiskLevel[];
  criteria: ClassificationCriteria[];
  defaultLevel: string;
}

export interface RiskLevel {
  id: string;
  name: string;
  description: string;
  requirements: string[];
  color: string;
}

export interface ClassificationCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  thresholds: CriteriaThreshold[];
}

export interface CriteriaThreshold {
  riskLevel: string;
  minScore?: number;
  maxScore?: number;
  conditions?: string[];
}

// ============================================================================
// Compliance Assessment
// ============================================================================

/** Compliance assessment result */
export interface ComplianceAssessment {
  id: UUID;
  resourceId: UUID;
  resourceType: 'model' | 'pipeline' | 'endpoint' | 'dataset' | 'system';
  framework: string;
  timestamp: ISO8601;
  status: ComplianceStatus;
  score: NormalizedScore;
  findings: ComplianceFinding[];
  gaps: ComplianceGap[];
  recommendations: ComplianceRecommendation[];
  evidence: CollectedEvidence[];
  nextAssessment?: ISO8601;
  assessor: AssessorInfo;
}

export type ComplianceStatus =
  | 'compliant'
  | 'partial'
  | 'non-compliant'
  | 'not-applicable'
  | 'pending';

export interface ComplianceFinding {
  id: UUID;
  requirementId: UUID;
  type: 'pass' | 'fail' | 'warning' | 'info';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  evidence?: string[];
  remediation?: string;
  dueDate?: ISO8601;
  status: 'open' | 'resolved' | 'accepted' | 'disputed';
}

export interface ComplianceGap {
  id: UUID;
  requirementId: UUID;
  requirement: string;
  currentState: string;
  targetState: string;
  gapDescription: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  remediation: RemediationPlan;
}

export interface RemediationPlan {
  steps: RemediationStep[];
  estimatedEffort: number; // hours
  priority: 'critical' | 'high' | 'medium' | 'low';
  owner?: string;
  dueDate?: ISO8601;
}

export interface RemediationStep {
  order: number;
  action: string;
  description: string;
  responsible?: string;
  estimatedHours: number;
  dependencies?: number[];
}

export interface ComplianceRecommendation {
  id: UUID;
  type: 'improvement' | 'best-practice' | 'optimization';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  relatedRequirements: string[];
}

export interface CollectedEvidence {
  id: UUID;
  type: EvidenceType;
  requirementId: UUID;
  title: string;
  description: string;
  content?: string;
  url?: string;
  hash?: string;
  collectedAt: ISO8601;
  expiresAt?: ISO8601;
  automated: boolean;
}

export interface AssessorInfo {
  type: 'system' | 'user' | 'external';
  id: string;
  name: string;
  certification?: string;
}

// ============================================================================
// Automated Compliance Checks
// ============================================================================

/** Automated compliance check definition */
export interface AutomatedCheck {
  id: UUID;
  name: string;
  description: string;
  framework: string;
  requirements: string[];
  type: CheckType;
  schedule: CheckSchedule;
  config: CheckConfig;
  enabled: boolean;
  lastRun?: ISO8601;
  nextRun?: ISO8601;
}

export type CheckType =
  | 'data-quality'
  | 'model-performance'
  | 'security-scan'
  | 'bias-detection'
  | 'documentation'
  | 'access-control'
  | 'audit-log'
  | 'configuration'
  | 'custom';

export interface CheckSchedule {
  type: 'cron' | 'interval' | 'event-driven' | 'manual';
  expression?: string;
  interval?: number;
  events?: string[];
}

export interface CheckConfig {
  thresholds?: Record<string, number>;
  parameters?: Record<string, unknown>;
  notifications?: NotificationConfig;
  autoRemediate?: boolean;
}

export interface NotificationConfig {
  onPass: boolean;
  onFail: boolean;
  channels: string[];
  escalation?: EscalationConfig;
}

export interface EscalationConfig {
  afterMinutes: number;
  channels: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/** Check execution result */
export interface CheckResult {
  id: UUID;
  checkId: UUID;
  timestamp: ISO8601;
  status: 'passed' | 'failed' | 'warning' | 'error' | 'skipped';
  score?: NormalizedScore;
  findings: CheckFinding[];
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface CheckFinding {
  type: 'pass' | 'fail' | 'warning' | 'info';
  requirement: string;
  message: string;
  evidence?: string;
  suggestedFix?: string;
}

// ============================================================================
// Evidence Generation
// ============================================================================

/** Evidence generation request */
export interface EvidenceGenerationRequest {
  id: UUID;
  type: 'audit' | 'certification' | 'incident' | 'periodic';
  framework: string;
  requirements: string[];
  resourceIds: UUID[];
  period: { start: ISO8601; end: ISO8601 };
  format: 'pdf' | 'json' | 'html' | 'zip';
  includeRawData: boolean;
  recipient?: string;
}

/** Generated evidence package */
export interface EvidencePackage {
  id: UUID;
  requestId: UUID;
  generatedAt: ISO8601;
  expiresAt: ISO8601;
  framework: string;
  period: { start: ISO8601; end: ISO8601 };
  summary: EvidenceSummary;
  sections: EvidenceSection[];
  attachments: EvidenceAttachment[];
  signature?: PackageSignature;
  downloadUrl?: string;
}

export interface EvidenceSummary {
  overallCompliance: ComplianceStatus;
  score: NormalizedScore;
  totalRequirements: number;
  compliantRequirements: number;
  partialRequirements: number;
  nonCompliantRequirements: number;
  criticalFindings: number;
}

export interface EvidenceSection {
  id: string;
  title: string;
  requirement: string;
  status: ComplianceStatus;
  narrative: string;
  evidence: SectionEvidence[];
  screenshots?: string[];
}

export interface SectionEvidence {
  type: EvidenceType;
  title: string;
  description: string;
  value?: string | number;
  timestamp: ISO8601;
  source: string;
}

export interface EvidenceAttachment {
  id: UUID;
  name: string;
  type: string;
  size: number;
  hash: string;
  url?: string;
}

export interface PackageSignature {
  algorithm: string;
  signer: string;
  timestamp: ISO8601;
  signature: string;
  verified: boolean;
}

// ============================================================================
// Regulatory Change Tracking
// ============================================================================

/** Regulatory change notification */
export interface RegulatoryChange {
  id: UUID;
  framework: string;
  type: ChangeType;
  severity: 'breaking' | 'significant' | 'minor' | 'informational';
  title: string;
  description: string;
  effectiveDate: ISO8601;
  publishedDate: ISO8601;
  source: string;
  sourceUrl?: string;
  affectedRequirements: string[];
  impactAssessment?: ImpactAssessment;
  status: 'pending' | 'reviewed' | 'implemented' | 'not-applicable';
}

export type ChangeType =
  | 'new-requirement'
  | 'modified-requirement'
  | 'removed-requirement'
  | 'clarification'
  | 'deadline-change'
  | 'enforcement-action';

export interface ImpactAssessment {
  affectedResources: UUID[];
  currentCompliance: ComplianceStatus;
  projectedCompliance: ComplianceStatus;
  effortToComply: 'low' | 'medium' | 'high';
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendedActions: string[];
}

// ============================================================================
// Compliance Dashboard & Analytics
// ============================================================================

/** Compliance analytics dashboard data */
export interface ComplianceAnalytics {
  timestamp: ISO8601;
  overview: ComplianceOverview;
  byFramework: FrameworkCompliance[];
  byResource: ResourceCompliance[];
  trends: ComplianceTrends;
  upcomingDeadlines: ComplianceDeadline[];
  recentChanges: RegulatoryChange[];
  riskHeatmap: RiskHeatmapData;
}

export interface ComplianceOverview {
  overallScore: NormalizedScore;
  totalFrameworks: number;
  compliantFrameworks: number;
  totalRequirements: number;
  compliantRequirements: number;
  partialRequirements: number;
  nonCompliantRequirements: number;
  openFindings: number;
  criticalFindings: number;
  trend: TrendIndicator;
}

export interface FrameworkCompliance {
  framework: string;
  version: string;
  status: ComplianceStatus;
  score: NormalizedScore;
  requirements: RequirementStats;
  lastAssessment: ISO8601;
  nextAssessment?: ISO8601;
  trend: TrendIndicator;
}

export interface RequirementStats {
  total: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  notAssessed: number;
}

export interface ResourceCompliance {
  resourceId: UUID;
  resourceName: string;
  resourceType: string;
  overallStatus: ComplianceStatus;
  overallScore: NormalizedScore;
  frameworks: FrameworkStatus[];
  criticalGaps: number;
  lastAssessment: ISO8601;
}

export interface FrameworkStatus {
  framework: string;
  status: ComplianceStatus;
  score: NormalizedScore;
}

export interface ComplianceTrends {
  scoreHistory: TrendPoint[];
  findingsHistory: TrendPoint[];
  remediationRate: TrendPoint[];
}

export interface TrendPoint {
  date: ISO8601;
  value: number;
}

export interface ComplianceDeadline {
  id: UUID;
  type: 'requirement' | 'certification' | 'audit' | 'remediation';
  title: string;
  description: string;
  dueDate: ISO8601;
  status: 'on-track' | 'at-risk' | 'overdue';
  responsible?: string;
  relatedResources: UUID[];
}

export interface RiskHeatmapData {
  categories: string[];
  frameworks: string[];
  data: HeatmapCell[][];
}

export interface HeatmapCell {
  value: NormalizedScore;
  status: ComplianceStatus;
  findings: number;
}

// ============================================================================
// Compliance Workflow
// ============================================================================

/** Compliance workflow definition */
export interface ComplianceWorkflow {
  id: UUID;
  name: string;
  description: string;
  type: 'assessment' | 'remediation' | 'audit' | 'certification';
  framework: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'automated' | 'manual' | 'approval';
  description: string;
  assignee?: string;
  timeout?: number;
  actions: WorkflowAction[];
  nextSteps: ConditionalNext[];
}

export interface WorkflowAction {
  type: 'check' | 'notify' | 'collect' | 'generate' | 'approve' | 'custom';
  config: Record<string, unknown>;
}

export interface ConditionalNext {
  condition: string;
  nextStep: string;
}

export interface WorkflowTrigger {
  type: 'schedule' | 'event' | 'manual';
  config: Record<string, unknown>;
}

/** Workflow execution instance */
export interface WorkflowExecution {
  id: UUID;
  workflowId: UUID;
  startedAt: ISO8601;
  completedAt?: ISO8601;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep: string;
  stepHistory: StepExecution[];
  context: Record<string, unknown>;
  result?: WorkflowResult;
}

export interface StepExecution {
  stepId: string;
  startedAt: ISO8601;
  completedAt?: ISO8601;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: Record<string, unknown>;
  error?: string;
}

export interface WorkflowResult {
  success: boolean;
  summary: string;
  outputs: Record<string, unknown>;
  artifacts: UUID[];
}
