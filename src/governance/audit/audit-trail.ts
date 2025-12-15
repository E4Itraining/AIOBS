/**
 * Audit Trail Manager
 * Manages audit trails for resources with integrity verification
 */

import { AuditTrail, AuditEntry } from '../../core/types/governance';
import { UUID, ISO8601 } from '../../core/types/common';
import { AuditEngine } from './audit-engine';

/**
 * Audit Trail Manager
 */
export class AuditTrailManager {
  private auditEngine: AuditEngine;

  constructor(auditEngine: AuditEngine) {
    this.auditEngine = auditEngine;
  }

  /**
   * Get complete audit trail for a resource
   */
  async getTrail(resourceId: UUID): Promise<AuditTrail> {
    return this.auditEngine.getTrail(resourceId);
  }

  /**
   * Verify integrity of an audit trail
   */
  async verifyIntegrity(trail: AuditTrail): Promise<IntegrityVerificationResult> {
    const status = this.auditEngine.verifyChainIntegrity(trail.entries);

    return {
      verified: status === 'verified',
      status,
      verifiedAt: new Date().toISOString(),
      entriesChecked: trail.entries.length,
      issues: status === 'tampered' ? ['Chain integrity compromised'] : [],
    };
  }

  /**
   * Generate audit trail summary
   */
  generateSummary(trail: AuditTrail): AuditTrailSummary {
    const entries = trail.entries;

    // Count by action type
    const actionCounts: Record<string, number> = {};
    for (const entry of entries) {
      actionCounts[entry.action.type] = (actionCounts[entry.action.type] || 0) + 1;
    }

    // Count by actor
    const actorCounts: Record<string, number> = {};
    for (const entry of entries) {
      actorCounts[entry.actor.id] = (actorCounts[entry.actor.id] || 0) + 1;
    }

    // Count by outcome
    const outcomeCounts: Record<string, number> = {};
    for (const entry of entries) {
      outcomeCounts[entry.outcome.status] = (outcomeCounts[entry.outcome.status] || 0) + 1;
    }

    return {
      resourceId: trail.resourceId,
      resourceType: trail.resourceType,
      totalEntries: trail.totalCount,
      timeRange: {
        start: trail.firstEntry,
        end: trail.lastEntry,
      },
      actionBreakdown: actionCounts,
      actorBreakdown: actorCounts,
      outcomeBreakdown: outcomeCounts,
      integrityStatus: trail.integrityStatus,
    };
  }

  /**
   * Compare two audit trails
   */
  compareTrails(trail1: AuditTrail, trail2: AuditTrail): AuditTrailComparison {
    const entries1Set = new Set(trail1.entries.map(e => e.id));
    const entries2Set = new Set(trail2.entries.map(e => e.id));

    const commonEntries = trail1.entries.filter(e => entries2Set.has(e.id));
    const uniqueToTrail1 = trail1.entries.filter(e => !entries2Set.has(e.id));
    const uniqueToTrail2 = trail2.entries.filter(e => !entries1Set.has(e.id));

    return {
      trail1Id: trail1.resourceId,
      trail2Id: trail2.resourceId,
      commonEntries: commonEntries.length,
      uniqueToTrail1: uniqueToTrail1.length,
      uniqueToTrail2: uniqueToTrail2.length,
      divergencePoint: this.findDivergencePoint(trail1.entries, trail2.entries),
    };
  }

  /**
   * Find divergence point between trails
   */
  private findDivergencePoint(entries1: AuditEntry[], entries2: AuditEntry[]): ISO8601 | null {
    const minLength = Math.min(entries1.length, entries2.length);

    for (let i = 0; i < minLength; i++) {
      if (entries1[i].hash !== entries2[i].hash) {
        return entries1[i].timestamp;
      }
    }

    if (entries1.length !== entries2.length) {
      return entries1[minLength]?.timestamp || entries2[minLength]?.timestamp || null;
    }

    return null;
  }
}

/**
 * Integrity verification result
 */
export interface IntegrityVerificationResult {
  verified: boolean;
  status: 'verified' | 'unverified' | 'tampered';
  verifiedAt: ISO8601;
  entriesChecked: number;
  issues: string[];
}

/**
 * Audit trail summary
 */
export interface AuditTrailSummary {
  resourceId: UUID;
  resourceType: string;
  totalEntries: number;
  timeRange: {
    start: ISO8601;
    end: ISO8601;
  };
  actionBreakdown: Record<string, number>;
  actorBreakdown: Record<string, number>;
  outcomeBreakdown: Record<string, number>;
  integrityStatus: 'verified' | 'unverified' | 'tampered';
}

/**
 * Audit trail comparison
 */
export interface AuditTrailComparison {
  trail1Id: UUID;
  trail2Id: UUID;
  commonEntries: number;
  uniqueToTrail1: number;
  uniqueToTrail2: number;
  divergencePoint: ISO8601 | null;
}
