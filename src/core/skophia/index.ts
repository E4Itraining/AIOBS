/**
 * Skophia — AI Governance & Telemetry Layer
 * Sovereign OTel ingestion and storage routing
 */

export { OTelPipeline, createDefaultPipeline } from './otel-pipeline';
export type {
  OTelPipelineConfig,
  OTelMetric,
  OTelSpan,
  OTelLog,
  OTelResource,
  OTelDataPoint,
  OTelSpanEvent,
  IngestionResult,
  PipelineStats,
} from './otel-pipeline';
