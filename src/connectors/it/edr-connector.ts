/**
 * EDR Connector
 *
 * Integrates with Endpoint Detection and Response telemetry feeds.
 * Provides endpoint-level visibility (process execution, file changes,
 * network connections) for correlation with OT/semantic signals.
 *
 * @cybersec Endpoint telemetry for IT/OT convergence monitoring
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

export interface EDRConfig {
  id: string;
  name: string;
  /** EDR platform type */
  platform: 'generic' | 'wazuh' | 'osquery';
  /** API endpoint for EDR platform */
  apiEndpoint: string | null;
  /** Enable simulation mode */
  simulationMode: boolean;
  /** Poll interval (ms) */
  pollIntervalMs: number;
  /** Tags */
  tags: Record<string, string>;
}

export interface EDREvent {
  id: string;
  timestamp: string;
  hostname: string;
  eventType: 'process_creation' | 'file_modification' | 'network_connection' | 'registry_change' | 'service_change';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: ProcessEvent | FileEvent | NetworkEvent | RegistryEvent | ServiceEvent;
  metadata: Record<string, string>;
}

export interface ProcessEvent {
  type: 'process_creation';
  processName: string;
  processId: number;
  parentProcessName: string;
  parentProcessId: number;
  commandLine: string;
  user: string;
  hash: string;
}

export interface FileEvent {
  type: 'file_modification';
  filePath: string;
  action: 'created' | 'modified' | 'deleted' | 'renamed';
  hash: string;
  size: number;
  user: string;
}

export interface NetworkEvent {
  type: 'network_connection';
  localIp: string;
  localPort: number;
  remoteIp: string;
  remotePort: number;
  protocol: string;
  direction: 'inbound' | 'outbound';
  processName: string;
}

export interface RegistryEvent {
  type: 'registry_change';
  keyPath: string;
  valueName: string;
  action: 'created' | 'modified' | 'deleted';
  newValue: string;
}

export interface ServiceEvent {
  type: 'service_change';
  serviceName: string;
  action: 'started' | 'stopped' | 'installed' | 'removed' | 'modified';
  startType: string;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * @cybersec Endpoint telemetry integration for threat correlation
 */
export class EDRConnector {
  private config: EDRConfig;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: EDRConfig) {
    this.config = config;
  }

  /**
   * Start collecting EDR events
   */
  start(): void {
    if (!this.config.simulationMode) {
      throw new Error(
        `EDR connection to ${this.config.apiEndpoint} requires platform-specific client. ` +
        'Use simulationMode=true for demo.'
      );
    }
  }

  /**
   * Collect recent EDR events
   */
  async collect(): Promise<EDREvent[]> {
    if (this.config.simulationMode) {
      return this.generateSimulationEvents();
    }
    throw new Error('Live EDR collection requires platform client. Use simulationMode=true.');
  }

  /**
   * Stop collection
   */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Start periodic collection
   */
  startPeriodicCollection(callback: (events: EDREvent[]) => void): void {
    this.pollTimer = setInterval(async () => {
      const events = await this.collect();
      callback(events);
    }, this.config.pollIntervalMs);
  }

  // ===========================================================================
  // Private
  // ===========================================================================

  private generateSimulationEvents(): EDREvent[] {
    const events: EDREvent[] = [];
    const count = Math.floor(Math.random() * 4);
    const now = new Date().toISOString();

    const hostnames = ['ws-eng-01', 'ws-ops-02', 'srv-scada-01', 'srv-historian-01', 'ws-soc-01'];

    for (let i = 0; i < count; i++) {
      const hostname = hostnames[Math.floor(Math.random() * hostnames.length)];
      const eventType = this.randomEventType();

      events.push({
        id: uuidv4(),
        timestamp: now,
        hostname,
        eventType,
        severity: this.severityForEventType(eventType, hostname),
        details: this.generateEventDetails(eventType),
        metadata: {
          ...this.config.tags,
          simulationMode: 'true',
          platform: this.config.platform,
        },
      });
    }

    return events;
  }

  private randomEventType(): EDREvent['eventType'] {
    const types: EDREvent['eventType'][] = [
      'process_creation', 'file_modification', 'network_connection',
      'registry_change', 'service_change',
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  private severityForEventType(eventType: string, hostname: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // Events on SCADA/historian hosts are higher severity
    const isOTHost = hostname.includes('scada') || hostname.includes('historian');

    if (isOTHost && (eventType === 'process_creation' || eventType === 'service_change')) {
      return 'HIGH';
    }
    if (isOTHost && eventType === 'network_connection') {
      return 'MEDIUM';
    }

    switch (eventType) {
      case 'process_creation': return 'LOW';
      case 'file_modification': return 'LOW';
      case 'network_connection': return 'LOW';
      case 'registry_change': return 'MEDIUM';
      case 'service_change': return 'MEDIUM';
      default: return 'LOW';
    }
  }

  private generateEventDetails(eventType: string): ProcessEvent | FileEvent | NetworkEvent | RegistryEvent | ServiceEvent {
    switch (eventType) {
      case 'process_creation':
        return {
          type: 'process_creation',
          processName: ['cmd.exe', 'powershell.exe', 'python.exe', 'svchost.exe'][Math.floor(Math.random() * 4)],
          processId: 1000 + Math.floor(Math.random() * 60000),
          parentProcessName: 'explorer.exe',
          parentProcessId: 1000 + Math.floor(Math.random() * 10000),
          commandLine: 'cmd.exe /c whoami',
          user: ['SYSTEM', 'admin', 'operator'][Math.floor(Math.random() * 3)],
          hash: uuidv4().replace(/-/g, ''),
        };
      case 'file_modification':
        return {
          type: 'file_modification',
          filePath: 'C:\\ProgramData\\SCADA\\config.xml',
          action: ['created', 'modified', 'deleted'][Math.floor(Math.random() * 3)] as FileEvent['action'],
          hash: uuidv4().replace(/-/g, ''),
          size: Math.floor(Math.random() * 100000),
          user: 'admin',
        };
      case 'network_connection':
        return {
          type: 'network_connection',
          localIp: '192.168.1.50',
          localPort: 1024 + Math.floor(Math.random() * 64000),
          remoteIp: `10.0.2.${Math.floor(Math.random() * 254) + 1}`,
          remotePort: [22, 80, 443, 502, 4840][Math.floor(Math.random() * 5)],
          protocol: 'TCP',
          direction: Math.random() < 0.5 ? 'outbound' : 'inbound',
          processName: 'svchost.exe',
        };
      case 'registry_change':
        return {
          type: 'registry_change',
          keyPath: 'HKLM\\SYSTEM\\CurrentControlSet\\Services',
          valueName: 'Start',
          action: 'modified',
          newValue: '2',
        };
      case 'service_change':
        return {
          type: 'service_change',
          serviceName: 'OPCUAServer',
          action: ['started', 'stopped', 'modified'][Math.floor(Math.random() * 3)] as ServiceEvent['action'],
          startType: 'automatic',
        };
      default:
        return {
          type: 'process_creation',
          processName: 'unknown.exe',
          processId: 0,
          parentProcessName: 'unknown',
          parentProcessId: 0,
          commandLine: '',
          user: 'SYSTEM',
          hash: '',
        };
    }
  }
}

/**
 * Create a simulation EDR connector
 */
export function createEDRSimulationConnector(name: string = 'EDR-Monitor'): EDRConnector {
  return new EDRConnector({
    id: uuidv4(),
    name,
    platform: 'generic',
    apiEndpoint: null,
    simulationMode: true,
    pollIntervalMs: 15000,
    tags: { source: 'simulation', type: 'edr' },
  });
}
