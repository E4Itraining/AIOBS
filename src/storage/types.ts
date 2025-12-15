/**
 * Storage Backend Types for AIOBS
 * Supports VictoriaMetrics (metrics) and OpenObserve (logs/traces)
 */

import { ISO8601, UUID, TimeRange, PaginatedResult } from '../core/types/common';

// ============================================================================
// Metrics Types (VictoriaMetrics compatible)
// ============================================================================

/** Metric data point for time-series storage */
export interface MetricDataPoint {
  /** Metric name (e.g., 'aiobs_model_latency_ms') */
  name: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Metric value */
  value: number;
  /** Labels for filtering and grouping */
  labels: Record<string, string>;
}

/** Batch of metrics for efficient ingestion */
export interface MetricBatch {
  metrics: MetricDataPoint[];
  /** Optional: tenant ID for multi-tenancy */
  tenantId?: string;
}

/** PromQL-compatible query */
export interface MetricQuery {
  /** PromQL expression */
  query: string;
  /** Query time range */
  range?: TimeRange;
  /** Step interval for range queries (e.g., '1m', '5m') */
  step?: string;
  /** Instant query at specific time */
  time?: ISO8601;
  /** Timeout in milliseconds */
  timeout?: number;
}

/** Metric query result */
export interface MetricResult {
  /** Result type: vector, matrix, scalar */
  resultType: 'vector' | 'matrix' | 'scalar' | 'string';
  /** Result data */
  data: MetricResultData[];
  /** Query statistics */
  stats?: QueryStats;
}

export interface MetricResultData {
  metric: Record<string, string>;
  values?: [number, string][]; // [timestamp, value] for matrix
  value?: [number, string]; // [timestamp, value] for vector
}

export interface QueryStats {
  seriesFetched: number;
  executionTimeMs: number;
}

// ============================================================================
// Log Types (OpenObserve compatible)
// ============================================================================

/** Log entry for ingestion */
export interface LogEntry {
  /** Log timestamp */
  timestamp: ISO8601;
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Structured fields */
  fields: Record<string, unknown>;
  /** Resource attributes (service, host, etc.) */
  resource?: ResourceAttributes;
  /** Trace context for correlation */
  traceContext?: TraceContext;
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface ResourceAttributes {
  serviceName: string;
  serviceVersion?: string;
  hostName?: string;
  environment?: string;
  [key: string]: string | undefined;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

/** Log query (SQL-compatible for OpenObserve) */
export interface LogQuery {
  /** SQL query or search string */
  query: string;
  /** Time range */
  range: TimeRange;
  /** Stream/index name */
  stream?: string;
  /** Pagination */
  limit?: number;
  offset?: number;
  /** Sort order */
  sortBy?: 'timestamp' | string;
  sortOrder?: 'asc' | 'desc';
}

/** Log query result */
export interface LogResult {
  logs: LogEntry[];
  total: number;
  hasMore: boolean;
  took: number; // execution time in ms
}

// ============================================================================
// Trace Types (OpenTelemetry compatible for OpenObserve)
// ============================================================================

/** Span for distributed tracing */
export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: ISO8601;
  endTime: ISO8601;
  durationMs: number;
  status: SpanStatus;
  kind: SpanKind;
  attributes: Record<string, unknown>;
  events: SpanEvent[];
  links: SpanLink[];
}

export type SpanStatus = 'unset' | 'ok' | 'error';
export type SpanKind = 'internal' | 'server' | 'client' | 'producer' | 'consumer';

export interface SpanEvent {
  name: string;
  timestamp: ISO8601;
  attributes: Record<string, unknown>;
}

export interface SpanLink {
  traceId: string;
  spanId: string;
  attributes: Record<string, unknown>;
}

/** Trace (collection of spans) */
export interface Trace {
  traceId: string;
  spans: Span[];
  rootSpan: Span;
  services: string[];
  durationMs: number;
  startTime: ISO8601;
  endTime: ISO8601;
  errorCount: number;
}

/** Trace query */
export interface TraceQuery {
  /** Specific trace ID */
  traceId?: string;
  /** Service name filter */
  serviceName?: string;
  /** Operation name filter */
  operationName?: string;
  /** Time range */
  range?: TimeRange;
  /** Minimum duration in ms */
  minDuration?: number;
  /** Maximum duration in ms */
  maxDuration?: number;
  /** Only traces with errors */
  hasError?: boolean;
  /** Tag/attribute filters */
  tags?: Record<string, string>;
  /** Pagination */
  limit?: number;
  offset?: number;
}

/** Trace query result */
export interface TraceResult {
  traces: TraceSummary[];
  total: number;
  hasMore: boolean;
}

export interface TraceSummary {
  traceId: string;
  rootService: string;
  rootOperation: string;
  startTime: ISO8601;
  durationMs: number;
  spanCount: number;
  errorCount: number;
  services: string[];
}

// ============================================================================
// Storage Backend Configuration
// ============================================================================

/** VictoriaMetrics configuration */
export interface VictoriaMetricsConfig {
  /** Base URL (e.g., 'http://localhost:8428') */
  baseUrl: string;
  /** Optional: Username for basic auth */
  username?: string;
  /** Optional: Password for basic auth */
  password?: string;
  /** Optional: Bearer token for auth */
  token?: string;
  /** Tenant ID for cluster mode (accountID:projectID) */
  tenantId?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Retry configuration */
  retry?: RetryConfig;
  /** Enable TLS */
  tls?: TLSConfig;
}

/** OpenObserve configuration */
export interface OpenObserveConfig {
  /** Base URL (e.g., 'http://localhost:5080') */
  baseUrl: string;
  /** Organization name */
  organization: string;
  /** Username */
  username: string;
  /** Password or API key */
  password: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Retry configuration */
  retry?: RetryConfig;
  /** Enable TLS */
  tls?: TLSConfig;
  /** Default stream names */
  streams?: {
    logs?: string;
    traces?: string;
  };
}

export interface RetryConfig {
  /** Maximum number of retries */
  maxRetries: number;
  /** Initial delay in ms */
  initialDelayMs: number;
  /** Maximum delay in ms */
  maxDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
}

export interface TLSConfig {
  /** Enable TLS verification */
  verify: boolean;
  /** CA certificate path */
  caCert?: string;
  /** Client certificate path */
  clientCert?: string;
  /** Client key path */
  clientKey?: string;
}

// ============================================================================
// Storage Backend Interfaces
// ============================================================================

/** Metrics storage backend interface */
export interface MetricsBackend {
  /** Write metrics batch */
  writeMetrics(batch: MetricBatch): Promise<void>;

  /** Query metrics using PromQL */
  queryMetrics(query: MetricQuery): Promise<MetricResult>;

  /** Query instant metrics */
  queryInstant(query: string, time?: ISO8601): Promise<MetricResult>;

  /** Query range metrics */
  queryRange(query: string, range: TimeRange, step: string): Promise<MetricResult>;

  /** Get label values */
  getLabelValues(labelName: string, match?: string[]): Promise<string[]>;

  /** Get series matching selectors */
  getSeries(match: string[], range?: TimeRange): Promise<Record<string, string>[]>;

  /** Delete series (admin) */
  deleteSeries?(match: string[], range?: TimeRange): Promise<void>;

  /** Health check */
  healthCheck(): Promise<boolean>;
}

/** Logs storage backend interface */
export interface LogsBackend {
  /** Write logs batch */
  writeLogs(logs: LogEntry[], stream?: string): Promise<void>;

  /** Query logs */
  queryLogs(query: LogQuery): Promise<LogResult>;

  /** Search logs with full-text search */
  searchLogs(searchText: string, range: TimeRange, stream?: string): Promise<LogResult>;

  /** Get available streams */
  getStreams(): Promise<string[]>;

  /** Get field names in a stream */
  getFields(stream: string): Promise<string[]>;

  /** Health check */
  healthCheck(): Promise<boolean>;
}

/** Traces storage backend interface */
export interface TracesBackend {
  /** Write traces/spans */
  writeTraces(spans: Span[]): Promise<void>;

  /** Query traces */
  queryTraces(query: TraceQuery): Promise<TraceResult>;

  /** Get full trace by ID */
  getTrace(traceId: string): Promise<Trace | null>;

  /** Get services */
  getServices(): Promise<string[]>;

  /** Get operations for a service */
  getOperations(serviceName: string): Promise<string[]>;

  /** Health check */
  healthCheck(): Promise<boolean>;
}

/** Combined storage backend */
export interface StorageBackend extends MetricsBackend, LogsBackend, TracesBackend {
  /** Get backend type */
  getType(): StorageBackendType;

  /** Initialize backend connection */
  initialize(): Promise<void>;

  /** Close backend connection */
  close(): Promise<void>;
}

export type StorageBackendType = 'victoriametrics' | 'openobserve' | 'memory' | 'hybrid';

// ============================================================================
// AI-Specific Metric Types
// ============================================================================

/** AI model metric labels */
export interface AIModelMetricLabels {
  model_id: string;
  model_version: string;
  model_type: string;
  endpoint?: string;
  environment: string;
  tenant_id?: string;
}

/** Predefined AI metrics */
export const AI_METRICS = {
  // Inference metrics
  INFERENCE_LATENCY: 'aiobs_inference_latency_ms',
  INFERENCE_THROUGHPUT: 'aiobs_inference_throughput_rps',
  INFERENCE_ERRORS: 'aiobs_inference_errors_total',
  INFERENCE_TOKENS_INPUT: 'aiobs_inference_tokens_input_total',
  INFERENCE_TOKENS_OUTPUT: 'aiobs_inference_tokens_output_total',

  // Performance metrics
  MODEL_ACCURACY: 'aiobs_model_accuracy',
  MODEL_PRECISION: 'aiobs_model_precision',
  MODEL_RECALL: 'aiobs_model_recall',
  MODEL_F1: 'aiobs_model_f1_score',

  // Drift metrics
  DRIFT_SCORE: 'aiobs_drift_score',
  DRIFT_DATA: 'aiobs_drift_data_score',
  DRIFT_CONCEPT: 'aiobs_drift_concept_score',
  DRIFT_PREDICTION: 'aiobs_drift_prediction_score',

  // Reliability metrics
  CONFIDENCE_CALIBRATION: 'aiobs_confidence_calibration_ece',
  HALLUCINATION_RATE: 'aiobs_hallucination_rate',
  TRUST_SCORE: 'aiobs_trust_score',

  // Cost metrics
  COST_INFERENCE: 'aiobs_cost_inference_dollars',
  COST_TOKENS: 'aiobs_cost_per_token_dollars',
  COST_TOTAL: 'aiobs_cost_total_dollars',

  // Energy metrics
  ENERGY_CONSUMPTION: 'aiobs_energy_consumption_kwh',
  CARBON_EMISSIONS: 'aiobs_carbon_emissions_kg',

  // SLO metrics
  SLI_VALUE: 'aiobs_sli_value',
  ERROR_BUDGET_REMAINING: 'aiobs_error_budget_remaining',
  SLO_COMPLIANCE: 'aiobs_slo_compliance',
} as const;

/** AI log streams */
export const AI_LOG_STREAMS = {
  AUDIT: 'aiobs_audit',
  INFERENCE: 'aiobs_inference',
  DRIFT: 'aiobs_drift_events',
  SECURITY: 'aiobs_security',
  COMPLIANCE: 'aiobs_compliance',
  INCIDENTS: 'aiobs_incidents',
} as const;
