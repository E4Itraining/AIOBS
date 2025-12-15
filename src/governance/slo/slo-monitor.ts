/**
 * SLO Monitor
 * Monitors AI-specific Service Level Objectives and manages error budgets
 */

import {
  AISLODefinition,
  SLIDefinition,
  SLIValue,
  SLIStatus,
  SLOTarget,
  ErrorBudgetStatus,
  BurnRateAlert,
  SLOReport,
  SLOSummary,
  SLIResult,
  SLOIncident,
  SLOTrend,
  AIContract,
} from '../../core/types/slo';
import { UUID, ISO8601, NormalizedScore, TimeWindow } from '../../core/types/common';

/**
 * Configuration for the SLO Monitor
 */
export interface SLOMonitorConfig {
  // Evaluation
  evaluationIntervalMinutes: number;
  historicalWindowDays: number;

  // Alerting
  enableAlerts: boolean;
  alertCooldownMinutes: number;

  // Error budget
  burnRateAlertThresholds: number[];
}

/**
 * SLO Monitor Engine
 */
export class SLOMonitor {
  private config: SLOMonitorConfig;
  private slos: Map<UUID, AISLODefinition> = new Map();
  private sliValues: Map<UUID, SLIValue[]> = new Map();
  private incidents: Map<UUID, SLOIncident[]> = new Map();

  constructor(config: Partial<SLOMonitorConfig> = {}) {
    this.config = this.mergeWithDefaults(config);
  }

  /**
   * Register an SLO for monitoring
   */
  registerSLO(slo: AISLODefinition): void {
    this.slos.set(slo.id, slo);
    this.sliValues.set(slo.id, []);
    this.incidents.set(slo.id, []);
  }

  /**
   * Record an SLI measurement
   */
  recordSLIValue(sloId: UUID, sliId: UUID, value: number, sampleSize: number = 1): SLIValue {
    const slo = this.slos.get(sloId);
    if (!slo) {
      throw new Error(`SLO ${sloId} not found`);
    }

    const sli = slo.slis.find(s => s.id === sliId);
    if (!sli) {
      throw new Error(`SLI ${sliId} not found in SLO ${sloId}`);
    }

    const target = slo.objectives.find(o => o.sliId === sliId);
    const status = target ? this.evaluateStatus(value, target) : 'unknown';

    const sliValue: SLIValue = {
      sliId,
      timestamp: new Date().toISOString(),
      window: sli.aggregation.window,
      value,
      unit: this.getSLIUnit(sli),
      sampleSize,
      confidence: Math.min(1, sampleSize / 100),
      objectiveId: target?.sliId,
      status,
    };

    // Store value
    const values = this.sliValues.get(sloId) || [];
    values.push(sliValue);
    this.sliValues.set(sloId, values);

    // Check for breach and create incident if needed
    if (status === 'breached') {
      this.recordIncident(sloId, sli, sliValue);
    }

    return sliValue;
  }

  /**
   * Evaluate SLI status against target
   */
  private evaluateStatus(value: number, target: SLOTarget): SLIStatus {
    let met: boolean;

    switch (target.comparisonOperator) {
      case 'gt':
        met = value > target.targetValue;
        break;
      case 'gte':
        met = value >= target.targetValue;
        break;
      case 'lt':
        met = value < target.targetValue;
        break;
      case 'lte':
        met = value <= target.targetValue;
        break;
      case 'eq':
        met = Math.abs(value - target.targetValue) < 0.001;
        break;
      case 'between':
        met = value >= target.targetValue && value <= (target.secondaryValue || target.targetValue);
        break;
      default:
        met = value >= target.targetValue;
    }

    if (met) return 'met';

    // Check if at risk (within 10% of threshold)
    const margin = Math.abs(target.targetValue * 0.1);
    const isClose = Math.abs(value - target.targetValue) < margin;

    return isClose ? 'at_risk' : 'breached';
  }

  /**
   * Get error budget status for an SLO
   */
  getErrorBudgetStatus(sloId: UUID): ErrorBudgetStatus {
    const slo = this.slos.get(sloId);
    if (!slo) {
      throw new Error(`SLO ${sloId} not found`);
    }

    const values = this.sliValues.get(sloId) || [];
    const period = slo.errorBudget.period;

    // Calculate budget based on SLO targets
    const primaryObjective = slo.objectives[0];
    if (!primaryObjective) {
      return this.emptyErrorBudget(sloId, period);
    }

    // Total budget is (1 - target) for reliability-type SLOs
    const targetValue = primaryObjective.targetValue;
    const totalBudget = targetValue < 1 ? (1 - targetValue) * 100 : (100 - targetValue);

    // Calculate consumed budget from recent values
    const recentValues = this.getValuesInPeriod(values, period);
    const breachedCount = recentValues.filter(v => v.status === 'breached').length;
    const consumedBudget = recentValues.length > 0
      ? (breachedCount / recentValues.length) * totalBudget
      : 0;

    const remainingBudget = Math.max(0, totalBudget - consumedBudget);
    const remainingPercent = totalBudget > 0 ? remainingBudget / totalBudget : 1;

    // Calculate burn rate
    const currentBurnRate = this.calculateBurnRate(values, period);

    // Project exhaustion
    const projectedExhaustion = remainingBudget > 0 && currentBurnRate > 0
      ? this.projectExhaustion(remainingBudget, currentBurnRate)
      : undefined;

    // Check burn rate thresholds
    const burnRateAlerts = this.checkBurnRateThresholds(slo, currentBurnRate);

    return {
      sloId,
      timestamp: new Date().toISOString(),
      period,
      totalBudget,
      consumedBudget,
      remainingBudget,
      remainingPercent,
      currentBurnRate,
      projectedExhaustion,
      burnRateAlerts,
    };
  }

  /**
   * Generate SLO report
   */
  generateReport(sloId: UUID, reportPeriod: TimeWindow): SLOReport {
    const slo = this.slos.get(sloId);
    if (!slo) {
      throw new Error(`SLO ${sloId} not found`);
    }

    const values = this.sliValues.get(sloId) || [];
    const sloIncidents = this.incidents.get(sloId) || [];

    // Get values in period
    const periodValues = this.getValuesInPeriod(values, reportPeriod);

    // Compute summary
    const summary = this.computeSummary(periodValues);

    // Compute per-SLI results
    const sliResults = this.computeSLIResults(slo, periodValues);

    // Get error budget
    const errorBudget = this.getErrorBudgetStatus(sloId);

    // Get incidents in period
    const periodIncidents = this.getIncidentsInPeriod(sloIncidents, reportPeriod);

    // Compute trend
    const trend = this.computeTrend(values, reportPeriod);

    return {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      reportPeriod,
      sloId,
      sloName: slo.name,
      summary,
      sliResults,
      errorBudget,
      incidents: periodIncidents,
      trend,
    };
  }

  /**
   * Get all registered SLOs
   */
  getSLOs(): AISLODefinition[] {
    return Array.from(this.slos.values());
  }

  /**
   * Get current status of all SLOs
   */
  getOverallStatus(): { healthy: number; atRisk: number; breached: number } {
    let healthy = 0;
    let atRisk = 0;
    let breached = 0;

    for (const sloId of this.slos.keys()) {
      const budget = this.getErrorBudgetStatus(sloId);

      if (budget.remainingPercent > 0.5) {
        healthy++;
      } else if (budget.remainingPercent > 0) {
        atRisk++;
      } else {
        breached++;
      }
    }

    return { healthy, atRisk, breached };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Get SLI unit
   */
  private getSLIUnit(sli: SLIDefinition): string {
    const unitMap: Record<string, string> = {
      'reliability': '%',
      'latency': 'ms',
      'accuracy': '%',
      'drift': 'score',
      'hallucination': '%',
      'throughput': 'req/s',
      'availability': '%',
      'cost': '$',
      'energy': 'kWh',
      'security': 'score',
      'compliance': '%',
    };

    return unitMap[sli.category] || 'units';
  }

  /**
   * Record an SLO incident
   */
  private recordIncident(sloId: UUID, sli: SLIDefinition, sliValue: SLIValue): void {
    const incidents = this.incidents.get(sloId) || [];

    const incident: SLOIncident = {
      id: this.generateId(),
      timestamp: sliValue.timestamp,
      duration: 0, // Will be updated when resolved
      severity: this.determineSeverity(sliValue),
      description: `SLI ${sli.name} breached target: ${sliValue.value}`,
    };

    incidents.push(incident);
    this.incidents.set(sloId, incidents);
  }

  /**
   * Determine incident severity
   */
  private determineSeverity(sliValue: SLIValue): 'critical' | 'high' | 'medium' | 'low' {
    // Based on confidence and sample size
    if (sliValue.confidence > 0.9) return 'critical';
    if (sliValue.confidence > 0.7) return 'high';
    if (sliValue.confidence > 0.5) return 'medium';
    return 'low';
  }

  /**
   * Get values within a time period
   */
  private getValuesInPeriod(values: SLIValue[], period: TimeWindow): SLIValue[] {
    const now = Date.now();
    const periodMs = this.timeWindowToMs(period);
    const cutoff = now - periodMs;

    return values.filter(v => new Date(v.timestamp).getTime() >= cutoff);
  }

  /**
   * Get incidents within a time period
   */
  private getIncidentsInPeriod(incidents: SLOIncident[], period: TimeWindow): SLOIncident[] {
    const now = Date.now();
    const periodMs = this.timeWindowToMs(period);
    const cutoff = now - periodMs;

    return incidents.filter(i => new Date(i.timestamp).getTime() >= cutoff);
  }

  /**
   * Convert time window to milliseconds
   */
  private timeWindowToMs(window: TimeWindow): number {
    const multipliers: Record<TimeWindow['unit'], number> = {
      'seconds': 1000,
      'minutes': 60 * 1000,
      'hours': 60 * 60 * 1000,
      'days': 24 * 60 * 60 * 1000,
      'weeks': 7 * 24 * 60 * 60 * 1000,
      'months': 30 * 24 * 60 * 60 * 1000,
    };

    return window.duration * multipliers[window.unit];
  }

  /**
   * Calculate burn rate
   */
  private calculateBurnRate(values: SLIValue[], period: TimeWindow): number {
    const periodValues = this.getValuesInPeriod(values, period);
    if (periodValues.length === 0) return 0;

    const breachedCount = periodValues.filter(v => v.status === 'breached').length;
    return breachedCount / periodValues.length;
  }

  /**
   * Project when error budget will be exhausted
   */
  private projectExhaustion(remainingBudget: number, burnRate: number): ISO8601 {
    if (burnRate <= 0) {
      // Not burning, return far future
      return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    }

    const hoursToExhaustion = remainingBudget / (burnRate * 100);
    const msToExhaustion = hoursToExhaustion * 60 * 60 * 1000;

    return new Date(Date.now() + msToExhaustion).toISOString();
  }

  /**
   * Check burn rate thresholds
   */
  private checkBurnRateThresholds(slo: AISLODefinition, currentRate: number): BurnRateAlert[] {
    const alerts: BurnRateAlert[] = [];

    for (const threshold of slo.errorBudget.burnRateThresholds) {
      const thresholdRate = threshold.multiplier / 100; // Convert from percentage

      alerts.push({
        thresholdName: threshold.name,
        triggered: currentRate > thresholdRate,
        currentRate,
        thresholdRate,
        window: threshold.windowShort,
      });
    }

    return alerts;
  }

  /**
   * Compute SLO summary
   */
  private computeSummary(values: SLIValue[]): SLOSummary {
    if (values.length === 0) {
      return {
        overallStatus: 'met',
        compliancePercent: 1,
        totalBreaches: 0,
        totalWarnings: 0,
        uptimePercent: 1,
      };
    }

    const metCount = values.filter(v => v.status === 'met').length;
    const atRiskCount = values.filter(v => v.status === 'at_risk').length;
    const breachedCount = values.filter(v => v.status === 'breached').length;

    const compliancePercent = metCount / values.length;

    let overallStatus: 'met' | 'at_risk' | 'breached';
    if (breachedCount > 0) {
      overallStatus = 'breached';
    } else if (atRiskCount > 0) {
      overallStatus = 'at_risk';
    } else {
      overallStatus = 'met';
    }

    return {
      overallStatus,
      compliancePercent,
      totalBreaches: breachedCount,
      totalWarnings: atRiskCount,
      uptimePercent: compliancePercent,
    };
  }

  /**
   * Compute per-SLI results
   */
  private computeSLIResults(slo: AISLODefinition, values: SLIValue[]): SLIResult[] {
    const results: SLIResult[] = [];

    for (const sli of slo.slis) {
      const sliValues = values.filter(v => v.sliId === sli.id);
      const target = slo.objectives.find(o => o.sliId === sli.id);

      if (sliValues.length === 0) {
        results.push({
          sliId: sli.id,
          sliName: sli.name,
          target: target?.targetValue || 0,
          actual: 0,
          status: 'unknown',
          samples: 0,
        });
        continue;
      }

      const avgValue = sliValues.reduce((sum, v) => sum + v.value, 0) / sliValues.length;
      const latestStatus = sliValues[sliValues.length - 1].status || 'unknown';

      results.push({
        sliId: sli.id,
        sliName: sli.name,
        target: target?.targetValue || 0,
        actual: avgValue,
        status: latestStatus,
        samples: sliValues.reduce((sum, v) => sum + v.sampleSize, 0),
      });
    }

    return results;
  }

  /**
   * Compute SLO trend
   */
  private computeTrend(values: SLIValue[], period: TimeWindow): SLOTrend {
    const periodValues = this.getValuesInPeriod(values, period);

    if (periodValues.length < 2) {
      return {
        direction: 'stable',
        periods: [],
      };
    }

    // Split into sub-periods
    const midpoint = Math.floor(periodValues.length / 2);
    const firstHalf = periodValues.slice(0, midpoint);
    const secondHalf = periodValues.slice(midpoint);

    const firstMetRate = firstHalf.filter(v => v.status === 'met').length / firstHalf.length;
    const secondMetRate = secondHalf.filter(v => v.status === 'met').length / secondHalf.length;

    const direction: 'improving' | 'stable' | 'degrading' =
      secondMetRate > firstMetRate + 0.05 ? 'improving' :
      secondMetRate < firstMetRate - 0.05 ? 'degrading' : 'stable';

    return {
      direction,
      periods: [
        { period: { ...period, duration: period.duration / 2 }, value: firstMetRate, status: firstMetRate > 0.9 ? 'met' : 'at_risk' },
        { period: { ...period, duration: period.duration / 2 }, value: secondMetRate, status: secondMetRate > 0.9 ? 'met' : 'at_risk' },
      ],
    };
  }

  /**
   * Empty error budget status
   */
  private emptyErrorBudget(sloId: UUID, period: TimeWindow): ErrorBudgetStatus {
    return {
      sloId,
      timestamp: new Date().toISOString(),
      period,
      totalBudget: 0,
      consumedBudget: 0,
      remainingBudget: 0,
      remainingPercent: 1,
      currentBurnRate: 0,
      burnRateAlerts: [],
    };
  }

  /**
   * Generate UUID
   */
  private generateId(): UUID {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Merge config with defaults
   */
  private mergeWithDefaults(config: Partial<SLOMonitorConfig>): SLOMonitorConfig {
    return {
      evaluationIntervalMinutes: config.evaluationIntervalMinutes || 5,
      historicalWindowDays: config.historicalWindowDays || 30,
      enableAlerts: config.enableAlerts ?? true,
      alertCooldownMinutes: config.alertCooldownMinutes || 15,
      burnRateAlertThresholds: config.burnRateAlertThresholds || [14, 6, 1],
    };
  }
}
