/**
 * Error Budget Manager
 * Manages error budgets for AI SLOs
 */

import { ErrorBudgetStatus, BurnRateAlert, AISLODefinition, TimeWindow } from '../../core/types/slo';
import { UUID, ISO8601, NormalizedScore } from '../../core/types/common';

/**
 * Error Budget Manager
 */
export class ErrorBudgetManager {
  private budgetHistory: Map<UUID, ErrorBudgetStatus[]> = new Map();

  /**
   * Record a budget snapshot
   */
  recordSnapshot(status: ErrorBudgetStatus): void {
    const history = this.budgetHistory.get(status.sloId) || [];
    history.push(status);

    // Keep last 30 days of history
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filtered = history.filter(s => new Date(s.timestamp).getTime() >= thirtyDaysAgo);

    this.budgetHistory.set(status.sloId, filtered);
  }

  /**
   * Get budget history for an SLO
   */
  getHistory(sloId: UUID): ErrorBudgetStatus[] {
    return this.budgetHistory.get(sloId) || [];
  }

  /**
   * Calculate budget consumption rate
   */
  calculateConsumptionRate(sloId: UUID, windowDays: number = 7): BudgetConsumptionRate {
    const history = this.getHistory(sloId);

    if (history.length < 2) {
      return {
        sloId,
        rate: 0,
        trend: 'stable',
        projectedDaysRemaining: null,
      };
    }

    // Get history within window
    const windowStart = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    const windowHistory = history.filter(s => new Date(s.timestamp).getTime() >= windowStart);

    if (windowHistory.length < 2) {
      return {
        sloId,
        rate: 0,
        trend: 'stable',
        projectedDaysRemaining: null,
      };
    }

    // Calculate consumption rate
    const first = windowHistory[0];
    const last = windowHistory[windowHistory.length - 1];

    const consumedDelta = last.consumedBudget - first.consumedBudget;
    const timeDeltaHours = (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / (1000 * 60 * 60);

    const ratePerHour = consumedDelta / Math.max(timeDeltaHours, 1);
    const ratePerDay = ratePerHour * 24;

    // Determine trend
    let trend: 'increasing' | 'stable' | 'decreasing';
    if (ratePerDay > 0.1) trend = 'increasing';
    else if (ratePerDay < -0.1) trend = 'decreasing';
    else trend = 'stable';

    // Project days remaining
    const remaining = last.remainingBudget;
    const projectedDaysRemaining = ratePerDay > 0 ? remaining / ratePerDay : null;

    return {
      sloId,
      rate: ratePerDay,
      trend,
      projectedDaysRemaining: projectedDaysRemaining !== null && projectedDaysRemaining > 0
        ? Math.ceil(projectedDaysRemaining)
        : null,
    };
  }

  /**
   * Check if budget is at risk
   */
  isAtRisk(status: ErrorBudgetStatus, thresholdPercent: number = 0.2): boolean {
    return status.remainingPercent <= thresholdPercent;
  }

  /**
   * Check if budget is exhausted
   */
  isExhausted(status: ErrorBudgetStatus): boolean {
    return status.remainingBudget <= 0;
  }

  /**
   * Generate budget forecast
   */
  generateForecast(sloId: UUID, forecastDays: number = 7): BudgetForecast {
    const history = this.getHistory(sloId);
    const rate = this.calculateConsumptionRate(sloId, 7);

    if (history.length === 0) {
      return {
        sloId,
        forecastDays,
        dataPoints: [],
        confidence: 0,
      };
    }

    const latest = history[history.length - 1];
    const dataPoints: ForecastDataPoint[] = [];

    let projectedRemaining = latest.remainingBudget;

    for (let day = 0; day <= forecastDays; day++) {
      const date = new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString();
      projectedRemaining = Math.max(0, projectedRemaining - rate.rate);

      dataPoints.push({
        date,
        projectedRemaining,
        projectedRemainingPercent: latest.totalBudget > 0
          ? projectedRemaining / latest.totalBudget
          : 0,
        isExhausted: projectedRemaining <= 0,
      });
    }

    return {
      sloId,
      forecastDays,
      dataPoints,
      confidence: Math.min(1, history.length / 14), // More history = more confidence
    };
  }

  /**
   * Get budget alerts
   */
  getAlerts(status: ErrorBudgetStatus): BudgetAlert[] {
    const alerts: BudgetAlert[] = [];

    // Check remaining budget threshold
    if (status.remainingPercent <= 0) {
      alerts.push({
        type: 'exhausted',
        severity: 'critical',
        message: 'Error budget fully exhausted',
        sloId: status.sloId,
        timestamp: new Date().toISOString(),
      });
    } else if (status.remainingPercent <= 0.1) {
      alerts.push({
        type: 'critical_low',
        severity: 'critical',
        message: `Error budget critically low: ${(status.remainingPercent * 100).toFixed(1)}% remaining`,
        sloId: status.sloId,
        timestamp: new Date().toISOString(),
      });
    } else if (status.remainingPercent <= 0.25) {
      alerts.push({
        type: 'low',
        severity: 'high',
        message: `Error budget low: ${(status.remainingPercent * 100).toFixed(1)}% remaining`,
        sloId: status.sloId,
        timestamp: new Date().toISOString(),
      });
    }

    // Check burn rate
    for (const burnRateAlert of status.burnRateAlerts) {
      if (burnRateAlert.triggered) {
        alerts.push({
          type: 'burn_rate',
          severity: this.getBurnRateSeverity(burnRateAlert),
          message: `High burn rate detected: ${burnRateAlert.thresholdName}`,
          sloId: status.sloId,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return alerts;
  }

  /**
   * Get burn rate severity
   */
  private getBurnRateSeverity(alert: BurnRateAlert): 'critical' | 'high' | 'medium' | 'low' {
    const ratio = alert.currentRate / alert.thresholdRate;
    if (ratio > 2) return 'critical';
    if (ratio > 1.5) return 'high';
    if (ratio > 1) return 'medium';
    return 'low';
  }
}

/**
 * Budget consumption rate
 */
export interface BudgetConsumptionRate {
  sloId: UUID;
  rate: number; // Per day
  trend: 'increasing' | 'stable' | 'decreasing';
  projectedDaysRemaining: number | null;
}

/**
 * Budget forecast
 */
export interface BudgetForecast {
  sloId: UUID;
  forecastDays: number;
  dataPoints: ForecastDataPoint[];
  confidence: NormalizedScore;
}

/**
 * Forecast data point
 */
export interface ForecastDataPoint {
  date: ISO8601;
  projectedRemaining: number;
  projectedRemainingPercent: NormalizedScore;
  isExhausted: boolean;
}

/**
 * Budget alert
 */
export interface BudgetAlert {
  type: 'exhausted' | 'critical_low' | 'low' | 'burn_rate';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  sloId: UUID;
  timestamp: ISO8601;
}
