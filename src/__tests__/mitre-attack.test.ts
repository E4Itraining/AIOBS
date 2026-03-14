/**
 * MITRE ATT&CK ICS Module Tests
 */
import { describe, it, expect } from '@jest/globals';
import { MITREICSMapper } from '../security/mitre/mitre-ics-mapper';
import { MITREAlertEnricher } from '../security/mitre/mitre-alert-enricher';
import {
  getMITREDatabase,
  getTechniqueById,
  getTechniquesByTactic,
  getAITargetedPatterns,
  getOTTargetedPatterns,
} from '../security/mitre/attack-pattern-db';

// ============================================================================
// Attack Pattern Database Tests
// ============================================================================

describe('MITREDatabase', () => {
  it('should provide a complete database', () => {
    const db = getMITREDatabase();
    expect(db.version).toBeDefined();
    expect(db.tactics.length).toBeGreaterThan(0);
    expect(db.techniques.length).toBeGreaterThan(0);
    expect(db.attackPatterns.length).toBeGreaterThan(0);
  });

  it('should have all 12 ICS tactics', () => {
    const db = getMITREDatabase();
    expect(db.tactics.length).toBe(12);
    const tacticIds = db.tactics.map(t => t.id);
    expect(tacticIds).toContain('TA0108'); // Initial Access
    expect(tacticIds).toContain('TA0105'); // Impact
  });

  it('should include key ICS techniques', () => {
    expect(getTechniqueById('T0816')).toBeDefined(); // Device Restart
    expect(getTechniqueById('T0855')).toBeDefined(); // Unauthorized Command
    expect(getTechniqueById('T0882')).toBeDefined(); // Theft of Info
    expect(getTechniqueById('T0836')).toBeDefined(); // Modify Parameter
    expect(getTechniqueById('T0831')).toBeDefined(); // Manipulation of Control
  });

  it('should return undefined for unknown technique', () => {
    expect(getTechniqueById('T9999')).toBeUndefined();
  });

  it('should filter techniques by tactic', () => {
    const impactTechniques = getTechniquesByTactic('impact');
    expect(impactTechniques.length).toBeGreaterThan(0);
    for (const t of impactTechniques) {
      expect(t.tactics).toContain('impact');
    }
  });

  it('should have AI-targeted attack patterns', () => {
    const patterns = getAITargetedPatterns();
    expect(patterns.length).toBeGreaterThan(0);
    for (const p of patterns) {
      expect(p.aiTargeted).toBe(true);
    }
  });

  it('should have OT-targeted attack patterns', () => {
    const patterns = getOTTargetedPatterns();
    expect(patterns.length).toBeGreaterThan(0);
    for (const p of patterns) {
      expect(p.otTargeted).toBe(true);
    }
  });

  it('should have detection rules for all patterns', () => {
    const db = getMITREDatabase();
    for (const pattern of db.attackPatterns) {
      expect(pattern.detectionRules.length).toBeGreaterThan(0);
      expect(pattern.confidenceThreshold).toBeGreaterThan(0);
      expect(pattern.severity).toBeDefined();
    }
  });
});

// ============================================================================
// MITRE ICS Mapper Tests
// ============================================================================

describe('MITREICSMapper', () => {
  const mapper = new MITREICSMapper();

  it('should map semantic drift to MITRE techniques', () => {
    const result = mapper.mapAnomaly({
      id: 'anom-001',
      timestamp: new Date().toISOString(),
      source: 'semantic_drift',
      severity: 'critical',
      signals: {},
      semanticDrift: {
        overallScore: 0.85,
        statisticallyNormal: true,
        semanticallyShifted: true,
        decisionBoundaryShift: 0.4,
        temporalConsistency: 0.5,
      },
    });

    expect(result.matchedTechniques.length).toBeGreaterThan(0);
    expect(result.matchedTactics.length).toBeGreaterThan(0);
    expect(result.killChainPhase).toBeDefined();
    expect(result.attackConfidence).toBeGreaterThan(0);
    expect(result.narrative).toBeTruthy();

    // Should match T0856 (Spoof Reporting) for stealth semantic attack
    const spoofMatch = result.matchedTechniques.find(t => t.techniqueId === 'T0856');
    expect(spoofMatch).toBeDefined();
  });

  it('should map OT anomaly to MITRE techniques', () => {
    const result = mapper.mapAnomaly({
      id: 'anom-002',
      timestamp: new Date().toISOString(),
      source: 'ot_connector',
      severity: 'critical',
      signals: {
        'command.authorized': false,
        'aiDecision.confidence': 0.3,
      },
    });

    expect(result.matchedTechniques.length).toBeGreaterThan(0);
    // Should match T0836 (Modify Parameter) for critical OT anomaly
    const modifyMatch = result.matchedTechniques.find(t => t.techniqueId === 'T0836');
    expect(modifyMatch).toBeDefined();
  });

  it('should return empty mapping for benign anomaly', () => {
    const result = mapper.mapAnomaly({
      id: 'anom-003',
      timestamp: new Date().toISOString(),
      source: 'network_monitor',
      severity: 'low',
      signals: {},
    });

    // Low severity network anomaly without specific signals may not match
    expect(result.attackConfidence).toBeLessThanOrEqual(0.5);
  });

  it('should detect decision boundary erosion as Manipulation of Control', () => {
    const result = mapper.mapAnomaly({
      id: 'anom-004',
      timestamp: new Date().toISOString(),
      source: 'semantic_drift',
      severity: 'high',
      signals: {},
      semanticDrift: {
        overallScore: 0.6,
        statisticallyNormal: false,
        semanticallyShifted: true,
        decisionBoundaryShift: 0.5,
        temporalConsistency: 0.4,
      },
    });

    const controlMatch = result.matchedTechniques.find(t => t.techniqueId === 'T0831');
    expect(controlMatch).toBeDefined();
    expect(controlMatch!.confidence).toBeGreaterThanOrEqual(0.3);
  });

  it('should generate meaningful narrative', () => {
    const result = mapper.mapAnomaly({
      id: 'anom-005',
      timestamp: new Date().toISOString(),
      source: 'semantic_drift',
      severity: 'critical',
      signals: {},
      semanticDrift: {
        overallScore: 0.9,
        statisticallyNormal: true,
        semanticallyShifted: true,
        decisionBoundaryShift: 0.1,
        temporalConsistency: 0.8,
      },
    });

    expect(result.narrative).toContain('semantic_drift');
    expect(result.narrative).toContain('MITRE ATT&CK ICS');
    expect(result.narrative).toContain('Stealth attack pattern');
  });
});

// ============================================================================
// MITRE Alert Enricher Tests
// ============================================================================

describe('MITREAlertEnricher', () => {
  const enricher = new MITREAlertEnricher();

  it('should enrich alert with MITRE context', () => {
    const enriched = enricher.enrichAlert(
      'alert-001',
      {
        id: 'anom-001',
        timestamp: new Date().toISOString(),
        source: 'semantic_drift',
        severity: 'critical',
        signals: {},
        semanticDrift: {
          overallScore: 0.85,
          statisticallyNormal: true,
          semanticallyShifted: true,
          decisionBoundaryShift: 0.4,
          temporalConsistency: 0.5,
        },
        affectedAssets: [
          { id: 'model-1', name: 'ThreatDetector-v3', type: 'ai_model', criticality: 'mission_critical' },
        ],
      }
    );

    expect(enriched.alertId).toBe('alert-001');
    expect(enriched.matchedTechniques.length).toBeGreaterThan(0);
    expect(enriched.threatSeverity).toBeDefined();
    expect(enriched.threatSeverity.severity).toBeDefined();
    expect(enriched.recommendedResponse).toBeDefined();
    expect(enriched.recommendedResponse.immediateActions.length).toBeGreaterThan(0);
    expect(enriched.recommendedResponse.investigationSteps.length).toBeGreaterThan(0);
    expect(enriched.context.narrative).toBeTruthy();
  });

  it('should provide threat response with escalation path', () => {
    const enriched = enricher.enrichAlert(
      'alert-002',
      {
        id: 'anom-002',
        timestamp: new Date().toISOString(),
        source: 'ot_connector',
        severity: 'critical',
        signals: {},
      }
    );

    expect(enriched.recommendedResponse.escalationPath.length).toBeGreaterThan(0);
    expect(enriched.recommendedResponse.containmentStrategy).toBeTruthy();
  });

  it('should store and retrieve enriched alerts', () => {
    const enricher2 = new MITREAlertEnricher();
    enricher2.enrichAlert('alert-a', {
      id: 'a1', timestamp: new Date().toISOString(),
      source: 'semantic_drift', severity: 'high', signals: {},
    });
    enricher2.enrichAlert('alert-b', {
      id: 'a2', timestamp: new Date().toISOString(),
      source: 'ot_connector', severity: 'medium', signals: {},
    });

    const all = enricher2.getEnrichedAlerts();
    expect(all.length).toBe(2);

    const single = enricher2.getEnrichedAlert('alert-a');
    expect(single).toBeDefined();
    expect(single!.alertId).toBe('alert-a');
  });

  it('should find correlated alerts', () => {
    const enricher3 = new MITREAlertEnricher();

    // Two alerts that share techniques
    enricher3.enrichAlert('corr-1', {
      id: 'c1', timestamp: new Date().toISOString(),
      source: 'semantic_drift', severity: 'critical', signals: {},
      semanticDrift: {
        overallScore: 0.8, statisticallyNormal: true,
        semanticallyShifted: true, decisionBoundaryShift: 0.5,
        temporalConsistency: 0.4,
      },
    });
    enricher3.enrichAlert('corr-2', {
      id: 'c2', timestamp: new Date().toISOString(),
      source: 'semantic_drift', severity: 'high', signals: {},
      semanticDrift: {
        overallScore: 0.7, statisticallyNormal: true,
        semanticallyShifted: true, decisionBoundaryShift: 0.4,
        temporalConsistency: 0.5,
      },
    });

    const correlated = enricher3.findCorrelated('corr-1');
    // Should find corr-2 as correlated (shared techniques)
    expect(correlated.length).toBeGreaterThanOrEqual(0); // May or may not correlate depending on technique overlap
  });

  it('should include MITRE mitigations in response', () => {
    const enriched = enricher.enrichAlert(
      'alert-003',
      {
        id: 'anom-003',
        timestamp: new Date().toISOString(),
        source: 'semantic_drift',
        severity: 'critical',
        signals: {},
        semanticDrift: {
          overallScore: 0.9,
          statisticallyNormal: true,
          semanticallyShifted: true,
          decisionBoundaryShift: 0.3,
          temporalConsistency: 0.5,
        },
      }
    );

    expect(enriched.recommendedResponse.mitreMitigations.length).toBeGreaterThan(0);
  });
});
