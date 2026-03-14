/**
 * Edge Buffer
 *
 * Local FIFO buffer with persistence for air-gap / disconnected operation.
 * Stores data points locally when upstream is unreachable, with priority-based
 * eviction and TTL expiry.
 *
 * Storage backends: in-memory (default), with LevelDB/SQLite stubs for production.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  EdgeBufferConfig,
  EdgeBufferEntry,
  EdgeBufferStats,
  EdgeDataType,
  DataPriority,
} from '../core/types/edge-mode';

const PRIORITY_ORDER: Record<DataPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export class EdgeBuffer {
  private config: EdgeBufferConfig;
  private entries: Map<string, EdgeBufferEntry> = new Map();
  private insertionOrder: string[] = []; // FIFO tracking
  private totalSizeBytes: number = 0;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: EdgeBufferConfig) {
    this.config = config;
  }

  /**
   * Add an entry to the buffer
   */
  async push(
    dataType: EdgeDataType,
    payload: Record<string, unknown>,
    priority: DataPriority = 'medium'
  ): Promise<string> {
    const serialized = JSON.stringify(payload);
    const sizeBytes = Buffer.byteLength(serialized, 'utf8');

    // Check capacity before adding
    await this.ensureCapacity(sizeBytes, priority);

    const entry: EdgeBufferEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      priority,
      dataType,
      payload: serialized,
      payloadSizeBytes: sizeBytes,
      ttlExpiry: new Date(Date.now() + this.config.ttlSeconds * 1000).toISOString(),
      synced: false,
      syncAttempts: 0,
      checksum: this.computeChecksum(serialized),
    };

    this.entries.set(entry.id, entry);
    this.insertionOrder.push(entry.id);
    this.totalSizeBytes += sizeBytes;

    return entry.id;
  }

  /**
   * Pop the next entry for syncing (respects priority order)
   */
  async pop(): Promise<EdgeBufferEntry | null> {
    // Remove expired entries first
    this.removeExpired();

    if (this.insertionOrder.length === 0) return null;

    // Find highest priority unsynced entry
    let bestId: string | null = null;
    let bestPriority = -1;

    for (const id of this.insertionOrder) {
      const entry = this.entries.get(id);
      if (entry && !entry.synced) {
        const p = PRIORITY_ORDER[entry.priority];
        if (p > bestPriority) {
          bestPriority = p;
          bestId = id;
        }
      }
    }

    if (!bestId) return null;

    const entry = this.entries.get(bestId)!;
    return { ...entry };
  }

  /**
   * Get a batch of entries for sync, ordered by priority then time
   */
  async getBatch(batchSize: number): Promise<EdgeBufferEntry[]> {
    this.removeExpired();

    const unsynced = this.insertionOrder
      .map(id => this.entries.get(id))
      .filter((e): e is EdgeBufferEntry => !!e && !e.synced)
      .sort((a, b) => {
        const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp.localeCompare(b.timestamp);
      });

    return unsynced.slice(0, batchSize);
  }

  /**
   * Mark an entry as successfully synced
   */
  async markSynced(entryId: string): Promise<void> {
    const entry = this.entries.get(entryId);
    if (entry) {
      entry.synced = true;
      entry.syncAttempts++;
    }
  }

  /**
   * Mark an entry as failed to sync
   */
  async markFailed(entryId: string): Promise<void> {
    const entry = this.entries.get(entryId);
    if (entry) {
      entry.syncAttempts++;
    }
  }

  /**
   * Remove synced entries to free space
   */
  async purgeSynced(): Promise<number> {
    let purged = 0;
    const toRemove: string[] = [];

    for (const [id, entry] of this.entries) {
      if (entry.synced) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.removeEntry(id);
      purged++;
    }

    return purged;
  }

  /**
   * Get buffer statistics
   */
  getStats(): EdgeBufferStats {
    this.removeExpired();

    const entries = Array.from(this.entries.values());
    const pending = entries.filter(e => !e.synced);
    const synced = entries.filter(e => e.synced);
    const failed = entries.filter(e => e.syncAttempts > 0 && !e.synced);

    const byPriority: Record<DataPriority, number> = {
      critical: 0, high: 0, medium: 0, low: 0,
    };
    const byDataType: Record<EdgeDataType, number> = {
      semantic_alert: 0, security_event: 0, ot_datapoint: 0,
      cognitive_metric: 0, audit_log: 0, mitre_alert: 0, general_metric: 0,
    };

    for (const e of pending) {
      byPriority[e.priority]++;
      byDataType[e.dataType]++;
    }

    const timestamps = entries.map(e => e.timestamp).sort();

    return {
      totalEntries: entries.length,
      pendingEntries: pending.length,
      syncedEntries: synced.length,
      failedEntries: failed.length,
      sizeBytes: this.totalSizeBytes,
      capacityPercent: this.totalSizeBytes / this.config.maxSizeBytes,
      oldestEntry: timestamps[0] || null,
      newestEntry: timestamps[timestamps.length - 1] || null,
      byPriority,
      byDataType,
    };
  }

  /**
   * Get current entry count
   */
  size(): number {
    return this.entries.size;
  }

  /**
   * Get pending (unsynced) entry count
   */
  pendingCount(): number {
    let count = 0;
    for (const entry of this.entries.values()) {
      if (!entry.synced) count++;
    }
    return count;
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    this.entries.clear();
    this.insertionOrder = [];
    this.totalSizeBytes = 0;
  }

  /**
   * Start periodic flush timer
   */
  startPeriodicFlush(callback: (stats: EdgeBufferStats) => void): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => {
      this.removeExpired();
      callback(this.getStats());
    }, this.config.flushIntervalMs);
  }

  /**
   * Stop periodic flush
   */
  stopPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private async ensureCapacity(neededBytes: number, newPriority: DataPriority): Promise<void> {
    // Check entry count limit
    while (this.entries.size >= this.config.maxEntries) {
      if (!this.evict(newPriority)) break;
    }

    // Check size limit
    while (this.totalSizeBytes + neededBytes > this.config.maxSizeBytes) {
      if (!this.evict(newPriority)) break;
    }
  }

  private evict(newPriority: DataPriority): boolean {
    switch (this.config.overflowPolicy) {
      case 'drop_oldest':
        return this.evictOldest();
      case 'drop_lowest_priority':
        return this.evictLowestPriority(newPriority);
      case 'reject_new':
        return false;
      default:
        return this.evictOldest();
    }
  }

  private evictOldest(): boolean {
    // Find oldest synced entry first, then oldest unsynced
    for (const id of this.insertionOrder) {
      const entry = this.entries.get(id);
      if (entry?.synced) {
        this.removeEntry(id);
        return true;
      }
    }
    // If no synced entries, remove oldest unsynced
    if (this.insertionOrder.length > 0) {
      this.removeEntry(this.insertionOrder[0]);
      return true;
    }
    return false;
  }

  private evictLowestPriority(newPriority: DataPriority): boolean {
    const newPriorityOrder = PRIORITY_ORDER[newPriority];
    let lowestId: string | null = null;
    let lowestPriority = Infinity;

    for (const [id, entry] of this.entries) {
      const p = PRIORITY_ORDER[entry.priority];
      if (p < lowestPriority && p < newPriorityOrder) {
        lowestPriority = p;
        lowestId = id;
      }
    }

    if (lowestId) {
      this.removeEntry(lowestId);
      return true;
    }
    return false;
  }

  private removeEntry(id: string): void {
    const entry = this.entries.get(id);
    if (entry) {
      this.totalSizeBytes -= entry.payloadSizeBytes;
      this.entries.delete(id);
      this.insertionOrder = this.insertionOrder.filter(i => i !== id);
    }
  }

  private removeExpired(): void {
    const now = new Date().toISOString();
    const toRemove: string[] = [];

    for (const [id, entry] of this.entries) {
      if (entry.ttlExpiry < now) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.removeEntry(id);
    }
  }

  private computeChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}
