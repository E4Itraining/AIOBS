/**
 * Game Changer Feature Types for AIOBS
 *
 * These types define the interfaces for AIOBS's differentiating features:
 * - AI Cost Intelligence (FinOps)
 * - Carbon-Aware Scheduling (GreenOps)
 * - Predictive Drift Prevention
 * - Multi-Agent Orchestration Observability
 * - AI Security Posture Management
 * - Business Impact Attribution
 */

import { ISO8601, UUID, NormalizedScore, TimeRange, TrendIndicator } from './common';

// ============================================================================
// AI Cost Intelligence (FinOps)
// ============================================================================

/** AI request for cost prediction and routing */
export interface AIRequest {
  id: UUID;
  type: 'inference' | 'embedding' | 'fine-tuning' | 'batch';
  prompt?: string;
  inputTokens?: number;
  expectedOutputTokens?: number;
  modelPreference?: string[];
  qualityRequirement: 'best' | 'good' | 'acceptable';
  latencyRequirement: 'realtime' | 'fast' | 'batch';
  metadata?: Record<string, unknown>;
}

/** Cost prediction result */
export interface CostPrediction {
  requestId: UUID;
  estimatedCost: number;
  currency: string;
  breakdown: {
    inputTokensCost: number;
    outputTokensCost: number;
    computeCost: number;
    overheadCost: number;
  };
  confidence: NormalizedScore;
  alternatives: ModelCostAlternative[];
}

/** Alternative model cost comparison */
export interface ModelCostAlternative {
  modelId: string;
  provider: string;
  estimatedCost: number;
  qualityScore: NormalizedScore;
  latencyMs: number;
  recommendation: 'recommended' | 'acceptable' | 'not-recommended';
}

/** Model selection result from smart router */
export interface ModelSelection {
  selectedModel: string;
  provider: string;
  reason: string;
  estimatedCost: number;
  estimatedLatency: number;
  qualityScore: NormalizedScore;
  fallbackModels: string[];
}

/** Model arbitrage recommendation */
export interface ModelArbitrage {
  id: UUID;
  timestamp: ISO8601;
  currentModel: string;
  recommendedModel: string;
  potentialSavings: number;
  savingsPercentage: NormalizedScore;
  qualityImpact: 'positive' | 'neutral' | 'negative';
  confidence: NormalizedScore;
  reasoning: string;
}

/** Budget configuration */
export interface Budget {
  id: UUID;
  name: string;
  amount: number;
  currency: string;
  period: 'daily' | 'weekly' | 'monthly';
  alertThresholds: number[]; // e.g., [0.5, 0.8, 0.95]
  scope: BudgetScope;
}

export interface BudgetScope {
  tenantId?: string;
  teamId?: string;
  projectId?: string;
  modelIds?: string[];
  useCases?: string[];
}

/** Fallback strategy when budget exceeded */
export interface FallbackStrategy {
  action: 'degrade' | 'queue' | 'reject' | 'alert-only';
  degradeToModel?: string;
  queueMaxWait?: number; // milliseconds
  notifyChannels?: string[];
}

// ============================================================================
// Carbon-Aware Scheduling (GreenOps)
// ============================================================================

/** Carbon intensity data for a region */
export interface CarbonIntensity {
  region: string;
  timestamp: ISO8601;
  intensity: number; // gCO2eq/kWh
  source: 'grid' | 'forecast' | 'estimate';
  renewablePercentage: NormalizedScore;
  forecast: CarbonForecast[];
}

export interface CarbonForecast {
  timestamp: ISO8601;
  intensity: number;
  confidence: NormalizedScore;
}

/** Batch job for carbon-aware scheduling */
export interface BatchJob {
  id: UUID;
  name: string;
  type: 'training' | 'inference-batch' | 'evaluation' | 'fine-tuning';
  estimatedDuration: number; // milliseconds
  estimatedEnergy: number; // kWh
  deadline?: ISO8601;
  priority: 'critical' | 'high' | 'normal' | 'low';
  constraints?: JobConstraints;
}

export interface JobConstraints {
  requiredRegions?: string[];
  excludedRegions?: string[];
  maxCarbonIntensity?: number;
  preferRenewable?: boolean;
}

/** Scheduled job result */
export interface ScheduledJob {
  job: BatchJob;
  scheduledStart: ISO8601;
  estimatedEnd: ISO8601;
  region: string;
  estimatedCarbonKg: number;
  savingsVsImmediate: {
    carbonKg: number;
    percentage: NormalizedScore;
  };
  alternativeSlots: ScheduleSlot[];
}

export interface ScheduleSlot {
  start: ISO8601;
  end: ISO8601;
  region: string;
  carbonIntensity: number;
  estimatedCarbonKg: number;
}

/** Region recommendation for workload */
export interface RegionRecommendation {
  recommendedRegion: string;
  currentRegion?: string;
  carbonSavings: number; // kg CO2
  latencyImpact: number; // ms
  costImpact: number; // currency
  alternatives: RegionAlternative[];
}

export interface RegionAlternative {
  region: string;
  carbonIntensity: number;
  latencyMs: number;
  costMultiplier: number;
  renewablePercentage: NormalizedScore;
}

/** Carbon certificate for ESG reporting */
export interface CarbonCertificate {
  id: UUID;
  period: TimeRange;
  totalInferences: number;
  totalEnergyKwh: number;
  totalCarbonKg: number;
  carbonPerInference: number; // grams
  renewablePercentage: NormalizedScore;
  offsetCredits: number;
  netCarbonKg: number;
  breakdown: CarbonBreakdown[];
  methodology: string;
  certifiedAt: ISO8601;
}

export interface CarbonBreakdown {
  category: 'inference' | 'training' | 'storage' | 'network';
  energyKwh: number;
  carbonKg: number;
  percentage: NormalizedScore;
}

// ============================================================================
// Predictive Drift Prevention
// ============================================================================

/** Drift forecast result */
export interface DriftForecast {
  modelId: string;
  timestamp: ISO8601;
  currentDriftScore: NormalizedScore;
  forecasts: DriftForecastPoint[];
  trend: TrendIndicator;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  recommendations: DriftRecommendation[];
}

export interface DriftForecastPoint {
  timestamp: ISO8601;
  predictedDriftScore: NormalizedScore;
  confidence: NormalizedScore;
  driftType: 'data' | 'concept' | 'prediction';
}

export interface DriftRecommendation {
  action: 'retrain' | 'tune' | 'rollback' | 'investigate' | 'monitor';
  priority: 'immediate' | 'soon' | 'planned';
  reasoning: string;
  estimatedImpact: string;
}

/** Impact simulation result */
export interface ImpactSimulation {
  modelId: string;
  simulatedDrift: NormalizedScore;
  sloImpacts: SLOImpact[];
  businessImpacts: BusinessImpactEstimate[];
  timeToThreshold: number; // hours until SLO breach
}

export interface SLOImpact {
  sloId: string;
  sloName: string;
  currentCompliance: NormalizedScore;
  projectedCompliance: NormalizedScore;
  breachProbability: NormalizedScore;
  estimatedBreachTime?: ISO8601;
}

export interface BusinessImpactEstimate {
  metric: string;
  currentValue: number;
  projectedValue: number;
  changePercentage: number;
  confidence: NormalizedScore;
}

/** Preventive action for drift */
export interface PreventiveAction {
  id: UUID;
  modelId: string;
  actionType: 'retrain' | 'tune' | 'rollback' | 'scale' | 'alert';
  scheduledTime: ISO8601;
  trigger: 'forecast' | 'threshold' | 'schedule' | 'manual';
  parameters: Record<string, unknown>;
  status: 'scheduled' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
}

/** Retraining plan */
export interface RetrainingPlan {
  modelId: string;
  recommendedDate: ISO8601;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  dataRequirements: DataRequirement[];
  estimatedDuration: number; // hours
  estimatedCost: number;
  expectedImprovement: NormalizedScore;
}

export interface DataRequirement {
  dataType: 'recent' | 'diverse' | 'edge-cases' | 'labeled';
  minimumSamples: number;
  currentAvailable: number;
  gap: number;
}

// ============================================================================
// Multi-Agent Orchestration Observability
// ============================================================================

/** Agent topology graph */
export interface AgentTopologyGraph {
  sessionId: string;
  timestamp: ISO8601;
  agents: AgentNode[];
  connections: AgentConnection[];
  tools: ToolNode[];
  totalLatency: number;
  totalCost: number;
  errorCount: number;
}

export interface AgentNode {
  id: string;
  name: string;
  type: 'orchestrator' | 'worker' | 'specialist' | 'router';
  model: string;
  invocations: number;
  avgLatency: number;
  errorRate: NormalizedScore;
  cost: number;
}

export interface AgentConnection {
  sourceAgentId: string;
  targetAgentId: string;
  messageCount: number;
  avgLatency: number;
  dataVolume: number; // tokens
}

export interface ToolNode {
  id: string;
  name: string;
  type: string;
  invocations: number;
  successRate: NormalizedScore;
  avgLatency: number;
  usedByAgents: string[];
}

/** Decision trace for an agent */
export interface DecisionTrace {
  agentId: string;
  requestId: string;
  timestamp: ISO8601;
  steps: DecisionStep[];
  totalDuration: number;
  outcome: 'success' | 'failure' | 'partial';
  finalOutput?: string;
}

export interface DecisionStep {
  stepId: string;
  timestamp: ISO8601;
  type: 'reasoning' | 'tool-call' | 'agent-call' | 'output';
  input: string;
  output: string;
  duration: number;
  tokenCount: number;
  cost: number;
  metadata?: Record<string, unknown>;
}

/** Anomaly report for agent orchestration */
export interface AnomalyReport {
  sessionId: string;
  timestamp: ISO8601;
  anomalies: AgentAnomaly[];
  overallRisk: 'critical' | 'high' | 'medium' | 'low';
  recommendations: string[];
}

export interface AgentAnomaly {
  type:
    | 'infinite-loop'
    | 'excessive-cost'
    | 'high-latency'
    | 'tool-failure'
    | 'hallucination'
    | 'security-violation';
  severity: 'critical' | 'high' | 'medium' | 'low';
  agentId: string;
  description: string;
  evidence: string[];
  suggestedAction: string;
}

/** A/B comparison of orchestration strategies */
export interface ABComparison {
  experimentId: string;
  strategyA: OrchestrationStrategy;
  strategyB: OrchestrationStrategy;
  metrics: ComparisonMetrics;
  statisticalSignificance: NormalizedScore;
  winner: 'A' | 'B' | 'inconclusive';
  recommendation: string;
}

export interface OrchestrationStrategy {
  id: string;
  name: string;
  description: string;
  agentConfig: Record<string, unknown>;
}

export interface ComparisonMetrics {
  successRate: { a: NormalizedScore; b: NormalizedScore; diff: number };
  avgLatency: { a: number; b: number; diff: number };
  avgCost: { a: number; b: number; diff: number };
  userSatisfaction: { a: NormalizedScore; b: NormalizedScore; diff: number };
}

// ============================================================================
// AI Security Posture Management (AISPM)
// ============================================================================

/** Prompt injection detection result */
export interface InjectionDetection {
  detected: boolean;
  confidence: NormalizedScore;
  type?: 'direct' | 'indirect' | 'jailbreak' | 'data-extraction';
  evidence?: string[];
  sanitizedInput?: string;
  recommendation: 'block' | 'sanitize' | 'flag' | 'allow';
}

/** Data leak scan result */
export interface DataLeakScan {
  hasLeaks: boolean;
  leaks: DataLeak[];
  riskScore: NormalizedScore;
  recommendation: 'block' | 'redact' | 'flag' | 'allow';
  redactedOutput?: string;
}

export interface DataLeak {
  type: 'pii' | 'secret' | 'internal-data' | 'training-data';
  category: string; // e.g., 'email', 'api-key', 'ssn'
  confidence: NormalizedScore;
  location: { start: number; end: number };
  masked: string;
}

/** Security risk score for a model/endpoint */
export interface SecurityRiskScore {
  resourceId: string;
  resourceType: 'model' | 'endpoint' | 'pipeline';
  timestamp: ISO8601;
  overallScore: NormalizedScore;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  factors: RiskFactor[];
  trend: TrendIndicator;
  recommendations: SecurityRecommendation[];
}

export interface RiskFactor {
  name: string;
  score: NormalizedScore;
  weight: NormalizedScore;
  description: string;
  evidence?: string[];
}

export interface SecurityRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

/** Jailbreak detection result */
export interface JailbreakDetection {
  detected: boolean;
  confidence: NormalizedScore;
  technique?: string; // e.g., 'DAN', 'roleplay', 'encoding'
  evidence?: string[];
  conversationRisk: NormalizedScore;
  recommendation: 'block' | 'warn' | 'monitor' | 'allow';
}

// ============================================================================
// Business Impact Attribution
// ============================================================================

/** Revenue attribution to AI models */
export interface RevenueAttribution {
  modelId: string;
  period: TimeRange;
  totalRevenue: number;
  attributedRevenue: number;
  attributionMethod: 'shapley' | 'linear' | 'last-touch' | 'custom';
  confidence: NormalizedScore;
  breakdown: RevenueBreakdown[];
}

export interface RevenueBreakdown {
  category: string;
  revenue: number;
  percentage: NormalizedScore;
  conversionRate: NormalizedScore;
  avgOrderValue: number;
}

/** Correlation between AI metrics and business KPIs */
export interface MetricKPICorrelation {
  aiMetric: string;
  businessKPI: string;
  correlation: number; // -1 to 1
  lagDays: number;
  significance: NormalizedScore;
  relationship: 'positive' | 'negative' | 'none';
  interpretation: string;
}

/** Business impact simulation */
export interface BusinessImpact {
  modelId: string;
  improvement: ModelImprovement;
  projectedImpacts: ProjectedImpact[];
  roi: ROICalculation;
  confidence: NormalizedScore;
  assumptions: string[];
}

export interface ModelImprovement {
  metric: string;
  currentValue: number;
  targetValue: number;
  improvementPercentage: number;
}

export interface ProjectedImpact {
  kpi: string;
  currentValue: number;
  projectedValue: number;
  changePercentage: number;
  timeToRealize: number; // days
}

/** ROI analysis */
export interface ROICalculation {
  useCaseId: string;
  period: TimeRange;
  costs: CostComponent[];
  benefits: BenefitComponent[];
  totalCost: number;
  totalBenefit: number;
  netBenefit: number;
  roi: number; // percentage
  paybackPeriod: number; // days
}

export interface CostComponent {
  category: string;
  amount: number;
  frequency: 'one-time' | 'recurring';
  description: string;
}

export interface BenefitComponent {
  category: string;
  amount: number;
  type: 'revenue' | 'cost-savings' | 'productivity';
  confidence: NormalizedScore;
  description: string;
}

// ============================================================================
// AI Experimentation Platform
// ============================================================================

/** Prompt experiment */
export interface PromptExperiment {
  id: UUID;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'completed' | 'stopped';
  variants: PromptVariant[];
  trafficAllocation: number[]; // percentage per variant
  metrics: ExperimentMetric[];
  startTime?: ISO8601;
  endTime?: ISO8601;
  sampleSize: number;
  minimumDetectableEffect: NormalizedScore;
}

export interface PromptVariant {
  id: string;
  name: string;
  prompt: string;
  systemPrompt?: string;
  parameters?: Record<string, unknown>;
}

export interface ExperimentMetric {
  name: string;
  type: 'primary' | 'secondary' | 'guardrail';
  aggregation: 'mean' | 'median' | 'p95' | 'sum' | 'rate';
  direction: 'higher-is-better' | 'lower-is-better';
}

/** Experiment analysis result */
export interface ExperimentAnalysis {
  experimentId: UUID;
  timestamp: ISO8601;
  status: 'running' | 'conclusive' | 'inconclusive';
  variants: VariantResult[];
  winner?: string;
  statisticalPower: NormalizedScore;
  recommendation: string;
}

export interface VariantResult {
  variantId: string;
  sampleSize: number;
  metrics: Record<
    string,
    {
      value: number;
      stdDev: number;
      confidenceInterval: [number, number];
    }
  >;
  vsControl: {
    relativeLift: number;
    pValue: number;
    significant: boolean;
  };
}

/** Shadow deployment configuration */
export interface ShadowDeployment {
  id: UUID;
  name: string;
  productionModel: ModelConfig;
  shadowModel: ModelConfig;
  trafficPercentage: NormalizedScore;
  comparisonMetrics: string[];
  startTime: ISO8601;
  endTime?: ISO8601;
  status: 'active' | 'paused' | 'completed';
}

export interface ModelConfig {
  modelId: string;
  version: string;
  endpoint: string;
  parameters?: Record<string, unknown>;
}

/** Model comparison result */
export interface ModelComparison {
  models: ModelConfig[];
  testSet: TestSetInfo;
  results: ModelComparisonResult[];
  recommendation: string;
}

export interface TestSetInfo {
  name: string;
  size: number;
  categories: string[];
  description: string;
}

export interface ModelComparisonResult {
  modelId: string;
  metrics: Record<string, number>;
  latencyP50: number;
  latencyP99: number;
  costPerRequest: number;
  overallScore: NormalizedScore;
  rank: number;
}
