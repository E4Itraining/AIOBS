/**
 * OT Connectors Tests
 * Tests all industrial protocol connectors in simulation mode
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { OPCUAConnector, createOPCUASimulationConnector } from '../connectors/ot/opcua-connector';
import { ModbusConnector, createModbusSimulationConnector } from '../connectors/ot/modbus-connector';
import { MQTTConnector, createMQTTSimulationConnector } from '../connectors/ot/mqtt-connector';
import { SNMPConnector, createSNMPSimulationConnector } from '../connectors/ot/snmp-connector';

// ============================================================================
// OPC-UA Connector Tests
// ============================================================================

describe('OPCUAConnector', () => {
  let connector: OPCUAConnector;

  beforeEach(() => {
    connector = createOPCUASimulationConnector();
  });

  afterEach(async () => {
    await connector.disconnect();
  });

  it('should initialize in simulation mode', () => {
    expect(connector.isSimulation()).toBe(true);
    expect(connector.getProtocol()).toBe('opcua');
    expect(connector.getConnectionStatus()).toBe('simulation');
  });

  it('should connect in simulation mode', async () => {
    await connector.connect();
    expect(connector.getConnectionStatus()).toBe('simulation');
  });

  it('should collect simulation data', async () => {
    await connector.connect();
    const result = await connector.collect();

    expect(result.connectorId).toBe(connector.getId());
    expect(result.protocol).toBe('opcua');
    expect(result.dataPoints.length).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.errors).toHaveLength(0);

    for (const dp of result.dataPoints) {
      expect(dp.protocol).toBe('opcua');
      expect(dp.quality).toBe('simulated');
      expect(dp.metricName).toBeTruthy();
      expect(dp.metadata.nodeId).toBeTruthy();
      expect(dp.metadata.statusCode).toBe('Good');
    }
  });

  it('should generate different node types', async () => {
    const result = await connector.collect();
    const nodeTypes = result.dataPoints.map(dp => dp.metadata.nodeType);

    expect(nodeTypes).toContain('variable');
    expect(nodeTypes).toContain('setpoint');
    expect(nodeTypes).toContain('alarm');
  });

  it('should return healthy status', async () => {
    await connector.connect();
    const health = await connector.healthCheck();

    expect(health.status).toBe('healthy');
    expect(health.simulationMode).toBe(true);
    expect(health.protocol).toBe('opcua');
    expect(health.details.endpointUrl).toBeDefined();
  });

  it('should disconnect cleanly', async () => {
    await connector.connect();
    await connector.disconnect();
    expect(connector.getConnectionStatus()).toBe('disconnected');
  });
});

// ============================================================================
// Modbus Connector Tests
// ============================================================================

describe('ModbusConnector', () => {
  let connector: ModbusConnector;

  beforeEach(() => {
    connector = createModbusSimulationConnector();
  });

  afterEach(async () => {
    await connector.disconnect();
  });

  it('should initialize in simulation mode', () => {
    expect(connector.isSimulation()).toBe(true);
    expect(connector.getProtocol()).toBe('modbus');
  });

  it('should collect simulation data', async () => {
    const result = await connector.collect();

    expect(result.protocol).toBe('modbus');
    expect(result.dataPoints.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);

    for (const dp of result.dataPoints) {
      expect(dp.protocol).toBe('modbus');
      expect(dp.quality).toBe('simulated');
      expect(dp.metadata.registerAddress).toBeDefined();
      expect(dp.metadata.registerType).toBeDefined();
      expect(dp.metadata.unitId).toBe('1');
    }
  });

  it('should simulate different register types', async () => {
    const result = await connector.collect();
    const types = result.dataPoints.map(dp => dp.metadata.registerType);

    expect(types).toContain('holding_register');
    expect(types).toContain('input_register');
    expect(types).toContain('coil');
    expect(types).toContain('discrete_input');
  });

  it('should provide boolean values for coils', async () => {
    const result = await connector.collect();
    const coils = result.dataPoints.filter(dp => dp.metadata.registerType === 'coil');

    for (const coil of coils) {
      expect(typeof coil.value).toBe('boolean');
    }
  });

  it('should return health check', async () => {
    const health = await connector.healthCheck();
    expect(health.protocol).toBe('modbus');
    expect(health.details.transport).toBe('tcp');
    expect(health.details.unitId).toBe('1');
  });
});

// ============================================================================
// MQTT Connector Tests
// ============================================================================

describe('MQTTConnector', () => {
  let connector: MQTTConnector;

  beforeEach(() => {
    connector = createMQTTSimulationConnector();
  });

  afterEach(async () => {
    await connector.disconnect();
  });

  it('should initialize in simulation mode', () => {
    expect(connector.isSimulation()).toBe(true);
    expect(connector.getProtocol()).toBe('mqtt');
  });

  it('should collect simulation data from topics', async () => {
    const result = await connector.collect();

    expect(result.protocol).toBe('mqtt');
    expect(result.dataPoints.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);

    for (const dp of result.dataPoints) {
      expect(dp.protocol).toBe('mqtt');
      expect(dp.quality).toBe('simulated');
      expect(dp.metadata.topic).toBeTruthy();
      expect(dp.metadata.payloadFormat).toBeTruthy();
    }
  });

  it('should generate sensor data', async () => {
    const result = await connector.collect();
    const sensorData = result.dataPoints.filter(dp =>
      dp.metadata.topic.includes('sensor')
    );

    expect(sensorData.length).toBeGreaterThan(0);
  });

  it('should return health details', async () => {
    const health = await connector.healthCheck();
    expect(health.protocol).toBe('mqtt');
    expect(health.details.brokerUrl).toBeDefined();
    expect(health.details.protocolVersion).toBe('5.0');
  });
});

// ============================================================================
// SNMP Connector Tests
// ============================================================================

describe('SNMPConnector', () => {
  let connector: SNMPConnector;

  beforeEach(() => {
    connector = createSNMPSimulationConnector();
  });

  afterEach(async () => {
    await connector.disconnect();
  });

  it('should initialize in simulation mode', () => {
    expect(connector.isSimulation()).toBe(true);
    expect(connector.getProtocol()).toBe('snmp');
  });

  it('should collect simulation data', async () => {
    const result = await connector.collect();

    expect(result.protocol).toBe('snmp');
    expect(result.dataPoints.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);

    for (const dp of result.dataPoints) {
      expect(dp.protocol).toBe('snmp');
      expect(dp.quality).toBe('simulated');
      expect(dp.metadata.oid).toBeTruthy();
      expect(dp.metadata.snmpType).toBeTruthy();
    }
  });

  it('should simulate different SNMP types', async () => {
    const result = await connector.collect();
    const types = result.dataPoints.map(dp => dp.metadata.snmpType);

    expect(types).toContain('string');
    expect(types).toContain('counter');
    expect(types).toContain('gauge');
    expect(types).toContain('timeticks');
  });

  it('should increment counters over time', async () => {
    const result1 = await connector.collect();
    const result2 = await connector.collect();

    const counter1 = result1.dataPoints.find(dp => dp.metadata.snmpType === 'counter');
    const counter2 = result2.dataPoints.find(dp =>
      dp.metadata.snmpType === 'counter' && dp.metricName === counter1?.metricName
    );

    if (counter1 && counter2) {
      expect(Number(counter2.value)).toBeGreaterThan(Number(counter1.value));
    }
  });

  it('should return health details', async () => {
    const health = await connector.healthCheck();
    expect(health.protocol).toBe('snmp');
    expect(health.details.version).toBe('v2c');
    expect(health.details.host).toBe('localhost');
  });
});

// ============================================================================
// Cross-connector Tests
// ============================================================================

describe('OT Connector Common Interface', () => {
  const connectors = [
    { name: 'OPC-UA', create: createOPCUASimulationConnector },
    { name: 'Modbus', create: createModbusSimulationConnector },
    { name: 'MQTT', create: createMQTTSimulationConnector },
    { name: 'SNMP', create: createSNMPSimulationConnector },
  ];

  for (const { name, create } of connectors) {
    describe(`${name}`, () => {
      it('should implement common interface', async () => {
        const connector = create();

        // Connect
        await connector.connect();
        expect(['connected', 'simulation']).toContain(connector.getConnectionStatus());

        // Collect
        const result = await connector.collect();
        expect(result.connectorId).toBeDefined();
        expect(result.protocol).toBeDefined();
        expect(result.timestamp).toBeDefined();
        expect(result.dataPoints).toBeDefined();
        expect(result.durationMs).toBeGreaterThanOrEqual(0);

        // Health check
        const health = await connector.healthCheck();
        expect(health.status).toBeDefined();
        expect(health.simulationMode).toBe(true);

        // Disconnect
        await connector.disconnect();
        expect(connector.getConnectionStatus()).toBe('disconnected');
      });

      it('should produce data points with required fields', async () => {
        const connector = create();
        const result = await connector.collect();

        for (const dp of result.dataPoints) {
          expect(dp.connectorId).toBeDefined();
          expect(dp.protocol).toBeDefined();
          expect(dp.timestamp).toBeDefined();
          expect(dp.metricName).toBeTruthy();
          expect(dp.value).toBeDefined();
          expect(dp.quality).toBe('simulated');
          expect(dp.metadata).toBeDefined();
        }

        await connector.disconnect();
      });
    });
  }
});
