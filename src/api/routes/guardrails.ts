/**
 * GenAI Guardrails API Routes
 *
 * Endpoints for AI safety, prompt injection detection,
 * jailbreak prevention, and data leak prevention.
 */

import { Router, Request, Response } from 'express';
import { guardrailsEngine } from '../../core/guardrails/guardrails-engine';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/guardrails/analyze-prompt
 * Analyze a prompt for injection attacks
 */
router.post('/analyze-prompt', async (req: Request, res: Response) => {
  try {
    const { prompt, systemPrompt, previousMessages, modelId, userId } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await guardrailsEngine.analyzePromptInjection({
      requestId: uuidv4(),
      prompt,
      systemPrompt,
      previousMessages,
      modelId,
      userId,
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to analyze prompt',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/guardrails/detect-jailbreak
 * Detect jailbreak attempts
 */
router.post('/detect-jailbreak', async (req: Request, res: Response) => {
  try {
    const { prompt, systemPrompt, previousMessages, modelId, userId } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await guardrailsEngine.detectJailbreak({
      requestId: uuidv4(),
      prompt,
      systemPrompt,
      previousMessages,
      modelId,
      userId,
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to detect jailbreak',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/guardrails/scan-data-leaks
 * Scan content for data leaks (PII, secrets, etc.)
 */
router.post('/scan-data-leaks', async (req: Request, res: Response) => {
  try {
    const { content, direction, context, policies } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await guardrailsEngine.scanDataLeaks({
      requestId: uuidv4(),
      content,
      direction: direction || 'output',
      context,
      policies,
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to scan for data leaks',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/guardrails/analyze-safety
 * Analyze content for safety (toxicity, hate speech, etc.)
 */
router.post('/analyze-safety', async (req: Request, res: Response) => {
  try {
    const { content, contentType, categories, context } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await guardrailsEngine.analyzeContentSafety({
      requestId: uuidv4(),
      content,
      contentType: contentType || 'text',
      categories,
      context,
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to analyze content safety',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/guardrails/detect-bias
 * Detect bias in content
 */
router.post('/detect-bias', async (req: Request, res: Response) => {
  try {
    const { content, contentType, biasCategories } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await guardrailsEngine.detectBias({
      requestId: uuidv4(),
      content,
      contentType: contentType || 'both',
      biasCategories,
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to detect bias',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/guardrails/security-posture
 * Get AI security posture
 */
router.get('/security-posture', async (req: Request, res: Response) => {
  try {
    const posture = await guardrailsEngine.getSecurityPosture();

    res.json({
      success: true,
      data: posture,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get security posture',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/guardrails/metrics
 * Get guardrails metrics
 */
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const metrics = guardrailsEngine.getMetrics();

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/guardrails/incidents
 * Get recent security incidents
 */
router.get('/incidents', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const incidents = guardrailsEngine.getIncidents(limit);

    res.json({
      success: true,
      data: incidents,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get incidents',
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as guardrailsRouter };
