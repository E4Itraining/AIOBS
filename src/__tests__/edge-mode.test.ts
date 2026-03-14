/**
 * Edge Mode Tests
 * Tests buffer, resync, and configuration for air-gap operation
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { EdgeBuffer } from '../edge-mode/edge-buffer';
import { ResyncManager } from '../edge-mode/resync-manager';
import {
  getDefaultEdgeModeConfig,
  getDefaultBufferConfig,
  validateEdgeModeConfig,
} from '../edge-mode/edge-mode-config';

// ============================================================================
// EdgeBuffer Tests
// ============================================================================

describe('EdgeBuffer', () => {
  let buffer: EdgeBuffer;

  beforeEach(() => {
    buffer = new EdgeBuffer({
      maxSizeBytes: 1024 * 1024, // 1MB
      maxEntries: 100,
      ttlSeconds: 3600, // 1 hour
      overflowPolicy: 'drop_oldest',
      persistenceBackend: 'sqlite',
      flushIntervalMs: 5000,
      compression: false,
    });
  });

  describe('push()', () => {
    it('should add entries to the buffer', async () => {
      const id = await buffer.push('semantic_alert', { test: 'data' }, 'critical');
      expect(id).toBeDefined();
      expect(buffer.size()).toBe(1);
    });

    it('should track multiple entries', async () => {
      await buffer.push('semantic_alert', { a: 1 }, 'critical');
      await buffer.push('ot_datapoint', { b: 2 }, 'high');
      await buffer.push('general_metric', { c: 3 }, 'low');

      expect(buffer.size()).toBe(3);
      expect(buffer.pendingCount()).toBe(3);
    });

    it('should respect entry count limit with drop_oldest', async () => {
      const smallBuffer = new EdgeBuffer({
        maxSizeBytes: 1024 * 1024,
        maxEntries: 5,
        ttlSeconds: 3600,
        overflowPolicy: 'drop_oldest',
        persistenceBackend: 'sqlite',
        flushIntervalMs: 5000,
        compression: false,
      });

      for (let i = 0; i < 10; i++) {
        await smallBuffer.push('general_metric', { i }, 'medium');
      }

      expect(smallBuffer.size()).toBeLessThanOrEqual(5);
    });

    it('should respect priority-based eviction', async () => {
      const smallBuffer = new EdgeBuffer({
        maxSizeBytes: 1024 * 1024,
        maxEntries: 3,
        ttlSeconds: 3600,
        overflowPolicy: 'drop_lowest_priority',
        persistenceBackend: 'sqlite',
        flushIntervalMs: 5000,
        compression: false,
      });

      await smallBuffer.push('general_metric', { a: 1 }, 'low');
      await smallBuffer.push('general_metric', { b: 2 }, 'medium');
      await smallBuffer.push('general_metric', { c: 3 }, 'high');
      // This should evict the 'low' priority entry
      await smallBuffer.push('semantic_alert', { d: 4 }, 'critical');

      expect(smallBuffer.size()).toBeLessThanOrEqual(3);
    });
  });

  describe('pop()', () => {
    it('should return highest priority entry', async () => {
      await buffer.push('general_metric', { low: true }, 'low');
      await buffer.push('semantic_alert', { critical: true }, 'critical');
      await buffer.push('ot_datapoint', { medium: true }, 'medium');

      const entry = await buffer.pop();
      expect(entry).not.toBeNull();
      expect(entry!.priority).toBe('critical');
    });

    it('should return null when empty', async () => {
      const entry = await buffer.pop();
      expect(entry).toBeNull();
    });
  });

  describe('getBatch()', () => {
    it('should return entries sorted by priority', async () => {
      await buffer.push('general_metric', { a: 1 }, 'low');
      await buffer.push('semantic_alert', { b: 2 }, 'critical');
      await buffer.push('ot_datapoint', { c: 3 }, 'high');
      await buffer.push('security_event', { d: 4 }, 'critical');

      const batch = await buffer.getBatch(10);
      expect(batch.length).toBe(4);
      expect(batch[0].priority).toBe('critical');
      expect(batch[1].priority).toBe('critical');
      expect(batch[2].priority).toBe('high');
      expect(batch[3].priority).toBe('low');
    });

    it('should respect batch size limit', async () => {
      for (let i = 0; i < 20; i++) {
        await buffer.push('general_metric', { i }, 'medium');
      }

      const batch = await buffer.getBatch(5);
      expect(batch.length).toBe(5);
    });

    it('should exclude synced entries', async () => {
      const id1 = await buffer.push('general_metric', { a: 1 }, 'medium');
      await buffer.push('general_metric', { b: 2 }, 'medium');

      await buffer.markSynced(id1);

      const batch = await buffer.getBatch(10);
      expect(batch.length).toBe(1);
    });
  });

  describe('markSynced() / purgeSynced()', () => {
    it('should mark entry as synced', async () => {
      const id = await buffer.push('semantic_alert', { test: true }, 'critical');
      await buffer.markSynced(id);

      expect(buffer.pendingCount()).toBe(0);
    });

    it('should purge synced entries', async () => {
      const id1 = await buffer.push('general_metric', { a: 1 }, 'medium');
      const id2 = await buffer.push('general_metric', { b: 2 }, 'medium');
      await buffer.push('general_metric', { c: 3 }, 'medium');

      await buffer.markSynced(id1);
      await buffer.markSynced(id2);

      const purged = await buffer.purgeSynced();
      expect(purged).toBe(2);
      expect(buffer.size()).toBe(1);
    });
  });

  describe('getStats()', () => {
    it('should return accurate statistics', async () => {
      await buffer.push('semantic_alert', { a: 1 }, 'critical');
      await buffer.push('ot_datapoint', { b: 2 }, 'high');
      await buffer.push('general_metric', { c: 3 }, 'low');

      const stats = buffer.getStats();

      expect(stats.totalEntries).toBe(3);
      expect(stats.pendingEntries).toBe(3);
      expect(stats.syncedEntries).toBe(0);
      expect(stats.sizeBytes).toBeGreaterThan(0);
      expect(stats.capacityPercent).toBeGreaterThan(0);
      expect(stats.byPriority.critical).toBe(1);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.low).toBe(1);
      expect(stats.byDataType.semantic_alert).toBe(1);
      expect(stats.byDataType.ot_datapoint).toBe(1);
    });

    it('should return empty stats for empty buffer', () => {
      const stats = buffer.getStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.sizeBytes).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should remove all entries', async () => {
      await buffer.push('semantic_alert', { a: 1 }, 'critical');
      await buffer.push('ot_datapoint', { b: 2 }, 'high');

      await buffer.clear();

      expect(buffer.size()).toBe(0);
      expect(buffer.pendingCount()).toBe(0);
    });
  });
});

// ============================================================================
// ResyncManager Tests
// ============================================================================

describe('ResyncManager', () => {
  let buffer: EdgeBuffer;
  let manager: ResyncManager;

  beforeEach(() => {
    buffer = new EdgeBuffer({
      maxSizeBytes: 1024 * 1024,
      maxEntries: 1000,
      ttlSeconds: 3600,
      overflowPolicy: 'drop_oldest',
      persistenceBackend: 'sqlite',
      flushIntervalMs: 5000,
      compression: false,
    });

    manager = new ResyncManager(
      {
        strategy: 'priority_first',
        batchSize: 10,
        connectivityCheckIntervalMs: 1000,
        syncTimeoutMs: 5000,
        retry: { maxRetries: 2, backoffMs: 100, maxBackoffMs: 1000 },
        bandwidthLimitBps: 0,
        verification: true,
      },
      buffer,
      'test-node-1'
    );
  });

  it('should start in offline state', () => {
    expect(manager.getConnectionState()).toBe('offline');
  });

  it('should track connection state changes', () => {
    manager.setConnectionState('online');
    expect(manager.getConnectionState()).toBe('online');

    manager.setConnectionState('offline');
    expect(manager.getConnectionState()).toBe('offline');
  });

  it('should fail sync without callback', async () => {
    await buffer.push('semantic_alert', { test: true }, 'critical');
    const result = await manager.sync();

    expect(result.status).toBe('failed');
    expect(result.verificationErrors.length).toBeGreaterThan(0);
  });

  it('should sync with successful callback', async () => {
    await buffer.push('semantic_alert', { a: 1 }, 'critical');
    await buffer.push('ot_datapoint', { b: 2 }, 'high');
    await buffer.push('general_metric', { c: 3 }, 'low');

    manager.onSync(async () => true);
    const result = await manager.sync();

    expect(result.status).toBe('completed');
    expect(result.entriesSynced).toBe(3);
    expect(result.entriesFailed).toBe(0);
    expect(result.bytesTransferred).toBeGreaterThan(0);
  });

  it('should handle failed sync callback', async () => {
    await buffer.push('semantic_alert', { a: 1 }, 'critical');

    manager.onSync(async () => false);
    const result = await manager.sync();

    expect(result.entriesFailed).toBeGreaterThan(0);
  });

  it('should return completed for empty buffer', async () => {
    manager.onSync(async () => true);
    const result = await manager.sync();

    expect(result.status).toBe('completed');
    expect(result.entriesSynced).toBe(0);
  });

  it('should provide sync status', async () => {
    await buffer.push('semantic_alert', { test: true }, 'critical');

    const status = manager.getStatus();
    expect(status.nodeId).toBe('test-node-1');
    expect(status.connectionState).toBe('offline');
    expect(status.buffer.totalEntries).toBe(1);
    expect(status.buffer.pendingEntries).toBe(1);
  });

  it('should track connectivity history', () => {
    manager.setConnectionState('online');
    manager.setConnectionState('offline');
    manager.setConnectionState('online');

    const status = manager.getStatus();
    expect(status.connectivityHistory.length).toBe(3);
  });
});

// ============================================================================
// Edge Mode Configuration Tests
// ============================================================================

describe('EdgeModeConfig', () => {
  it('should provide valid default configuration', () => {
    const config = getDefaultEdgeModeConfig();

    expect(config.buffer.maxSizeBytes).toBeGreaterThan(0);
    expect(config.buffer.maxEntries).toBeGreaterThan(0);
    expect(config.buffer.ttlSeconds).toBeGreaterThan(0);
    expect(config.resync.batchSize).toBeGreaterThan(0);
    expect(config.nodeId).toBeTruthy();
  });

  it('should provide valid default buffer config', () => {
    const config = getDefaultBufferConfig();

    expect(config.maxSizeBytes).toBe(104857600); // 100MB
    expect(config.maxEntries).toBe(100000);
    expect(config.overflowPolicy).toBe('drop_lowest_priority');
  });

  it('should validate configuration', () => {
    const config = getDefaultEdgeModeConfig();
    const errors = validateEdgeModeConfig(config);
    expect(errors).toHaveLength(0);
  });

  it('should detect invalid configuration', () => {
    const config = getDefaultEdgeModeConfig();
    config.buffer.maxSizeBytes = 100; // Too small
    config.buffer.maxEntries = 10; // Too small
    config.nodeId = ''; // Empty

    const errors = validateEdgeModeConfig(config);
    expect(errors.length).toBeGreaterThan(0);
  });
});
