/**
 * AIOBS Real-time Service
 * WebSocket management for real-time updates
 */

import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { DataStore } from './data-store';

interface Client {
  id: string;
  ws: WebSocket;
  channels: Set<string>;
  lastPing: number;
}

interface Message {
  type: string;
  channel?: string;
  data?: any;
}

class RealtimeServiceImpl {
  private static instance: RealtimeServiceImpl;
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();
  private dataStore = DataStore.getInstance();
  private broadcastInterval: NodeJS.Timeout | null = null;

  private constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.startBroadcasting();
  }

  static getInstance(wss?: WebSocketServer): RealtimeServiceImpl {
    if (!RealtimeServiceImpl.instance) {
      if (!wss) {
        throw new Error('WebSocketServer must be provided on first initialization');
      }
      RealtimeServiceImpl.instance = new RealtimeServiceImpl(wss);
    }
    return RealtimeServiceImpl.instance;
  }

  handleMessage(ws: WebSocket, message: Message): void {
    const client = this.getClientByWs(ws);

    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(ws, message.channel || 'all');
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(ws, message.channel || 'all');
        break;
      case 'ping':
        this.handlePing(ws);
        break;
      case 'get_metrics':
        this.sendMetrics(ws, message.data?.modelId);
        break;
      case 'get_alerts':
        this.sendAlerts(ws);
        break;
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: `Unknown message type: ${message.type}`,
        }));
    }
  }

  private getClientByWs(ws: WebSocket): Client | undefined {
    for (const client of this.clients.values()) {
      if (client.ws === ws) return client;
    }
    return undefined;
  }

  private handleSubscribe(ws: WebSocket, channel: string): void {
    let client = this.getClientByWs(ws);

    if (!client) {
      const id = uuidv4();
      client = { id, ws, channels: new Set(), lastPing: Date.now() };
      this.clients.set(id, client);
    }

    client.channels.add(channel);

    ws.send(JSON.stringify({
      type: 'subscribed',
      channel,
      timestamp: new Date().toISOString(),
    }));

    // Send initial data for the channel
    this.sendInitialData(ws, channel);
  }

  private handleUnsubscribe(ws: WebSocket, channel: string): void {
    const client = this.getClientByWs(ws);
    if (client) {
      client.channels.delete(channel);
      ws.send(JSON.stringify({
        type: 'unsubscribed',
        channel,
        timestamp: new Date().toISOString(),
      }));
    }
  }

  private handlePing(ws: WebSocket): void {
    const client = this.getClientByWs(ws);
    if (client) {
      client.lastPing = Date.now();
    }
    ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
  }

  private sendInitialData(ws: WebSocket, channel: string): void {
    const now = new Date().toISOString();

    switch (channel) {
      case 'metrics':
      case 'cognitive':
        ws.send(JSON.stringify({
          type: 'initial_data',
          channel,
          data: {
            metrics: this.dataStore.getAllCognitiveMetrics(),
            overview: this.dataStore.getOverview(),
          },
          timestamp: now,
        }));
        break;

      case 'alerts':
        ws.send(JSON.stringify({
          type: 'initial_data',
          channel,
          data: { alerts: this.dataStore.getAlerts({ status: 'active' }) },
          timestamp: now,
        }));
        break;

      case 'services':
        ws.send(JSON.stringify({
          type: 'initial_data',
          channel,
          data: { services: this.dataStore.getServices() },
          timestamp: now,
        }));
        break;

      case 'slo':
        ws.send(JSON.stringify({
          type: 'initial_data',
          channel,
          data: { slos: this.dataStore.getSLOs() },
          timestamp: now,
        }));
        break;

      case 'all':
        ws.send(JSON.stringify({
          type: 'initial_data',
          channel,
          data: {
            overview: this.dataStore.getOverview(),
            kpis: this.dataStore.getKPIs(),
            services: this.dataStore.getServices(),
            alerts: this.dataStore.getAlerts({ status: 'active', limit: 10 }),
            metrics: this.dataStore.getAllCognitiveMetrics(),
            slos: this.dataStore.getSLOs(),
          },
          timestamp: now,
        }));
        break;
    }
  }

  private sendMetrics(ws: WebSocket, modelId?: string): void {
    if (modelId) {
      const metrics = this.dataStore.getCognitiveMetrics(modelId);
      ws.send(JSON.stringify({
        type: 'metrics',
        data: metrics,
        timestamp: new Date().toISOString(),
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'metrics',
        data: this.dataStore.getAllCognitiveMetrics(),
        timestamp: new Date().toISOString(),
      }));
    }
  }

  private sendAlerts(ws: WebSocket): void {
    ws.send(JSON.stringify({
      type: 'alerts',
      data: this.dataStore.getAlerts({ status: 'active' }),
      timestamp: new Date().toISOString(),
    }));
  }

  removeClient(ws: WebSocket): void {
    const client = this.getClientByWs(ws);
    if (client) {
      this.clients.delete(client.id);
    }
  }

  private startBroadcasting(): void {
    // Broadcast updates every 5 seconds
    this.broadcastInterval = setInterval(() => {
      this.broadcastUpdates();
    }, 5000);

    // Simulate occasional alerts
    setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance every 30 seconds
        this.broadcastNewAlert();
      }
    }, 30000);
  }

  private broadcastUpdates(): void {
    const now = new Date().toISOString();
    const overview = this.dataStore.getOverview();
    const kpis = this.dataStore.getKPIs();

    this.clients.forEach(client => {
      if (client.ws.readyState !== WebSocket.OPEN) return;

      // Send to 'all' or 'metrics' subscribers
      if (client.channels.has('all') || client.channels.has('metrics')) {
        client.ws.send(JSON.stringify({
          type: 'metric_update',
          channel: 'metrics',
          data: {
            overview,
            kpis,
            timestamp: now,
          },
          timestamp: now,
        }));
      }

      // Send cognitive updates
      if (client.channels.has('all') || client.channels.has('cognitive')) {
        const randomModel = ['fraud-detector-v1', 'recommendation-v2'][Math.floor(Math.random() * 2)];
        const metrics = this.dataStore.getCognitiveMetrics(randomModel);
        if (metrics) {
          client.ws.send(JSON.stringify({
            type: 'cognitive_update',
            channel: 'cognitive',
            data: { modelId: randomModel, metrics },
            timestamp: now,
          }));
        }
      }
    });
  }

  private broadcastNewAlert(): void {
    const alertTypes = [
      {
        severity: 'warning' as const,
        title: 'Drift threshold approaching',
        description: 'Model drift score is approaching the warning threshold',
        source: 'cognitive-engine',
      },
      {
        severity: 'info' as const,
        title: 'Performance optimization available',
        description: 'New model version available with 5% latency improvement',
        source: 'optimizer',
      },
      {
        severity: 'warning' as const,
        title: 'Error rate increase detected',
        description: 'Error rate has increased by 15% in the last 10 minutes',
        source: 'slo-monitor',
      },
    ];

    const alertTemplate = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const services = this.dataStore.getServices();
    const randomService = services[Math.floor(Math.random() * services.length)];

    const newAlert = this.dataStore.createAlert({
      ...alertTemplate,
      sourceId: randomService.id,
      timestamp: new Date().toISOString(),
      status: 'active',
    });

    const now = new Date().toISOString();

    this.clients.forEach(client => {
      if (client.ws.readyState !== WebSocket.OPEN) return;

      if (client.channels.has('all') || client.channels.has('alerts')) {
        client.ws.send(JSON.stringify({
          type: 'new_alert',
          channel: 'alerts',
          data: newAlert,
          timestamp: now,
        }));
      }
    });
  }

  broadcast(channel: string, type: string, data: any): void {
    const now = new Date().toISOString();

    this.clients.forEach(client => {
      if (client.ws.readyState !== WebSocket.OPEN) return;

      if (client.channels.has('all') || client.channels.has(channel)) {
        client.ws.send(JSON.stringify({ type, channel, data, timestamp: now }));
      }
    });
  }

  getStats(): { clients: number; channels: Record<string, number> } {
    const channels: Record<string, number> = {};

    this.clients.forEach(client => {
      client.channels.forEach(channel => {
        channels[channel] = (channels[channel] || 0) + 1;
      });
    });

    return { clients: this.clients.size, channels };
  }
}

export const RealtimeService = RealtimeServiceImpl;
