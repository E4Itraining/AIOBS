/**
 * Business Intelligence API Routes
 *
 * Endpoints for KPIs, revenue attribution,
 * ROI analysis, and executive dashboards.
 */

import { Router, Request, Response } from 'express';
import { biEngine } from '../../core/business-intelligence/bi-engine';

const router = Router();

/**
 * GET /api/business-intelligence/kpis
 * Get all KPIs
 */
router.get('/kpis', (req: Request, res: Response) => {
  try {
    const kpis = biEngine.getKPIs();

    res.json({
      success: true,
      data: kpis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get KPIs',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/business-intelligence/kpis/:id
 * Get KPI by ID
 */
router.get('/kpis/:id', (req: Request, res: Response) => {
  try {
    const kpi = biEngine.getKPI(req.params.id);

    if (!kpi) {
      return res.status(404).json({
        success: false,
        error: 'KPI not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: kpi,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get KPI',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/business-intelligence/kpis/:id/measurements
 * Get KPI measurements
 */
router.get('/kpis/:id/measurements', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 30;
    const measurements = biEngine.getKPIMeasurements(req.params.id, limit);

    res.json({
      success: true,
      data: measurements,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get measurements',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/business-intelligence/kpis/:id/measurements
 * Record KPI measurement
 */
router.post('/kpis/:id/measurements', (req: Request, res: Response) => {
  try {
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'value is required',
        timestamp: new Date().toISOString(),
      });
    }

    const measurement = biEngine.recordMeasurement(req.params.id, value);

    res.status(201).json({
      success: true,
      data: measurement,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to record measurement',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/business-intelligence/revenue/:modelId
 * Get revenue attribution for a model
 */
router.get('/revenue/:modelId', (req: Request, res: Response) => {
  try {
    const attribution = biEngine.getRevenueAttribution(req.params.modelId);

    if (!attribution) {
      return res.status(404).json({
        success: false,
        error: 'Attribution not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: attribution,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get revenue attribution',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/business-intelligence/revenue/:modelId/calculate
 * Calculate revenue attribution for a model
 */
router.post('/revenue/:modelId/calculate', (req: Request, res: Response) => {
  try {
    const { period } = req.body;

    const defaultPeriod = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    };

    const attribution = biEngine.calculateRevenueAttribution(
      req.params.modelId,
      period || defaultPeriod
    );

    res.json({
      success: true,
      data: attribution,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to calculate revenue attribution',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/business-intelligence/cost-benefit
 * Calculate cost-benefit analysis
 */
router.post('/cost-benefit', (req: Request, res: Response) => {
  try {
    const { resourceIds, period } = req.body;

    if (!resourceIds || !Array.isArray(resourceIds) || resourceIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'resourceIds array is required',
        timestamp: new Date().toISOString(),
      });
    }

    const defaultPeriod = {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    };

    const analysis = biEngine.calculateCostBenefit(resourceIds, period || defaultPeriod);

    res.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to calculate cost-benefit',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/business-intelligence/simulate
 * Run impact simulation
 */
router.post('/simulate', async (req: Request, res: Response) => {
  try {
    const { type, scenario, targets, timeHorizon } = req.body;

    if (!type || !scenario || !targets) {
      return res.status(400).json({
        success: false,
        error: 'type, scenario, and targets are required',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await biEngine.runImpactSimulation({
      id: require('uuid').v4(),
      type,
      scenario,
      targets,
      timeHorizon: timeHorizon || 90,
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to run simulation',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/business-intelligence/correlations
 * Get metric-KPI correlations
 */
router.get('/correlations', (req: Request, res: Response) => {
  try {
    const correlations = biEngine.getCorrelations();

    res.json({
      success: true,
      data: correlations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get correlations',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/business-intelligence/executive-dashboard
 * Get executive dashboard
 */
router.get('/executive-dashboard', (req: Request, res: Response) => {
  try {
    const dashboard = biEngine.getExecutiveDashboard();

    res.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get executive dashboard',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/business-intelligence/analytics
 * Get BI analytics
 */
router.get('/analytics', (req: Request, res: Response) => {
  try {
    const analytics = biEngine.getAnalytics();

    res.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics',
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as businessIntelligenceRouter };
