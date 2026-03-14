/**
 * OT Base Connector
 *
 * Abstract base class providing common interface for all OT protocol connectors.
 * Each connector must implement connect, collect, disconnect, and healthCheck.
 * All connectors support a simulation mode for demo/testing without real equipment.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  OTBaseConfig,
  OTProtocol,
  OTDataPoint,
  OTDataQuality,
  OTHealthCheck,
  OTCollectionResult,
  OTCollectionError,
  OTConnectionStatus,
} from '../../core/types/ot-connector';
import { HealthStatus } from '../../core/types/common';

export abstract class OTBaseConnector {
  protected config: OTBaseConfig;
  protected connectionStatus: OTConnectionStatus = 'disconnected';
  protected lastCollection: string | null = null;
  protected errorCount: number = 0;
  protected collectTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: OTBaseConfig) {
    this.config = config;
    if (config.simulationMode) {
      this.connectionStatus = 'simulation';
    }
  }

  /** Get connector ID */
  getId(): string { return this.config.id; }

  /** Get connector name */
  getName(): string { return this.config.name; }

  /** Get protocol type */
  getProtocol(): OTProtocol { return this.config.protocol; }

  /** Check if in simulation mode */
  isSimulation(): boolean { return this.config.simulationMode; }

  /** Get current connection status */
  getConnectionStatus(): OTConnectionStatus { return this.connectionStatus; }

  /**
   * Connect to the OT device/service.
   * In simulation mode, immediately sets status to 'simulation'.
   */
  async connect(): Promise<void> {
    if (this.config.simulationMode) {
      this.connectionStatus = 'simulation';
      return;
    }

    this.connectionStatus = 'connecting';
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retry.maxRetries; attempt++) {
      try {
        await this.doConnect();
        this.connectionStatus = 'connected';
        this.errorCount = 0;
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.config.retry.maxRetries) {
          const backoff = Math.min(
            this.config.retry.backoffMs * Math.pow(2, attempt),
            this.config.retry.maxBackoffMs
          );
          await this.sleep(backoff);
        }
      }
    }

    this.connectionStatus = 'error';
    this.errorCount++;
    throw lastError || new Error('Connection failed');
  }

  /**
   * Collect data points from the OT device/service.
   */
  async collect(): Promise<OTCollectionResult> {
    const startTime = Date.now();
    const errors: OTCollectionError[] = [];

    try {
      let dataPoints: OTDataPoint[];

      if (this.config.simulationMode) {
        dataPoints = this.generateSimulationData();
      } else {
        if (this.connectionStatus !== 'connected') {
          throw new Error(`Cannot collect: status is ${this.connectionStatus}`);
        }
        dataPoints = await this.doCollect();
      }

      this.lastCollection = new Date().toISOString();

      return {
        connectorId: this.config.id,
        protocol: this.config.protocol,
        timestamp: this.lastCollection,
        dataPoints,
        durationMs: Date.now() - startTime,
        errors,
      };
    } catch (error) {
      this.errorCount++;
      const errMsg = error instanceof Error ? error.message : String(error);
      errors.push({
        timestamp: new Date().toISOString(),
        source: this.config.name,
        message: errMsg,
        recoverable: true,
      });

      return {
        connectorId: this.config.id,
        protocol: this.config.protocol,
        timestamp: new Date().toISOString(),
        dataPoints: [],
        durationMs: Date.now() - startTime,
        errors,
      };
    }
  }

  /**
   * Disconnect from the OT device/service.
   */
  async disconnect(): Promise<void> {
    if (this.collectTimer) {
      clearInterval(this.collectTimer);
      this.collectTimer = null;
    }

    if (this.connectionStatus === 'simulation') {
      this.connectionStatus = 'disconnected';
      return;
    }

    try {
      await this.doDisconnect();
    } finally {
      this.connectionStatus = 'disconnected';
    }
  }

  /**
   * Health check for this connector.
   */
  async healthCheck(): Promise<OTHealthCheck> {
    let status: HealthStatus;
    if (this.connectionStatus === 'connected' || this.connectionStatus === 'simulation') {
      status = this.errorCount > 5 ? 'degraded' : 'healthy';
    } else if (this.connectionStatus === 'connecting') {
      status = 'degraded';
    } else {
      status = this.connectionStatus === 'error' ? 'critical' : 'unknown';
    }

    return {
      connectorId: this.config.id,
      protocol: this.config.protocol,
      status,
      connectionStatus: this.connectionStatus,
      lastCollection: this.lastCollection,
      latencyMs: 0,
      errorCount: this.errorCount,
      simulationMode: this.config.simulationMode,
      details: this.getHealthDetails(),
    };
  }

  /**
   * Start periodic collection.
   */
  startPeriodicCollection(callback: (result: OTCollectionResult) => void): void {
    if (this.collectTimer) {
      clearInterval(this.collectTimer);
    }

    this.collectTimer = setInterval(async () => {
      const result = await this.collect();
      callback(result);
    }, this.config.collectIntervalMs);
  }

  // ===========================================================================
  // Abstract methods to implement in subclasses
  // ===========================================================================

  /** Protocol-specific connection logic */
  protected abstract doConnect(): Promise<void>;

  /** Protocol-specific data collection */
  protected abstract doCollect(): Promise<OTDataPoint[]>;

  /** Protocol-specific disconnection */
  protected abstract doDisconnect(): Promise<void>;

  /** Generate simulation data (synthetic without real equipment) */
  protected abstract generateSimulationData(): OTDataPoint[];

  /** Get protocol-specific health details */
  protected abstract getHealthDetails(): Record<string, string>;

  // ===========================================================================
  // Helper methods available to subclasses
  // ===========================================================================

  protected createDataPoint(
    metricName: string,
    value: number | string | boolean,
    quality: OTDataQuality,
    metadata: Record<string, string>
  ): OTDataPoint {
    return {
      connectorId: this.config.id,
      protocol: this.config.protocol,
      timestamp: new Date().toISOString(),
      metricName,
      value,
      quality: this.config.simulationMode ? 'simulated' : quality,
      metadata: {
        ...metadata,
        ...this.config.tags,
      },
    };
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Generate a simulated numeric value with random walk */
  protected simulateValue(
    base: number,
    range: number,
    noise: number = 0.1
  ): number {
    return base + (Math.random() - 0.5) * 2 * range + (Math.random() - 0.5) * noise;
  }
}
