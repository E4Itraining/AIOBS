/**
 * OpenObserve Connector for AIOBS
 *
 * High-performance logs and traces storage backend
 * using OpenObserve's API with 140x less storage cost.
 *
 * Features:
 * - OpenTelemetry compatible ingestion
 * - SQL query support
 * - Multi-tenant/organization support
 * - Real-time streaming
 * - Automatic retry with exponential backoff
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
  LogsBackend,
  TracesBackend,
  LogEntry,
  LogQuery,
  LogResult,
  Span,
  Trace,
  TraceQuery,
  TraceResult,
  TraceSummary,
  OpenObserveConfig,
  RetryConfig,
  AI_LOG_STREAMS,
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

/** Default stream names */
const DEFAULT_STREAMS = {
  logs: 'aiobs_logs',
  traces: 'aiobs_traces',
};

/**
 * OpenObserve connector implementing LogsBackend and TracesBackend interfaces
 */
export class OpenObserveConnector implements LogsBackend, TracesBackend {
  private config: OpenObserveConfig;
  private retryConfig: RetryConfig;
  private streams: { logs: string; traces: string };

  constructor(config: OpenObserveConfig) {
    this.config = {
      ...config,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
    };
    this.retryConfig = config.retry ?? DEFAULT_RETRY_CONFIG;
    this.streams = {
      logs: config.streams?.logs ?? DEFAULT_STREAMS.logs,
      traces: config.streams?.traces ?? DEFAULT_STREAMS.traces,
    };
  }

  /**
   * Build authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');

    return {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    };
  }

  /**
   * Build API URL
   */
  private getApiUrl(path: string): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    return `${baseUrl}/api/${this.config.organization}${path}`;
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
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          method,
          headers: this.getAuthHeaders(),
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenObserve error: ${response.status} - ${errorText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return (await response.json()) as T;
        }

        return (await response.text()) as unknown as T;
      } catch (error) {
        lastError = error as Error;

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

    throw lastError || new Error('OpenObserve request failed');
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Logs Backend Implementation
  // ============================================================================

  /**
   * Write logs batch to OpenObserve
   */
  async writeLogs(logs: LogEntry[], stream?: string): Promise<void> {
    if (logs.length === 0) {
      return;
    }

    const targetStream = stream ?? this.streams.logs;
    const url = this.getApiUrl(`/${targetStream}/_json`);

    // Convert to OpenObserve format
    const records = logs.map((log) => ({
      _timestamp: new Date(log.timestamp).getTime() * 1000, // microseconds
      level: log.level,
      message: log.message,
      ...log.fields,
      ...(log.resource || {}),
      ...(log.traceContext
        ? {
            trace_id: log.traceContext.traceId,
            span_id: log.traceContext.spanId,
            parent_span_id: log.traceContext.parentSpanId,
          }
        : {}),
    }));

    await this.executeWithRetry<void>('POST', url, records);
  }

  /**
   * Query logs using SQL
   */
  async queryLogs(query: LogQuery): Promise<LogResult> {
    const url = this.getApiUrl('/_search');

    const searchRequest: OpenObserveSearchRequest = {
      query: {
        sql: query.query,
        start_time: new Date(query.range.start).getTime() * 1000,
        end_time: new Date(query.range.end).getTime() * 1000,
        from: query.offset || 0,
        size: query.limit || 100,
      },
    };

    const response = await this.executeWithRetry<OpenObserveSearchResponse>('POST', url, searchRequest);

    const logs: LogEntry[] = (response.hits || []).map((hit: OpenObserveHit) => ({
      timestamp: new Date(hit._timestamp / 1000).toISOString(),
      level: hit.level || 'info',
      message: hit.message || '',
      fields: this.extractFields(hit),
      traceContext: hit.trace_id
        ? {
            traceId: hit.trace_id,
            spanId: hit.span_id || '',
            parentSpanId: hit.parent_span_id,
          }
        : undefined,
    }));

    return {
      logs,
      total: response.total || logs.length,
      hasMore: (query.offset || 0) + logs.length < (response.total || 0),
      took: response.took || 0,
    };
  }

  /**
   * Extract custom fields from OpenObserve hit
   */
  private extractFields(hit: OpenObserveHit): Record<string, unknown> {
    const excludeKeys = [
      '_timestamp',
      'level',
      'message',
      'trace_id',
      'span_id',
      'parent_span_id',
      '_id',
    ];
    const fields: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(hit)) {
      if (!excludeKeys.includes(key)) {
        fields[key] = value;
      }
    }

    return fields;
  }

  /**
   * Search logs with full-text search
   */
  async searchLogs(searchText: string, range: TimeRange, stream?: string): Promise<LogResult> {
    const targetStream = stream ?? this.streams.logs;
    const sqlQuery = `SELECT * FROM "${targetStream}" WHERE match_all('${searchText.replace(/'/g, "''")}') ORDER BY _timestamp DESC`;

    return this.queryLogs({
      query: sqlQuery,
      range,
      stream: targetStream,
    });
  }

  /**
   * Get available streams
   */
  async getStreams(): Promise<string[]> {
    const url = this.getApiUrl('/streams');
    const response = await this.executeWithRetry<OpenObserveStreamsResponse>('GET', url);

    return (response.list || []).map((s: { name: string }) => s.name);
  }

  /**
   * Get field names in a stream
   */
  async getFields(stream: string): Promise<string[]> {
    const url = this.getApiUrl(`/${stream}/schema`);
    const response = await this.executeWithRetry<OpenObserveSchemaResponse>('GET', url);

    return (response.schema || []).map((f: { name: string }) => f.name);
  }

  // ============================================================================
  // Traces Backend Implementation
  // ============================================================================

  /**
   * Write traces/spans to OpenObserve
   */
  async writeTraces(spans: Span[]): Promise<void> {
    if (spans.length === 0) {
      return;
    }

    const url = this.getApiUrl(`/${this.streams.traces}/_json`);

    // Convert to OpenObserve format
    const records = spans.map((span) => ({
      _timestamp: new Date(span.startTime).getTime() * 1000,
      trace_id: span.traceId,
      span_id: span.spanId,
      parent_span_id: span.parentSpanId,
      operation_name: span.operationName,
      service_name: span.serviceName,
      start_time: span.startTime,
      end_time: span.endTime,
      duration_ms: span.durationMs,
      status: span.status,
      kind: span.kind,
      ...span.attributes,
      events: JSON.stringify(span.events),
      links: JSON.stringify(span.links),
    }));

    await this.executeWithRetry<void>('POST', url, records);
  }

  /**
   * Query traces
   */
  async queryTraces(query: TraceQuery): Promise<TraceResult> {
    let sqlQuery = `SELECT DISTINCT trace_id, service_name, operation_name, MIN(_timestamp) as start_time, SUM(duration_ms) as duration_ms, COUNT(*) as span_count FROM "${this.streams.traces}" WHERE 1=1`;

    if (query.traceId) {
      sqlQuery += ` AND trace_id = '${query.traceId}'`;
    }
    if (query.serviceName) {
      sqlQuery += ` AND service_name = '${query.serviceName}'`;
    }
    if (query.operationName) {
      sqlQuery += ` AND operation_name = '${query.operationName}'`;
    }
    if (query.minDuration) {
      sqlQuery += ` AND duration_ms >= ${query.minDuration}`;
    }
    if (query.maxDuration) {
      sqlQuery += ` AND duration_ms <= ${query.maxDuration}`;
    }
    if (query.hasError) {
      sqlQuery += ` AND status = 'error'`;
    }
    if (query.tags) {
      for (const [key, value] of Object.entries(query.tags)) {
        sqlQuery += ` AND ${key} = '${value}'`;
      }
    }

    sqlQuery += ` GROUP BY trace_id, service_name, operation_name ORDER BY start_time DESC`;

    if (query.limit) {
      sqlQuery += ` LIMIT ${query.limit}`;
    }
    if (query.offset) {
      sqlQuery += ` OFFSET ${query.offset}`;
    }

    const range = query.range || {
      start: new Date(Date.now() - 3600000).toISOString(),
      end: new Date().toISOString(),
    };

    const searchResult = await this.queryLogs({
      query: sqlQuery,
      range,
      stream: this.streams.traces,
    });

    const traces: TraceSummary[] = searchResult.logs.map((log) => ({
      traceId: (log.fields.trace_id as string) || '',
      rootService: (log.fields.service_name as string) || '',
      rootOperation: (log.fields.operation_name as string) || '',
      startTime: (log.fields.start_time as string) || log.timestamp,
      durationMs: (log.fields.duration_ms as number) || 0,
      spanCount: (log.fields.span_count as number) || 0,
      errorCount: 0,
      services: [(log.fields.service_name as string) || ''],
    }));

    return {
      traces,
      total: searchResult.total,
      hasMore: searchResult.hasMore,
    };
  }

  /**
   * Get full trace by ID
   */
  async getTrace(traceId: string): Promise<Trace | null> {
    const sqlQuery = `SELECT * FROM "${this.streams.traces}" WHERE trace_id = '${traceId}' ORDER BY _timestamp ASC`;

    const range = {
      start: new Date(Date.now() - 86400000 * 7).toISOString(), // Last 7 days
      end: new Date().toISOString(),
    };

    const result = await this.queryLogs({
      query: sqlQuery,
      range,
      stream: this.streams.traces,
      limit: 1000,
    });

    if (result.logs.length === 0) {
      return null;
    }

    const spans: Span[] = result.logs.map((log) => ({
      traceId: (log.fields.trace_id as string) || traceId,
      spanId: (log.fields.span_id as string) || '',
      parentSpanId: log.fields.parent_span_id as string | undefined,
      operationName: (log.fields.operation_name as string) || '',
      serviceName: (log.fields.service_name as string) || '',
      startTime: (log.fields.start_time as string) || log.timestamp,
      endTime: (log.fields.end_time as string) || log.timestamp,
      durationMs: (log.fields.duration_ms as number) || 0,
      status: (log.fields.status as Span['status']) || 'unset',
      kind: (log.fields.kind as Span['kind']) || 'internal',
      attributes: log.fields,
      events: this.parseJsonField(log.fields.events as string) || [],
      links: this.parseJsonField(log.fields.links as string) || [],
    }));

    // Find root span (no parent)
    const rootSpan = spans.find((s) => !s.parentSpanId) || spans[0];

    // Calculate trace duration
    const startTimes = spans.map((s) => new Date(s.startTime).getTime());
    const endTimes = spans.map((s) => new Date(s.endTime).getTime());
    const traceStart = new Date(Math.min(...startTimes)).toISOString();
    const traceEnd = new Date(Math.max(...endTimes)).toISOString();
    const traceDuration = Math.max(...endTimes) - Math.min(...startTimes);

    // Get unique services
    const services = [...new Set(spans.map((s) => s.serviceName))];

    // Count errors
    const errorCount = spans.filter((s) => s.status === 'error').length;

    return {
      traceId,
      spans,
      rootSpan,
      services,
      durationMs: traceDuration,
      startTime: traceStart,
      endTime: traceEnd,
      errorCount,
    };
  }

  /**
   * Parse JSON field safely
   */
  private parseJsonField<T>(field: string | undefined): T | null {
    if (!field) return null;
    try {
      return JSON.parse(field) as T;
    } catch {
      return null;
    }
  }

  /**
   * Get services from traces
   */
  async getServices(): Promise<string[]> {
    const sqlQuery = `SELECT DISTINCT service_name FROM "${this.streams.traces}"`;

    const range = {
      start: new Date(Date.now() - 86400000).toISOString(),
      end: new Date().toISOString(),
    };

    const result = await this.queryLogs({
      query: sqlQuery,
      range,
      stream: this.streams.traces,
      limit: 1000,
    });

    return result.logs.map((log) => (log.fields.service_name as string) || '').filter(Boolean);
  }

  /**
   * Get operations for a service
   */
  async getOperations(serviceName: string): Promise<string[]> {
    const sqlQuery = `SELECT DISTINCT operation_name FROM "${this.streams.traces}" WHERE service_name = '${serviceName}'`;

    const range = {
      start: new Date(Date.now() - 86400000).toISOString(),
      end: new Date().toISOString(),
    };

    const result = await this.queryLogs({
      query: sqlQuery,
      range,
      stream: this.streams.traces,
      limit: 1000,
    });

    return result.logs.map((log) => (log.fields.operation_name as string) || '').filter(Boolean);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.config.baseUrl.replace(/\/$/, '')}/healthz`;
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
   * Write audit log entry
   */
  async writeAuditLog(entry: AuditLogEntry): Promise<void> {
    const log: LogEntry = {
      timestamp: entry.timestamp,
      level: 'info',
      message: `${entry.action} on ${entry.resourceType}:${entry.resourceId}`,
      fields: {
        action: entry.action,
        actor_type: entry.actor.type,
        actor_id: entry.actor.id,
        actor_name: entry.actor.name,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId,
        outcome: entry.outcome,
        ...entry.metadata,
      },
    };

    await this.writeLogs([log], AI_LOG_STREAMS.AUDIT);
  }

  /**
   * Write security event
   */
  async writeSecurityEvent(event: SecurityEvent): Promise<void> {
    const log: LogEntry = {
      timestamp: new Date().toISOString(),
      level: event.severity === 'critical' ? 'fatal' : event.severity === 'high' ? 'error' : 'warn',
      message: event.description,
      fields: {
        event_type: event.type,
        severity: event.severity,
        source_ip: event.sourceIp,
        target_resource: event.targetResource,
        details: event.details,
        mitigated: event.mitigated,
      },
    };

    await this.writeLogs([log], AI_LOG_STREAMS.SECURITY);
  }

  /**
   * Query audit trail for a resource
   */
  async queryAuditTrail(resourceId: string, range: TimeRange): Promise<LogResult> {
    const sqlQuery = `SELECT * FROM "${AI_LOG_STREAMS.AUDIT}" WHERE resource_id = '${resourceId}' ORDER BY _timestamp DESC`;

    return this.queryLogs({
      query: sqlQuery,
      range,
      stream: AI_LOG_STREAMS.AUDIT,
    });
  }

  /**
   * Get security events by severity
   */
  async getSecurityEvents(severity: string, range: TimeRange): Promise<LogResult> {
    const sqlQuery = `SELECT * FROM "${AI_LOG_STREAMS.SECURITY}" WHERE severity = '${severity}' ORDER BY _timestamp DESC`;

    return this.queryLogs({
      query: sqlQuery,
      range,
      stream: AI_LOG_STREAMS.SECURITY,
    });
  }
}

// ============================================================================
// OpenObserve Response Types
// ============================================================================

interface OpenObserveSearchRequest {
  query: {
    sql: string;
    start_time: number;
    end_time: number;
    from: number;
    size: number;
  };
}

interface OpenObserveSearchResponse {
  hits?: OpenObserveHit[];
  total?: number;
  took?: number;
}

interface OpenObserveHit {
  _timestamp: number;
  _id?: string;
  level?: string;
  message?: string;
  trace_id?: string;
  span_id?: string;
  parent_span_id?: string;
  [key: string]: unknown;
}

interface OpenObserveStreamsResponse {
  list?: { name: string }[];
}

interface OpenObserveSchemaResponse {
  schema?: { name: string; type: string }[];
}

// ============================================================================
// AI-Specific Types
// ============================================================================

interface AuditLogEntry {
  timestamp: ISO8601;
  action: string;
  actor: {
    type: string;
    id: string;
    name: string;
  };
  resourceType: string;
  resourceId: string;
  outcome: 'success' | 'failure';
  metadata?: Record<string, unknown>;
}

interface SecurityEvent {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  sourceIp?: string;
  targetResource?: string;
  details?: Record<string, unknown>;
  mitigated: boolean;
}

// ============================================================================
// Factory function
// ============================================================================

/**
 * Create an OpenObserve connector instance
 */
export function createOpenObserveConnector(config: OpenObserveConfig): OpenObserveConnector {
  return new OpenObserveConnector(config);
}
