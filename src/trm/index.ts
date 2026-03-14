/**
 * TRM — Tiny Recursive Models (Edge AI Agents)
 * Air-gap capable edge agents with offline buffer and federated sync
 */

export { TRMAgent } from './trm-agent';
export type {
  TRMAgentConfig,
  TRMModelConfig,
  InferenceRequest,
  InferenceResult,
  TRMAgentStatus,
} from './trm-agent';

export { TRMOfflineBuffer } from './offline-buffer';
export type {
  BufferedEntry,
  GaskiaEndpoint,
  SyncResult,
  BufferStats,
  TRMOfflineBufferConfig,
  StoreInput,
} from './offline-buffer';

export { FederatedSyncManager } from './federated-sync';
export type {
  FederatedSyncConfig,
  SyncState,
  SyncEvent,
} from './federated-sync';
