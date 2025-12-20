/**
 * Multi-Agent Observability Hub Types
 *
 * Comprehensive type definitions for observing, tracing, and analyzing
 * multi-agent AI systems and their interactions.
 */

import { ISO8601, UUID, NormalizedScore, TrendIndicator } from './common';

// ============================================================================
// Agent Topology & Registry
// ============================================================================

/** Agent registry entry */
export interface AgentRegistryEntry {
  id: UUID;
  name: string;
  type: AgentType;
  version: string;
  model: string;
  provider: string;
  capabilities: AgentCapability[];
  tools: AgentTool[];
  status: 'active' | 'inactive' | 'degraded' | 'error';
  metadata: AgentMetadata;
  registeredAt: ISO8601;
  lastActiveAt: ISO8601;
}

export type AgentType =
  | 'orchestrator'
  | 'worker'
  | 'specialist'
  | 'router'
  | 'planner'
  | 'executor'
  | 'critic'
  | 'retriever'
  | 'tool-user'
  | 'custom';

export interface AgentCapability {
  name: string;
  description: string;
  enabled: boolean;
  version?: string;
}

export interface AgentTool {
  id: string;
  name: string;
  type: 'function' | 'api' | 'mcp' | 'builtin' | 'custom';
  description: string;
  schema?: Record<string, unknown>;
  permissions: string[];
}

export interface AgentMetadata {
  description?: string;
  owner?: string;
  team?: string;
  tags?: string[];
  costPerCall?: number;
  avgLatencyMs?: number;
  successRate?: NormalizedScore;
  customFields?: Record<string, unknown>;
}

// ============================================================================
// Agent Session & Execution
// ============================================================================

/** Multi-agent session */
export interface AgentSession {
  id: UUID;
  startTime: ISO8601;
  endTime?: ISO8601;
  status: 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';
  initiator: SessionInitiator;
  agents: SessionAgent[];
  rootRequest: string;
  finalResponse?: string;
  metrics: SessionMetrics;
  errors?: SessionError[];
}

export interface SessionInitiator {
  type: 'user' | 'system' | 'scheduled' | 'api';
  id: string;
  metadata?: Record<string, unknown>;
}

export interface SessionAgent {
  agentId: UUID;
  name: string;
  invocations: number;
  totalTokens: number;
  totalCost: number;
  avgLatencyMs: number;
  errorCount: number;
  firstCall: ISO8601;
  lastCall: ISO8601;
}

export interface SessionMetrics {
  totalDurationMs: number;
  totalAgentCalls: number;
  totalToolCalls: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  uniqueAgents: number;
  maxConcurrency: number;
  successfulSteps: number;
  failedSteps: number;
}

export interface SessionError {
  timestamp: ISO8601;
  agentId: UUID;
  type: 'timeout' | 'error' | 'loop' | 'limit' | 'permission';
  message: string;
  recoverable: boolean;
  recovered: boolean;
}

// ============================================================================
// Agent Topology Graph
// ============================================================================

/** Complete topology graph */
export interface AgentTopologyGraph {
  sessionId: UUID;
  timestamp: ISO8601;
  agents: AgentNode[];
  connections: AgentConnection[];
  tools: ToolNode[];
  clusters?: AgentCluster[];
  layout: GraphLayout;
  metrics: TopologyMetrics;
}

export interface AgentNode {
  id: UUID;
  name: string;
  type: AgentType;
  model: string;
  status: 'active' | 'idle' | 'error' | 'completed';
  position?: { x: number; y: number };
  metrics: AgentNodeMetrics;
  annotations?: NodeAnnotation[];
}

export interface AgentNodeMetrics {
  invocations: number;
  avgLatencyMs: number;
  errorRate: NormalizedScore;
  tokenUsage: number;
  cost: number;
  throughput: number;
}

export interface NodeAnnotation {
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  timestamp: ISO8601;
}

export interface AgentConnection {
  id: UUID;
  sourceId: UUID;
  targetId: UUID;
  type: ConnectionType;
  messageCount: number;
  avgLatencyMs: number;
  dataVolume: number;
  errorCount: number;
  lastActivity: ISO8601;
}

export type ConnectionType =
  | 'delegation'
  | 'collaboration'
  | 'supervision'
  | 'data-flow'
  | 'tool-call'
  | 'feedback';

export interface ToolNode {
  id: string;
  name: string;
  type: string;
  provider?: string;
  invocations: number;
  successRate: NormalizedScore;
  avgLatencyMs: number;
  usedByAgents: UUID[];
  lastUsed: ISO8601;
}

export interface AgentCluster {
  id: string;
  name: string;
  agentIds: UUID[];
  purpose: string;
  metrics: ClusterMetrics;
}

export interface ClusterMetrics {
  totalCalls: number;
  avgLatencyMs: number;
  errorRate: NormalizedScore;
  cost: number;
}

export interface GraphLayout {
  type: 'hierarchical' | 'force' | 'radial' | 'custom';
  width: number;
  height: number;
  nodeSpacing: number;
}

export interface TopologyMetrics {
  nodeCount: number;
  edgeCount: number;
  avgDegree: number;
  maxDepth: number;
  bottlenecks: UUID[];
  criticalPath: UUID[];
}

// ============================================================================
// Decision Trace & Execution
// ============================================================================

/** Complete decision trace for a session */
export interface DecisionTrace {
  sessionId: UUID;
  agentId: UUID;
  requestId: UUID;
  timestamp: ISO8601;
  steps: DecisionStep[];
  totalDuration: number;
  outcome: TraceOutcome;
  finalOutput?: string;
  metadata?: Record<string, unknown>;
}

export interface DecisionStep {
  id: UUID;
  sequence: number;
  timestamp: ISO8601;
  agentId: UUID;
  type: StepType;
  input: StepInput;
  output: StepOutput;
  duration: number;
  tokens: TokenUsage;
  cost: number;
  status: 'success' | 'error' | 'skipped' | 'retried';
  metadata?: Record<string, unknown>;
}

export type StepType =
  | 'reasoning'
  | 'planning'
  | 'tool-call'
  | 'agent-call'
  | 'retrieval'
  | 'generation'
  | 'validation'
  | 'decision'
  | 'output';

export interface StepInput {
  type: 'text' | 'structured' | 'context';
  content: string;
  context?: Record<string, unknown>;
  sourceStepId?: UUID;
}

export interface StepOutput {
  type: 'text' | 'structured' | 'action';
  content: string;
  structured?: Record<string, unknown>;
  action?: ActionOutput;
}

export interface ActionOutput {
  type: 'tool-call' | 'agent-delegation' | 'response';
  target: string;
  parameters?: Record<string, unknown>;
  result?: unknown;
}

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
  cached?: number;
}

export type TraceOutcome = 'success' | 'failure' | 'partial' | 'timeout' | 'cancelled';

// ============================================================================
// Anomaly Detection
// ============================================================================

/** Anomaly detection report */
export interface AnomalyReport {
  sessionId: UUID;
  timestamp: ISO8601;
  anomalies: AgentAnomaly[];
  overallRisk: 'critical' | 'high' | 'medium' | 'low';
  affectedAgents: UUID[];
  recommendations: AnomalyRecommendation[];
  autoMitigated: boolean;
  mitigationActions?: MitigationAction[];
}

export interface AgentAnomaly {
  id: UUID;
  timestamp: ISO8601;
  agentId: UUID;
  type: AnomalyType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  evidence: AnomalyEvidence[];
  suggestedAction: string;
  autoMitigatable: boolean;
}

export type AnomalyType =
  | 'infinite-loop'
  | 'excessive-cost'
  | 'high-latency'
  | 'tool-failure'
  | 'hallucination'
  | 'security-violation'
  | 'resource-exhaustion'
  | 'deadlock'
  | 'cascade-failure'
  | 'unauthorized-action'
  | 'data-inconsistency';

export interface AnomalyEvidence {
  type: 'metric' | 'log' | 'trace' | 'pattern';
  description: string;
  value?: number | string;
  threshold?: number | string;
  timestamp: ISO8601;
}

export interface AnomalyRecommendation {
  priority: 'immediate' | 'high' | 'medium' | 'low';
  action: string;
  description: string;
  estimatedImpact: string;
  automated: boolean;
}

export interface MitigationAction {
  type: 'terminate' | 'throttle' | 'redirect' | 'alert' | 'rollback';
  target: UUID;
  parameters?: Record<string, unknown>;
  executedAt: ISO8601;
  result: 'success' | 'failed' | 'pending';
}

// ============================================================================
// A/B Testing & Comparison
// ============================================================================

/** Orchestration strategy comparison */
export interface OrchestrationExperiment {
  id: UUID;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  startTime?: ISO8601;
  endTime?: ISO8601;
  strategyA: OrchestrationStrategy;
  strategyB: OrchestrationStrategy;
  trafficSplit: number; // Percentage to strategy A
  metrics: ExperimentMetricConfig[];
  sampleSize: ExperimentSampleSize;
}

export interface OrchestrationStrategy {
  id: UUID;
  name: string;
  description: string;
  agentConfig: AgentConfiguration;
  routingRules?: RoutingRule[];
  fallbackBehavior?: FallbackBehavior;
}

export interface AgentConfiguration {
  agents: ConfiguredAgent[];
  defaultModel?: string;
  maxConcurrency?: number;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

export interface ConfiguredAgent {
  agentId: UUID;
  enabled: boolean;
  priority?: number;
  modelOverride?: string;
  parameters?: Record<string, unknown>;
}

export interface RoutingRule {
  id: string;
  condition: string;
  targetAgent: UUID;
  priority: number;
}

export interface FallbackBehavior {
  type: 'retry' | 'alternate' | 'degrade' | 'fail';
  maxRetries?: number;
  alternateAgent?: UUID;
  degradedResponse?: string;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
}

export interface ExperimentMetricConfig {
  name: string;
  type: 'primary' | 'secondary' | 'guardrail';
  aggregation: 'mean' | 'median' | 'p95' | 'sum' | 'rate';
  direction: 'higher-is-better' | 'lower-is-better';
  minimumDetectableEffect?: number;
}

export interface ExperimentSampleSize {
  target: number;
  current: number;
  strategyA: number;
  strategyB: number;
  minimumRequired: number;
}

/** Experiment analysis result */
export interface ExperimentAnalysis {
  experimentId: UUID;
  timestamp: ISO8601;
  status: 'running' | 'conclusive' | 'inconclusive';
  strategyAResults: StrategyResults;
  strategyBResults: StrategyResults;
  comparison: StrategyComparison;
  winner?: 'A' | 'B' | 'tie';
  statisticalSignificance: NormalizedScore;
  recommendation: string;
  confidence: NormalizedScore;
}

export interface StrategyResults {
  sampleSize: number;
  metrics: Record<string, MetricResult>;
  successRate: NormalizedScore;
  avgLatencyMs: number;
  avgCost: number;
  errorRate: NormalizedScore;
}

export interface MetricResult {
  value: number;
  stdDev: number;
  confidenceInterval: [number, number];
  sampleSize: number;
}

export interface StrategyComparison {
  metrics: Record<string, MetricComparison>;
  overallWinner: 'A' | 'B' | 'tie';
  confidence: NormalizedScore;
}

export interface MetricComparison {
  valueA: number;
  valueB: number;
  relativeDiff: number;
  pValue: number;
  significant: boolean;
  winner: 'A' | 'B' | 'tie';
}

// ============================================================================
// Cost Attribution
// ============================================================================

/** Cost attribution by agent */
export interface AgentCostAttribution {
  sessionId: UUID;
  period: { start: ISO8601; end: ISO8601 };
  totalCost: number;
  currency: string;
  breakdown: AgentCostBreakdown[];
  byModel: ModelCostBreakdown[];
  byTool: ToolCostBreakdown[];
  trends: CostTrend[];
  recommendations: CostRecommendation[];
}

export interface AgentCostBreakdown {
  agentId: UUID;
  agentName: string;
  totalCost: number;
  percentage: NormalizedScore;
  invocations: number;
  costPerCall: number;
  tokenCost: number;
  computeCost: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface ModelCostBreakdown {
  model: string;
  provider: string;
  totalCost: number;
  percentage: NormalizedScore;
  tokens: number;
  costPerToken: number;
}

export interface ToolCostBreakdown {
  toolId: string;
  toolName: string;
  totalCost: number;
  percentage: NormalizedScore;
  invocations: number;
  costPerCall: number;
}

export interface CostTrend {
  date: ISO8601;
  cost: number;
  invocations: number;
  costPerInvocation: number;
}

export interface CostRecommendation {
  type: 'model-switch' | 'caching' | 'batching' | 'throttling' | 'optimization';
  description: string;
  estimatedSavings: number;
  savingsPercentage: NormalizedScore;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

// ============================================================================
// Multi-Agent Analytics
// ============================================================================

/** Multi-agent analytics dashboard data */
export interface MultiAgentAnalytics {
  timestamp: ISO8601;
  period: { start: ISO8601; end: ISO8601 };
  overview: AnalyticsOverview;
  agentPerformance: AgentPerformanceMetrics[];
  sessionAnalytics: SessionAnalytics;
  toolUsage: ToolUsageAnalytics;
  costAnalytics: CostAnalytics;
  qualityMetrics: QualityMetrics;
  trends: AnalyticsTrends;
}

export interface AnalyticsOverview {
  totalSessions: number;
  totalAgentCalls: number;
  totalToolCalls: number;
  avgSessionDuration: number;
  successRate: NormalizedScore;
  totalCost: number;
  uniqueAgents: number;
  uniqueTools: number;
}

export interface AgentPerformanceMetrics {
  agentId: UUID;
  agentName: string;
  invocations: number;
  successRate: NormalizedScore;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRate: NormalizedScore;
  avgTokens: number;
  avgCost: number;
  trend: TrendIndicator;
}

export interface SessionAnalytics {
  totalSessions: number;
  avgDuration: number;
  avgAgentCalls: number;
  avgToolCalls: number;
  completionRate: NormalizedScore;
  timeoutRate: NormalizedScore;
  errorRate: NormalizedScore;
  distribution: SessionDistribution[];
}

export interface SessionDistribution {
  bucket: string;
  count: number;
  percentage: NormalizedScore;
}

export interface ToolUsageAnalytics {
  totalCalls: number;
  uniqueTools: number;
  topTools: ToolUsageStat[];
  errorsByTool: ToolErrorStat[];
  latencyByTool: ToolLatencyStat[];
}

export interface ToolUsageStat {
  toolId: string;
  toolName: string;
  calls: number;
  successRate: NormalizedScore;
  avgLatencyMs: number;
}

export interface ToolErrorStat {
  toolId: string;
  toolName: string;
  errors: number;
  errorRate: NormalizedScore;
  topErrors: string[];
}

export interface ToolLatencyStat {
  toolId: string;
  toolName: string;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
}

export interface CostAnalytics {
  totalCost: number;
  costByDay: DailyCost[];
  costByAgent: AgentCostBreakdown[];
  costByModel: ModelCostBreakdown[];
  projectedMonthlyCost: number;
  budgetUtilization?: NormalizedScore;
}

export interface DailyCost {
  date: ISO8601;
  cost: number;
  invocations: number;
}

export interface QualityMetrics {
  overallQuality: NormalizedScore;
  taskCompletionRate: NormalizedScore;
  userSatisfaction?: NormalizedScore;
  accuracyScore?: NormalizedScore;
  coherenceScore?: NormalizedScore;
  relevanceScore?: NormalizedScore;
}

export interface AnalyticsTrends {
  sessions: TrendIndicator;
  cost: TrendIndicator;
  latency: TrendIndicator;
  errors: TrendIndicator;
  quality: TrendIndicator;
}
