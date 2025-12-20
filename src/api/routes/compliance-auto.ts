/**
 * Compliance Automation API Routes
 *
 * Endpoints for AI Act classification, compliance assessment,
 * evidence generation, and regulatory tracking.
 */

import { Router, Request, Response } from 'express';
import { complianceEngine } from '../../core/compliance/compliance-engine';

const router = Router();

/**
 * POST /api/compliance-auto/classify
 * Classify AI system according to AI Act
 */
router.post('/classify', (req: Request, res: Response) => {
  try {
    const { systemId, name, useCase, dataTypes, outputType, autonomy, humanOversight, affectedPopulation } = req.body;

    if (!systemId || !useCase) {
      return res.status(400).json({
        success: false,
        error: 'systemId and useCase are required',
        timestamp: new Date().toISOString(),
      });
    }

    const classification = complianceEngine.classifyAIActRisk(systemId, {
      name: name || systemId,
      useCase,
      dataTypes: dataTypes || [],
      outputType: outputType || 'recommendation',
      autonomy: autonomy || 'medium',
      humanOversight: humanOversight !== false,
      affectedPopulation: affectedPopulation || 'general',
    });

    res.json({
      success: true,
      data: classification,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to classify system',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/compliance-auto/classification/:systemId
 * Get AI Act classification for a system
 */
router.get('/classification/:systemId', (req: Request, res: Response) => {
  try {
    const classification = complianceEngine.getAIActClassification(req.params.systemId);

    if (!classification) {
      return res.status(404).json({
        success: false,
        error: 'Classification not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: classification,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get classification',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/compliance-auto/assess
 * Run compliance assessment
 */
router.post('/assess', async (req: Request, res: Response) => {
  try {
    const { resourceId, framework } = req.body;

    if (!resourceId || !framework) {
      return res.status(400).json({
        success: false,
        error: 'resourceId and framework are required',
        timestamp: new Date().toISOString(),
      });
    }

    const assessment = await complianceEngine.runAssessment(resourceId, framework);

    res.json({
      success: true,
      data: assessment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to run assessment',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/compliance-auto/assessments/:resourceId
 * Get assessments for a resource
 */
router.get('/assessments/:resourceId', (req: Request, res: Response) => {
  try {
    const assessments = complianceEngine.getAssessments(req.params.resourceId);

    res.json({
      success: true,
      data: assessments,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get assessments',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/compliance-auto/checks/:checkId/run
 * Run automated compliance check
 */
router.post('/checks/:checkId/run', async (req: Request, res: Response) => {
  try {
    const result = await complianceEngine.runCheck(req.params.checkId);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to run check',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/compliance-auto/evidence
 * Generate evidence package
 */
router.post('/evidence', (req: Request, res: Response) => {
  try {
    const { resourceId, framework, period } = req.body;

    if (!resourceId || !framework || !period) {
      return res.status(400).json({
        success: false,
        error: 'resourceId, framework, and period are required',
        timestamp: new Date().toISOString(),
      });
    }

    const evidencePackage = complianceEngine.generateEvidencePackage(resourceId, framework, period);

    res.json({
      success: true,
      data: evidencePackage,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate evidence',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/compliance-auto/changes
 * Get regulatory changes
 */
router.get('/changes', (req: Request, res: Response) => {
  try {
    const framework = req.query.framework as string | undefined;
    const changes = complianceEngine.getRegulatoryChanges(framework);

    res.json({
      success: true,
      data: changes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get regulatory changes',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/compliance-auto/analytics
 * Get compliance analytics
 */
router.get('/analytics', (req: Request, res: Response) => {
  try {
    const analytics = complianceEngine.getAnalytics();

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

export { router as complianceAutoRouter };
