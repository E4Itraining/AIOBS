/**
 * OT (Operational Technology) Connector Type Definitions
 * Industrial protocols for IT/OT convergence monitoring
 * Supports OPC-UA, Modbus TCP/RTU, MQTT 3.1.1/5.0, SNMP v2c/v3
 */

import { ISO8601, UUID, NormalizedScore, HealthStatus } from './common';

// ============================================================================
// Base Connector Types
// ============================================================================

/** Connection status for any OT connector */
export type OTConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error' | 'simulation';

/** Base configuration shared by all OT connectors */
export interface OTBaseConfig {
  /** Unique connector instance ID */
  id: UUID;
  /** Human-readable name */
  name: string;
  /** Protocol type */
  protocol: OTProtocol;
  /** Enable simulation mode (synthetic data without real equipment) */
  simulationMode: boolean;
  /** Collection interval in milliseconds */
  collectIntervalMs: number;
  /** Connection timeout in milliseconds */
  connectionTimeoutMs: number;
  /** Retry configuration */
  retry: {
    maxRetries: number;
    backoffMs: number;
    maxBackoffMs: number;
  };
  /** Tags for identification and routing */
  tags: Record<string, string>;
}

export type OTProtocol = 'opcua' | 'modbus' | 'mqtt' | 'snmp';

/** Base data point collected from OT systems */
export interface OTDataPoint {
  /** Source connector ID */
  connectorId: UUID;
  /** Protocol used for collection */
  protocol: OTProtocol;
  /** Timestamp of collection */
  timestamp: ISO8601;
  /** Metric name / node identifier */
  metricName: string;
  /** Collected value */
  value: number | string | boolean;
  /** Quality indicator */
  quality: OTDataQuality;
  /** Source-specific metadata */
  metadata: Record<string, string>;
}

export type OTDataQuality = 'good' | 'uncertain' | 'bad' | 'simulated';

/** Health check result for OT connectors */
export interface OTHealthCheck {
  connectorId: UUID;
  protocol: OTProtocol;
  status: HealthStatus;
  connectionStatus: OTConnectionStatus;
  lastCollection: ISO8601 | null;
  latencyMs: number;
  errorCount: number;
  simulationMode: boolean;
  details: Record<string, string>;
}

/** Collected batch from OT connector */
export interface OTCollectionResult {
  connectorId: UUID;
  protocol: OTProtocol;
  timestamp: ISO8601;
  dataPoints: OTDataPoint[];
  durationMs: number;
  errors: OTCollectionError[];
}

export interface OTCollectionError {
  timestamp: ISO8601;
  source: string;
  message: string;
  recoverable: boolean;
}

// ============================================================================
// OPC-UA Types
// ============================================================================

export interface OPCUAConfig extends OTBaseConfig {
  protocol: 'opcua';
  /** OPC-UA endpoint URL (e.g., opc.tcp://192.168.1.10:4840) */
  endpointUrl: string;
  /** Security mode */
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt';
  /** Security policy */
  securityPolicy: 'None' | 'Basic128Rsa15' | 'Basic256' | 'Basic256Sha256';
  /** Authentication */
  authentication: {
    type: 'anonymous' | 'username' | 'certificate';
    username?: string;
    password?: string;
    certificatePath?: string;
    privateKeyPath?: string;
  };
  /** Node IDs to monitor */
  monitoredNodes: OPCUANodeConfig[];
  /** Subscription parameters */
  subscription: {
    publishingIntervalMs: number;
    lifetimeCount: number;
    maxKeepAliveCount: number;
    maxNotificationsPerPublish: number;
  };
}

export interface OPCUANodeConfig {
  /** OPC-UA Node ID (e.g., ns=2;s=MyVariable) */
  nodeId: string;
  /** Human-readable display name */
  displayName: string;
  /** Node type for collection strategy */
  nodeType: 'variable' | 'setpoint' | 'alarm' | 'event';
  /** Sampling interval override (ms), null = use subscription default */
  samplingIntervalMs: number | null;
}

export interface OPCUADataPoint extends OTDataPoint {
  protocol: 'opcua';
  metadata: {
    nodeId: string;
    nodeType: string;
    serverTimestamp: string;
    sourceTimestamp: string;
    statusCode: string;
    [key: string]: string;
  };
}

// ============================================================================
// Modbus Types
// ============================================================================

export interface ModbusConfig extends OTBaseConfig {
  protocol: 'modbus';
  /** Transport type */
  transport: 'tcp' | 'rtu';
  /** For TCP: host address */
  host?: string;
  /** For TCP: port (default 502) */
  port?: number;
  /** For RTU: serial port path */
  serialPath?: string;
  /** For RTU: baud rate */
  baudRate?: number;
  /** For RTU: parity */
  parity?: 'none' | 'even' | 'odd';
  /** Modbus unit/slave ID */
  unitId: number;
  /** Registers to read */
  registers: ModbusRegisterConfig[];
}

export interface ModbusRegisterConfig {
  /** Register address */
  address: number;
  /** Number of registers to read */
  count: number;
  /** Register type */
  type: 'coil' | 'discrete_input' | 'holding_register' | 'input_register';
  /** Display name */
  name: string;
  /** Data format for interpretation */
  format: 'uint16' | 'int16' | 'uint32' | 'int32' | 'float32' | 'boolean';
  /** Scale factor to apply */
  scaleFactor?: number;
  /** Unit of measurement */
  unit?: string;
}

export interface ModbusDataPoint extends OTDataPoint {
  protocol: 'modbus';
  metadata: {
    registerAddress: string;
    registerType: string;
    unitId: string;
    rawValue: string;
    [key: string]: string;
  };
}

// ============================================================================
// MQTT Types
// ============================================================================

export interface MQTTConfig extends OTBaseConfig {
  protocol: 'mqtt';
  /** Broker URL (e.g., mqtt://192.168.1.10:1883) */
  brokerUrl: string;
  /** MQTT protocol version */
  protocolVersion: '3.1.1' | '5.0';
  /** Client ID */
  clientId: string;
  /** Authentication */
  authentication?: {
    username: string;
    password: string;
  };
  /** TLS configuration */
  tls?: {
    enabled: boolean;
    caPath?: string;
    certPath?: string;
    keyPath?: string;
    rejectUnauthorized: boolean;
  };
  /** Topics to subscribe */
  subscriptions: MQTTSubscription[];
  /** Topics for publishing (telemetry back-channel) */
  publishTopics?: MQTTPublishConfig[];
  /** Clean session flag */
  cleanSession: boolean;
  /** Keep alive interval in seconds */
  keepAliveSeconds: number;
  /** QoS level */
  qos: 0 | 1 | 2;
}

export interface MQTTSubscription {
  /** Topic filter (supports wildcards: +, #) */
  topic: string;
  /** QoS level for this subscription */
  qos: 0 | 1 | 2;
  /** Parser for incoming messages */
  parser: 'json' | 'sparkplug_b' | 'raw';
  /** Field mapping for metric extraction */
  fieldMapping?: Record<string, string>;
}

export interface MQTTPublishConfig {
  /** Topic to publish to */
  topic: string;
  /** QoS level */
  qos: 0 | 1 | 2;
  /** Retain flag */
  retain: boolean;
}

export interface MQTTDataPoint extends OTDataPoint {
  protocol: 'mqtt';
  metadata: {
    topic: string;
    qos: string;
    retained: string;
    payloadFormat: string;
    [key: string]: string;
  };
}

// ============================================================================
// SNMP Types
// ============================================================================

export interface SNMPConfig extends OTBaseConfig {
  protocol: 'snmp';
  /** Target host */
  host: string;
  /** SNMP port (default 161) */
  port: number;
  /** SNMP version */
  version: 'v2c' | 'v3';
  /** For v2c: community string */
  community?: string;
  /** For v3: security parameters */
  v3Security?: SNMPv3Security;
  /** OIDs to poll */
  oids: SNMPOIDConfig[];
}

export interface SNMPv3Security {
  securityLevel: 'noAuthNoPriv' | 'authNoPriv' | 'authPriv';
  username: string;
  authProtocol?: 'MD5' | 'SHA' | 'SHA256';
  authKey?: string;
  privProtocol?: 'DES' | 'AES' | 'AES256';
  privKey?: string;
}

export interface SNMPOIDConfig {
  /** OID to poll (e.g., 1.3.6.1.2.1.1.3.0 for sysUpTime) */
  oid: string;
  /** Human-readable name */
  name: string;
  /** Expected data type */
  type: 'integer' | 'string' | 'counter' | 'gauge' | 'timeticks';
  /** Scale factor for numeric values */
  scaleFactor?: number;
}

export interface SNMPDataPoint extends OTDataPoint {
  protocol: 'snmp';
  metadata: {
    oid: string;
    snmpType: string;
    [key: string]: string;
  };
}

// ============================================================================
// Aggregated OT Metrics for Dashboard
// ============================================================================

export interface OTMetricsSummary {
  timestamp: ISO8601;
  connectors: OTConnectorStatus[];
  totalDataPoints: number;
  collectionRate: number;
  errorRate: NormalizedScore;
  protocolBreakdown: Record<OTProtocol, number>;
  simulationActive: boolean;
}

export interface OTConnectorStatus {
  connectorId: UUID;
  name: string;
  protocol: OTProtocol;
  status: OTConnectionStatus;
  lastCollection: ISO8601 | null;
  dataPointsCollected: number;
  errorCount: number;
  latencyMs: number;
}
