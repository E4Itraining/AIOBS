/**
 * Autonomous Healing Engine
 *
 * Automated self-remediation, rollback strategies,
 * and intelligent recovery for AI systems.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  HealingConfig,
  HealingPolicy,
  HealingTrigger,
  HealingEvent,
  HealingStatus,
  ExecutedAction,
  PredictiveHealing,
  HealingPrediction,
  SelfHealingPipeline,
  HealingAnalytics,
  ActionType,
  RollbackStrategy,
  HealingSafeguard,
} from '../types/autonomous-healing';
import { NormalizedScore } from '../types/common';

/**
 * Autonomous Healing Engine
 */
export class HealingEngine {
  private config: HealingConfig;
  private events: HealingEvent[] = [];
  private policies: Map<string, HealingPolicy> = new Map();
  private triggers: Map<string, HealingTrigger> = new Map();
  private pipelines: Map<string, SelfHealingPipeline> = new Map();

  constructor(config?: Partial<HealingConfig>) {
    this.config = this.mergeWithDefaults(config);
    this.initializeDemoData();
  }

  /**
   * Check if healing is needed for a resource
   */
  async checkHealingNeeded(resourceId: string, metrics: Record<string, number>): Promise<{
    needed: boolean;
    triggeredPolicies: HealingPolicy[];
    suggestedActions: ActionType[];
  }> {
    const triggeredPolicies: HealingPolicy[] = [];
    const suggestedActions: ActionType[] = [];

    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;

      let allConditionsMet = true;
      for (const condition of policy.conditions) {
        const metricValue = metrics[condition.metric];
        if (metricValue === undefined) {
          allConditionsMet = false;
          continue;
        }

        let conditionMet = false;
        switch (condition.operator) {
          case 'gt':
            conditionMet = metricValue > (condition.threshold as number);
            break;
          case 'lt':
            conditionMet = metricValue < (condition.threshold as number);
            break;
          case 'gte':
            conditionMet = metricValue >= (condition.threshold as number);
            break;
          case 'lte':
            conditionMet = metricValue <= (condition.threshold as number);
            break;
          case 'eq':
            conditionMet = metricValue === condition.threshold;
            break;
          case 'between':
            const [min, max] = condition.threshold as [number, number];
            conditionMet = metricValue >= min && metricValue <= max;
            break;
        }

        if (!conditionMet) {
          allConditionsMet = false;
          break;
        }
      }

      if (allConditionsMet) {
        triggeredPolicies.push(policy);
        for (const action of policy.actions) {
          if (!suggestedActions.includes(action.type)) {
            suggestedActions.push(action.type);
          }
        }
      }
    }

    return {
      needed: triggeredPolicies.length > 0,
      triggeredPolicies,
      suggestedActions,
    };
  }

  /**
   * Execute healing action
   */
  async executeHealing(resourceId: string, policyId: string, triggerId?: string): Promise<HealingEvent> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy ${policyId} not found`);
    }

    const event: HealingEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: triggerId ? 'auto-triggered' : 'manual',
      policyId,
      triggerId,
      resourceId,
      resourceType: 'model',
      status: 'in-progress',
      actions: [],
      metrics: {
        before: { timestamp: new Date().toISOString(), metrics: {} },
      },
      outcome: {
        success: false,
        reason: '',
        impactSummary: { servicesAffected: 0, usersAffected: 0, downtime: 0, costImpact: 0, performanceChange: 0 },
      },
      duration: 0,
    };

    const startTime = Date.now();

    // Execute actions in priority order
    const sortedActions = [...policy.actions].sort((a, b) => a.priority - b.priority);

    for (const actionConfig of sortedActions) {
      const executedAction: ExecutedAction = {
        id: uuidv4(),
        type: actionConfig.type,
        startedAt: new Date().toISOString(),
        status: 'running',
        config: actionConfig.config,
      };

      event.actions.push(executedAction);

      try {
        const result = await this.executeAction(resourceId, actionConfig);
        executedAction.status = 'completed';
        executedAction.completedAt = new Date().toISOString();
        executedAction.result = result;
      } catch (error) {
        executedAction.status = 'failed';
        executedAction.completedAt = new Date().toISOString();
        executedAction.error = {
          code: 'ACTION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        };

        // Try fallback if available
        if (actionConfig.fallback) {
          const fallbackAction: ExecutedAction = {
            id: uuidv4(),
            type: actionConfig.fallback.type,
            startedAt: new Date().toISOString(),
            status: 'running',
            config: actionConfig.fallback.config,
          };
          event.actions.push(fallbackAction);

          try {
            const fallbackResult = await this.executeAction(resourceId, actionConfig.fallback);
            fallbackAction.status = 'completed';
            fallbackAction.completedAt = new Date().toISOString();
            fallbackAction.result = fallbackResult;
          } catch (fallbackError) {
            fallbackAction.status = 'failed';
            fallbackAction.completedAt = new Date().toISOString();
          }
        }
      }
    }

    event.duration = Date.now() - startTime;
    event.status = event.actions.every(a => a.status === 'completed') ? 'completed' : 'failed';
    event.outcome = {
      success: event.status === 'completed',
      reason: event.status === 'completed' ? 'All actions completed successfully' : 'One or more actions failed',
      impactSummary: {
        servicesAffected: 1,
        usersAffected: 0,
        downtime: 0,
        costImpact: 0,
        performanceChange: event.status === 'completed' ? 10 : -5,
      },
    };

    this.events.push(event);
    return event;
  }

  /**
   * Get predictive healing recommendations
   */
  async getPredictiveHealing(modelId: string, forecastHorizon: number = 24): Promise<PredictiveHealing> {
    const predictions: HealingPrediction[] = [];

    // Simulate drift prediction
    predictions.push({
      type: 'drift-threshold-breach',
      probability: 0.35,
      predictedTime: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
      severity: 'medium',
      description: 'Data drift may exceed threshold in 18 hours based on current trend',
      indicators: [
        { metric: 'drift_score', currentValue: 0.18, predictedValue: 0.32, threshold: 0.3, trend: { direction: 'increasing', magnitude: 0.02, periodDays: 1, significance: 0.7 } },
      ],
      preventiveActions: ['Schedule proactive retraining', 'Review recent input data distribution'],
    });

    // Simulate performance degradation prediction
    predictions.push({
      type: 'performance-degradation',
      probability: 0.25,
      predictedTime: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
      severity: 'low',
      description: 'Minor performance degradation expected due to increasing load',
      indicators: [
        { metric: 'latency_p99', currentValue: 450, predictedValue: 520, threshold: 500, trend: { direction: 'increasing', magnitude: 0.05, periodDays: 1, significance: 0.6 } },
      ],
      preventiveActions: ['Consider scaling up replicas', 'Enable request caching'],
    });

    return {
      id: uuidv4(),
      modelId,
      timestamp: new Date().toISOString(),
      predictions,
      recommendedActions: predictions.flatMap(p => p.preventiveActions.map(action => ({
        type: 'alert' as ActionType,
        priority: p.severity === 'high' ? 'immediate' as const : p.severity === 'medium' ? 'soon' as const : 'scheduled' as const,
        description: action,
        estimatedImpact: `Reduces probability of ${p.type} by ~50%`,
        preventedIssue: p.type,
        confidence: p.probability,
        config: {},
      }))),
      confidence: 0.75,
      forecastHorizon,
    };
  }

  /**
   * Rollback model to previous version
   */
  async rollback(modelId: string, targetVersion?: string): Promise<HealingEvent> {
    const rollbackPolicy = Array.from(this.policies.values()).find(p =>
      p.actions.some(a => a.type === 'rollback')
    );

    if (!rollbackPolicy) {
      // Create ad-hoc rollback event
      const event: HealingEvent = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        type: 'manual',
        policyId: 'ad-hoc-rollback',
        resourceId: modelId,
        resourceType: 'model',
        status: 'completed',
        actions: [{
          id: uuidv4(),
          type: 'rollback',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          status: 'completed',
          config: { targetVersion: targetVersion || 'previous' },
          result: {
            success: true,
            message: `Rolled back to ${targetVersion || 'previous version'}`,
            newVersion: targetVersion || 'v1.0.0',
          },
        }],
        metrics: {
          before: { timestamp: new Date().toISOString(), metrics: { version: 2 } },
          after: { timestamp: new Date().toISOString(), metrics: { version: 1 } },
        },
        outcome: {
          success: true,
          reason: 'Rollback completed successfully',
          impactSummary: { servicesAffected: 1, usersAffected: 0, downtime: 5, costImpact: 0, performanceChange: 0 },
        },
        duration: 5000,
      };

      this.events.push(event);
      return event;
    }

    return this.executeHealing(modelId, rollbackPolicy.id);
  }

  /**
   * Get healing events
   */
  getEvents(limit = 100, resourceId?: string): HealingEvent[] {
    let events = this.events;
    if (resourceId) {
      events = events.filter(e => e.resourceId === resourceId);
    }
    return events.slice(-limit);
  }

  /**
   * Get healing analytics
   */
  getAnalytics(): HealingAnalytics {
    const period = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    };

    const recentEvents = this.events.filter(e => e.timestamp >= period.start);
    const successfulEvents = recentEvents.filter(e => e.outcome.success);
    const failedEvents = recentEvents.filter(e => !e.outcome.success);
    const autoTriggered = recentEvents.filter(e => e.type === 'auto-triggered');

    const avgRecoveryTime = recentEvents.length > 0
      ? recentEvents.reduce((sum, e) => sum + e.duration, 0) / recentEvents.length
      : 0;

    // Calculate action stats
    const actionStats: Record<ActionType, { count: number; successCount: number; totalDuration: number }> = {} as any;
    for (const event of recentEvents) {
      for (const action of event.actions) {
        if (!actionStats[action.type]) {
          actionStats[action.type] = { count: 0, successCount: 0, totalDuration: 0 };
        }
        actionStats[action.type].count++;
        if (action.status === 'completed') {
          actionStats[action.type].successCount++;
        }
        if (action.completedAt && action.startedAt) {
          actionStats[action.type].totalDuration +=
            new Date(action.completedAt).getTime() - new Date(action.startedAt).getTime();
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      period,
      overview: {
        totalEvents: recentEvents.length,
        successfulEvents: successfulEvents.length,
        failedEvents: failedEvents.length,
        autoTriggered: autoTriggered.length,
        manualTriggered: recentEvents.length - autoTriggered.length,
        avgRecoveryTime,
        mttr: avgRecoveryTime,
        preventedIncidents: Math.floor(autoTriggered.length * 0.8),
        costSavings: successfulEvents.length * 500, // Estimated $500 saved per successful healing
      },
      eventAnalysis: {
        byType: {
          'auto-triggered': autoTriggered.length,
          'manual': recentEvents.length - autoTriggered.length,
          'scheduled': 0,
          'predictive': 0,
        },
        byStatus: {
          'completed': successfulEvents.length,
          'failed': failedEvents.length,
          'pending': 0,
          'in-progress': 0,
          'validating': 0,
          'rolled-back': 0,
          'cancelled': 0,
        },
        byResource: [],
        byPolicy: Array.from(this.policies.values()).map(p => ({
          policyId: p.id,
          policyName: p.name,
          triggers: recentEvents.filter(e => e.policyId === p.id).length,
          successRate: recentEvents.filter(e => e.policyId === p.id && e.outcome.success).length /
            Math.max(1, recentEvents.filter(e => e.policyId === p.id).length),
          avgRecoveryTime: 5000,
        })),
        timeline: [],
      },
      actionAnalysis: {
        byType: Object.fromEntries(
          Object.entries(actionStats).map(([type, stats]) => [type, {
            type: type as ActionType,
            count: stats.count,
            successRate: stats.count > 0 ? stats.successCount / stats.count : 0,
            avgDuration: stats.count > 0 ? stats.totalDuration / stats.count : 0,
            avgImprovement: 10,
          }])
        ),
        topActions: Object.entries(actionStats)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 5)
          .map(([type, stats]) => ({
            type: type as ActionType,
            count: stats.count,
            successRate: stats.count > 0 ? stats.successCount / stats.count : 0,
            avgDuration: stats.count > 0 ? stats.totalDuration / stats.count : 0,
            avgImprovement: 10,
          })),
        effectivenessRanking: [],
      },
      impactAnalysis: {
        totalDowntimePrevented: successfulEvents.length * 300, // 5 minutes per event
        totalCostSaved: successfulEvents.length * 500,
        servicesProtected: new Set(recentEvents.map(e => e.resourceId)).size,
        sloBreachesPrevented: Math.floor(successfulEvents.length * 0.6),
        userImpactMinimized: successfulEvents.length * 1000, // Estimated users
      },
      predictions: {
        predictionsGenerated: 10,
        predictionsAccurate: 7,
        accuracy: 0.7,
        avgLeadTime: 12,
        preventedByPrediction: 3,
      },
      trends: {
        events: { direction: 'stable', magnitude: 0, periodDays: 30, significance: 0.5 },
        successRate: { direction: 'increasing', magnitude: 0.05, periodDays: 30, significance: 0.7 },
        recoveryTime: { direction: 'decreasing', magnitude: 0.1, periodDays: 30, significance: 0.8 },
        costSavings: { direction: 'increasing', magnitude: 0.15, periodDays: 30, significance: 0.75 },
      },
    };
  }

  /**
   * Get policies
   */
  getPolicies(): HealingPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get pipelines
   */
  getPipelines(): SelfHealingPipeline[] {
    return Array.from(this.pipelines.values());
  }

  // Private helper methods

  private async executeAction(resourceId: string, action: { type: ActionType; config: Record<string, unknown> }): Promise<any> {
    // Simulate action execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    switch (action.type) {
      case 'retrain':
        return { success: true, message: 'Retraining initiated', jobId: uuidv4() };
      case 'rollback':
        return { success: true, message: 'Rollback completed', newVersion: 'v1.0.0' };
      case 'scale':
        return { success: true, message: 'Scaling completed', newReplicas: 3 };
      case 'route':
        return { success: true, message: 'Traffic rerouted', targetEndpoint: 'fallback' };
      case 'throttle':
        return { success: true, message: 'Throttling enabled', newLimit: 100 };
      case 'cache':
        return { success: true, message: 'Caching enabled' };
      case 'fallback':
        return { success: true, message: 'Fallback activated' };
      case 'alert':
        return { success: true, message: 'Alert sent' };
      case 'restart':
        return { success: true, message: 'Service restarted' };
      default:
        return { success: true, message: 'Action executed' };
    }
  }

  private mergeWithDefaults(config?: Partial<HealingConfig>): HealingConfig {
    return {
      id: config?.id || uuidv4(),
      name: config?.name || 'Default Healing Config',
      enabled: config?.enabled ?? true,
      version: config?.version || '1.0.0',
      policies: config?.policies || [],
      triggers: config?.triggers || [],
      actions: config?.actions || [],
      safeguards: config?.safeguards || [],
      notifications: config?.notifications || [],
      createdAt: config?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private initializeDemoData(): void {
    // Add demo policies
    const driftPolicy: HealingPolicy = {
      id: uuidv4(),
      name: 'Auto-Retrain on Drift',
      description: 'Automatically trigger retraining when drift exceeds threshold',
      enabled: true,
      priority: 1,
      conditions: [
        { type: 'drift', metric: 'drift_score', operator: 'gt', threshold: 0.3 },
      ],
      actions: [
        { type: 'retrain', priority: 1, config: { dataWindow: 168 }, timeout: 3600000 },
      ],
      cooldown: 3600,
      maxRetries: 2,
    };

    const degradationPolicy: HealingPolicy = {
      id: uuidv4(),
      name: 'Performance Degradation Response',
      description: 'Handle performance degradation with scaling or rollback',
      enabled: true,
      priority: 2,
      conditions: [
        { type: 'performance', metric: 'accuracy', operator: 'lt', threshold: 0.85 },
      ],
      actions: [
        { type: 'rollback', priority: 1, config: { strategy: 'previous' }, timeout: 300000 },
      ],
      cooldown: 1800,
      maxRetries: 1,
    };

    const latencyPolicy: HealingPolicy = {
      id: uuidv4(),
      name: 'High Latency Response',
      description: 'Scale up when latency exceeds threshold',
      enabled: true,
      priority: 3,
      conditions: [
        { type: 'latency', metric: 'latency_p99', operator: 'gt', threshold: 500 },
      ],
      actions: [
        { type: 'scale', priority: 1, config: { direction: 'up', scaleStep: 2 } },
        { type: 'cache', priority: 2, config: {} },
      ],
      cooldown: 600,
      maxRetries: 3,
    };

    this.policies.set(driftPolicy.id, driftPolicy);
    this.policies.set(degradationPolicy.id, degradationPolicy);
    this.policies.set(latencyPolicy.id, latencyPolicy);

    // Add demo pipeline
    const retrainingPipeline: SelfHealingPipeline = {
      id: uuidv4(),
      name: 'Automated Retraining Pipeline',
      description: 'End-to-end retraining pipeline with validation',
      type: 'model-retraining',
      stages: [
        { id: 'validate-data', name: 'Data Validation', type: 'data-validation', config: {}, timeout: 300000 },
        { id: 'prepare-data', name: 'Data Preparation', type: 'data-preparation', config: {}, dependsOn: ['validate-data'], timeout: 600000 },
        { id: 'train', name: 'Model Training', type: 'model-training', config: {}, dependsOn: ['prepare-data'], timeout: 7200000 },
        { id: 'evaluate', name: 'Model Evaluation', type: 'model-evaluation', config: {}, dependsOn: ['train'], timeout: 600000 },
        { id: 'deploy', name: 'Model Deployment', type: 'model-deployment', config: {}, dependsOn: ['evaluate'], timeout: 300000 },
      ],
      triggers: [{ type: 'threshold', config: { metric: 'drift_score', threshold: 0.3 } }],
      config: {
        parallelism: 1,
        timeout: 10800000,
        resourceQuota: { maxGPUs: 4 },
        notifications: [],
        artifacts: { retentionDays: 30, storageLocation: 's3://models/', compress: true },
      },
      status: 'active',
      metrics: {
        totalRuns: 12,
        successRate: 0.92,
        avgDuration: 5400000,
        lastRun: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        lastSuccess: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };

    this.pipelines.set(retrainingPipeline.id, retrainingPipeline);
  }
}

// Export singleton instance
export const healingEngine = new HealingEngine();
