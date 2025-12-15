/**
 * SLO/SLI Type Definitions
 * AI-specific Service Level Objectives and Indicators
 */

import {
  ISO8601,
  UUID,
  NormalizedScore,
  ResourceIdentifier,
  ActorIdentity,
  TimeWindow,
} from './common';

// ============================================================================
// Service Level Indicators (SLIs)
// ============================================================================

/** Base SLI definition */
export interface SLIDefinition {
  id: UUID;
  name: string;
  description: string;
  category: SLICategory;

  // Measurement
  measurement: SLIMeasurement;

  // Aggregation
  aggregation: AggregationConfig;

  // Labels for filtering
  labels: Record<string, string>;

  // Metadata
  createdAt: ISO8601;
  updatedAt: ISO8601;
  owner: ActorIdentity;
}

export type SLICategory =
  | 'reliability'
  | 'latency'
  | 'accuracy'
  | 'drift'
  | 'hallucination'
  | 'throughput'
  | 'availability'
  | 'cost'
  | 'energy'
  | 'security'
  | 'compliance';

export interface SLIMeasurement {
  type: 'ratio' | 'average' | 'percentile' | 'count' | 'threshold';

  // For ratio type
  goodEventFilter?: string;
  totalEventFilter?: string;

  // For average/percentile type
  metricName?: string;
  percentile?: number;

  // For threshold type
  threshold?: number;
  operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';

  // Data source
  dataSource: string;
  query: string;
}

export interface AggregationConfig {
  window: TimeWindow;
  method: 'rolling' | 'calendar' | 'sliding';
  alignTo?: 'start_of_day' | 'start_of_week' | 'start_of_month';
}

/** Measured SLI value */
export interface SLIValue {
  sliId: UUID;
  timestamp: ISO8601;
  window: TimeWindow;

  // Value
  value: number;
  unit: string;

  // Quality
  sampleSize: number;
  confidence: NormalizedScore;

  // Status relative to objective
  objectiveId?: UUID;
  status?: SLIStatus;
}

export type SLIStatus = 'met' | 'at_risk' | 'breached' | 'unknown';

// ============================================================================
// Service Level Objectives (SLOs)
// ============================================================================

/** AI-specific SLO definition */
export interface AISLODefinition {
  id: UUID;
  name: string;
  description: string;

  // Target resource
  resource: ResourceIdentifier;

  // SLIs this SLO tracks
  slis: SLIDefinition[];

  // Objectives
  objectives: SLOTarget[];

  // AI-specific dimensions
  dimensions: AISLODimensions;

  // Error budget
  errorBudget: ErrorBudgetConfig;

  // Consequences
  consequences: SLOConsequences;

  // Metadata
  contractId?: UUID;
  effectiveFrom: ISO8601;
  effectiveUntil?: ISO8601;
  owner: ActorIdentity;
  approvers: ActorIdentity[];
}

export interface SLOTarget {
  sliId: UUID;
  targetValue: number;
  comparisonOperator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between';
  secondaryValue?: number; // For 'between' operator
  window: TimeWindow;
}

/** AI-specific SLO dimensions */
export interface AISLODimensions {
  reliability?: ReliabilitySLO;
  latency?: LatencySLO;
  accuracy?: AccuracySLO;
  drift?: DriftSLO;
  hallucination?: HallucinationSLO;
  throughput?: ThroughputSLO;
  cost?: CostSLO;
  energy?: EnergySLO;
}

export interface ReliabilitySLO {
  availabilityTarget: NormalizedScore;
  successRateTarget: NormalizedScore;
  mtbfMinHours?: number;
  mttrMaxHours?: number;
}

export interface LatencySLO {
  p50MaxMs: number;
  p95MaxMs: number;
  p99MaxMs: number;
  maxMs: number;
}

export interface AccuracySLO {
  minAccuracy: NormalizedScore;
  minPrecision?: NormalizedScore;
  minRecall?: NormalizedScore;
  minF1?: NormalizedScore;
  customMetrics?: Record<string, number>;
}

export interface DriftSLO {
  maxDataDrift: NormalizedScore;
  maxConceptDrift: NormalizedScore;
  maxPredictionDrift: NormalizedScore;
  driftCheckFrequency: TimeWindow;
}

export interface HallucinationSLO {
  maxHallucinationRate: NormalizedScore;
  minGroundingScore: NormalizedScore;
  minFactualityScore: NormalizedScore;
}

export interface ThroughputSLO {
  minRequestsPerSecond: number;
  minTokensPerSecond?: number;
  maxQueueDepth?: number;
}

export interface CostSLO {
  maxCostPerRequest?: number;
  maxCostPerToken?: number;
  maxDailyCost?: number;
  maxMonthlyCost?: number;
  currency: string;
}

export interface EnergySLO {
  maxWattsPerRequest?: number;
  maxKwhPerDay?: number;
  maxCarbonKgPerDay?: number;
  minRenewablePercent?: NormalizedScore;
}

// ============================================================================
// Error Budget
// ============================================================================

export interface ErrorBudgetConfig {
  calculationMethod: 'time_based' | 'event_based' | 'hybrid';
  period: TimeWindow;
  burnRateThresholds: BurnRateThreshold[];
}

export interface BurnRateThreshold {
  name: string;
  multiplier: number; // e.g., 14x normal burn rate
  windowShort: TimeWindow;
  windowLong: TimeWindow;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ErrorBudgetStatus {
  sloId: UUID;
  timestamp: ISO8601;
  period: TimeWindow;

  // Budget allocation
  totalBudget: number;
  consumedBudget: number;
  remainingBudget: number;
  remainingPercent: NormalizedScore;

  // Burn rate
  currentBurnRate: number;
  projectedExhaustion?: ISO8601;

  // Alerts
  burnRateAlerts: BurnRateAlert[];
}

export interface BurnRateAlert {
  thresholdName: string;
  triggered: boolean;
  currentRate: number;
  thresholdRate: number;
  window: TimeWindow;
}

// ============================================================================
// SLO Consequences
// ============================================================================

export interface SLOConsequences {
  breach: BreachAction[];
  warning: WarningAction[];
  recovery: RecoveryAction[];
}

export interface BreachAction {
  type: BreachActionType;
  threshold: number; // Budget consumption percentage
  action: AutomatedAction;
  notification: NotificationConfig;
}

export type BreachActionType =
  | 'alert'
  | 'escalate'
  | 'rollback'
  | 'scale'
  | 'circuit_break'
  | 'failover'
  | 'page';

export interface WarningAction {
  type: 'alert' | 'log' | 'metric';
  threshold: number;
  notification: NotificationConfig;
}

export interface RecoveryAction {
  type: 'clear_alert' | 'scale_down' | 'restore_traffic';
  threshold: number;
  delay: TimeWindow;
}

export interface AutomatedAction {
  enabled: boolean;
  actionType: string;
  parameters: Record<string, unknown>;
  requireApproval: boolean;
  approvers?: ActorIdentity[];
}

export interface NotificationConfig {
  channels: NotificationChannel[];
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cooldown: TimeWindow;
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'pagerduty' | 'webhook' | 'sms';
  target: string;
  enabled: boolean;
}

// ============================================================================
// AI Contract
// ============================================================================

/** AI system contract (SLO + governance) */
export interface AIContract {
  id: UUID;
  name: string;
  description: string;
  version: string;

  // Parties
  provider: ActorIdentity;
  consumer: ActorIdentity;

  // Resources covered
  resources: ResourceIdentifier[];

  // Service levels
  slos: AISLODefinition[];

  // Terms
  terms: ContractTerms;

  // Lifecycle
  status: ContractStatus;
  effectiveFrom: ISO8601;
  effectiveUntil: ISO8601;
  createdAt: ISO8601;
  approvedAt?: ISO8601;
  terminatedAt?: ISO8601;

  // Governance
  reviewSchedule: TimeWindow;
  lastReviewedAt?: ISO8601;
  nextReviewAt?: ISO8601;
}

export interface ContractTerms {
  // Scope
  scope: string;
  exclusions: string[];

  // Guarantees
  guarantees: Guarantee[];

  // Penalties
  penalties: Penalty[];

  // Remedies
  remedies: Remedy[];

  // Termination
  terminationConditions: string[];
}

export interface Guarantee {
  id: UUID;
  description: string;
  sloReference: UUID;
  commitment: string;
}

export interface Penalty {
  id: UUID;
  condition: string;
  penalty: string;
  calculationMethod?: string;
}

export interface Remedy {
  id: UUID;
  condition: string;
  remedy: string;
  timeline: string;
}

export type ContractStatus =
  | 'draft'
  | 'pending_approval'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'terminated';

// ============================================================================
// SLO Reporting
// ============================================================================

/** SLO performance report */
export interface SLOReport {
  id: UUID;
  timestamp: ISO8601;
  reportPeriod: TimeWindow;

  // SLO being reported
  sloId: UUID;
  sloName: string;

  // Performance summary
  summary: SLOSummary;

  // Detailed results
  sliResults: SLIResult[];

  // Error budget
  errorBudget: ErrorBudgetStatus;

  // Incidents
  incidents: SLOIncident[];

  // Trend
  trend: SLOTrend;
}

export interface SLOSummary {
  overallStatus: 'met' | 'at_risk' | 'breached';
  compliancePercent: NormalizedScore;
  totalBreaches: number;
  totalWarnings: number;
  uptimePercent: NormalizedScore;
}

export interface SLIResult {
  sliId: UUID;
  sliName: string;
  target: number;
  actual: number;
  status: SLIStatus;
  samples: number;
}

export interface SLOIncident {
  id: UUID;
  timestamp: ISO8601;
  duration: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  rootCause?: string;
  resolution?: string;
}

export interface SLOTrend {
  direction: 'improving' | 'stable' | 'degrading';
  periods: TrendPeriod[];
}

export interface TrendPeriod {
  period: TimeWindow;
  value: number;
  status: SLIStatus;
}
