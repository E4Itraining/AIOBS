/**
 * AI Software Bill of Materials (AI-SBOM) Types
 *
 * Comprehensive type definitions for AI supply chain security and transparency.
 * First-of-its-kind SBOM specifically designed for AI systems.
 *
 * @module sbom
 */

import {
  UUID,
  ISO8601,
  SHA256,
  NormalizedScore,
  JSONObject,
  TimeRange,
  SeverityScore,
} from './common';

// ============================================================================
// Core SBOM Types
// ============================================================================

/**
 * Complete AI Software Bill of Materials
 * Central document describing all AI components in a system
 */
export interface AISBOM {
  /** Unique identifier for this SBOM */
  id: UUID;
  /** SBOM specification version */
  specVersion: '1.0.0';
  /** When this SBOM was generated */
  generatedAt: ISO8601;
  /** Hash of the entire SBOM for integrity verification */
  documentHash: SHA256;

  /** Organization that created this SBOM */
  creator: SBOMCreator;
  /** The AI system this SBOM describes */
  subject: AISystemSubject;

  /** All models used in the system */
  models: ModelComponent[];
  /** All datasets used for training/fine-tuning */
  datasets: DatasetComponent[];
  /** Software dependencies (frameworks, libraries) */
  dependencies: SoftwareDependency[];
  /** Infrastructure components */
  infrastructure: InfrastructureComponent[];
  /** External API integrations */
  externalServices: ExternalServiceComponent[];

  /** Known vulnerabilities affecting components */
  vulnerabilities: AIVulnerability[];
  /** Compliance assessments */
  compliance: SBOMCompliance;
  /** Risk assessment summary */
  riskAssessment: SBOMRiskAssessment;

  /** Relationships between components */
  relationships: ComponentRelationship[];
  /** Audit trail of SBOM changes */
  auditLog: SBOMAuditEntry[];
}

/**
 * SBOM Creator Information
 */
export interface SBOMCreator {
  organization: string;
  tool: string;
  toolVersion: string;
  contact: string;
}

/**
 * Subject of the SBOM - the AI system being described
 */
export interface AISystemSubject {
  name: string;
  version: string;
  description: string;
  primaryFunction: AISystemFunction;
  riskLevel: AIRiskLevel;
  deployment: DeploymentInfo;
}

export type AISystemFunction =
  | 'classification'
  | 'generation'
  | 'recommendation'
  | 'prediction'
  | 'extraction'
  | 'translation'
  | 'summarization'
  | 'conversation'
  | 'agent'
  | 'multi-agent'
  | 'other';

export type AIRiskLevel = 'minimal' | 'limited' | 'high' | 'unacceptable';

export interface DeploymentInfo {
  environment: 'production' | 'staging' | 'development';
  regions: string[];
  endpoints: string[];
  lastDeployed: ISO8601;
}

// ============================================================================
// Model Components
// ============================================================================

/**
 * Model Component - describes a single AI model
 */
export interface ModelComponent {
  /** Unique identifier */
  id: UUID;
  /** Human-readable name */
  name: string;
  /** Model version/revision */
  version: string;
  /** Model type classification */
  type: ModelType;
  /** Model architecture */
  architecture: ModelArchitecture;

  /** Provider information */
  provider: ModelProvider;
  /** Licensing information */
  license: LicenseInfo;

  /** Training information (if known) */
  training?: TrainingInfo;
  /** Fine-tuning information (if applicable) */
  fineTuning?: FineTuningInfo;

  /** Model capabilities and limitations */
  capabilities: ModelCapabilities;
  /** Security assessment */
  security: ModelSecurityInfo;
  /** Data provenance */
  dataProvenance: DataProvenanceInfo;

  /** Model card URL if available */
  modelCardUrl?: string;
  /** Additional metadata */
  metadata: JSONObject;
}

export type ModelType =
  | 'foundation'
  | 'fine-tuned'
  | 'distilled'
  | 'quantized'
  | 'ensemble'
  | 'custom';

export interface ModelArchitecture {
  family: string;  // e.g., "transformer", "diffusion", "moe"
  variant: string;  // e.g., "decoder-only", "encoder-decoder"
  parameters?: number;
  contextLength?: number;
  modalities: Modality[];
}

export type Modality = 'text' | 'image' | 'audio' | 'video' | 'code' | 'structured';

export interface ModelProvider {
  name: string;  // e.g., "OpenAI", "Anthropic", "Internal"
  type: 'commercial' | 'open-source' | 'internal' | 'hybrid';
  apiEndpoint?: string;
  supportContact?: string;
}

export interface LicenseInfo {
  type: LicenseType;
  name: string;
  url?: string;
  commercialUse: boolean;
  modifications: boolean;
  distribution: boolean;
  restrictions: string[];
  expiresAt?: ISO8601;
}

export type LicenseType =
  | 'proprietary'
  | 'open-source'
  | 'research-only'
  | 'commercial'
  | 'custom';

export interface TrainingInfo {
  /** When training was completed */
  completedAt?: ISO8601;
  /** Training data cutoff */
  dataCutoff?: ISO8601;
  /** Training compute (if known) */
  computeUsed?: ComputeInfo;
  /** Training datasets referenced */
  datasetIds: UUID[];
  /** Training methodology */
  methodology?: string;
}

export interface ComputeInfo {
  gpuHours?: number;
  gpuType?: string;
  estimatedCO2kg?: number;
  provider?: string;
}

export interface FineTuningInfo {
  baseModelId: UUID;
  fineTunedAt: ISO8601;
  technique: FineTuningTechnique;
  datasetIds: UUID[];
  hyperparameters?: JSONObject;
  evaluationMetrics?: Record<string, number>;
}

export type FineTuningTechnique =
  | 'full'
  | 'lora'
  | 'qlora'
  | 'prefix-tuning'
  | 'prompt-tuning'
  | 'adapter'
  | 'rlhf'
  | 'dpo';

export interface ModelCapabilities {
  primaryUseCase: string;
  supportedLanguages: string[];
  maxInputTokens: number;
  maxOutputTokens: number;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  knownLimitations: string[];
}

export interface ModelSecurityInfo {
  /** Overall security risk score */
  riskScore: SeverityScore;
  /** Known vulnerabilities */
  vulnerabilityIds: string[];
  /** Security certifications */
  certifications: string[];
  /** Last security audit */
  lastAudit?: ISO8601;
  /** Guardrails implemented */
  guardrails: GuardrailInfo[];
}

export interface GuardrailInfo {
  type: 'content-filter' | 'rate-limit' | 'input-validation' | 'output-filter' | 'custom';
  name: string;
  description: string;
  enabled: boolean;
}

export interface DataProvenanceInfo {
  /** Is the training data known? */
  trainingDataKnown: boolean;
  /** Has PII been verified absent? */
  piiVerified: boolean;
  /** Consent status */
  consentStatus: ConsentStatus;
  /** Data sources (if known) */
  sources?: DataSource[];
  /** Geographic origin of data */
  dataOrigins?: string[];
}

export type ConsentStatus = 'verified' | 'unverified' | 'partial' | 'unknown' | 'not-applicable';

export interface DataSource {
  name: string;
  type: 'public' | 'proprietary' | 'synthetic' | 'user-generated' | 'scraped';
  url?: string;
  license?: string;
}

// ============================================================================
// Dataset Components
// ============================================================================

/**
 * Dataset Component - describes a dataset used in the AI system
 */
export interface DatasetComponent {
  id: UUID;
  name: string;
  version: string;
  description: string;

  /** Dataset type */
  type: DatasetType;
  /** Data format */
  format: string;
  /** Size information */
  size: DatasetSize;

  /** Schema/structure information */
  schema?: DatasetSchema;
  /** Quality metrics */
  quality: DatasetQuality;
  /** Privacy information */
  privacy: DatasetPrivacy;

  /** Source information */
  source: DatasetSource;
  /** Processing applied */
  processing: DatasetProcessing[];

  /** License */
  license: LicenseInfo;
  /** Last updated */
  updatedAt: ISO8601;
}

export type DatasetType =
  | 'training'
  | 'validation'
  | 'test'
  | 'fine-tuning'
  | 'evaluation'
  | 'rag-corpus'
  | 'few-shot-examples';

export interface DatasetSize {
  records: number;
  sizeBytes: number;
  tokens?: number;
}

export interface DatasetSchema {
  fields: SchemaField[];
  primaryKey?: string;
  version: string;
}

export interface SchemaField {
  name: string;
  type: string;
  description?: string;
  nullable: boolean;
  sensitive: boolean;
}

export interface DatasetQuality {
  completeness: NormalizedScore;
  accuracy: NormalizedScore;
  consistency: NormalizedScore;
  timeliness: NormalizedScore;
  biasAssessment?: BiasAssessment;
}

export interface BiasAssessment {
  assessedAt: ISO8601;
  methodology: string;
  findings: BiasFinding[];
  overallRisk: 'low' | 'medium' | 'high';
}

export interface BiasFinding {
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  mitigationApplied?: string;
}

export interface DatasetPrivacy {
  containsPII: boolean;
  piiTypes?: PIIType[];
  anonymizationApplied: boolean;
  anonymizationMethod?: string;
  dataResidency: string[];
  retentionPolicy?: string;
}

export type PIIType =
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'ssn'
  | 'financial'
  | 'health'
  | 'biometric'
  | 'location'
  | 'other';

export interface DatasetSource {
  type: 'internal' | 'external' | 'synthetic' | 'user-contributed';
  name: string;
  url?: string;
  collectionMethod?: string;
  collectedAt?: ISO8601;
}

export interface DatasetProcessing {
  step: string;
  description: string;
  appliedAt: ISO8601;
  toolUsed?: string;
  parameters?: JSONObject;
}

// ============================================================================
// Software Dependencies
// ============================================================================

/**
 * Software Dependency - ML frameworks, libraries, etc.
 */
export interface SoftwareDependency {
  id: UUID;
  name: string;
  version: string;
  type: DependencyType;

  /** Package manager */
  packageManager: 'pip' | 'npm' | 'conda' | 'cargo' | 'go' | 'other';
  /** Package URL (purl) */
  purl?: string;

  /** License */
  license: LicenseInfo;
  /** Known vulnerabilities */
  vulnerabilities: CVEReference[];

  /** Is this a direct or transitive dependency? */
  direct: boolean;
  /** Dependencies of this package */
  dependsOn: string[];

  /** Security info */
  securityInfo: DependencySecurityInfo;
}

export type DependencyType =
  | 'ml-framework'      // PyTorch, TensorFlow
  | 'llm-library'       // LangChain, LlamaIndex
  | 'data-processing'   // Pandas, NumPy
  | 'vector-db'         // Pinecone, Chroma
  | 'api-client'        // OpenAI SDK, Anthropic SDK
  | 'infrastructure'    // Ray, Kubernetes clients
  | 'utility'
  | 'other';

export interface CVEReference {
  cveId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  publishedAt: ISO8601;
  fixedIn?: string;
  exploitAvailable: boolean;
}

export interface DependencySecurityInfo {
  lastSecurityAudit?: ISO8601;
  maintainerVerified: boolean;
  supplyChainAttacks: number;
  typosquatRisk: boolean;
}

// ============================================================================
// Infrastructure Components
// ============================================================================

/**
 * Infrastructure Component - compute, storage, networking
 */
export interface InfrastructureComponent {
  id: UUID;
  name: string;
  type: InfrastructureType;

  provider: InfrastructureProvider;
  region: string;

  /** Configuration */
  configuration: InfrastructureConfig;
  /** Security posture */
  security: InfrastructureSecurity;
  /** Compliance certifications */
  certifications: string[];
}

export type InfrastructureType =
  | 'compute-gpu'
  | 'compute-cpu'
  | 'storage'
  | 'vector-database'
  | 'cache'
  | 'load-balancer'
  | 'api-gateway'
  | 'kubernetes-cluster';

export interface InfrastructureProvider {
  name: string;  // AWS, GCP, Azure, on-prem
  accountId?: string;
  supportTier?: string;
}

export interface InfrastructureConfig {
  instanceType?: string;
  gpuType?: string;
  gpuCount?: number;
  memory?: string;
  storage?: string;
  networking?: string;
}

export interface InfrastructureSecurity {
  encrypted: boolean;
  encryptionType?: string;
  networkIsolation: boolean;
  accessControl: string;
  auditLogging: boolean;
}

// ============================================================================
// External Services
// ============================================================================

/**
 * External Service Component - third-party AI services
 */
export interface ExternalServiceComponent {
  id: UUID;
  name: string;
  provider: string;
  type: ExternalServiceType;

  /** API endpoint */
  endpoint: string;
  /** API version used */
  apiVersion: string;

  /** Service level agreement */
  sla?: ServiceLevelAgreement;
  /** Data handling policies */
  dataHandling: DataHandlingPolicy;
  /** Compliance certifications */
  certifications: string[];

  /** Dependencies on this service */
  criticalityLevel: 'critical' | 'high' | 'medium' | 'low';
  /** Fallback if service unavailable */
  fallbackService?: string;
}

export type ExternalServiceType =
  | 'llm-api'
  | 'embedding-api'
  | 'image-generation'
  | 'speech-to-text'
  | 'text-to-speech'
  | 'moderation'
  | 'search'
  | 'other';

export interface ServiceLevelAgreement {
  availabilityTarget: number;  // e.g., 99.9
  latencyP99Ms: number;
  supportResponseTime: string;
  dataRetention: string;
}

export interface DataHandlingPolicy {
  dataStoredByProvider: boolean;
  dataUsedForTraining: boolean;
  dataRetentionDays: number;
  dataResidency: string[];
  encryptionInTransit: boolean;
  encryptionAtRest: boolean;
}

// ============================================================================
// Vulnerabilities
// ============================================================================

/**
 * AI-specific Vulnerability
 */
export interface AIVulnerability {
  id: string;  // AIOBS-specific or CVE
  type: AIVulnerabilityType;
  severity: SeverityScore;

  /** Affected components */
  affectedComponents: UUID[];

  /** Description */
  title: string;
  description: string;

  /** Discovery information */
  discoveredAt: ISO8601;
  discoveredBy: string;

  /** Status */
  status: VulnerabilityStatus;
  /** Remediation */
  remediation?: VulnerabilityRemediation;

  /** References */
  references: string[];
}

export type AIVulnerabilityType =
  | 'prompt-injection'
  | 'jailbreak'
  | 'data-poisoning'
  | 'model-extraction'
  | 'membership-inference'
  | 'adversarial-input'
  | 'supply-chain'
  | 'data-leak'
  | 'denial-of-service'
  | 'traditional-cve';

export type VulnerabilityStatus =
  | 'open'
  | 'investigating'
  | 'mitigated'
  | 'resolved'
  | 'accepted';

export interface VulnerabilityRemediation {
  description: string;
  appliedAt?: ISO8601;
  verifiedAt?: ISO8601;
  residualRisk?: string;
}

// ============================================================================
// Compliance
// ============================================================================

/**
 * SBOM Compliance Information
 */
export interface SBOMCompliance {
  /** Frameworks assessed against */
  frameworks: ComplianceFrameworkAssessment[];
  /** Overall compliance status */
  overallStatus: 'compliant' | 'partial' | 'non-compliant' | 'pending';
  /** Last assessment date */
  lastAssessment: ISO8601;
  /** Next scheduled assessment */
  nextAssessment?: ISO8601;
}

export interface ComplianceFrameworkAssessment {
  framework: 'eu-ai-act' | 'nist-ai-rmf' | 'iso-42001' | 'soc2' | 'gdpr' | 'ccpa' | 'custom';
  version: string;
  status: 'compliant' | 'partial' | 'non-compliant' | 'not-assessed';
  gaps: ComplianceGapSummary[];
  lastAssessed: ISO8601;
  assessor?: string;
}

export interface ComplianceGapSummary {
  requirement: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  remediationPlan?: string;
  dueDate?: ISO8601;
}

// ============================================================================
// Risk Assessment
// ============================================================================

/**
 * Overall SBOM Risk Assessment
 */
export interface SBOMRiskAssessment {
  /** Overall risk score */
  overallRisk: SeverityScore;
  /** Risk by category */
  categoryRisks: CategoryRisk[];
  /** Key risk factors */
  keyRisks: KeyRisk[];
  /** Recommendations */
  recommendations: RiskRecommendation[];
  /** Assessment metadata */
  assessedAt: ISO8601;
  assessedBy: string;
  methodology: string;
}

export interface CategoryRisk {
  category: RiskCategory;
  score: SeverityScore;
  factors: string[];
}

export type RiskCategory =
  | 'security'
  | 'privacy'
  | 'compliance'
  | 'operational'
  | 'reputational'
  | 'supply-chain'
  | 'ethical';

export interface KeyRisk {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  likelihood: 'very-likely' | 'likely' | 'possible' | 'unlikely' | 'rare';
  impact: 'catastrophic' | 'major' | 'moderate' | 'minor' | 'insignificant';
  mitigations: string[];
}

export interface RiskRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  affectedComponents: UUID[];
}

// ============================================================================
// Relationships
// ============================================================================

/**
 * Relationship between SBOM components
 */
export interface ComponentRelationship {
  sourceId: UUID;
  targetId: UUID;
  type: RelationshipType;
  description?: string;
}

export type RelationshipType =
  | 'depends-on'
  | 'trained-on'
  | 'fine-tuned-from'
  | 'deployed-on'
  | 'calls'
  | 'generates-for'
  | 'validates'
  | 'monitors';

// ============================================================================
// Audit Trail
// ============================================================================

/**
 * SBOM Audit Entry
 */
export interface SBOMAuditEntry {
  id: UUID;
  timestamp: ISO8601;
  action: SBOMAuditAction;
  actor: string;
  componentId?: UUID;
  previousValue?: JSONObject;
  newValue?: JSONObject;
  reason?: string;
}

export type SBOMAuditAction =
  | 'created'
  | 'updated'
  | 'component-added'
  | 'component-removed'
  | 'vulnerability-added'
  | 'vulnerability-resolved'
  | 'compliance-updated'
  | 'risk-reassessed';

// ============================================================================
// SBOM Operations
// ============================================================================

/**
 * SBOM Generation Request
 */
export interface SBOMGenerationRequest {
  systemId: string;
  includeTransitiveDeps: boolean;
  scanVulnerabilities: boolean;
  assessCompliance: ComplianceFrameworkAssessment['framework'][];
  outputFormat: 'json' | 'spdx' | 'cyclonedx';
}

/**
 * SBOM Diff - changes between two SBOMs
 */
export interface SBOMDiff {
  previousSbomId: UUID;
  currentSbomId: UUID;
  generatedAt: ISO8601;

  addedComponents: UUID[];
  removedComponents: UUID[];
  modifiedComponents: ComponentModification[];

  newVulnerabilities: AIVulnerability[];
  resolvedVulnerabilities: string[];

  complianceChanges: ComplianceChange[];
  riskScoreChange: number;
}

export interface ComponentModification {
  componentId: UUID;
  changes: FieldChange[];
}

export interface FieldChange {
  field: string;
  previousValue: unknown;
  newValue: unknown;
}

export interface ComplianceChange {
  framework: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
}

/**
 * SBOM Query Interface
 */
export interface SBOMQuery {
  /** Filter by component type */
  componentTypes?: string[];
  /** Filter by vulnerability severity */
  minVulnerabilitySeverity?: string;
  /** Filter by compliance status */
  complianceStatus?: string;
  /** Filter by license type */
  licenseTypes?: LicenseType[];
  /** Filter by provider */
  providers?: string[];
  /** Include transitive dependencies */
  includeTransitive?: boolean;
}

/**
 * SBOM Export Options
 */
export interface SBOMExportOptions {
  format: 'json' | 'spdx-json' | 'spdx-tag' | 'cyclonedx-json' | 'cyclonedx-xml';
  includeVulnerabilities: boolean;
  includeCompliance: boolean;
  includeRiskAssessment: boolean;
  redactSensitive: boolean;
}
