/**
 * Hybrid Storage Backend for AIOBS
 *
 * Combines VictoriaMetrics (metrics) and OpenObserve (logs/traces)
 * into a unified storage backend with intelligent routing.
 *
 * Architecture:
 * - Metrics -> VictoriaMetrics (high-performance time-series)
 * - Logs -> OpenObserve (cost-effective, SQL queries)
 * - Traces -> OpenObserve (distributed tracing)
 */

import {
  StorageBackend,
  StorageBackendType,
  MetricBatch,
  MetricQuery,
  MetricResult,
  LogEntry,
  LogQuery,
  LogResult,
  Span,
  Trace,
  TraceQuery,
  TraceResult,
  VictoriaMetricsConfig,
  OpenObserveConfig,
  MetricDataPoint,
} from './types';
import { ISO8601, TimeRange } from '../core/types/common';
import { VictoriaMetricsConnector } from './victoriametrics-connector';
import { OpenObserveConnector } from './openobserve-connector';

/** Hybrid backend configuration */
export interface HybridBackendConfig {
  /** VictoriaMetrics configuration for metrics */
  victoriametrics: VictoriaMetricsConfig;
  /** OpenObserve configuration for logs and traces */
  openobserve: OpenObserveConfig;
  /** Optional: Enable fallback to memory if backends are unavailable */
  enableFallback?: boolean;
  /** Optional: Health check interval in ms */
  healthCheckInterval?: number;
}

/**
 * Hybrid storage backend that routes data to appropriate backends
 */
export class HybridStorageBackend implements StorageBackend {
  private metricsBackend: VictoriaMetricsConnector;
  private logsBackend: OpenObserveConnector;
  private tracesBackend: OpenObserveConnector;
  private config: HybridBackendConfig;
  private _initialized: boolean = false;
  private healthStatus: {
    metrics: boolean;
    logs: boolean;
    traces: boolean;
  } = {
    metrics: false,
    logs: false,
    traces: false,
  };

  constructor(config: HybridBackendConfig) {
    this.config = config;
    this.metricsBackend = new VictoriaMetricsConnector(config.victoriametrics);
    this.logsBackend = new OpenObserveConnector(config.openobserve);
    this.tracesBackend = this.logsBackend; // Same connector for logs and traces
  }

  /**
   * Get backend type
   */
  getType(): StorageBackendType {
    return 'hybrid';
  }

  /**
   * Check if backend is initialized
   */
  isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Initialize backend connections and verify connectivity
   */
  async initialize(): Promise<void> {
    // Check health of all backends in parallel
    const [metricsHealth, logsHealth] = await Promise.all([
      this.metricsBackend.healthCheck(),
      this.logsBackend.healthCheck(),
    ]);

    this.healthStatus = {
      metrics: metricsHealth,
      logs: logsHealth,
      traces: logsHealth, // Same as logs
    };

    if (!metricsHealth && !logsHealth) {
      throw new Error('All storage backends are unavailable');
    }

    this._initialized = true;

    // Start periodic health checks if configured
    if (this.config.healthCheckInterval) {
      this.startHealthChecks();
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    setInterval(async () => {
      const [metricsHealth, logsHealth] = await Promise.all([
        this.metricsBackend.healthCheck(),
        this.logsBackend.healthCheck(),
      ]);

      this.healthStatus = {
        metrics: metricsHealth,
        logs: logsHealth,
        traces: logsHealth,
      };
    }, this.config.healthCheckInterval!);
  }

  /**
   * Close backend connections
   */
  async close(): Promise<void> {
    this._initialized = false;
  }

  // ============================================================================
  // Metrics Backend Methods (delegated to VictoriaMetrics)
  // ============================================================================

  async writeMetrics(batch: MetricBatch): Promise<void> {
    if (!this.healthStatus.metrics) {
      return;
    }
    return this.metricsBackend.writeMetrics(batch);
  }

  async queryMetrics(query: MetricQuery): Promise<MetricResult> {
    if (!this.healthStatus.metrics) {
      throw new Error('Metrics backend unavailable');
    }
    return this.metricsBackend.queryMetrics(query);
  }

  async queryInstant(query: string, time?: ISO8601): Promise<MetricResult> {
    if (!this.healthStatus.metrics) {
      throw new Error('Metrics backend unavailable');
    }
    return this.metricsBackend.queryInstant(query, time);
  }

  async queryRange(query: string, range: TimeRange, step: string): Promise<MetricResult> {
    if (!this.healthStatus.metrics) {
      throw new Error('Metrics backend unavailable');
    }
    return this.metricsBackend.queryRange(query, range, step);
  }

  async getLabelValues(labelName: string, match?: string[]): Promise<string[]> {
    if (!this.healthStatus.metrics) {
      throw new Error('Metrics backend unavailable');
    }
    return this.metricsBackend.getLabelValues(labelName, match);
  }

  async getSeries(match: string[], range?: TimeRange): Promise<Record<string, string>[]> {
    if (!this.healthStatus.metrics) {
      throw new Error('Metrics backend unavailable');
    }
    return this.metricsBackend.getSeries(match, range);
  }

  async deleteSeries(match: string[], range?: TimeRange): Promise<void> {
    if (!this.healthStatus.metrics) {
      throw new Error('Metrics backend unavailable');
    }
    return this.metricsBackend.deleteSeries?.(match, range);
  }

  // ============================================================================
  // Logs Backend Methods (delegated to OpenObserve)
  // ============================================================================

  async writeLogs(logs: LogEntry[], stream?: string): Promise<void> {
    if (!this.healthStatus.logs) {
      return;
    }
    return this.logsBackend.writeLogs(logs, stream);
  }

  async queryLogs(query: LogQuery): Promise<LogResult> {
    if (!this.healthStatus.logs) {
      throw new Error('Logs backend unavailable');
    }
    return this.logsBackend.queryLogs(query);
  }

  async searchLogs(searchText: string, range: TimeRange, stream?: string): Promise<LogResult> {
    if (!this.healthStatus.logs) {
      throw new Error('Logs backend unavailable');
    }
    return this.logsBackend.searchLogs(searchText, range, stream);
  }

  async getStreams(): Promise<string[]> {
    if (!this.healthStatus.logs) {
      throw new Error('Logs backend unavailable');
    }
    return this.logsBackend.getStreams();
  }

  async getFields(stream: string): Promise<string[]> {
    if (!this.healthStatus.logs) {
      throw new Error('Logs backend unavailable');
    }
    return this.logsBackend.getFields(stream);
  }

  // ============================================================================
  // Traces Backend Methods (delegated to OpenObserve)
  // ============================================================================

  async writeTraces(spans: Span[]): Promise<void> {
    if (!this.healthStatus.traces) {
      return;
    }
    return this.tracesBackend.writeTraces(spans);
  }

  async queryTraces(query: TraceQuery): Promise<TraceResult> {
    if (!this.healthStatus.traces) {
      throw new Error('Traces backend unavailable');
    }
    return this.tracesBackend.queryTraces(query);
  }

  async getTrace(traceId: string): Promise<Trace | null> {
    if (!this.healthStatus.traces) {
      throw new Error('Traces backend unavailable');
    }
    return this.tracesBackend.getTrace(traceId);
  }

  async getServices(): Promise<string[]> {
    if (!this.healthStatus.traces) {
      throw new Error('Traces backend unavailable');
    }
    return this.tracesBackend.getServices();
  }

  async getOperations(serviceName: string): Promise<string[]> {
    if (!this.healthStatus.traces) {
      throw new Error('Traces backend unavailable');
    }
    return this.tracesBackend.getOperations(serviceName);
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<boolean> {
    const [metricsHealth, logsHealth] = await Promise.all([
      this.metricsBackend.healthCheck(),
      this.logsBackend.healthCheck(),
    ]);

    this.healthStatus = {
      metrics: metricsHealth,
      logs: logsHealth,
      traces: logsHealth,
    };

    // Return true if at least one backend is healthy
    return metricsHealth || logsHealth;
  }

  /**
   * Get detailed health status
   */
  getHealthStatus(): typeof this.healthStatus {
    return { ...this.healthStatus };
  }

  // ============================================================================
  // AI-Specific Convenience Methods
  // ============================================================================

  /**
   * Write comprehensive AI observability data
   */
  async writeAIObservability(data: AIObservabilityData): Promise<void> {
    const promises: Promise<void>[] = [];

    // Write metrics to VictoriaMetrics
    if (data.metrics && data.metrics.length > 0) {
      promises.push(this.writeMetrics({ metrics: data.metrics }));
    }

    // Write logs to OpenObserve
    if (data.logs && data.logs.length > 0) {
      promises.push(this.writeLogs(data.logs, data.logStream));
    }

    // Write traces to OpenObserve
    if (data.traces && data.traces.length > 0) {
      promises.push(this.writeTraces(data.traces));
    }

    await Promise.all(promises);
  }

  /**
   * Query AI model health across all backends
   */
  async queryModelHealth(modelId: string, range: TimeRange): Promise<ModelHealthSummary> {
    const [metricsResult, logsResult] = await Promise.all([
      // Get metrics from VictoriaMetrics
      this.healthStatus.metrics
        ? this.queryRange(`{model_id="${modelId}"}`, range, '5m').catch(() => null)
        : Promise.resolve(null),

      // Get error logs from OpenObserve
      this.healthStatus.logs
        ? this.queryLogs({
            query: `SELECT * FROM "aiobs_logs" WHERE model_id = '${modelId}' AND level IN ('error', 'fatal')`,
            range,
            limit: 100,
          }).catch(() => null)
        : Promise.resolve(null),
    ]);

    return {
      modelId,
      range,
      metricsAvailable: metricsResult !== null,
      logsAvailable: logsResult !== null,
      errorCount: logsResult?.total ?? 0,
      lastChecked: new Date().toISOString(),
    };
  }
}

// ============================================================================
// Types
// ============================================================================

interface AIObservabilityData {
  metrics?: MetricDataPoint[];
  logs?: LogEntry[];
  traces?: Span[];
  logStream?: string;
}

interface ModelHealthSummary {
  modelId: string;
  range: TimeRange;
  metricsAvailable: boolean;
  logsAvailable: boolean;
  errorCount: number;
  lastChecked: ISO8601;
}

// ============================================================================
// Factory function
// ============================================================================

/**
 * Create a hybrid storage backend instance
 */
export function createHybridBackend(config: HybridBackendConfig): HybridStorageBackend {
  return new HybridStorageBackend(config);
}

/**
 * Create a pre-configured hybrid backend for AIOBS
 */
export function createAIOBSStorageBackend(options: {
  victoriaMetricsUrl: string;
  openObserveUrl: string;
  openObserveOrg: string;
  openObserveUser: string;
  openObservePassword: string;
  vmTenantId?: string;
}): HybridStorageBackend {
  const vmConfig: VictoriaMetricsConfig = {
    baseUrl: options.victoriaMetricsUrl,
  };
  if (options.vmTenantId) {
    vmConfig.tenantId = options.vmTenantId;
  }

  return new HybridStorageBackend({
    victoriametrics: vmConfig,
    openobserve: {
      baseUrl: options.openObserveUrl,
      organization: options.openObserveOrg,
      username: options.openObserveUser,
      password: options.openObservePassword,
    },
    healthCheckInterval: 30000, // 30 seconds
  });
}
