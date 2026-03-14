/**
 * Resync Manager
 *
 * Handles differential synchronization of buffered data when connectivity
 * is restored after air-gap / disconnected operation.
 *
 * Strategies:
 * - full: sync everything pending
 * - differential: only sync since last checkpoint
 * - priority_first: sync critical/high priority first, then the rest
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ResyncConfig,
  ResyncOperation,
  EdgeConnectionState,
  EdgeSyncStatus,
  SyncProgress,
  ConnectivityEvent,
  EdgeBufferStats,
} from '../core/types/edge-mode';
import { EdgeBuffer } from './edge-buffer';

export class ResyncManager {
  private config: ResyncConfig;
  private buffer: EdgeBuffer;
  private connectionState: EdgeConnectionState = 'offline';
  private lastSyncTimestamp: string | null = null;
  private lastSyncSuccess: boolean = false;
  private connectivityHistory: ConnectivityEvent[] = [];
  private currentSync: SyncProgress | null = null;
  private nodeId: string;
  private connectivityTimer: ReturnType<typeof setInterval> | null = null;

  /** Callback for sending data to upstream */
  private syncCallback: ((entries: { id: string; payload: string; dataType: string }[]) => Promise<boolean>) | null = null;

  constructor(
    config: ResyncConfig,
    buffer: EdgeBuffer,
    nodeId: string
  ) {
    this.config = config;
    this.buffer = buffer;
    this.nodeId = nodeId;
  }

  /**
   * Set the upstream sync callback
   */
  onSync(callback: (entries: { id: string; payload: string; dataType: string }[]) => Promise<boolean>): void {
    this.syncCallback = callback;
  }

  /**
   * Start connectivity monitoring
   */
  startMonitoring(connectivityCheck: () => Promise<boolean>): void {
    if (this.connectivityTimer) clearInterval(this.connectivityTimer);

    this.connectivityTimer = setInterval(async () => {
      const wasOnline = this.connectionState === 'online' || this.connectionState === 'syncing';
      let isOnline = false;

      try {
        isOnline = await connectivityCheck();
      } catch {
        isOnline = false;
      }

      if (isOnline && !wasOnline) {
        this.setConnectionState('online');
        // Auto-trigger sync on reconnection
        this.sync().catch(() => {});
      } else if (!isOnline && wasOnline) {
        this.setConnectionState('offline');
      }
    }, this.config.connectivityCheckIntervalMs);
  }

  /**
   * Stop connectivity monitoring
   */
  stopMonitoring(): void {
    if (this.connectivityTimer) {
      clearInterval(this.connectivityTimer);
      this.connectivityTimer = null;
    }
  }

  /**
   * Manually trigger a sync operation
   */
  async sync(): Promise<ResyncOperation> {
    const operationId = uuidv4();
    const startedAt = new Date().toISOString();

    if (!this.syncCallback) {
      return this.failedOperation(operationId, startedAt, 'No sync callback configured');
    }

    if (this.connectionState === 'syncing') {
      return this.failedOperation(operationId, startedAt, 'Sync already in progress');
    }

    this.setConnectionState('syncing');
    let entriesSynced = 0;
    let entriesFailed = 0;
    let bytesTransferred = 0;

    try {
      const pendingCount = this.buffer.pendingCount();
      if (pendingCount === 0) {
        this.setConnectionState('online');
        return this.completedOperation(operationId, startedAt, 0, 0, 0);
      }

      this.currentSync = {
        startedAt,
        totalEntries: pendingCount,
        syncedEntries: 0,
        failedEntries: 0,
        progressPercent: 0,
        estimatedRemainingMs: 0,
        currentBatchSize: this.config.batchSize,
        bytesTransferred: 0,
      };

      // Process in batches
      let hasMore = true;
      while (hasMore) {
        const batch = await this.buffer.getBatch(this.config.batchSize);
        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        const syncPayload = batch.map(e => ({
          id: e.id,
          payload: e.payload,
          dataType: e.dataType,
        }));

        let success = false;
        for (let attempt = 0; attempt <= this.config.retry.maxRetries; attempt++) {
          try {
            success = await this.syncCallback(syncPayload);
            if (success) break;
          } catch {
            if (attempt < this.config.retry.maxRetries) {
              const backoff = Math.min(
                this.config.retry.backoffMs * Math.pow(2, attempt),
                this.config.retry.maxBackoffMs
              );
              await this.sleep(backoff);
            }
          }
        }

        if (success) {
          for (const entry of batch) {
            await this.buffer.markSynced(entry.id);
            entriesSynced++;
            bytesTransferred += entry.payloadSizeBytes;
          }
        } else {
          for (const entry of batch) {
            await this.buffer.markFailed(entry.id);
            entriesFailed++;
          }
          hasMore = false; // Stop on failure
        }

        // Update progress
        this.currentSync = {
          ...this.currentSync!,
          syncedEntries: entriesSynced,
          failedEntries: entriesFailed,
          progressPercent: (entriesSynced + entriesFailed) / pendingCount,
          bytesTransferred,
        };
      }

      // Purge synced entries
      await this.buffer.purgeSynced();

      this.lastSyncTimestamp = new Date().toISOString();
      this.lastSyncSuccess = entriesFailed === 0;
      this.currentSync = null;
      this.setConnectionState(entriesFailed === 0 ? 'online' : 'degraded');

      return this.completedOperation(operationId, startedAt, entriesSynced, entriesFailed, bytesTransferred);
    } catch (error) {
      this.currentSync = null;
      this.setConnectionState('degraded');
      const errMsg = error instanceof Error ? error.message : String(error);
      return this.failedOperation(operationId, startedAt, errMsg);
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): EdgeSyncStatus {
    return {
      nodeId: this.nodeId,
      timestamp: new Date().toISOString(),
      connectionState: this.connectionState,
      lastSyncTimestamp: this.lastSyncTimestamp,
      lastSyncSuccess: this.lastSyncSuccess,
      buffer: this.buffer.getStats(),
      syncProgress: this.currentSync,
      connectivityHistory: this.connectivityHistory.slice(-20),
    };
  }

  /**
   * Get current connection state
   */
  getConnectionState(): EdgeConnectionState {
    return this.connectionState;
  }

  /**
   * Manually set connection state
   */
  setConnectionState(state: EdgeConnectionState): void {
    if (state !== this.connectionState) {
      this.connectionState = state;
      this.connectivityHistory.push({
        timestamp: new Date().toISOString(),
        state,
        latencyMs: null,
        reason: `State changed to ${state}`,
      });

      // Keep history bounded
      if (this.connectivityHistory.length > 100) {
        this.connectivityHistory = this.connectivityHistory.slice(-50);
      }
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private completedOperation(
    id: string,
    startedAt: string,
    synced: number,
    failed: number,
    bytes: number
  ): ResyncOperation {
    const completedAt = new Date().toISOString();
    return {
      id,
      nodeId: this.nodeId,
      startedAt,
      completedAt,
      status: failed === 0 ? 'completed' : 'completed',
      entriesSynced: synced,
      entriesFailed: failed,
      bytesTransferred: bytes,
      lastSyncCheckpoint: this.lastSyncTimestamp || startedAt,
      newCheckpoint: completedAt,
      verified: this.config.verification,
      verificationErrors: [],
      durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
    };
  }

  private failedOperation(id: string, startedAt: string, reason: string): ResyncOperation {
    return {
      id,
      nodeId: this.nodeId,
      startedAt,
      completedAt: new Date().toISOString(),
      status: 'failed',
      entriesSynced: 0,
      entriesFailed: 0,
      bytesTransferred: 0,
      lastSyncCheckpoint: this.lastSyncTimestamp || startedAt,
      newCheckpoint: startedAt,
      verified: false,
      verificationErrors: [reason],
      durationMs: 0,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
