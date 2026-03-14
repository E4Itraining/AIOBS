/**
 * MITRE ATT&CK ICS Correlator
 *
 * Correlates detected anomalies (semantic drift, OT, network) against
 * MITRE ATT&CK for ICS tactics and techniques. Focus on ICS-specific
 * tactics relevant to defense/OIV environments.
 *
 * Key techniques:
 * - T0836 (Modify Parameter)
 * - T0855 (Unauthorized Command Message)
 * - T0840 (Network Connection Enumeration)
 * - T1021 (Remote Services lateral movement)
 * - T1570 (Lateral Tool Transfer)
 * - T0816 (Device Restart/Shutdown)
 *
 * @cybersec Core detection-to-action correlation for COMCYBER playbooks
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

export interface MitreTactic {
  id: string;
  name: string;
  shortName: string;
}

export interface MitreTechnique {
  id: string;
  name: string;
  tactics: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detectionHints: string[];
}

export interface CorrelationStep {
  timestamp: string;
  source: string;
  signal: string;
  matchedTechnique: string;
  confidence: number;
  evidence: string;
}

export interface COMCYBERPlaybook {
  id: string;
  name: string;
  classification: 'DIFFUSION_RESTREINTE' | 'NON_PROTEGE';
  immediateActions: string[];
  investigationSteps: string[];
  escalationPath: string[];
  containmentStrategy: string;
  reportingRequirements: string[];
}

export interface MitreCorrelationResult {
  id: string;
  timestamp: string;
  detectedTactics: MitreTactic[];
  detectedTechniques: MitreTechnique[];
  confidenceScore: number;
  correlationChain: CorrelationStep[];
  alertSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendedPlaybook: COMCYBERPlaybook;
  narrative: string;
  /** Whether statistical metrics are normal but semantic anomaly detected */
  stealthAttack: boolean;
}

export interface AnomalySignal {
  id: string;
  timestamp: string;
  source: 'semantic_drift' | 'ot_connector' | 'network_monitor' | 'it_connector' | 'trm_agent';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signals: Record<string, number | string | boolean>;
  affectedAssets: string[];
  /** Semantic drift metadata */
  semanticDrift?: {
    overallScore: number;
    statisticallyNormal: boolean;
    semanticallyShifted: boolean;
    driftType: 'semantic' | 'statistical' | 'both';
  };
}

// ============================================================================
// ICS Technique Database
// ============================================================================

const ICS_TECHNIQUES: MitreTechnique[] = [
  {
    id: 'T0836',
    name: 'Modify Parameter',
    tactics: ['impair_process_control'],
    severity: 'CRITICAL',
    description: 'Adversaries modify parameters of a control system to alter the intended operation.',
    detectionHints: ['setpoint_change', 'parameter_deviation', 'unauthorized_write'],
  },
  {
    id: 'T0855',
    name: 'Unauthorized Command Message',
    tactics: ['impair_process_control', 'execution'],
    severity: 'CRITICAL',
    description: 'Adversaries send unauthorized command messages to instruct control system assets to perform actions outside intended functionality.',
    detectionHints: ['command_anomaly', 'unexpected_instruction', 'protocol_violation'],
  },
  {
    id: 'T0840',
    name: 'Network Connection Enumeration',
    tactics: ['discovery'],
    severity: 'MEDIUM',
    description: 'Adversaries enumerate network connections for host discovery and path identification.',
    detectionHints: ['scan_detected', 'enumeration_activity', 'discovery_pattern'],
  },
  {
    id: 'T1021',
    name: 'Remote Services',
    tactics: ['lateral_movement'],
    severity: 'HIGH',
    description: 'Adversaries use remote services to move laterally within the ICS network.',
    detectionHints: ['lateral_movement', 'remote_login', 'service_access'],
  },
  {
    id: 'T1570',
    name: 'Lateral Tool Transfer',
    tactics: ['lateral_movement'],
    severity: 'HIGH',
    description: 'Adversaries transfer tools or files between systems within a compromised environment.',
    detectionHints: ['file_transfer', 'tool_deployment', 'binary_transfer'],
  },
  {
    id: 'T0816',
    name: 'Device Restart/Shutdown',
    tactics: ['inhibit_response_function'],
    severity: 'CRITICAL',
    description: 'Adversaries restart or shut down devices to cause disruption.',
    detectionHints: ['device_restart', 'unexpected_shutdown', 'availability_impact'],
  },
  {
    id: 'T0856',
    name: 'Spoof Reporting Message',
    tactics: ['evasion', 'impair_process_control'],
    severity: 'CRITICAL',
    description: 'Adversaries spoof reporting messages to hide actual system state from operators.',
    detectionHints: ['semantic_anomaly', 'statistically_normal_semantically_shifted', 'reporting_inconsistency'],
  },
  {
    id: 'T0831',
    name: 'Manipulation of Control',
    tactics: ['impair_process_control'],
    severity: 'CRITICAL',
    description: 'Adversaries manipulate the control logic of PLCs or controllers.',
    detectionHints: ['control_logic_change', 'decision_boundary_shift', 'output_manipulation'],
  },
  {
    id: 'T0882',
    name: 'Theft of Operational Information',
    tactics: ['collection'],
    severity: 'HIGH',
    description: 'Adversaries collect and exfiltrate operational information from the ICS environment.',
    detectionHints: ['data_exfiltration', 'bulk_read', 'information_gathering'],
  },
  {
    id: 'T0879',
    name: 'Damage to Property',
    tactics: ['impact'],
    severity: 'CRITICAL',
    description: 'Adversaries cause physical damage to equipment through process manipulation.',
    detectionHints: ['safety_limit_exceeded', 'equipment_stress', 'physical_damage_risk'],
  },
];

const ICS_TACTICS: MitreTactic[] = [
  { id: 'TA0108', name: 'Initial Access', shortName: 'initial_access' },
  { id: 'TA0104', name: 'Execution', shortName: 'execution' },
  { id: 'TA0110', name: 'Persistence', shortName: 'persistence' },
  { id: 'TA0111', name: 'Privilege Escalation', shortName: 'privilege_escalation' },
  { id: 'TA0103', name: 'Evasion', shortName: 'evasion' },
  { id: 'TA0102', name: 'Discovery', shortName: 'discovery' },
  { id: 'TA0109', name: 'Lateral Movement', shortName: 'lateral_movement' },
  { id: 'TA0100', name: 'Collection', shortName: 'collection' },
  { id: 'TA0101', name: 'Command and Control', shortName: 'command_and_control' },
  { id: 'TA0107', name: 'Inhibit Response Function', shortName: 'inhibit_response_function' },
  { id: 'TA0106', name: 'Impair Process Control', shortName: 'impair_process_control' },
  { id: 'TA0105', name: 'Impact', shortName: 'impact' },
];

// ============================================================================
// Correlator Implementation
// ============================================================================

/**
 * @cybersec Correlates anomalies to MITRE ATT&CK ICS TTPs for COMCYBER response
 */
export class MitreICSCorrelator {
  private techniques: MitreTechnique[];
  private tactics: MitreTactic[];

  constructor() {
    this.techniques = ICS_TECHNIQUES;
    this.tactics = ICS_TACTICS;
  }

  /**
   * Correlate an anomaly signal against MITRE ATT&CK ICS framework
   *
   * @cybersec Maps detected anomalies to ICS-specific TTPs
   */
  correlate(signal: AnomalySignal): MitreCorrelationResult {
    const correlationChain: CorrelationStep[] = [];
    const matchedTechniques: MitreTechnique[] = [];
    let stealthAttack = false;

    // Phase 1: Direct signal-to-technique matching
    for (const technique of this.techniques) {
      const matchScore = this.matchTechnique(technique, signal);
      if (matchScore > 0.3) {
        matchedTechniques.push(technique);
        correlationChain.push({
          timestamp: new Date().toISOString(),
          source: signal.source,
          signal: `${signal.source}:${signal.severity}`,
          matchedTechnique: technique.id,
          confidence: matchScore,
          evidence: this.buildEvidence(technique, signal),
        });
      }
    }

    // Phase 2: Semantic drift stealth detection
    if (signal.semanticDrift?.statisticallyNormal && signal.semanticDrift?.semanticallyShifted) {
      stealthAttack = true;
      const spoofTechnique = this.techniques.find(t => t.id === 'T0856');
      if (spoofTechnique && !matchedTechniques.find(t => t.id === 'T0856')) {
        matchedTechniques.push(spoofTechnique);
        correlationChain.push({
          timestamp: new Date().toISOString(),
          source: 'semantic_drift_analyzer',
          signal: 'stealth_semantic_shift',
          matchedTechnique: 'T0856',
          confidence: signal.semanticDrift.overallScore,
          evidence: 'Statistical distribution normal BUT operational meaning shifted — stealth attack pattern',
        });
      }
    }

    // Phase 3: Derive tactics from matched techniques
    const detectedTactics = this.deriveTactics(matchedTechniques);

    // Phase 4: Compute overall confidence
    const confidenceScore = this.computeConfidence(correlationChain, signal);

    // Phase 5: Determine alert severity
    const alertSeverity = this.determineAlertSeverity(matchedTechniques, stealthAttack, confidenceScore);

    // Phase 6: Generate playbook
    const recommendedPlaybook = this.generatePlaybook(matchedTechniques, alertSeverity, stealthAttack);

    // Phase 7: Generate narrative
    const narrative = this.generateNarrative(signal, matchedTechniques, detectedTactics, stealthAttack);

    return {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      detectedTactics: detectedTactics,
      detectedTechniques: matchedTechniques,
      confidenceScore,
      correlationChain,
      alertSeverity,
      recommendedPlaybook,
      narrative,
      stealthAttack,
    };
  }

  /**
   * Get all registered ICS techniques
   */
  getTechniques(): MitreTechnique[] {
    return [...this.techniques];
  }

  /**
   * Get all registered ICS tactics
   */
  getTactics(): MitreTactic[] {
    return [...this.tactics];
  }

  // ===========================================================================
  // Private methods
  // ===========================================================================

  private matchTechnique(technique: MitreTechnique, signal: AnomalySignal): number {
    let score = 0;
    let matchCount = 0;

    for (const hint of technique.detectionHints) {
      // Check direct signal match
      if (signal.signals[hint] !== undefined) {
        const val = signal.signals[hint];
        if (typeof val === 'boolean' && val) {
          score += 1;
          matchCount++;
        } else if (typeof val === 'number' && val > 0.5) {
          score += val;
          matchCount++;
        } else if (typeof val === 'string' && val.length > 0) {
          score += 0.7;
          matchCount++;
        }
      }

      // Check semantic drift signals
      if (hint === 'semantic_anomaly' && signal.semanticDrift?.semanticallyShifted) {
        score += signal.semanticDrift.overallScore;
        matchCount++;
      }
      if (hint === 'statistically_normal_semantically_shifted' &&
          signal.semanticDrift?.statisticallyNormal &&
          signal.semanticDrift?.semanticallyShifted) {
        score += 0.9;
        matchCount++;
      }
      if (hint === 'decision_boundary_shift' && signal.semanticDrift?.overallScore) {
        if (signal.semanticDrift.overallScore > 0.3) {
          score += signal.semanticDrift.overallScore;
          matchCount++;
        }
      }
    }

    if (matchCount === 0) return 0;
    return Math.min(1, score / matchCount);
  }

  private deriveTactics(techniques: MitreTechnique[]): MitreTactic[] {
    const tacticShortNames = new Set<string>();
    for (const tech of techniques) {
      for (const tactic of tech.tactics) {
        tacticShortNames.add(tactic);
      }
    }
    return this.tactics.filter(t => tacticShortNames.has(t.shortName));
  }

  private computeConfidence(chain: CorrelationStep[], signal: AnomalySignal): number {
    if (chain.length === 0) return 0;

    const avgConfidence = chain.reduce((s, c) => s + c.confidence, 0) / chain.length;
    const corroborationBonus = Math.min(0.2, chain.length * 0.05);
    const severityBonus = signal.severity === 'CRITICAL' ? 0.1 : signal.severity === 'HIGH' ? 0.05 : 0;

    return Math.min(1, avgConfidence + corroborationBonus + severityBonus);
  }

  private determineAlertSeverity(
    techniques: MitreTechnique[],
    stealthAttack: boolean,
    confidence: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (stealthAttack && confidence > 0.6) return 'CRITICAL';
    if (techniques.some(t => t.severity === 'CRITICAL') && confidence > 0.5) return 'CRITICAL';
    if (techniques.some(t => t.severity === 'HIGH') && confidence > 0.4) return 'HIGH';
    if (techniques.length > 2) return 'HIGH';
    if (techniques.length > 0) return 'MEDIUM';
    return 'LOW';
  }

  private generatePlaybook(
    techniques: MitreTechnique[],
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    stealthAttack: boolean
  ): COMCYBERPlaybook {
    const immediateActions: string[] = [];
    const investigationSteps: string[] = [];
    const escalationPath: string[] = [];
    const reportingRequirements: string[] = [];

    if (severity === 'CRITICAL') {
      immediateActions.push('Isolate affected OT segment from IT network');
      immediateActions.push('Activate COMCYBER incident response protocol');
      immediateActions.push('Preserve forensic evidence on affected systems');
      escalationPath.push('SOC L3', 'COMCYBER CSIRT', 'ANSSI notification (NIS2)');
      reportingRequirements.push('NIS2 24h initial notification to ANSSI');
      reportingRequirements.push('72h detailed incident report');
    } else if (severity === 'HIGH') {
      immediateActions.push('Increase monitoring on affected segment');
      immediateActions.push('Notify SOC L2 for immediate investigation');
      escalationPath.push('SOC L2', 'SOC L3 if confirmed');
    } else {
      immediateActions.push('Log and continue monitoring');
      escalationPath.push('SOC L1');
    }

    if (stealthAttack) {
      immediateActions.unshift('STEALTH ATTACK: Switch to manual verification of OT setpoints');
      investigationSteps.push('Compare AI model outputs against physical sensor readings');
      investigationSteps.push('Verify OPC-UA setpoint integrity via independent channel');
      investigationSteps.push('Analyze inference stream for adversarial perturbation patterns');
    }

    for (const tech of techniques) {
      investigationSteps.push(`Investigate ${tech.name} (${tech.id}): ${tech.description}`);
    }

    return {
      id: uuidv4(),
      name: stealthAttack
        ? 'COMCYBER-STEALTH-SEMANTIC-RESPONSE'
        : `COMCYBER-ICS-${severity}-RESPONSE`,
      classification: severity === 'CRITICAL' ? 'DIFFUSION_RESTREINTE' : 'NON_PROTEGE',
      immediateActions,
      investigationSteps,
      escalationPath,
      containmentStrategy: severity === 'CRITICAL'
        ? 'Network segmentation + OT isolation + manual fallback'
        : 'Enhanced monitoring + targeted investigation',
      reportingRequirements,
    };
  }

  private generateNarrative(
    signal: AnomalySignal,
    techniques: MitreTechnique[],
    tactics: MitreTactic[],
    stealthAttack: boolean
  ): string {
    if (techniques.length === 0) {
      return `Anomaly ${signal.id} from ${signal.source} — no MITRE ATT&CK ICS correlation found.`;
    }

    const techNames = techniques.map(t => `${t.name} (${t.id})`).join(', ');
    const tacticNames = tactics.map(t => t.name).join(', ');

    let narrative = `[${signal.severity}] Anomaly from ${signal.source} correlates with MITRE ATT&CK ICS: ${techNames}. `;
    narrative += `Tactics: ${tacticNames}. `;

    if (stealthAttack) {
      narrative += 'CRITICAL: Stealth attack pattern detected — statistical distribution normal but operational meaning compromised. ';
      narrative += 'Classical SIEM/EDR will NOT detect this threat. ';
    }

    return narrative;
  }

  private buildEvidence(technique: MitreTechnique, signal: AnomalySignal): string {
    const parts: string[] = [`Technique ${technique.id} matched via ${signal.source}`];
    if (signal.semanticDrift?.semanticallyShifted) {
      parts.push('semantic drift confirmed');
    }
    if (signal.severity === 'CRITICAL') {
      parts.push('critical severity anomaly');
    }
    return parts.join('; ');
  }
}
