/**
 * MITRE ATT&CK ICS Mapper
 *
 * Maps anomalies from AIOBS detection systems (semantic drift, OT connectors,
 * network monitors) to MITRE ATT&CK ICS tactics and techniques.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  MITRETechnique,
  AttackPattern,
  TechniqueMatch,
  KillChainPhase,
  MITRETactic,
} from '../../core/types/mitre-attack';
import { NormalizedScore, SeverityScore } from '../../core/types/common';
import { getMITREDatabase, getTechniqueById } from './attack-pattern-db';

/** Input anomaly to map against MITRE ATT&CK */
export interface AnomalyInput {
  id: string;
  timestamp: string;
  source: 'semantic_drift' | 'ot_connector' | 'network_monitor' | 'siem' | 'manual';
  severity: 'critical' | 'high' | 'medium' | 'low';

  /** Signal data for pattern matching */
  signals: Record<string, number | string | boolean>;

  /** Affected assets */
  affectedAssets?: { id: string; name: string; type: string; criticality: string }[];

  /** Optional: pre-computed semantic drift data */
  semanticDrift?: {
    overallScore: number;
    statisticallyNormal: boolean;
    semanticallyShifted: boolean;
    decisionBoundaryShift: number;
    temporalConsistency: number;
  };
}

export interface MappingResult {
  anomalyId: string;
  matchedTechniques: TechniqueMatch[];
  matchedTactics: MITRETactic[];
  killChainPhase: KillChainPhase;
  attackConfidence: NormalizedScore;
  matchedPatterns: string[];
  narrative: string;
}

export class MITREICSMapper {
  private database = getMITREDatabase();

  /**
   * Map an anomaly to MITRE ATT&CK ICS techniques
   */
  mapAnomaly(anomaly: AnomalyInput): MappingResult {
    const matchedPatterns: AttackPattern[] = [];
    const techniqueMatches: TechniqueMatch[] = [];

    // Evaluate each attack pattern against the anomaly
    for (const pattern of this.database.attackPatterns) {
      const matchScore = this.evaluatePattern(pattern, anomaly);
      if (matchScore >= pattern.confidenceThreshold) {
        matchedPatterns.push(pattern);

        for (const techId of pattern.techniques) {
          const technique = getTechniqueById(techId);
          if (technique && !techniqueMatches.find(t => t.techniqueId === techId)) {
            techniqueMatches.push({
              techniqueId: techId,
              techniqueName: technique.name,
              confidence: matchScore,
              matchedIndicators: this.getMatchedIndicators(pattern, anomaly),
            });
          }
        }
      }
    }

    // Also do direct technique matching based on anomaly characteristics
    const directMatches = this.directTechniqueMatch(anomaly);
    for (const dm of directMatches) {
      if (!techniqueMatches.find(t => t.techniqueId === dm.techniqueId)) {
        techniqueMatches.push(dm);
      }
    }

    // Derive tactics from matched techniques
    const matchedTactics = this.deriveTactics(techniqueMatches);

    // Determine kill chain phase
    const killChainPhase = this.determineKillChainPhase(matchedTactics);

    // Compute overall attack confidence
    const attackConfidence = this.computeAttackConfidence(techniqueMatches, anomaly);

    // Generate narrative
    const narrative = this.generateNarrative(anomaly, techniqueMatches, matchedTactics);

    return {
      anomalyId: anomaly.id,
      matchedTechniques: techniqueMatches,
      matchedTactics,
      killChainPhase,
      attackConfidence,
      matchedPatterns: matchedPatterns.map(p => p.id),
      narrative,
    };
  }

  /**
   * Evaluate a pattern against an anomaly, returns confidence score
   */
  private evaluatePattern(pattern: AttackPattern, anomaly: AnomalyInput): NormalizedScore {
    let totalScore = 0;
    let matchedRules = 0;

    for (const rule of pattern.detectionRules) {
      const ruleScore = this.evaluateRule(rule, anomaly);
      if (ruleScore > 0) {
        totalScore += ruleScore;
        matchedRules++;
      }
    }

    if (pattern.detectionRules.length === 0) return 0;
    return matchedRules / pattern.detectionRules.length * (totalScore / Math.max(matchedRules, 1));
  }

  /**
   * Evaluate a single detection rule
   */
  private evaluateRule(
    rule: { conditions: { field: string; operator: string; value: string | number | boolean }[]; operator: string },
    anomaly: AnomalyInput
  ): number {
    const results = rule.conditions.map(cond => {
      const value = this.resolveField(cond.field, anomaly);
      if (value === undefined) return false;
      return this.evaluateCondition(value, cond.operator, cond.value);
    });

    if (rule.operator === 'and') {
      return results.every(r => r) ? 1 : 0;
    }
    return results.some(r => r) ? 1 : 0;
  }

  /**
   * Resolve a dotted field path against the anomaly data
   */
  private resolveField(field: string, anomaly: AnomalyInput): number | string | boolean | undefined {
    // Check signals first
    if (anomaly.signals[field] !== undefined) {
      return anomaly.signals[field];
    }

    // Check semantic drift data
    if (field.startsWith('semanticDrift.') && anomaly.semanticDrift) {
      const subField = field.replace('semanticDrift.', '');
      return (anomaly.semanticDrift as Record<string, unknown>)[subField] as number | string | boolean | undefined;
    }
    if (field.startsWith('contextAnalysis.') && anomaly.semanticDrift) {
      const subField = field.replace('contextAnalysis.', '');
      return (anomaly.semanticDrift as Record<string, unknown>)[subField] as number | string | boolean | undefined;
    }
    if (field.startsWith('context.') && anomaly.semanticDrift) {
      const subField = field.replace('context.', '');
      return (anomaly.semanticDrift as Record<string, unknown>)[subField] as number | string | boolean | undefined;
    }

    return undefined;
  }

  private evaluateCondition(
    actual: number | string | boolean,
    operator: string,
    expected: number | string | boolean
  ): boolean {
    switch (operator) {
      case 'eq': return actual === expected;
      case 'neq': return actual !== expected;
      case 'gt': return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
      case 'lt': return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
      case 'gte': return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
      case 'lte': return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
      case 'contains': return typeof actual === 'string' && actual.includes(String(expected));
      default: return false;
    }
  }

  /**
   * Direct technique matching based on anomaly characteristics
   */
  private directTechniqueMatch(anomaly: AnomalyInput): TechniqueMatch[] {
    const matches: TechniqueMatch[] = [];

    // Semantic drift → Spoof Reporting Message (T0856) or Manipulation of Control (T0831)
    if (anomaly.semanticDrift) {
      if (anomaly.semanticDrift.semanticallyShifted && anomaly.semanticDrift.statisticallyNormal) {
        matches.push({
          techniqueId: 'T0856',
          techniqueName: 'Spoof Reporting Message',
          confidence: anomaly.semanticDrift.overallScore,
          matchedIndicators: ['Statistically normal but semantically shifted — possible spoofed reporting'],
        });
      }

      if (anomaly.semanticDrift.decisionBoundaryShift > 0.3) {
        matches.push({
          techniqueId: 'T0831',
          techniqueName: 'Manipulation of Control',
          confidence: anomaly.semanticDrift.decisionBoundaryShift,
          matchedIndicators: [`Decision boundary erosion: ${(anomaly.semanticDrift.decisionBoundaryShift * 100).toFixed(1)}%`],
        });
      }
    }

    // OT source anomalies
    if (anomaly.source === 'ot_connector') {
      if (anomaly.severity === 'critical') {
        matches.push({
          techniqueId: 'T0836',
          techniqueName: 'Modify Parameter',
          confidence: 0.6,
          matchedIndicators: ['Critical OT anomaly detected'],
        });
      }
    }

    return matches;
  }

  private getMatchedIndicators(pattern: AttackPattern, anomaly: AnomalyInput): string[] {
    const indicators: string[] = [];
    indicators.push(`Pattern: ${pattern.name}`);
    if (anomaly.semanticDrift?.semanticallyShifted) {
      indicators.push('Semantic drift detected');
    }
    if (anomaly.severity === 'critical') {
      indicators.push('Critical severity anomaly');
    }
    return indicators;
  }

  private deriveTactics(techniques: TechniqueMatch[]): MITRETactic[] {
    const tactics = new Set<MITRETactic>();
    for (const match of techniques) {
      const technique = getTechniqueById(match.techniqueId);
      if (technique) {
        for (const tactic of technique.tactics) {
          tactics.add(tactic);
        }
      }
    }
    return Array.from(tactics);
  }

  private determineKillChainPhase(tactics: MITRETactic[]): KillChainPhase {
    if (tactics.includes('impact') || tactics.includes('impair_process_control')) {
      return 'actions_on_objectives';
    }
    if (tactics.includes('command_and_control')) {
      return 'command_control';
    }
    if (tactics.includes('persistence')) {
      return 'installation';
    }
    if (tactics.includes('execution') || tactics.includes('privilege_escalation')) {
      return 'exploitation';
    }
    if (tactics.includes('lateral_movement')) {
      return 'delivery';
    }
    if (tactics.includes('initial_access')) {
      return 'delivery';
    }
    if (tactics.includes('discovery') || tactics.includes('collection')) {
      return 'reconnaissance';
    }
    return 'reconnaissance';
  }

  private computeAttackConfidence(
    techniques: TechniqueMatch[],
    anomaly: AnomalyInput
  ): NormalizedScore {
    if (techniques.length === 0) return 0;

    const avgConfidence = techniques.reduce((s, t) => s + t.confidence, 0) / techniques.length;

    // Boost confidence if multiple techniques match (corroborating evidence)
    const corroborationBonus = Math.min(0.2, techniques.length * 0.05);

    // Boost if severity is critical
    const severityBonus = anomaly.severity === 'critical' ? 0.1 : 0;

    return Math.min(1, avgConfidence + corroborationBonus + severityBonus);
  }

  private generateNarrative(
    anomaly: AnomalyInput,
    techniques: TechniqueMatch[],
    tactics: MITRETactic[]
  ): string {
    if (techniques.length === 0) {
      return `Anomaly ${anomaly.id} from ${anomaly.source} — no MITRE ATT&CK ICS mapping found.`;
    }

    const techniqueNames = techniques.map(t => `${t.techniqueName} (${t.techniqueId})`).join(', ');
    const tacticNames = tactics.join(', ');

    let narrative = `Anomaly ${anomaly.id} (${anomaly.severity}) from ${anomaly.source} `;
    narrative += `maps to MITRE ATT&CK ICS techniques: ${techniqueNames}. `;
    narrative += `Tactics involved: ${tacticNames}. `;

    if (anomaly.semanticDrift?.statisticallyNormal && anomaly.semanticDrift?.semanticallyShifted) {
      narrative += 'ALERT: Stealth attack pattern — statistical distribution is normal but operational meaning has shifted. ';
    }

    return narrative;
  }
}
