# IT/OT Protocol Connectors

AIOBS provides connectors for the four main industrial protocols, enabling convergence monitoring between IT and OT networks.

## Supported Protocols

| Protocol | Transport | Version | Connector Class |
|----------|-----------|---------|-----------------|
| OPC-UA | TCP | 1.04+ | `OPCUAConnector` |
| Modbus | TCP / RTU | TCP/RTU | `ModbusConnector` |
| MQTT | TCP / TLS | 3.1.1, 5.0 | `MQTTConnector` |
| SNMP | UDP | v2c, v3 | `SNMPConnector` |

## Architecture

All connectors inherit from `OTBaseConnector`, which provides:

- **Connection lifecycle** — `connect()`, `disconnect()` with retry/backoff
- **Data collection** — `collect()` dispatches to simulation or real implementation
- **Health monitoring** — `healthCheck()` returns protocol-specific diagnostics
- **Periodic collection** — `startPeriodicCollection()` for autonomous gathering
- **Simulation mode** — All connectors generate realistic data without physical equipment

```
                    ┌─────────────────────┐
                    │   OTBaseConnector    │ (abstract)
                    │   connect / collect  │
                    │   healthCheck        │
                    └──────────┬──────────┘
          ┌────────────┬───────┴──────┬───────────┐
    ┌─────▼────┐ ┌────▼─────┐ ┌──────▼───┐ ┌─────▼────┐
    │ OPC-UA   │ │ Modbus   │ │  MQTT    │ │  SNMP    │
    │Connector │ │Connector │ │Connector │ │Connector │
    └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

## Quick Start

### Simulation Mode (Default)

```typescript
import {
  createOPCUASimulationConnector,
  createModbusSimulationConnector,
  createMQTTSimulationConnector,
  createSNMPSimulationConnector,
} from '@aiobs/platform';

// OPC-UA — industrial process sensors
const opcua = createOPCUASimulationConnector();
await opcua.connect();
const opcuaData = await opcua.collect();
// Returns: temperature, pressure, flow_rate, level, speed readings

// Modbus — motor control and status
const modbus = createModbusSimulationConnector();
await modbus.connect();
const modbusData = await modbus.collect();
// Returns: motor speed, current, vibration, coils (boolean)

// MQTT — IoT sensors
const mqtt = createMQTTSimulationConnector();
await mqtt.connect();
const mqttData = await mqtt.collect();
// Returns: temperature, humidity, pressure per topic

// SNMP — network infrastructure
const snmp = createSNMPSimulationConnector();
await snmp.connect();
const snmpData = await snmp.collect();
// Returns: CPU, memory, bandwidth, uptime, sysDescr
```

### Platform Factory

```typescript
import { AIOBS } from '@aiobs/platform';

const platform = AIOBS.create({
  // ... other config
});

// OT connectors are instantiated independently for flexibility:
const opcua = createOPCUASimulationConnector();
await opcua.connect();
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AIOBS_OT_SIMULATION` | `true` | Enable simulation mode globally |
| `AIOBS_OPCUA_ENDPOINT` | `opc.tcp://localhost:4840` | OPC-UA server endpoint |
| `AIOBS_MODBUS_HOST` | `localhost` | Modbus server host |
| `AIOBS_MODBUS_PORT` | `502` | Modbus server port |
| `AIOBS_MQTT_BROKER` | `mqtt://localhost:1883` | MQTT broker URL |
| `AIOBS_SNMP_HOST` | `localhost` | SNMP target host |

### OPC-UA Configuration

```typescript
import { OPCUAConnector } from '@aiobs/platform';

const connector = new OPCUAConnector({
  id: 'opcua-scada-01',
  name: 'SCADA Process Controller',
  protocol: 'opcua',
  host: 'opc.tcp://192.168.1.100:4840',
  simulation: false,
  pollIntervalMs: 1000,
  timeoutMs: 5000,
  retryAttempts: 3,
  nodes: [
    { nodeId: 'ns=2;s=Temperature', name: 'Reactor Temp', dataType: 'Float', unit: '°C' },
    { nodeId: 'ns=2;s=Pressure', name: 'Reactor Pressure', dataType: 'Float', unit: 'bar' },
  ],
});
```

### Modbus Configuration

```typescript
import { ModbusConnector } from '@aiobs/platform';

const connector = new ModbusConnector({
  id: 'modbus-motor-01',
  name: 'Motor Controller',
  protocol: 'modbus',
  host: '192.168.1.50',
  port: 502,
  transport: 'tcp',  // or 'rtu'
  unitId: 1,
  simulation: false,
  registers: [
    { address: 0, name: 'Motor_Speed', type: 'holding', dataType: 'uint16', unit: 'rpm' },
    { address: 1, name: 'Motor_Current', type: 'holding', dataType: 'float32', unit: 'A' },
    { address: 100, name: 'Motor_Running', type: 'coil', dataType: 'boolean' },
  ],
});
```

### MQTT Configuration

```typescript
import { MQTTConnector } from '@aiobs/platform';

const connector = new MQTTConnector({
  id: 'mqtt-sensors-01',
  name: 'Field Sensors',
  protocol: 'mqtt',
  host: 'mqtt://broker.local:1883',
  simulation: false,
  mqttVersion: '5.0',
  subscriptions: [
    { topic: 'plant/zone-a/sensors/#', qos: 1, dataType: 'sensor' },
    { topic: 'plant/alarms/#', qos: 2, dataType: 'alarm' },
  ],
});
```

### SNMP Configuration

```typescript
import { SNMPConnector } from '@aiobs/platform';

const connector = new SNMPConnector({
  id: 'snmp-switch-01',
  name: 'Core Switch',
  protocol: 'snmp',
  host: '192.168.1.1',
  simulation: false,
  snmpVersion: 'v3',
  v3Security: {
    username: 'aiobs-monitor',
    authProtocol: 'SHA',
    authKey: 'auth-secret',
    privProtocol: 'AES',
    privKey: 'priv-secret',
  },
  oids: [
    { oid: '1.3.6.1.2.1.25.3.3.1.2', name: 'cpuLoad', type: 'gauge', unit: '%' },
    { oid: '1.3.6.1.2.1.25.2.3.1.6', name: 'memUsed', type: 'gauge', unit: 'bytes' },
  ],
});
```

## Data Output

All connectors produce `OTDataPoint` objects:

```typescript
interface OTDataPoint {
  timestamp: string;       // ISO 8601
  connectorId: string;     // Source connector ID
  protocol: string;        // 'opcua' | 'modbus' | 'mqtt' | 'snmp'
  pointName: string;       // Metric name
  value: number;           // Numeric value
  unit: string;            // Engineering unit
  quality: string;         // 'good' | 'uncertain' | 'bad'
  metadata: Record<string, string>;  // Protocol-specific metadata
}
```

## Simulation Data Profiles

### OPC-UA Simulation
| Node | Range | Pattern |
|------|-------|---------|
| Temperature | 15–35 °C | Setpoint ± oscillation |
| Pressure | 0.8–1.5 bar | Process variable |
| Flow Rate | 50–200 L/min | Oscillating |
| Level | 20–80 % | Slow drift |
| Speed | 1400–1600 rpm | Setpoint stability |

### Modbus Simulation
| Register | Type | Range |
|----------|------|-------|
| Motor_Speed | holding (uint16) | 0–1800 rpm |
| Motor_Current | holding (float32) | 0–100 A |
| Vibration | input (float32) | 0–10 mm/s |
| Motor_Running | coil (boolean) | true/false |
| Emergency_Stop | coil (boolean) | true/false |

### MQTT Simulation
| Topic Pattern | Data | Frequency |
|---------------|------|-----------|
| `sensors/#` | temp, humidity, pressure | Per collection |
| `alarms/#` | alarm state, severity | Event-driven |
| `status/#` | device status, uptime | Periodic |

### SNMP Simulation
| OID | Type | Behavior |
|-----|------|----------|
| sysDescr | string | Static |
| cpuLoad | gauge | 10–90% fluctuating |
| memUsed | gauge | 40–85% slow drift |
| ifInOctets | counter | Incrementing |
| sysUpTime | timeticks | Incrementing |

## Integration with Defense SOC

OT connector data feeds into the Defense SOC dashboard at `/defense-soc`:
- IT/OT correlation panel compares network latency (ms) vs OPC-UA latency (s)
- Modbus errors and parameter changes trigger MITRE ATT&CK mapping
- MQTT alarm data correlates with semantic drift alerts
- SNMP network data provides infrastructure context for attack chains
