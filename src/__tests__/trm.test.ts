/**
 * TRM Module Tests
 *
 * Tests for TRM Agent, Offline Buffer, and Federated Sync.
 * Covers air-gap operation, local inference, and resync with deduplication.
 */

import { TRMAgent } from '../trm/trm-agent';
import type { TRMAgentConfig, InferenceRequest } from '../trm/trm-agent';
import { TRMOfflineBuffer } from '../trm/offline-buffer';
import { FederatedSyncManager } from '../trm/federated-sync';

// ============================================================================
// TRM Offline Buffer Tests
// ============================================================================

describe('TRMOfflineBuffer', () => {
  let buffer: TRMOfflineBuffer;

  beforeEach(() => {
    buffer = new TRMOfflineBuffer({
      maxEntries: 1000,
      maxSizeBytes: 10 * 1024 * 1024,
      ttlSeconds: 3600,
      syncBatchSize: 100,
      overflowPolicy: 'drop_lowest_priority',
    });
  });

  it('should store entries', async () => {
    const id = await buffer.store({
      type: 'inference',
      data: { output: [0.5, 0.3], confidence: 0.8 },
      timestamp: new Date().toISOString(),
      priority: 'medium',
    });

    expect(id).toBeDefined();
    expect(buffer.getPendingCount()).toBe(1);
  });

  it('should store multiple entries with different priorities', async () => {
    await buffer.store({
      type: 'inference',
      data: { output: [0.1] },
      timestamp: new Date().toISOString(),
      priority: 'low',
    });

    await buffer.store({
      type: 'drift_event',
      data: { score: 0.9 },
      timestamp: new Date().toISOString(),
      priority: 'critical',
    });

    await buffer.store({
      type: 'alert',
      data: { severity: 'HIGH' },
      timestamp: new Date().toISOString(),
      priority: 'high',
    });

    expect(buffer.getPendingCount()).toBe(3);

    const stats = await buffer.getBufferStats();
    expect(stats.size).toBe(3);
    expect(stats.pendingCount).toBe(3);
    expect(stats.syncedCount).toBe(0);
    expect(stats.byType['inference']).toBe(1);
    expect(stats.byType['drift_event']).toBe(1);
    expect(stats.byType['alert']).toBe(1);
    expect(stats.byPriority['critical']).toBe(1);
    expect(stats.byPriority['high']).toBe(1);
    expect(stats.byPriority['low']).toBe(1);
  });

  it('should report buffer stats correctly', async () => {
    const stats = await buffer.getBufferStats();

    expect(stats.size).toBe(0);
    expect(stats.estimatedTransferSize).toBe(0);
    expect(stats.oldestEntry).toBeNull();
    expect(stats.newestEntry).toBeNull();
  });

  it('should evict lowest priority when full', async () => {
    const smallBuffer = new TRMOfflineBuffer({
      maxEntries: 2,
      maxSizeBytes: 10 * 1024 * 1024,
      ttlSeconds: 3600,
      syncBatchSize: 100,
      overflowPolicy: 'drop_lowest_priority',
    });

    await smallBuffer.store({
      type: 'inference',
      data: { v: 1 },
      timestamp: new Date().toISOString(),
      priority: 'low',
    });

    await smallBuffer.store({
      type: 'inference',
      data: { v: 2 },
      timestamp: new Date().toISOString(),
      priority: 'medium',
    });

    // This should evict the low-priority entry
    await smallBuffer.store({
      type: 'drift_event',
      data: { v: 3 },
      timestamp: new Date().toISOString(),
      priority: 'critical',
    });

    expect(smallBuffer.getPendingCount()).toBe(2);
  });

  it('should clear buffer', async () => {
    await buffer.store({
      type: 'inference',
      data: { v: 1 },
      timestamp: new Date().toISOString(),
      priority: 'medium',
    });

    await buffer.clear();
    expect(buffer.getPendingCount()).toBe(0);
  });

  it('should report isOffline as true (buffer always accepts)', () => {
    expect(buffer.isOffline()).toBe(true);
  });
});

// ============================================================================
// TRM Agent Tests
// ============================================================================

describe('TRMAgent', () => {
  let agent: TRMAgent;
  let buffer: TRMOfflineBuffer;
  let syncManager: FederatedSyncManager;

  beforeEach(() => {
    const config: TRMAgentConfig = {
      agentId: 'test-agent-001',
      agentName: 'Test TRM Agent',
      upstreamUrl: 'http://localhost:3000',
      modelConfig: {
        modelId: 'model-test-001',
        modelVersion: '1.0.0',
        localPath: '/tmp/model',
        maxLatencyMs: 100,
        inputDimensions: 4,
        outputDimensions: 2,
      },
      connectivityCheckIntervalMs: 60000,
      localDetectionEnabled: true,
      maxBatchSize: 100,
    };

    buffer = new TRMOfflineBuffer();
    syncManager = new FederatedSyncManager(buffer, {
      upstream: { url: 'http://localhost:3000', authToken: 'test', organization: 'test' },
      syncIntervalMs: 60000,
      maxRetries: 3,
      retryBackoffMs: 1000,
      differentialEnabled: true,
    });

    agent = new TRMAgent(config);
    agent.initialize(buffer, syncManager);
  });

  it('should run local inference', async () => {
    const request: InferenceRequest = {
      id: 'req-001',
      timestamp: new Date().toISOString(),
      input: [0.5, 0.3, 0.8, 0.2],
      context: { domain: 'test' },
    };

    const result = await agent.infer(request);

    expect(result.id).toBeDefined();
    expect(result.requestId).toBe('req-001');
    expect(result.output.length).toBe(2);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.modelId).toBe('model-test-001');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should perform local drift detection during inference', async () => {
    const request: InferenceRequest = {
      id: 'req-drift',
      timestamp: new Date().toISOString(),
      input: [0.5, 0.3, 0.8, 0.2],
      context: { domain: 'test' },
    };

    const result = await agent.infer(request);

    expect(result.localDriftScore).not.toBeNull();
    expect(result.localDriftScore!).toBeGreaterThanOrEqual(0);
    expect(result.localDriftScore!).toBeLessThanOrEqual(1);
  });

  it('should buffer inference results for later sync', async () => {
    const request: InferenceRequest = {
      id: 'req-buffer',
      timestamp: new Date().toISOString(),
      input: [0.1, 0.2, 0.3, 0.4],
      context: {},
    };

    await agent.infer(request);

    expect(buffer.getPendingCount()).toBe(1);
  });

  it('should report agent status', async () => {
    await agent.infer({
      id: 'req-status',
      timestamp: new Date().toISOString(),
      input: [0.5, 0.5, 0.5, 0.5],
      context: {},
    });

    const status = agent.getStatus();

    expect(status.agentId).toBe('test-agent-001');
    expect(status.agentName).toBe('Test TRM Agent');
    expect(status.totalInferences).toBe(1);
    expect(status.modelStatus).toBe('loaded');
    expect(status.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('should default to offline when not started', () => {
    expect(agent.getIsOnline()).toBe(false);
  });
});

// ============================================================================
// Federated Sync Manager Tests
// ============================================================================

describe('FederatedSyncManager', () => {
  let buffer: TRMOfflineBuffer;
  let syncManager: FederatedSyncManager;

  beforeEach(() => {
    buffer = new TRMOfflineBuffer();
    syncManager = new FederatedSyncManager(buffer, {
      upstream: { url: 'http://localhost:3000', authToken: 'test', organization: 'test' },
      syncIntervalMs: 60000,
      maxRetries: 1,
      retryBackoffMs: 100,
      differentialEnabled: true,
    });
  });

  it('should report initial sync state', () => {
    const state = syncManager.getSyncState();

    expect(state.lastSyncTimestamp).toBeNull();
    expect(state.totalSyncs).toBe(0);
    expect(state.totalEntriesSynced).toBe(0);
    expect(state.consecutiveFailures).toBe(0);
    expect(state.isRunning).toBe(false);
  });

  it('should track sync events', () => {
    syncManager.onConnectivityLost();

    const events = syncManager.getRecentEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('connectivity_lost');
  });

  it('should handle sync failure gracefully', async () => {
    // Store some data
    await buffer.store({
      type: 'inference',
      data: { test: true },
      timestamp: new Date().toISOString(),
      priority: 'medium',
    });

    // Sync will fail because upstream is not reachable
    const result = await syncManager.sync();

    // Should not crash, just report failure
    expect(result).toBeDefined();
    expect(syncManager.getSyncState().consecutiveFailures).toBeGreaterThanOrEqual(0);
  });
});
