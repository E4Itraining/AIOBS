/**
 * Modbus Connector
 *
 * Collects register values from Modbus TCP/RTU devices.
 * Supports simulation mode for demo without real PLCs.
 */

import {
  ModbusConfig,
  ModbusDataPoint,
  OTDataPoint,
} from '../../core/types/ot-connector';
import { OTBaseConnector } from './ot-base-connector';

export class ModbusConnector extends OTBaseConnector {
  private modbusConfig: ModbusConfig;
  private registerValues: Map<number, number> = new Map();

  constructor(config: ModbusConfig) {
    super(config);
    this.modbusConfig = config;
    this.initSimulationState();
  }

  protected async doConnect(): Promise<void> {
    if (this.modbusConfig.transport === 'tcp') {
      throw new Error(
        `Modbus TCP connection to ${this.modbusConfig.host}:${this.modbusConfig.port} ` +
        `requires modbus-serial. Use simulationMode=true for demo.`
      );
    }
    throw new Error(
      `Modbus RTU connection to ${this.modbusConfig.serialPath} requires modbus-serial. ` +
      `Use simulationMode=true for demo.`
    );
  }

  protected async doCollect(): Promise<OTDataPoint[]> {
    throw new Error('Modbus collection requires active connection. Use simulationMode=true.');
  }

  protected async doDisconnect(): Promise<void> {}

  protected generateSimulationData(): OTDataPoint[] {
    const dataPoints: ModbusDataPoint[] = [];
    const now = new Date().toISOString();

    for (const reg of this.modbusConfig.registers) {
      const prevValue = this.registerValues.get(reg.address) || 0;
      let rawValue: number;

      switch (reg.type) {
        case 'coil':
        case 'discrete_input':
          rawValue = Math.random() < 0.05 ? (prevValue === 0 ? 1 : 0) : prevValue;
          break;
        case 'holding_register':
        case 'input_register':
          rawValue = this.simulateRegisterValue(prevValue, reg);
          break;
        default:
          rawValue = prevValue;
      }

      this.registerValues.set(reg.address, rawValue);

      const scaledValue = reg.scaleFactor ? rawValue * reg.scaleFactor : rawValue;

      dataPoints.push({
        connectorId: this.config.id,
        protocol: 'modbus',
        timestamp: now,
        metricName: reg.name,
        value: reg.type === 'coil' || reg.type === 'discrete_input'
          ? rawValue === 1
          : scaledValue,
        quality: 'simulated',
        metadata: {
          registerAddress: String(reg.address),
          registerType: reg.type,
          unitId: String(this.modbusConfig.unitId),
          rawValue: String(rawValue),
          ...(reg.unit ? { unit: reg.unit } : {}),
          ...this.config.tags,
        },
      });
    }

    return dataPoints;
  }

  protected getHealthDetails(): Record<string, string> {
    return {
      transport: this.modbusConfig.transport,
      host: this.modbusConfig.host || 'N/A',
      port: String(this.modbusConfig.port || 502),
      unitId: String(this.modbusConfig.unitId),
      registers: String(this.modbusConfig.registers.length),
    };
  }

  private initSimulationState(): void {
    for (const reg of this.modbusConfig.registers) {
      switch (reg.format) {
        case 'boolean':
          this.registerValues.set(reg.address, 0);
          break;
        case 'float32':
          this.registerValues.set(reg.address, 100 + Math.random() * 50);
          break;
        case 'uint16':
        case 'int16':
          this.registerValues.set(reg.address, Math.floor(Math.random() * 1000));
          break;
        default:
          this.registerValues.set(reg.address, Math.floor(Math.random() * 65535));
      }
    }
  }

  private simulateRegisterValue(current: number, reg: { format: string; name: string }): number {
    const noise = Math.max(1, current * 0.01);
    const newValue = current + (Math.random() - 0.5) * 2 * noise;

    switch (reg.format) {
      case 'uint16':
        return Math.max(0, Math.min(65535, Math.round(newValue)));
      case 'int16':
        return Math.max(-32768, Math.min(32767, Math.round(newValue)));
      case 'uint32':
        return Math.max(0, Math.round(newValue));
      case 'int32':
        return Math.round(newValue);
      case 'float32':
        return newValue;
      default:
        return Math.round(newValue);
    }
  }
}

export function createModbusSimulationConnector(name: string = 'PLC-Modbus'): ModbusConnector {
  const { v4: uuid } = require('uuid');
  return new ModbusConnector({
    id: uuid(),
    name,
    protocol: 'modbus',
    simulationMode: true,
    collectIntervalMs: 2000,
    connectionTimeoutMs: 5000,
    retry: { maxRetries: 3, backoffMs: 500, maxBackoffMs: 5000 },
    tags: { source: 'simulation', type: 'plc' },
    transport: 'tcp',
    host: 'localhost',
    port: 502,
    unitId: 1,
    registers: [
      { address: 0, count: 1, type: 'holding_register', name: 'Motor_Speed', format: 'uint16', unit: 'RPM' },
      { address: 1, count: 1, type: 'holding_register', name: 'Motor_Current', format: 'float32', scaleFactor: 0.1, unit: 'A' },
      { address: 3, count: 1, type: 'input_register', name: 'Vibration', format: 'float32', scaleFactor: 0.01, unit: 'mm/s' },
      { address: 5, count: 1, type: 'input_register', name: 'Temperature', format: 'int16', scaleFactor: 0.1, unit: '°C' },
      { address: 10, count: 1, type: 'coil', name: 'Motor_Running', format: 'boolean' },
      { address: 11, count: 1, type: 'coil', name: 'Emergency_Stop', format: 'boolean' },
      { address: 100, count: 1, type: 'discrete_input', name: 'Door_Open', format: 'boolean' },
    ],
  });
}
