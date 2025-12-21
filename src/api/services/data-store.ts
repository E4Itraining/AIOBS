/**
 * AIOBS Data Store Service
 * Manages in-memory data and provides a unified interface for all services
 * Now with file-based persistence to preserve changes across restarts
 */

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';

// Path to the persistence file
const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'datastore.json');

export interface Service {
  id: string;
  name: string;
  type: 'model' | 'pipeline' | 'infrastructure' | 'application';
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  availability: number;
  errorRate: number;
  latency: number;
  lastUpdated: string;
  metadata?: Record<string, any>;
}

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  source: string;
  sourceId: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  metadata?: Record<string, any>;
}

export interface CognitiveMetrics {
  modelId: string;
  trustScore: number;
  drift: {
    dataDrift: number;
    conceptDrift: number;
    predictionDrift: number;
    overall: number;
  };
  reliability: {
    calibration: number;
    stability: number;
    uncertainty: number;
    overall: number;
  };
  hallucination: {
    factuality: number;
    grounding: number;
    risk: number;
  };
  degradation: {
    performanceDecline: number;
    trend: 'stable' | 'declining' | 'improving';
  };
  timestamp: string;
}

export interface SLO {
  id: string;
  name: string;
  serviceId: string;
  target: number;
  current: number;
  status: 'met' | 'at_risk' | 'breached';
  errorBudget: {
    total: number;
    consumed: number;
    remaining: number;
  };
  period: string;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface MetricSeries {
  name: string;
  labels: Record<string, string>;
  data: TimeSeriesPoint[];
}

interface PersistedData {
  services: Array<[string, Service]>;
  alerts: Array<[string, Alert]>;
  cognitiveMetrics: Array<[string, CognitiveMetrics]>;
  slos: Array<[string, SLO]>;
  lastSaved: string;
}

class DataStoreImpl {
  private static instance: DataStoreImpl;
  private services: Map<string, Service> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private cognitiveMetrics: Map<string, CognitiveMetrics> = new Map();
  private slos: Map<string, SLO> = new Map();
  private metricsSeries: Map<string, MetricSeries> = new Map();
  private initialized = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): DataStoreImpl {
    if (!DataStoreImpl.instance) {
      DataStoreImpl.instance = new DataStoreImpl();
    }
    return DataStoreImpl.instance;
  }

  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Save data to file for persistence
   */
  private saveToFile(): void {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(DATA_FILE_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const data: PersistedData = {
        services: Array.from(this.services.entries()),
        alerts: Array.from(this.alerts.entries()),
        cognitiveMetrics: Array.from(this.cognitiveMetrics.entries()),
        slos: Array.from(this.slos.entries()),
        lastSaved: new Date().toISOString(),
      };

      fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
      logger.debug('Data saved to file successfully');
    } catch (error) {
      logger.error('Failed to save data to file:', { error: String(error) });
    }
  }

  /**
   * Debounced save to avoid too many writes
   */
  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveToFile();
      this.saveTimeout = null;
    }, 500); // Save after 500ms of no changes
  }

  /**
   * Load data from file if it exists
   */
  private loadFromFile(): boolean {
    try {
      if (fs.existsSync(DATA_FILE_PATH)) {
        const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        const data: PersistedData = JSON.parse(fileContent);

        this.services = new Map(data.services);
        this.alerts = new Map(data.alerts);
        this.cognitiveMetrics = new Map(data.cognitiveMetrics);
        this.slos = new Map(data.slos);

        logger.info(`Data loaded from file (last saved: ${data.lastSaved})`);
        return true;
      }
    } catch (error) {
      logger.error('Failed to load data from file:', { error: String(error) });
    }
    return false;
  }

  initialize(): void {
    if (this.initialized) return;

    logger.info('Initializing AIOBS Data Store...');

    // Try to load existing data first
    const dataLoaded = this.loadFromFile();

    if (!dataLoaded) {
      // No existing data, seed with demo data
      logger.info('No existing data found, seeding with demo data...');
      this.seedServices();
      this.seedAlerts();
      this.seedCognitiveMetrics();
      this.seedSLOs();
      this.saveToFile(); // Save initial data
      logger.info('Data Store initialized with demo data');
    } else {
      logger.info('Data Store initialized with persisted data');
    }

    this.seedMetricsSeries(); // Always regenerate time series
    this.initialized = true;

    // Start real-time data simulation
    this.startSimulation();
  }

  private seedServices(): void {
    const services: Service[] = [
      {
        id: 'fraud-detector-v1',
        name: 'Fraud Detector',
        type: 'model',
        status: 'degraded',
        availability: 99.95,
        errorRate: 0.12,
        latency: 45,
        lastUpdated: new Date().toISOString(),
        metadata: { version: 'v1.2.3', environment: 'production', region: 'eu-west-1' },
      },
      {
        id: 'churn-predictor-v1',
        name: 'Churn Predictor',
        type: 'model',
        status: 'healthy',
        availability: 99.99,
        errorRate: 0.05,
        latency: 30,
        lastUpdated: new Date().toISOString(),
        metadata: { version: 'v2.1.0', environment: 'production', region: 'eu-west-1' },
      },
      {
        id: 'recommendation-v2',
        name: 'Recommendation Engine',
        type: 'model',
        status: 'degraded',
        availability: 99.85,
        errorRate: 0.08,
        latency: 120,
        lastUpdated: new Date().toISOString(),
        metadata: { version: 'v2.0.1', environment: 'production', region: 'us-east-1' },
      },
      {
        id: 'feature-store',
        name: 'Feature Store',
        type: 'pipeline',
        status: 'healthy',
        availability: 99.99,
        errorRate: 0.01,
        latency: 15,
        lastUpdated: new Date().toISOString(),
        metadata: { version: 'v3.0.0', environment: 'production' },
      },
      {
        id: 'inference-cluster',
        name: 'Inference Cluster',
        type: 'infrastructure',
        status: 'healthy',
        availability: 99.95,
        errorRate: 0.02,
        latency: 5,
        lastUpdated: new Date().toISOString(),
        metadata: { nodes: 12, gpu: 'A100', region: 'eu-west-1' },
      },
      {
        id: 'data-pipeline',
        name: 'Data Pipeline',
        type: 'pipeline',
        status: 'healthy',
        availability: 99.98,
        errorRate: 0.03,
        latency: 250,
        lastUpdated: new Date().toISOString(),
        metadata: { throughput: '1.2M events/sec' },
      },
      {
        id: 'sentiment-analyzer',
        name: 'Sentiment Analyzer',
        type: 'model',
        status: 'healthy',
        availability: 99.97,
        errorRate: 0.04,
        latency: 25,
        lastUpdated: new Date().toISOString(),
        metadata: { version: 'v1.5.0', languages: ['en', 'fr', 'de', 'es'] },
      },
      {
        id: 'anomaly-detector',
        name: 'Anomaly Detector',
        type: 'model',
        status: 'healthy',
        availability: 99.96,
        errorRate: 0.06,
        latency: 35,
        lastUpdated: new Date().toISOString(),
        metadata: { version: 'v2.3.1', domains: ['fraud', 'security', 'ops'] },
      },
    ];

    services.forEach(s => this.services.set(s.id, s));
  }

  private seedAlerts(): void {
    const alerts: Alert[] = [
      {
        id: uuidv4(),
        severity: 'warning',
        title: 'Fraud model drift detected',
        description: 'Data drift score has exceeded threshold (0.25 > 0.20). Model predictions may be affected.',
        source: 'cognitive-engine',
        sourceId: 'fraud-detector-v1',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        status: 'active',
        metadata: { driftScore: 0.25, threshold: 0.20, affectedFeatures: ['transaction_amount', 'merchant_category'] },
      },
      {
        id: uuidv4(),
        severity: 'warning',
        title: 'Increased latency on recommendation service',
        description: 'P99 latency has increased by 40% in the last 30 minutes.',
        source: 'slo-monitor',
        sourceId: 'recommendation-v2',
        timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        status: 'active',
        metadata: { currentLatency: 120, baselineLatency: 85, percentileIncrease: 40 },
      },
      {
        id: uuidv4(),
        severity: 'info',
        title: 'Model retraining scheduled',
        description: 'Churn predictor model scheduled for retraining based on drift analysis.',
        source: 'automation',
        sourceId: 'churn-predictor-v1',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'acknowledged',
        metadata: { scheduledTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() },
      },
      {
        id: uuidv4(),
        severity: 'critical',
        title: 'Error budget exhausted',
        description: 'Recommendation service has exhausted 95% of its monthly error budget.',
        source: 'slo-monitor',
        sourceId: 'recommendation-v2',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        status: 'active',
        metadata: { errorBudgetRemaining: 5, period: 'monthly' },
      },
    ];

    alerts.forEach(a => this.alerts.set(a.id, a));
  }

  private seedCognitiveMetrics(): void {
    const modelIds = ['fraud-detector-v1', 'churn-predictor-v1', 'recommendation-v2', 'sentiment-analyzer', 'anomaly-detector'];

    modelIds.forEach(modelId => {
      const isDegraded = modelId === 'fraud-detector-v1' || modelId === 'recommendation-v2';

      this.cognitiveMetrics.set(modelId, {
        modelId,
        trustScore: isDegraded ? 0.72 + Math.random() * 0.1 : 0.88 + Math.random() * 0.1,
        drift: {
          dataDrift: isDegraded ? 0.18 + Math.random() * 0.15 : 0.05 + Math.random() * 0.08,
          conceptDrift: isDegraded ? 0.12 + Math.random() * 0.1 : 0.03 + Math.random() * 0.05,
          predictionDrift: isDegraded ? 0.15 + Math.random() * 0.12 : 0.04 + Math.random() * 0.06,
          overall: isDegraded ? 0.25 : 0.08,
        },
        reliability: {
          calibration: isDegraded ? 0.78 + Math.random() * 0.1 : 0.92 + Math.random() * 0.06,
          stability: isDegraded ? 0.82 + Math.random() * 0.08 : 0.95 + Math.random() * 0.04,
          uncertainty: isDegraded ? 0.75 + Math.random() * 0.1 : 0.90 + Math.random() * 0.08,
          overall: isDegraded ? 0.78 : 0.92,
        },
        hallucination: {
          factuality: 0.95 + Math.random() * 0.04,
          grounding: 0.92 + Math.random() * 0.06,
          risk: isDegraded ? 0.15 : 0.05,
        },
        degradation: {
          performanceDecline: isDegraded ? 0.12 : 0.02,
          trend: isDegraded ? 'declining' : 'stable',
        },
        timestamp: new Date().toISOString(),
      });
    });
  }

  private seedSLOs(): void {
    const slos: SLO[] = [
      {
        id: uuidv4(),
        name: 'Fraud Detection Availability',
        serviceId: 'fraud-detector-v1',
        target: 99.9,
        current: 99.95,
        status: 'met',
        errorBudget: { total: 43.2, consumed: 21.6, remaining: 21.6 },
        period: 'monthly',
      },
      {
        id: uuidv4(),
        name: 'Fraud Detection Latency P99',
        serviceId: 'fraud-detector-v1',
        target: 50,
        current: 45,
        status: 'met',
        errorBudget: { total: 100, consumed: 10, remaining: 90 },
        period: 'monthly',
      },
      {
        id: uuidv4(),
        name: 'Recommendation Latency P99',
        serviceId: 'recommendation-v2',
        target: 100,
        current: 120,
        status: 'breached',
        errorBudget: { total: 100, consumed: 95, remaining: 5 },
        period: 'monthly',
      },
      {
        id: uuidv4(),
        name: 'Churn Predictor Accuracy',
        serviceId: 'churn-predictor-v1',
        target: 85,
        current: 89,
        status: 'met',
        errorBudget: { total: 100, consumed: 15, remaining: 85 },
        period: 'monthly',
      },
      {
        id: uuidv4(),
        name: 'Feature Store Freshness',
        serviceId: 'feature-store',
        target: 99.5,
        current: 99.8,
        status: 'met',
        errorBudget: { total: 100, consumed: 8, remaining: 92 },
        period: 'monthly',
      },
      {
        id: uuidv4(),
        name: 'Inference Cluster GPU Utilization',
        serviceId: 'inference-cluster',
        target: 80,
        current: 72,
        status: 'at_risk',
        errorBudget: { total: 100, consumed: 40, remaining: 60 },
        period: 'monthly',
      },
    ];

    slos.forEach(s => this.slos.set(s.id, s));
  }

  private seedMetricsSeries(): void {
    const now = Date.now();
    const hour = 60 * 60 * 1000;

    // Generate time series data for various metrics
    const metrics: Array<{ name: string; labels: Record<string, string>; baseValue: number; variance: number }> = [
      { name: 'trust_score', labels: { model: 'fraud-detector-v1' }, baseValue: 0.75, variance: 0.05 },
      { name: 'trust_score', labels: { model: 'churn-predictor-v1' }, baseValue: 0.92, variance: 0.02 },
      { name: 'trust_score', labels: { model: 'recommendation-v2' }, baseValue: 0.78, variance: 0.04 },
      { name: 'latency_p99', labels: { service: 'fraud-detector-v1' }, baseValue: 45, variance: 10 },
      { name: 'latency_p99', labels: { service: 'recommendation-v2' }, baseValue: 120, variance: 30 },
      { name: 'error_rate', labels: { service: 'fraud-detector-v1' }, baseValue: 0.12, variance: 0.05 },
      { name: 'drift_score', labels: { model: 'fraud-detector-v1' }, baseValue: 0.25, variance: 0.08 },
      { name: 'requests_per_second', labels: { service: 'fraud-detector-v1' }, baseValue: 1500, variance: 300 },
    ];

    metrics.forEach(metric => {
      const key = `${metric.name}:${JSON.stringify(metric.labels)}`;
      const data: TimeSeriesPoint[] = [];

      for (let i = 24; i >= 0; i--) {
        data.push({
          timestamp: new Date(now - i * hour).toISOString(),
          value: metric.baseValue + (Math.random() - 0.5) * metric.variance * 2,
        });
      }

      this.metricsSeries.set(key, {
        name: metric.name,
        labels: metric.labels,
        data,
      });
    });
  }

  private startSimulation(): void {
    // Update metrics every 10 seconds
    setInterval(() => {
      this.updateLiveMetrics();
    }, 10000);
  }

  private updateLiveMetrics(): void {
    const now = new Date().toISOString();

    // Update service metrics slightly
    this.services.forEach((service, id) => {
      service.latency = Math.max(1, service.latency + (Math.random() - 0.5) * 5);
      service.errorRate = Math.max(0, Math.min(1, service.errorRate + (Math.random() - 0.5) * 0.01));
      service.lastUpdated = now;
      this.services.set(id, service);
    });

    // Update cognitive metrics
    this.cognitiveMetrics.forEach((metrics, id) => {
      metrics.trustScore = Math.max(0, Math.min(1, metrics.trustScore + (Math.random() - 0.5) * 0.01));
      metrics.drift.dataDrift = Math.max(0, Math.min(1, metrics.drift.dataDrift + (Math.random() - 0.5) * 0.005));
      metrics.timestamp = now;
      this.cognitiveMetrics.set(id, metrics);
    });
  }

  // Service methods
  getServices(): Service[] {
    return Array.from(this.services.values());
  }

  getService(id: string): Service | undefined {
    return this.services.get(id);
  }

  getServicesByType(type: string): Service[] {
    return Array.from(this.services.values()).filter(s => s.type === type);
  }

  getServicesByStatus(status: string): Service[] {
    return Array.from(this.services.values()).filter(s => s.status === status);
  }

  // Alert methods
  getAlerts(options?: { severity?: string; status?: string; limit?: number }): Alert[] {
    let alerts = Array.from(this.alerts.values());

    if (options?.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }
    if (options?.status) {
      alerts = alerts.filter(a => a.status === options.status);
    }

    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (options?.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  getAlert(id: string): Alert | undefined {
    return this.alerts.get(id);
  }

  createAlert(alert: Omit<Alert, 'id'>): Alert {
    const newAlert: Alert = { ...alert, id: uuidv4() };
    this.alerts.set(newAlert.id, newAlert);
    this.scheduleSave(); // Persist changes
    return newAlert;
  }

  updateAlertStatus(id: string, status: Alert['status']): Alert | undefined {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.status = status;
      this.alerts.set(id, alert);
      this.scheduleSave(); // Persist changes
    }
    return alert;
  }

  /**
   * Create a new SLO
   */
  createSLO(slo: Omit<SLO, 'id'>): SLO {
    const newSLO: SLO = { ...slo, id: uuidv4() };
    this.slos.set(newSLO.id, newSLO);
    this.scheduleSave(); // Persist changes
    return newSLO;
  }

  /**
   * Update an existing SLO
   */
  updateSLO(id: string, updates: Partial<Omit<SLO, 'id'>>): SLO | undefined {
    const slo = this.slos.get(id);
    if (slo) {
      Object.assign(slo, updates);
      this.slos.set(id, slo);
      this.scheduleSave(); // Persist changes
    }
    return slo;
  }

  /**
   * Delete an SLO
   */
  deleteSLO(id: string): boolean {
    const deleted = this.slos.delete(id);
    if (deleted) {
      this.scheduleSave(); // Persist changes
    }
    return deleted;
  }

  /**
   * Update a service
   */
  updateService(id: string, updates: Partial<Omit<Service, 'id'>>): Service | undefined {
    const service = this.services.get(id);
    if (service) {
      Object.assign(service, updates, { lastUpdated: new Date().toISOString() });
      this.services.set(id, service);
      this.scheduleSave(); // Persist changes
    }
    return service;
  }

  /**
   * Update cognitive metrics for a model
   */
  updateCognitiveMetrics(modelId: string, updates: Partial<Omit<CognitiveMetrics, 'modelId'>>): CognitiveMetrics | undefined {
    const metrics = this.cognitiveMetrics.get(modelId);
    if (metrics) {
      Object.assign(metrics, updates, { timestamp: new Date().toISOString() });
      this.cognitiveMetrics.set(modelId, metrics);
      this.scheduleSave(); // Persist changes
    }
    return metrics;
  }

  /**
   * Delete an alert
   */
  deleteAlert(id: string): boolean {
    const deleted = this.alerts.delete(id);
    if (deleted) {
      this.scheduleSave(); // Persist changes
    }
    return deleted;
  }

  /**
   * Force save data immediately (for shutdown scenarios)
   */
  forceSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.saveToFile();
  }

  // Cognitive metrics methods
  getCognitiveMetrics(modelId: string): CognitiveMetrics | undefined {
    return this.cognitiveMetrics.get(modelId);
  }

  getAllCognitiveMetrics(): CognitiveMetrics[] {
    return Array.from(this.cognitiveMetrics.values());
  }

  // SLO methods
  getSLOs(): SLO[] {
    return Array.from(this.slos.values());
  }

  getSLO(id: string): SLO | undefined {
    return this.slos.get(id);
  }

  getSLOsByService(serviceId: string): SLO[] {
    return Array.from(this.slos.values()).filter(s => s.serviceId === serviceId);
  }

  getSLOsByStatus(status: string): SLO[] {
    return Array.from(this.slos.values()).filter(s => s.status === status);
  }

  // Metrics series methods
  getMetricSeries(name: string, labels?: Record<string, string>): MetricSeries[] {
    return Array.from(this.metricsSeries.values()).filter(series => {
      if (series.name !== name) return false;
      if (labels) {
        return Object.entries(labels).every(([k, v]) => series.labels[k] === v);
      }
      return true;
    });
  }

  // Dashboard aggregations
  getOverview(): {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
    activeAlerts: number;
    criticalAlerts: number;
    avgTrustScore: number;
    sloCompliance: number;
  } {
    const services = this.getServices();
    const alerts = this.getAlerts({ status: 'active' });
    const metrics = this.getAllCognitiveMetrics();
    const slos = this.getSLOs();

    const trustScores = metrics.map(m => m.trustScore);
    const avgTrustScore = trustScores.length > 0
      ? trustScores.reduce((a, b) => a + b, 0) / trustScores.length
      : 0;

    const metSLOs = slos.filter(s => s.status === 'met').length;
    const sloCompliance = slos.length > 0 ? (metSLOs / slos.length) * 100 : 100;

    return {
      totalServices: services.length,
      healthyServices: services.filter(s => s.status === 'healthy').length,
      degradedServices: services.filter(s => s.status === 'degraded').length,
      unhealthyServices: services.filter(s => s.status === 'unhealthy').length,
      activeAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      avgTrustScore: Math.round(avgTrustScore * 100) / 100,
      sloCompliance: Math.round(sloCompliance * 10) / 10,
    };
  }

  getKPIs(): {
    trustScore: { value: number; trend: string; change: number };
    availability: { value: number; trend: string; change: number };
    errorRate: { value: number; trend: string; change: number };
    latency: { value: number; trend: string; change: number };
    throughput: { value: number; trend: string; change: number };
    cost: { value: number; trend: string; change: number };
    carbon: { value: number; trend: string; change: number };
  } {
    const services = this.getServices();
    const metrics = this.getAllCognitiveMetrics();

    const avgAvailability = services.reduce((sum, s) => sum + s.availability, 0) / services.length;
    const avgErrorRate = services.reduce((sum, s) => sum + s.errorRate, 0) / services.length;
    const avgLatency = services.reduce((sum, s) => sum + s.latency, 0) / services.length;
    const avgTrust = metrics.reduce((sum, m) => sum + m.trustScore, 0) / metrics.length;

    return {
      trustScore: { value: Math.round(avgTrust * 100) / 100, trend: 'stable', change: -0.02 },
      availability: { value: Math.round(avgAvailability * 100) / 100, trend: 'up', change: 0.05 },
      errorRate: { value: Math.round(avgErrorRate * 1000) / 1000, trend: 'down', change: -0.02 },
      latency: { value: Math.round(avgLatency), trend: 'up', change: 5 },
      throughput: { value: 12500, trend: 'up', change: 800 },
      cost: { value: 2340, trend: 'stable', change: 12 },
      carbon: { value: 45.2, trend: 'down', change: -2.3 },
    };
  }
}

export const DataStore = DataStoreImpl;
