/**
 * Autonomous Healing & Self-Remediation Types
 *
 * Comprehensive type definitions for automated model healing,
 * self-remediation, rollback strategies, and intelligent recovery.
 */

import { ISO8601, UUID, NormalizedScore, TrendIndicator } from './common';

// ============================================================================
// Healing Configuration
// ============================================================================

/** Autonomous healing configuration */
export interface HealingConfig {
  id: UUID;
  name: string;
  enabled: boolean;
  version: string;
  policies: HealingPolicy[];
  triggers: HealingTrigger[];
  actions: HealingActionConfig[];
  safeguards: HealingSafeguard[];
  notifications: HealingNotification[];
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

/** Healing policy definition */
export interface HealingPolicy {
  id: UUID;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  cooldown: number; // seconds
  maxRetries: number;
  escalation?: EscalationRule;
}

export interface PolicyCondition {
  type: ConditionType;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between' | 'anomaly';
  threshold: number | [number, number];
  duration?: number; // seconds
  aggregation?: 'avg' | 'max' | 'min' | 'sum' | 'count';
}

export type ConditionType =
  | 'drift'
  | 'performance'
  | 'error-rate'
  | 'latency'
  | 'availability'
  | 'resource'
  | 'cost'
  | 'quality'
  | 'custom';

export interface PolicyAction {
  type: ActionType;
  priority: number;
  config: Record<string, unknown>;
  timeout?: number;
  fallback?: PolicyAction;
}

export type ActionType =
  | 'retrain'
  | 'rollback'
  | 'scale'
  | 'route'
  | 'throttle'
  | 'cache'
  | 'fallback'
  | 'alert'
  | 'restart'
  | 'custom';

export interface EscalationRule {
  afterAttempts: number;
  afterDuration: number; // seconds
  actions: PolicyAction[];
  notifyChannels: string[];
}

// ============================================================================
// Healing Triggers
// ============================================================================

/** Trigger that initiates healing */
export interface HealingTrigger {
  id: UUID;
  type: TriggerType;
  name: string;
  description: string;
  enabled: boolean;
  config: TriggerConfig;
  linkedPolicies: UUID[];
  lastTriggered?: ISO8601;
  triggerCount: number;
}

export type TriggerType =
  | 'threshold'
  | 'anomaly'
  | 'schedule'
  | 'event'
  | 'prediction'
  | 'manual';

export interface TriggerConfig {
  // For threshold triggers
  metric?: string;
  threshold?: number;
  duration?: number;

  // For anomaly triggers
  anomalyType?: 'zscore' | 'iqr' | 'isolation-forest' | 'custom';
  sensitivity?: number;

  // For schedule triggers
  schedule?: string; // cron expression

  // For event triggers
  events?: string[];

  // For prediction triggers
  forecastHorizon?: number;
  confidence?: number;
}

// ============================================================================
// Healing Actions
// ============================================================================

/** Healing action configuration */
export interface HealingActionConfig {
  id: UUID;
  type: ActionType;
  name: string;
  description: string;
  parameters: ActionParameters;
  validation: ActionValidation;
  rollbackStrategy?: RollbackStrategy;
}

export interface ActionParameters {
  // Retrain parameters
  retrainConfig?: RetrainConfig;

  // Rollback parameters
  rollbackConfig?: RollbackConfig;

  // Scale parameters
  scaleConfig?: ScaleConfig;

  // Route parameters
  routeConfig?: RouteConfig;

  // Throttle parameters
  throttleConfig?: ThrottleConfig;

  // Fallback parameters
  fallbackConfig?: FallbackConfig;

  // Custom parameters
  custom?: Record<string, unknown>;
}

export interface RetrainConfig {
  triggerType: 'immediate' | 'scheduled' | 'queued';
  dataSource: 'recent' | 'full' | 'augmented' | 'curated';
  dataWindow?: number; // hours
  hyperparameters?: Record<string, unknown>;
  validationSplit?: number;
  minSamples?: number;
  maxDuration?: number; // hours
  resourceLimit?: ResourceLimit;
}

export interface ResourceLimit {
  maxGPUs?: number;
  maxMemory?: string;
  maxCost?: number;
}

export interface RollbackConfig {
  strategy: 'previous' | 'specific' | 'best-performing' | 'stable';
  targetVersion?: string;
  lookbackWindow?: number; // hours
  performanceMetric?: string;
  minPerformance?: number;
  gradual?: boolean;
  gradualSteps?: number;
}

export interface ScaleConfig {
  direction: 'up' | 'down' | 'auto';
  targetMetric?: string;
  targetValue?: number;
  minReplicas?: number;
  maxReplicas?: number;
  cooldownSeconds?: number;
  scaleStep?: number;
}

export interface RouteConfig {
  strategy: 'round-robin' | 'weighted' | 'failover' | 'least-latency';
  targets: RouteTarget[];
  healthCheck?: HealthCheckConfig;
}

export interface RouteTarget {
  id: UUID;
  name: string;
  weight?: number;
  priority?: number;
  healthThreshold?: number;
}

export interface HealthCheckConfig {
  endpoint: string;
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
}

export interface ThrottleConfig {
  type: 'rate' | 'concurrency' | 'adaptive';
  limit: number;
  window?: number; // seconds
  adaptiveMin?: number;
  adaptiveMax?: number;
  backpressureThreshold?: number;
}

export interface FallbackConfig {
  type: 'static' | 'cached' | 'alternate-model' | 'degraded';
  staticResponse?: string;
  cacheMaxAge?: number;
  alternateModelId?: UUID;
  degradedCapabilities?: string[];
}

export interface ActionValidation {
  preChecks: ValidationCheck[];
  postChecks: ValidationCheck[];
  successCriteria: SuccessCriteria;
}

export interface ValidationCheck {
  type: 'health' | 'performance' | 'data' | 'resource' | 'custom';
  name: string;
  config: Record<string, unknown>;
  required: boolean;
}

export interface SuccessCriteria {
  metrics: MetricCriteria[];
  minDuration: number; // seconds
  rollbackOnFailure: boolean;
}

export interface MetricCriteria {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  weight: number;
}

// ============================================================================
// Rollback Strategy
// ============================================================================

/** Rollback strategy definition */
export interface RollbackStrategy {
  id: UUID;
  name: string;
  type: RollbackType;
  config: RollbackStrategyConfig;
  triggers: RollbackTrigger[];
  validation: RollbackValidation;
}

export type RollbackType =
  | 'immediate'
  | 'gradual'
  | 'canary'
  | 'blue-green'
  | 'shadow';

export interface RollbackStrategyConfig {
  // For gradual rollback
  steps?: number;
  stepDuration?: number; // seconds
  trafficShift?: number; // percentage per step

  // For canary rollback
  canaryPercentage?: number;
  canaryDuration?: number;

  // General
  maxDuration?: number;
  preserveState?: boolean;
  notifyOnStart?: boolean;
  notifyOnComplete?: boolean;
}

export interface RollbackTrigger {
  type: 'automatic' | 'manual' | 'scheduled';
  conditions?: PolicyCondition[];
  approvalRequired?: boolean;
  approvers?: string[];
}

export interface RollbackValidation {
  preRollback: ValidationCheck[];
  postRollback: ValidationCheck[];
  stabilizationPeriod: number; // seconds
  successMetrics: MetricCriteria[];
}

// ============================================================================
// Safeguards
// ============================================================================

/** Healing safeguard to prevent harmful actions */
export interface HealingSafeguard {
  id: UUID;
  name: string;
  description: string;
  type: SafeguardType;
  enabled: boolean;
  config: SafeguardConfig;
  overrideRequiresApproval: boolean;
  approvers?: string[];
}

export type SafeguardType =
  | 'rate-limit'
  | 'blast-radius'
  | 'time-window'
  | 'resource-limit'
  | 'impact-threshold'
  | 'dependency-check'
  | 'custom';

export interface SafeguardConfig {
  // Rate limit
  maxActionsPerHour?: number;
  maxActionsPerDay?: number;

  // Blast radius
  maxAffectedServices?: number;
  maxAffectedUsers?: number;

  // Time window
  allowedHours?: [number, number];
  allowedDays?: number[];
  blockedDates?: ISO8601[];

  // Resource limit
  maxCpuUsage?: number;
  maxMemoryUsage?: number;
  maxCostImpact?: number;

  // Impact threshold
  maxLatencyIncrease?: number;
  maxErrorRateIncrease?: number;
  minAvailability?: number;

  // Custom
  custom?: Record<string, unknown>;
}

// ============================================================================
// Healing Events & History
// ============================================================================

/** Healing event record */
export interface HealingEvent {
  id: UUID;
  timestamp: ISO8601;
  type: HealingEventType;
  policyId: UUID;
  triggerId?: UUID;
  resourceId: UUID;
  resourceType: string;
  status: HealingStatus;
  actions: ExecutedAction[];
  metrics: HealingMetrics;
  outcome: HealingOutcome;
  duration: number; // milliseconds
}

export type HealingEventType =
  | 'auto-triggered'
  | 'manual'
  | 'scheduled'
  | 'predictive';

export type HealingStatus =
  | 'pending'
  | 'in-progress'
  | 'validating'
  | 'completed'
  | 'failed'
  | 'rolled-back'
  | 'cancelled';

export interface ExecutedAction {
  id: UUID;
  type: ActionType;
  startedAt: ISO8601;
  completedAt?: ISO8601;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  config: Record<string, unknown>;
  result?: ActionResult;
  error?: ActionError;
  rollbackPerformed?: boolean;
}

export interface ActionResult {
  success: boolean;
  message: string;
  metrics?: Record<string, number>;
  artifacts?: string[];
  newVersion?: string;
}

export interface ActionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  recoveryAction?: string;
}

export interface HealingMetrics {
  before: MetricSnapshot;
  after?: MetricSnapshot;
  improvement?: MetricDelta;
}

export interface MetricSnapshot {
  timestamp: ISO8601;
  metrics: Record<string, number>;
}

export interface MetricDelta {
  metrics: Record<string, number>;
  overallImprovement: NormalizedScore;
}

export interface HealingOutcome {
  success: boolean;
  reason: string;
  impactSummary: ImpactSummary;
  lessonsLearned?: string[];
  recommendedFollowUp?: string[];
}

export interface ImpactSummary {
  servicesAffected: number;
  usersAffected: number;
  downtime: number; // seconds
  costImpact: number;
  performanceChange: number; // percentage
}

// ============================================================================
// Predictive Healing
// ============================================================================

/** Predictive healing analysis */
export interface PredictiveHealing {
  id: UUID;
  modelId: UUID;
  timestamp: ISO8601;
  predictions: HealingPrediction[];
  recommendedActions: RecommendedAction[];
  confidence: NormalizedScore;
  forecastHorizon: number; // hours
}

export interface HealingPrediction {
  type: PredictionType;
  probability: NormalizedScore;
  predictedTime: ISO8601;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  indicators: PredictionIndicator[];
  preventiveActions: string[];
}

export type PredictionType =
  | 'drift-threshold-breach'
  | 'performance-degradation'
  | 'error-rate-spike'
  | 'resource-exhaustion'
  | 'slo-violation'
  | 'cascade-failure';

export interface PredictionIndicator {
  metric: string;
  currentValue: number;
  predictedValue: number;
  threshold: number;
  trend: TrendIndicator;
}

export interface RecommendedAction {
  type: ActionType;
  priority: 'immediate' | 'soon' | 'scheduled';
  description: string;
  estimatedImpact: string;
  preventedIssue: string;
  confidence: NormalizedScore;
  config: Record<string, unknown>;
}

// ============================================================================
// Self-Healing Pipelines
// ============================================================================

/** Self-healing pipeline definition */
export interface SelfHealingPipeline {
  id: UUID;
  name: string;
  description: string;
  type: PipelineType;
  stages: PipelineStage[];
  triggers: PipelineTrigger[];
  config: PipelineConfig;
  status: 'active' | 'paused' | 'disabled';
  metrics: PipelineMetrics;
}

export type PipelineType =
  | 'data-quality'
  | 'model-retraining'
  | 'feature-refresh'
  | 'inference-optimization'
  | 'custom';

export interface PipelineStage {
  id: string;
  name: string;
  type: StageType;
  config: Record<string, unknown>;
  dependsOn?: string[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
  onFailure?: FailureAction;
}

export type StageType =
  | 'data-validation'
  | 'data-preparation'
  | 'feature-engineering'
  | 'model-training'
  | 'model-evaluation'
  | 'model-deployment'
  | 'monitoring-setup'
  | 'notification'
  | 'custom';

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay: number; // seconds
  maxDelay: number; // seconds
}

export interface FailureAction {
  type: 'skip' | 'retry' | 'rollback' | 'abort' | 'notify';
  config?: Record<string, unknown>;
}

export interface PipelineTrigger {
  type: 'scheduled' | 'event' | 'threshold' | 'manual';
  config: Record<string, unknown>;
}

export interface PipelineConfig {
  parallelism: number;
  timeout: number; // seconds
  resourceQuota: ResourceLimit;
  notifications: HealingNotification[];
  artifacts: ArtifactConfig;
}

export interface ArtifactConfig {
  retentionDays: number;
  storageLocation: string;
  compress: boolean;
}

export interface PipelineMetrics {
  totalRuns: number;
  successRate: NormalizedScore;
  avgDuration: number;
  lastRun?: ISO8601;
  lastSuccess?: ISO8601;
  lastFailure?: ISO8601;
}

// ============================================================================
// Notifications
// ============================================================================

/** Healing notification configuration */
export interface HealingNotification {
  id: UUID;
  type: NotificationType;
  events: HealingEventType[];
  channels: NotificationChannel[];
  template?: string;
  throttle?: number; // seconds
}

export type NotificationType =
  | 'slack'
  | 'email'
  | 'webhook'
  | 'pagerduty'
  | 'teams'
  | 'custom';

export interface NotificationChannel {
  type: NotificationType;
  config: Record<string, unknown>;
  enabled: boolean;
}

// ============================================================================
// Healing Analytics
// ============================================================================

/** Healing analytics dashboard data */
export interface HealingAnalytics {
  timestamp: ISO8601;
  period: { start: ISO8601; end: ISO8601 };
  overview: HealingOverview;
  eventAnalysis: EventAnalysis;
  actionAnalysis: ActionAnalysis;
  impactAnalysis: ImpactAnalysis;
  predictions: PredictionAnalysis;
  trends: HealingTrends;
}

export interface HealingOverview {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  autoTriggered: number;
  manualTriggered: number;
  avgRecoveryTime: number; // seconds
  mttr: number; // Mean Time To Recovery
  preventedIncidents: number;
  costSavings: number;
}

export interface EventAnalysis {
  byType: Record<HealingEventType, number>;
  byStatus: Record<HealingStatus, number>;
  byResource: ResourceEventStats[];
  byPolicy: PolicyEventStats[];
  timeline: EventTimelinePoint[];
}

export interface ResourceEventStats {
  resourceId: UUID;
  resourceName: string;
  events: number;
  successRate: NormalizedScore;
}

export interface PolicyEventStats {
  policyId: UUID;
  policyName: string;
  triggers: number;
  successRate: NormalizedScore;
  avgRecoveryTime: number;
}

export interface EventTimelinePoint {
  timestamp: ISO8601;
  events: number;
  successful: number;
  failed: number;
}

export interface ActionAnalysis {
  byType: Record<ActionType, ActionStats>;
  topActions: ActionStats[];
  effectivenessRanking: ActionEffectiveness[];
}

export interface ActionStats {
  type: ActionType;
  count: number;
  successRate: NormalizedScore;
  avgDuration: number;
  avgImprovement: number;
}

export interface ActionEffectiveness {
  action: ActionType;
  successRate: NormalizedScore;
  avgRecoveryTime: number;
  costEfficiency: NormalizedScore;
  recommendation: string;
}

export interface ImpactAnalysis {
  totalDowntimePrevented: number;
  totalCostSaved: number;
  servicesProtected: number;
  sloBreachesPrevented: number;
  userImpactMinimized: number;
}

export interface PredictionAnalysis {
  predictionsGenerated: number;
  predictionsAccurate: number;
  accuracy: NormalizedScore;
  avgLeadTime: number; // hours before issue
  preventedByPrediction: number;
}

export interface HealingTrends {
  events: TrendIndicator;
  successRate: TrendIndicator;
  recoveryTime: TrendIndicator;
  costSavings: TrendIndicator;
}
