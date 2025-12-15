/**
 * Governance Type Definitions
 * Types for audit logging, compliance, and accountability
 */

import {
  ISO8601,
  UUID,
  SHA256,
  NormalizedScore,
  ActorIdentity,
  ResourceIdentifier,
  JSONValue,
  JSONObject,
} from './common';

// ============================================================================
// Audit Logging
// ============================================================================

/** Immutable audit log entry */
export interface AuditEntry {
  id: UUID;
  timestamp: ISO8601;
  sequenceNumber: number;

  // Who performed the action
  actor: ActorIdentity;

  // What action was performed
  action: AuditableAction;

  // What resource was affected
  resource: ResourceIdentifier;

  // Execution context
  context: ExecutionContext;

  // Outcome of the action
  outcome: ActionOutcome;

  // Chain integrity
  hash: SHA256;
  previousHash: SHA256;

  // Retention policy
  retentionPolicy: RetentionPolicy;
}

export interface AuditableAction {
  type: AuditActionType;
  category: AuditCategory;
  name: string;
  description: string;
  parameters?: JSONObject;
  sensitivityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
}

export type AuditActionType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'deploy'
  | 'invoke'
  | 'approve'
  | 'reject'
  | 'configure'
  | 'export'
  | 'grant_access'
  | 'revoke_access';

export type AuditCategory =
  | 'model'
  | 'data'
  | 'infrastructure'
  | 'security'
  | 'compliance'
  | 'governance'
  | 'user_management'
  | 'system';

export interface ExecutionContext {
  sessionId: UUID;
  requestId: UUID;
  traceId: string;

  // Location
  sourceIP?: string;
  userAgent?: string;
  region?: string;

  // Environment
  environment: 'development' | 'staging' | 'production';
  service: string;
  version: string;

  // Additional context
  metadata: JSONObject;
}

export interface ActionOutcome {
  status: 'success' | 'failure' | 'partial' | 'pending';
  statusCode?: number;
  message?: string;
  errorDetails?: ErrorDetails;

  // Changes made
  changes?: ChangeRecord[];

  // Duration
  durationMs: number;
}

export interface ErrorDetails {
  code: string;
  message: string;
  stackTrace?: string;
  context?: JSONObject;
}

export interface ChangeRecord {
  field: string;
  previousValue: JSONValue;
  newValue: JSONValue;
  changeType: 'added' | 'modified' | 'removed';
}

export interface RetentionPolicy {
  policyId: string;
  retentionDays: number;
  archiveAfterDays?: number;
  deleteAfterDays?: number;
  legalHold: boolean;
}

// ============================================================================
// Audit Trail
// ============================================================================

/** Audit trail for a specific resource */
export interface AuditTrail {
  resourceId: UUID;
  resourceType: string;

  entries: AuditEntry[];
  totalCount: number;

  // Trail metadata
  firstEntry: ISO8601;
  lastEntry: ISO8601;

  // Integrity verification
  integrityStatus: 'verified' | 'unverified' | 'tampered';
  lastVerified: ISO8601;
}

/** Audit query parameters */
export interface AuditQuery {
  // Time range
  startTime?: ISO8601;
  endTime?: ISO8601;

  // Filters
  actors?: string[];
  actions?: AuditActionType[];
  categories?: AuditCategory[];
  resources?: ResourceIdentifier[];
  outcomes?: ActionOutcome['status'][];

  // Search
  searchText?: string;

  // Pagination
  offset: number;
  limit: number;

  // Sorting
  sortBy: 'timestamp' | 'actor' | 'action' | 'resource';
  sortOrder: 'asc' | 'desc';
}

// ============================================================================
// Compliance Framework
// ============================================================================

/** Compliance framework definition */
export interface ComplianceFramework {
  id: UUID;
  name: string;
  version: string;
  description: string;

  // Framework type
  type: ComplianceFrameworkType;

  // Controls
  controls: ComplianceControl[];

  // Requirements mapping
  requirementsMappings: RequirementMapping[];

  // Metadata
  effectiveDate: ISO8601;
  lastUpdated: ISO8601;
  authority: string;
}

export type ComplianceFrameworkType =
  | 'ai_act'
  | 'gdpr'
  | 'hipaa'
  | 'sox'
  | 'iso27001'
  | 'nist_ai_rmf'
  | 'internal'
  | 'custom';

export interface ComplianceControl {
  id: UUID;
  frameworkId: UUID;
  controlId: string;
  name: string;
  description: string;

  // Control properties
  category: string;
  subcategory?: string;
  priority: 'required' | 'recommended' | 'optional';

  // Assessment
  assessmentCriteria: AssessmentCriterion[];

  // Evidence requirements
  evidenceRequirements: EvidenceRequirement[];

  // Related controls
  relatedControls: string[];
}

export interface AssessmentCriterion {
  id: UUID;
  description: string;
  measurementType: 'binary' | 'score' | 'count' | 'threshold';
  threshold?: number;
  weight: number;
}

export interface EvidenceRequirement {
  id: UUID;
  type: EvidenceType;
  description: string;
  mandatory: boolean;
  frequency: 'continuous' | 'periodic' | 'on_demand';
}

export type EvidenceType =
  | 'audit_log'
  | 'configuration'
  | 'metric'
  | 'test_result'
  | 'documentation'
  | 'certification'
  | 'attestation'
  | 'screenshot';

export interface RequirementMapping {
  controlId: UUID;
  externalRequirementId: string;
  externalFramework: string;
  mappingConfidence: NormalizedScore;
}

// ============================================================================
// Compliance Assessment
// ============================================================================

/** Compliance assessment result */
export interface ComplianceAssessment {
  id: UUID;
  frameworkId: UUID;
  timestamp: ISO8601;

  // Scope
  scope: AssessmentScope;

  // Results
  overallStatus: ComplianceStatus;
  overallScore: NormalizedScore;

  // Control assessments
  controlAssessments: ControlAssessment[];

  // Gaps and findings
  gaps: ComplianceGap[];
  findings: ComplianceFinding[];

  // Attestation
  attestation?: Attestation;

  // Next steps
  remediationPlan?: RemediationPlan;
}

export interface AssessmentScope {
  resources: ResourceIdentifier[];
  timeRange: {
    start: ISO8601;
    end: ISO8601;
  };
  assessmentType: 'full' | 'partial' | 'continuous' | 'spot_check';
}

export type ComplianceStatus =
  | 'compliant'
  | 'non_compliant'
  | 'partially_compliant'
  | 'not_assessed'
  | 'not_applicable';

export interface ControlAssessment {
  controlId: UUID;
  status: ComplianceStatus;
  score: NormalizedScore;

  // Evidence
  evidenceCollected: CollectedEvidence[];

  // Criterion results
  criterionResults: CriterionResult[];

  // Notes
  assessorNotes?: string;
  exceptions?: string[];
}

export interface CollectedEvidence {
  id: UUID;
  requirementId: UUID;
  type: EvidenceType;
  description: string;
  collectedAt: ISO8601;
  location: string;
  hash: SHA256;
  validUntil?: ISO8601;
}

export interface CriterionResult {
  criterionId: UUID;
  passed: boolean;
  value: JSONValue;
  notes?: string;
}

export interface ComplianceGap {
  id: UUID;
  controlId: UUID;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  riskExposure: string;
  remediationSuggestion: string;
}

export interface ComplianceFinding {
  id: UUID;
  type: 'observation' | 'recommendation' | 'non_conformity';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  evidence: string;
  affectedControls: UUID[];
  recommendation: string;
}

export interface Attestation {
  attestedBy: ActorIdentity;
  attestedAt: ISO8601;
  statement: string;
  signature: string;
  validUntil: ISO8601;
}

export interface RemediationPlan {
  id: UUID;
  createdAt: ISO8601;
  items: RemediationItem[];
  overallDeadline: ISO8601;
  owner: ActorIdentity;
}

export interface RemediationItem {
  id: UUID;
  gapId: UUID;
  description: string;
  assignee: ActorIdentity;
  deadline: ISO8601;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  completedAt?: ISO8601;
}

// ============================================================================
// Audit Pack (Exportable Compliance Evidence)
// ============================================================================

/** Exportable audit pack for regulators */
export interface AuditPack {
  id: UUID;
  name: string;
  description: string;
  createdAt: ISO8601;
  createdBy: ActorIdentity;

  // Pack contents
  framework: ComplianceFramework;
  assessment: ComplianceAssessment;
  auditTrail: AuditTrail;
  evidence: CollectedEvidence[];

  // Export metadata
  exportFormat: 'pdf' | 'json' | 'xml' | 'csv';
  exportedAt?: ISO8601;
  hash?: SHA256;

  // Verification
  signature?: string;
  verificationUrl?: string;
}

// ============================================================================
// AI Act Specific Types
// ============================================================================

/** AI Act risk classification */
export interface AIActClassification {
  systemId: UUID;
  timestamp: ISO8601;

  // Risk level
  riskLevel: AIActRiskLevel;
  riskCategory: string;

  // Classification basis
  classificationBasis: ClassificationBasis;

  // Requirements
  applicableRequirements: AIActRequirement[];

  // Compliance status
  complianceStatus: ComplianceStatus;
}

export type AIActRiskLevel =
  | 'unacceptable'
  | 'high'
  | 'limited'
  | 'minimal';

export interface ClassificationBasis {
  purposeDescription: string;
  userCategories: string[];
  dataCategories: string[];
  deploymentContext: string;
  autonomyLevel: 'full' | 'partial' | 'assisted';
  humanOversight: 'none' | 'limited' | 'full';
  assessmentNotes: string;
}

export interface AIActRequirement {
  articleReference: string;
  requirementDescription: string;
  mandatory: boolean;
  implementationStatus: ComplianceStatus;
  evidence: CollectedEvidence[];
}

// ============================================================================
// Accountability Chain
// ============================================================================

/** Accountability chain for decisions */
export interface AccountabilityChain {
  id: UUID;
  decisionId: UUID;
  timestamp: ISO8601;

  // Decision details
  decision: Decision;

  // Chain of responsibility
  responsibilityChain: ResponsibilityLink[];

  // Approvals
  approvals: Approval[];

  // Verification
  verified: boolean;
  verifiedAt?: ISO8601;
}

export interface Decision {
  type: 'model_deployment' | 'policy_change' | 'access_grant' | 'override' | 'exception';
  description: string;
  rationale: string;
  impactAssessment: string;
  alternatives: string[];
  selectedAlternative: string;
}

export interface ResponsibilityLink {
  actor: ActorIdentity;
  role: string;
  responsibility: string;
  delegatedFrom?: ActorIdentity;
  delegatedAt?: ISO8601;
}

export interface Approval {
  approver: ActorIdentity;
  role: string;
  decision: 'approved' | 'rejected' | 'conditional';
  conditions?: string[];
  timestamp: ISO8601;
  signature?: string;
}
