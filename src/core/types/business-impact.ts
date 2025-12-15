/**
 * Business Outcome Correlation Engine Types
 *
 * Types for connecting AI metrics to business KPIs and revenue impact.
 * Enables C-level visibility into AI value creation.
 *
 * @module business-impact
 */

import {
  UUID,
  ISO8601,
  NormalizedScore,
  JSONObject,
  TimeRange,
  TrendIndicator,
} from './common';

// ============================================================================
// Business KPI Types
// ============================================================================

/**
 * Business KPI Definition
 */
export interface BusinessKPI {
  id: UUID;
  name: string;
  description: string;
  category: KPICategory;

  /** How this KPI is measured */
  measurement: KPIMeasurement;
  /** Data source for this KPI */
  dataSource: KPIDataSource;

  /** Target values */
  targets: KPITarget[];
  /** Current value */
  currentValue: KPIValue;
  /** Historical values */
  history: KPIHistoryPoint[];

  /** Business context */
  businessContext: BusinessContext;
  /** Stakeholders interested in this KPI */
  stakeholders: string[];
}

export type KPICategory =
  | 'revenue'
  | 'cost'
  | 'efficiency'
  | 'quality'
  | 'customer-satisfaction'
  | 'conversion'
  | 'retention'
  | 'engagement'
  | 'operational'
  | 'risk'
  | 'compliance';

export interface KPIMeasurement {
  type: 'absolute' | 'percentage' | 'ratio' | 'index' | 'score';
  unit: string;
  aggregation: 'sum' | 'average' | 'median' | 'min' | 'max' | 'count' | 'rate';
  frequency: 'real-time' | 'hourly' | 'daily' | 'weekly' | 'monthly';
}

export interface KPIDataSource {
  type: 'crm' | 'erp' | 'analytics' | 'database' | 'api' | 'manual' | 'calculated';
  system: string;
  query?: string;
  refreshInterval: number;  // seconds
  lastRefresh: ISO8601;
}

export interface KPITarget {
  period: TimeRange;
  value: number;
  type: 'minimum' | 'maximum' | 'exact' | 'range';
  range?: { min: number; max: number };
}

export interface KPIValue {
  value: number;
  timestamp: ISO8601;
  confidence: NormalizedScore;
  trend: TrendIndicator;
}

export interface KPIHistoryPoint {
  timestamp: ISO8601;
  value: number;
  annotations?: string[];
}

export interface BusinessContext {
  businessUnit: string;
  product?: string;
  region?: string;
  segment?: string;
  strategicInitiative?: string;
}

// ============================================================================
// AI-Business Correlation Types
// ============================================================================

/**
 * Correlation between AI metrics and Business KPIs
 */
export interface AIBusinessCorrelation {
  id: UUID;
  createdAt: ISO8601;
  updatedAt: ISO8601;

  /** AI metric being correlated */
  aiMetric: AIMetricReference;
  /** Business KPI being correlated */
  businessKPI: BusinessKPIReference;

  /** Correlation analysis */
  correlation: CorrelationAnalysis;
  /** Causal analysis (if available) */
  causalAnalysis?: CausalBusinessAnalysis;

  /** Time range of analysis */
  analysisWindow: TimeRange;
  /** Confidence in the correlation */
  confidence: NormalizedScore;
  /** Is this correlation validated? */
  validated: boolean;
  validatedBy?: string;
  validatedAt?: ISO8601;
}

export interface AIMetricReference {
  modelId: UUID;
  modelName: string;
  metricType: AIMetricType;
  metricName: string;
}

export type AIMetricType =
  | 'accuracy'
  | 'latency'
  | 'throughput'
  | 'drift-score'
  | 'reliability-score'
  | 'hallucination-rate'
  | 'cost-per-inference'
  | 'error-rate'
  | 'confidence-score'
  | 'custom';

export interface BusinessKPIReference {
  kpiId: UUID;
  kpiName: string;
  category: KPICategory;
}

export interface CorrelationAnalysis {
  /** Pearson correlation coefficient */
  pearsonR: number;
  /** Spearman rank correlation */
  spearmanRho: number;
  /** P-value for statistical significance */
  pValue: number;
  /** Is the correlation statistically significant? */
  significant: boolean;
  /** Lag between AI metric change and KPI change */
  lagDays: number;
  /** Direction of correlation */
  direction: 'positive' | 'negative';
  /** Strength classification */
  strength: 'very-strong' | 'strong' | 'moderate' | 'weak' | 'negligible';
}

export interface CausalBusinessAnalysis {
  /** Is there evidence of causal relationship? */
  causalEvidenceStrength: 'strong' | 'moderate' | 'weak' | 'none';
  /** Granger causality test result */
  grangerCausality?: GrangerResult;
  /** Intervention analysis (if A/B test data available) */
  interventionAnalysis?: InterventionResult;
  /** Confounding factors identified */
  confoundingFactors: ConfoundingFactor[];
  /** Causal graph path */
  causalPath?: CausalPathStep[];
}

export interface GrangerResult {
  fStatistic: number;
  pValue: number;
  optimalLag: number;
  bidirectional: boolean;
}

export interface InterventionResult {
  experimentId?: string;
  treatmentEffect: number;
  confidenceInterval: { lower: number; upper: number };
  sampleSize: number;
}

export interface ConfoundingFactor {
  name: string;
  type: 'seasonal' | 'trend' | 'external-event' | 'other-metric' | 'market';
  impact: 'high' | 'medium' | 'low';
  controlled: boolean;
}

export interface CausalPathStep {
  from: string;
  to: string;
  mechanism: string;
  strength: NormalizedScore;
}

// ============================================================================
// Revenue Attribution Types
// ============================================================================

/**
 * Revenue Attribution to AI Models
 */
export interface AIRevenueAttribution {
  id: UUID;
  period: TimeRange;
  generatedAt: ISO8601;

  /** Total revenue in period */
  totalRevenue: MonetaryValue;
  /** Revenue attributed to AI systems */
  aiAttributedRevenue: MonetaryValue;
  /** Attribution percentage */
  aiAttributionPercentage: number;

  /** Breakdown by model */
  modelBreakdown: ModelRevenueBreakdown[];
  /** Breakdown by use case */
  useCaseBreakdown: UseCaseRevenueBreakdown[];
  /** Breakdown by feature */
  featureBreakdown: FeatureRevenueBreakdown[];

  /** Attribution methodology */
  methodology: AttributionMethodology;
  /** Confidence score */
  confidence: NormalizedScore;
}

export interface MonetaryValue {
  amount: number;
  currency: string;
}

export interface ModelRevenueBreakdown {
  modelId: UUID;
  modelName: string;
  revenue: MonetaryValue;
  percentage: number;
  shapleyValue: number;
  confidence: NormalizedScore;
  contributingFactors: ContributingFactor[];
}

export interface UseCaseRevenueBreakdown {
  useCaseId: string;
  useCaseName: string;
  revenue: MonetaryValue;
  percentage: number;
  modelsInvolved: UUID[];
  customerSegment?: string;
}

export interface FeatureRevenueBreakdown {
  featureId: string;
  featureName: string;
  revenue: MonetaryValue;
  percentage: number;
  aiEnabled: boolean;
  uplift?: number;  // Revenue uplift vs non-AI baseline
}

export interface ContributingFactor {
  factor: string;
  impact: number;
  direction: 'positive' | 'negative';
}

export interface AttributionMethodology {
  type: 'shapley' | 'last-touch' | 'first-touch' | 'linear' | 'time-decay' | 'custom';
  description: string;
  parameters: JSONObject;
  limitations: string[];
}

// ============================================================================
// Business Impact Simulation Types
// ============================================================================

/**
 * What-if Business Impact Simulation
 */
export interface BusinessImpactSimulation {
  id: UUID;
  createdAt: ISO8601;
  createdBy: string;

  /** Scenario being simulated */
  scenario: SimulationScenario;
  /** Baseline state */
  baseline: BaselineState;
  /** Simulated impacts */
  impacts: SimulatedImpact[];
  /** Overall summary */
  summary: SimulationSummary;

  /** Methodology used */
  methodology: string;
  /** Assumptions made */
  assumptions: string[];
  /** Confidence in simulation */
  confidence: NormalizedScore;
}

export interface SimulationScenario {
  name: string;
  description: string;
  type: ScenarioType;
  changes: ScenarioChange[];
  timeHorizon: TimeRange;
}

export type ScenarioType =
  | 'model-improvement'
  | 'model-degradation'
  | 'new-model-deployment'
  | 'model-retirement'
  | 'infrastructure-change'
  | 'cost-optimization'
  | 'scaling';

export interface ScenarioChange {
  targetType: 'model' | 'infrastructure' | 'process' | 'team';
  targetId: string;
  metric: string;
  currentValue: number;
  newValue: number;
  changePercentage: number;
}

export interface BaselineState {
  period: TimeRange;
  kpis: KPIValue[];
  costs: CostBaseline;
  performance: PerformanceBaseline;
}

export interface CostBaseline {
  totalAICost: MonetaryValue;
  costBreakdown: Record<string, MonetaryValue>;
}

export interface PerformanceBaseline {
  averageLatency: number;
  throughput: number;
  accuracy: number;
  errorRate: number;
}

export interface SimulatedImpact {
  kpiId: UUID;
  kpiName: string;
  currentValue: number;
  projectedValue: number;
  changeAbsolute: number;
  changePercentage: number;
  confidenceInterval: { lower: number; upper: number };
  timeToPeakImpact: number;  // days
}

export interface SimulationSummary {
  netRevenueImpact: MonetaryValue;
  netCostImpact: MonetaryValue;
  roi: number;
  paybackPeriodDays: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: 'proceed' | 'caution' | 'avoid';
  keyInsights: string[];
}

// ============================================================================
// ROI Analysis Types
// ============================================================================

/**
 * AI Investment ROI Analysis
 */
export interface AIROIAnalysis {
  id: UUID;
  name: string;
  period: TimeRange;
  generatedAt: ISO8601;

  /** Investment details */
  investment: AIInvestment;
  /** Returns generated */
  returns: AIReturns;
  /** ROI calculations */
  roiMetrics: ROIMetrics;

  /** Breakdown by initiative */
  initiativeBreakdown: InitiativeROI[];
  /** Comparison with benchmarks */
  benchmarkComparison?: BenchmarkComparison;
}

export interface AIInvestment {
  totalInvestment: MonetaryValue;
  breakdown: InvestmentBreakdown;
  capitalExpenses: MonetaryValue;
  operatingExpenses: MonetaryValue;
}

export interface InvestmentBreakdown {
  infrastructure: MonetaryValue;
  modelDevelopment: MonetaryValue;
  dataAcquisition: MonetaryValue;
  apiCosts: MonetaryValue;
  personnel: MonetaryValue;
  training: MonetaryValue;
  other: MonetaryValue;
}

export interface AIReturns {
  totalReturns: MonetaryValue;
  directRevenue: MonetaryValue;
  costSavings: MonetaryValue;
  productivityGains: MonetaryValue;
  riskReduction: MonetaryValue;
  intangibleBenefits: IntangibleBenefit[];
}

export interface IntangibleBenefit {
  name: string;
  description: string;
  estimatedValue?: MonetaryValue;
  confidence: NormalizedScore;
}

export interface ROIMetrics {
  roi: number;  // percentage
  netPresentValue: MonetaryValue;
  internalRateOfReturn: number;
  paybackPeriodMonths: number;
  costPerInference: MonetaryValue;
  revenuePerInference: MonetaryValue;
  marginPerInference: MonetaryValue;
}

export interface InitiativeROI {
  initiativeId: string;
  initiativeName: string;
  investment: MonetaryValue;
  returns: MonetaryValue;
  roi: number;
  status: 'profitable' | 'break-even' | 'loss-making' | 'investing';
}

export interface BenchmarkComparison {
  industryAverage: ROIBenchmark;
  topQuartile: ROIBenchmark;
  yourPosition: 'top-quartile' | 'above-average' | 'average' | 'below-average';
}

export interface ROIBenchmark {
  roi: number;
  paybackMonths: number;
  source: string;
  year: number;
}

// ============================================================================
// Cost of Quality Types
// ============================================================================

/**
 * Cost of AI Quality Issues
 */
export interface CostOfQuality {
  id: UUID;
  period: TimeRange;
  generatedAt: ISO8601;

  /** Total cost of quality issues */
  totalCost: MonetaryValue;

  /** Breakdown by category */
  preventionCosts: QualityCostCategory;
  appraisalCosts: QualityCostCategory;
  internalFailureCosts: QualityCostCategory;
  externalFailureCosts: QualityCostCategory;

  /** Cost per error type */
  errorTypeCosts: ErrorTypeCost[];
  /** Impact on business KPIs */
  kpiImpacts: QualityKPIImpact[];

  /** Recommendations */
  recommendations: QualityRecommendation[];
}

export interface QualityCostCategory {
  name: string;
  totalCost: MonetaryValue;
  items: QualityCostItem[];
}

export interface QualityCostItem {
  name: string;
  description: string;
  cost: MonetaryValue;
  frequency: number;
  trend: TrendIndicator;
}

export interface ErrorTypeCost {
  errorType: string;
  occurrences: number;
  totalCost: MonetaryValue;
  costPerOccurrence: MonetaryValue;
  customerImpact: 'high' | 'medium' | 'low';
  preventable: boolean;
}

export interface QualityKPIImpact {
  kpiId: UUID;
  kpiName: string;
  impactType: 'revenue-loss' | 'cost-increase' | 'efficiency-loss' | 'reputation';
  estimatedImpact: MonetaryValue;
  confidence: NormalizedScore;
}

export interface QualityRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedSavings: MonetaryValue;
  implementationCost: MonetaryValue;
  roi: number;
  timeToImplementDays: number;
}

// ============================================================================
// Executive Dashboard Types
// ============================================================================

/**
 * Executive AI Dashboard Data
 */
export interface ExecutiveAIDashboard {
  generatedAt: ISO8601;
  period: TimeRange;

  /** Key financial metrics */
  financialSummary: FinancialSummary;
  /** AI health overview */
  aiHealthOverview: AIHealthOverview;
  /** Strategic initiatives status */
  strategicInitiatives: StrategicInitiativeStatus[];
  /** Risk summary */
  riskSummary: ExecutiveRiskSummary;
  /** Recommendations */
  executiveRecommendations: ExecutiveRecommendation[];
}

export interface FinancialSummary {
  aiInvestmentYTD: MonetaryValue;
  aiRevenueYTD: MonetaryValue;
  aiCostSavingsYTD: MonetaryValue;
  currentROI: number;
  projectedEOYROI: number;
  budgetUtilization: number;
  trend: TrendIndicator;
}

export interface AIHealthOverview {
  overallHealthScore: NormalizedScore;
  modelCount: number;
  modelsHealthy: number;
  modelsDegraded: number;
  modelsCritical: number;
  uptime: number;
  incidentsThisMonth: number;
  incidentsTrend: TrendIndicator;
}

export interface StrategicInitiativeStatus {
  id: string;
  name: string;
  status: 'on-track' | 'at-risk' | 'delayed' | 'completed';
  progress: number;
  expectedROI: number;
  actualROI?: number;
  keyMilestones: MilestoneStatus[];
}

export interface MilestoneStatus {
  name: string;
  dueDate: ISO8601;
  status: 'completed' | 'on-track' | 'at-risk' | 'missed';
}

export interface ExecutiveRiskSummary {
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  topRisks: TopRisk[];
  complianceStatus: 'compliant' | 'gaps-identified' | 'non-compliant';
  auditReadiness: NormalizedScore;
}

export interface TopRisk {
  title: string;
  category: string;
  impact: string;
  mitigation: string;
  owner: string;
}

export interface ExecutiveRecommendation {
  priority: 'immediate' | 'short-term' | 'medium-term';
  title: string;
  rationale: string;
  expectedImpact: string;
  resourcesRequired: string;
  sponsor?: string;
}

// ============================================================================
// Integration Types
// ============================================================================

/**
 * External System Integration for Business Data
 */
export interface BusinessDataIntegration {
  id: UUID;
  name: string;
  type: IntegrationType;
  status: 'active' | 'inactive' | 'error';

  /** Connection details */
  connection: ConnectionConfig;
  /** Data mappings */
  mappings: DataMapping[];
  /** Sync configuration */
  syncConfig: SyncConfiguration;

  /** Last sync status */
  lastSync?: SyncStatus;
}

export type IntegrationType =
  | 'salesforce'
  | 'hubspot'
  | 'sap'
  | 'oracle-erp'
  | 'netsuite'
  | 'bigquery'
  | 'snowflake'
  | 'looker'
  | 'tableau'
  | 'custom-api';

export interface ConnectionConfig {
  endpoint: string;
  authType: 'oauth2' | 'api-key' | 'basic' | 'jwt';
  credentials: string;  // Reference to secret
  timeout: number;
  retryPolicy: RetryPolicy;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
}

export interface DataMapping {
  sourceField: string;
  targetField: string;
  transformation?: string;
  required: boolean;
}

export interface SyncConfiguration {
  frequency: 'real-time' | 'hourly' | 'daily' | 'weekly';
  batchSize: number;
  incrementalSync: boolean;
  lastSyncKey?: string;
}

export interface SyncStatus {
  startedAt: ISO8601;
  completedAt?: ISO8601;
  status: 'running' | 'completed' | 'failed';
  recordsProcessed: number;
  recordsFailed: number;
  errorMessage?: string;
}
