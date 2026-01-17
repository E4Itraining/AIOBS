/**
 * LLM Testing Environment - Type Definitions
 * Real-time testing, benchmarking, and evaluation for LLM systems
 */

export interface LLMTestCase {
  id: string;
  name: string;
  category: TestCategory;
  description: string;
  prompt: string;
  expectedBehavior?: string;
  groundTruth?: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  timeout: number;
  metadata?: Record<string, unknown>;
}

export type TestCategory =
  | 'accuracy'
  | 'latency'
  | 'reliability'
  | 'hallucination'
  | 'security'
  | 'adversarial'
  | 'consistency'
  | 'factuality'
  | 'reasoning'
  | 'instruction_following'
  | 'toxicity'
  | 'bias'
  | 'cost_efficiency';

export interface LLMTestResult {
  testId: string;
  testName: string;
  category: TestCategory;
  status: 'passed' | 'failed' | 'warning' | 'error' | 'skipped';
  score: number;
  metrics: TestMetrics;
  response: LLMResponseCapture;
  analysis: TestAnalysis;
  timestamp: Date;
  duration: number;
}

export interface TestMetrics {
  latency: LatencyMetrics;
  quality: QualityMetrics;
  cost: CostMetrics;
  safety: SafetyMetrics;
}

export interface LatencyMetrics {
  totalMs: number;
  timeToFirstToken: number;
  tokensPerSecond: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface QualityMetrics {
  accuracy: number;
  relevance: number;
  coherence: number;
  completeness: number;
  factualConsistency: number;
  groundingScore: number;
}

export interface CostMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  costPerToken: number;
}

export interface SafetyMetrics {
  toxicityScore: number;
  biasScore: number;
  harmfulnessScore: number;
  refusalAppropriate: boolean;
  contentFiltered: boolean;
}

export interface LLMResponseCapture {
  content: string;
  model: string;
  provider: string;
  finishReason: string;
  usage: TokenUsage;
  rawResponse?: unknown;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface TestAnalysis {
  passed: boolean;
  reason: string;
  insights: string[];
  suggestions: string[];
  detectedIssues: DetectedIssue[];
  comparisonWithBaseline?: BaselineComparison;
}

export interface DetectedIssue {
  type: IssueType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  recommendation: string;
}

export type IssueType =
  | 'hallucination'
  | 'factual_error'
  | 'inconsistency'
  | 'toxicity'
  | 'bias'
  | 'prompt_injection'
  | 'jailbreak_attempt'
  | 'data_leak'
  | 'instruction_violation'
  | 'quality_degradation'
  | 'latency_spike'
  | 'cost_anomaly';

export interface BaselineComparison {
  baselineScore: number;
  currentScore: number;
  delta: number;
  percentChange: number;
  trend: 'improving' | 'stable' | 'degrading';
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: LLMTestCase[];
  config: TestSuiteConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestSuiteConfig {
  parallelExecution: boolean;
  maxConcurrent: number;
  retryOnFailure: boolean;
  maxRetries: number;
  stopOnFirstFailure: boolean;
  timeoutMs: number;
  warmupRuns: number;
}

export interface TestRun {
  id: string;
  suiteId: string;
  suiteName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: TestRunProgress;
  results: LLMTestResult[];
  summary: TestRunSummary;
  startTime: Date;
  endTime?: Date;
  config: TestRunConfig;
}

export interface TestRunProgress {
  total: number;
  completed: number;
  passed: number;
  failed: number;
  skipped: number;
  currentTest?: string;
  percentComplete: number;
}

export interface TestRunSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  passRate: number;
  averageScore: number;
  averageLatency: number;
  totalCost: number;
  totalDuration: number;
  categorySummary: Record<TestCategory, CategorySummary>;
  topIssues: DetectedIssue[];
  recommendations: string[];
}

export interface CategorySummary {
  total: number;
  passed: number;
  failed: number;
  averageScore: number;
}

export interface TestRunConfig {
  providers: ProviderConfig[];
  compareProviders: boolean;
  saveResults: boolean;
  notifyOnComplete: boolean;
  tags: string[];
}

export interface ProviderConfig {
  name: string;
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export interface BenchmarkResult {
  id: string;
  name: string;
  timestamp: Date;
  provider: string;
  model: string;
  results: BenchmarkMetrics;
  comparison?: BenchmarkComparison;
}

export interface BenchmarkMetrics {
  accuracy: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  throughput: number;
  costPer1kTokens: number;
  reliability: number;
  consistencyScore: number;
  safetyScore: number;
}

export interface BenchmarkComparison {
  baseline: BenchmarkMetrics;
  current: BenchmarkMetrics;
  deltas: Partial<BenchmarkMetrics>;
  overallImprovement: number;
}

export interface LiveTestEvent {
  type: LiveTestEventType;
  timestamp: Date;
  data: unknown;
}

export type LiveTestEventType =
  | 'test_started'
  | 'test_progress'
  | 'test_completed'
  | 'test_failed'
  | 'suite_started'
  | 'suite_progress'
  | 'suite_completed'
  | 'metric_update'
  | 'issue_detected'
  | 'benchmark_update';

export interface AdversarialTestConfig {
  enabled: boolean;
  categories: AdversarialCategory[];
  intensity: 'low' | 'medium' | 'high';
  customPrompts?: string[];
}

export type AdversarialCategory =
  | 'prompt_injection'
  | 'jailbreak'
  | 'data_extraction'
  | 'role_confusion'
  | 'boundary_testing'
  | 'encoding_attacks'
  | 'context_manipulation';

export interface SecurityTestResult {
  category: AdversarialCategory;
  testName: string;
  vulnerability: 'none' | 'low' | 'medium' | 'high' | 'critical';
  description: string;
  attackVector: string;
  modelResponse: string;
  mitigationRecommendation: string;
}
