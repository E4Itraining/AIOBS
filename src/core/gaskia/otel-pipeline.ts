/**
 * Unified OpenTelemetry Ingestion Pipeline
 *
 * Receives OTLP data (metrics, traces, logs) and routes them to the
 * appropriate sovereign storage backends (VictoriaMetrics, OpenObserve).
 * No external cloud dependency — all data stays on-premise.
 *
 * @cybersec Sovereign telemetry pipeline for defense/OIV environments
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// OTLP Types
// ============================================================================

/** OTLP resource attributes */
export interface OTelResource {
  serviceName: string;
  serviceVersion: string;
  deploymentEnvironment: string;
  attributes: Record<string, string | number | boolean>;
}

/** OTLP metric data point */
export interface OTelMetric {
  name: string;
  description: string;
  unit: string;
  type: 'gauge' | 'sum' | 'histogram' | 'summary';
  dataPoints: OTelDataPoint[];
  resource: OTelResource;
}

export interface OTelDataPoint {
  timestamp: string;
  value: number;
  attributes: Record<string, string>;
}

/** OTLP trace span */
export interface OTelSpan {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  kind: 'internal' | 'server' | 'client' | 'producer' | 'consumer';
  startTime: string;
  endTime: string;
  attributes: Record<string, string | number | boolean>;
  status: { code: 'ok' | 'error' | 'unset'; message?: string };
  events: OTelSpanEvent[];
  resource: OTelResource;
}

export interface OTelSpanEvent {
  name: string;
  timestamp: string;
  attributes: Record<string, string | number | boolean>;
}

/** OTLP log record */
export interface OTelLog {
  timestamp: string;
  severityNumber: number;
  severityText: string;
  body: string;
  attributes: Record<string, string | number | boolean>;
  resource: OTelResource;
  traceId?: string;
  spanId?: string;
}

/** Pipeline ingestion result */
export interface IngestionResult {
  id: string;
  timestamp: string;
  accepted: number;
  rejected: number;
  routedTo: string[];
  durationMs: number;
  errors: string[];
}

/** Pipeline configuration */
export interface OTelPipelineConfig {
  /** VictoriaMetrics endpoint for metrics */
  victoriaMetricsUrl: string;
  /** OpenObserve endpoint for logs/traces */
  openObserveUrl: string;
  /** OpenObserve organization */
  openObserveOrg: string;
  /** OpenObserve credentials */
  openObserveUser: string;
  openObservePassword: string;
  /** Maximum batch size before flush */
  maxBatchSize: number;
  /** Flush interval in milliseconds */
  flushIntervalMs: number;
  /** Enable local buffering for air-gap mode */
  airgapBufferEnabled: boolean;
  /** Maximum buffer size in bytes */
  airgapBufferMaxBytes: number;
}

// ============================================================================
// Pipeline Implementation
// ============================================================================

/**
 * Unified OTel ingestion pipeline for Gaskia
 *
 * @cybersec Routes all telemetry to sovereign storage — no external egress
 */
export class OTelPipeline {
  private config: OTelPipelineConfig;
  private metricBuffer: OTelMetric[] = [];
  private spanBuffer: OTelSpan[] = [];
  private logBuffer: OTelLog[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private totalIngested: number = 0;
  private totalErrors: number = 0;

  constructor(config: OTelPipelineConfig) {
    this.config = config;
  }

  /**
   * Start the pipeline with periodic flush
   * @cybersec Ensures telemetry is persisted even during partial failures
   */
  start(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushIntervalMs);
  }

  /**
   * Stop the pipeline and flush remaining data
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  /**
   * Ingest OTLP metrics
   * Routes to VictoriaMetrics via Prometheus remote write format
   */
  async ingestMetrics(metrics: OTelMetric[]): Promise<IngestionResult> {
    const start = Date.now();
    const id = uuidv4();
    let accepted = 0;
    let rejected = 0;
    const errors: string[] = [];

    for (const metric of metrics) {
      if (this.validateMetric(metric)) {
        this.metricBuffer.push(metric);
        accepted++;
      } else {
        rejected++;
        errors.push(`Invalid metric: ${metric.name}`);
      }
    }

    if (this.metricBuffer.length >= this.config.maxBatchSize) {
      await this.flushMetrics();
    }

    this.totalIngested += accepted;

    return {
      id,
      timestamp: new Date().toISOString(),
      accepted,
      rejected,
      routedTo: ['victoriametrics'],
      durationMs: Date.now() - start,
      errors,
    };
  }

  /**
   * Ingest OTLP traces
   * Routes to OpenObserve for sovereign trace storage
   */
  async ingestTraces(spans: OTelSpan[]): Promise<IngestionResult> {
    const start = Date.now();
    const id = uuidv4();
    let accepted = 0;
    let rejected = 0;
    const errors: string[] = [];

    for (const span of spans) {
      if (this.validateSpan(span)) {
        this.spanBuffer.push(span);
        accepted++;
      } else {
        rejected++;
        errors.push(`Invalid span: ${span.name}`);
      }
    }

    if (this.spanBuffer.length >= this.config.maxBatchSize) {
      await this.flushSpans();
    }

    this.totalIngested += accepted;

    return {
      id,
      timestamp: new Date().toISOString(),
      accepted,
      rejected,
      routedTo: ['openobserve'],
      durationMs: Date.now() - start,
      errors,
    };
  }

  /**
   * Ingest OTLP logs
   * Routes to OpenObserve for sovereign log storage
   */
  async ingestLogs(logs: OTelLog[]): Promise<IngestionResult> {
    const start = Date.now();
    const id = uuidv4();
    let accepted = 0;
    let rejected = 0;
    const errors: string[] = [];

    for (const log of logs) {
      if (this.validateLog(log)) {
        this.logBuffer.push(log);
        accepted++;
      } else {
        rejected++;
        errors.push(`Invalid log record`);
      }
    }

    if (this.logBuffer.length >= this.config.maxBatchSize) {
      await this.flushLogs();
    }

    this.totalIngested += accepted;

    return {
      id,
      timestamp: new Date().toISOString(),
      accepted,
      rejected,
      routedTo: ['openobserve'],
      durationMs: Date.now() - start,
      errors,
    };
  }

  /**
   * Get pipeline statistics
   */
  getStats(): PipelineStats {
    return {
      totalIngested: this.totalIngested,
      totalErrors: this.totalErrors,
      metricBufferSize: this.metricBuffer.length,
      spanBufferSize: this.spanBuffer.length,
      logBufferSize: this.logBuffer.length,
      isRunning: this.flushTimer !== null,
    };
  }

  /**
   * Flush all buffers to storage backends
   */
  async flush(): Promise<void> {
    await Promise.all([
      this.flushMetrics(),
      this.flushSpans(),
      this.flushLogs(),
    ]);
  }

  // ===========================================================================
  // Private: Flush to storage backends
  // ===========================================================================

  private async flushMetrics(): Promise<void> {
    if (this.metricBuffer.length === 0) return;
    const batch = this.metricBuffer.splice(0);

    try {
      // Convert to Prometheus remote write format for VictoriaMetrics
      const payload = this.metricsToPrometheusFormat(batch);
      await this.sendToVictoriaMetrics(payload);
    } catch (error) {
      this.totalErrors += batch.length;
      if (this.config.airgapBufferEnabled) {
        // Re-queue for later flush in air-gap mode
        this.metricBuffer.unshift(...batch);
      }
    }
  }

  private async flushSpans(): Promise<void> {
    if (this.spanBuffer.length === 0) return;
    const batch = this.spanBuffer.splice(0);

    try {
      await this.sendToOpenObserve('traces', batch);
    } catch (error) {
      this.totalErrors += batch.length;
      if (this.config.airgapBufferEnabled) {
        this.spanBuffer.unshift(...batch);
      }
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;
    const batch = this.logBuffer.splice(0);

    try {
      await this.sendToOpenObserve('logs', batch);
    } catch (error) {
      this.totalErrors += batch.length;
      if (this.config.airgapBufferEnabled) {
        this.logBuffer.unshift(...batch);
      }
    }
  }

  // ===========================================================================
  // Private: Storage backend communication
  // ===========================================================================

  private async sendToVictoriaMetrics(payload: string): Promise<void> {
    const url = `${this.config.victoriaMetricsUrl}/api/v1/import/prometheus`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: payload,
    });
    if (!response.ok) {
      throw new Error(`VictoriaMetrics ingestion failed: ${response.status}`);
    }
  }

  private async sendToOpenObserve(stream: string, data: unknown[]): Promise<void> {
    const url = `${this.config.openObserveUrl}/api/${this.config.openObserveOrg}/${stream}/_json`;
    const auth = Buffer.from(
      `${this.config.openObserveUser}:${this.config.openObservePassword}`
    ).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`OpenObserve ingestion failed: ${response.status}`);
    }
  }

  private metricsToPrometheusFormat(metrics: OTelMetric[]): string {
    const lines: string[] = [];
    for (const metric of metrics) {
      const sanitizedName = metric.name.replace(/[^a-zA-Z0-9_:]/g, '_');
      for (const dp of metric.dataPoints) {
        const labels = Object.entries(dp.attributes)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        const labelStr = labels ? `{${labels}}` : '';
        const ts = new Date(dp.timestamp).getTime();
        lines.push(`${sanitizedName}${labelStr} ${dp.value} ${ts}`);
      }
    }
    return lines.join('\n');
  }

  // ===========================================================================
  // Private: Validation
  // ===========================================================================

  private validateMetric(metric: OTelMetric): boolean {
    return (
      typeof metric.name === 'string' &&
      metric.name.length > 0 &&
      Array.isArray(metric.dataPoints) &&
      metric.dataPoints.length > 0
    );
  }

  private validateSpan(span: OTelSpan): boolean {
    return (
      typeof span.traceId === 'string' &&
      span.traceId.length > 0 &&
      typeof span.spanId === 'string' &&
      span.spanId.length > 0 &&
      typeof span.name === 'string'
    );
  }

  private validateLog(log: OTelLog): boolean {
    return (
      typeof log.timestamp === 'string' &&
      typeof log.body === 'string'
    );
  }
}

/** Pipeline statistics */
export interface PipelineStats {
  totalIngested: number;
  totalErrors: number;
  metricBufferSize: number;
  spanBufferSize: number;
  logBufferSize: number;
  isRunning: boolean;
}

/**
 * Create a default OTel pipeline from environment variables
 */
export function createDefaultPipeline(): OTelPipeline {
  return new OTelPipeline({
    victoriaMetricsUrl: process.env.VICTORIA_METRICS_URL || 'http://localhost:8428',
    openObserveUrl: process.env.OPENOBSERVE_URL || 'http://localhost:5080',
    openObserveOrg: process.env.OPENOBSERVE_ORG || 'default',
    openObserveUser: process.env.OPENOBSERVE_USER || 'admin',
    openObservePassword: process.env.OPENOBSERVE_PASSWORD || '',
    maxBatchSize: 1000,
    flushIntervalMs: 5000,
    airgapBufferEnabled: process.env.AIOBS_EDGE_MODE === 'true',
    airgapBufferMaxBytes: 100 * 1024 * 1024, // 100MB
  });
}
