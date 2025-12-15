/**
 * Metrics type definitions for AIOBS
 * Covers all dimensions of AI system observability
 */

import {
  ISO8601,
  UUID,
  NormalizedScore,
  TrendIndicator,
  ResourceIdentifier,
  TimeWindow,
} from './common';

// ============================================================================
// Base Metric Types
// ============================================================================

/** Base metric structure */
export interface BaseMetric {
  id: UUID;
  name: string;
  timestamp: ISO8601;
  source: MetricSource;
  labels: Record<string, string>;
  value: number;
  unit: MetricUnit;
}

export interface MetricSource {
  agent: string;
  resource: ResourceIdentifier;
  region?: string;
  cluster?: string;
}

export type MetricUnit =
  | 'count'
  | 'percentage'
  | 'milliseconds'
  | 'seconds'
  | 'bytes'
  | 'requests_per_second'
  | 'tokens_per_second'
  | 'watts'
  | 'kwh'
  | 'dollars'
  | 'score';

// ============================================================================
// Model Metrics
// ============================================================================

export interface ModelMetrics {
  modelId: string;
  modelVersion: string;
  timestamp: ISO8601;

  // Performance metrics
  performance: ModelPerformanceMetrics;

  // Inference metrics
  inference: InferenceMetrics;

  // Quality metrics
  quality: ModelQualityMetrics;
}

export interface ModelPerformanceMetrics {
  accuracy: NormalizedScore;
  precision: NormalizedScore;
  recall: NormalizedScore;
  f1Score: NormalizedScore;
  auc: NormalizedScore;
  customMetrics: Record<string, number>;
}

export interface InferenceMetrics {
  requestCount: number;
  successRate: NormalizedScore;
  latency: LatencyMetrics;
  throughput: number;
  errorRate: NormalizedScore;
  timeoutRate: NormalizedScore;
}

export interface LatencyMetrics {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  mean: number;
  max: number;
}

export interface ModelQualityMetrics {
  confidenceDistribution: DistributionMetrics;
  predictionDistribution: DistributionMetrics;
  featureImportance: FeatureImportance[];
}

export interface DistributionMetrics {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  percentiles: Record<string, number>;
  histogram: HistogramBucket[];
}

export interface HistogramBucket {
  lower: number;
  upper: number;
  count: number;
}

export interface FeatureImportance {
  featureName: string;
  importance: NormalizedScore;
  trend: TrendIndicator;
}

// ============================================================================
// Data Metrics
// ============================================================================

export interface DataMetrics {
  pipelineId: string;
  timestamp: ISO8601;

  // Volume metrics
  volume: DataVolumeMetrics;

  // Quality metrics
  quality: DataQualityMetrics;

  // Freshness metrics
  freshness: DataFreshnessMetrics;

  // Lineage summary
  lineage: DataLineageSummary;
}

export interface DataVolumeMetrics {
  recordCount: number;
  byteSize: number;
  growthRate: number;
  growthTrend: TrendIndicator;
}

export interface DataQualityMetrics {
  completeness: NormalizedScore;
  consistency: NormalizedScore;
  accuracy: NormalizedScore;
  validity: NormalizedScore;
  uniqueness: NormalizedScore;
  nullRate: NormalizedScore;
  duplicateRate: NormalizedScore;
  schemaViolations: number;
}

export interface DataFreshnessMetrics {
  lastUpdateTime: ISO8601;
  updateFrequency: TimeWindow;
  staleness: number;
  expectedFreshness: TimeWindow;
  isFresh: boolean;
}

export interface DataLineageSummary {
  sourceCount: number;
  transformationCount: number;
  downstreamCount: number;
  lastTraced: ISO8601;
}

// ============================================================================
// Infrastructure Metrics
// ============================================================================

export interface InfrastructureMetrics {
  resourceId: string;
  resourceType: 'compute' | 'gpu' | 'storage' | 'network';
  timestamp: ISO8601;

  // Compute metrics
  compute?: ComputeMetrics;

  // GPU metrics
  gpu?: GPUMetrics;

  // Storage metrics
  storage?: StorageMetrics;

  // Network metrics
  network?: NetworkMetrics;
}

export interface ComputeMetrics {
  cpuUtilization: NormalizedScore;
  memoryUtilization: NormalizedScore;
  memoryUsedBytes: number;
  memoryTotalBytes: number;
  processCount: number;
  loadAverage: [number, number, number];
}

export interface GPUMetrics {
  gpuUtilization: NormalizedScore;
  memoryUtilization: NormalizedScore;
  memoryUsedBytes: number;
  memoryTotalBytes: number;
  temperature: number;
  powerWatts: number;
  tensorCoreUtilization?: NormalizedScore;
}

export interface StorageMetrics {
  usedBytes: number;
  totalBytes: number;
  utilizationPercent: NormalizedScore;
  readThroughput: number;
  writeThroughput: number;
  iops: number;
  latencyMs: number;
}

export interface NetworkMetrics {
  ingressBytesPerSecond: number;
  egressBytesPerSecond: number;
  packetsPerSecond: number;
  errorRate: NormalizedScore;
  latencyMs: number;
}

// ============================================================================
// Cost Metrics (FinOps)
// ============================================================================

export interface CostMetrics {
  resourceId: string;
  timestamp: ISO8601;
  period: TimeWindow;

  // Cost breakdown
  breakdown: CostBreakdown;

  // Budget tracking
  budget: BudgetMetrics;

  // Optimization
  optimization: CostOptimization;
}

export interface CostBreakdown {
  total: number;
  currency: string;
  byCategory: Record<CostCategory, number>;
  byResource: ResourceCost[];
  trend: TrendIndicator;
}

export type CostCategory =
  | 'compute'
  | 'gpu'
  | 'storage'
  | 'network'
  | 'api_calls'
  | 'licensing'
  | 'support';

export interface ResourceCost {
  resourceId: string;
  resourceName: string;
  cost: number;
  percentOfTotal: NormalizedScore;
}

export interface BudgetMetrics {
  allocated: number;
  spent: number;
  remaining: number;
  utilizationPercent: NormalizedScore;
  projectedSpend: number;
  isOverBudget: boolean;
}

export interface CostOptimization {
  potentialSavings: number;
  recommendations: CostRecommendation[];
  efficiency: NormalizedScore;
}

export interface CostRecommendation {
  id: string;
  title: string;
  description: string;
  estimatedSavings: number;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

// ============================================================================
// Energy Metrics (GreenOps)
// ============================================================================

export interface EnergyMetrics {
  resourceId: string;
  timestamp: ISO8601;
  period: TimeWindow;

  // Power consumption
  power: PowerMetrics;

  // Carbon footprint
  carbon: CarbonMetrics;

  // Efficiency
  efficiency: EnergyEfficiency;
}

export interface PowerMetrics {
  consumptionWatts: number;
  consumptionKwh: number;
  peakWatts: number;
  idleWatts: number;
  powerEfficiency: NormalizedScore;
}

export interface CarbonMetrics {
  emissionsKgCO2: number;
  carbonIntensity: number;
  renewablePercent: NormalizedScore;
  offsetCredits: number;
  netEmissions: number;
}

export interface EnergyEfficiency {
  pue: number; // Power Usage Effectiveness
  inferencesPerKwh: number;
  tokensPerKwh: number;
  sustainabilityScore: NormalizedScore;
  trend: TrendIndicator;
}

// ============================================================================
// Security Metrics
// ============================================================================

export interface SecurityMetrics {
  resourceId: string;
  timestamp: ISO8601;

  // Access metrics
  access: AccessMetrics;

  // Threat metrics
  threats: ThreatMetrics;

  // Compliance metrics
  compliance: SecurityComplianceMetrics;

  // Risk score
  riskScore: NormalizedScore;
}

export interface AccessMetrics {
  totalRequests: number;
  uniqueActors: number;
  authFailures: number;
  unauthorizedAttempts: number;
  privilegedActions: number;
  anomalousPatterns: number;
}

export interface ThreatMetrics {
  detectedThreats: number;
  blockedThreats: number;
  suspiciousActivities: number;
  vulnerabilities: VulnerabilitySummary;
}

export interface VulnerabilitySummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface SecurityComplianceMetrics {
  overallScore: NormalizedScore;
  controlsPassed: number;
  controlsFailed: number;
  controlsTotal: number;
  lastAssessment: ISO8601;
}

// ============================================================================
// Aggregated Metrics
// ============================================================================

export interface AggregatedMetrics {
  timestamp: ISO8601;
  window: TimeWindow;
  aggregation: AggregationType;

  model: ModelMetrics[];
  data: DataMetrics[];
  infrastructure: InfrastructureMetrics[];
  cost: CostMetrics;
  energy: EnergyMetrics;
  security: SecurityMetrics;

  // Overall health
  systemHealth: NormalizedScore;
  trustScore: NormalizedScore;
}

export type AggregationType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'percentile';
