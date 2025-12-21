/**
 * SLO/SLI API Routes
 * Service Level Objectives and Indicators management
 */

import { Router, Request, Response } from 'express';
import { DataStore } from '../services/data-store';

const router = Router();
const dataStore = DataStore.getInstance();

/**
 * GET /api/slo
 * List all SLOs with status
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, service } = req.query;

    let slos = dataStore.getSLOs();

    if (status && typeof status === 'string') {
      slos = slos.filter(s => s.status === status);
    }

    if (service && typeof service === 'string') {
      slos = slos.filter(s => s.serviceId === service);
    }

    const summary = {
      total: slos.length,
      met: slos.filter(s => s.status === 'met').length,
      atRisk: slos.filter(s => s.status === 'at_risk').length,
      breached: slos.filter(s => s.status === 'breached').length,
      overallCompliance: Math.round((slos.filter(s => s.status === 'met').length / slos.length) * 100),
    };

    res.json({
      success: true,
      data: {
        slos,
        summary,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SLOs',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/slo/:id
 * Get detailed SLO information
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const slo = dataStore.getSLO(id);

    if (!slo) {
      return res.status(404).json({
        success: false,
        error: 'SLO not found',
        timestamp: new Date().toISOString(),
      });
    }

    const service = dataStore.getService(slo.serviceId);

    // Generate historical data
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const history = [];

    for (let i = 30; i >= 0; i--) {
      history.push({
        date: new Date(now - i * day).toISOString().split('T')[0],
        value: slo.current + (Math.random() - 0.5) * 5,
        target: slo.target,
        status: Math.random() > 0.1 ? 'met' : 'breached',
      });
    }

    res.json({
      success: true,
      data: {
        ...slo,
        service: service ? { id: service.id, name: service.name, type: service.type } : null,
        history,
        burnRate: {
          current: (slo.errorBudget.consumed / slo.errorBudget.total) * 100,
          projected: Math.min(100, (slo.errorBudget.consumed / slo.errorBudget.total) * 100 * 1.2),
          daysRemaining: Math.round((slo.errorBudget.remaining / slo.errorBudget.total) * 30),
        },
        incidents: [
          { id: 'inc-001', date: new Date(now - 5 * day).toISOString(), duration: 15, impact: 0.5 },
          { id: 'inc-002', date: new Date(now - 12 * day).toISOString(), duration: 8, impact: 0.2 },
        ],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SLO',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/slo/service/:serviceId
 * Get all SLOs for a specific service
 */
router.get('/service/:serviceId', (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const slos = dataStore.getSLOsByService(serviceId);
    const service = dataStore.getService(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
        timestamp: new Date().toISOString(),
      });
    }

    const overallHealth = slos.length > 0
      ? (slos.filter(s => s.status === 'met').length / slos.length) * 100
      : 100;

    res.json({
      success: true,
      data: {
        service: { id: service.id, name: service.name, type: service.type },
        slos,
        overallHealth: Math.round(overallHealth),
        recommendation: overallHealth < 80
          ? 'Consider reviewing and adjusting SLO targets'
          : 'SLO health is good',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SLOs',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/slo/error-budget/summary
 * Get error budget summary across all services
 */
router.get('/error-budget/summary', (req: Request, res: Response) => {
  try {
    const slos = dataStore.getSLOs();

    const budgetSummary = slos.map(slo => {
      const service = dataStore.getService(slo.serviceId);
      const consumedPercentage = (slo.errorBudget.consumed / slo.errorBudget.total) * 100;

      return {
        sloId: slo.id,
        sloName: slo.name,
        serviceId: slo.serviceId,
        serviceName: service?.name || slo.serviceId,
        budget: {
          total: slo.errorBudget.total,
          consumed: slo.errorBudget.consumed,
          remaining: slo.errorBudget.remaining,
          consumedPercentage: Math.round(consumedPercentage * 10) / 10,
        },
        status: consumedPercentage > 90 ? 'critical' : consumedPercentage > 70 ? 'warning' : 'healthy',
        projectedDepletion: consumedPercentage > 80
          ? new Date(Date.now() + (slo.errorBudget.remaining / slo.errorBudget.consumed) * 30 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      };
    });

    const critical = budgetSummary.filter(b => b.status === 'critical');
    const warning = budgetSummary.filter(b => b.status === 'warning');

    res.json({
      success: true,
      data: {
        summary: budgetSummary,
        alerts: {
          critical: critical.map(b => ({
            sloId: b.sloId,
            sloName: b.sloName,
            message: `Error budget at ${b.budget.consumedPercentage}%`,
          })),
          warning: warning.map(b => ({
            sloId: b.sloId,
            sloName: b.sloName,
            message: `Error budget at ${b.budget.consumedPercentage}%`,
          })),
        },
        overallHealth: {
          healthy: budgetSummary.filter(b => b.status === 'healthy').length,
          warning: warning.length,
          critical: critical.length,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch error budget summary',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/slo/compliance/report
 * Get compliance report for a time period
 */
router.get('/compliance/report', (req: Request, res: Response) => {
  try {
    const { period = 'monthly' } = req.query;
    const slos = dataStore.getSLOs();
    const services = dataStore.getServices();

    const periodDays = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 90;

    const report = {
      period: {
        type: period,
        start: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      },
      summary: {
        totalSLOs: slos.length,
        metSLOs: slos.filter(s => s.status === 'met').length,
        complianceRate: Math.round((slos.filter(s => s.status === 'met').length / slos.length) * 100),
        avgErrorBudgetRemaining: Math.round(
          slos.reduce((sum, s) => sum + s.errorBudget.remaining, 0) / slos.length
        ),
      },
      byService: services.map(service => {
        const serviceSLOs = slos.filter(s => s.serviceId === service.id);
        return {
          serviceId: service.id,
          serviceName: service.name,
          sloCount: serviceSLOs.length,
          compliance: serviceSLOs.length > 0
            ? Math.round((serviceSLOs.filter(s => s.status === 'met').length / serviceSLOs.length) * 100)
            : 100,
          status: serviceSLOs.some(s => s.status === 'breached')
            ? 'breached'
            : serviceSLOs.some(s => s.status === 'at_risk')
            ? 'at_risk'
            : 'compliant',
        };
      }),
      topViolations: slos
        .filter(s => s.status !== 'met')
        .map(s => ({
          sloId: s.id,
          sloName: s.name,
          serviceId: s.serviceId,
          target: s.target,
          actual: s.current,
          gap: Math.round((s.target - s.current) * 100) / 100,
        }))
        .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
        .slice(0, 5),
      recommendations: [
        {
          priority: 'high',
          action: 'Review recommendation-v2 latency SLO',
          reason: 'Consistently breaching target',
        },
        {
          priority: 'medium',
          action: 'Increase GPU cluster capacity',
          reason: 'GPU utilization SLO at risk',
        },
      ],
    };

    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate compliance report',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/slo
 * Create a new SLO
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, serviceId, target, period = 'monthly' } = req.body;

    if (!name || !serviceId || target === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, serviceId, target',
        timestamp: new Date().toISOString(),
      });
    }

    const service = dataStore.getService(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
        timestamp: new Date().toISOString(),
      });
    }

    const consumed = Math.random() * 30;
    const newSLO = dataStore.createSLO({
      name,
      serviceId,
      target,
      current: target * (0.98 + Math.random() * 0.04),
      status: 'met' as const,
      errorBudget: {
        total: 100,
        consumed,
        remaining: 100 - consumed,
      },
      period,
    });

    res.status(201).json({
      success: true,
      data: newSLO,
      message: 'SLO created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create SLO',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /api/slo/:id
 * Update an existing SLO
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, target, status, current, errorBudget, period } = req.body;

    const updatedSLO = dataStore.updateSLO(id, {
      ...(name && { name }),
      ...(target !== undefined && { target }),
      ...(status && { status }),
      ...(current !== undefined && { current }),
      ...(errorBudget && { errorBudget }),
      ...(period && { period }),
    });

    if (!updatedSLO) {
      return res.status(404).json({
        success: false,
        error: 'SLO not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: updatedSLO,
      message: 'SLO updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update SLO',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/slo/:id
 * Delete an SLO
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = dataStore.deleteSLO(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'SLO not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'SLO deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete SLO',
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as sloRouter };
