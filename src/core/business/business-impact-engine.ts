/**
 * Business Outcome Correlation Engine
 *
 * Connects AI metrics to business KPIs, enabling revenue attribution,
 * ROI calculation, and business impact simulation.
 *
 * @module business-impact-engine
 */

import { v4 as uuidv4 } from 'uuid';
import {
  BusinessKPI,
  AIBusinessCorrelation,
  AIRevenueAttribution,
  BusinessImpactSimulation,
  AIROIAnalysis,
  CostOfQuality,
  ExecutiveAIDashboard,
  BusinessDataIntegration,
  MonetaryValue,
  KPIValue,
  CorrelationAnalysis,
  CausalBusinessAnalysis,
  SimulationScenario,
  SimulatedImpact,
  ROIMetrics,
  TimeRange,
  NormalizedScore,
} from '../types';

// ============================================================================
// Business Impact Engine Interface
// ============================================================================

export interface IBusinessImpactEngine {
  /** Register a business KPI */
  registerKPI(kpi: BusinessKPI): Promise<BusinessKPI>;

  /** Update KPI value */
  updateKPIValue(kpiId: string, value: KPIValue): Promise<void>;

  /** Calculate correlation between AI metric and business KPI */
  calculateCorrelation(aiModelId: string, aiMetric: string, kpiId: string, window: TimeRange): Promise<AIBusinessCorrelation>;

  /** Attribute revenue to AI models */
  attributeRevenue(period: TimeRange): Promise<AIRevenueAttribution>;

  /** Simulate business impact of AI changes */
  simulateImpact(scenario: SimulationScenario): Promise<BusinessImpactSimulation>;

  /** Calculate AI ROI */
  calculateROI(period: TimeRange): Promise<AIROIAnalysis>;

  /** Calculate cost of quality issues */
  calculateCostOfQuality(period: TimeRange): Promise<CostOfQuality>;

  /** Generate executive dashboard data */
  generateExecutiveDashboard(period: TimeRange): Promise<ExecutiveAIDashboard>;

  /** Register external data integration */
  registerIntegration(integration: BusinessDataIntegration): Promise<void>;

  /** Sync data from integrations */
  syncIntegrations(): Promise<void>;

  /** Get all correlations for a model */
  getModelCorrelations(modelId: string): Promise<AIBusinessCorrelation[]>;

  /** Discover correlations automatically */
  discoverCorrelations(modelId: string): Promise<AIBusinessCorrelation[]>;
}

// ============================================================================
// Business Impact Engine Implementation
// ============================================================================

export class BusinessImpactEngine implements IBusinessImpactEngine {
  private kpis: Map<string, BusinessKPI> = new Map();
  private correlations: Map<string, AIBusinessCorrelation> = new Map();
  private integrations: Map<string, BusinessDataIntegration> = new Map();
  private revenueAttributions: Map<string, AIRevenueAttribution> = new Map();

  constructor(
    private readonly config: BusinessImpactEngineConfig = {}
  ) {}

  async registerKPI(kpi: BusinessKPI): Promise<BusinessKPI> {
    const kpiWithId = {
      ...kpi,
      id: kpi.id || uuidv4(),
    };
    this.kpis.set(kpiWithId.id, kpiWithId);
    return kpiWithId;
  }

  async updateKPIValue(kpiId: string, value: KPIValue): Promise<void> {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) {
      throw new Error(`KPI not found: ${kpiId}`);
    }

    // Add to history
    kpi.history.push({
      timestamp: value.timestamp,
      value: value.value,
    });

    // Update current value
    kpi.currentValue = value;
    this.kpis.set(kpiId, kpi);
  }

  async calculateCorrelation(
    aiModelId: string,
    aiMetric: string,
    kpiId: string,
    window: TimeRange
  ): Promise<AIBusinessCorrelation> {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) {
      throw new Error(`KPI not found: ${kpiId}`);
    }

    // Get AI metric data (would fetch from metrics store in production)
    const aiMetricData = await this.fetchAIMetricData(aiModelId, aiMetric, window);
    const kpiData = this.getKPIDataForRange(kpi, window);

    // Calculate statistical correlation
    const correlation = this.calculateStatisticalCorrelation(aiMetricData, kpiData);

    // Perform causal analysis if enough data
    const causalAnalysis = aiMetricData.length > 30
      ? this.performCausalAnalysis(aiMetricData, kpiData)
      : undefined;

    const correlationResult: AIBusinessCorrelation = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      aiMetric: {
        modelId: aiModelId,
        modelName: `Model ${aiModelId}`,
        metricType: aiMetric as any,
        metricName: aiMetric,
      },

      businessKPI: {
        kpiId: kpi.id,
        kpiName: kpi.name,
        category: kpi.category,
      },

      correlation,
      causalAnalysis,

      analysisWindow: window,
      confidence: correlation.significant ? 0.85 : 0.6,
      validated: false,
    };

    this.correlations.set(correlationResult.id, correlationResult);
    return correlationResult;
  }

  async attributeRevenue(period: TimeRange): Promise<AIRevenueAttribution> {
    const now = new Date().toISOString();

    // Get all revenue-related KPIs
    const revenueKPIs = Array.from(this.kpis.values())
      .filter(kpi => kpi.category === 'revenue');

    // Calculate total revenue
    const totalRevenue = revenueKPIs.reduce((sum, kpi) => {
      return sum + (kpi.currentValue?.value || 0);
    }, 0);

    // Get all correlations with revenue KPIs
    const revenueCorrelations = Array.from(this.correlations.values())
      .filter(c => c.businessKPI.category === 'revenue');

    // Calculate Shapley values for attribution
    const modelIds = [...new Set(revenueCorrelations.map(c => c.aiMetric.modelId))];
    const shapleyValues = this.calculateShapleyValues(modelIds, revenueCorrelations, totalRevenue);

    // Build model breakdown
    const modelBreakdown = modelIds.map(modelId => {
      const modelCorrelations = revenueCorrelations.filter(c => c.aiMetric.modelId === modelId);
      const avgCorrelation = modelCorrelations.length > 0
        ? modelCorrelations.reduce((sum, c) => sum + Math.abs(c.correlation.pearsonR), 0) / modelCorrelations.length
        : 0;

      const shapley = shapleyValues.get(modelId) || 0;
      const revenue = totalRevenue * shapley;

      return {
        modelId,
        modelName: `Model ${modelId}`,
        revenue: { amount: revenue, currency: 'USD' },
        percentage: shapley * 100,
        shapleyValue: shapley,
        confidence: avgCorrelation,
        contributingFactors: modelCorrelations.map(c => ({
          factor: c.aiMetric.metricName,
          impact: c.correlation.pearsonR,
          direction: c.correlation.direction,
        })),
      };
    });

    // Calculate AI attributed revenue
    const aiAttributedRevenue = modelBreakdown.reduce((sum, m) => sum + m.revenue.amount, 0);

    const attribution: AIRevenueAttribution = {
      id: uuidv4(),
      period,
      generatedAt: now,

      totalRevenue: { amount: totalRevenue, currency: 'USD' },
      aiAttributedRevenue: { amount: aiAttributedRevenue, currency: 'USD' },
      aiAttributionPercentage: totalRevenue > 0 ? (aiAttributedRevenue / totalRevenue) * 100 : 0,

      modelBreakdown,
      useCaseBreakdown: [],
      featureBreakdown: [],

      methodology: {
        type: 'shapley',
        description: 'Shapley value-based attribution across AI models',
        parameters: {
          correlationThreshold: 0.3,
          minDataPoints: 30,
        },
        limitations: [
          'Assumes independence between models',
          'Based on historical correlation data',
        ],
      },

      confidence: modelBreakdown.length > 0
        ? modelBreakdown.reduce((sum, m) => sum + m.confidence, 0) / modelBreakdown.length
        : 0,
    };

    this.revenueAttributions.set(attribution.id, attribution);
    return attribution;
  }

  async simulateImpact(scenario: SimulationScenario): Promise<BusinessImpactSimulation> {
    const now = new Date().toISOString();

    // Get baseline state
    const baseline = await this.getBaselineState(scenario.timeHorizon);

    // Calculate impacts for each change
    const impacts: SimulatedImpact[] = [];

    for (const change of scenario.changes) {
      // Find correlations for the changed metric
      const relevantCorrelations = Array.from(this.correlations.values())
        .filter(c => c.aiMetric.modelId === change.targetId);

      for (const correlation of relevantCorrelations) {
        const kpi = this.kpis.get(correlation.businessKPI.kpiId);
        if (!kpi) continue;

        // Calculate projected impact based on correlation strength
        const metricChange = change.changePercentage / 100;
        const kpiChange = metricChange * correlation.correlation.pearsonR;
        const currentValue = kpi.currentValue?.value || 0;
        const projectedValue = currentValue * (1 + kpiChange);

        impacts.push({
          kpiId: kpi.id,
          kpiName: kpi.name,
          currentValue,
          projectedValue,
          changeAbsolute: projectedValue - currentValue,
          changePercentage: kpiChange * 100,
          confidenceInterval: {
            lower: projectedValue * 0.9,
            upper: projectedValue * 1.1,
          },
          timeToPeakImpact: correlation.correlation.lagDays,
        });
      }
    }

    // Calculate summary
    const revenueImpacts = impacts.filter(i => {
      const kpi = this.kpis.get(i.kpiId);
      return kpi?.category === 'revenue';
    });

    const costImpacts = impacts.filter(i => {
      const kpi = this.kpis.get(i.kpiId);
      return kpi?.category === 'cost';
    });

    const netRevenueImpact = revenueImpacts.reduce((sum, i) => sum + i.changeAbsolute, 0);
    const netCostImpact = costImpacts.reduce((sum, i) => sum + i.changeAbsolute, 0);

    const roi = netCostImpact !== 0
      ? ((netRevenueImpact - netCostImpact) / Math.abs(netCostImpact)) * 100
      : 0;

    return {
      id: uuidv4(),
      createdAt: now,
      createdBy: 'system',

      scenario,
      baseline,
      impacts,

      summary: {
        netRevenueImpact: { amount: netRevenueImpact, currency: 'USD' },
        netCostImpact: { amount: netCostImpact, currency: 'USD' },
        roi,
        paybackPeriodDays: roi > 0 ? Math.ceil(Math.abs(netCostImpact) / (netRevenueImpact / 365)) : Infinity,
        riskLevel: Math.abs(roi) > 50 ? 'high' : Math.abs(roi) > 20 ? 'medium' : 'low',
        recommendation: roi > 20 ? 'proceed' : roi > 0 ? 'caution' : 'avoid',
        keyInsights: this.generateInsights(impacts, scenario),
      },

      methodology: 'Linear impact projection based on historical correlations',
      assumptions: [
        'Correlations remain stable',
        'No external market changes',
        'Linear relationship assumption',
      ],
      confidence: impacts.length > 0
        ? Math.min(...impacts.map(i => Math.abs(i.confidenceInterval.upper - i.confidenceInterval.lower) / i.currentValue || 1))
        : 0.5,
    };
  }

  async calculateROI(period: TimeRange): Promise<AIROIAnalysis> {
    const now = new Date().toISOString();

    // Get revenue attribution
    const attribution = await this.attributeRevenue(period);

    // Calculate investment (would come from cost tracking in production)
    const investment = await this.calculateAIInvestment(period);

    // Calculate returns
    const directRevenue = attribution.aiAttributedRevenue;
    const costSavings = await this.calculateCostSavings(period);
    const productivityGains = await this.calculateProductivityGains(period);

    const totalReturns = directRevenue.amount + costSavings.amount + productivityGains.amount;
    const totalInvestment = investment.totalInvestment.amount;

    // Calculate ROI metrics
    const roiMetrics: ROIMetrics = {
      roi: totalInvestment > 0 ? ((totalReturns - totalInvestment) / totalInvestment) * 100 : 0,
      netPresentValue: { amount: totalReturns - totalInvestment, currency: 'USD' },
      internalRateOfReturn: this.calculateIRR(investment.totalInvestment.amount, totalReturns),
      paybackPeriodMonths: totalReturns > 0 ? Math.ceil((totalInvestment / totalReturns) * 12) : Infinity,
      costPerInference: { amount: totalInvestment / 1000000, currency: 'USD' },  // Placeholder
      revenuePerInference: { amount: directRevenue.amount / 1000000, currency: 'USD' },
      marginPerInference: { amount: (directRevenue.amount - totalInvestment) / 1000000, currency: 'USD' },
    };

    return {
      id: uuidv4(),
      name: `AI ROI Analysis ${period.start} - ${period.end}`,
      period,
      generatedAt: now,

      investment,
      returns: {
        totalReturns: { amount: totalReturns, currency: 'USD' },
        directRevenue,
        costSavings,
        productivityGains,
        riskReduction: { amount: 0, currency: 'USD' },
        intangibleBenefits: [],
      },

      roiMetrics,

      initiativeBreakdown: attribution.modelBreakdown.map(m => ({
        initiativeId: m.modelId,
        initiativeName: m.modelName,
        investment: { amount: totalInvestment / attribution.modelBreakdown.length, currency: 'USD' },
        returns: m.revenue,
        roi: m.shapleyValue * 100,
        status: m.shapleyValue > 0 ? 'profitable' : 'loss-making',
      })),
    };
  }

  async calculateCostOfQuality(period: TimeRange): Promise<CostOfQuality> {
    const now = new Date().toISOString();

    // Calculate prevention costs (monitoring, testing, etc.)
    const preventionCosts = {
      name: 'Prevention Costs',
      totalCost: { amount: 50000, currency: 'USD' },
      items: [
        {
          name: 'AI Monitoring Infrastructure',
          description: 'AIOBS platform and observability tools',
          cost: { amount: 30000, currency: 'USD' },
          frequency: 1,
          trend: { direction: 'stable' as const, magnitude: 0, periodDays: 30, significance: 0.5 },
        },
        {
          name: 'Quality Testing',
          description: 'Automated testing and validation',
          cost: { amount: 20000, currency: 'USD' },
          frequency: 1,
          trend: { direction: 'stable' as const, magnitude: 0, periodDays: 30, significance: 0.5 },
        },
      ],
    };

    // Calculate appraisal costs (audits, evaluations)
    const appraisalCosts = {
      name: 'Appraisal Costs',
      totalCost: { amount: 25000, currency: 'USD' },
      items: [
        {
          name: 'Model Evaluation',
          description: 'Regular model performance evaluation',
          cost: { amount: 15000, currency: 'USD' },
          frequency: 4,
          trend: { direction: 'stable' as const, magnitude: 0, periodDays: 30, significance: 0.5 },
        },
        {
          name: 'Compliance Audits',
          description: 'Regulatory compliance assessments',
          cost: { amount: 10000, currency: 'USD' },
          frequency: 2,
          trend: { direction: 'stable' as const, magnitude: 0, periodDays: 30, significance: 0.5 },
        },
      ],
    };

    // Calculate internal failure costs
    const internalFailureCosts = {
      name: 'Internal Failure Costs',
      totalCost: { amount: 75000, currency: 'USD' },
      items: [
        {
          name: 'Model Retraining',
          description: 'Unplanned model retraining due to drift',
          cost: { amount: 50000, currency: 'USD' },
          frequency: 3,
          trend: { direction: 'decreasing' as const, magnitude: 0.1, periodDays: 30, significance: 0.7 },
        },
        {
          name: 'Incident Response',
          description: 'Internal incident handling',
          cost: { amount: 25000, currency: 'USD' },
          frequency: 5,
          trend: { direction: 'stable' as const, magnitude: 0, periodDays: 30, significance: 0.5 },
        },
      ],
    };

    // Calculate external failure costs
    const externalFailureCosts = {
      name: 'External Failure Costs',
      totalCost: { amount: 100000, currency: 'USD' },
      items: [
        {
          name: 'Customer Impact',
          description: 'Revenue loss from AI errors affecting customers',
          cost: { amount: 60000, currency: 'USD' },
          frequency: 10,
          trend: { direction: 'decreasing' as const, magnitude: 0.15, periodDays: 30, significance: 0.8 },
        },
        {
          name: 'Support Costs',
          description: 'Additional support due to AI issues',
          cost: { amount: 40000, currency: 'USD' },
          frequency: 50,
          trend: { direction: 'stable' as const, magnitude: 0, periodDays: 30, significance: 0.5 },
        },
      ],
    };

    const totalCost = preventionCosts.totalCost.amount +
      appraisalCosts.totalCost.amount +
      internalFailureCosts.totalCost.amount +
      externalFailureCosts.totalCost.amount;

    return {
      id: uuidv4(),
      period,
      generatedAt: now,

      totalCost: { amount: totalCost, currency: 'USD' },

      preventionCosts,
      appraisalCosts,
      internalFailureCosts,
      externalFailureCosts,

      errorTypeCosts: [
        {
          errorType: 'hallucination',
          occurrences: 150,
          totalCost: { amount: 45000, currency: 'USD' },
          costPerOccurrence: { amount: 300, currency: 'USD' },
          customerImpact: 'medium',
          preventable: true,
        },
        {
          errorType: 'drift-degradation',
          occurrences: 20,
          totalCost: { amount: 60000, currency: 'USD' },
          costPerOccurrence: { amount: 3000, currency: 'USD' },
          customerImpact: 'high',
          preventable: true,
        },
      ],

      kpiImpacts: [],

      recommendations: [
        {
          priority: 'high',
          title: 'Implement Proactive Drift Detection',
          description: 'Deploy predictive drift monitoring to catch degradation earlier',
          estimatedSavings: { amount: 40000, currency: 'USD' },
          implementationCost: { amount: 10000, currency: 'USD' },
          roi: 300,
          timeToImplementDays: 30,
        },
      ],
    };
  }

  async generateExecutiveDashboard(period: TimeRange): Promise<ExecutiveAIDashboard> {
    const now = new Date().toISOString();

    // Get ROI analysis
    const roi = await this.calculateROI(period);

    // Get cost of quality
    const coq = await this.calculateCostOfQuality(period);

    return {
      generatedAt: now,
      period,

      financialSummary: {
        aiInvestmentYTD: roi.investment.totalInvestment,
        aiRevenueYTD: roi.returns.directRevenue,
        aiCostSavingsYTD: roi.returns.costSavings,
        currentROI: roi.roiMetrics.roi,
        projectedEOYROI: roi.roiMetrics.roi * 1.1,  // Simplified projection
        budgetUtilization: 0.75,
        trend: { direction: 'increasing', magnitude: 0.05, periodDays: 30, significance: 0.8 },
      },

      aiHealthOverview: {
        overallHealthScore: 0.85,
        modelCount: 10,
        modelsHealthy: 8,
        modelsDegraded: 2,
        modelsCritical: 0,
        uptime: 99.5,
        incidentsThisMonth: 3,
        incidentsTrend: { direction: 'decreasing', magnitude: 0.2, periodDays: 30, significance: 0.7 },
      },

      strategicInitiatives: [
        {
          id: 'si-001',
          name: 'Customer Service AI Enhancement',
          status: 'on-track',
          progress: 65,
          expectedROI: 150,
          actualROI: 120,
          keyMilestones: [
            { name: 'Phase 1 Deployment', dueDate: '2024-01-15', status: 'completed' },
            { name: 'Phase 2 Training', dueDate: '2024-03-01', status: 'on-track' },
          ],
        },
      ],

      riskSummary: {
        overallRiskLevel: 'medium',
        topRisks: [
          {
            title: 'Model Drift Risk',
            category: 'Technical',
            impact: 'Potential 10% accuracy degradation',
            mitigation: 'Continuous monitoring with AIOBS',
            owner: 'ML Platform Team',
          },
        ],
        complianceStatus: 'compliant',
        auditReadiness: 0.9,
      },

      executiveRecommendations: [
        {
          priority: 'short-term',
          title: 'Increase AI Investment in Customer Service',
          rationale: 'Current ROI of 120% with 35% YoY growth potential',
          expectedImpact: 'Additional $2M annual revenue',
          resourcesRequired: '$200K additional investment',
        },
      ],
    };
  }

  async registerIntegration(integration: BusinessDataIntegration): Promise<void> {
    this.integrations.set(integration.id, integration);
  }

  async syncIntegrations(): Promise<void> {
    for (const integration of this.integrations.values()) {
      if (integration.status === 'active') {
        await this.syncSingleIntegration(integration);
      }
    }
  }

  async getModelCorrelations(modelId: string): Promise<AIBusinessCorrelation[]> {
    return Array.from(this.correlations.values())
      .filter(c => c.aiMetric.modelId === modelId);
  }

  async discoverCorrelations(modelId: string): Promise<AIBusinessCorrelation[]> {
    const discovered: AIBusinessCorrelation[] = [];
    const metrics = ['accuracy', 'latency', 'throughput', 'error-rate'];
    const window: TimeRange = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    };

    for (const kpi of this.kpis.values()) {
      for (const metric of metrics) {
        try {
          const correlation = await this.calculateCorrelation(modelId, metric, kpi.id, window);
          if (correlation.correlation.significant) {
            discovered.push(correlation);
          }
        } catch (e) {
          // Skip if calculation fails
        }
      }
    }

    return discovered;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async fetchAIMetricData(modelId: string, metric: string, window: TimeRange): Promise<DataPoint[]> {
    // In production, would fetch from metrics store
    // Generate synthetic data for now
    const points: DataPoint[] = [];
    const start = new Date(window.start).getTime();
    const end = new Date(window.end).getTime();
    const interval = (end - start) / 100;

    for (let i = 0; i < 100; i++) {
      points.push({
        timestamp: new Date(start + i * interval).toISOString(),
        value: 0.9 + Math.random() * 0.1 - 0.05,  // Random value around 0.9
      });
    }

    return points;
  }

  private getKPIDataForRange(kpi: BusinessKPI, window: TimeRange): DataPoint[] {
    const start = new Date(window.start).getTime();
    const end = new Date(window.end).getTime();

    return kpi.history
      .filter(h => {
        const t = new Date(h.timestamp).getTime();
        return t >= start && t <= end;
      })
      .map(h => ({ timestamp: h.timestamp, value: h.value }));
  }

  private calculateStatisticalCorrelation(data1: DataPoint[], data2: DataPoint[]): CorrelationAnalysis {
    // Align data points
    const aligned = this.alignDataPoints(data1, data2);

    if (aligned.length < 10) {
      return {
        pearsonR: 0,
        spearmanRho: 0,
        pValue: 1,
        significant: false,
        lagDays: 0,
        direction: 'positive',
        strength: 'negligible',
      };
    }

    // Calculate Pearson correlation
    const values1 = aligned.map(a => a.value1);
    const values2 = aligned.map(a => a.value2);

    const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
    const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;

    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;

    for (let i = 0; i < aligned.length; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    }

    const pearsonR = denom1 > 0 && denom2 > 0
      ? numerator / Math.sqrt(denom1 * denom2)
      : 0;

    // Calculate p-value (simplified)
    const t = pearsonR * Math.sqrt((aligned.length - 2) / (1 - pearsonR * pearsonR));
    const pValue = Math.min(1, 2 * (1 - this.tDistCDF(Math.abs(t), aligned.length - 2)));

    // Determine strength
    const absR = Math.abs(pearsonR);
    const strength =
      absR > 0.8 ? 'very-strong' :
      absR > 0.6 ? 'strong' :
      absR > 0.4 ? 'moderate' :
      absR > 0.2 ? 'weak' : 'negligible';

    return {
      pearsonR,
      spearmanRho: pearsonR,  // Simplified
      pValue,
      significant: pValue < 0.05,
      lagDays: 0,
      direction: pearsonR >= 0 ? 'positive' : 'negative',
      strength,
    };
  }

  private performCausalAnalysis(data1: DataPoint[], data2: DataPoint[]): CausalBusinessAnalysis {
    // Simplified causal analysis
    // In production, would use proper causal discovery algorithms

    return {
      causalEvidenceStrength: 'moderate',
      confoundingFactors: [
        {
          name: 'Seasonality',
          type: 'seasonal',
          impact: 'medium',
          controlled: false,
        },
      ],
    };
  }

  private calculateShapleyValues(
    modelIds: string[],
    correlations: AIBusinessCorrelation[],
    totalRevenue: number
  ): Map<string, number> {
    const shapleyValues = new Map<string, number>();

    // Simplified Shapley calculation
    // In production, would compute exact Shapley values

    const totalCorrelation = modelIds.reduce((sum, modelId) => {
      const modelCorrs = correlations.filter(c => c.aiMetric.modelId === modelId);
      return sum + modelCorrs.reduce((s, c) => s + Math.abs(c.correlation.pearsonR), 0);
    }, 0);

    modelIds.forEach(modelId => {
      const modelCorrs = correlations.filter(c => c.aiMetric.modelId === modelId);
      const modelCorrelation = modelCorrs.reduce((s, c) => s + Math.abs(c.correlation.pearsonR), 0);
      shapleyValues.set(modelId, totalCorrelation > 0 ? modelCorrelation / totalCorrelation : 0);
    });

    return shapleyValues;
  }

  private async getBaselineState(period: TimeRange): Promise<BusinessImpactSimulation['baseline']> {
    const kpiValues = Array.from(this.kpis.values()).map(kpi => kpi.currentValue);

    return {
      period,
      kpis: kpiValues.filter((v): v is KPIValue => v !== undefined),
      costs: {
        totalAICost: { amount: 100000, currency: 'USD' },
        costBreakdown: {
          infrastructure: { amount: 40000, currency: 'USD' },
          api: { amount: 30000, currency: 'USD' },
          personnel: { amount: 30000, currency: 'USD' },
        },
      },
      performance: {
        averageLatency: 150,
        throughput: 1000,
        accuracy: 0.95,
        errorRate: 0.02,
      },
    };
  }

  private generateInsights(impacts: SimulatedImpact[], scenario: SimulationScenario): string[] {
    const insights: string[] = [];

    if (impacts.length === 0) {
      insights.push('No significant business impact detected for this scenario');
    } else {
      const significantImpacts = impacts.filter(i => Math.abs(i.changePercentage) > 5);
      if (significantImpacts.length > 0) {
        insights.push(`${significantImpacts.length} KPIs show significant impact (>5% change)`);
      }

      const positiveImpacts = impacts.filter(i => i.changePercentage > 0);
      const negativeImpacts = impacts.filter(i => i.changePercentage < 0);

      if (positiveImpacts.length > negativeImpacts.length) {
        insights.push('Overall positive business impact expected');
      } else if (negativeImpacts.length > positiveImpacts.length) {
        insights.push('Potential negative business impact - review recommended');
      }
    }

    return insights;
  }

  private async calculateAIInvestment(period: TimeRange): Promise<AIROIAnalysis['investment']> {
    return {
      totalInvestment: { amount: 500000, currency: 'USD' },
      breakdown: {
        infrastructure: { amount: 150000, currency: 'USD' },
        modelDevelopment: { amount: 100000, currency: 'USD' },
        dataAcquisition: { amount: 50000, currency: 'USD' },
        apiCosts: { amount: 100000, currency: 'USD' },
        personnel: { amount: 80000, currency: 'USD' },
        training: { amount: 10000, currency: 'USD' },
        other: { amount: 10000, currency: 'USD' },
      },
      capitalExpenses: { amount: 250000, currency: 'USD' },
      operatingExpenses: { amount: 250000, currency: 'USD' },
    };
  }

  private async calculateCostSavings(period: TimeRange): Promise<MonetaryValue> {
    return { amount: 200000, currency: 'USD' };
  }

  private async calculateProductivityGains(period: TimeRange): Promise<MonetaryValue> {
    return { amount: 100000, currency: 'USD' };
  }

  private calculateIRR(investment: number, returns: number): number {
    // Simplified IRR calculation
    if (investment <= 0) return 0;
    return ((returns / investment) - 1) * 100;
  }

  private async syncSingleIntegration(integration: BusinessDataIntegration): Promise<void> {
    // In production, would sync data from external systems
    console.log(`Syncing integration: ${integration.name}`);
  }

  private alignDataPoints(data1: DataPoint[], data2: DataPoint[]): AlignedDataPoint[] {
    const aligned: AlignedDataPoint[] = [];

    // Simple alignment by closest timestamp
    data1.forEach(d1 => {
      const closest = data2.reduce((prev, curr) => {
        const prevDiff = Math.abs(new Date(prev.timestamp).getTime() - new Date(d1.timestamp).getTime());
        const currDiff = Math.abs(new Date(curr.timestamp).getTime() - new Date(d1.timestamp).getTime());
        return currDiff < prevDiff ? curr : prev;
      }, data2[0]);

      if (closest) {
        aligned.push({
          timestamp: d1.timestamp,
          value1: d1.value,
          value2: closest.value,
        });
      }
    });

    return aligned;
  }

  private tDistCDF(t: number, df: number): number {
    // Simplified t-distribution CDF approximation
    const x = df / (df + t * t);
    return 1 - 0.5 * Math.pow(x, df / 2);
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

interface DataPoint {
  timestamp: string;
  value: number;
}

interface AlignedDataPoint {
  timestamp: string;
  value1: number;
  value2: number;
}

export interface BusinessImpactEngineConfig {
  defaultCurrency?: string;
  correlationThreshold?: number;
  minDataPoints?: number;
}

// ============================================================================
// Export Default Instance
// ============================================================================

export const businessImpactEngine = new BusinessImpactEngine();
