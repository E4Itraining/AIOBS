/**
 * PCAP Connector
 *
 * Network packet capture connector for IT network monitoring.
 * Processes PCAP files or live captures and extracts security-relevant
 * network metadata in OTel format. Supports air-gap mode.
 *
 * @cybersec Network packet analysis for IT/OT convergence monitoring
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

export interface PCAPConfig {
  /** Connector identifier */
  id: string;
  name: string;
  /** Interface to capture on (null = offline file mode) */
  networkInterface: string | null;
  /** PCAP file path for offline analysis */
  pcapFilePath: string | null;
  /** BPF filter expression */
  bpfFilter: string;
  /** Capture snapshot length */
  snaplen: number;
  /** Enable simulation mode */
  simulationMode: boolean;
  /** Collection interval in ms */
  collectIntervalMs: number;
  /** Tags for identification */
  tags: Record<string, string>;
}

export interface PCAPDataPoint {
  connectorId: string;
  timestamp: string;
  sourceIp: string;
  destIp: string;
  sourcePort: number;
  destPort: number;
  protocol: string;
  packetSize: number;
  flags: string[];
  metadata: Record<string, string>;
}

export interface PCAPFlowSummary {
  timestamp: string;
  totalPackets: number;
  totalBytes: number;
  uniqueSources: number;
  uniqueDestinations: number;
  protocolBreakdown: Record<string, number>;
  suspiciousFlows: SuspiciousFlow[];
}

export interface SuspiciousFlow {
  sourceIp: string;
  destIp: string;
  protocol: string;
  reason: string;
  packetCount: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * @cybersec Network packet capture for IT-side threat detection
 */
export class PCAPConnector {
  private config: PCAPConfig;
  private collectTimer: ReturnType<typeof setInterval> | null = null;
  private totalPackets: number = 0;
  private simulationState: { packetCount: number; flowCount: number } = { packetCount: 0, flowCount: 0 };

  constructor(config: PCAPConfig) {
    this.config = config;
  }

  /**
   * Start packet capture (or simulation)
   */
  async start(): Promise<void> {
    if (!this.config.simulationMode) {
      throw new Error(
        `Live PCAP capture on ${this.config.networkInterface} requires libpcap bindings. ` +
        `Use simulationMode=true for demo.`
      );
    }
  }

  /**
   * Collect captured packets as data points
   */
  async collect(): Promise<PCAPDataPoint[]> {
    if (this.config.simulationMode) {
      return this.generateSimulationData();
    }
    throw new Error('Live PCAP collection requires libpcap. Use simulationMode=true.');
  }

  /**
   * Get flow summary from recent captures
   */
  async getFlowSummary(): Promise<PCAPFlowSummary> {
    const packets = await this.collect();

    const protocolBreakdown: Record<string, number> = {};
    const sources = new Set<string>();
    const destinations = new Set<string>();

    for (const p of packets) {
      sources.add(p.sourceIp);
      destinations.add(p.destIp);
      protocolBreakdown[p.protocol] = (protocolBreakdown[p.protocol] || 0) + 1;
    }

    const suspiciousFlows = this.detectSuspiciousFlows(packets);

    return {
      timestamp: new Date().toISOString(),
      totalPackets: packets.length,
      totalBytes: packets.reduce((s, p) => s + p.packetSize, 0),
      uniqueSources: sources.size,
      uniqueDestinations: destinations.size,
      protocolBreakdown,
      suspiciousFlows,
    };
  }

  /**
   * Stop capture
   */
  async stop(): Promise<void> {
    if (this.collectTimer) {
      clearInterval(this.collectTimer);
      this.collectTimer = null;
    }
  }

  /**
   * Start periodic collection
   */
  startPeriodicCollection(callback: (data: PCAPDataPoint[]) => void): void {
    this.collectTimer = setInterval(async () => {
      const data = await this.collect();
      callback(data);
    }, this.config.collectIntervalMs);
  }

  // ===========================================================================
  // Private
  // ===========================================================================

  private generateSimulationData(): PCAPDataPoint[] {
    const packets: PCAPDataPoint[] = [];
    const now = new Date().toISOString();
    const count = 5 + Math.floor(Math.random() * 15);

    const protocols = ['TCP', 'UDP', 'ICMP', 'DNS', 'HTTP', 'MODBUS_TCP', 'OPC_UA'];
    const subnets = ['192.168.1', '192.168.2', '10.0.1', '10.0.2'];

    for (let i = 0; i < count; i++) {
      const srcSubnet = subnets[Math.floor(Math.random() * subnets.length)];
      const dstSubnet = subnets[Math.floor(Math.random() * subnets.length)];
      const protocol = protocols[Math.floor(Math.random() * protocols.length)];

      packets.push({
        connectorId: this.config.id,
        timestamp: now,
        sourceIp: `${srcSubnet}.${Math.floor(Math.random() * 254) + 1}`,
        destIp: `${dstSubnet}.${Math.floor(Math.random() * 254) + 1}`,
        sourcePort: 1024 + Math.floor(Math.random() * 64000),
        destPort: this.getDefaultPort(protocol),
        protocol,
        packetSize: 64 + Math.floor(Math.random() * 1400),
        flags: protocol === 'TCP' ? this.randomTCPFlags() : [],
        metadata: {
          ...this.config.tags,
          simulationMode: 'true',
        },
      });

      this.totalPackets++;
    }

    return packets;
  }

  private detectSuspiciousFlows(packets: PCAPDataPoint[]): SuspiciousFlow[] {
    const flows: SuspiciousFlow[] = [];

    // Detect port scans (many dest ports from same source)
    const sourcePortMap = new Map<string, Set<number>>();
    for (const p of packets) {
      if (!sourcePortMap.has(p.sourceIp)) {
        sourcePortMap.set(p.sourceIp, new Set());
      }
      sourcePortMap.get(p.sourceIp)!.add(p.destPort);
    }

    for (const [ip, ports] of sourcePortMap) {
      if (ports.size > 10) {
        flows.push({
          sourceIp: ip,
          destIp: '*',
          protocol: 'TCP',
          reason: `Possible port scan: ${ports.size} unique destination ports`,
          packetCount: packets.filter(p => p.sourceIp === ip).length,
          severity: 'HIGH',
        });
      }
    }

    // Detect unusual OT protocol traffic from IT subnet
    const otProtocols = ['MODBUS_TCP', 'OPC_UA'];
    for (const p of packets) {
      if (otProtocols.includes(p.protocol) && p.sourceIp.startsWith('192.168.1')) {
        flows.push({
          sourceIp: p.sourceIp,
          destIp: p.destIp,
          protocol: p.protocol,
          reason: 'OT protocol traffic from IT subnet — possible IT→OT lateral movement',
          packetCount: 1,
          severity: 'CRITICAL',
        });
      }
    }

    return flows;
  }

  private getDefaultPort(protocol: string): number {
    const ports: Record<string, number> = {
      TCP: 443,
      UDP: 53,
      ICMP: 0,
      DNS: 53,
      HTTP: 80,
      MODBUS_TCP: 502,
      OPC_UA: 4840,
    };
    return ports[protocol] || 80;
  }

  private randomTCPFlags(): string[] {
    const flags = ['SYN', 'ACK', 'FIN', 'RST', 'PSH'];
    const count = 1 + Math.floor(Math.random() * 3);
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(flags[Math.floor(Math.random() * flags.length)]);
    }
    return [...new Set(result)];
  }
}

/**
 * Create a simulation PCAP connector
 */
export function createPCAPSimulationConnector(name: string = 'PCAP-Monitor'): PCAPConnector {
  return new PCAPConnector({
    id: uuidv4(),
    name,
    networkInterface: null,
    pcapFilePath: null,
    bpfFilter: '',
    snaplen: 65535,
    simulationMode: true,
    collectIntervalMs: 5000,
    tags: { source: 'simulation', type: 'pcap' },
  });
}
