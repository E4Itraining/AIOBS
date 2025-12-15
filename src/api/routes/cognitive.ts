/**
 * Cognitive Metrics API Routes
 * AI model trust, drift, reliability, and hallucination metrics
 */

import { Router, Request, Response } from 'express';
import { DataStore } from '../services/data-store';

const router = Router();
const dataStore = DataStore.getInstance();

/**
 * GET /api/cognitive
 * List cognitive metrics for all models
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const metrics = dataStore.getAllCognitiveMetrics();

    res.json({
      success: true,
      data: {
        models: metrics,
        summary: {
          totalModels: metrics.length,
          avgTrustScore: metrics.reduce((sum, m) => sum + m.trustScore, 0) / metrics.length,
          modelsWithDrift: metrics.filter(m => m.drift.overall > 0.15).length,
          modelsAtRisk: metrics.filter(m => m.trustScore < 0.8).length,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cognitive metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/cognitive/:modelId
 * Get detailed cognitive metrics for a specific model
 */
router.get('/:modelId', (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const metrics = dataStore.getCognitiveMetrics(modelId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Model not found',
        timestamp: new Date().toISOString(),
      });
    }

    const service = dataStore.getService(modelId);

    res.json({
      success: true,
      data: {
        ...metrics,
        service: service
          ? { id: service.id, name: service.name, status: service.status }
          : null,
        recommendations: getRecommendations(metrics),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cognitive metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/cognitive/:modelId/trust
 * Get trust score breakdown
 */
router.get('/:modelId/trust', (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const metrics = dataStore.getCognitiveMetrics(modelId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Model not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Calculate component contributions
    const weights = { drift: 0.3, reliability: 0.35, hallucination: 0.2, degradation: 0.15 };

    const components = {
      drift: {
        score: 1 - metrics.drift.overall,
        weight: weights.drift,
        contribution: (1 - metrics.drift.overall) * weights.drift,
        status: metrics.drift.overall > 0.2 ? 'warning' : 'healthy',
      },
      reliability: {
        score: metrics.reliability.overall,
        weight: weights.reliability,
        contribution: metrics.reliability.overall * weights.reliability,
        status: metrics.reliability.overall < 0.85 ? 'warning' : 'healthy',
      },
      hallucination: {
        score: 1 - metrics.hallucination.risk,
        weight: weights.hallucination,
        contribution: (1 - metrics.hallucination.risk) * weights.hallucination,
        status: metrics.hallucination.risk > 0.1 ? 'warning' : 'healthy',
      },
      degradation: {
        score: 1 - metrics.degradation.performanceDecline,
        weight: weights.degradation,
        contribution: (1 - metrics.degradation.performanceDecline) * weights.degradation,
        status: metrics.degradation.trend === 'declining' ? 'warning' : 'healthy',
      },
    };

    res.json({
      success: true,
      data: {
        modelId,
        trustScore: metrics.trustScore,
        components,
        trend: getTrend(metrics),
        thresholds: {
          critical: 0.6,
          warning: 0.8,
          healthy: 0.9,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trust score',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/cognitive/:modelId/drift
 * Get drift metrics details
 */
router.get('/:modelId/drift', (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const { hours = '24' } = req.query;
    const metrics = dataStore.getCognitiveMetrics(modelId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Model not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Generate drift history
    const hoursNum = parseInt(hours as string, 10);
    const now = Date.now();
    const hour = 60 * 60 * 1000;

    const history = {
      dataDrift: generateDriftHistory(metrics.drift.dataDrift, hoursNum, now, hour),
      conceptDrift: generateDriftHistory(metrics.drift.conceptDrift, hoursNum, now, hour),
      predictionDrift: generateDriftHistory(metrics.drift.predictionDrift, hoursNum, now, hour),
    };

    // Affected features (mock)
    const affectedFeatures = [
      { name: 'transaction_amount', driftScore: 0.32, importance: 0.85 },
      { name: 'merchant_category', driftScore: 0.28, importance: 0.72 },
      { name: 'user_age', driftScore: 0.15, importance: 0.45 },
      { name: 'time_of_day', driftScore: 0.12, importance: 0.38 },
    ];

    res.json({
      success: true,
      data: {
        modelId,
        current: metrics.drift,
        history,
        affectedFeatures,
        thresholds: {
          warning: 0.15,
          critical: 0.25,
        },
        recommendations: metrics.drift.overall > 0.15
          ? ['Consider model retraining', 'Investigate data distribution changes', 'Review feature engineering pipeline']
          : ['Continue monitoring', 'No immediate action required'],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch drift metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/cognitive/:modelId/reliability
 * Get reliability metrics details
 */
router.get('/:modelId/reliability', (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const metrics = dataStore.getCognitiveMetrics(modelId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Model not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: {
        modelId,
        reliability: metrics.reliability,
        details: {
          calibration: {
            score: metrics.reliability.calibration,
            description: 'How well predicted probabilities match actual outcomes',
            status: metrics.reliability.calibration > 0.9 ? 'excellent' : metrics.reliability.calibration > 0.8 ? 'good' : 'needs_improvement',
          },
          stability: {
            score: metrics.reliability.stability,
            description: 'Consistency of predictions over time',
            status: metrics.reliability.stability > 0.95 ? 'excellent' : metrics.reliability.stability > 0.85 ? 'good' : 'needs_improvement',
          },
          uncertainty: {
            score: metrics.reliability.uncertainty,
            description: 'Quality of uncertainty estimates',
            status: metrics.reliability.uncertainty > 0.9 ? 'excellent' : metrics.reliability.uncertainty > 0.8 ? 'good' : 'needs_improvement',
          },
        },
        outOfDistributionRate: 0.02,
        confidenceDistribution: [
          { range: '0.9-1.0', percentage: 45 },
          { range: '0.8-0.9', percentage: 30 },
          { range: '0.7-0.8', percentage: 15 },
          { range: '0.6-0.7', percentage: 7 },
          { range: '<0.6', percentage: 3 },
        ],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reliability metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/cognitive/:modelId/hallucination
 * Get hallucination risk metrics
 */
router.get('/:modelId/hallucination', (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const metrics = dataStore.getCognitiveMetrics(modelId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Model not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: {
        modelId,
        hallucination: metrics.hallucination,
        details: {
          factuality: {
            score: metrics.hallucination.factuality,
            description: 'Accuracy of generated facts',
            recentIncidents: 2,
          },
          grounding: {
            score: metrics.hallucination.grounding,
            description: 'Adherence to source material',
            recentIncidents: 1,
          },
        },
        riskLevel: metrics.hallucination.risk > 0.2 ? 'high' : metrics.hallucination.risk > 0.1 ? 'medium' : 'low',
        mitigations: [
          { name: 'Retrieval augmentation', status: 'enabled' },
          { name: 'Fact checking', status: 'enabled' },
          { name: 'Confidence thresholding', status: 'enabled' },
          { name: 'Human review for high-risk outputs', status: 'partial' },
        ],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hallucination metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/cognitive/summary
 * Get cognitive health summary across all models
 */
router.get('/summary/health', (req: Request, res: Response) => {
  try {
    const metrics = dataStore.getAllCognitiveMetrics();

    const summary = {
      overall: {
        avgTrustScore: metrics.reduce((sum, m) => sum + m.trustScore, 0) / metrics.length,
        healthyModels: metrics.filter(m => m.trustScore >= 0.85).length,
        warningModels: metrics.filter(m => m.trustScore >= 0.7 && m.trustScore < 0.85).length,
        criticalModels: metrics.filter(m => m.trustScore < 0.7).length,
      },
      drift: {
        avgDrift: metrics.reduce((sum, m) => sum + m.drift.overall, 0) / metrics.length,
        modelsWithDrift: metrics.filter(m => m.drift.overall > 0.15).length,
      },
      reliability: {
        avgReliability: metrics.reduce((sum, m) => sum + m.reliability.overall, 0) / metrics.length,
        modelsAtRisk: metrics.filter(m => m.reliability.overall < 0.85).length,
      },
      degradation: {
        modelsInDecline: metrics.filter(m => m.degradation.trend === 'declining').length,
      },
      topConcerns: metrics
        .filter(m => m.trustScore < 0.85)
        .map(m => ({
          modelId: m.modelId,
          trustScore: m.trustScore,
          primaryIssue: getPrimaryIssue(m),
        }))
        .sort((a, b) => a.trustScore - b.trustScore)
        .slice(0, 5),
    };

    res.json({
      success: true,
      data: summary,
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
function generateDriftHistory(currentValue: number, hours: number, now: number, interval: number): Array<{ timestamp: string; value: number }> {
  const history = [];
  for (let i = hours; i >= 0; i--) {
    history.push({
      timestamp: new Date(now - i * interval).toISOString(),
      value: Math.max(0, currentValue - (hours - i) * 0.002 + (Math.random() - 0.5) * 0.02),
    });
  }
  return history;
}

function getRecommendations(metrics: any): string[] {
  const recommendations = [];

  if (metrics.drift.overall > 0.2) {
    recommendations.push('High drift detected - consider immediate model retraining');
  } else if (metrics.drift.overall > 0.15) {
    recommendations.push('Moderate drift detected - schedule model retraining');
  }

  if (metrics.reliability.overall < 0.8) {
    recommendations.push('Low reliability - review calibration and uncertainty estimation');
  }

  if (metrics.hallucination.risk > 0.15) {
    recommendations.push('Elevated hallucination risk - enhance grounding mechanisms');
  }

  if (metrics.degradation.trend === 'declining') {
    recommendations.push('Performance declining - investigate root cause');
  }

  if (recommendations.length === 0) {
    recommendations.push('Model health is good - continue monitoring');
  }

  return recommendations;
}

function getTrend(metrics: any): { direction: string; change: number } {
  if (metrics.degradation.trend === 'declining') {
    return { direction: 'down', change: -0.05 };
  } else if (metrics.degradation.trend === 'improving') {
    return { direction: 'up', change: 0.03 };
  }
  return { direction: 'stable', change: 0 };
}

function getPrimaryIssue(metrics: any): string {
  if (metrics.drift.overall > 0.2) return 'high_drift';
  if (metrics.reliability.overall < 0.8) return 'low_reliability';
  if (metrics.hallucination.risk > 0.15) return 'hallucination_risk';
  if (metrics.degradation.trend === 'declining') return 'performance_decline';
  return 'multiple_issues';
}

export { router as cognitiveRouter };
