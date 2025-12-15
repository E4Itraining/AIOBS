/**
 * Services API Routes
 * Manages AI services, models, and infrastructure
 */

import { Router, Request, Response } from 'express';
import { DataStore } from '../services/data-store';

const router = Router();
const dataStore = DataStore.getInstance();

/**
 * GET /api/services
 * List all services with optional filtering
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { type, status, page = '1', limit = '20' } = req.query;

    let services = dataStore.getServices();

    // Filter by type
    if (type && typeof type === 'string') {
      services = services.filter(s => s.type === type);
    }

    // Filter by status
    if (status && typeof status === 'string') {
      services = services.filter(s => s.status === status);
    }

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedServices = services.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        services: paginatedServices,
        pagination: {
          total: services.length,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(services.length / limitNum),
          hasNext: endIndex < services.length,
          hasPrev: pageNum > 1,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch services',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/services/:id
 * Get detailed information about a specific service
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = dataStore.getService(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Get related data
    const cognitiveMetrics = dataStore.getCognitiveMetrics(id);
    const slos = dataStore.getSLOsByService(id);
    const alerts = dataStore.getAlerts({ status: 'active' }).filter(a => a.sourceId === id);

    res.json({
      success: true,
      data: {
        ...service,
        cognitiveMetrics,
        slos,
        activeAlerts: alerts,
        dependencies: getDependencies(id),
        dependents: getDependents(id),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/services/:id/metrics
 * Get metrics history for a specific service
 */
router.get('/:id/metrics', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hours = '24', metrics: metricNames } = req.query;

    const service = dataStore.getService(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Generate mock time series data
    const hoursNum = parseInt(hours as string, 10);
    const now = Date.now();
    const hour = 60 * 60 * 1000;

    const generateSeries = (name: string, baseValue: number, variance: number) => {
      const data = [];
      for (let i = hoursNum; i >= 0; i--) {
        data.push({
          timestamp: new Date(now - i * hour).toISOString(),
          value: baseValue + (Math.random() - 0.5) * variance * 2,
        });
      }
      return { name, data };
    };

    const metricsData = [
      generateSeries('latency_p50', service.latency * 0.6, 10),
      generateSeries('latency_p95', service.latency * 0.9, 15),
      generateSeries('latency_p99', service.latency, 20),
      generateSeries('error_rate', service.errorRate * 100, 2),
      generateSeries('requests_per_second', 1500, 300),
      generateSeries('availability', service.availability, 0.5),
    ];

    res.json({
      success: true,
      data: {
        serviceId: id,
        period: { hours: hoursNum },
        metrics: metricsData,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/services/:id/health
 * Get health check details for a service
 */
router.get('/:id/health', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = dataStore.getService(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
        timestamp: new Date().toISOString(),
      });
    }

    const healthChecks = [
      { name: 'API Endpoint', status: 'passing', latency: 12, lastCheck: new Date().toISOString() },
      { name: 'Database Connection', status: 'passing', latency: 5, lastCheck: new Date().toISOString() },
      { name: 'Cache Connection', status: 'passing', latency: 2, lastCheck: new Date().toISOString() },
      { name: 'Model Loading', status: service.status === 'healthy' ? 'passing' : 'warning', latency: 150, lastCheck: new Date().toISOString() },
      { name: 'GPU Availability', status: 'passing', latency: 8, lastCheck: new Date().toISOString() },
    ];

    res.json({
      success: true,
      data: {
        serviceId: id,
        overallStatus: service.status,
        checks: healthChecks,
        uptime: {
          percentage: service.availability,
          since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch health',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/services/summary/by-type
 * Get service summary grouped by type
 */
router.get('/summary/by-type', (req: Request, res: Response) => {
  try {
    const services = dataStore.getServices();

    const byType: Record<string, { count: number; healthy: number; degraded: number; unhealthy: number }> = {};

    services.forEach(s => {
      if (!byType[s.type]) {
        byType[s.type] = { count: 0, healthy: 0, degraded: 0, unhealthy: 0 };
      }
      byType[s.type].count++;
      if (s.status === 'healthy') byType[s.type].healthy++;
      if (s.status === 'degraded') byType[s.type].degraded++;
      if (s.status === 'unhealthy') byType[s.type].unhealthy++;
    });

    res.json({
      success: true,
      data: byType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary',
      timestamp: new Date().toISOString(),
    });
  }
});

// Helper functions
function getDependencies(serviceId: string): string[] {
  const deps: Record<string, string[]> = {
    'fraud-detector-v1': ['feature-store', 'inference-cluster'],
    'churn-predictor-v1': ['feature-store', 'inference-cluster'],
    'recommendation-v2': ['feature-store', 'inference-cluster'],
    'sentiment-analyzer': ['inference-cluster'],
    'anomaly-detector': ['data-pipeline', 'inference-cluster'],
    'feature-store': ['data-pipeline'],
    'data-pipeline': [],
    'inference-cluster': [],
  };
  return deps[serviceId] || [];
}

function getDependents(serviceId: string): string[] {
  const dependents: Record<string, string[]> = {
    'feature-store': ['fraud-detector-v1', 'churn-predictor-v1', 'recommendation-v2'],
    'inference-cluster': ['fraud-detector-v1', 'churn-predictor-v1', 'recommendation-v2', 'sentiment-analyzer', 'anomaly-detector'],
    'data-pipeline': ['feature-store', 'anomaly-detector'],
  };
  return dependents[serviceId] || [];
}

export { router as servicesRouter };
