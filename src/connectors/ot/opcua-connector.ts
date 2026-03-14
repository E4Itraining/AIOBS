/**
 * OPC-UA Connector
 *
 * Collects metrics from OPC-UA servers (setpoints, process variables, alarms).
 * Supports simulation mode for demo without real PLC/SCADA equipment.
 *
 * In production, this would use node-opcua or similar library.
 * The simulation mode generates realistic industrial process data.
 */

import {
  OPCUAConfig,
  OPCUADataPoint,
  OTDataPoint,
} from '../../core/types/ot-connector';
import { OTBaseConnector } from './ot-base-connector';

export class OPCUAConnector extends OTBaseConnector {
  private opcuaConfig: OPCUAConfig;
  private simulationState: Map<string, number> = new Map();

  constructor(config: OPCUAConfig) {
    super(config);
    this.opcuaConfig = config;
    this.initSimulationState();
  }

  protected async doConnect(): Promise<void> {
    // In production: connect to OPC-UA server
    // const client = OPCUAClient.create({ endpointMustExist: false });
    // await client.connect(this.opcuaConfig.endpointUrl);
    // const session = await client.createSession();
    throw new Error(
      `OPC-UA connection to ${this.opcuaConfig.endpointUrl} requires node-opcua. ` +
      `Use simulationMode=true for demo.`
    );
  }

  protected async doCollect(): Promise<OTDataPoint[]> {
    // In production: read monitored nodes via OPC-UA session
    throw new Error('OPC-UA collection requires active connection. Use simulationMode=true.');
  }

  protected async doDisconnect(): Promise<void> {
    // In production: close OPC-UA session and client
  }

  protected generateSimulationData(): OTDataPoint[] {
    const dataPoints: OPCUADataPoint[] = [];
    const now = new Date().toISOString();

    for (const node of this.opcuaConfig.monitoredNodes) {
      const prevValue = this.simulationState.get(node.nodeId) || 0;
      let value: number | string | boolean;

      switch (node.nodeType) {
        case 'setpoint':
          // Setpoints are relatively stable with small drift
          value = this.simulateSetpoint(prevValue, node.displayName);
          break;
        case 'variable':
          // Process variables fluctuate around setpoint
          value = this.simulateProcessVariable(prevValue, node.displayName);
          break;
        case 'alarm':
          // Alarms are boolean, occasionally triggered
          value = Math.random() < 0.02; // 2% chance of alarm
          break;
        case 'event':
          // Events are string-based
          value = this.simulateEvent();
          break;
        default:
          value = this.simulateValue(prevValue, 5);
      }

      if (typeof value === 'number') {
        this.simulationState.set(node.nodeId, value);
      }

      dataPoints.push({
        connectorId: this.config.id,
        protocol: 'opcua',
        timestamp: now,
        metricName: node.displayName,
        value,
        quality: 'simulated',
        metadata: {
          nodeId: node.nodeId,
          nodeType: node.nodeType,
          serverTimestamp: now,
          sourceTimestamp: now,
          statusCode: 'Good',
          ...this.config.tags,
        },
      });
    }

    return dataPoints;
  }

  protected getHealthDetails(): Record<string, string> {
    return {
      endpointUrl: this.opcuaConfig.endpointUrl,
      securityMode: this.opcuaConfig.securityMode,
      monitoredNodes: String(this.opcuaConfig.monitoredNodes.length),
      authType: this.opcuaConfig.authentication.type,
    };
  }

  // ===========================================================================
  // Simulation helpers for realistic industrial data
  // ===========================================================================

  private initSimulationState(): void {
    for (const node of this.opcuaConfig.monitoredNodes) {
      switch (node.displayName.toLowerCase()) {
        case 'temperature':
          this.simulationState.set(node.nodeId, 75); // °C
          break;
        case 'pressure':
          this.simulationState.set(node.nodeId, 2.5); // bar
          break;
        case 'flow_rate':
          this.simulationState.set(node.nodeId, 120); // L/min
          break;
        case 'level':
          this.simulationState.set(node.nodeId, 65); // %
          break;
        case 'speed':
          this.simulationState.set(node.nodeId, 1500); // RPM
          break;
        default:
          this.simulationState.set(node.nodeId, 50);
      }
    }
  }

  private simulateSetpoint(current: number, name: string): number {
    // Setpoints drift very slowly (operator adjustments)
    return current + (Math.random() - 0.5) * 0.1;
  }

  private simulateProcessVariable(current: number, name: string): number {
    // Process variables oscillate around their setpoint
    const noise = current * 0.02; // 2% noise
    const drift = (Math.random() - 0.5) * noise;
    return current + drift;
  }

  private simulateEvent(): string {
    const events = [
      'OperatorLogin',
      'SetpointChange',
      'AlarmAcknowledged',
      'ModeChange',
      'MaintenanceScheduled',
      'CalibrationComplete',
    ];
    return events[Math.floor(Math.random() * events.length)];
  }
}

/**
 * Create a pre-configured OPC-UA connector for common SCADA scenarios
 */
export function createOPCUASimulationConnector(name: string = 'SCADA-OPC-UA'): OPCUAConnector {
  const { v4: uuid } = require('uuid');
  return new OPCUAConnector({
    id: uuid(),
    name,
    protocol: 'opcua',
    simulationMode: true,
    collectIntervalMs: 5000,
    connectionTimeoutMs: 10000,
    retry: { maxRetries: 3, backoffMs: 1000, maxBackoffMs: 10000 },
    tags: { source: 'simulation', type: 'scada' },
    endpointUrl: 'opc.tcp://localhost:4840',
    securityMode: 'None',
    securityPolicy: 'None',
    authentication: { type: 'anonymous' },
    monitoredNodes: [
      { nodeId: 'ns=2;s=Temperature', displayName: 'Temperature', nodeType: 'variable', samplingIntervalMs: null },
      { nodeId: 'ns=2;s=Pressure', displayName: 'Pressure', nodeType: 'variable', samplingIntervalMs: null },
      { nodeId: 'ns=2;s=FlowRate', displayName: 'Flow_Rate', nodeType: 'variable', samplingIntervalMs: null },
      { nodeId: 'ns=2;s=Level', displayName: 'Level', nodeType: 'variable', samplingIntervalMs: null },
      { nodeId: 'ns=2;s=TempSetpoint', displayName: 'TempSetpoint', nodeType: 'setpoint', samplingIntervalMs: null },
      { nodeId: 'ns=2;s=HighTempAlarm', displayName: 'HighTempAlarm', nodeType: 'alarm', samplingIntervalMs: null },
    ],
    subscription: {
      publishingIntervalMs: 1000,
      lifetimeCount: 100,
      maxKeepAliveCount: 10,
      maxNotificationsPerPublish: 100,
    },
  });
}
