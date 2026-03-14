/**
 * SNMP Connector
 *
 * Polls SNMP v2c/v3 agents for network equipment monitoring.
 * Supports simulation mode for demo without real network devices.
 */

import {
  SNMPConfig,
  SNMPDataPoint,
  OTDataPoint,
} from '../../core/types/ot-connector';
import { OTBaseConnector } from './ot-base-connector';

export class SNMPConnector extends OTBaseConnector {
  private snmpConfig: SNMPConfig;
  private simulationCounters: Map<string, number> = new Map();
  private startTime: number = Date.now();

  constructor(config: SNMPConfig) {
    super(config);
    this.snmpConfig = config;
    this.initSimulationCounters();
  }

  protected async doConnect(): Promise<void> {
    throw new Error(
      `SNMP connection to ${this.snmpConfig.host}:${this.snmpConfig.port} ` +
      `requires net-snmp. Use simulationMode=true for demo.`
    );
  }

  protected async doCollect(): Promise<OTDataPoint[]> {
    throw new Error('SNMP polling requires active session. Use simulationMode=true.');
  }

  protected async doDisconnect(): Promise<void> {}

  protected generateSimulationData(): OTDataPoint[] {
    const dataPoints: SNMPDataPoint[] = [];
    const now = new Date().toISOString();

    for (const oid of this.snmpConfig.oids) {
      let value: number | string;

      switch (oid.type) {
        case 'counter':
          value = this.simulateCounter(oid.oid);
          break;
        case 'gauge':
          value = this.simulateGauge(oid.name);
          break;
        case 'timeticks':
          value = Math.floor((Date.now() - this.startTime) / 10); // centiseconds
          break;
        case 'string':
          value = this.simulateString(oid.name);
          break;
        case 'integer':
        default:
          value = this.simulateInteger(oid.name);
      }

      const scaledValue = oid.scaleFactor && typeof value === 'number'
        ? value * oid.scaleFactor
        : value;

      dataPoints.push({
        connectorId: this.config.id,
        protocol: 'snmp',
        timestamp: now,
        metricName: oid.name,
        value: scaledValue,
        quality: 'simulated',
        metadata: {
          oid: oid.oid,
          snmpType: oid.type,
          ...(this.snmpConfig.community ? { community: this.snmpConfig.community } : {}),
          ...this.config.tags,
        },
      });
    }

    return dataPoints;
  }

  protected getHealthDetails(): Record<string, string> {
    return {
      host: this.snmpConfig.host,
      port: String(this.snmpConfig.port),
      version: this.snmpConfig.version,
      oids: String(this.snmpConfig.oids.length),
    };
  }

  private initSimulationCounters(): void {
    for (const oid of this.snmpConfig.oids) {
      if (oid.type === 'counter') {
        this.simulationCounters.set(oid.oid, Math.floor(Math.random() * 1000000));
      }
    }
  }

  private simulateCounter(oid: string): number {
    const prev = this.simulationCounters.get(oid) || 0;
    const increment = Math.floor(Math.random() * 1000) + 100;
    const newVal = prev + increment;
    this.simulationCounters.set(oid, newVal);
    return newVal;
  }

  private simulateGauge(name: string): number {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('cpu')) return Math.floor(Math.random() * 40) + 10;
    if (lowerName.includes('memory')) return Math.floor(Math.random() * 30) + 40;
    if (lowerName.includes('bandwidth')) return Math.floor(Math.random() * 800) + 100;
    if (lowerName.includes('temp')) return Math.floor(Math.random() * 15) + 35;
    return Math.floor(Math.random() * 100);
  }

  private simulateString(name: string): string {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('descr') || lowerName.includes('name')) return 'AIOBS-SimDevice-v1';
    if (lowerName.includes('contact')) return 'admin@aiobs.local';
    if (lowerName.includes('location')) return 'Rack-01/DC-Cesson';
    return 'simulated-value';
  }

  private simulateInteger(name: string): number {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('status')) return 1; // up
    if (lowerName.includes('interface')) return Math.floor(Math.random() * 48) + 1;
    return Math.floor(Math.random() * 1000);
  }
}

export function createSNMPSimulationConnector(name: string = 'Switch-SNMP'): SNMPConnector {
  const { v4: uuid } = require('uuid');
  return new SNMPConnector({
    id: uuid(),
    name,
    protocol: 'snmp',
    simulationMode: true,
    collectIntervalMs: 10000,
    connectionTimeoutMs: 5000,
    retry: { maxRetries: 3, backoffMs: 1000, maxBackoffMs: 10000 },
    tags: { source: 'simulation', type: 'network' },
    host: 'localhost',
    port: 161,
    version: 'v2c',
    community: 'public',
    oids: [
      { oid: '1.3.6.1.2.1.1.1.0', name: 'sysDescr', type: 'string' },
      { oid: '1.3.6.1.2.1.1.3.0', name: 'sysUpTime', type: 'timeticks' },
      { oid: '1.3.6.1.2.1.2.2.1.10.1', name: 'ifInOctets_1', type: 'counter' },
      { oid: '1.3.6.1.2.1.2.2.1.16.1', name: 'ifOutOctets_1', type: 'counter' },
      { oid: '1.3.6.1.4.1.9.9.109.1.1.1.1.3.1', name: 'cpuUsage', type: 'gauge' },
      { oid: '1.3.6.1.4.1.9.9.48.1.1.1.5.1', name: 'memoryUsed', type: 'gauge' },
    ],
  });
}
