/**
 * Federated Sync Manager
 *
 * Handles differential synchronization between TRM edge agents and the
 * central Skophia platform. Supports intermittent connectivity, deduplication,
 * and priority-based sync ordering.
 *
 * @cybersec Differential resync for air-gapped tactical deployments
 */

import { v4 as uuidv4 } from 'uuid';
import type { TRMOfflineBuffer, SkophiaEndpoint, SyncResult } from './offline-buffer';

// ============================================================================
// Types
// ============================================================================

export interface FederatedSyncConfig {
  /** Upstream Skophia endpoint */
  upstream: SkophiaEndpoint;
  /** Sync interval when online (ms) */
  syncIntervalMs: number;
  /** Maximum retries per sync attempt */
  maxRetries: number;
  /** Backoff base for retries (ms) */
  retryBackoffMs: number;
  /** Enable differential sync (only send changes) */
  differentialEnabled: boolean;
}

export interface SyncState {
  lastSyncTimestamp: string | null;
  lastSyncId: string | null;
  totalSyncs: number;
  totalEntriesSynced: number;
  totalBytesSynced: number;
  consecutiveFailures: number;
  isRunning: boolean;
}

export interface SyncEvent {
  id: string;
  timestamp: string;
  type: 'sync_started' | 'sync_completed' | 'sync_failed' | 'connectivity_restored' | 'connectivity_lost';
  details: Record<string, string | number>;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * @cybersec Differential sync for TRM agents in tactical/air-gapped networks
 */
export class FederatedSyncManager {
  private config: FederatedSyncConfig;
  private buffer: TRMOfflineBuffer;
  private state: SyncState;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private events: SyncEvent[] = [];

  constructor(buffer: TRMOfflineBuffer, config: FederatedSyncConfig) {
    this.buffer = buffer;
    this.config = config;
    this.state = {
      lastSyncTimestamp: null,
      lastSyncId: null,
      totalSyncs: 0,
      totalEntriesSynced: 0,
      totalBytesSynced: 0,
      consecutiveFailures: 0,
      isRunning: false,
    };
  }

  /**
   * Start periodic sync
   */
  startPeriodicSync(): void {
    if (this.syncTimer) return;

    this.state.isRunning = true;
    this.syncTimer = setInterval(() => {
      void this.sync();
    }, this.config.syncIntervalMs);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.state.isRunning = false;
  }

  /**
   * Perform a single sync operation
   * @cybersec Differential sync with deduplication and retry logic
   */
  async sync(): Promise<SyncResult> {
    const syncId = uuidv4();
    this.logEvent('sync_started', { syncId });

    let lastResult: SyncResult = {
      syncedCount: 0,
      failedCount: 0,
      duplicatesSkipped: 0,
      totalBytesTransferred: 0,
      durationMs: 0,
      errors: [],
    };

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        lastResult = await this.buffer.flush(this.config.upstream);

        if (lastResult.failedCount === 0) {
          this.state.lastSyncTimestamp = new Date().toISOString();
          this.state.lastSyncId = syncId;
          this.state.totalSyncs++;
          this.state.totalEntriesSynced += lastResult.syncedCount;
          this.state.totalBytesSynced += lastResult.totalBytesTransferred;
          this.state.consecutiveFailures = 0;

          this.logEvent('sync_completed', {
            syncId,
            syncedCount: lastResult.syncedCount,
            duplicatesSkipped: lastResult.duplicatesSkipped,
            bytesTransferred: lastResult.totalBytesTransferred,
          });

          return lastResult;
        }

        // Partial failure — retry after backoff
        if (attempt < this.config.maxRetries) {
          const backoff = this.config.retryBackoffMs * Math.pow(2, attempt);
          await this.sleep(backoff);
        }
      } catch (error) {
        if (attempt < this.config.maxRetries) {
          const backoff = this.config.retryBackoffMs * Math.pow(2, attempt);
          await this.sleep(backoff);
        } else {
          this.state.consecutiveFailures++;
          this.logEvent('sync_failed', {
            syncId,
            error: error instanceof Error ? error.message : 'Unknown error',
            consecutiveFailures: this.state.consecutiveFailures,
          });
        }
      }
    }

    return lastResult;
  }

  /**
   * Get current sync state
   */
  getSyncState(): SyncState {
    return { ...this.state };
  }

  /**
   * Get recent sync events
   */
  getRecentEvents(limit: number = 50): SyncEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Notify that connectivity has been restored
   * @cybersec Triggers immediate resync when satellite link comes back
   */
  async onConnectivityRestored(): Promise<SyncResult> {
    this.logEvent('connectivity_restored', {});
    return this.sync();
  }

  /**
   * Notify that connectivity has been lost
   */
  onConnectivityLost(): void {
    this.logEvent('connectivity_lost', {});
  }

  // ===========================================================================
  // Private
  // ===========================================================================

  private logEvent(type: SyncEvent['type'], details: Record<string, string | number>): void {
    this.events.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type,
      details,
    });

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
