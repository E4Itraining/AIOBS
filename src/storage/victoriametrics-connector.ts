/**
 * VictoriaMetrics Connector for AIOBS
 *
 * High-performance time-series metrics storage backend
 * using VictoriaMetrics remote write and query APIs.
 *
 * Features:
 * - Prometheus remote write compatible
 * - PromQL query support
 * - Multi-tenant support
 * - Automatic retry with exponential backoff
 * - Connection pooling
 */

// Node.js/Browser globals declarations
declare const Buffer: {
  from(str: string): { toString(encoding: string): string };
};
declare const AbortController: {
  new (): { signal: unknown; abort(): void };
};
declare const AbortSignal: {
  timeout(ms: number): unknown;
};
declare function setTimeout(callback: () => void, ms: number): unknown;
declare function clearTimeout(id: unknown): void;
declare function fetch(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: unknown;
  }
): Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
  headers: { get(name: string): string | null };
}>;

import {
  MetricsBackend,
  MetricBatch,
  MetricDataPoint,
  MetricQuery,
  MetricResult,
  MetricResultData,
  VictoriaMetricsConfig,
  RetryConfig,
  QueryStats,
} from './types';
import { ISO8601, TimeRange } from '../core/types/common';

/** Default retry configuration */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/** Default timeout in milliseconds */
const DEFAULT_TIMEOUT = 30000;

/**
 * VictoriaMetrics connector implementing MetricsBackend interface
 */
export class VictoriaMetricsConnector implements MetricsBackend {
  private config: VictoriaMetricsConfig;
  private retryConfig: RetryConfig;

  constructor(config: VictoriaMetricsConfig) {
    this.config = {
      ...config,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
    };
    this.retryConfig = config.retry ?? DEFAULT_RETRY_CONFIG;
  }

  /**
   * Build authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
    } else if (this.config.username && this.config.password) {
      const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString(
        'base64'
      );
      headers['Authorization'] = `Basic ${auth}`;
    }

    return headers;
  }

  /**
   * Build base URL with optional tenant path
   */
  private getBaseUrl(path: string): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');

    // Multi-tenant cluster mode
    if (this.config.tenantId) {
      return `${baseUrl}/insert/${this.config.tenantId}/prometheus${path}`;
    }

    return `${baseUrl}${path}`;
  }

  /**
   * Build query URL (select path for cluster mode)
   */
  private getQueryUrl(path: string): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');

    if (this.config.tenantId) {
      return `${baseUrl}/select/${this.config.tenantId}/prometheus${path}`;
    }

    return `${baseUrl}${path}`;
  }

  /**
   * Execute HTTP request with retry logic
   */
  private async executeWithRetry<T>(
    method: 'GET' | 'POST' | 'DELETE',
    url: string,
    body?: unknown
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.retryConfig.initialDelayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);

        const response = await fetch(url, {
          method,
          headers: this.getAuthHeaders(),
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`VictoriaMetrics error: ${response.status} - ${errorText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return (await response.json()) as T;
        }

        return (await response.text()) as unknown as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on abort or client errors (4xx)
        if (
          error instanceof Error &&
          (error.name === 'AbortError' || error.message.includes('4'))
        ) {
          throw error;
        }

        if (attempt < this.retryConfig.maxRetries) {
          await this.sleep(delay);
          delay = Math.min(delay * this.retryConfig.backoffMultiplier, this.retryConfig.maxDelayMs);
        }
      }
    }

    throw lastError || new Error('VictoriaMetrics request failed');
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Convert metrics to Prometheus remote write format (line protocol)
   */
  private toPrometheusFormat(metrics: MetricDataPoint[]): string {
    return metrics
      .map((m) => {
        const labels = Object.entries(m.labels)
          .map(([k, v]) => `${k}="${v.replace(/"/g, '\\"')}"`)
          .join(',');

        const labelStr = labels ? `{${labels}}` : '';
        return `${m.name}${labelStr} ${m.value} ${m.timestamp}`;
      })
      .join('\n');
  }

  /**
   * Write metrics batch to VictoriaMetrics
   */
  async writeMetrics(batch: MetricBatch): Promise<void> {
    if (batch.metrics.length === 0) {
      return;
    }

    const url = this.getBaseUrl('/api/v1/import/prometheus');
    const body = this.toPrometheusFormat(batch.metrics);

    await this.executeWithRetry<void>('POST', url, body);
  }

  /**
   * Query metrics using PromQL
   */
  async queryMetrics(query: MetricQuery): Promise<MetricResult> {
    if (query.range) {
      return this.queryRange(query.query, query.range, query.step || '1m');
    }

    return this.queryInstant(query.query, query.time);
  }

  /**
   * Execute instant query (single point in time)
   */
  async queryInstant(query: string, time?: ISO8601): Promise<MetricResult> {
    const params = new URLSearchParams({ query });
    if (time) {
      params.append('time', new Date(time).getTime().toString());
    }

    const url = `${this.getQueryUrl('/api/v1/query')}?${params}`;
    const response = await this.executeWithRetry<VictoriaMetricsQueryResponse>('GET', url);

    return this.parseQueryResponse(response);
  }

  /**
   * Execute range query (time series over period)
   */
  async queryRange(query: string, range: TimeRange, step: string): Promise<MetricResult> {
    const params = new URLSearchParams({
      query,
      start: new Date(range.start).getTime().toString(),
      end: new Date(range.end).getTime().toString(),
      step,
    });

    const url = `${this.getQueryUrl('/api/v1/query_range')}?${params}`;
    const response = await this.executeWithRetry<VictoriaMetricsQueryResponse>('GET', url);

    return this.parseQueryResponse(response);
  }

  /**
   * Parse VictoriaMetrics query response
   */
  private parseQueryResponse(response: VictoriaMetricsQueryResponse): MetricResult {
    if (response.status !== 'success') {
      throw new Error(`Query failed: ${response.error || 'Unknown error'}`);
    }

    const data = response.data;
    const resultData: MetricResultData[] = (data.result || []).map(
      (r: VictoriaMetricsResultItem) => ({
        metric: r.metric || {},
        value: r.value,
        values: r.values,
      })
    );

    return {
      resultType: data.resultType as MetricResult['resultType'],
      data: resultData,
      stats: response.stats
        ? {
            seriesFetched: response.stats.seriesFetched || 0,
            executionTimeMs: response.stats.executionTimeMsec || 0,
          }
        : undefined,
    };
  }

  /**
   * Get values for a specific label
   */
  async getLabelValues(labelName: string, match?: string[]): Promise<string[]> {
    const params = new URLSearchParams();
    if (match) {
      match.forEach((m) => params.append('match[]', m));
    }

    const url = `${this.getQueryUrl(`/api/v1/label/${labelName}/values`)}?${params}`;
    const response = await this.executeWithRetry<VictoriaMetricsLabelResponse>('GET', url);

    if (response.status !== 'success') {
      throw new Error(`Failed to get label values: ${response.error}`);
    }

    return response.data || [];
  }

  /**
   * Get series matching selectors
   */
  async getSeries(match: string[], range?: TimeRange): Promise<Record<string, string>[]> {
    const params = new URLSearchParams();
    match.forEach((m) => params.append('match[]', m));

    if (range) {
      params.append('start', new Date(range.start).getTime().toString());
      params.append('end', new Date(range.end).getTime().toString());
    }

    const url = `${this.getQueryUrl('/api/v1/series')}?${params}`;
    const response = await this.executeWithRetry<VictoriaMetricsSeriesResponse>('GET', url);

    if (response.status !== 'success') {
      throw new Error(`Failed to get series: ${response.error}`);
    }

    return response.data || [];
  }

  /**
   * Delete series matching selectors (requires admin privileges)
   */
  async deleteSeries(match: string[], range?: TimeRange): Promise<void> {
    const params = new URLSearchParams();
    match.forEach((m) => params.append('match[]', m));

    if (range) {
      params.append('start', new Date(range.start).getTime().toString());
      params.append('end', new Date(range.end).getTime().toString());
    }

    const url = `${this.getBaseUrl('/api/v1/admin/tsdb/delete_series')}?${params}`;
    await this.executeWithRetry<void>('POST', url);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.config.baseUrl.replace(/\/$/, '')}/-/healthy`;
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // AI-Specific Helper Methods
  // ============================================================================

  /**
   * Write AI model metrics with standard labels
   */
  async writeModelMetrics(
    modelId: string,
    modelVersion: string,
    metrics: Record<string, number>,
    additionalLabels?: Record<string, string>
  ): Promise<void> {
    const timestamp = Date.now();
    const baseLabels = {
      model_id: modelId,
      model_version: modelVersion,
      ...additionalLabels,
    };

    const dataPoints: MetricDataPoint[] = Object.entries(metrics).map(([name, value]) => ({
      name: `aiobs_${name}`,
      timestamp,
      value,
      labels: baseLabels,
    }));

    await this.writeMetrics({ metrics: dataPoints });
  }

  /**
   * Query model performance over time
   */
  async queryModelPerformance(
    modelId: string,
    metricName: string,
    range: TimeRange,
    aggregation: 'avg' | 'max' | 'min' | 'sum' = 'avg'
  ): Promise<MetricResult> {
    const query = `${aggregation}_over_time(${metricName}{model_id="${modelId}"}[5m])`;
    return this.queryRange(query, range, '1m');
  }

  /**
   * Get current drift score for a model
   */
  async getCurrentDriftScore(modelId: string): Promise<number | null> {
    const result = await this.queryInstant(`aiobs_drift_score{model_id="${modelId}"}`);

    if (result.data.length > 0 && result.data[0].value) {
      return parseFloat(result.data[0].value[1]);
    }

    return null;
  }

  /**
   * Get SLO compliance rate
   */
  async getSLOComplianceRate(sloId: string, range: TimeRange): Promise<number | null> {
    const query = `avg_over_time(aiobs_slo_compliance{slo_id="${sloId}"}[${this.getRangeDuration(range)}])`;
    const result = await this.queryInstant(query);

    if (result.data.length > 0 && result.data[0].value) {
      return parseFloat(result.data[0].value[1]);
    }

    return null;
  }

  /**
   * Calculate range duration string
   */
  private getRangeDuration(range: TimeRange): string {
    const startMs = new Date(range.start).getTime();
    const endMs = new Date(range.end).getTime();
    const durationMs = endMs - startMs;

    if (durationMs < 3600000) {
      return `${Math.ceil(durationMs / 60000)}m`;
    } else if (durationMs < 86400000) {
      return `${Math.ceil(durationMs / 3600000)}h`;
    } else {
      return `${Math.ceil(durationMs / 86400000)}d`;
    }
  }
}

// ============================================================================
// VictoriaMetrics Response Types
// ============================================================================

interface VictoriaMetricsQueryResponse {
  status: 'success' | 'error';
  data: {
    resultType: string;
    result: VictoriaMetricsResultItem[];
  };
  error?: string;
  stats?: {
    seriesFetched?: number;
    executionTimeMsec?: number;
  };
}

interface VictoriaMetricsResultItem {
  metric?: Record<string, string>;
  value?: [number, string];
  values?: [number, string][];
}

interface VictoriaMetricsLabelResponse {
  status: 'success' | 'error';
  data?: string[];
  error?: string;
}

interface VictoriaMetricsSeriesResponse {
  status: 'success' | 'error';
  data?: Record<string, string>[];
  error?: string;
}

// ============================================================================
// Factory function
// ============================================================================

/**
 * Create a VictoriaMetrics connector instance
 */
export function createVictoriaMetricsConnector(
  config: VictoriaMetricsConfig
): VictoriaMetricsConnector {
  return new VictoriaMetricsConnector(config);
}
