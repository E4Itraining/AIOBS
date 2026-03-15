/**
 * Skophia Module Tests
 *
 * Tests for OTel Pipeline ingestion and routing.
 */

import { OTelPipeline, createDefaultPipeline } from '../core/skophia/otel-pipeline';
import type { OTelMetric, OTelSpan, OTelLog, OTelResource } from '../core/skophia/otel-pipeline';

describe('OTelPipeline', () => {
  let pipeline: OTelPipeline;

  const testResource: OTelResource = {
    serviceName: 'test-service',
    serviceVersion: '1.0.0',
    deploymentEnvironment: 'test',
    attributes: {},
  };

  beforeEach(() => {
    pipeline = new OTelPipeline({
      victoriaMetricsUrl: 'http://localhost:8428',
      openObserveUrl: 'http://localhost:5080',
      openObserveOrg: 'default',
      openObserveUser: 'admin',
      openObservePassword: 'test',
      maxBatchSize: 100,
      flushIntervalMs: 30000,
      airgapBufferEnabled: true,
      airgapBufferMaxBytes: 100 * 1024 * 1024,
    });
  });

  afterEach(async () => {
    await pipeline.stop();
  });

  it('should ingest metrics and return result', async () => {
    const metrics: OTelMetric[] = [
      {
        name: 'cpu_usage',
        description: 'CPU usage percentage',
        unit: '%',
        type: 'gauge',
        dataPoints: [
          { timestamp: new Date().toISOString(), value: 45.2, attributes: { host: 'srv-001' } },
        ],
        resource: testResource,
      },
    ];

    const result = await pipeline.ingestMetrics(metrics);

    expect(result.accepted).toBe(1);
    expect(result.rejected).toBe(0);
    expect(result.routedTo).toContain('victoriametrics');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should ingest traces and return result', async () => {
    const spans: OTelSpan[] = [
      {
        traceId: 'abc123',
        spanId: 'span001',
        parentSpanId: null,
        name: 'inference',
        kind: 'server',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        attributes: { model_id: 'model-001' },
        status: { code: 'ok' },
        events: [],
        resource: testResource,
      },
    ];

    const result = await pipeline.ingestTraces(spans);

    expect(result.accepted).toBe(1);
    expect(result.rejected).toBe(0);
    expect(result.routedTo).toContain('openobserve');
  });

  it('should ingest logs and return result', async () => {
    const logs: OTelLog[] = [
      {
        timestamp: new Date().toISOString(),
        severityNumber: 9,
        severityText: 'INFO',
        body: 'Inference completed successfully',
        attributes: { model_id: 'model-001' },
        resource: testResource,
      },
    ];

    const result = await pipeline.ingestLogs(logs);

    expect(result.accepted).toBe(1);
    expect(result.rejected).toBe(0);
    expect(result.routedTo).toContain('openobserve');
  });

  it('should reject invalid metrics', async () => {
    const metrics: OTelMetric[] = [
      {
        name: '',
        description: '',
        unit: '',
        type: 'gauge',
        dataPoints: [],
        resource: testResource,
      },
    ];

    const result = await pipeline.ingestMetrics(metrics);

    expect(result.accepted).toBe(0);
    expect(result.rejected).toBe(1);
  });

  it('should track pipeline stats', async () => {
    const metrics: OTelMetric[] = [
      {
        name: 'test_metric',
        description: 'test',
        unit: 'count',
        type: 'sum',
        dataPoints: [
          { timestamp: new Date().toISOString(), value: 1, attributes: {} },
        ],
        resource: testResource,
      },
    ];

    await pipeline.ingestMetrics(metrics);

    const stats = pipeline.getStats();
    expect(stats.totalIngested).toBe(1);
    expect(stats.metricBufferSize).toBe(1);
    expect(stats.isRunning).toBe(false);
  });

  it('should create default pipeline from env', () => {
    const defaultPipeline = createDefaultPipeline();
    expect(defaultPipeline).toBeDefined();

    const stats = defaultPipeline.getStats();
    expect(stats.totalIngested).toBe(0);
    expect(stats.isRunning).toBe(false);
  });
});
