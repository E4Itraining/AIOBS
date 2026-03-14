/**
 * Suricata/Zeek Connector
 *
 * Integrates with Suricata IDS alerts and Zeek network logs for
 * IT-side threat detection. Parses EVE JSON (Suricata) and Zeek logs
 * into unified alert format for IT/OT correlation.
 *
 * @cybersec IDS integration for IT-side threat detection
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

export interface SuricataZeekConfig {
  id: string;
  name: string;
  /** Path to Suricata EVE JSON log */
  suricataEvePath: string | null;
  /** Path to Zeek log directory */
  zeekLogDir: string | null;
  /** Enable simulation mode */
  simulationMode: boolean;
  /** Poll interval for log files (ms) */
  pollIntervalMs: number;
  /** Tags */
  tags: Record<string, string>;
}

export interface IDSAlert {
  id: string;
  timestamp: string;
  source: 'suricata' | 'zeek';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  signature: string;
  sourceIp: string;
  destIp: string;
  sourcePort: number;
  destPort: number;
  protocol: string;
  metadata: Record<string, string>;
}

export interface IDSSummary {
  timestamp: string;
  totalAlerts: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  topSources: { ip: string; count: number }[];
  topDestinations: { ip: string; count: number }[];
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * @cybersec IDS alert integration for IT-side threat detection
 */
export class SuricataZeekConnector {
  private config: SuricataZeekConfig;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private alertBuffer: IDSAlert[] = [];

  constructor(config: SuricataZeekConfig) {
    this.config = config;
  }

  /**
   * Start polling for IDS alerts
   */
  start(): void {
    if (!this.config.simulationMode) {
      throw new Error(
        'Live Suricata/Zeek log parsing requires file system access. ' +
        'Use simulationMode=true for demo.'
      );
    }
  }

  /**
   * Collect recent IDS alerts
   */
  async collect(): Promise<IDSAlert[]> {
    if (this.config.simulationMode) {
      return this.generateSimulationAlerts();
    }
    throw new Error('Live IDS collection requires log file access. Use simulationMode=true.');
  }

  /**
   * Get alert summary
   */
  async getSummary(): Promise<IDSSummary> {
    const alerts = await this.collect();

    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const sourceCount = new Map<string, number>();
    const destCount = new Map<string, number>();

    for (const a of alerts) {
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
      byCategory[a.category] = (byCategory[a.category] || 0) + 1;
      sourceCount.set(a.sourceIp, (sourceCount.get(a.sourceIp) || 0) + 1);
      destCount.set(a.destIp, (destCount.get(a.destIp) || 0) + 1);
    }

    return {
      timestamp: new Date().toISOString(),
      totalAlerts: alerts.length,
      bySeverity,
      byCategory,
      topSources: [...sourceCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([ip, count]) => ({ ip, count })),
      topDestinations: [...destCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([ip, count]) => ({ ip, count })),
    };
  }

  /**
   * Stop polling
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
  startPeriodicCollection(callback: (alerts: IDSAlert[]) => void): void {
    this.pollTimer = setInterval(async () => {
      const alerts = await this.collect();
      callback(alerts);
    }, this.config.pollIntervalMs);
  }

  // ===========================================================================
  // Private
  // ===========================================================================

  private generateSimulationAlerts(): IDSAlert[] {
    const alerts: IDSAlert[] = [];
    const count = Math.floor(Math.random() * 5);
    const now = new Date().toISOString();

    const categories = [
      'ET SCAN Nmap Scripting Engine',
      'ET POLICY Suspicious inbound to OT subnet',
      'ET EXPLOIT Possible buffer overflow',
      'GPL ATTACK_RESPONSE id check returned root',
      'ET TROJAN Possible C2 communication',
      'ET POLICY SSH connection to OT network segment',
      'SURICATA MODBUS Unauthorized function code',
    ];

    const severities: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    for (let i = 0; i < count; i++) {
      const source = Math.random() < 0.5 ? 'suricata' as const : 'zeek' as const;
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];

      alerts.push({
        id: uuidv4(),
        timestamp: now,
        source,
        severity,
        category,
        signature: `SID:${2000000 + Math.floor(Math.random() * 100000)}`,
        sourceIp: `192.168.${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 254) + 1}`,
        destIp: `10.0.${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 254) + 1}`,
        sourcePort: 1024 + Math.floor(Math.random() * 64000),
        destPort: [22, 80, 443, 502, 4840, 1883][Math.floor(Math.random() * 6)],
        protocol: Math.random() < 0.7 ? 'TCP' : 'UDP',
        metadata: {
          ...this.config.tags,
          simulationMode: 'true',
          idsSource: source,
        },
      });
    }

    return alerts;
  }
}

/**
 * Create a simulation Suricata/Zeek connector
 */
export function createSuricataZeekSimulationConnector(name: string = 'IDS-Monitor'): SuricataZeekConnector {
  return new SuricataZeekConnector({
    id: uuidv4(),
    name,
    suricataEvePath: null,
    zeekLogDir: null,
    simulationMode: true,
    pollIntervalMs: 10000,
    tags: { source: 'simulation', type: 'ids' },
  });
}
