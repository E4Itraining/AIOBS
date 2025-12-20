/**
 * AI Supply Chain Security (SBOM) Types
 *
 * Comprehensive type definitions for AI model provenance, lineage tracking,
 * vulnerability scanning, and supply chain security.
 */

import { ISO8601, UUID, NormalizedScore, SHA256, TrendIndicator } from './common';

// ============================================================================
// AI Bill of Materials (AI-BOM)
// ============================================================================

/** Complete AI Bill of Materials */
export interface AIBillOfMaterials {
  id: UUID;
  version: string;
  format: 'aiobs-sbom-1.0';
  createdAt: ISO8601;
  updatedAt: ISO8601;
  generator: SBOMGenerator;
  model: ModelIdentity;
  components: SBOMComponent[];
  dependencies: ModelDependency[];
  provenance: ModelProvenance;
  security: SecurityAssessment;
  compliance: ComplianceStatus;
  signatures: DigitalSignature[];
}

export interface SBOMGenerator {
  name: string;
  version: string;
  vendor: string;
}

export interface ModelIdentity {
  id: UUID;
  name: string;
  version: string;
  type: ModelType;
  framework: string;
  frameworkVersion: string;
  architecture: string;
  size: ModelSize;
  hash: ModelHash;
  registry?: ModelRegistry;
  licenses: License[];
}

export type ModelType =
  | 'llm'
  | 'vision'
  | 'multimodal'
  | 'classification'
  | 'regression'
  | 'clustering'
  | 'embedding'
  | 'generation'
  | 'custom';

export interface ModelSize {
  parameters: number;
  fileSize: number;
  unit: 'B' | 'KB' | 'MB' | 'GB';
  quantization?: string;
}

export interface ModelHash {
  algorithm: 'sha256' | 'sha512' | 'blake3';
  value: string;
  verified: boolean;
  verifiedAt?: ISO8601;
}

export interface ModelRegistry {
  name: string;
  url: string;
  namespace?: string;
  verified: boolean;
}

export interface License {
  id: string;
  name: string;
  url?: string;
  restrictions?: string[];
  commercial: boolean;
}

// ============================================================================
// SBOM Components
// ============================================================================

/** Individual SBOM component */
export interface SBOMComponent {
  id: UUID;
  type: ComponentType;
  name: string;
  version: string;
  supplier?: ComponentSupplier;
  hash?: ComponentHash;
  licenses: License[];
  properties: ComponentProperty[];
  vulnerabilities: VulnerabilityRef[];
  children?: UUID[];
}

export type ComponentType =
  | 'model'
  | 'dataset'
  | 'framework'
  | 'library'
  | 'preprocessing'
  | 'postprocessing'
  | 'adapter'
  | 'lora'
  | 'tokenizer'
  | 'config'
  | 'checkpoint';

export interface ComponentSupplier {
  name: string;
  url?: string;
  contact?: string;
  verified: boolean;
}

export interface ComponentHash {
  algorithm: string;
  value: string;
}

export interface ComponentProperty {
  name: string;
  value: string;
  category?: string;
}

export interface VulnerabilityRef {
  id: string;
  source: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

// ============================================================================
// Model Dependencies
// ============================================================================

/** Model dependency relationship */
export interface ModelDependency {
  id: UUID;
  sourceId: UUID;
  targetId: UUID;
  type: DependencyType;
  version: string;
  required: boolean;
  scope: DependencyScope;
  constraints?: string[];
}

export type DependencyType =
  | 'base-model'
  | 'fine-tune'
  | 'adapter'
  | 'dataset'
  | 'tokenizer'
  | 'framework'
  | 'library'
  | 'tool'
  | 'config';

export type DependencyScope =
  | 'training'
  | 'inference'
  | 'evaluation'
  | 'preprocessing'
  | 'postprocessing'
  | 'all';

// ============================================================================
// Model Provenance
// ============================================================================

/** Complete model provenance record */
export interface ModelProvenance {
  id: UUID;
  modelId: UUID;
  createdAt: ISO8601;
  origin: ModelOrigin;
  trainingRuns: TrainingRun[];
  dataLineage: DataLineage;
  transformations: Transformation[];
  auditTrail: ProvenanceEvent[];
  attestations: Attestation[];
}

export interface ModelOrigin {
  type: 'trained' | 'fine-tuned' | 'distilled' | 'quantized' | 'merged' | 'imported';
  baseModel?: ModelReference;
  creator: CreatorInfo;
  organization?: OrganizationInfo;
  repository?: RepositoryInfo;
}

export interface ModelReference {
  id: UUID;
  name: string;
  version: string;
  hash: string;
  source: string;
}

export interface CreatorInfo {
  id: string;
  name: string;
  email?: string;
  verified: boolean;
  pgpKey?: string;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  verified: boolean;
  domain?: string;
}

export interface RepositoryInfo {
  type: 'git' | 'huggingface' | 's3' | 'gcs' | 'azure' | 'custom';
  url: string;
  commit?: string;
  branch?: string;
  tag?: string;
}

/** Training run record */
export interface TrainingRun {
  id: UUID;
  timestamp: ISO8601;
  type: 'initial' | 'fine-tune' | 'rlhf' | 'dpo' | 'sft' | 'continued';
  environment: TrainingEnvironment;
  hyperparameters: Record<string, unknown>;
  datasets: DatasetReference[];
  metrics: TrainingMetrics;
  duration: number;
  cost?: number;
  carbon?: number;
}

export interface TrainingEnvironment {
  framework: string;
  frameworkVersion: string;
  platform: string;
  hardware: HardwareInfo[];
  containerImage?: string;
  dependencies: string[];
}

export interface HardwareInfo {
  type: 'gpu' | 'tpu' | 'cpu';
  model: string;
  count: number;
  memory?: string;
}

export interface DatasetReference {
  id: UUID;
  name: string;
  version: string;
  hash: string;
  size: number;
  samples: number;
  splits?: Record<string, number>;
  source: string;
  license?: string;
}

export interface TrainingMetrics {
  loss: number;
  accuracy?: number;
  perplexity?: number;
  epochs: number;
  steps: number;
  customMetrics?: Record<string, number>;
}

/** Data lineage tracking */
export interface DataLineage {
  datasets: DatasetLineage[];
  preprocessing: PreprocessingStep[];
  augmentation?: AugmentationInfo[];
  sampling?: SamplingInfo;
  filtering?: FilteringInfo[];
}

export interface DatasetLineage {
  id: UUID;
  name: string;
  version: string;
  source: DataSource;
  collection: CollectionInfo;
  processing: ProcessingHistory[];
  quality: DataQuality;
  biasAssessment?: BiasAssessment;
}

export interface DataSource {
  type: 'public' | 'proprietary' | 'synthetic' | 'crawled' | 'user-generated';
  origin: string;
  url?: string;
  license?: string;
  accessDate?: ISO8601;
}

export interface CollectionInfo {
  method: string;
  dateRange?: { start: ISO8601; end: ISO8601 };
  geography?: string[];
  languages?: string[];
  domains?: string[];
}

export interface ProcessingHistory {
  step: string;
  timestamp: ISO8601;
  description: string;
  impact: string;
}

export interface DataQuality {
  completeness: NormalizedScore;
  accuracy: NormalizedScore;
  consistency: NormalizedScore;
  freshness: NormalizedScore;
  overallScore: NormalizedScore;
}

export interface BiasAssessment {
  assessed: boolean;
  assessmentDate?: ISO8601;
  findings?: BiasFindings[];
  mitigations?: string[];
}

export interface BiasFindings {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedGroups?: string[];
}

export interface PreprocessingStep {
  id: string;
  name: string;
  type: string;
  parameters: Record<string, unknown>;
  order: number;
}

export interface AugmentationInfo {
  technique: string;
  parameters: Record<string, unknown>;
  multiplier: number;
}

export interface SamplingInfo {
  strategy: string;
  ratio: number;
  seed?: number;
}

export interface FilteringInfo {
  criteria: string;
  removedCount: number;
  reason: string;
}

/** Transformation record */
export interface Transformation {
  id: UUID;
  timestamp: ISO8601;
  type: TransformationType;
  description: string;
  inputHash: string;
  outputHash: string;
  parameters?: Record<string, unknown>;
  actor: string;
  verified: boolean;
}

export type TransformationType =
  | 'quantization'
  | 'pruning'
  | 'distillation'
  | 'merging'
  | 'conversion'
  | 'optimization'
  | 'export';

/** Provenance event */
export interface ProvenanceEvent {
  id: UUID;
  timestamp: ISO8601;
  type: ProvenanceEventType;
  actor: string;
  description: string;
  metadata?: Record<string, unknown>;
  signature?: string;
}

export type ProvenanceEventType =
  | 'created'
  | 'modified'
  | 'deployed'
  | 'retired'
  | 'audited'
  | 'transferred'
  | 'certified';

/** Attestation record */
export interface Attestation {
  id: UUID;
  type: AttestationType;
  issuer: AttestationIssuer;
  subject: string;
  issuedAt: ISO8601;
  expiresAt?: ISO8601;
  claims: Record<string, unknown>;
  signature: string;
  verified: boolean;
}

export type AttestationType =
  | 'origin'
  | 'training'
  | 'evaluation'
  | 'security'
  | 'compliance'
  | 'performance';

export interface AttestationIssuer {
  id: string;
  name: string;
  publicKey: string;
  trusted: boolean;
}

// ============================================================================
// Security Assessment
// ============================================================================

/** Model security assessment */
export interface SecurityAssessment {
  id: UUID;
  modelId: UUID;
  timestamp: ISO8601;
  overallScore: NormalizedScore;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  vulnerabilities: ModelVulnerability[];
  threats: ThreatAssessment[];
  supplyChainRisks: SupplyChainRisk[];
  recommendations: SecurityRecommendation[];
}

/** Model vulnerability */
export interface ModelVulnerability {
  id: UUID;
  type: VulnerabilityType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cvssScore?: number;
  cveId?: string;
  description: string;
  affectedComponent: string;
  discoveredAt: ISO8601;
  status: 'open' | 'mitigated' | 'accepted' | 'false-positive';
  remediation?: string;
  references?: string[];
}

export type VulnerabilityType =
  | 'data-poisoning'
  | 'model-extraction'
  | 'adversarial'
  | 'backdoor'
  | 'bias'
  | 'privacy-leak'
  | 'dependency'
  | 'configuration'
  | 'prompt-injection';

/** Threat assessment */
export interface ThreatAssessment {
  id: UUID;
  type: ThreatType;
  likelihood: NormalizedScore;
  impact: NormalizedScore;
  riskScore: NormalizedScore;
  description: string;
  mitigations: string[];
  residualRisk: NormalizedScore;
}

export type ThreatType =
  | 'data-exfiltration'
  | 'model-theft'
  | 'adversarial-attack'
  | 'supply-chain-compromise'
  | 'insider-threat'
  | 'denial-of-service';

/** Supply chain risk */
export interface SupplyChainRisk {
  id: UUID;
  component: string;
  riskType: SupplyChainRiskType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedVersions?: string[];
  mitigation?: string;
  status: 'active' | 'mitigated' | 'monitoring';
}

export type SupplyChainRiskType =
  | 'untrusted-source'
  | 'outdated-dependency'
  | 'known-vulnerability'
  | 'license-violation'
  | 'malicious-code'
  | 'tampering';

export interface SecurityRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

// ============================================================================
// Compliance Status
// ============================================================================

/** Compliance status for model */
export interface ComplianceStatus {
  overallStatus: 'compliant' | 'partial' | 'non-compliant' | 'unknown';
  frameworks: FrameworkCompliance[];
  certifications: Certification[];
  audits: AuditRecord[];
  gaps: ComplianceGap[];
}

export interface FrameworkCompliance {
  framework: string;
  version: string;
  status: 'compliant' | 'partial' | 'non-compliant';
  score: NormalizedScore;
  requirements: RequirementStatus[];
  lastAssessed: ISO8601;
}

export interface RequirementStatus {
  id: string;
  name: string;
  status: 'met' | 'partial' | 'not-met' | 'not-applicable';
  evidence?: string;
  notes?: string;
}

export interface Certification {
  id: UUID;
  name: string;
  issuer: string;
  issuedAt: ISO8601;
  expiresAt: ISO8601;
  scope: string;
  status: 'active' | 'expired' | 'revoked';
  certificateUrl?: string;
}

export interface AuditRecord {
  id: UUID;
  type: string;
  auditor: string;
  date: ISO8601;
  scope: string;
  findings: AuditFinding[];
  result: 'passed' | 'failed' | 'conditional';
  reportUrl?: string;
}

export interface AuditFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  remediation?: string;
  status: 'open' | 'resolved' | 'accepted';
}

export interface ComplianceGap {
  framework: string;
  requirement: string;
  gap: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  remediation: string;
  dueDate?: ISO8601;
}

// ============================================================================
// Digital Signatures
// ============================================================================

/** Digital signature for SBOM verification */
export interface DigitalSignature {
  id: UUID;
  algorithm: 'rsa-sha256' | 'ecdsa-sha256' | 'ed25519';
  signer: SignerInfo;
  timestamp: ISO8601;
  signature: string;
  scope: 'full' | 'components' | 'provenance';
  verified?: boolean;
  verifiedAt?: ISO8601;
}

export interface SignerInfo {
  id: string;
  name: string;
  organization?: string;
  publicKey: string;
  keyId: string;
  trusted: boolean;
}

// ============================================================================
// Supply Chain Analytics
// ============================================================================

/** Supply chain analytics dashboard */
export interface SupplyChainAnalytics {
  timestamp: ISO8601;
  overview: SupplyChainOverview;
  riskMetrics: SupplyChainRiskMetrics;
  componentHealth: ComponentHealthMetrics;
  vulnerabilityTrends: VulnerabilityTrends;
  complianceMetrics: SupplyChainComplianceMetrics;
}

export interface SupplyChainOverview {
  totalModels: number;
  totalComponents: number;
  uniqueSuppliers: number;
  avgDependencyDepth: number;
  modelsWithSBOM: number;
  sbomCoverage: NormalizedScore;
}

export interface SupplyChainRiskMetrics {
  overallRiskScore: NormalizedScore;
  criticalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  riskTrend: TrendIndicator;
  topRisks: SupplyChainRisk[];
}

export interface ComponentHealthMetrics {
  healthyComponents: number;
  atRiskComponents: number;
  criticalComponents: number;
  outdatedComponents: number;
  unverifiedComponents: number;
}

export interface VulnerabilityTrends {
  newVulnerabilities: number;
  resolvedVulnerabilities: number;
  openVulnerabilities: number;
  avgTimeToRemediate: number;
  trend: TrendIndicator;
  byType: Record<string, number>;
}

export interface SupplyChainComplianceMetrics {
  overallCompliance: NormalizedScore;
  compliantModels: number;
  partialModels: number;
  nonCompliantModels: number;
  pendingAudits: number;
  upcomingCertExpirations: number;
}
