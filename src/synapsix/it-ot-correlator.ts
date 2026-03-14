/**
 * IT/OT Correlator
 *
 * Cross-domain threat detection bridging IT network signals and OT process
 * anomalies. Detects attack chains that span the IT/OT boundary — e.g.,
 * lateral movement from IT network followed by OT process manipulation.
 *
 * @cybersec IT/OT convergence threat detection for OIV/defense SOC
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

export interface ITSignal {
  id: string;
  timestamp: string;
  source: 'pcap' | 'suricata' | 'zeek' | 'edr' | 'siem';
  type: 'network_anomaly' | 'auth_failure' | 'lateral_movement' | 'data_exfiltration' | 'malware_detection';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sourceIp: string;
  destIp: string;
  protocol: string;
  details: Record<string, string | number | boolean>;
}

export interface OTSignal {
  id: string;
  timestamp: string;
  source: 'opcua' | 'modbus' | 'mqtt' | 'snmp';
  type: 'setpoint_change' | 'process_anomaly' | 'command_injection' | 'device_restart' | 'config_change';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assetId: string;
  assetName: string;
  details: Record<string, string | number | boolean>;
}

export interface SemanticSignal {
  id: string;
  timestamp: string;
  modelId: string;
  driftScore: number;
  statisticallyNormal: boolean;
  semanticallyShifted: boolean;
  driftType: 'semantic' | 'statistical' | 'both';
}

export interface CorrelationEvent {
  id: string;
  timestamp: string;
  correlationType: 'it_to_ot' | 'ot_to_it' | 'it_ot_semantic' | 'multi_vector';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  itSignals: ITSignal[];
  otSignals: OTSignal[];
  semanticSignals: SemanticSignal[];
  attackChain: AttackChainStep[];
  description: string;
  recommendedActions: string[];
}

export interface AttackChainStep {
  order: number;
  timestamp: string;
  domain: 'IT' | 'OT' | 'AI';
  action: string;
  evidence: string;
  mitreTechnique: string | null;
}

export interface ITOTCorrelatorConfig {
  /** Time window for correlating IT and OT events (ms) */
  correlationWindowMs: number;
  /** Minimum confidence to emit correlation event */
  minConfidence: number;
  /** Maximum number of signals to buffer */
  maxBufferSize: number;
}

// ============================================================================
// Correlator Implementation
// ============================================================================

/**
 * @cybersec Cross-domain IT/OT threat correlation for sovereign SOC operations
 */
export class ITOTCorrelator {
  private config: ITOTCorrelatorConfig;
  private itBuffer: ITSignal[] = [];
  private otBuffer: OTSignal[] = [];
  private semanticBuffer: SemanticSignal[] = [];

  constructor(config?: Partial<ITOTCorrelatorConfig>) {
    this.config = {
      correlationWindowMs: config?.correlationWindowMs ?? 300_000, // 5 minutes
      minConfidence: config?.minConfidence ?? 0.4,
      maxBufferSize: config?.maxBufferSize ?? 10_000,
    };
  }

  /**
   * Ingest an IT-side signal and check for cross-domain correlations
   * @cybersec Correlates IT network events with OT process anomalies
   */
  ingestIT(signal: ITSignal): CorrelationEvent | null {
    this.itBuffer.push(signal);
    this.trimBuffers();
    return this.correlate();
  }

  /**
   * Ingest an OT-side signal and check for cross-domain correlations
   * @cybersec Correlates OT process events with IT network anomalies
   */
  ingestOT(signal: OTSignal): CorrelationEvent | null {
    this.otBuffer.push(signal);
    this.trimBuffers();
    return this.correlate();
  }

  /**
   * Ingest a semantic drift signal and check for triple-domain correlation
   * @cybersec Correlates AI semantic drift with IT/OT events for stealth detection
   */
  ingestSemantic(signal: SemanticSignal): CorrelationEvent | null {
    this.semanticBuffer.push(signal);
    this.trimBuffers();
    return this.correlate();
  }

  /**
   * Get current buffer sizes
   */
  getBufferStats(): { it: number; ot: number; semantic: number } {
    return {
      it: this.itBuffer.length,
      ot: this.otBuffer.length,
      semantic: this.semanticBuffer.length,
    };
  }

  /**
   * Clear all buffers
   */
  clearBuffers(): void {
    this.itBuffer = [];
    this.otBuffer = [];
    this.semanticBuffer = [];
  }

  // ===========================================================================
  // Private correlation logic
  // ===========================================================================

  private correlate(): CorrelationEvent | null {
    const now = Date.now();
    const windowStart = now - this.config.correlationWindowMs;
    const windowStartISO = new Date(windowStart).toISOString();

    // Get recent signals within correlation window
    const recentIT = this.itBuffer.filter(s => s.timestamp >= windowStartISO);
    const recentOT = this.otBuffer.filter(s => s.timestamp >= windowStartISO);
    const recentSemantic = this.semanticBuffer.filter(s => s.timestamp >= windowStartISO);

    // Check for IT→OT attack pattern
    const itOtCorrelation = this.detectITtoOT(recentIT, recentOT);
    if (itOtCorrelation && itOtCorrelation.confidence >= this.config.minConfidence) {
      return itOtCorrelation;
    }

    // Check for triple correlation: IT + OT + Semantic drift
    if (recentSemantic.length > 0) {
      const tripleCorrelation = this.detectTripleCorrelation(recentIT, recentOT, recentSemantic);
      if (tripleCorrelation && tripleCorrelation.confidence >= this.config.minConfidence) {
        return tripleCorrelation;
      }
    }

    return null;
  }

  private detectITtoOT(itSignals: ITSignal[], otSignals: OTSignal[]): CorrelationEvent | null {
    if (itSignals.length === 0 || otSignals.length === 0) return null;

    // Look for lateral movement followed by OT process anomaly
    const lateralMovement = itSignals.filter(s =>
      s.type === 'lateral_movement' || s.type === 'auth_failure'
    );
    const processAnomaly = otSignals.filter(s =>
      s.type === 'setpoint_change' || s.type === 'command_injection' || s.type === 'process_anomaly'
    );

    if (lateralMovement.length === 0 || processAnomaly.length === 0) return null;

    const attackChain: AttackChainStep[] = [];
    let order = 1;

    for (const it of lateralMovement) {
      attackChain.push({
        order: order++,
        timestamp: it.timestamp,
        domain: 'IT',
        action: `${it.type} from ${it.sourceIp} to ${it.destIp}`,
        evidence: `${it.source}: ${it.protocol} ${JSON.stringify(it.details)}`,
        mitreTechnique: it.type === 'lateral_movement' ? 'T1021' : null,
      });
    }

    for (const ot of processAnomaly) {
      attackChain.push({
        order: order++,
        timestamp: ot.timestamp,
        domain: 'OT',
        action: `${ot.type} on ${ot.assetName}`,
        evidence: `${ot.source}: ${JSON.stringify(ot.details)}`,
        mitreTechnique: ot.type === 'setpoint_change' ? 'T0836' : ot.type === 'command_injection' ? 'T0855' : null,
      });
    }

    const confidence = Math.min(1,
      0.4 + lateralMovement.length * 0.1 + processAnomaly.length * 0.15
    );

    const maxSeverity = this.maxSeverity([
      ...lateralMovement.map(s => s.severity),
      ...processAnomaly.map(s => s.severity),
    ]);

    return {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      correlationType: 'it_to_ot',
      severity: maxSeverity,
      confidence,
      itSignals: lateralMovement,
      otSignals: processAnomaly,
      semanticSignals: [],
      attackChain,
      description: `IT→OT attack chain: lateral movement in IT network followed by OT process manipulation on ${processAnomaly.map(s => s.assetName).join(', ')}`,
      recommendedActions: [
        'Isolate affected OT segment',
        'Verify OT setpoints via independent channel',
        'Investigate IT lateral movement path',
        'Preserve network captures for forensics',
      ],
    };
  }

  private detectTripleCorrelation(
    itSignals: ITSignal[],
    otSignals: OTSignal[],
    semanticSignals: SemanticSignal[]
  ): CorrelationEvent | null {
    const stealthDrifts = semanticSignals.filter(s => s.statisticallyNormal && s.semanticallyShifted);

    if (stealthDrifts.length === 0) return null;

    const attackChain: AttackChainStep[] = [];
    let order = 1;

    for (const it of itSignals.slice(0, 5)) {
      attackChain.push({
        order: order++,
        timestamp: it.timestamp,
        domain: 'IT',
        action: `${it.type}: ${it.sourceIp} → ${it.destIp}`,
        evidence: `${it.source}/${it.protocol}`,
        mitreTechnique: null,
      });
    }

    for (const ot of otSignals.slice(0, 5)) {
      attackChain.push({
        order: order++,
        timestamp: ot.timestamp,
        domain: 'OT',
        action: `${ot.type} on ${ot.assetName}`,
        evidence: `${ot.source}`,
        mitreTechnique: ot.type === 'setpoint_change' ? 'T0836' : null,
      });
    }

    for (const sem of stealthDrifts) {
      attackChain.push({
        order: order++,
        timestamp: sem.timestamp,
        domain: 'AI',
        action: `Stealth semantic drift on model ${sem.modelId} (score: ${sem.driftScore.toFixed(3)})`,
        evidence: 'Statistically normal but semantically shifted — invisible to classical SIEM',
        mitreTechnique: 'T0856',
      });
    }

    const confidence = Math.min(1,
      0.5 + stealthDrifts.length * 0.2 + itSignals.length * 0.05 + otSignals.length * 0.1
    );

    return {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      correlationType: 'it_ot_semantic',
      severity: 'CRITICAL',
      confidence,
      itSignals: itSignals.slice(0, 5),
      otSignals: otSignals.slice(0, 5),
      semanticSignals: stealthDrifts,
      attackChain,
      description: 'Multi-vector stealth attack: IT network activity + OT process anomaly + AI semantic drift. Statistical metrics normal — classical tools will miss this.',
      recommendedActions: [
        'IMMEDIATE: Switch to manual OT control verification',
        'Isolate affected network segments (IT and OT)',
        'Compare AI model outputs against physical sensor readings',
        'Activate COMCYBER incident response protocol',
        'Preserve all evidence for forensic analysis',
        'Notify ANSSI per NIS2 requirements (24h window)',
      ],
    };
  }

  private trimBuffers(): void {
    const maxAge = new Date(Date.now() - this.config.correlationWindowMs * 2).toISOString();
    this.itBuffer = this.itBuffer.filter(s => s.timestamp >= maxAge).slice(-this.config.maxBufferSize);
    this.otBuffer = this.otBuffer.filter(s => s.timestamp >= maxAge).slice(-this.config.maxBufferSize);
    this.semanticBuffer = this.semanticBuffer.filter(s => s.timestamp >= maxAge).slice(-this.config.maxBufferSize);
  }

  private maxSeverity(severities: string[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const order: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    let max = 0;
    let result: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    for (const s of severities) {
      if ((order[s] || 0) > max) {
        max = order[s] || 0;
        result = s as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      }
    }
    return result;
  }
}
