/**
 * Storage Backend Module for AIOBS
 *
 * Provides pluggable storage backends for metrics, logs, and traces:
 * - VictoriaMetrics: High-performance time-series metrics
 * - OpenObserve: Cost-effective logs and traces with SQL queries
 * - Hybrid: Combined backend with intelligent routing
 *
 * @example
 * ```typescript
 * import {
 *   createHybridBackend,
 *   createVictoriaMetricsConnector,
 *   createOpenObserveConnector,
 * } from '@aiobs/platform/storage';
 *
 * // Create hybrid backend
 * const storage = createHybridBackend({
 *   victoriametrics: { baseUrl: 'http://vm:8428' },
 *   openobserve: {
 *     baseUrl: 'http://oo:5080',
 *     organization: 'default',
 *     username: 'admin',
 *     password: 'secret',
 *   },
 * });
 *
 * await storage.initialize();
 *
 * // Write metrics
 * await storage.writeMetrics({
 *   metrics: [
 *     { name: 'aiobs_inference_latency_ms', value: 150, timestamp: Date.now(), labels: { model_id: 'gpt-4' } },
 *   ],
 * });
 *
 * // Query metrics with PromQL
 * const result = await storage.queryInstant('aiobs_inference_latency_ms{model_id="gpt-4"}');
 *
 * // Write logs
 * await storage.writeLogs([
 *   { timestamp: new Date().toISOString(), level: 'info', message: 'Model deployed', fields: { model_id: 'gpt-4' } },
 * ]);
 *
 * // Query logs with SQL
 * const logs = await storage.queryLogs({
 *   query: 'SELECT * FROM aiobs_logs WHERE model_id = "gpt-4"',
 *   range: { start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z' },
 * });
 * ```
 */

// Types
export * from './types';

// Connectors
export { VictoriaMetricsConnector, createVictoriaMetricsConnector } from './victoriametrics-connector';
export { OpenObserveConnector, createOpenObserveConnector } from './openobserve-connector';

// Hybrid Backend
export {
  HybridStorageBackend,
  HybridBackendConfig,
  createHybridBackend,
  createAIOBSStorageBackend,
} from './hybrid-backend';
