/**
 * Edge Mode / Air-Gap Type Definitions
 * Supports disconnected operation for forward-deployed systems (TRM).
 * Data buffered locally via FIFO queue, synced differentially on reconnect.
 */

import { ISO8601, UUID, NormalizedScore, HealthStatus, TimeWindow } from './common';

// ============================================================================
// Edge Mode Configuration
// ============================================================================

export interface EdgeModeConfig {
  /** Enable edge/air-gap mode */
  enabled: boolean;

  /** Buffer configuration */
  buffer: EdgeBufferConfig;

  /** Resync configuration */
  resync: ResyncConfig;

  /** Upstream server URL (for reconnection) */
  upstreamUrl: string;

  /** Local storage path for buffer persistence */
  storagePath: string;

  /** Node identification */
  nodeId: string;
  nodeName: string;

  /** Priority configuration for data types */
  priorities: DataPriorityConfig;
}

export interface EdgeBufferConfig {
  /** Maximum buffer size in bytes */
  maxSizeBytes: number;
  /** Maximum number of entries */
  maxEntries: number;
  /** Time-to-live for entries in seconds */
  ttlSeconds: number;
  /** Flush strategy when buffer is full */
  overflowPolicy: 'drop_oldest' | 'drop_lowest_priority' | 'reject_new';
  /** Persistence backend */
  persistenceBackend: 'leveldb' | 'sqlite';
  /** Flush interval for persistence (ms) */
  flushIntervalMs: number;
  /** Compression enabled */
  compression: boolean;
}

export interface ResyncConfig {
  /** Strategy for syncing buffered data */
  strategy: 'full' | 'differential' | 'priority_first';
  /** Maximum batch size for sync operations */
  batchSize: number;
  /** Interval for connectivity checks (ms) */
  connectivityCheckIntervalMs: number;
  /** Timeout for sync operations (ms) */
  syncTimeoutMs: number;
  /** Retry configuration */
  retry: {
    maxRetries: number;
    backoffMs: number;
    maxBackoffMs: number;
  };
  /** Bandwidth limit in bytes/second (0 = unlimited) */
  bandwidthLimitBps: number;
  /** Enable sync verification (checksum comparison) */
  verification: boolean;
}

export interface DataPriorityConfig {
  /** Priority levels for different data types */
  semantic_alerts: DataPriority;
  security_events: DataPriority;
  ot_metrics: DataPriority;
  cognitive_metrics: DataPriority;
  audit_logs: DataPriority;
  general_metrics: DataPriority;
}

export type DataPriority = 'critical' | 'high' | 'medium' | 'low';

// ============================================================================
// Buffer Entry Types
// ============================================================================

export interface EdgeBufferEntry {
  id: UUID;
  timestamp: ISO8601;
  priority: DataPriority;
  dataType: EdgeDataType;
  payload: string; // JSON-serialized data
  payloadSizeBytes: number;
  ttlExpiry: ISO8601;
  synced: boolean;
  syncAttempts: number;
  checksum: string;
}

export type EdgeDataType =
  | 'semantic_alert'
  | 'security_event'
  | 'ot_datapoint'
  | 'cognitive_metric'
  | 'audit_log'
  | 'mitre_alert'
  | 'general_metric';

// ============================================================================
// Sync Status Types
// ============================================================================

export interface EdgeSyncStatus {
  nodeId: string;
  timestamp: ISO8601;
  connectionState: EdgeConnectionState;
  lastSyncTimestamp: ISO8601 | null;
  lastSyncSuccess: boolean;

  /** Buffer statistics */
  buffer: EdgeBufferStats;

  /** Sync progress (when syncing) */
  syncProgress: SyncProgress | null;

  /** Connectivity history */
  connectivityHistory: ConnectivityEvent[];
}

export type EdgeConnectionState = 'online' | 'offline' | 'syncing' | 'degraded';

export interface EdgeBufferStats {
  totalEntries: number;
  pendingEntries: number;
  syncedEntries: number;
  failedEntries: number;
  sizeBytes: number;
  capacityPercent: NormalizedScore;
  oldestEntry: ISO8601 | null;
  newestEntry: ISO8601 | null;
  byPriority: Record<DataPriority, number>;
  byDataType: Record<EdgeDataType, number>;
}

export interface SyncProgress {
  startedAt: ISO8601;
  totalEntries: number;
  syncedEntries: number;
  failedEntries: number;
  progressPercent: NormalizedScore;
  estimatedRemainingMs: number;
  currentBatchSize: number;
  bytesTransferred: number;
}

export interface ConnectivityEvent {
  timestamp: ISO8601;
  state: EdgeConnectionState;
  latencyMs: number | null;
  reason?: string;
}

// ============================================================================
// Resync Operations
// ============================================================================

export interface ResyncOperation {
  id: UUID;
  nodeId: string;
  startedAt: ISO8601;
  completedAt: ISO8601 | null;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';

  /** What was synced */
  entriesSynced: number;
  entriesFailed: number;
  bytesTransferred: number;

  /** Differential sync metadata */
  lastSyncCheckpoint: ISO8601;
  newCheckpoint: ISO8601;

  /** Verification */
  verified: boolean;
  verificationErrors: string[];

  /** Duration */
  durationMs: number;
}

// ============================================================================
// Edge Health
// ============================================================================

export interface EdgeHealthStatus {
  nodeId: string;
  nodeName: string;
  timestamp: ISO8601;
  status: HealthStatus;
  connectionState: EdgeConnectionState;
  bufferHealth: HealthStatus;
  storageHealth: HealthStatus;
  uptime: number;
  lastError: string | null;

  /** Metrics */
  metrics: {
    bufferUtilization: NormalizedScore;
    syncSuccessRate: NormalizedScore;
    avgSyncLatencyMs: number;
    dataPointsBuffered: number;
    dataPointsSynced: number;
    disconnectedDurationMs: number;
  };
}
