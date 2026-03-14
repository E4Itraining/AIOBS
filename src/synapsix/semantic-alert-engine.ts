/**
 * Semantic Alert Engine
 *
 * Context-aware alerting system that generates actionable alerts from
 * semantic drift detection results, MITRE ICS correlations, and IT/OT
 * events. Produces evidence-backed alerts suitable for SOC operators
 * and COMCYBER incident response.
 *
 * @cybersec Alert generation for defense SOC with evidence chains
 */

import { v4 as uuidv4 } from 'uuid';
import type { MitreCorrelationResult } from './mitre-ics-correlator';
import type { CorrelationEvent } from './it-ot-correlator';

// ============================================================================
// Types
// ============================================================================

export interface SemanticAlertConfig {
  /** Minimum confidence to emit an alert */
  minConfidence: number;
  /** Severity threshold below which alerts are suppressed */
  minSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Maximum alerts per minute (rate limiting) */
  maxAlertsPerMinute: number;
  /** Enable ANSSI/NIS2 notification formatting */
  nis2Enabled: boolean;
}

export interface SynapsixAlert {
  id: string;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  category: AlertCategory;
  confidence: number;
  /** Source detection modules that triggered this alert */
  sources: AlertSource[];
  /** MITRE ATT&CK ICS techniques associated */
  mitreTechniques: string[];
  /** Evidence chain for audit compliance */
  evidence: AlertEvidence;
  /** Recommended response actions */
  actions: AlertAction[];
  /** Whether this is a stealth attack (invisible to classical SIEM) */
  stealthIndicator: boolean;
  /** Alert state */
  state: 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive';
  /** NIS2 notification metadata */
  nis2Notification: NIS2Notification | null;
}

export type AlertCategory =
  | 'semantic_drift_stealth'
  | 'semantic_drift_overt'
  | 'ot_process_manipulation'
  | 'it_ot_lateral_movement'
  | 'multi_vector_attack'
  | 'device_integrity'
  | 'data_exfiltration';

export interface AlertSource {
  module: string;
  signalId: string;
  confidence: number;
}

export interface AlertEvidence {
  chainId: string;
  steps: EvidenceStep[];
  exportable: boolean;
  hashChain: string;
}

export interface EvidenceStep {
  timestamp: string;
  module: string;
  finding: string;
  data: Record<string, string | number | boolean>;
}

export interface AlertAction {
  type: 'isolate' | 'investigate' | 'escalate' | 'notify' | 'contain' | 'verify';
  priority: 'immediate' | 'short_term' | 'long_term';
  description: string;
  automated: boolean;
}

export interface NIS2Notification {
  required: boolean;
  deadline: string;
  authority: string;
  classification: string;
  notificationTemplate: string;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * @cybersec Generates actionable SOC alerts from Synapsix detection pipeline
 */
export class SemanticAlertEngine {
  private config: SemanticAlertConfig;
  private alertCount: number = 0;
  private lastMinuteReset: number = Date.now();
  private alerts: SynapsixAlert[] = [];

  constructor(config?: Partial<SemanticAlertConfig>) {
    this.config = {
      minConfidence: config?.minConfidence ?? 0.4,
      minSeverity: config?.minSeverity ?? 'LOW',
      maxAlertsPerMinute: config?.maxAlertsPerMinute ?? 100,
      nis2Enabled: config?.nis2Enabled ?? true,
    };
  }

  /**
   * Generate alert from MITRE ICS correlation result
   * @cybersec Maps MITRE correlations to SOC-actionable alerts
   */
  fromMitreCorrelation(result: MitreCorrelationResult): SynapsixAlert | null {
    if (result.confidenceScore < this.config.minConfidence) return null;
    if (!this.checkRateLimit()) return null;
    if (!this.meetsMinSeverity(result.alertSeverity)) return null;

    const alert: SynapsixAlert = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      severity: result.alertSeverity,
      title: result.stealthAttack
        ? `STEALTH: ${result.detectedTechniques.map(t => t.name).join(', ')}`
        : `ICS Threat: ${result.detectedTechniques.map(t => t.name).join(', ')}`,
      description: result.narrative,
      category: result.stealthAttack ? 'semantic_drift_stealth' : 'ot_process_manipulation',
      confidence: result.confidenceScore,
      sources: result.correlationChain.map(step => ({
        module: step.source,
        signalId: step.matchedTechnique,
        confidence: step.confidence,
      })),
      mitreTechniques: result.detectedTechniques.map(t => t.id),
      evidence: this.buildEvidence(result.correlationChain.map(s => ({
        timestamp: s.timestamp,
        module: s.source,
        finding: s.signal,
        data: { technique: s.matchedTechnique, confidence: s.confidence, evidence: s.evidence },
      }))),
      actions: result.recommendedPlaybook.immediateActions.map((action, i) => ({
        type: i === 0 ? 'isolate' as const : 'investigate' as const,
        priority: 'immediate' as const,
        description: action,
        automated: false,
      })),
      stealthIndicator: result.stealthAttack,
      state: 'open',
      nis2Notification: this.generateNIS2Notification(result.alertSeverity),
    };

    this.alerts.push(alert);
    return alert;
  }

  /**
   * Generate alert from IT/OT correlation event
   * @cybersec Maps cross-domain events to SOC-actionable alerts
   */
  fromITOTCorrelation(event: CorrelationEvent): SynapsixAlert | null {
    if (event.confidence < this.config.minConfidence) return null;
    if (!this.checkRateLimit()) return null;
    if (!this.meetsMinSeverity(event.severity)) return null;

    const category: AlertCategory = event.correlationType === 'it_ot_semantic'
      ? 'multi_vector_attack'
      : 'it_ot_lateral_movement';

    const alert: SynapsixAlert = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      severity: event.severity,
      title: `IT/OT Correlation: ${event.correlationType.replace(/_/g, ' ').toUpperCase()}`,
      description: event.description,
      category,
      confidence: event.confidence,
      sources: [
        ...event.itSignals.map(s => ({ module: s.source, signalId: s.id, confidence: 0.8 })),
        ...event.otSignals.map(s => ({ module: s.source, signalId: s.id, confidence: 0.8 })),
      ],
      mitreTechniques: event.attackChain
        .filter(s => s.mitreTechnique)
        .map(s => s.mitreTechnique as string),
      evidence: this.buildEvidence(event.attackChain.map(step => ({
        timestamp: step.timestamp,
        module: step.domain,
        finding: step.action,
        data: { evidence: step.evidence, mitre: step.mitreTechnique || 'none' },
      }))),
      actions: event.recommendedActions.map((action, i) => ({
        type: i === 0 ? 'contain' as const : 'investigate' as const,
        priority: i < 2 ? 'immediate' as const : 'short_term' as const,
        description: action,
        automated: false,
      })),
      stealthIndicator: event.semanticSignals.some(s => s.statisticallyNormal && s.semanticallyShifted),
      state: 'open',
      nis2Notification: this.generateNIS2Notification(event.severity),
    };

    this.alerts.push(alert);
    return alert;
  }

  /**
   * Get all open alerts
   */
  getOpenAlerts(): SynapsixAlert[] {
    return this.alerts.filter(a => a.state === 'open');
  }

  /**
   * Acknowledge an alert
   */
  acknowledge(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && alert.state === 'open') {
      alert.state = 'acknowledged';
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolve(alertId: string, falsePositive: boolean = false): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.state = falsePositive ? 'false_positive' : 'resolved';
      return true;
    }
    return false;
  }

  /**
   * Get alert statistics
   */
  getStats(): { total: number; open: number; critical: number; stealth: number } {
    return {
      total: this.alerts.length,
      open: this.alerts.filter(a => a.state === 'open').length,
      critical: this.alerts.filter(a => a.severity === 'CRITICAL').length,
      stealth: this.alerts.filter(a => a.stealthIndicator).length,
    };
  }

  // ===========================================================================
  // Private
  // ===========================================================================

  private buildEvidence(steps: EvidenceStep[]): AlertEvidence {
    const chainId = uuidv4();
    let hashChain = '';
    for (const step of steps) {
      hashChain = this.simpleHash(hashChain + JSON.stringify(step));
    }

    return {
      chainId,
      steps,
      exportable: true,
      hashChain,
    };
  }

  private generateNIS2Notification(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): NIS2Notification | null {
    if (!this.config.nis2Enabled) return null;
    if (severity !== 'CRITICAL' && severity !== 'HIGH') return null;

    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return {
      required: severity === 'CRITICAL',
      deadline,
      authority: 'ANSSI',
      classification: severity === 'CRITICAL' ? 'Incident significatif' : 'Incident notable',
      notificationTemplate: severity === 'CRITICAL'
        ? 'NIS2-FR-INCIDENT-SIGNIFICATIF-v1'
        : 'NIS2-FR-INCIDENT-NOTABLE-v1',
    };
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    if (now - this.lastMinuteReset > 60_000) {
      this.alertCount = 0;
      this.lastMinuteReset = now;
    }
    if (this.alertCount >= this.config.maxAlertsPerMinute) return false;
    this.alertCount++;
    return true;
  }

  private meetsMinSeverity(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): boolean {
    const order: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    return (order[severity] || 0) >= (order[this.config.minSeverity] || 0);
  }

  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}
