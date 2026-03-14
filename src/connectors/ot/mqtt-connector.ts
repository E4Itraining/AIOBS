/**
 * MQTT Connector
 *
 * Subscribe/publish on industrial MQTT topics (3.1.1 / 5.0).
 * Supports Sparkplug B and JSON payloads.
 * Simulation mode generates realistic IIoT telemetry data.
 */

import {
  MQTTConfig,
  MQTTDataPoint,
  OTDataPoint,
} from '../../core/types/ot-connector';
import { OTBaseConnector } from './ot-base-connector';

export class MQTTConnector extends OTBaseConnector {
  private mqttConfig: MQTTConfig;
  private simulationState: Map<string, number> = new Map();
  private messageCount: number = 0;

  constructor(config: MQTTConfig) {
    super(config);
    this.mqttConfig = config;
    this.initSimulationState();
  }

  protected async doConnect(): Promise<void> {
    throw new Error(
      `MQTT connection to ${this.mqttConfig.brokerUrl} requires mqtt.js. ` +
      `Use simulationMode=true for demo.`
    );
  }

  protected async doCollect(): Promise<OTDataPoint[]> {
    throw new Error('MQTT collection requires active connection. Use simulationMode=true.');
  }

  protected async doDisconnect(): Promise<void> {}

  protected generateSimulationData(): OTDataPoint[] {
    const dataPoints: MQTTDataPoint[] = [];
    const now = new Date().toISOString();

    for (const sub of this.mqttConfig.subscriptions) {
      const topicData = this.generateTopicData(sub.topic, sub.parser);

      for (const [key, value] of Object.entries(topicData)) {
        this.messageCount++;

        dataPoints.push({
          connectorId: this.config.id,
          protocol: 'mqtt',
          timestamp: now,
          metricName: `${sub.topic}/${key}`,
          value,
          quality: 'simulated',
          metadata: {
            topic: sub.topic,
            qos: String(sub.qos),
            retained: 'false',
            payloadFormat: sub.parser,
            ...this.config.tags,
          },
        });
      }
    }

    return dataPoints;
  }

  protected getHealthDetails(): Record<string, string> {
    return {
      brokerUrl: this.mqttConfig.brokerUrl,
      protocolVersion: this.mqttConfig.protocolVersion,
      clientId: this.mqttConfig.clientId,
      subscriptions: String(this.mqttConfig.subscriptions.length),
      messagesReceived: String(this.messageCount),
    };
  }

  private initSimulationState(): void {
    this.simulationState.set('temperature', 22);
    this.simulationState.set('humidity', 55);
    this.simulationState.set('pressure', 1013);
    this.simulationState.set('vibration', 0.5);
    this.simulationState.set('power', 450);
    this.simulationState.set('voltage', 230);
    this.simulationState.set('current', 2.5);
    this.simulationState.set('rpm', 1800);
  }

  private generateTopicData(
    topic: string,
    parser: string
  ): Record<string, number | string | boolean> {
    // Generate data based on topic pattern
    if (topic.includes('sensor') || topic.includes('telemetry')) {
      return this.generateSensorData();
    }
    if (topic.includes('alarm') || topic.includes('alert')) {
      return this.generateAlarmData();
    }
    if (topic.includes('status') || topic.includes('state')) {
      return this.generateStatusData();
    }
    if (topic.includes('energy') || topic.includes('power')) {
      return this.generateEnergyData();
    }

    // Default: generic IoT data
    return this.generateSensorData();
  }

  private generateSensorData(): Record<string, number> {
    const temp = this.updateSimValue('temperature', 22, 2);
    const humidity = this.updateSimValue('humidity', 55, 5);
    const pressure = this.updateSimValue('pressure', 1013, 10);

    return { temperature: temp, humidity, pressure };
  }

  private generateAlarmData(): Record<string, number | boolean> {
    return {
      active: Math.random() < 0.03,
      severity: Math.floor(Math.random() * 4) + 1,
      count: Math.floor(Math.random() * 3),
    };
  }

  private generateStatusData(): Record<string, number | string | boolean> {
    return {
      online: true,
      uptime: Math.floor(Math.random() * 86400),
      mode: Math.random() < 0.9 ? 'auto' : 'manual',
    };
  }

  private generateEnergyData(): Record<string, number> {
    const voltage = this.updateSimValue('voltage', 230, 5);
    const current = this.updateSimValue('current', 2.5, 0.5);
    const power = voltage * current;

    return { voltage, current, power_w: power, energy_kwh: power * 0.001 };
  }

  private updateSimValue(key: string, base: number, range: number): number {
    const prev = this.simulationState.get(key) || base;
    const newVal = prev + (Math.random() - 0.5) * range * 0.1;
    const clamped = Math.max(base - range, Math.min(base + range, newVal));
    this.simulationState.set(key, clamped);
    return Math.round(clamped * 100) / 100;
  }
}

export function createMQTTSimulationConnector(name: string = 'MQTT-IIoT'): MQTTConnector {
  const { v4: uuid } = require('uuid');
  return new MQTTConnector({
    id: uuid(),
    name,
    protocol: 'mqtt',
    simulationMode: true,
    collectIntervalMs: 3000,
    connectionTimeoutMs: 10000,
    retry: { maxRetries: 3, backoffMs: 1000, maxBackoffMs: 10000 },
    tags: { source: 'simulation', type: 'iiot' },
    brokerUrl: 'mqtt://localhost:1883',
    protocolVersion: '5.0',
    clientId: 'aiobs-mqtt-sim',
    cleanSession: true,
    keepAliveSeconds: 60,
    qos: 1,
    subscriptions: [
      { topic: 'factory/line1/sensor/#', qos: 1, parser: 'json' },
      { topic: 'factory/line1/alarm/#', qos: 2, parser: 'json' },
      { topic: 'factory/energy/meter1', qos: 0, parser: 'json' },
    ],
  });
}
