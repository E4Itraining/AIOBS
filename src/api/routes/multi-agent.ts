/**
 * Multi-Agent Observability API Routes
 *
 * Endpoints for agent topology, decision traces,
 * anomaly detection, and cost attribution.
 */

import { Router, Request, Response } from 'express';
import { multiAgentEngine } from '../../core/multi-agent/multi-agent-engine';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * GET /api/multi-agent/agents
 * Get all registered agents
 */
router.get('/agents', (req: Request, res: Response) => {
  try {
    const agents = multiAgentEngine.getAgents();

    res.json({
      success: true,
      data: agents,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get agents',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/multi-agent/agents/:id
 * Get agent by ID
 */
router.get('/agents/:id', (req: Request, res: Response) => {
  try {
    const agent = multiAgentEngine.getAgent(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: agent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get agent',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/multi-agent/agents
 * Register a new agent
 */
router.post('/agents', (req: Request, res: Response) => {
  try {
    const { name, type, model, provider, capabilities, tools, status, metadata } = req.body;

    if (!name || !type || !model || !provider) {
      return res.status(400).json({
        success: false,
        error: 'name, type, model, and provider are required',
        timestamp: new Date().toISOString(),
      });
    }

    const agent = multiAgentEngine.registerAgent({
      name,
      type,
      version: '1.0.0',
      model,
      provider,
      capabilities: capabilities || [],
      tools: tools || [],
      status: status || 'active',
      metadata: metadata || {},
    });

    res.status(201).json({
      success: true,
      data: agent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to register agent',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/multi-agent/sessions
 * Get all sessions
 */
router.get('/sessions', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const sessions = multiAgentEngine.getSessions(limit);

    res.json({
      success: true,
      data: sessions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get sessions',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/multi-agent/sessions/:id
 * Get session by ID
 */
router.get('/sessions/:id', (req: Request, res: Response) => {
  try {
    const session = multiAgentEngine.getSession(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: session,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get session',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/multi-agent/sessions
 * Start a new session
 */
router.post('/sessions', (req: Request, res: Response) => {
  try {
    const { initiator, rootRequest } = req.body;

    if (!rootRequest) {
      return res.status(400).json({
        success: false,
        error: 'rootRequest is required',
        timestamp: new Date().toISOString(),
      });
    }

    const session = multiAgentEngine.startSession(
      initiator || { type: 'api', id: 'api-user' },
      rootRequest
    );

    res.status(201).json({
      success: true,
      data: session,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start session',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /api/multi-agent/sessions/:id/end
 * End a session
 */
router.put('/sessions/:id/end', (req: Request, res: Response) => {
  try {
    const { status, finalResponse } = req.body;

    const session = multiAgentEngine.endSession(
      req.params.id,
      status || 'completed',
      finalResponse
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: session,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to end session',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/multi-agent/sessions/:id/steps
 * Record a decision step
 */
router.post('/sessions/:id/steps', (req: Request, res: Response) => {
  try {
    const { agentId, type, input, output, duration, tokens, cost, status } = req.body;

    if (!agentId || !type || !input || !output) {
      return res.status(400).json({
        success: false,
        error: 'agentId, type, input, and output are required',
        timestamp: new Date().toISOString(),
      });
    }

    const step = multiAgentEngine.recordStep(req.params.id, agentId, {
      agentId,
      type,
      input: typeof input === 'string' ? { type: 'text', content: input } : input,
      output: typeof output === 'string' ? { type: 'text', content: output } : output,
      duration: duration || 0,
      tokens: tokens || { input: 0, output: 0, total: 0 },
      cost: cost || 0,
      status: status || 'success',
    });

    res.status(201).json({
      success: true,
      data: step,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to record step',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/multi-agent/sessions/:id/traces
 * Get decision traces for a session
 */
router.get('/sessions/:id/traces', (req: Request, res: Response) => {
  try {
    const traces = multiAgentEngine.getTraces(req.params.id);

    res.json({
      success: true,
      data: traces,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get traces',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/multi-agent/sessions/:id/topology
 * Get topology graph for a session
 */
router.get('/sessions/:id/topology', (req: Request, res: Response) => {
  try {
    const topology = multiAgentEngine.buildTopologyGraph(req.params.id);

    res.json({
      success: true,
      data: topology,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to build topology',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/multi-agent/sessions/:id/anomalies
 * Detect anomalies in a session
 */
router.get('/sessions/:id/anomalies', (req: Request, res: Response) => {
  try {
    const anomalies = multiAgentEngine.detectAnomalies(req.params.id);

    res.json({
      success: true,
      data: anomalies,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to detect anomalies',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/multi-agent/sessions/:id/costs
 * Get cost attribution for a session
 */
router.get('/sessions/:id/costs', (req: Request, res: Response) => {
  try {
    const costs = multiAgentEngine.getCostAttribution(req.params.id);

    res.json({
      success: true,
      data: costs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get cost attribution',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/multi-agent/analytics
 * Get multi-agent analytics
 */
router.get('/analytics', (req: Request, res: Response) => {
  try {
    const analytics = multiAgentEngine.getAnalytics();

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

export { router as multiAgentRouter };
