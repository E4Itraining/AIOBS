/**
 * TRM Offline Buffer
 *
 * Local storage for TRM agents operating in tactical networks with
 * intermittent satellite links. Buffers inferences, drift events, and
 * telemetry locally. Resyncs with deduplication when connectivity restores.
 *
 * @cybersec Air-gap capable local buffer for edge AI agents
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

export interface BufferedEntry {
  id: string;
  timestamp: string;
  type: 'inference' | 'drift_event' | 'alert' | 'telemetry';
  data: Record<string, unknown>;
  priority: 'critical' | 'high' | 'medium' | 'low';
  synced: boolean;
  syncAttempts: number;
  sizeBytes: number;
  checksum: string;
}

export interface GaskiaEndpoint {
  url: string;
  authToken: string;
  organization: string;
}

export interface SyncResult {
  syncedCount: number;
  failedCount: number;
  duplicatesSkipped: number;
  totalBytesTransferred: number;
  durationMs: number;
  errors: string[];
}

export interface BufferStats {
  size: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  estimatedTransferSize: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  pendingCount: number;
  syncedCount: number;
}

export interface TRMOfflineBufferConfig {
  /** Maximum entries to store */
  maxEntries: number;
  /** Maximum buffer size in bytes */
  maxSizeBytes: number;
  /** TTL for entries in seconds */
  ttlSeconds: number;
  /** Batch size for sync operations */
  syncBatchSize: number;
  /** Overflow policy */
  overflowPolicy: 'drop_oldest' | 'drop_lowest_priority' | 'reject_new';
}

export interface StoreInput {
  type: 'inference' | 'drift_event' | 'alert' | 'telemetry';
  data: Record<string, unknown>;
  timestamp: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

// ============================================================================
// Implementation
// ============================================================================

const PRIORITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * @cybersec Local offline buffer for TRM edge agents — no cloud dependency
 */
export class TRMOfflineBuffer {
  private config: TRMOfflineBufferConfig;
  private entries: Map<string, BufferedEntry> = new Map();
  private insertionOrder: string[] = [];
  private totalSizeBytes: number = 0;
  private syncedChecksums: Set<string> = new Set();

  constructor(config?: Partial<TRMOfflineBufferConfig>) {
    this.config = {
      maxEntries: config?.maxEntries ?? 100_000,
      maxSizeBytes: config?.maxSizeBytes ?? 100 * 1024 * 1024, // 100MB
      ttlSeconds: config?.ttlSeconds ?? 7 * 24 * 60 * 60, // 7 days
      syncBatchSize: config?.syncBatchSize ?? 500,
      overflowPolicy: config?.overflowPolicy ?? 'drop_lowest_priority',
    };
  }

  /**
   * Store an event in the offline buffer
   * @cybersec Buffers data locally when upstream is unreachable
   */
  async store(input: StoreInput): Promise<string> {
    const serialized = JSON.stringify(input.data);
    const sizeBytes = Buffer.byteLength(serialized, 'utf8');
    const checksum = this.computeChecksum(serialized);

    // Ensure capacity
    this.ensureCapacity(sizeBytes, input.priority);

    const entry: BufferedEntry = {
      id: uuidv4(),
      timestamp: input.timestamp,
      type: input.type,
      data: input.data,
      priority: input.priority,
      synced: false,
      syncAttempts: 0,
      sizeBytes,
      checksum,
    };

    this.entries.set(entry.id, entry);
    this.insertionOrder.push(entry.id);
    this.totalSizeBytes += sizeBytes;

    return entry.id;
  }

  /**
   * Flush buffer to upstream Gaskia endpoint with deduplication
   * @cybersec Resyncs with deduplication when connectivity restores
   */
  async flush(upstream: GaskiaEndpoint): Promise<SyncResult> {
    const start = Date.now();
    let syncedCount = 0;
    let failedCount = 0;
    let duplicatesSkipped = 0;
    let totalBytesTransferred = 0;
    const errors: string[] = [];

    // Remove expired entries first
    this.removeExpired();

    // Get pending entries sorted by priority then time
    const pending = this.getPendingEntries();

    // Process in batches
    for (let i = 0; i < pending.length; i += this.config.syncBatchSize) {
      const batch = pending.slice(i, i + this.config.syncBatchSize);

      // Skip duplicates (already synced in previous session)
      const toSync = batch.filter(entry => {
        if (this.syncedChecksums.has(entry.checksum)) {
          duplicatesSkipped++;
          entry.synced = true;
          return false;
        }
        return true;
      });

      if (toSync.length === 0) continue;

      try {
        const payload = JSON.stringify(toSync.map(e => ({
          type: e.type,
          data: e.data,
          timestamp: e.timestamp,
          priority: e.priority,
          checksum: e.checksum,
        })));

        const response = await fetch(`${upstream.url}/api/sync/ingest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${upstream.authToken}`,
            'X-Organization': upstream.organization,
          },
          body: payload,
        });

        if (response.ok) {
          for (const entry of toSync) {
            entry.synced = true;
            this.syncedChecksums.add(entry.checksum);
            syncedCount++;
            totalBytesTransferred += entry.sizeBytes;
          }
        } else {
          for (const entry of toSync) {
            entry.syncAttempts++;
            failedCount++;
          }
          errors.push(`Upstream returned ${response.status}`);
        }
      } catch (error) {
        for (const entry of toSync) {
          entry.syncAttempts++;
          failedCount++;
        }
        errors.push(error instanceof Error ? error.message : 'Unknown sync error');
      }
    }

    // Purge synced entries
    this.purgeSynced();

    return {
      syncedCount,
      failedCount,
      duplicatesSkipped,
      totalBytesTransferred,
      durationMs: Date.now() - start,
      errors,
    };
  }

  /**
   * Get buffer statistics
   */
  async getBufferStats(): Promise<BufferStats> {
    this.removeExpired();

    const entries = Array.from(this.entries.values());
    const pending = entries.filter(e => !e.synced);
    const synced = entries.filter(e => e.synced);

    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const e of pending) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      byPriority[e.priority] = (byPriority[e.priority] || 0) + 1;
    }

    const timestamps = entries.map(e => new Date(e.timestamp).getTime());

    return {
      size: entries.length,
      oldestEntry: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null,
      newestEntry: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null,
      estimatedTransferSize: pending.reduce((s, e) => s + e.sizeBytes, 0),
      byType,
      byPriority,
      pendingCount: pending.length,
      syncedCount: synced.length,
    };
  }

  /**
   * Check if upstream is unreachable (agent delegates this check)
   */
  isOffline(): boolean {
    // The TRM agent determines connectivity — the buffer just stores
    return true; // Buffer always accepts data
  }

  /**
   * Get count of pending (unsynced) entries
   */
  getPendingCount(): number {
    let count = 0;
    for (const entry of this.entries.values()) {
      if (!entry.synced) count++;
    }
    return count;
  }

  /**
   * Clear the buffer
   */
  async clear(): Promise<void> {
    this.entries.clear();
    this.insertionOrder = [];
    this.totalSizeBytes = 0;
  }

  // ===========================================================================
  // Private
  // ===========================================================================

  private getPendingEntries(): BufferedEntry[] {
    return this.insertionOrder
      .map(id => this.entries.get(id))
      .filter((e): e is BufferedEntry => !!e && !e.synced)
      .sort((a, b) => {
        const priorityDiff = (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp.localeCompare(b.timestamp);
      });
  }

  private ensureCapacity(neededBytes: number, newPriority: string): void {
    while (this.entries.size >= this.config.maxEntries || this.totalSizeBytes + neededBytes > this.config.maxSizeBytes) {
      if (!this.evict(newPriority)) break;
    }
  }

  private evict(newPriority: string): boolean {
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
    // Evict synced first, then oldest unsynced
    for (const id of this.insertionOrder) {
      const entry = this.entries.get(id);
      if (entry?.synced) {
        this.removeEntry(id);
        return true;
      }
    }
    if (this.insertionOrder.length > 0) {
      this.removeEntry(this.insertionOrder[0]);
      return true;
    }
    return false;
  }

  private evictLowestPriority(newPriority: string): boolean {
    const newPriorityOrder = PRIORITY_ORDER[newPriority] || 0;
    let lowestId: string | null = null;
    let lowestPriority = Infinity;

    for (const [id, entry] of this.entries) {
      const p = PRIORITY_ORDER[entry.priority] || 0;
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
      this.totalSizeBytes -= entry.sizeBytes;
      this.entries.delete(id);
      this.insertionOrder = this.insertionOrder.filter(i => i !== id);
    }
  }

  private removeExpired(): void {
    const cutoff = new Date(Date.now() - this.config.ttlSeconds * 1000).toISOString();
    const toRemove: string[] = [];

    for (const [id, entry] of this.entries) {
      if (entry.timestamp < cutoff) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.removeEntry(id);
    }
  }

  private purgeSynced(): void {
    const toRemove: string[] = [];
    for (const [id, entry] of this.entries) {
      if (entry.synced) {
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
