/**
 * Autonomous Healing API Routes
 *
 * Endpoints for self-remediation, rollback,
 * predictive healing, and healing analytics.
 */

import { Router, Request, Response } from 'express';
import { healingEngine } from '../../core/healing/healing-engine';

const router = Router();

/**
 * POST /api/healing/check
 * Check if healing is needed for a resource
 */
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { resourceId, metrics } = req.body;

    if (!resourceId || !metrics) {
      return res.status(400).json({
        success: false,
        error: 'resourceId and metrics are required',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await healingEngine.checkHealingNeeded(resourceId, metrics);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check healing',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/healing/execute
 * Execute healing action
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { resourceId, policyId, triggerId } = req.body;

    if (!resourceId || !policyId) {
      return res.status(400).json({
        success: false,
        error: 'resourceId and policyId are required',
        timestamp: new Date().toISOString(),
      });
    }

    const event = await healingEngine.executeHealing(resourceId, policyId, triggerId);

    res.json({
      success: true,
      data: event,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to execute healing',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/healing/rollback
 * Rollback model to previous version
 */
router.post('/rollback', async (req: Request, res: Response) => {
  try {
    const { modelId, targetVersion } = req.body;

    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: 'modelId is required',
        timestamp: new Date().toISOString(),
      });
    }

    const event = await healingEngine.rollback(modelId, targetVersion);

    res.json({
      success: true,
      data: event,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to rollback',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/healing/predictive/:modelId
 * Get predictive healing recommendations
 */
router.get('/predictive/:modelId', async (req: Request, res: Response) => {
  try {
    const forecastHorizon = parseInt(req.query.horizon as string) || 24;
    const prediction = await healingEngine.getPredictiveHealing(req.params.modelId, forecastHorizon);

    res.json({
      success: true,
      data: prediction,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get predictive healing',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/healing/events
 * Get healing events
 */
router.get('/events', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const resourceId = req.query.resourceId as string | undefined;
    const events = healingEngine.getEvents(limit, resourceId);

    res.json({
      success: true,
      data: events,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get events',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/healing/policies
 * Get healing policies
 */
router.get('/policies', (req: Request, res: Response) => {
  try {
    const policies = healingEngine.getPolicies();

    res.json({
      success: true,
      data: policies,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get policies',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/healing/pipelines
 * Get self-healing pipelines
 */
router.get('/pipelines', (req: Request, res: Response) => {
  try {
    const pipelines = healingEngine.getPipelines();

    res.json({
      success: true,
      data: pipelines,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get pipelines',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/healing/analytics
 * Get healing analytics
 */
router.get('/analytics', (req: Request, res: Response) => {
  try {
    const analytics = healingEngine.getAnalytics();

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

export { router as healingRouter };
