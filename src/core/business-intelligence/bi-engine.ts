/**
 * Business Intelligence Engine
 *
 * Business impact analysis, revenue attribution,
 * ROI calculation, and executive reporting.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  BusinessKPI,
  KPIMeasurement,
  RevenueAttribution,
  CostBenefitAnalysis,
  ImpactSimulationRequest,
  ImpactSimulationResult,
  MetricKPICorrelation,
  ExecutiveDashboard,
  BIAnalytics,
  GeneratedReport,
  ReportDefinition,
  KPICategory,
} from '../types/business-intelligence';
import { NormalizedScore, TimeRange } from '../types/common';

/**
 * Business Intelligence Engine
 */
export class BusinessIntelligenceEngine {
  private kpis: Map<string, BusinessKPI> = new Map();
  private measurements: Map<string, KPIMeasurement[]> = new Map();
  private attributions: Map<string, RevenueAttribution> = new Map();
  private correlations: MetricKPICorrelation[] = [];
  private reports: Map<string, GeneratedReport> = new Map();

  constructor() {
    this.initializeKPIs();
    this.initializeDemoData();
  }

  /**
   * Get all KPIs
   */
  getKPIs(): BusinessKPI[] {
    return Array.from(this.kpis.values());
  }

  /**
   * Get KPI by ID
   */
  getKPI(id: string): BusinessKPI | undefined {
    return this.kpis.get(id);
  }

  /**
   * Get KPI measurements
   */
  getKPIMeasurements(kpiId: string, limit = 30): KPIMeasurement[] {
    return (this.measurements.get(kpiId) || []).slice(-limit);
  }

  /**
   * Record KPI measurement
   */
  recordMeasurement(kpiId: string, value: number): KPIMeasurement {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) {
      throw new Error(`KPI ${kpiId} not found`);
    }

    const existing = this.measurements.get(kpiId) || [];
    const previousValue = existing.length > 0 ? existing[existing.length - 1].value : undefined;

    const measurement: KPIMeasurement = {
      kpiId,
      timestamp: new Date().toISOString(),
      value,
      previousValue,
      change: previousValue !== undefined ? value - previousValue : undefined,
      changePercent: previousValue !== undefined && previousValue !== 0
        ? ((value - previousValue) / previousValue) * 100
        : undefined,
      status: this.calculateKPIStatus(kpi, value),
      trend: this.calculateTrend(existing, value),
    };

    existing.push(measurement);
    this.measurements.set(kpiId, existing);

    return measurement;
  }

  /**
   * Calculate revenue attribution
   */
  calculateRevenueAttribution(modelId: string, period: TimeRange): RevenueAttribution {
    // Simulated revenue attribution calculation
    const totalRevenue = 1250000 + Math.random() * 500000;
    const attributedRevenue = totalRevenue * (0.15 + Math.random() * 0.25);

    const attribution: RevenueAttribution = {
      id: uuidv4(),
      modelId,
      period,
      method: 'shapley',
      confidence: 0.85 + Math.random() * 0.1,
      summary: {
        totalRevenue,
        attributedRevenue,
        attributionRate: attributedRevenue / totalRevenue,
        currency: 'USD',
        transactions: Math.floor(50000 + Math.random() * 30000),
        avgTransactionValue: totalRevenue / (50000 + Math.random() * 30000),
        revenuePerInference: attributedRevenue / (100000 + Math.random() * 50000),
      },
      breakdown: {
        byModel: [
          { modelId, modelName: 'Target Model', revenue: attributedRevenue, percentage: 1, transactions: 25000, conversionRate: 0.045, avgOrderValue: 85, trend: { direction: 'increasing', magnitude: 0.08, periodDays: 30, significance: 0.7 } },
        ],
        byChannel: [
          { channel: 'Web', revenue: attributedRevenue * 0.55, percentage: 0.55, transactions: 14000 },
          { channel: 'Mobile', revenue: attributedRevenue * 0.35, percentage: 0.35, transactions: 8750 },
          { channel: 'API', revenue: attributedRevenue * 0.10, percentage: 0.10, transactions: 2250 },
        ],
        bySegment: [
          { segment: 'Enterprise', revenue: attributedRevenue * 0.45, percentage: 0.45, customers: 150, avgLifetimeValue: 15000 },
          { segment: 'SMB', revenue: attributedRevenue * 0.35, percentage: 0.35, customers: 2500, avgLifetimeValue: 3500 },
          { segment: 'Individual', revenue: attributedRevenue * 0.20, percentage: 0.20, customers: 15000, avgLifetimeValue: 250 },
        ],
        byProduct: [],
        byRegion: [
          { region: 'North America', revenue: attributedRevenue * 0.50, percentage: 0.50, currency: 'USD' },
          { region: 'Europe', revenue: attributedRevenue * 0.30, percentage: 0.30, currency: 'EUR' },
          { region: 'APAC', revenue: attributedRevenue * 0.20, percentage: 0.20, currency: 'USD' },
        ],
        byTimeOfDay: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          revenue: attributedRevenue / 24 * (0.5 + Math.random()),
          transactions: Math.floor(1000 + Math.random() * 500),
        })),
      },
      insights: [
        { type: 'opportunity', priority: 'high', title: 'Mobile Conversion Gap', description: 'Mobile conversion rate is 15% lower than web', impact: 75000, recommendation: 'Optimize mobile checkout flow' },
        { type: 'trend', priority: 'medium', title: 'Enterprise Growth', description: 'Enterprise segment growing 12% month-over-month', impact: 150000 },
      ],
    };

    this.attributions.set(modelId, attribution);
    return attribution;
  }

  /**
   * Get revenue attribution
   */
  getRevenueAttribution(modelId: string): RevenueAttribution | undefined {
    return this.attributions.get(modelId);
  }

  /**
   * Calculate cost-benefit analysis
   */
  calculateCostBenefit(resourceIds: string[], period: TimeRange): CostBenefitAnalysis {
    // Simulated cost-benefit calculation
    const totalCost = 150000 + Math.random() * 50000;
    const totalBenefit = totalCost * (2.5 + Math.random() * 1.5);

    return {
      id: uuidv4(),
      period,
      scope: {
        type: 'model',
        resourceIds,
        includeIndirect: true,
      },
      costs: {
        totalCost,
        currency: 'USD',
        categories: [
          { category: 'Infrastructure', amount: totalCost * 0.35, percentage: 0.35, type: 'fixed', subcategories: [
            { name: 'GPU Compute', amount: totalCost * 0.25, percentage: 0.25 },
            { name: 'Storage', amount: totalCost * 0.10, percentage: 0.10 },
          ]},
          { category: 'Development', amount: totalCost * 0.30, percentage: 0.30, type: 'fixed' },
          { category: 'Operations', amount: totalCost * 0.20, percentage: 0.20, type: 'variable' },
          { category: 'Training Data', amount: totalCost * 0.15, percentage: 0.15, type: 'variable' },
        ],
        timeline: [],
        fixed: totalCost * 0.65,
        variable: totalCost * 0.35,
      },
      benefits: {
        totalBenefit,
        currency: 'USD',
        categories: [
          { category: 'Revenue Increase', amount: totalBenefit * 0.50, percentage: 0.50, confidence: 0.85, methodology: 'A/B Test Attribution' },
          { category: 'Cost Reduction', amount: totalBenefit * 0.30, percentage: 0.30, confidence: 0.90, methodology: 'Process Comparison' },
          { category: 'Efficiency Gain', amount: totalBenefit * 0.20, percentage: 0.20, confidence: 0.75, methodology: 'Time Savings Analysis' },
        ],
        timeline: [],
        quantified: totalBenefit * 0.8,
        estimated: totalBenefit * 0.2,
      },
      roi: {
        roi: ((totalBenefit - totalCost) / totalCost) * 100,
        roiAnnualized: ((totalBenefit - totalCost) / totalCost) * 100 * 4, // Assuming quarterly
        netPresentValue: (totalBenefit - totalCost) * 0.95, // 5% discount
        internalRateOfReturn: 45 + Math.random() * 20,
        paybackPeriod: (totalCost / (totalBenefit / 12)), // Months
        profitabilityIndex: totalBenefit / totalCost,
        confidenceInterval: [
          ((totalBenefit * 0.8 - totalCost) / totalCost) * 100,
          ((totalBenefit * 1.2 - totalCost) / totalCost) * 100,
        ],
      },
      breakeven: {
        breakevenPoint: totalCost,
        breakevenDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        currentPosition: 'post-breakeven',
        marginOfSafety: (totalBenefit - totalCost) / totalBenefit,
      },
      sensitivity: {
        baseCase: {
          roi: ((totalBenefit - totalCost) / totalCost) * 100,
          netPresentValue: (totalBenefit - totalCost) * 0.95,
          paybackPeriod: (totalCost / (totalBenefit / 12)),
          profitabilityIndex: totalBenefit / totalCost,
          confidenceInterval: [0, 0],
        },
        scenarios: [
          { name: 'Optimistic', type: 'optimistic', assumptions: { revenueGrowth: 20 }, roi: ((totalBenefit * 1.2 - totalCost) / totalCost) * 100, npv: (totalBenefit * 1.2 - totalCost) * 0.95 },
          { name: 'Pessimistic', type: 'pessimistic', assumptions: { revenueGrowth: -10 }, roi: ((totalBenefit * 0.9 - totalCost) / totalCost) * 100, npv: (totalBenefit * 0.9 - totalCost) * 0.95 },
        ],
        criticalVariables: [
          { variable: 'Revenue Attribution Rate', sensitivity: 2.5, breakeven: 0.15, recommendation: 'Focus on attribution accuracy' },
          { variable: 'Infrastructure Cost', sensitivity: -1.2, breakeven: 300000, recommendation: 'Explore cost optimization' },
        ],
      },
      recommendations: [
        { priority: 'high', type: 'optimization', title: 'Optimize GPU Usage', description: 'Implement spot instances for training', impact: 25000, effort: 'medium', timeline: '2-4 weeks' },
        { priority: 'medium', type: 'benefit-increase', title: 'Expand to Mobile', description: 'Deploy model on mobile platforms', impact: 75000, effort: 'high', timeline: '6-8 weeks' },
      ],
    };
  }

  /**
   * Run impact simulation
   */
  async runImpactSimulation(request: ImpactSimulationRequest): Promise<ImpactSimulationResult> {
    const projections: ImpactSimulationResult['projections'] = [];

    for (const target of request.targets) {
      const baselineValue = target.type === 'revenue' ? 1000000 : target.type === 'cost' ? 150000 : 0.92;
      const changeMultiplier = request.scenario.changes.reduce((mult, change) => {
        if (change.changeType === 'percentage') {
          return mult * (1 + (change.change as number) / 100);
        }
        return mult;
      }, 1);

      const projectedValue = baselineValue * changeMultiplier;

      projections.push({
        target: target.name,
        baseline: {
          value: baselineValue,
          confidence: 0.95,
          range: [baselineValue * 0.95, baselineValue * 1.05],
        },
        projected: {
          value: projectedValue,
          confidence: 0.80,
          range: [projectedValue * 0.85, projectedValue * 1.15],
        },
        impact: {
          absoluteChange: projectedValue - baselineValue,
          percentChange: ((projectedValue - baselineValue) / baselineValue) * 100,
          significance: Math.abs((projectedValue - baselineValue) / baselineValue) > 0.1 ? 'high' : 'medium',
          timeToRealize: request.timeHorizon * 0.3,
        },
        timeline: Array.from({ length: Math.min(12, request.timeHorizon / 30) }, (_, i) => ({
          date: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString(),
          value: baselineValue + ((projectedValue - baselineValue) * ((i + 1) / 12)),
          confidence: 0.8 - (i * 0.02),
        })),
      });
    }

    return {
      id: uuidv4(),
      requestId: request.id,
      timestamp: new Date().toISOString(),
      scenario: request.scenario.name,
      projections,
      riskAssessment: {
        overallRisk: 'medium',
        factors: [
          { factor: 'Market Uncertainty', probability: 0.3, impact: 'medium', description: 'Market conditions may affect results' },
          { factor: 'Implementation Risk', probability: 0.2, impact: 'low', description: 'Technical implementation challenges' },
        ],
        mitigations: [
          { risk: 'Market Uncertainty', strategy: 'Phased rollout with monitoring', effectiveness: 0.7 },
        ],
      },
      confidence: 0.75,
      recommendations: [
        { priority: 'immediate', action: 'Start with pilot deployment', expectedImpact: 'Validate assumptions with real data', resources: '1 engineer, 2 weeks' },
        { priority: 'short-term', action: 'Scale based on pilot results', expectedImpact: 'Full projected impact realization', resources: 'Full team, 4-6 weeks' },
      ],
    };
  }

  /**
   * Get metric-KPI correlations
   */
  getCorrelations(): MetricKPICorrelation[] {
    return this.correlations;
  }

  /**
   * Get executive dashboard
   */
  getExecutiveDashboard(): ExecutiveDashboard {
    const period: TimeRange = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    };

    return {
      timestamp: new Date().toISOString(),
      period,
      summary: {
        headline: 'AI Systems Operating at Peak Performance',
        keyInsights: [
          'Trust score increased 3% month-over-month',
          'Revenue attribution up 12% from AI-powered features',
          'Zero critical incidents in the last 30 days',
          'Cost efficiency improved by 8% through optimization',
        ],
        overallHealth: 'excellent',
        trend: { direction: 'increasing', magnitude: 0.05, periodDays: 30, significance: 0.8 },
        alertCount: 3,
        criticalIssues: 0,
      },
      kpis: Array.from(this.kpis.values()).slice(0, 6).map(kpi => ({
        kpi,
        current: this.getLatestMeasurement(kpi.id) || {
          kpiId: kpi.id,
          timestamp: new Date().toISOString(),
          value: 0,
          status: 'good',
          trend: { direction: 'stable', magnitude: 0, periodDays: 30, significance: 0.5 },
        },
        target: kpi.target,
        attainment: kpi.target ? (this.getLatestMeasurement(kpi.id)?.value || 0) / kpi.target : undefined,
        sparkline: this.getSparklineData(kpi.id),
      })),
      aiPerformance: {
        overallScore: 0.94,
        modelsInProduction: 12,
        totalInferences: 15000000,
        availability: 0.9995,
        qualityScore: 0.92,
        topPerformers: [
          { modelId: 'fraud-detector-v1', modelName: 'Fraud Detector', score: 0.98, revenueImpact: 450000 },
          { modelId: 'recommendation-v2', modelName: 'Recommendation Engine', score: 0.96, revenueImpact: 380000 },
        ],
        attentionNeeded: [
          { modelId: 'churn-predictor-v1', modelName: 'Churn Predictor', issue: 'Minor drift detected', severity: 'medium', recommendation: 'Monitor for next 24h' },
        ],
      },
      financials: {
        totalRevenue: 5200000,
        aiAttributedRevenue: 1560000,
        totalCost: 320000,
        aiCost: 180000,
        roi: 766,
        trend: { direction: 'increasing', magnitude: 0.08, periodDays: 30, significance: 0.85 },
        budget: {
          allocated: 400000,
          spent: 320000,
          remaining: 80000,
          utilization: 0.80,
        },
      },
      risks: {
        overallRisk: 'low',
        complianceStatus: 'compliant',
        securityPosture: 0.92,
        topRisks: [
          { id: uuidv4(), title: 'Model Drift in Production', category: 'Performance', severity: 'medium', status: 'monitoring' },
        ],
      },
      recommendations: [
        { priority: 'high', category: 'revenue', title: 'Expand Recommendation Engine', description: 'Extend to mobile app', expectedImpact: '+$120K/month', timeline: '4-6 weeks' },
        { priority: 'medium', category: 'cost', title: 'Optimize Inference Costs', description: 'Implement request batching', expectedImpact: '-15% cost', timeline: '2-3 weeks' },
      ],
    };
  }

  /**
   * Get BI analytics
   */
  getAnalytics(): BIAnalytics {
    const period: TimeRange = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    };

    return {
      timestamp: new Date().toISOString(),
      period,
      overview: {
        totalRevenue: 5200000,
        aiAttributedRevenue: 1560000,
        totalCost: 320000,
        netValue: 1240000,
        roi: 766,
        modelsContributing: 8,
        trend: { direction: 'increasing', magnitude: 0.08, periodDays: 30, significance: 0.85 },
      },
      revenueAnalytics: {
        total: 1560000,
        growth: 0.12,
        byModel: [],
        byChannel: [],
        trends: [],
      },
      costAnalytics: {
        total: 180000,
        byCategory: [],
        efficiency: 0.87,
        optimization: [
          { area: 'GPU Utilization', currentCost: 80000, potentialSavings: 12000, recommendation: 'Enable auto-scaling', effort: 'low' },
          { area: 'Storage', currentCost: 25000, potentialSavings: 5000, recommendation: 'Implement tiered storage', effort: 'medium' },
        ],
        trends: [],
      },
      performanceAnalytics: {
        overallScore: 0.94,
        byModel: [],
        improvements: [],
        degradations: [],
      },
      correlations: {
        strongCorrelations: this.correlations.filter(c => Math.abs(c.correlation.coefficient) > 0.7),
        emergingCorrelations: this.correlations.filter(c => Math.abs(c.correlation.coefficient) > 0.4 && Math.abs(c.correlation.coefficient) <= 0.7),
        insights: ['Trust score strongly correlates with conversion rate', 'Response latency inversely affects user satisfaction'],
      },
      forecasts: {
        revenueForecasts: [],
        costForecasts: [],
        kpiForecasts: [],
      },
    };
  }

  // Private helper methods

  private calculateKPIStatus(kpi: BusinessKPI, value: number): KPIMeasurement['status'] {
    if (!kpi.threshold) return 'good';

    if (kpi.direction === 'higher-is-better') {
      if (value >= kpi.threshold.excellent!) return 'excellent';
      if (value >= kpi.threshold.good) return 'good';
      if (value >= kpi.threshold.warning) return 'warning';
      return 'critical';
    } else {
      if (value <= kpi.threshold.excellent!) return 'excellent';
      if (value <= kpi.threshold.good) return 'good';
      if (value <= kpi.threshold.warning) return 'warning';
      return 'critical';
    }
  }

  private calculateTrend(history: KPIMeasurement[], currentValue: number): KPIMeasurement['trend'] {
    if (history.length < 2) {
      return { direction: 'stable', magnitude: 0, periodDays: 7, significance: 0.5 };
    }

    const recentValues = history.slice(-7).map(m => m.value);
    recentValues.push(currentValue);

    const avgChange = recentValues.reduce((sum, v, i) => {
      if (i === 0) return 0;
      return sum + (v - recentValues[i - 1]);
    }, 0) / (recentValues.length - 1);

    const avgValue = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    const magnitude = Math.abs(avgChange / avgValue);

    let direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    if (magnitude < 0.01) direction = 'stable';
    else if (avgChange > 0) direction = 'increasing';
    else direction = 'decreasing';

    return {
      direction,
      magnitude,
      periodDays: 7,
      significance: Math.min(1, magnitude * 10),
    };
  }

  private getLatestMeasurement(kpiId: string): KPIMeasurement | undefined {
    const measurements = this.measurements.get(kpiId);
    return measurements?.[measurements.length - 1];
  }

  private getSparklineData(kpiId: string): number[] {
    const measurements = this.measurements.get(kpiId) || [];
    return measurements.slice(-14).map(m => m.value);
  }

  private initializeKPIs(): void {
    const kpis: BusinessKPI[] = [
      {
        id: 'revenue-ai',
        code: 'REV-AI',
        name: 'AI-Attributed Revenue',
        description: 'Revenue directly attributed to AI-powered features',
        category: 'revenue',
        type: 'currency',
        unit: 'USD',
        direction: 'higher-is-better',
        target: 2000000,
        threshold: { critical: 500000, warning: 1000000, good: 1500000, excellent: 2000000 },
        calculation: { formula: 'sum(model_revenue)', inputs: ['model_revenue'], aggregation: 'sum' },
        frequency: 'daily',
      },
      {
        id: 'cost-efficiency',
        code: 'COST-EFF',
        name: 'Cost Efficiency Ratio',
        description: 'Revenue generated per dollar spent on AI',
        category: 'efficiency',
        type: 'ratio',
        direction: 'higher-is-better',
        target: 10,
        threshold: { critical: 2, warning: 5, good: 8, excellent: 12 },
        calculation: { formula: 'revenue / cost', inputs: ['revenue', 'cost'], aggregation: 'custom' },
        frequency: 'daily',
      },
      {
        id: 'model-accuracy',
        code: 'MOD-ACC',
        name: 'Average Model Accuracy',
        description: 'Average accuracy across all production models',
        category: 'quality',
        type: 'percentage',
        unit: '%',
        direction: 'higher-is-better',
        target: 95,
        threshold: { critical: 80, warning: 85, good: 90, excellent: 95 },
        calculation: { formula: 'avg(model_accuracy)', inputs: ['model_accuracy'], aggregation: 'avg' },
        frequency: 'hourly',
      },
      {
        id: 'customer-impact',
        code: 'CUST-IMP',
        name: 'Customer Impact Score',
        description: 'AI impact on customer satisfaction',
        category: 'customer',
        type: 'score',
        direction: 'higher-is-better',
        target: 4.5,
        threshold: { critical: 3.0, warning: 3.5, good: 4.0, excellent: 4.5 },
        calculation: { formula: 'avg(customer_score)', inputs: ['customer_score'], aggregation: 'avg' },
        frequency: 'daily',
      },
      {
        id: 'operational-availability',
        code: 'OPS-AVAIL',
        name: 'AI System Availability',
        description: 'Overall availability of AI systems',
        category: 'operational',
        type: 'percentage',
        unit: '%',
        direction: 'higher-is-better',
        target: 99.9,
        threshold: { critical: 95, warning: 99, good: 99.5, excellent: 99.9 },
        calculation: { formula: 'uptime / total_time * 100', inputs: ['uptime', 'total_time'], aggregation: 'custom' },
        frequency: 'realtime',
      },
      {
        id: 'risk-score',
        code: 'RISK',
        name: 'AI Risk Score',
        description: 'Overall risk assessment of AI systems',
        category: 'risk',
        type: 'score',
        direction: 'lower-is-better',
        target: 15,
        threshold: { critical: 80, warning: 50, good: 30, excellent: 15 },
        calculation: { formula: 'weighted_avg(risk_factors)', inputs: ['risk_factors'], aggregation: 'custom' },
        frequency: 'daily',
      },
    ];

    for (const kpi of kpis) {
      this.kpis.set(kpi.id, kpi);
    }
  }

  private initializeDemoData(): void {
    // Generate historical measurements
    const now = Date.now();
    const demoData: Record<string, number[]> = {
      'revenue-ai': [1200000, 1250000, 1300000, 1280000, 1350000, 1400000, 1450000, 1480000, 1520000, 1560000],
      'cost-efficiency': [7.5, 7.8, 8.0, 8.2, 8.5, 8.7, 9.0, 9.2, 9.5, 9.8],
      'model-accuracy': [91.2, 91.5, 91.8, 92.0, 92.3, 92.5, 92.8, 93.0, 93.2, 93.5],
      'customer-impact': [4.1, 4.15, 4.2, 4.22, 4.25, 4.28, 4.3, 4.32, 4.35, 4.38],
      'operational-availability': [99.85, 99.88, 99.90, 99.91, 99.92, 99.93, 99.94, 99.95, 99.95, 99.96],
      'risk-score': [28, 26, 25, 24, 23, 22, 21, 20, 19, 18],
    };

    for (const [kpiId, values] of Object.entries(demoData)) {
      const measurements: KPIMeasurement[] = [];
      for (let i = 0; i < values.length; i++) {
        const timestamp = new Date(now - (values.length - i) * 24 * 60 * 60 * 1000).toISOString();
        const kpi = this.kpis.get(kpiId)!;
        measurements.push({
          kpiId,
          timestamp,
          value: values[i],
          previousValue: i > 0 ? values[i - 1] : undefined,
          change: i > 0 ? values[i] - values[i - 1] : undefined,
          changePercent: i > 0 && values[i - 1] !== 0 ? ((values[i] - values[i - 1]) / values[i - 1]) * 100 : undefined,
          status: this.calculateKPIStatus(kpi, values[i]),
          trend: { direction: 'stable', magnitude: 0.02, periodDays: 7, significance: 0.6 },
        });
      }
      this.measurements.set(kpiId, measurements);
    }

    // Add correlations
    this.correlations = [
      {
        id: uuidv4(),
        aiMetric: { id: 'trust_score', name: 'Trust Score', type: 'cognitive' },
        businessKPI: { id: 'revenue-ai', name: 'AI-Attributed Revenue', category: 'revenue' },
        correlation: {
          coefficient: 0.78,
          pValue: 0.001,
          significance: 'strong',
          relationship: 'positive',
          lagDays: 3,
          r2: 0.61,
          sampleSize: 90,
          confidenceInterval: [0.65, 0.88],
        },
        recommendations: [
          { type: 'optimize', priority: 'high', description: 'Improving trust score by 5% could increase revenue by 8%', expectedImpact: '+$125K/month' },
        ],
      },
      {
        id: uuidv4(),
        aiMetric: { id: 'latency_p99', name: 'P99 Latency', type: 'performance' },
        businessKPI: { id: 'customer-impact', name: 'Customer Impact Score', category: 'customer' },
        correlation: {
          coefficient: -0.65,
          pValue: 0.01,
          significance: 'moderate',
          relationship: 'negative',
          lagDays: 0,
          r2: 0.42,
          sampleSize: 90,
          confidenceInterval: [-0.78, -0.48],
        },
        recommendations: [
          { type: 'optimize', priority: 'medium', description: 'Reducing latency by 100ms could improve customer satisfaction', expectedImpact: '+0.15 score' },
        ],
      },
    ];
  }
}

// Export singleton instance
export const biEngine = new BusinessIntelligenceEngine();
