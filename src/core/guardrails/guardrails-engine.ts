/**
 * GenAI Guardrails Engine
 *
 * Comprehensive protection layer for AI systems including:
 * - Prompt injection detection
 * - Jailbreak prevention
 * - Data leak prevention (DLP)
 * - Content safety filtering
 * - Semantic firewall
 */

import { v4 as uuidv4 } from 'uuid';
import {
  GuardrailsConfig,
  PromptAnalysisRequest,
  PromptInjectionResult,
  JailbreakResult,
  DataLeakScanRequest,
  DataLeakResult,
  ContentSafetyRequest,
  ContentSafetyResult,
  BiasDetectionRequest,
  BiasDetectionResult,
  GuardrailsMetrics,
  GuardrailsIncident,
  AISecurityPosture,
  PIIType,
  SecretType,
  InjectionTechnique,
  JailbreakPattern,
  DataLeakItem,
  FlaggedContent,
  BiasInstance,
} from '../types/guardrails';
import { NormalizedScore } from '../types/common';

// Injection detection patterns
const INJECTION_PATTERNS = [
  { pattern: /ignore\s+(previous|all|above)\s+(instructions?|prompts?)/i, technique: 'instruction-override', severity: 0.9 },
  { pattern: /you\s+are\s+now\s+(?:a|an)\s+\w+/i, technique: 'role-manipulation', severity: 0.8 },
  { pattern: /disregard\s+(?:your|the)\s+(rules|guidelines|instructions)/i, technique: 'instruction-override', severity: 0.9 },
  { pattern: /pretend\s+(?:you|that)\s+(?:are|have|can)/i, technique: 'role-manipulation', severity: 0.7 },
  { pattern: /system\s*:\s*you\s+are/i, technique: 'context-manipulation', severity: 0.85 },
  { pattern: /\[SYSTEM\]/i, technique: 'context-manipulation', severity: 0.8 },
  { pattern: /\{\{.*\}\}/g, technique: 'delimiter-injection', severity: 0.6 },
  { pattern: /<<.*>>/g, technique: 'delimiter-injection', severity: 0.6 },
  { pattern: /base64|atob|btoa/i, technique: 'encoding-attack', severity: 0.5 },
  { pattern: /\\x[0-9a-f]{2}/gi, technique: 'encoding-attack', severity: 0.6 },
];

// Jailbreak patterns
const JAILBREAK_PATTERNS = [
  { id: 'dan', name: 'DAN (Do Anything Now)', pattern: /do\s+anything\s+now|DAN\s+mode/i, confidence: 0.9 },
  { id: 'roleplay', name: 'Roleplay Jailbreak', pattern: /act\s+as\s+(?:if|a)\s+(?:evil|unethical|unrestricted)/i, confidence: 0.85 },
  { id: 'hypothetical', name: 'Hypothetical Scenario', pattern: /hypothetically|in\s+a\s+fictional|imagine\s+you\s+(?:were|could)/i, confidence: 0.7 },
  { id: 'developer', name: 'Developer Mode', pattern: /developer\s+mode|debug\s+mode|maintenance\s+mode/i, confidence: 0.8 },
  { id: 'opposite', name: 'Opposite Day', pattern: /opposite\s+day|say\s+the\s+opposite/i, confidence: 0.75 },
  { id: 'grandma', name: 'Grandma Exploit', pattern: /my\s+(?:grandmother|grandma)\s+used\s+to/i, confidence: 0.6 },
  { id: 'sudo', name: 'Sudo Mode', pattern: /sudo\s+mode|admin\s+mode|root\s+access/i, confidence: 0.85 },
];

// PII patterns
const PII_PATTERNS: { type: PIIType; pattern: RegExp; confidence: number }[] = [
  { type: 'email', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, confidence: 0.95 },
  { type: 'phone', pattern: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g, confidence: 0.85 },
  { type: 'ssn', pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, confidence: 0.9 },
  { type: 'credit-card', pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g, confidence: 0.95 },
  { type: 'ip-address', pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g, confidence: 0.9 },
];

// Secret patterns
const SECRET_PATTERNS: { type: SecretType; pattern: RegExp; provider?: string }[] = [
  { type: 'aws-key', pattern: /AKIA[0-9A-Z]{16}/g, provider: 'AWS' },
  { type: 'api-key', pattern: /(?:api[_-]?key|apikey)[=:\s]["']?([a-zA-Z0-9_-]{20,})["']?/gi },
  { type: 'jwt', pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g },
  { type: 'private-key', pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g },
  { type: 'password', pattern: /(?:password|passwd|pwd)[=:\s]["']?([^\s"']{8,})["']?/gi },
  { type: 'gcp-key', pattern: /AIza[0-9A-Za-z_-]{35}/g, provider: 'GCP' },
  { type: 'azure-key', pattern: /[a-zA-Z0-9+/]{86}==/g, provider: 'Azure' },
];

// Toxicity keywords (simplified - in production use ML model)
const TOXICITY_KEYWORDS = [
  'hate', 'kill', 'violence', 'abuse', 'threat', 'harm', 'attack',
];

/**
 * Main Guardrails Engine
 */
export class GuardrailsEngine {
  private config: GuardrailsConfig;
  private metrics: GuardrailsMetrics;
  private incidents: GuardrailsIncident[] = [];

  constructor(config?: Partial<GuardrailsConfig>) {
    this.config = this.mergeWithDefaults(config);
    this.metrics = this.initializeMetrics();
  }

  /**
   * Analyze prompt for injection attacks
   */
  async analyzePromptInjection(request: PromptAnalysisRequest): Promise<PromptInjectionResult> {
    const startTime = Date.now();
    const techniques: InjectionTechnique[] = [];
    let maxScore = 0;
    let injectionType: PromptInjectionResult['injectionType'] | undefined;

    // Check against injection patterns
    for (const { pattern, technique, severity } of INJECTION_PATTERNS) {
      if (pattern.test(request.prompt)) {
        techniques.push({
          name: technique,
          confidence: severity,
          description: `Detected ${technique} pattern`,
          mitigated: false,
        });
        if (severity > maxScore) {
          maxScore = severity;
          injectionType = technique as PromptInjectionResult['injectionType'];
        }
      }
    }

    // Check for context manipulation in conversation
    if (request.previousMessages && request.previousMessages.length > 0) {
      const contextManipulation = this.detectContextManipulation(request.prompt, request.previousMessages);
      if (contextManipulation.detected) {
        techniques.push({
          name: 'context-manipulation',
          confidence: contextManipulation.confidence,
          description: 'Potential context manipulation detected',
          mitigated: false,
        });
        maxScore = Math.max(maxScore, contextManipulation.confidence);
      }
    }

    const detected = maxScore > this.config.thresholds.promptInjectionScore;
    const recommendation = this.getInjectionRecommendation(maxScore, detected);

    // Record incident if detected
    if (detected) {
      this.recordIncident('prompt-injection-blocked', request.requestId, maxScore);
    }

    return {
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
      detected,
      score: maxScore,
      confidence: Math.min(1, maxScore + 0.1),
      injectionType,
      techniques,
      evidence: techniques.map(t => ({
        type: 'pattern' as const,
        location: { start: 0, end: request.prompt.length },
        content: request.prompt.substring(0, 100),
        explanation: t.description,
        severity: t.confidence > 0.8 ? 'high' as const : 'medium' as const,
      })),
      sanitizedPrompt: detected ? this.sanitizePrompt(request.prompt) : undefined,
      recommendation,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Detect jailbreak attempts
   */
  async detectJailbreak(request: PromptAnalysisRequest): Promise<JailbreakResult> {
    const startTime = Date.now();
    const patterns: JailbreakPattern[] = [];
    let maxScore = 0;
    let detectedTechnique: JailbreakResult['technique'];

    for (const jp of JAILBREAK_PATTERNS) {
      const matched = jp.pattern.test(request.prompt);
      patterns.push({
        id: jp.id,
        name: jp.name,
        matched,
        confidence: matched ? jp.confidence : 0,
        snippet: matched ? request.prompt.match(jp.pattern)?.[0] : undefined,
      });
      if (matched && jp.confidence > maxScore) {
        maxScore = jp.confidence;
        detectedTechnique = jp.id as JailbreakResult['technique'];
      }
    }

    // Analyze conversation for escalation
    let conversationRisk = maxScore;
    if (request.previousMessages && request.previousMessages.length > 2) {
      const escalation = this.analyzeEscalation(request.previousMessages, request.prompt);
      conversationRisk = Math.max(conversationRisk, escalation);
    }

    const detected = maxScore > this.config.thresholds.jailbreakScore;

    if (detected) {
      this.recordIncident('jailbreak-attempt', request.requestId, maxScore);
    }

    return {
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
      detected,
      score: maxScore,
      confidence: Math.min(1, maxScore + 0.05),
      technique: detectedTechnique,
      patterns,
      conversationRisk,
      recommendation: detected ? 'block' : conversationRisk > 0.5 ? 'warn' : 'allow',
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Scan for data leaks
   */
  async scanDataLeaks(request: DataLeakScanRequest): Promise<DataLeakResult> {
    const startTime = Date.now();
    const leaks: DataLeakItem[] = [];
    const piiDetected: DataLeakResult['piiDetected'] = [];
    const secretsDetected: DataLeakResult['secretsDetected'] = [];
    const internalDataDetected: DataLeakResult['internalDataDetected'] = [];

    // Scan for PII
    for (const { type, pattern, confidence } of PII_PATTERNS) {
      const matches = request.content.matchAll(pattern);
      for (const match of matches) {
        const value = match[0];
        const location = { start: match.index!, end: match.index! + value.length };
        piiDetected.push({
          type,
          value,
          masked: this.maskValue(value, type),
          confidence,
          location,
        });
        leaks.push({
          id: uuidv4(),
          type: 'pii',
          category: type,
          severity: type === 'ssn' || type === 'credit-card' ? 'critical' : 'high',
          confidence,
          location,
          originalValue: value,
          maskedValue: this.maskValue(value, type),
          context: request.content.substring(Math.max(0, location.start - 20), Math.min(request.content.length, location.end + 20)),
        });
      }
    }

    // Scan for secrets
    for (const { type, pattern, provider } of SECRET_PATTERNS) {
      const matches = request.content.matchAll(pattern);
      for (const match of matches) {
        const value = match[1] || match[0];
        const location = { start: match.index!, end: match.index! + value.length };
        secretsDetected.push({
          type,
          provider,
          masked: this.maskSecret(value),
          confidence: 0.9,
          location,
        });
        leaks.push({
          id: uuidv4(),
          type: 'secret',
          category: type,
          severity: 'critical',
          confidence: 0.9,
          location,
          originalValue: value,
          maskedValue: this.maskSecret(value),
          context: 'Sensitive credential detected',
        });
      }
    }

    const hasLeaks = leaks.length > 0;
    const riskScore = this.calculateLeakRiskScore(leaks);

    if (hasLeaks) {
      this.recordIncident('data-leak-prevented', request.requestId, riskScore);
    }

    return {
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
      hasLeaks,
      riskScore,
      leaks,
      piiDetected,
      secretsDetected,
      internalDataDetected,
      recommendation: riskScore > 0.7 ? 'block' : riskScore > 0.3 ? 'redact' : 'allow',
      redactedContent: hasLeaks ? this.redactContent(request.content, leaks) : undefined,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Analyze content safety
   */
  async analyzeContentSafety(request: ContentSafetyRequest): Promise<ContentSafetyResult> {
    const startTime = Date.now();
    const flaggedContent: FlaggedContent[] = [];
    const categoryScores: ContentSafetyResult['categoryScores'] = [];

    // Check toxicity (simplified - use ML in production)
    let toxicityScore = 0;
    for (const keyword of TOXICITY_KEYWORDS) {
      if (request.content.toLowerCase().includes(keyword)) {
        toxicityScore += 0.2;
      }
    }
    toxicityScore = Math.min(1, toxicityScore);

    categoryScores.push({
      category: 'toxicity',
      score: toxicityScore,
      flagged: toxicityScore > 0.5,
      threshold: 0.5,
    });

    if (toxicityScore > 0.5) {
      flaggedContent.push({
        category: 'toxicity',
        severity: toxicityScore > 0.8 ? 'high' : 'medium',
        content: request.content.substring(0, 100),
        location: { start: 0, end: 100 },
        explanation: 'Potentially toxic content detected',
      });
    }

    const isSafe = flaggedContent.length === 0;
    const overallScore = 1 - toxicityScore;

    if (!isSafe) {
      this.recordIncident('toxic-content-blocked', request.requestId, toxicityScore);
    }

    return {
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
      isSafe,
      overallScore,
      categoryScores,
      flaggedContent,
      recommendation: isSafe ? 'allow' : toxicityScore > 0.7 ? 'block' : 'warn',
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Detect bias in content
   */
  async detectBias(request: BiasDetectionRequest): Promise<BiasDetectionResult> {
    const startTime = Date.now();
    const biasInstances: BiasInstance[] = [];

    // Simplified bias detection - in production use ML models
    const biasPatterns = [
      { category: 'gender' as const, patterns: [/\b(he|she)\b.*\b(should|must|always)\b/gi] },
      { category: 'age' as const, patterns: [/\b(old|young)\s+(people|person)\b.*\b(can't|cannot|unable)\b/gi] },
    ];

    for (const { category, patterns } of biasPatterns) {
      for (const pattern of patterns) {
        const matches = request.content.matchAll(pattern);
        for (const match of matches) {
          biasInstances.push({
            category,
            severity: 'medium',
            content: match[0],
            location: { start: match.index!, end: match.index! + match[0].length },
            explanation: `Potential ${category} bias detected`,
            confidence: 0.6,
          });
        }
      }
    }

    const hasBias = biasInstances.length > 0;
    const overallScore = biasInstances.length > 0 ?
      biasInstances.reduce((sum, b) => sum + b.confidence, 0) / biasInstances.length : 0;

    return {
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
      hasBias,
      overallScore,
      biasInstances,
      recommendation: hasBias ? 'flag' : 'allow',
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Get security posture
   */
  async getSecurityPosture(): Promise<AISecurityPosture> {
    const recentIncidents = this.incidents.filter(i => {
      const incidentTime = new Date(i.timestamp).getTime();
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return incidentTime > oneDayAgo;
    });

    const criticalCount = recentIncidents.filter(i => i.severity === 'critical').length;
    const highCount = recentIncidents.filter(i => i.severity === 'high').length;

    const overallScore = Math.max(0, 1 - (criticalCount * 0.3 + highCount * 0.1));
    const riskLevel = criticalCount > 0 ? 'critical' : highCount > 2 ? 'high' : overallScore < 0.7 ? 'medium' : 'low';

    return {
      timestamp: new Date().toISOString(),
      overallScore,
      riskLevel,
      trend: { direction: 'stable', magnitude: 0, periodDays: 7, significance: 0.5 },
      components: [
        { name: 'Prompt Injection Protection', score: 0.95, status: 'healthy', lastChecked: new Date().toISOString() },
        { name: 'Jailbreak Prevention', score: 0.92, status: 'healthy', lastChecked: new Date().toISOString() },
        { name: 'Data Leak Prevention', score: 0.88, status: 'healthy', lastChecked: new Date().toISOString() },
        { name: 'Content Safety', score: 0.90, status: 'healthy', lastChecked: new Date().toISOString() },
      ],
      topRisks: recentIncidents.slice(0, 5).map(i => ({
        id: i.id,
        title: i.description,
        description: i.type,
        severity: i.severity,
        likelihood: 0.5,
        impact: i.severity === 'critical' ? 0.9 : 0.6,
        mitigation: 'Automated blocking enabled',
      })),
      recommendations: [
        { priority: 'medium', title: 'Update injection patterns', description: 'Add new emerging patterns', effort: 'low', impact: 'medium', category: 'security' },
      ],
      complianceStatus: [
        { framework: 'AI Act', requirement: 'Content Safety', status: 'compliant', lastAudit: new Date().toISOString() },
      ],
    };
  }

  /**
   * Get metrics
   */
  getMetrics(): GuardrailsMetrics {
    return this.metrics;
  }

  /**
   * Get recent incidents
   */
  getIncidents(limit = 100): GuardrailsIncident[] {
    return this.incidents.slice(-limit);
  }

  // Private helper methods

  private mergeWithDefaults(config?: Partial<GuardrailsConfig>): GuardrailsConfig {
    return {
      id: config?.id || uuidv4(),
      name: config?.name || 'Default Guardrails',
      enabled: config?.enabled ?? true,
      version: config?.version || '1.0.0',
      policies: config?.policies || [],
      thresholds: {
        promptInjectionScore: config?.thresholds?.promptInjectionScore ?? 0.7,
        jailbreakScore: config?.thresholds?.jailbreakScore ?? 0.75,
        toxicityScore: config?.thresholds?.toxicityScore ?? 0.6,
        piiConfidence: config?.thresholds?.piiConfidence ?? 0.8,
        dataLeakConfidence: config?.thresholds?.dataLeakConfidence ?? 0.7,
        biasScore: config?.thresholds?.biasScore ?? 0.5,
      },
      actions: config?.actions || {
        onBlock: { returnMessage: 'Request blocked for safety', logEvent: true, notifyAdmin: true, incrementCounter: true },
        onWarn: { addWarningHeader: true, logEvent: true, continueProcessing: true },
        onSanitize: { replaceWith: '[REDACTED]', preserveFormat: true, logOriginal: true },
        onLog: { logLevel: 'warn', includeContent: false, anonymize: true },
      },
      exemptions: config?.exemptions || [],
      createdAt: config?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private initializeMetrics(): GuardrailsMetrics {
    return {
      timestamp: new Date().toISOString(),
      period: { start: new Date().toISOString(), end: new Date().toISOString() },
      totalRequests: 0,
      blockedRequests: 0,
      warnedRequests: 0,
      sanitizedRequests: 0,
      allowedRequests: 0,
      blockRate: 0,
      avgProcessingTimeMs: 0,
      p95ProcessingTimeMs: 0,
      threatsByType: [],
      topBlockedPatterns: [],
      trend: { direction: 'stable', magnitude: 0, periodDays: 7, significance: 0.5 },
    };
  }

  private detectContextManipulation(prompt: string, history: { role: string; content: string }[]): { detected: boolean; confidence: number } {
    // Check for attempts to override previous context
    const overridePatterns = [
      /forget\s+(?:everything|what|the)/i,
      /new\s+instructions/i,
      /from\s+now\s+on/i,
    ];

    for (const pattern of overridePatterns) {
      if (pattern.test(prompt)) {
        return { detected: true, confidence: 0.8 };
      }
    }

    return { detected: false, confidence: 0 };
  }

  private analyzeEscalation(history: { role: string; content: string }[], currentPrompt: string): number {
    // Simple escalation detection - look for increasing manipulation attempts
    let escalationScore = 0;
    let previousAttempts = 0;

    for (const msg of history) {
      if (msg.role === 'user') {
        for (const { pattern } of INJECTION_PATTERNS) {
          if (pattern.test(msg.content)) {
            previousAttempts++;
          }
        }
      }
    }

    if (previousAttempts > 2) {
      escalationScore = Math.min(1, previousAttempts * 0.2);
    }

    return escalationScore;
  }

  private getInjectionRecommendation(score: number, detected: boolean): PromptInjectionResult['recommendation'] {
    if (detected) return 'block';
    if (score > 0.5) return 'sanitize';
    if (score > 0.3) return 'flag';
    return 'allow';
  }

  private sanitizePrompt(prompt: string): string {
    let sanitized = prompt;
    for (const { pattern } of INJECTION_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REMOVED]');
    }
    return sanitized;
  }

  private maskValue(value: string, type: PIIType): string {
    switch (type) {
      case 'email':
        const [local, domain] = value.split('@');
        return `${local[0]}***@${domain}`;
      case 'phone':
        return value.replace(/\d(?=\d{4})/g, '*');
      case 'ssn':
        return '***-**-' + value.slice(-4);
      case 'credit-card':
        return '**** **** **** ' + value.slice(-4);
      default:
        return '*'.repeat(value.length);
    }
  }

  private maskSecret(value: string): string {
    if (value.length <= 8) return '*'.repeat(value.length);
    return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
  }

  private calculateLeakRiskScore(leaks: DataLeakItem[]): NormalizedScore {
    if (leaks.length === 0) return 0;

    const severityScores = { critical: 1, high: 0.75, medium: 0.5, low: 0.25 };
    const totalScore = leaks.reduce((sum, leak) => sum + severityScores[leak.severity], 0);
    return Math.min(1, totalScore / leaks.length + (leaks.length * 0.1));
  }

  private redactContent(content: string, leaks: DataLeakItem[]): string {
    let redacted = content;
    // Sort by start position descending to maintain positions
    const sortedLeaks = [...leaks].sort((a, b) => b.location.start - a.location.start);
    for (const leak of sortedLeaks) {
      redacted = redacted.substring(0, leak.location.start) + leak.maskedValue + redacted.substring(leak.location.end);
    }
    return redacted;
  }

  private recordIncident(type: GuardrailsIncident['type'], requestId: string, severity: number): void {
    const incident: GuardrailsIncident = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type,
      severity: severity > 0.8 ? 'critical' : severity > 0.6 ? 'high' : severity > 0.4 ? 'medium' : 'low',
      requestId,
      description: `${type} detected with score ${severity.toFixed(2)}`,
      evidence: {},
      action: 'blocked',
      resolved: false,
    };
    this.incidents.push(incident);
    this.metrics.blockedRequests++;
    this.metrics.totalRequests++;
  }
}

// Export singleton instance
export const guardrailsEngine = new GuardrailsEngine();
