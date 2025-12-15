/**
 * Metrics API Routes
 * Time series metrics and analytics
 */

import { Router, Request, Response } from 'express';
import { DataStore } from '../services/data-store';

const router = Router();
const dataStore = DataStore.getInstance();

/**
 * GET /api/metrics/timeseries
 * Query time series data
 */
router.get('/timeseries', (req: Request, res: Response) => {
  try {
    const {
      metric,
      service,
      hours = '24',
      granularity = 'hour',
    } = req.query;

    const hoursNum = parseInt(hours as string, 10);
    const now = Date.now();

    // Determine interval based on granularity
    const intervals: Record<string, number> = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
    };
    const interval = intervals[granularity as string] || intervals.hour;

    // Generate time series
    const points = Math.min(Math.floor((hoursNum * 60 * 60 * 1000) / interval), 1000);
    const series: { timestamp: string; value: number }[] = [];

    const baseValues: Record<string, { base: number; variance: number }> = {
      latency: { base: 50, variance: 20 },
      error_rate: { base: 0.1, variance: 0.05 },
      throughput: { base: 1500, variance: 500 },
      trust_score: { base: 0.85, variance: 0.1 },
      drift_score: { base: 0.15, variance: 0.1 },
      availability: { base: 99.9, variance: 0.3 },
    };

    const config = baseValues[metric as string] || { base: 50, variance: 10 };

    for (let i = points; i >= 0; i--) {
      series.push({
        timestamp: new Date(now - i * interval).toISOString(),
        value: Math.max(0, config.base + (Math.random() - 0.5) * config.variance * 2),
      });
    }

    res.json({
      success: true,
      data: {
        metric: metric || 'latency',
        service: service || 'all',
        granularity,
        period: { hours: hoursNum },
        series,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch time series',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/metrics/correlation
 * Get correlation matrix between metrics
 */
router.get('/correlation', (req: Request, res: Response) => {
  try {
    const metrics = ['trust_score', 'latency', 'error_rate', 'drift_score', 'throughput'];

    // Generate a correlation matrix
    const matrix: Record<string, Record<string, number>> = {};

    metrics.forEach(m1 => {
      matrix[m1] = {};
      metrics.forEach(m2 => {
        if (m1 === m2) {
          matrix[m1][m2] = 1.0;
        } else if (
          (m1 === 'trust_score' && m2 === 'drift_score') ||
          (m1 === 'drift_score' && m2 === 'trust_score')
        ) {
          matrix[m1][m2] = -0.78;
        } else if (
          (m1 === 'error_rate' && m2 === 'trust_score') ||
          (m1 === 'trust_score' && m2 === 'error_rate')
        ) {
          matrix[m1][m2] = -0.65;
        } else if (
          (m1 === 'latency' && m2 === 'throughput') ||
          (m1 === 'throughput' && m2 === 'latency')
        ) {
          matrix[m1][m2] = -0.42;
        } else {
          matrix[m1][m2] = Math.round((Math.random() - 0.5) * 60) / 100;
        }
      });
    });

    res.json({
      success: true,
      data: {
        metrics,
        matrix,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to compute correlation',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/metrics/anomalies
 * Get detected anomalies
 */
router.get('/anomalies', (req: Request, res: Response) => {
  try {
    const { hours = '24', severity } = req.query;

    const anomalies = [
      {
        id: 'anomaly-001',
        metric: 'latency',
        service: 'recommendation-v2',
        severity: 'warning',
        value: 145,
        expected: 85,
        deviation: 70.6,
        timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        status: 'active',
      },
      {
        id: 'anomaly-002',
        metric: 'drift_score',
        service: 'fraud-detector-v1',
        severity: 'warning',
        value: 0.28,
        expected: 0.12,
        deviation: 133.3,
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        status: 'active',
      },
      {
        id: 'anomaly-003',
        metric: 'error_rate',
        service: 'fraud-detector-v1',
        severity: 'info',
        value: 0.15,
        expected: 0.08,
        deviation: 87.5,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'resolved',
      },
      {
        id: 'anomaly-004',
        metric: 'throughput',
        service: 'feature-store',
        severity: 'info',
        value: 2100,
        expected: 1500,
        deviation: 40,
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        status: 'resolved',
      },
    ];

    let filtered = anomalies;
    if (severity && typeof severity === 'string') {
      filtered = anomalies.filter(a => a.severity === severity);
    }

    res.json({
      success: true,
      data: {
        anomalies: filtered,
        summary: {
          total: anomalies.length,
          active: anomalies.filter(a => a.status === 'active').length,
          bySeverity: {
            critical: anomalies.filter(a => a.severity === 'critical').length,
            warning: anomalies.filter(a => a.severity === 'warning').length,
            info: anomalies.filter(a => a.severity === 'info').length,
          },
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch anomalies',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/metrics/aggregations
 * Get aggregated metrics
 */
router.get('/aggregations', (req: Request, res: Response) => {
  try {
    const { metric, service, hours = '24', aggregation = 'avg' } = req.query;

    const services = dataStore.getServices();

    const aggregations = services.map(s => ({
      serviceId: s.id,
      serviceName: s.name,
      metrics: {
        latency: {
          avg: s.latency,
          min: s.latency * 0.6,
          max: s.latency * 1.4,
          p50: s.latency * 0.8,
          p95: s.latency * 1.1,
          p99: s.latency * 1.2,
        },
        errorRate: {
          avg: s.errorRate,
          min: s.errorRate * 0.5,
          max: s.errorRate * 1.5,
        },
        availability: {
          avg: s.availability,
          min: s.availability - 0.1,
          max: s.availability,
        },
      },
    }));

    res.json({
      success: true,
      data: {
        period: { hours: parseInt(hours as string, 10) },
        aggregations,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to compute aggregations',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/metrics/query
 * Execute a custom metrics query (PromQL-like)
 */
router.post('/query', (req: Request, res: Response) => {
  try {
    const { query, start, end, step } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required',
        timestamp: new Date().toISOString(),
      });
    }

    // Parse simple query format: metric{labels}
    const match = query.match(/^(\w+)(?:\{([^}]*)\})?$/);
    if (!match) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query format',
        timestamp: new Date().toISOString(),
      });
    }

    const metricName = match[1];
    const labelsStr = match[2];

    // Generate mock result
    const now = Date.now();
    const startTime = start ? new Date(start).getTime() : now - 24 * 60 * 60 * 1000;
    const endTime = end ? new Date(end).getTime() : now;
    const stepMs = (step || 300) * 1000;

    const values: [number, string][] = [];
    for (let t = startTime; t <= endTime; t += stepMs) {
      values.push([t / 1000, (50 + Math.random() * 20).toFixed(2)]);
    }

    res.json({
      success: true,
      data: {
        resultType: 'matrix',
        result: [
          {
            metric: {
              __name__: metricName,
              ...(labelsStr ? Object.fromEntries(labelsStr.split(',').map((l: string) => l.split('='))) : {}),
            },
            values,
          },
        ],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to execute query',
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as metricsRouter };
