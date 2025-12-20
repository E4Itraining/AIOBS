/**
 * GenAI Guardrails & Safety Mesh Types
 *
 * Comprehensive type definitions for AI safety, content filtering,
 * and real-time protection against prompt injection, jailbreaks, and data leaks.
 */

import { ISO8601, UUID, NormalizedScore, TrendIndicator } from './common';

// ============================================================================
// Core Guardrails Configuration
// ============================================================================

/** Main guardrails configuration */
export interface GuardrailsConfig {
  id: UUID;
  name: string;
  enabled: boolean;
  version: string;
  policies: GuardrailPolicy[];
  thresholds: GuardrailThresholds;
  actions: GuardrailActions;
  exemptions: GuardrailExemption[];
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

/** Individual guardrail policy */
export interface GuardrailPolicy {
  id: UUID;
  type: GuardrailPolicyType;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  rules: GuardrailRule[];
  metadata?: Record<string, unknown>;
}

export type GuardrailPolicyType =
  | 'prompt-injection'
  | 'jailbreak'
  | 'data-leak'
  | 'pii-detection'
  | 'toxicity'
  | 'bias'
  | 'hallucination'
  | 'off-topic'
  | 'custom';

/** Individual rule within a policy */
export interface GuardrailRule {
  id: string;
  condition: string;
  pattern?: string;
  threshold?: number;
  action: 'block' | 'warn' | 'sanitize' | 'log' | 'flag';
}

/** Threshold configuration */
export interface GuardrailThresholds {
  promptInjectionScore: number;
  jailbreakScore: number;
  toxicityScore: number;
  piiConfidence: number;
  dataLeakConfidence: number;
  biasScore: number;
}

/** Actions to take when guardrails are triggered */
export interface GuardrailActions {
  onBlock: BlockAction;
  onWarn: WarnAction;
  onSanitize: SanitizeAction;
  onLog: LogAction;
}

export interface BlockAction {
  returnMessage: string;
  logEvent: boolean;
  notifyAdmin: boolean;
  incrementCounter: boolean;
}

export interface WarnAction {
  addWarningHeader: boolean;
  logEvent: boolean;
  continueProcessing: boolean;
}

export interface SanitizeAction {
  replaceWith: string;
  preserveFormat: boolean;
  logOriginal: boolean;
}

export interface LogAction {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  includeContent: boolean;
  anonymize: boolean;
}

/** Exemption rules */
export interface GuardrailExemption {
  id: UUID;
  type: 'user' | 'role' | 'endpoint' | 'model';
  identifier: string;
  policies: string[];
  reason: string;
  expiresAt?: ISO8601;
}

// ============================================================================
// Prompt Injection Detection
// ============================================================================

/** Request to analyze for prompt injection */
export interface PromptAnalysisRequest {
  requestId: UUID;
  prompt: string;
  systemPrompt?: string;
  previousMessages?: ConversationMessage[];
  modelId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: ISO8601;
}

/** Prompt injection detection result */
export interface PromptInjectionResult {
  requestId: UUID;
  timestamp: ISO8601;
  detected: boolean;
  score: NormalizedScore;
  confidence: NormalizedScore;
  injectionType?: PromptInjectionType;
  techniques: InjectionTechnique[];
  evidence: InjectionEvidence[];
  sanitizedPrompt?: string;
  recommendation: 'block' | 'sanitize' | 'flag' | 'allow';
  processingTimeMs: number;
}

export type PromptInjectionType =
  | 'direct'
  | 'indirect'
  | 'context-manipulation'
  | 'instruction-override'
  | 'role-manipulation'
  | 'encoding-attack'
  | 'delimiter-injection';

export interface InjectionTechnique {
  name: string;
  confidence: NormalizedScore;
  description: string;
  mitigated: boolean;
}

export interface InjectionEvidence {
  type: 'pattern' | 'semantic' | 'structural' | 'behavioral';
  location: { start: number; end: number };
  content: string;
  explanation: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

// ============================================================================
// Jailbreak Detection
// ============================================================================

/** Jailbreak detection result */
export interface JailbreakResult {
  requestId: UUID;
  timestamp: ISO8601;
  detected: boolean;
  score: NormalizedScore;
  confidence: NormalizedScore;
  technique?: JailbreakTechnique;
  patterns: JailbreakPattern[];
  conversationRisk: NormalizedScore;
  escalationPath?: EscalationPath;
  recommendation: 'block' | 'warn' | 'monitor' | 'allow';
  processingTimeMs: number;
}

export type JailbreakTechnique =
  | 'DAN'
  | 'roleplay'
  | 'hypothetical'
  | 'encoding'
  | 'token-smuggling'
  | 'multi-turn'
  | 'context-window'
  | 'persona-switch'
  | 'custom';

export interface JailbreakPattern {
  id: string;
  name: string;
  matched: boolean;
  confidence: NormalizedScore;
  snippet?: string;
}

export interface EscalationPath {
  steps: EscalationStep[];
  finalRisk: NormalizedScore;
  predictedOutcome: string;
}

export interface EscalationStep {
  turnNumber: number;
  technique: string;
  riskIncrease: number;
  description: string;
}

// ============================================================================
// Data Leak Prevention (DLP)
// ============================================================================

/** Data leak scan request */
export interface DataLeakScanRequest {
  requestId: UUID;
  content: string;
  direction: 'input' | 'output';
  context?: DataLeakContext;
  policies?: string[];
}

export interface DataLeakContext {
  modelId?: string;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  allowedDataTypes?: string[];
}

/** Data leak scan result */
export interface DataLeakResult {
  requestId: UUID;
  timestamp: ISO8601;
  hasLeaks: boolean;
  riskScore: NormalizedScore;
  leaks: DataLeakItem[];
  piiDetected: PIIDetection[];
  secretsDetected: SecretDetection[];
  internalDataDetected: InternalDataDetection[];
  recommendation: 'block' | 'redact' | 'flag' | 'allow';
  redactedContent?: string;
  processingTimeMs: number;
}

export interface DataLeakItem {
  id: UUID;
  type: DataLeakType;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: NormalizedScore;
  location: { start: number; end: number };
  originalValue: string;
  maskedValue: string;
  context: string;
}

export type DataLeakType =
  | 'pii'
  | 'secret'
  | 'credential'
  | 'internal-data'
  | 'training-data'
  | 'proprietary'
  | 'financial'
  | 'health'
  | 'legal';

export interface PIIDetection {
  type: PIIType;
  value: string;
  masked: string;
  confidence: NormalizedScore;
  location: { start: number; end: number };
}

export type PIIType =
  | 'email'
  | 'phone'
  | 'ssn'
  | 'credit-card'
  | 'address'
  | 'name'
  | 'dob'
  | 'passport'
  | 'drivers-license'
  | 'ip-address'
  | 'bank-account'
  | 'custom';

export interface SecretDetection {
  type: SecretType;
  provider?: string;
  masked: string;
  confidence: NormalizedScore;
  location: { start: number; end: number };
  isActive?: boolean;
}

export type SecretType =
  | 'api-key'
  | 'password'
  | 'token'
  | 'private-key'
  | 'certificate'
  | 'connection-string'
  | 'oauth-token'
  | 'jwt'
  | 'aws-key'
  | 'gcp-key'
  | 'azure-key'
  | 'custom';

export interface InternalDataDetection {
  type: string;
  pattern: string;
  value: string;
  masked: string;
  confidence: NormalizedScore;
  classification: 'confidential' | 'internal' | 'restricted' | 'public';
}

// ============================================================================
// Content Safety & Toxicity
// ============================================================================

/** Content safety analysis request */
export interface ContentSafetyRequest {
  requestId: UUID;
  content: string;
  contentType: 'text' | 'code' | 'mixed';
  categories?: ContentCategory[];
  context?: ContentContext;
}

export interface ContentContext {
  modelId?: string;
  userId?: string;
  sessionId?: string;
  previousContent?: string[];
  intendedAudience?: 'general' | 'adult' | 'professional';
}

export type ContentCategory =
  | 'toxicity'
  | 'hate-speech'
  | 'harassment'
  | 'violence'
  | 'sexual'
  | 'self-harm'
  | 'misinformation'
  | 'illegal-activity'
  | 'profanity';

/** Content safety result */
export interface ContentSafetyResult {
  requestId: UUID;
  timestamp: ISO8601;
  isSafe: boolean;
  overallScore: NormalizedScore;
  categoryScores: CategoryScore[];
  flaggedContent: FlaggedContent[];
  recommendation: 'block' | 'warn' | 'allow';
  suggestedRevision?: string;
  processingTimeMs: number;
}

export interface CategoryScore {
  category: ContentCategory;
  score: NormalizedScore;
  flagged: boolean;
  threshold: number;
}

export interface FlaggedContent {
  category: ContentCategory;
  severity: 'critical' | 'high' | 'medium' | 'low';
  content: string;
  location: { start: number; end: number };
  explanation: string;
  suggestedReplacement?: string;
}

// ============================================================================
// Bias Detection
// ============================================================================

/** Bias detection request */
export interface BiasDetectionRequest {
  requestId: UUID;
  content: string;
  contentType: 'prompt' | 'response' | 'both';
  biasCategories?: BiasCategory[];
}

export type BiasCategory =
  | 'gender'
  | 'race'
  | 'age'
  | 'religion'
  | 'nationality'
  | 'disability'
  | 'socioeconomic'
  | 'political'
  | 'sexual-orientation';

/** Bias detection result */
export interface BiasDetectionResult {
  requestId: UUID;
  timestamp: ISO8601;
  hasBias: boolean;
  overallScore: NormalizedScore;
  biasInstances: BiasInstance[];
  recommendation: 'revise' | 'flag' | 'allow';
  suggestedRevisions?: string[];
  processingTimeMs: number;
}

export interface BiasInstance {
  category: BiasCategory;
  severity: 'critical' | 'high' | 'medium' | 'low';
  content: string;
  location: { start: number; end: number };
  explanation: string;
  suggestedReplacement?: string;
  confidence: NormalizedScore;
}

// ============================================================================
// Semantic Firewall
// ============================================================================

/** Semantic firewall rule */
export interface SemanticFirewallRule {
  id: UUID;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: SemanticCondition[];
  action: 'block' | 'allow' | 'modify' | 'route';
  actionParams?: Record<string, unknown>;
}

export interface SemanticCondition {
  type: 'topic' | 'intent' | 'entity' | 'sentiment' | 'custom';
  operator: 'contains' | 'not-contains' | 'equals' | 'matches' | 'above' | 'below';
  value: string | number;
  confidence?: NormalizedScore;
}

/** Semantic firewall evaluation */
export interface SemanticFirewallResult {
  requestId: UUID;
  timestamp: ISO8601;
  matchedRules: MatchedRule[];
  finalAction: 'block' | 'allow' | 'modify' | 'route';
  modifiedContent?: string;
  routeTarget?: string;
  explanation: string;
  processingTimeMs: number;
}

export interface MatchedRule {
  ruleId: UUID;
  ruleName: string;
  matchedConditions: string[];
  action: string;
  applied: boolean;
}

// ============================================================================
// Guardrails Analytics & Monitoring
// ============================================================================

/** Guardrails metrics snapshot */
export interface GuardrailsMetrics {
  timestamp: ISO8601;
  period: { start: ISO8601; end: ISO8601 };
  totalRequests: number;
  blockedRequests: number;
  warnedRequests: number;
  sanitizedRequests: number;
  allowedRequests: number;
  blockRate: NormalizedScore;
  avgProcessingTimeMs: number;
  p95ProcessingTimeMs: number;
  threatsByType: ThreatCount[];
  topBlockedPatterns: PatternCount[];
  trend: TrendIndicator;
}

export interface ThreatCount {
  type: string;
  count: number;
  percentage: NormalizedScore;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface PatternCount {
  pattern: string;
  count: number;
  lastSeen: ISO8601;
}

/** Guardrails incident */
export interface GuardrailsIncident {
  id: UUID;
  timestamp: ISO8601;
  type: GuardrailIncidentType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  requestId: UUID;
  userId?: string;
  modelId?: string;
  description: string;
  evidence: Record<string, unknown>;
  action: string;
  resolved: boolean;
  resolvedAt?: ISO8601;
  resolvedBy?: string;
  resolution?: string;
}

export type GuardrailIncidentType =
  | 'prompt-injection-blocked'
  | 'jailbreak-attempt'
  | 'data-leak-prevented'
  | 'pii-detected'
  | 'toxic-content-blocked'
  | 'policy-violation'
  | 'rate-limit-exceeded'
  | 'anomaly-detected';

/** Security posture for AI */
export interface AISecurityPosture {
  timestamp: ISO8601;
  overallScore: NormalizedScore;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  trend: TrendIndicator;
  components: SecurityComponent[];
  topRisks: SecurityRisk[];
  recommendations: SecurityRecommendation[];
  complianceStatus: ComplianceItem[];
}

export interface SecurityComponent {
  name: string;
  score: NormalizedScore;
  status: 'healthy' | 'at-risk' | 'critical';
  lastChecked: ISO8601;
}

export interface SecurityRisk {
  id: UUID;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  likelihood: NormalizedScore;
  impact: NormalizedScore;
  mitigation: string;
}

export interface SecurityRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  category: string;
}

export interface ComplianceItem {
  framework: string;
  requirement: string;
  status: 'compliant' | 'partial' | 'non-compliant';
  lastAudit: ISO8601;
}
