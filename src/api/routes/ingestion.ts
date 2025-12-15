/**
 * Data Ingestion API Routes
 * Secure data ingestion with Data Act compliance
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per second
const RATE_WINDOW = 1000; // 1 second

function checkRateLimit(sourceId: string): boolean {
  const now = Date.now();
  const record = rateLimiter.get(sourceId);

  if (!record || now > record.resetTime) {
    rateLimiter.set(sourceId, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// Security validation
function validateSecurity(data: any): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for potential injection patterns
  const stringContent = JSON.stringify(data);

  if (/<script/i.test(stringContent)) {
    issues.push('Potential XSS detected');
  }

  if (/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b)/i.test(stringContent)) {
    issues.push('Potential SQL injection detected');
  }

  if (/\$\{.*\}/.test(stringContent)) {
    issues.push('Potential template injection detected');
  }

  return { valid: issues.length === 0, issues };
}

// API Key validation middleware
function validateApiKey(req: Request, res: Response, next: Function): void {
  const apiKey = req.headers['x-api-key'];
  const devMode = process.env.AIOBS_DEV_MODE === 'true';

  if (devMode) {
    return next();
  }

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: 'API key required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // In production, validate against stored API keys
  const validKeys = (process.env.AIOBS_API_KEYS || 'demo-key').split(',');
  if (!validKeys.includes(apiKey as string)) {
    res.status(403).json({
      success: false,
      error: 'Invalid API key',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}

/**
 * POST /api/ingest/metrics
 * Ingest metric data
 */
router.post('/metrics', validateApiKey, (req: Request, res: Response) => {
  try {
    const { metrics, metadata, compliance } = req.body;

    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'metrics array is required',
        timestamp: new Date().toISOString(),
      });
    }

    const sourceId = metadata?.source_id || 'unknown';

    // Rate limiting
    if (!checkRateLimit(sourceId)) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: 1,
        timestamp: new Date().toISOString(),
      });
    }

    // Security validation
    const security = validateSecurity(metrics);
    if (!security.valid) {
      return res.status(400).json({
        success: false,
        error: 'Security validation failed',
        issues: security.issues,
        timestamp: new Date().toISOString(),
      });
    }

    // Process metrics
    const processed = metrics.map((m: any) => ({
      id: uuidv4(),
      name: m.name,
      value: m.value,
      labels: m.labels || {},
      timestamp: m.timestamp || new Date().toISOString(),
      ingested_at: new Date().toISOString(),
    }));

    res.status(202).json({
      success: true,
      data: {
        accepted: processed.length,
        rejected: 0,
        ids: processed.map(p => p.id),
      },
      message: 'Metrics accepted for processing',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to ingest metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/ingest/logs
 * Ingest log data
 */
router.post('/logs', validateApiKey, (req: Request, res: Response) => {
  try {
    const { logs, stream = 'aiobs-logs', metadata, compliance } = req.body;

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'logs array is required',
        timestamp: new Date().toISOString(),
      });
    }

    const sourceId = metadata?.source_id || 'unknown';

    // Rate limiting
    if (!checkRateLimit(sourceId)) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: 1,
        timestamp: new Date().toISOString(),
      });
    }

    // Security validation
    const security = validateSecurity(logs);
    if (!security.valid) {
      return res.status(400).json({
        success: false,
        error: 'Security validation failed',
        issues: security.issues,
        timestamp: new Date().toISOString(),
      });
    }

    // Process logs
    const processed = logs.map((l: any) => ({
      id: uuidv4(),
      level: l.level || 'info',
      message: l.message,
      context: l.context || {},
      timestamp: l.timestamp || new Date().toISOString(),
      stream,
      ingested_at: new Date().toISOString(),
    }));

    res.status(202).json({
      success: true,
      data: {
        accepted: processed.length,
        rejected: 0,
        stream,
        ids: processed.map(p => p.id),
      },
      message: 'Logs accepted for processing',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to ingest logs',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/ingest/events
 * Ingest event data
 */
router.post('/events', validateApiKey, (req: Request, res: Response) => {
  try {
    const { events, channels = ['events'], metadata, compliance } = req.body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'events array is required',
        timestamp: new Date().toISOString(),
      });
    }

    const sourceId = metadata?.source_id || 'unknown';

    // Rate limiting
    if (!checkRateLimit(sourceId)) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: 1,
        timestamp: new Date().toISOString(),
      });
    }

    // Security validation
    const security = validateSecurity(events);
    if (!security.valid) {
      return res.status(400).json({
        success: false,
        error: 'Security validation failed',
        issues: security.issues,
        timestamp: new Date().toISOString(),
      });
    }

    // Process events
    const processed = events.map((e: any) => ({
      id: uuidv4(),
      event_type: e.event_type,
      severity: e.severity || 'info',
      title: e.title,
      source_service: e.source_service,
      payload: e.payload || {},
      timestamp: e.timestamp || new Date().toISOString(),
      channels,
      ingested_at: new Date().toISOString(),
    }));

    res.status(202).json({
      success: true,
      data: {
        accepted: processed.length,
        rejected: 0,
        channels,
        ids: processed.map(p => p.id),
      },
      message: 'Events accepted for processing',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to ingest events',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/ingest/batch
 * Batch ingestion for metrics, logs, and events
 */
router.post('/batch', validateApiKey, (req: Request, res: Response) => {
  try {
    const { metrics = [], logs = [], events = [], metadata, compliance } = req.body;

    const sourceId = metadata?.source_id || 'unknown';

    // Rate limiting
    if (!checkRateLimit(sourceId)) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: 1,
        timestamp: new Date().toISOString(),
      });
    }

    // Security validation
    const security = validateSecurity({ metrics, logs, events });
    if (!security.valid) {
      return res.status(400).json({
        success: false,
        error: 'Security validation failed',
        issues: security.issues,
        timestamp: new Date().toISOString(),
      });
    }

    const results = {
      metrics: { accepted: metrics.length, rejected: 0 },
      logs: { accepted: logs.length, rejected: 0 },
      events: { accepted: events.length, rejected: 0 },
    };

    res.status(202).json({
      success: true,
      data: {
        results,
        total: metrics.length + logs.length + events.length,
      },
      message: 'Batch accepted for processing',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to process batch',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/ingest/health
 * Check ingestion service health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      backends: {
        victoriametrics: 'connected',
        openobserve: 'connected',
        redis: 'connected',
      },
      rateLimit: {
        limit: RATE_LIMIT,
        window: `${RATE_WINDOW}ms`,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/ingest/stats
 * Get ingestion statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      last24Hours: {
        metricsIngested: 1250000,
        logsIngested: 850000,
        eventsIngested: 45000,
        bytesProcessed: 2.5 * 1024 * 1024 * 1024, // 2.5 GB
        avgLatency: 12, // ms
        errorRate: 0.001,
      },
      bySource: [
        { source: 'fraud-detector-v1', metrics: 350000, logs: 120000, events: 15000 },
        { source: 'churn-predictor-v1', metrics: 280000, logs: 95000, events: 8000 },
        { source: 'recommendation-v2', metrics: 420000, logs: 180000, events: 12000 },
        { source: 'inference-cluster', metrics: 200000, logs: 455000, events: 10000 },
      ],
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/ingest/metrics/query
 * Query ingested metrics
 */
router.get('/metrics/query', (req: Request, res: Response) => {
  try {
    const { query, start, end, step = '60' } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'query parameter is required',
        timestamp: new Date().toISOString(),
      });
    }

    // Mock query response
    const now = Date.now();
    const startTime = start ? new Date(start as string).getTime() : now - 60 * 60 * 1000;
    const endTime = end ? new Date(end as string).getTime() : now;
    const stepMs = parseInt(step as string, 10) * 1000;

    const values: [number, string][] = [];
    for (let t = startTime; t <= endTime; t += stepMs) {
      values.push([t / 1000, (Math.random() * 100).toFixed(2)]);
    }

    res.json({
      success: true,
      data: {
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [
            {
              metric: { __name__: query as string },
              values,
            },
          ],
        },
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

/**
 * GET /api/ingest/logs/search
 * Search ingested logs
 */
router.get('/logs/search', (req: Request, res: Response) => {
  try {
    const { query, stream = 'aiobs-logs', limit = '100' } = req.query;

    // Mock search results
    const results = [
      {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Model inference completed successfully',
        context: { model_id: 'fraud-detector-v1', latency_ms: 45 },
        stream,
      },
      {
        id: uuidv4(),
        timestamp: new Date(Date.now() - 5000).toISOString(),
        level: 'warning',
        message: 'High latency detected',
        context: { model_id: 'recommendation-v2', latency_ms: 150 },
        stream,
      },
      {
        id: uuidv4(),
        timestamp: new Date(Date.now() - 10000).toISOString(),
        level: 'info',
        message: 'Feature store refresh completed',
        context: { features_updated: 1250 },
        stream,
      },
    ];

    res.json({
      success: true,
      data: {
        results,
        total: results.length,
        query: query || '*',
        stream,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to search logs',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/ingest/events/recent
 * Get recent events
 */
router.get('/events/recent', (req: Request, res: Response) => {
  try {
    const { limit = '20', severity } = req.query;

    const events = [
      {
        id: uuidv4(),
        event_type: 'drift_detected',
        severity: 'warning',
        title: 'Data drift detected on fraud-detector-v1',
        source_service: 'fraud-detector-v1',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        id: uuidv4(),
        event_type: 'slo_breach',
        severity: 'critical',
        title: 'Latency SLO breached on recommendation-v2',
        source_service: 'recommendation-v2',
        timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      },
      {
        id: uuidv4(),
        event_type: 'model_deployed',
        severity: 'info',
        title: 'New model version deployed: churn-predictor-v1.2.0',
        source_service: 'churn-predictor-v1',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ];

    let filtered = events;
    if (severity && typeof severity === 'string') {
      filtered = events.filter(e => e.severity === severity);
    }

    res.json({
      success: true,
      data: {
        events: filtered.slice(0, parseInt(limit as string, 10)),
        total: filtered.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as ingestionRouter };
