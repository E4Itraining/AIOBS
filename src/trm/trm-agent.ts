/**
 * TRM Agent — Tiny Recursive Model Edge Agent
 *
 * Lightweight edge agent designed for tactical networks with intermittent
 * satellite links. Runs inference locally, applies Synapsix detection without
 * cloud dependency, and resyncs when connectivity restores.
 *
 * @cybersec Air-gap capable edge AI agent for defense tactical networks
 */

import { v4 as uuidv4 } from 'uuid';
import type { TRMOfflineBuffer } from './offline-buffer';
import type { FederatedSyncManager } from './federated-sync';

// ============================================================================
// Types
// ============================================================================

export interface TRMAgentConfig {
  /** Unique agent identifier */
  agentId: string;
  /** Agent name for display */
  agentName: string;
  /** Upstream Gaskia endpoint for sync */
  upstreamUrl: string;
  /** Model to run locally */
  modelConfig: TRMModelConfig;
  /** Connectivity check interval (ms) */
  connectivityCheckIntervalMs: number;
  /** Local detection enabled (Synapsix lite) */
  localDetectionEnabled: boolean;
  /** Maximum inference batch size */
  maxBatchSize: number;
}

export interface TRMModelConfig {
  modelId: string;
  modelVersion: string;
  /** Path to local model weights/config */
  localPath: string;
  /** Maximum inference latency (ms) */
  maxLatencyMs: number;
  /** Input dimensions */
  inputDimensions: number;
  /** Output dimensions */
  outputDimensions: number;
}

export interface InferenceRequest {
  id: string;
  timestamp: string;
  input: number[];
  context: Record<string, string>;
}

export interface InferenceResult {
  id: string;
  requestId: string;
  timestamp: string;
  output: number[];
  confidence: number;
  latencyMs: number;
  modelId: string;
  modelVersion: string;
  /** Local drift detection result */
  localDriftScore: number | null;
  /** Whether this result is pending sync */
  pendingSync: boolean;
}

export interface TRMAgentStatus {
  agentId: string;
  agentName: string;
  isOnline: boolean;
  lastUpstreamContact: string | null;
  totalInferences: number;
  pendingSyncCount: number;
  localDriftAlerts: number;
  uptimeSeconds: number;
  modelStatus: 'loaded' | 'loading' | 'error' | 'not_loaded';
}

// ============================================================================
// Agent Implementation
// ============================================================================

/**
 * @cybersec Lightweight edge agent for tactical/air-gapped deployments
 */
export class TRMAgent {
  private config: TRMAgentConfig;
  private buffer: TRMOfflineBuffer | null = null;
  private syncManager: FederatedSyncManager | null = null;
  private isOnline: boolean = false;
  private lastUpstreamContact: string | null = null;
  private totalInferences: number = 0;
  private localDriftAlerts: number = 0;
  private startTime: number = Date.now();
  private connectivityTimer: ReturnType<typeof setInterval> | null = null;
  private modelStatus: 'loaded' | 'loading' | 'error' | 'not_loaded' = 'not_loaded';

  constructor(config: TRMAgentConfig) {
    this.config = config;
  }

  /**
   * Initialize the agent with offline buffer and sync manager
   * @cybersec Sets up air-gap capable operation pipeline
   */
  initialize(buffer: TRMOfflineBuffer, syncManager: FederatedSyncManager): void {
    this.buffer = buffer;
    this.syncManager = syncManager;
    this.modelStatus = 'loaded';
  }

  /**
   * Start the agent — begins connectivity monitoring
   */
  start(): void {
    this.startTime = Date.now();
    this.connectivityTimer = setInterval(() => {
      void this.checkConnectivity();
    }, this.config.connectivityCheckIntervalMs);
  }

  /**
   * Stop the agent
   */
  stop(): void {
    if (this.connectivityTimer) {
      clearInterval(this.connectivityTimer);
      this.connectivityTimer = null;
    }
  }

  /**
   * Run inference locally on the edge agent
   *
   * @cybersec Local inference with optional drift detection — no cloud needed
   */
  async infer(request: InferenceRequest): Promise<InferenceResult> {
    const start = Date.now();

    // Simulate local model inference
    const output = this.runLocalInference(request.input);
    const confidence = this.computeConfidence(output);

    // Run local drift detection if enabled
    let localDriftScore: number | null = null;
    if (this.config.localDetectionEnabled) {
      localDriftScore = this.runLocalDriftDetection(request.input, output);
      if (localDriftScore > 0.7) {
        this.localDriftAlerts++;
      }
    }

    const result: InferenceResult = {
      id: uuidv4(),
      requestId: request.id,
      timestamp: new Date().toISOString(),
      output,
      confidence,
      latencyMs: Date.now() - start,
      modelId: this.config.modelConfig.modelId,
      modelVersion: this.config.modelConfig.modelVersion,
      localDriftScore,
      pendingSync: !this.isOnline,
    };

    this.totalInferences++;

    // Store in offline buffer for later sync
    if (this.buffer) {
      await this.buffer.store({
        type: 'inference',
        data: { ...result } as unknown as Record<string, unknown>,
        timestamp: result.timestamp,
        priority: localDriftScore !== null && localDriftScore > 0.7 ? 'critical' : 'medium',
      });
    }

    return result;
  }

  /**
   * Get agent status
   */
  getStatus(): TRMAgentStatus {
    return {
      agentId: this.config.agentId,
      agentName: this.config.agentName,
      isOnline: this.isOnline,
      lastUpstreamContact: this.lastUpstreamContact,
      totalInferences: this.totalInferences,
      pendingSyncCount: this.buffer?.getPendingCount() ?? 0,
      localDriftAlerts: this.localDriftAlerts,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      modelStatus: this.modelStatus,
    };
  }

  /**
   * Check if agent is currently online (upstream reachable)
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  // ===========================================================================
  // Private
  // ===========================================================================

  private async checkConnectivity(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.config.upstreamUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const wasOffline = !this.isOnline;
        this.isOnline = true;
        this.lastUpstreamContact = new Date().toISOString();

        // Trigger sync if we just came back online
        if (wasOffline && this.syncManager) {
          await this.syncManager.sync();
        }
      } else {
        this.isOnline = false;
      }
    } catch {
      this.isOnline = false;
    }
  }

  /**
   * Simplified local inference (in production: load and run actual model)
   */
  private runLocalInference(input: number[]): number[] {
    const output: number[] = [];
    for (let i = 0; i < this.config.modelConfig.outputDimensions; i++) {
      let val = 0;
      for (let j = 0; j < input.length; j++) {
        val += (input[j] || 0) * Math.sin((i + 1) * (j + 1) * 0.1);
      }
      output.push(Math.tanh(val / Math.max(input.length, 1)));
    }
    return output;
  }

  private computeConfidence(output: number[]): number {
    if (output.length === 0) return 0;
    const maxAbs = Math.max(...output.map(Math.abs));
    return Math.min(1, maxAbs);
  }

  /**
   * Simplified local drift detection (lightweight Synapsix)
   */
  private runLocalDriftDetection(input: number[], output: number[]): number {
    // Compute simple anomaly score based on output distribution
    const mean = output.reduce((a, b) => a + b, 0) / output.length;
    const variance = output.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / output.length;

    // High variance or extreme values indicate potential drift
    const varianceScore = Math.min(1, variance * 2);
    const extremeScore = Math.min(1, Math.max(...output.map(Math.abs)));

    return (varianceScore + extremeScore) / 2;
  }
}
