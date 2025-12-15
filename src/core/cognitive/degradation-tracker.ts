/**
 * Degradation Tracking Engine
 * Tracks and predicts performance degradation in AI models
 */

import {
  DegradationMetrics,
  MetricDegradation,
  DegradationProjection,
  DegradationAction,
} from '../types/cognitive';
import { NormalizedScore, SeverityScore, TrendIndicator } from '../types/common';
import { CognitiveEngineConfig, CognitiveInputData, PerformanceRecord } from './cognitive-engine';

/**
 * Degradation Tracking Engine
 */
export class DegradationTracker {
  private config: CognitiveEngineConfig;

  constructor(config: CognitiveEngineConfig) {
    this.config = config;
  }

  /**
   * Analyze degradation for a model
   */
  async analyze(modelId: string, data: CognitiveInputData): Promise<DegradationMetrics> {
    const timestamp = new Date().toISOString();
    const history = data.performanceHistory || [];

    // Compute degradation for each metric
    const accuracyDegradation = this.computeMetricDegradation(history, 'accuracy');
    const latencyDegradation = this.computeLatencyDegradation(history);
    const throughputDegradation = this.computeThroughputDegradation(history);
    const reliabilityDegradation = this.computeReliabilityDegradation(history);

    // Compute overall degradation
    const overallDegradation = this.computeOverallDegradation(
      accuracyDegradation,
      latencyDegradation,
      throughputDegradation,
      reliabilityDegradation
    );

    // Compute trend
    const trend = this.computeTrend(history);

    // Compute projection
    const projection = this.computeProjection(history, overallDegradation);

    // Generate actions
    const actions = this.generateActions(
      overallDegradation,
      accuracyDegradation,
      latencyDegradation,
      throughputDegradation
    );

    return {
      modelId,
      timestamp,
      analysisWindow: this.config.degradationWindow,
      overallDegradation,
      accuracyDegradation,
      latencyDegradation,
      throughputDegradation,
      reliabilityDegradation,
      trend,
      projection,
      actions,
    };
  }

  /**
   * Compute metric degradation
   */
  private computeMetricDegradation(
    history: PerformanceRecord[],
    metricName: string
  ): MetricDegradation {
    if (history.length < 2) {
      return this.emptyMetricDegradation(metricName);
    }

    const values = history.map(h => (h as any)[metricName] as number);
    const baselineValue = values.slice(0, Math.ceil(values.length * 0.2))
      .reduce((a, b) => a + b, 0) / Math.ceil(values.length * 0.2);
    const currentValue = values.slice(-Math.ceil(values.length * 0.2))
      .reduce((a, b) => a + b, 0) / Math.ceil(values.length * 0.2);

    const degradationPercent = ((baselineValue - currentValue) / Math.max(baselineValue, 0.001)) * 100;

    // Compute trend
    const trend = this.computeMetricTrend(values);

    // Statistical significance test
    const { isSignificant, pValue } = this.testSignificance(values);

    return {
      metricName,
      baselineValue,
      currentValue,
      degradationPercent: Math.max(0, degradationPercent),
      trend,
      isSignificant,
      pValue,
    };
  }

  /**
   * Compute latency degradation
   */
  private computeLatencyDegradation(history: PerformanceRecord[]): MetricDegradation {
    if (history.length < 2) {
      return this.emptyMetricDegradation('latency');
    }

    const values = history.map(h => h.latencyP50);
    const baselineValue = values.slice(0, Math.ceil(values.length * 0.2))
      .reduce((a, b) => a + b, 0) / Math.ceil(values.length * 0.2);
    const currentValue = values.slice(-Math.ceil(values.length * 0.2))
      .reduce((a, b) => a + b, 0) / Math.ceil(values.length * 0.2);

    // For latency, increase is degradation
    const degradationPercent = ((currentValue - baselineValue) / Math.max(baselineValue, 0.001)) * 100;

    const trend = this.computeMetricTrend(values, true); // Reverse for latency
    const { isSignificant, pValue } = this.testSignificance(values);

    return {
      metricName: 'latency',
      baselineValue,
      currentValue,
      degradationPercent: Math.max(0, degradationPercent),
      trend,
      isSignificant,
      pValue,
    };
  }

  /**
   * Compute throughput degradation
   */
  private computeThroughputDegradation(history: PerformanceRecord[]): MetricDegradation {
    if (history.length < 2) {
      return this.emptyMetricDegradation('throughput');
    }

    const values = history.map(h => h.throughput);
    const baselineValue = values.slice(0, Math.ceil(values.length * 0.2))
      .reduce((a, b) => a + b, 0) / Math.ceil(values.length * 0.2);
    const currentValue = values.slice(-Math.ceil(values.length * 0.2))
      .reduce((a, b) => a + b, 0) / Math.ceil(values.length * 0.2);

    const degradationPercent = ((baselineValue - currentValue) / Math.max(baselineValue, 0.001)) * 100;

    const trend = this.computeMetricTrend(values);
    const { isSignificant, pValue } = this.testSignificance(values);

    return {
      metricName: 'throughput',
      baselineValue,
      currentValue,
      degradationPercent: Math.max(0, degradationPercent),
      trend,
      isSignificant,
      pValue,
    };
  }

  /**
   * Compute reliability degradation based on error rate
   */
  private computeReliabilityDegradation(history: PerformanceRecord[]): MetricDegradation {
    if (history.length < 2) {
      return this.emptyMetricDegradation('reliability');
    }

    const values = history.map(h => 1 - h.errorRate); // Convert error rate to reliability
    const baselineValue = values.slice(0, Math.ceil(values.length * 0.2))
      .reduce((a, b) => a + b, 0) / Math.ceil(values.length * 0.2);
    const currentValue = values.slice(-Math.ceil(values.length * 0.2))
      .reduce((a, b) => a + b, 0) / Math.ceil(values.length * 0.2);

    const degradationPercent = ((baselineValue - currentValue) / Math.max(baselineValue, 0.001)) * 100;

    const trend = this.computeMetricTrend(values);
    const { isSignificant, pValue } = this.testSignificance(values);

    return {
      metricName: 'reliability',
      baselineValue,
      currentValue,
      degradationPercent: Math.max(0, degradationPercent),
      trend,
      isSignificant,
      pValue,
    };
  }

  /**
   * Compute metric trend
   */
  private computeMetricTrend(values: number[], reverseDirection = false): TrendIndicator {
    if (values.length < 3) {
      return {
        direction: 'stable',
        magnitude: 0,
        periodDays: this.config.degradationWindow.duration,
        significance: 0,
      };
    }

    // Simple linear regression
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    let direction: TrendIndicator['direction'];
    const adjustedSlope = reverseDirection ? -slope : slope;

    if (adjustedSlope > 0.01) direction = 'increasing';
    else if (adjustedSlope < -0.01) direction = 'decreasing';
    else direction = 'stable';

    return {
      direction,
      magnitude: Math.abs(slope),
      periodDays: this.config.degradationWindow.duration,
      significance: Math.min(1, Math.abs(slope) * 10),
    };
  }

  /**
   * Simple significance test
   */
  private testSignificance(values: number[]): { isSignificant: boolean; pValue: number } {
    if (values.length < 5) {
      return { isSignificant: false, pValue: 1 };
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Simple coefficient of variation based test
    const cv = stdDev / Math.max(Math.abs(mean), 0.001);

    // Higher variation = lower p-value
    const pValue = Math.max(0.001, Math.min(1, 1 - cv));

    return {
      isSignificant: pValue < 0.05,
      pValue,
    };
  }

  /**
   * Compute overall degradation score
   */
  private computeOverallDegradation(
    accuracy: MetricDegradation,
    latency: MetricDegradation,
    throughput: MetricDegradation,
    reliability: MetricDegradation
  ): SeverityScore {
    // Weighted combination of degradation percentages
    const weightedDegradation = (
      accuracy.degradationPercent * 0.35 +
      latency.degradationPercent * 0.25 +
      throughput.degradationPercent * 0.2 +
      reliability.degradationPercent * 0.2
    ) / 100;

    const value = Math.min(1, weightedDegradation);

    let severity: SeverityScore['severity'];
    if (value >= 0.3) severity = 'critical';
    else if (value >= 0.2) severity = 'high';
    else if (value >= 0.1) severity = 'medium';
    else if (value >= 0.05) severity = 'low';
    else severity = 'info';

    // Confidence based on number of significant metrics
    const significantCount = [accuracy, latency, throughput, reliability]
      .filter(m => m.isSignificant).length;

    return {
      value,
      severity,
      confidence: significantCount / 4,
    };
  }

  /**
   * Compute overall trend
   */
  private computeTrend(history: PerformanceRecord[]): TrendIndicator {
    if (history.length < 3) {
      return {
        direction: 'stable',
        magnitude: 0,
        periodDays: this.config.degradationWindow.duration,
        significance: 0,
      };
    }

    const accuracies = history.map(h => h.accuracy);
    return this.computeMetricTrend(accuracies);
  }

  /**
   * Compute degradation projection
   */
  private computeProjection(
    history: PerformanceRecord[],
    overallDegradation: SeverityScore
  ): DegradationProjection {
    if (history.length < 5 || overallDegradation.value < 0.01) {
      return {
        timeToThreshold: null,
        projectedValueAtThreshold: 0,
        confidence: 0,
        scenario: 'expected',
      };
    }

    const accuracies = history.map(h => h.accuracy);

    // Simple linear extrapolation
    const n = accuracies.length;
    const recentTrend = (accuracies[n - 1] - accuracies[0]) / n;

    if (recentTrend >= 0) {
      // Not degrading
      return {
        timeToThreshold: null,
        projectedValueAtThreshold: accuracies[n - 1],
        confidence: 0.5,
        scenario: 'optimistic',
      };
    }

    const currentAccuracy = accuracies[n - 1];
    const threshold = this.config.reliabilityThreshold;

    // Days until threshold breach
    const daysToThreshold = Math.ceil((currentAccuracy - threshold) / Math.abs(recentTrend));

    return {
      timeToThreshold: daysToThreshold > 0 ? daysToThreshold : null,
      projectedValueAtThreshold: threshold,
      confidence: Math.min(1, history.length / 30),
      scenario: 'expected',
    };
  }

  /**
   * Generate degradation actions
   */
  private generateActions(
    overall: SeverityScore,
    accuracy: MetricDegradation,
    latency: MetricDegradation,
    throughput: MetricDegradation
  ): DegradationAction[] {
    const actions: DegradationAction[] = [];

    if (overall.value < 0.05) {
      return [{
        type: 'monitor',
        priority: 'low',
        description: 'Continue monitoring - no significant degradation detected',
        expectedImprovement: 'N/A',
        estimatedEffort: 'Minimal',
      }];
    }

    if (accuracy.isSignificant && accuracy.degradationPercent > 5) {
      actions.push({
        type: 'retrain',
        priority: accuracy.degradationPercent > 15 ? 'critical' : 'high',
        description: `Model accuracy degraded by ${accuracy.degradationPercent.toFixed(1)}% - consider retraining`,
        expectedImprovement: 'Restore accuracy to baseline levels',
        estimatedEffort: 'High',
      });
    }

    if (latency.isSignificant && latency.degradationPercent > 20) {
      actions.push({
        type: 'scale',
        priority: latency.degradationPercent > 50 ? 'high' : 'medium',
        description: `Latency increased by ${latency.degradationPercent.toFixed(1)}% - consider scaling infrastructure`,
        expectedImprovement: 'Reduce latency to acceptable levels',
        estimatedEffort: 'Medium',
      });
    }

    if (throughput.isSignificant && throughput.degradationPercent > 15) {
      actions.push({
        type: 'investigate',
        priority: 'medium',
        description: `Throughput decreased by ${throughput.degradationPercent.toFixed(1)}% - investigate bottlenecks`,
        expectedImprovement: 'Identify and resolve throughput constraints',
        estimatedEffort: 'Medium',
      });
    }

    if (overall.severity === 'critical') {
      actions.push({
        type: 'replace',
        priority: 'critical',
        description: 'Consider model replacement due to severe degradation',
        expectedImprovement: 'Full performance restoration',
        estimatedEffort: 'Very High',
      });
    }

    return actions;
  }

  /**
   * Empty metric degradation
   */
  private emptyMetricDegradation(metricName: string): MetricDegradation {
    return {
      metricName,
      baselineValue: 0,
      currentValue: 0,
      degradationPercent: 0,
      trend: {
        direction: 'stable',
        magnitude: 0,
        periodDays: this.config.degradationWindow.duration,
        significance: 0,
      },
      isSignificant: false,
      pValue: 1,
    };
  }
}
