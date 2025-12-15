/**
 * Audit Engine
 * Core audit logging with blockchain-style integrity verification
 */

import {
  AuditEntry,
  AuditableAction,
  ExecutionContext,
  ActionOutcome,
  RetentionPolicy,
  AuditTrail,
  AuditQuery,
  AuditCategory,
  AuditActionType,
} from '../../core/types/governance';
import { UUID, ISO8601, SHA256, ActorIdentity, ResourceIdentifier, JSONObject } from '../../core/types/common';
import { createHash } from 'crypto';

/**
 * Configuration for the Audit Engine
 */
export interface AuditEngineConfig {
  // Storage backend
  storageBackend: 'memory' | 'database' | 'blockchain';

  // Retention
  defaultRetentionDays: number;
  archiveRetentionDays: number;

  // Integrity
  enableIntegrityVerification: boolean;
  verificationFrequency: number; // hours

  // Encryption
  encryptSensitiveData: boolean;
  encryptionKey?: string;
}

/**
 * Audit Engine for immutable logging
 */
export class AuditEngine {
  private config: AuditEngineConfig;
  private entries: Map<UUID, AuditEntry> = new Map();
  private sequenceCounter = 0;
  private lastHash: SHA256 = '0'.repeat(64);

  constructor(config: Partial<AuditEngineConfig> = {}) {
    this.config = this.mergeWithDefaults(config);
  }

  /**
   * Log an auditable action
   */
  async log(params: AuditLogParams): Promise<AuditEntry> {
    const timestamp = new Date().toISOString();
    const id = this.generateId();
    this.sequenceCounter++;

    // Build the audit entry
    const entry: AuditEntry = {
      id,
      timestamp,
      sequenceNumber: this.sequenceCounter,
      actor: params.actor,
      action: params.action,
      resource: params.resource,
      context: params.context,
      outcome: params.outcome,
      hash: '', // Will be computed
      previousHash: this.lastHash,
      retentionPolicy: params.retentionPolicy || this.getDefaultRetentionPolicy(),
    };

    // Compute hash for integrity chain
    entry.hash = this.computeHash(entry);
    this.lastHash = entry.hash;

    // Store the entry
    await this.store(entry);

    return entry;
  }

  /**
   * Log a model deployment
   */
  async logModelDeployment(
    actor: ActorIdentity,
    modelId: string,
    version: string,
    environment: string,
    outcome: ActionOutcome,
    context: ExecutionContext
  ): Promise<AuditEntry> {
    return this.log({
      actor,
      action: {
        type: 'deploy',
        category: 'model',
        name: 'model_deployment',
        description: `Deploy model ${modelId} version ${version} to ${environment}`,
        parameters: { modelId, version, environment },
        sensitivityLevel: 'internal',
      },
      resource: {
        type: 'model',
        id: modelId,
        name: modelId,
        version,
      },
      context,
      outcome,
    });
  }

  /**
   * Log a data access
   */
  async logDataAccess(
    actor: ActorIdentity,
    datasetId: string,
    accessType: 'read' | 'export',
    purpose: string,
    outcome: ActionOutcome,
    context: ExecutionContext
  ): Promise<AuditEntry> {
    return this.log({
      actor,
      action: {
        type: accessType,
        category: 'data',
        name: `data_${accessType}`,
        description: `${accessType} access to dataset ${datasetId} for ${purpose}`,
        parameters: { datasetId, purpose },
        sensitivityLevel: 'confidential',
      },
      resource: {
        type: 'dataset',
        id: datasetId,
        name: datasetId,
      },
      context,
      outcome,
    });
  }

  /**
   * Log a configuration change
   */
  async logConfigChange(
    actor: ActorIdentity,
    resourceType: string,
    resourceId: string,
    changes: { field: string; oldValue: any; newValue: any }[],
    outcome: ActionOutcome,
    context: ExecutionContext
  ): Promise<AuditEntry> {
    return this.log({
      actor,
      action: {
        type: 'configure',
        category: 'governance',
        name: 'configuration_change',
        description: `Configuration change for ${resourceType} ${resourceId}`,
        parameters: { resourceType, changes },
        sensitivityLevel: 'internal',
      },
      resource: {
        type: resourceType as any,
        id: resourceId,
        name: resourceId,
      },
      context,
      outcome: {
        ...outcome,
        changes: changes.map(c => ({
          field: c.field,
          previousValue: c.oldValue,
          newValue: c.newValue,
          changeType: 'modified' as const,
        })),
      },
    });
  }

  /**
   * Query audit entries
   */
  async query(query: AuditQuery): Promise<{ entries: AuditEntry[]; total: number }> {
    let results = Array.from(this.entries.values());

    // Apply filters
    if (query.startTime) {
      results = results.filter(e => e.timestamp >= query.startTime!);
    }
    if (query.endTime) {
      results = results.filter(e => e.timestamp <= query.endTime!);
    }
    if (query.actors?.length) {
      results = results.filter(e => query.actors!.includes(e.actor.id));
    }
    if (query.actions?.length) {
      results = results.filter(e => query.actions!.includes(e.action.type));
    }
    if (query.categories?.length) {
      results = results.filter(e => query.categories!.includes(e.action.category));
    }
    if (query.outcomes?.length) {
      results = results.filter(e => query.outcomes!.includes(e.outcome.status));
    }
    if (query.searchText) {
      const searchLower = query.searchText.toLowerCase();
      results = results.filter(e =>
        e.action.description.toLowerCase().includes(searchLower) ||
        e.resource.name.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    results.sort((a, b) => {
      const aVal = query.sortBy === 'timestamp' ? a.timestamp :
                   query.sortBy === 'actor' ? a.actor.name :
                   query.sortBy === 'action' ? a.action.name :
                   a.resource.name;
      const bVal = query.sortBy === 'timestamp' ? b.timestamp :
                   query.sortBy === 'actor' ? b.actor.name :
                   query.sortBy === 'action' ? b.action.name :
                   b.resource.name;

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return query.sortOrder === 'desc' ? -comparison : comparison;
    });

    const total = results.length;

    // Paginate
    results = results.slice(query.offset, query.offset + query.limit);

    return { entries: results, total };
  }

  /**
   * Get audit trail for a resource
   */
  async getTrail(resourceId: UUID): Promise<AuditTrail> {
    const entries = Array.from(this.entries.values())
      .filter(e => e.resource.id === resourceId)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    // Verify integrity
    const integrityStatus = this.verifyChainIntegrity(entries);

    return {
      resourceId,
      resourceType: entries[0]?.resource.type || 'unknown',
      entries,
      totalCount: entries.length,
      firstEntry: entries[0]?.timestamp || new Date().toISOString(),
      lastEntry: entries[entries.length - 1]?.timestamp || new Date().toISOString(),
      integrityStatus,
      lastVerified: new Date().toISOString(),
    };
  }

  /**
   * Verify integrity of audit chain
   */
  verifyChainIntegrity(entries: AuditEntry[]): 'verified' | 'unverified' | 'tampered' {
    if (entries.length === 0) return 'unverified';

    let previousHash = entries[0].previousHash;

    for (const entry of entries) {
      // Verify previous hash link
      if (entry.previousHash !== previousHash) {
        return 'tampered';
      }

      // Verify entry hash
      const computedHash = this.computeHash(entry);
      if (computedHash !== entry.hash) {
        return 'tampered';
      }

      previousHash = entry.hash;
    }

    return 'verified';
  }

  /**
   * Export entries for compliance
   */
  async exportForCompliance(
    query: AuditQuery,
    format: 'json' | 'csv'
  ): Promise<string> {
    const { entries } = await this.query(query);

    if (format === 'json') {
      return JSON.stringify(entries, null, 2);
    }

    // CSV format
    const headers = [
      'id', 'timestamp', 'sequence', 'actor_type', 'actor_id', 'actor_name',
      'action_type', 'action_category', 'action_name', 'action_description',
      'resource_type', 'resource_id', 'resource_name',
      'outcome_status', 'outcome_duration_ms', 'hash'
    ];

    const rows = entries.map(e => [
      e.id,
      e.timestamp,
      e.sequenceNumber,
      e.actor.type,
      e.actor.id,
      e.actor.name,
      e.action.type,
      e.action.category,
      e.action.name,
      `"${e.action.description.replace(/"/g, '""')}"`,
      e.resource.type,
      e.resource.id,
      e.resource.name,
      e.outcome.status,
      e.outcome.durationMs,
      e.hash,
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Store audit entry
   */
  private async store(entry: AuditEntry): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  /**
   * Compute hash for entry
   */
  private computeHash(entry: AuditEntry): SHA256 {
    const content = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      sequenceNumber: entry.sequenceNumber,
      actor: entry.actor,
      action: entry.action,
      resource: entry.resource,
      context: entry.context,
      outcome: entry.outcome,
      previousHash: entry.previousHash,
    });

    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get default retention policy
   */
  private getDefaultRetentionPolicy(): RetentionPolicy {
    return {
      policyId: 'default',
      retentionDays: this.config.defaultRetentionDays,
      archiveAfterDays: this.config.archiveRetentionDays,
      legalHold: false,
    };
  }

  /**
   * Generate UUID
   */
  private generateId(): UUID {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Merge config with defaults
   */
  private mergeWithDefaults(config: Partial<AuditEngineConfig>): AuditEngineConfig {
    return {
      storageBackend: config.storageBackend || 'memory',
      defaultRetentionDays: config.defaultRetentionDays || 365,
      archiveRetentionDays: config.archiveRetentionDays || 2555, // 7 years
      enableIntegrityVerification: config.enableIntegrityVerification ?? true,
      verificationFrequency: config.verificationFrequency || 24,
      encryptSensitiveData: config.encryptSensitiveData ?? true,
      encryptionKey: config.encryptionKey,
    };
  }
}

/**
 * Parameters for audit logging
 */
export interface AuditLogParams {
  actor: ActorIdentity;
  action: AuditableAction;
  resource: ResourceIdentifier;
  context: ExecutionContext;
  outcome: ActionOutcome;
  retentionPolicy?: RetentionPolicy;
}
