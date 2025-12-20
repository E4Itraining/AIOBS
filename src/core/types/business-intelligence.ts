/**
 * Business Intelligence Layer Types
 *
 * Comprehensive type definitions for business impact analysis,
 * revenue attribution, ROI calculation, and executive reporting.
 */

import { ISO8601, UUID, NormalizedScore, TrendIndicator, TimeRange } from './common';

// ============================================================================
// Business KPIs & Metrics
// ============================================================================

/** Business KPI definition */
export interface BusinessKPI {
  id: UUID;
  code: string;
  name: string;
  description: string;
  category: KPICategory;
  type: 'currency' | 'percentage' | 'count' | 'ratio' | 'score';
  unit?: string;
  direction: 'higher-is-better' | 'lower-is-better' | 'target';
  target?: number;
  threshold?: KPIThreshold;
  calculation: KPICalculation;
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  owner?: string;
  tags?: string[];
}

export type KPICategory =
  | 'revenue'
  | 'cost'
  | 'efficiency'
  | 'quality'
  | 'customer'
  | 'operational'
  | 'risk'
  | 'growth';

export interface KPIThreshold {
  critical: number;
  warning: number;
  good: number;
  excellent?: number;
}

export interface KPICalculation {
  formula: string;
  inputs: string[];
  aggregation: 'sum' | 'avg' | 'max' | 'min' | 'count' | 'custom';
  timeWindow?: number; // hours
}

/** KPI measurement */
export interface KPIMeasurement {
  kpiId: UUID;
  timestamp: ISO8601;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  trend: TrendIndicator;
  breakdown?: KPIBreakdown[];
}

export interface KPIBreakdown {
  dimension: string;
  value: number;
  percentage: NormalizedScore;
}

// ============================================================================
// Revenue Attribution
// ============================================================================

/** Revenue attribution model */
export interface RevenueAttribution {
  id: UUID;
  modelId: UUID;
  period: TimeRange;
  method: AttributionMethod;
  confidence: NormalizedScore;
  summary: RevenueSummary;
  breakdown: RevenueBreakdown;
  comparison?: RevenueComparison;
  insights: RevenueInsight[];
}

export type AttributionMethod =
  | 'shapley'
  | 'last-touch'
  | 'first-touch'
  | 'linear'
  | 'time-decay'
  | 'position-based'
  | 'data-driven'
  | 'custom';

export interface RevenueSummary {
  totalRevenue: number;
  attributedRevenue: number;
  attributionRate: NormalizedScore;
  currency: string;
  transactions: number;
  avgTransactionValue: number;
  revenuePerInference: number;
}

export interface RevenueBreakdown {
  byModel: ModelRevenue[];
  byChannel: ChannelRevenue[];
  bySegment: SegmentRevenue[];
  byProduct: ProductRevenue[];
  byRegion: RegionRevenue[];
  byTimeOfDay: TimeDistribution[];
}

export interface ModelRevenue {
  modelId: UUID;
  modelName: string;
  revenue: number;
  percentage: NormalizedScore;
  transactions: number;
  conversionRate: NormalizedScore;
  avgOrderValue: number;
  trend: TrendIndicator;
}

export interface ChannelRevenue {
  channel: string;
  revenue: number;
  percentage: NormalizedScore;
  transactions: number;
}

export interface SegmentRevenue {
  segment: string;
  revenue: number;
  percentage: NormalizedScore;
  customers: number;
  avgLifetimeValue: number;
}

export interface ProductRevenue {
  productId: string;
  productName: string;
  revenue: number;
  percentage: NormalizedScore;
  aiInfluence: NormalizedScore;
}

export interface RegionRevenue {
  region: string;
  revenue: number;
  percentage: NormalizedScore;
  currency: string;
}

export interface TimeDistribution {
  hour: number;
  revenue: number;
  transactions: number;
}

export interface RevenueComparison {
  previousPeriod: RevenueSummary;
  revenueChange: number;
  revenueChangePercent: number;
  transactionsChange: number;
  avgValueChange: number;
}

export interface RevenueInsight {
  type: 'opportunity' | 'risk' | 'trend' | 'anomaly';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: number;
  recommendation?: string;
  relatedModels?: UUID[];
}

// ============================================================================
// Cost-Benefit Analysis
// ============================================================================

/** Cost-benefit analysis */
export interface CostBenefitAnalysis {
  id: UUID;
  period: TimeRange;
  scope: AnalysisScope;
  costs: CostStructure;
  benefits: BenefitStructure;
  roi: ROIAnalysis;
  breakeven: BreakevenAnalysis;
  sensitivity: SensitivityAnalysis;
  recommendations: CBARecommendation[];
}

export interface AnalysisScope {
  type: 'model' | 'pipeline' | 'project' | 'department' | 'enterprise';
  resourceIds: UUID[];
  includeIndirect: boolean;
}

export interface CostStructure {
  totalCost: number;
  currency: string;
  categories: CostCategory[];
  timeline: CostTimeline[];
  fixed: number;
  variable: number;
}

export interface CostCategory {
  category: string;
  amount: number;
  percentage: NormalizedScore;
  type: 'fixed' | 'variable' | 'semi-variable';
  subcategories?: CostSubcategory[];
}

export interface CostSubcategory {
  name: string;
  amount: number;
  percentage: NormalizedScore;
}

export interface CostTimeline {
  period: string;
  cost: number;
  breakdown: Record<string, number>;
}

export interface BenefitStructure {
  totalBenefit: number;
  currency: string;
  categories: BenefitCategory[];
  timeline: BenefitTimeline[];
  quantified: number;
  estimated: number;
}

export interface BenefitCategory {
  category: BenefitType;
  amount: number;
  percentage: NormalizedScore;
  confidence: NormalizedScore;
  methodology: string;
}

export type BenefitType =
  | 'revenue-increase'
  | 'cost-reduction'
  | 'efficiency-gain'
  | 'risk-reduction'
  | 'quality-improvement'
  | 'time-savings'
  | 'customer-satisfaction';

export interface BenefitTimeline {
  period: string;
  benefit: number;
  breakdown: Record<string, number>;
}

/** ROI Analysis */
export interface ROIAnalysis {
  roi: number; // percentage
  roiAnnualized?: number;
  netPresentValue: number;
  internalRateOfReturn?: number;
  paybackPeriod: number; // months
  profitabilityIndex: number;
  confidenceInterval: [number, number];
}

/** Breakeven Analysis */
export interface BreakevenAnalysis {
  breakevenPoint: number;
  breakevenDate?: ISO8601;
  currentPosition: 'pre-breakeven' | 'at-breakeven' | 'post-breakeven';
  daysToBreakeven?: number;
  marginOfSafety?: number;
}

/** Sensitivity Analysis */
export interface SensitivityAnalysis {
  baseCase: ROIAnalysis;
  scenarios: SensitivityScenario[];
  criticalVariables: CriticalVariable[];
}

export interface SensitivityScenario {
  name: string;
  type: 'optimistic' | 'pessimistic' | 'custom';
  assumptions: Record<string, number>;
  roi: number;
  npv: number;
}

export interface CriticalVariable {
  variable: string;
  sensitivity: number; // % change in ROI per % change in variable
  breakeven: number; // value at which ROI = 0
  recommendation: string;
}

export interface CBARecommendation {
  priority: 'high' | 'medium' | 'low';
  type: 'cost-reduction' | 'benefit-increase' | 'risk-mitigation' | 'optimization';
  title: string;
  description: string;
  impact: number;
  effort: 'low' | 'medium' | 'high';
  timeline: string;
}

// ============================================================================
// Impact Simulation
// ============================================================================

/** Impact simulation request */
export interface ImpactSimulationRequest {
  id: UUID;
  type: SimulationType;
  scenario: SimulationScenario;
  targets: SimulationTarget[];
  timeHorizon: number; // days
  iterations?: number;
}

export type SimulationType =
  | 'model-improvement'
  | 'model-degradation'
  | 'scaling'
  | 'cost-change'
  | 'market-change'
  | 'what-if';

export interface SimulationScenario {
  name: string;
  description: string;
  changes: ScenarioChange[];
  assumptions: Record<string, unknown>;
}

export interface ScenarioChange {
  type: 'metric' | 'parameter' | 'external';
  target: string;
  change: number | string;
  changeType: 'absolute' | 'percentage' | 'value';
}

export interface SimulationTarget {
  type: 'kpi' | 'revenue' | 'cost' | 'metric';
  id: string;
  name: string;
}

/** Impact simulation result */
export interface ImpactSimulationResult {
  id: UUID;
  requestId: UUID;
  timestamp: ISO8601;
  scenario: string;
  projections: ImpactProjection[];
  riskAssessment: RiskAssessment;
  confidence: NormalizedScore;
  recommendations: ImpactRecommendation[];
}

export interface ImpactProjection {
  target: string;
  baseline: ProjectionValue;
  projected: ProjectionValue;
  impact: ImpactMetrics;
  timeline: ProjectionTimeline[];
}

export interface ProjectionValue {
  value: number;
  confidence: NormalizedScore;
  range: [number, number];
}

export interface ImpactMetrics {
  absoluteChange: number;
  percentChange: number;
  significance: 'high' | 'medium' | 'low' | 'negligible';
  timeToRealize: number; // days
}

export interface ProjectionTimeline {
  date: ISO8601;
  value: number;
  confidence: NormalizedScore;
}

export interface RiskAssessment {
  overallRisk: 'high' | 'medium' | 'low';
  factors: RiskFactor[];
  mitigations: RiskMitigation[];
}

export interface RiskFactor {
  factor: string;
  probability: NormalizedScore;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

export interface RiskMitigation {
  risk: string;
  strategy: string;
  effectiveness: NormalizedScore;
  cost?: number;
}

export interface ImpactRecommendation {
  priority: 'immediate' | 'short-term' | 'long-term';
  action: string;
  expectedImpact: string;
  resources: string;
  dependencies?: string[];
}

// ============================================================================
// Correlation Analysis
// ============================================================================

/** AI metric to business KPI correlation */
export interface MetricKPICorrelation {
  id: UUID;
  aiMetric: MetricInfo;
  businessKPI: KPIInfo;
  correlation: CorrelationResult;
  causalAnalysis?: CausalResult;
  recommendations: CorrelationRecommendation[];
}

export interface MetricInfo {
  id: string;
  name: string;
  type: string;
  model?: UUID;
}

export interface KPIInfo {
  id: UUID;
  name: string;
  category: KPICategory;
}

export interface CorrelationResult {
  coefficient: number; // -1 to 1
  pValue: number;
  significance: 'strong' | 'moderate' | 'weak' | 'none';
  relationship: 'positive' | 'negative' | 'none';
  lagDays: number;
  r2: number;
  sampleSize: number;
  confidenceInterval: [number, number];
}

export interface CausalResult {
  isCausal: boolean;
  confidence: NormalizedScore;
  direction: 'metric-to-kpi' | 'kpi-to-metric' | 'bidirectional' | 'unknown';
  confounders?: string[];
  methodology: string;
}

export interface CorrelationRecommendation {
  type: 'optimize' | 'monitor' | 'investigate';
  priority: 'high' | 'medium' | 'low';
  description: string;
  expectedImpact: string;
}

// ============================================================================
// Executive Dashboard & Reports
// ============================================================================

/** Executive dashboard data */
export interface ExecutiveDashboard {
  timestamp: ISO8601;
  period: TimeRange;
  summary: ExecutiveSummary;
  kpis: ExecutiveKPI[];
  aiPerformance: AIPerformanceSummary;
  financials: FinancialSummary;
  risks: RiskSummary;
  recommendations: ExecutiveRecommendation[];
}

export interface ExecutiveSummary {
  headline: string;
  keyInsights: string[];
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
  trend: TrendIndicator;
  alertCount: number;
  criticalIssues: number;
}

export interface ExecutiveKPI {
  kpi: BusinessKPI;
  current: KPIMeasurement;
  target?: number;
  attainment?: NormalizedScore;
  sparkline: number[];
}

export interface AIPerformanceSummary {
  overallScore: NormalizedScore;
  modelsInProduction: number;
  totalInferences: number;
  availability: NormalizedScore;
  qualityScore: NormalizedScore;
  topPerformers: ModelPerformer[];
  attentionNeeded: ModelAttention[];
}

export interface ModelPerformer {
  modelId: UUID;
  modelName: string;
  score: NormalizedScore;
  revenueImpact: number;
}

export interface ModelAttention {
  modelId: UUID;
  modelName: string;
  issue: string;
  severity: 'critical' | 'high' | 'medium';
  recommendation: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  aiAttributedRevenue: number;
  totalCost: number;
  aiCost: number;
  roi: number;
  trend: TrendIndicator;
  budget: BudgetStatus;
}

export interface BudgetStatus {
  allocated: number;
  spent: number;
  remaining: number;
  utilization: NormalizedScore;
  projectedOverrun?: number;
}

export interface RiskSummary {
  overallRisk: 'high' | 'medium' | 'low';
  complianceStatus: 'compliant' | 'at-risk' | 'non-compliant';
  securityPosture: NormalizedScore;
  topRisks: TopRisk[];
}

export interface TopRisk {
  id: UUID;
  title: string;
  category: string;
  severity: 'critical' | 'high' | 'medium';
  status: 'active' | 'mitigating' | 'monitoring';
}

export interface ExecutiveRecommendation {
  priority: 'immediate' | 'high' | 'medium';
  category: 'revenue' | 'cost' | 'risk' | 'efficiency' | 'quality';
  title: string;
  description: string;
  expectedImpact: string;
  investment?: number;
  timeline: string;
}

// ============================================================================
// Report Generation
// ============================================================================

/** Report definition */
export interface ReportDefinition {
  id: UUID;
  name: string;
  type: ReportType;
  description: string;
  sections: ReportSection[];
  schedule?: ReportSchedule;
  recipients?: string[];
  format: 'pdf' | 'html' | 'excel' | 'json';
  branding?: ReportBranding;
}

export type ReportType =
  | 'executive-summary'
  | 'roi-analysis'
  | 'model-performance'
  | 'cost-analysis'
  | 'compliance'
  | 'custom';

export interface ReportSection {
  id: string;
  title: string;
  type: 'text' | 'kpi' | 'chart' | 'table' | 'comparison' | 'recommendation';
  config: Record<string, unknown>;
  order: number;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  timezone: string;
}

export interface ReportBranding {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  footerText?: string;
}

/** Generated report */
export interface GeneratedReport {
  id: UUID;
  definitionId: UUID;
  generatedAt: ISO8601;
  period: TimeRange;
  format: string;
  size: number;
  url: string;
  expiresAt: ISO8601;
  metadata: ReportMetadata;
}

export interface ReportMetadata {
  pages?: number;
  sections: string[];
  dataPoints: number;
  generationTime: number; // milliseconds
}

// ============================================================================
// Business Intelligence Analytics
// ============================================================================

/** BI analytics dashboard */
export interface BIAnalytics {
  timestamp: ISO8601;
  period: TimeRange;
  overview: BIOverview;
  revenueAnalytics: RevenueAnalytics;
  costAnalytics: CostAnalytics;
  performanceAnalytics: PerformanceAnalytics;
  correlations: CorrelationSummary;
  forecasts: ForecastSummary;
}

export interface BIOverview {
  totalRevenue: number;
  aiAttributedRevenue: number;
  totalCost: number;
  netValue: number;
  roi: number;
  modelsContributing: number;
  trend: TrendIndicator;
}

export interface RevenueAnalytics {
  total: number;
  growth: number;
  byModel: ModelRevenue[];
  byChannel: ChannelRevenue[];
  trends: TrendData[];
  seasonality?: SeasonalityPattern[];
}

export interface TrendData {
  date: ISO8601;
  value: number;
  forecast?: number;
}

export interface SeasonalityPattern {
  pattern: string;
  strength: NormalizedScore;
  period: string;
}

export interface CostAnalytics {
  total: number;
  byCategory: CostCategory[];
  efficiency: NormalizedScore;
  optimization: CostOptimization[];
  trends: TrendData[];
}

export interface CostOptimization {
  area: string;
  currentCost: number;
  potentialSavings: number;
  recommendation: string;
  effort: 'low' | 'medium' | 'high';
}

export interface PerformanceAnalytics {
  overallScore: NormalizedScore;
  byModel: ModelPerformanceMetrics[];
  improvements: PerformanceImprovement[];
  degradations: PerformanceDegradation[];
}

export interface ModelPerformanceMetrics {
  modelId: UUID;
  modelName: string;
  score: NormalizedScore;
  metrics: Record<string, number>;
  businessImpact: number;
  trend: TrendIndicator;
}

export interface PerformanceImprovement {
  modelId: UUID;
  metric: string;
  improvement: number;
  businessImpact: number;
}

export interface PerformanceDegradation {
  modelId: UUID;
  metric: string;
  degradation: number;
  businessImpact: number;
  recommendation: string;
}

export interface CorrelationSummary {
  strongCorrelations: MetricKPICorrelation[];
  emergingCorrelations: MetricKPICorrelation[];
  insights: string[];
}

export interface ForecastSummary {
  revenueForecasts: Forecast[];
  costForecasts: Forecast[];
  kpiForecasts: KPIForecast[];
}

export interface Forecast {
  target: string;
  horizon: number; // days
  values: ForecastValue[];
  confidence: NormalizedScore;
  methodology: string;
}

export interface ForecastValue {
  date: ISO8601;
  value: number;
  lowerBound: number;
  upperBound: number;
}

export interface KPIForecast {
  kpiId: UUID;
  kpiName: string;
  forecast: Forecast;
  riskOfMiss?: NormalizedScore;
}
