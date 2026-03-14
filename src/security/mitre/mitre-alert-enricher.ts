/**
 * MITRE Alert Enricher
 *
 * Enriches AIOBS alerts with MITRE ATT&CK ICS context,
 * providing kill chain position, threat response recommendations,
 * and correlated attack narratives.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  MITREEnrichedAlert,
  TechniqueMatch,
  MITRETactic,
  KillChainPhase,
  MITREAlertContext,
  AffectedAsset,
  ThreatResponse,
  ResponseAction,
} from '../../core/types/mitre-attack';
import { SeverityScore, NormalizedScore } from '../../core/types/common';
import { MITREICSMapper, AnomalyInput } from './mitre-ics-mapper';
import { getTechniqueById } from './attack-pattern-db';

export class MITREAlertEnricher {
  private mapper: MITREICSMapper;
  private enrichedAlerts: Map<string, MITREEnrichedAlert> = new Map();

  constructor() {
    this.mapper = new MITREICSMapper();
  }

  /**
   * Enrich an alert with MITRE ATT&CK ICS context
   */
  enrichAlert(
    alertId: string,
    anomaly: AnomalyInput,
    relatedAlertIds: string[] = []
  ): MITREEnrichedAlert {
    const mapping = this.mapper.mapAnomaly(anomaly);

    const threatSeverity = this.computeThreatSeverity(
      mapping.attackConfidence,
      anomaly.severity,
      mapping.matchedTechniques.length
    );

    const context: MITREAlertContext = {
      alertSource: anomaly.source,
      affectedAssets: (anomaly.affectedAssets || []).map(a => ({
        id: a.id,
        name: a.name,
        type: a.type as AffectedAsset['type'],
        criticality: a.criticality as AffectedAsset['criticality'],
      })),
      relatedAlertIds,
      narrative: mapping.narrative,
      dwellTimeMs: 0,
    };

    const recommendedResponse = this.generateThreatResponse(
      mapping.matchedTechniques,
      mapping.matchedTactics,
      mapping.killChainPhase,
      anomaly.severity
    );

    const enriched: MITREEnrichedAlert = {
      alertId,
      enrichedAt: new Date().toISOString(),
      matchedTechniques: mapping.matchedTechniques,
      matchedTactics: mapping.matchedTactics,
      killChainPhase: mapping.killChainPhase,
      attackConfidence: mapping.attackConfidence,
      threatSeverity,
      context,
      recommendedResponse,
    };

    this.enrichedAlerts.set(alertId, enriched);
    return enriched;
  }

  /**
   * Get all enriched alerts
   */
  getEnrichedAlerts(): MITREEnrichedAlert[] {
    return Array.from(this.enrichedAlerts.values());
  }

  /**
   * Get enriched alert by ID
   */
  getEnrichedAlert(alertId: string): MITREEnrichedAlert | undefined {
    return this.enrichedAlerts.get(alertId);
  }

  /**
   * Find correlated alerts based on MITRE techniques
   */
  findCorrelated(alertId: string): MITREEnrichedAlert[] {
    const alert = this.enrichedAlerts.get(alertId);
    if (!alert) return [];

    const techIds = new Set(alert.matchedTechniques.map(t => t.techniqueId));

    return Array.from(this.enrichedAlerts.values()).filter(other => {
      if (other.alertId === alertId) return false;
      return other.matchedTechniques.some(t => techIds.has(t.techniqueId));
    });
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private computeThreatSeverity(
    confidence: NormalizedScore,
    anomalySeverity: string,
    techniqueCount: number
  ): SeverityScore {
    let base = confidence;

    // Boost for severity
    if (anomalySeverity === 'critical') base = Math.min(1, base + 0.2);
    else if (anomalySeverity === 'high') base = Math.min(1, base + 0.1);

    // Boost for multiple techniques (more complex attack)
    base = Math.min(1, base + techniqueCount * 0.05);

    let severity: SeverityScore['severity'];
    if (base >= 0.8) severity = 'critical';
    else if (base >= 0.6) severity = 'high';
    else if (base >= 0.4) severity = 'medium';
    else if (base >= 0.2) severity = 'low';
    else severity = 'info';

    return { value: base, severity, confidence };
  }

  private generateThreatResponse(
    techniques: TechniqueMatch[],
    tactics: MITRETactic[],
    killChainPhase: KillChainPhase,
    severity: string
  ): ThreatResponse {
    const immediateActions: ResponseAction[] = [];
    const investigationSteps: string[] = [];
    let containmentStrategy: string;
    const escalationPath: string[] = [];
    const mitreMitigations: string[] = [];

    // Collect mitigations from matched techniques
    for (const match of techniques) {
      const technique = getTechniqueById(match.techniqueId);
      if (technique) {
        for (const mitigation of technique.mitigations) {
          if (!mitreMitigations.includes(mitigation)) {
            mitreMitigations.push(mitigation);
          }
        }
      }
    }

    // Generate actions based on kill chain phase
    if (killChainPhase === 'actions_on_objectives' || severity === 'critical') {
      immediateActions.push(
        { action: 'Isolate affected systems', priority: 'immediate', automated: false, description: 'Network isolation of compromised assets' },
        { action: 'Activate incident response plan', priority: 'immediate', automated: false, description: 'Engage IR team and begin formal response' },
        { action: 'Preserve forensic evidence', priority: 'immediate', automated: true, description: 'Snapshot system state, logs, and network captures' },
      );
      containmentStrategy = 'Immediate network isolation of affected OT/AI assets. Engage safety instrumented systems if process manipulation detected.';
      escalationPath.push('SOC Tier 2', 'CSIRT Lead', 'CISO', 'Operations Manager');
    } else if (killChainPhase === 'exploitation' || killChainPhase === 'installation') {
      immediateActions.push(
        { action: 'Increase monitoring on affected assets', priority: 'immediate', automated: true, description: 'Deploy enhanced detection rules' },
        { action: 'Validate access controls', priority: 'short_term', automated: false, description: 'Verify authentication and authorization configs' },
      );
      containmentStrategy = 'Enhanced monitoring with readiness for isolation. Validate all remote access sessions.';
      escalationPath.push('SOC Tier 1', 'SOC Tier 2');
    } else {
      immediateActions.push(
        { action: 'Log and monitor', priority: 'short_term', automated: true, description: 'Track anomaly progression' },
      );
      containmentStrategy = 'Monitor and assess. Prepare containment plan for escalation.';
      escalationPath.push('SOC Tier 1');
    }

    // Investigation steps
    investigationSteps.push(
      'Review detection timeline and triggering signals',
      'Cross-reference with other alerts in the last 24 hours',
      'Check for related OT protocol anomalies',
      'Validate AI model integrity (checksums, version control)',
      'Review network traffic for lateral movement indicators',
    );

    if (tactics.includes('impair_process_control')) {
      investigationSteps.push('Verify physical process parameters against independent sensors');
    }

    return {
      immediateActions,
      investigationSteps,
      containmentStrategy,
      escalationPath,
      mitreMitigations,
    };
  }
}
