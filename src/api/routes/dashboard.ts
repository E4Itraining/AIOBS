/**
 * Dashboard API Routes
 * Provides system overview, KPIs, and aggregated data
 */

import { Router, Request, Response } from 'express';
import { DataStore } from '../services/data-store';

const router = Router();
const dataStore = DataStore.getInstance();

/**
 * GET /api/dashboard/overview
 * Returns system-wide overview including health, alerts, and key metrics
 */
router.get('/overview', (req: Request, res: Response) => {
  try {
    const overview = dataStore.getOverview();
    const services = dataStore.getServices();
    const alerts = dataStore.getAlerts({ status: 'active', limit: 5 });

    res.json({
      success: true,
      data: {
        ...overview,
        services: services.map(s => ({
          id: s.id,
          name: s.name,
          type: s.type,
          status: s.status,
          availability: s.availability,
          errorRate: s.errorRate,
          latency: s.latency,
        })),
        recentAlerts: alerts,
        lastUpdated: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overview',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/dashboard/kpis
 * Returns key performance indicators with trends
 */
router.get('/kpis', (req: Request, res: Response) => {
  try {
    const kpis = dataStore.getKPIs();

    res.json({
      success: true,
      data: kpis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch KPIs',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/dashboard/topology
 * Returns service dependency topology
 */
router.get('/topology', (req: Request, res: Response) => {
  try {
    const services = dataStore.getServices();

    // Build a simplified topology
    const nodes = services.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      status: s.status,
      metrics: {
        availability: s.availability,
        errorRate: s.errorRate,
        latency: s.latency,
      },
    }));

    // Define edges (dependencies)
    const edges = [
      { source: 'fraud-detector-v1', target: 'feature-store', type: 'data' },
      { source: 'fraud-detector-v1', target: 'inference-cluster', type: 'compute' },
      { source: 'churn-predictor-v1', target: 'feature-store', type: 'data' },
      { source: 'churn-predictor-v1', target: 'inference-cluster', type: 'compute' },
      { source: 'recommendation-v2', target: 'feature-store', type: 'data' },
      { source: 'recommendation-v2', target: 'inference-cluster', type: 'compute' },
      { source: 'sentiment-analyzer', target: 'inference-cluster', type: 'compute' },
      { source: 'anomaly-detector', target: 'data-pipeline', type: 'data' },
      { source: 'anomaly-detector', target: 'inference-cluster', type: 'compute' },
      { source: 'feature-store', target: 'data-pipeline', type: 'data' },
    ];

    res.json({
      success: true,
      data: { nodes, edges },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch topology',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/dashboard/costs
 * Returns FinOps cost breakdown
 */
router.get('/costs', (req: Request, res: Response) => {
  try {
    const services = dataStore.getServices();

    const costData = {
      totalDaily: 2340,
      totalMonthly: 70200,
      budget: 75000,
      budgetUtilization: 93.6,
      byService: services.map(s => ({
        serviceId: s.id,
        serviceName: s.name,
        daily: Math.round(50 + Math.random() * 500),
        trend: Math.random() > 0.5 ? 'up' : 'down',
        change: Math.round((Math.random() - 0.5) * 20),
      })),
      byCategory: [
        { category: 'Compute', amount: 1200, percentage: 51.3 },
        { category: 'Storage', amount: 450, percentage: 19.2 },
        { category: 'Network', amount: 320, percentage: 13.7 },
        { category: 'GPU', amount: 280, percentage: 12.0 },
        { category: 'Other', amount: 90, percentage: 3.8 },
      ],
    };

    res.json({
      success: true,
      data: costData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch costs',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/dashboard/carbon
 * Returns GreenOps carbon metrics
 */
router.get('/carbon', (req: Request, res: Response) => {
  try {
    const carbonData = {
      totalEmissions: 45.2, // kg CO2e
      greenEnergyPercentage: 68,
      pueRatio: 1.25,
      trend: 'improving',
      byService: [
        { serviceId: 'inference-cluster', name: 'Inference Cluster', emissions: 22.5, percentage: 49.8 },
        { serviceId: 'data-pipeline', name: 'Data Pipeline', emissions: 8.3, percentage: 18.4 },
        { serviceId: 'feature-store', name: 'Feature Store', emissions: 6.2, percentage: 13.7 },
        { serviceId: 'fraud-detector-v1', name: 'Fraud Detector', emissions: 4.1, percentage: 9.1 },
        { serviceId: 'others', name: 'Other Services', emissions: 4.1, percentage: 9.0 },
      ],
      recommendations: [
        { action: 'Schedule batch jobs during low-carbon hours', impact: -5.2, priority: 'high' },
        { action: 'Enable auto-scaling for inference cluster', impact: -3.8, priority: 'medium' },
        { action: 'Optimize data pipeline compression', impact: -1.5, priority: 'low' },
      ],
    };

    res.json({
      success: true,
      data: carbonData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch carbon metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/dashboard/compliance
 * Returns compliance and governance status
 */
router.get('/compliance', (req: Request, res: Response) => {
  try {
    const complianceData = {
      overallScore: 94,
      frameworks: [
        { name: 'AI Act', status: 'compliant', score: 96, lastAudit: '2024-12-01' },
        { name: 'GDPR', status: 'compliant', score: 98, lastAudit: '2024-11-15' },
        { name: 'SOC 2', status: 'compliant', score: 92, lastAudit: '2024-10-20' },
        { name: 'ISO 27001', status: 'at_risk', score: 88, lastAudit: '2024-09-30' },
      ],
      recentAudits: [
        { id: 'audit-001', type: 'Model Deployment', status: 'passed', date: '2024-12-14' },
        { id: 'audit-002', type: 'Data Access', status: 'passed', date: '2024-12-13' },
        { id: 'audit-003', type: 'Security Review', status: 'passed', date: '2024-12-12' },
      ],
      pendingActions: [
        { action: 'Update model documentation', framework: 'AI Act', dueDate: '2024-12-20', priority: 'high' },
        { action: 'Complete security training', framework: 'ISO 27001', dueDate: '2024-12-25', priority: 'medium' },
      ],
    };

    res.json({
      success: true,
      data: complianceData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compliance data',
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as dashboardRouter };
