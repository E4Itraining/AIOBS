/**
 * Alerts API Routes
 * Alert management and notifications
 */

import { Router, Request, Response } from 'express';
import { DataStore } from '../services/data-store';

const router = Router();
const dataStore = DataStore.getInstance();

/**
 * GET /api/alerts
 * List all alerts with optional filtering
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const {
      severity,
      status,
      service,
      limit = '50',
      page = '1',
    } = req.query;

    let alerts = dataStore.getAlerts({
      severity: severity as string | undefined,
      status: status as string | undefined,
      limit: undefined,
    });

    // Filter by service
    if (service && typeof service === 'string') {
      alerts = alerts.filter(a => a.sourceId === service);
    }

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedAlerts = alerts.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        alerts: paginatedAlerts,
        pagination: {
          total: alerts.length,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(alerts.length / limitNum),
          hasNext: endIndex < alerts.length,
          hasPrev: pageNum > 1,
        },
        summary: {
          total: alerts.length,
          bySeverity: {
            critical: alerts.filter(a => a.severity === 'critical').length,
            warning: alerts.filter(a => a.severity === 'warning').length,
            info: alerts.filter(a => a.severity === 'info').length,
          },
          byStatus: {
            active: alerts.filter(a => a.status === 'active').length,
            acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
            resolved: alerts.filter(a => a.status === 'resolved').length,
          },
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/alerts/active
 * Get only active alerts
 */
router.get('/active', (req: Request, res: Response) => {
  try {
    const { severity, limit = '20' } = req.query;

    const alerts = dataStore.getAlerts({
      status: 'active',
      severity: severity as string | undefined,
      limit: parseInt(limit as string, 10),
    });

    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active alerts',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/alerts/:id
 * Get a specific alert
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alert = dataStore.getAlert(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Get related service info
    const service = dataStore.getService(alert.sourceId);

    res.json({
      success: true,
      data: {
        ...alert,
        service: service
          ? { id: service.id, name: service.name, type: service.type, status: service.status }
          : null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PATCH /api/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.patch('/:id/acknowledge', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alert = dataStore.updateAlertStatus(id, 'acknowledged');

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: alert,
      message: 'Alert acknowledged',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PATCH /api/alerts/:id/resolve
 * Resolve an alert
 */
router.patch('/:id/resolve', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alert = dataStore.updateAlertStatus(id, 'resolved');

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: alert,
      message: 'Alert resolved',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/alerts
 * Create a new alert
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { severity, title, description, source, sourceId, metadata } = req.body;

    if (!severity || !title || !sourceId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: severity, title, sourceId',
        timestamp: new Date().toISOString(),
      });
    }

    const alert = dataStore.createAlert({
      severity,
      title,
      description: description || '',
      source: source || 'api',
      sourceId,
      timestamp: new Date().toISOString(),
      status: 'active',
      metadata,
    });

    res.status(201).json({
      success: true,
      data: alert,
      message: 'Alert created',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create alert',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/alerts/summary/by-service
 * Get alert summary grouped by service
 */
router.get('/summary/by-service', (req: Request, res: Response) => {
  try {
    const alerts = dataStore.getAlerts({ status: 'active' });
    const services = dataStore.getServices();

    const summary = services.map(service => {
      const serviceAlerts = alerts.filter(a => a.sourceId === service.id);
      return {
        serviceId: service.id,
        serviceName: service.name,
        alertCount: serviceAlerts.length,
        bySeverity: {
          critical: serviceAlerts.filter(a => a.severity === 'critical').length,
          warning: serviceAlerts.filter(a => a.severity === 'warning').length,
          info: serviceAlerts.filter(a => a.severity === 'info').length,
        },
      };
    }).filter(s => s.alertCount > 0);

    res.json({
      success: true,
      data: {
        summary,
        totalActive: alerts.length,
      },
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

export { router as alertsRouter };
