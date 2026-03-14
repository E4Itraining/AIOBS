/**
 * Edge Mode Configuration
 *
 * Provides default configuration and environment-based overrides
 * for air-gap / disconnected operation mode.
 * Activated via AIOBS_EDGE_MODE=true environment variable.
 */

import {
  EdgeModeConfig,
  EdgeBufferConfig,
  ResyncConfig,
  DataPriorityConfig,
} from '../core/types/edge-mode';

/** Check if edge mode is enabled via environment */
export function isEdgeModeEnabled(): boolean {
  return process.env.AIOBS_EDGE_MODE === 'true';
}

/** Get the default edge mode configuration */
export function getDefaultEdgeModeConfig(): EdgeModeConfig {
  return {
    enabled: isEdgeModeEnabled(),

    buffer: getDefaultBufferConfig(),
    resync: getDefaultResyncConfig(),

    upstreamUrl: process.env.AIOBS_UPSTREAM_URL || 'http://localhost:3000',
    storagePath: process.env.AIOBS_EDGE_STORAGE_PATH || './data/edge-buffer',
    nodeId: process.env.AIOBS_EDGE_NODE_ID || `edge-${generateNodeId()}`,
    nodeName: process.env.AIOBS_EDGE_NODE_NAME || 'AIOBS Edge Node',

    priorities: getDefaultPriorityConfig(),
  };
}

/** Get buffer configuration with env overrides */
export function getDefaultBufferConfig(): EdgeBufferConfig {
  return {
    maxSizeBytes: parseInt(process.env.AIOBS_EDGE_BUFFER_MAX_SIZE || '104857600', 10), // 100MB
    maxEntries: parseInt(process.env.AIOBS_EDGE_BUFFER_MAX_ENTRIES || '100000', 10),
    ttlSeconds: parseInt(process.env.AIOBS_EDGE_BUFFER_TTL || '604800', 10), // 7 days
    overflowPolicy: 'drop_lowest_priority',
    persistenceBackend: 'sqlite',
    flushIntervalMs: parseInt(process.env.AIOBS_EDGE_FLUSH_INTERVAL || '5000', 10),
    compression: true,
  };
}

/** Get resync configuration with env overrides */
export function getDefaultResyncConfig(): ResyncConfig {
  return {
    strategy: 'priority_first',
    batchSize: parseInt(process.env.AIOBS_EDGE_SYNC_BATCH_SIZE || '100', 10),
    connectivityCheckIntervalMs: parseInt(process.env.AIOBS_EDGE_CONNECTIVITY_CHECK || '30000', 10), // 30s
    syncTimeoutMs: parseInt(process.env.AIOBS_EDGE_SYNC_TIMEOUT || '60000', 10), // 60s
    retry: {
      maxRetries: 3,
      backoffMs: 2000,
      maxBackoffMs: 30000,
    },
    bandwidthLimitBps: parseInt(process.env.AIOBS_EDGE_BANDWIDTH_LIMIT || '0', 10),
    verification: true,
  };
}

/** Get data priority configuration */
export function getDefaultPriorityConfig(): DataPriorityConfig {
  return {
    semantic_alerts: 'critical',
    security_events: 'critical',
    ot_metrics: 'high',
    cognitive_metrics: 'high',
    audit_logs: 'high',
    general_metrics: 'medium',
  };
}

/** Generate a simple node ID */
function generateNodeId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Validate edge mode configuration
 */
export function validateEdgeModeConfig(config: EdgeModeConfig): string[] {
  const errors: string[] = [];

  if (config.buffer.maxSizeBytes < 1024 * 1024) {
    errors.push('Buffer max size must be at least 1MB');
  }
  if (config.buffer.maxEntries < 100) {
    errors.push('Buffer max entries must be at least 100');
  }
  if (config.buffer.ttlSeconds < 60) {
    errors.push('Buffer TTL must be at least 60 seconds');
  }
  if (config.resync.batchSize < 1) {
    errors.push('Resync batch size must be at least 1');
  }
  if (!config.nodeId) {
    errors.push('Node ID is required');
  }

  return errors;
}
