/**
 * LLM Chain DNA Profiling Engine
 *
 * Creates behavioral fingerprints of LLM chains to detect mutations,
 * drift, and anomalous behavior patterns.
 *
 * @module chain-dna-engine
 */

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import {
  ChainDNAProfile,
  PromptFingerprint,
  BehaviorSignature,
  OutputDistribution,
  ToolUsagePattern,
  ReasoningPattern,
  BaselineMetrics,
  MutationThresholds,
  MutationReport,
  MutationType,
  ChainExecution,
  DNAComparison,
  AnomalyFlag,
  AnomalyType,
  DNAMonitoringConfig,
  DNADashboardData,
  ProfileHealth,
  TimeRange,
  NormalizedScore,
  DistributionStats,
} from '../types';

// ============================================================================
// Chain DNA Engine Interface
// ============================================================================

export interface IChainDNAEngine {
  /** Generate DNA profile for a chain */
  generateProfile(chainId: string, executions: ChainExecution[]): Promise<ChainDNAProfile>;

  /** Get profile by ID */
  getProfile(profileId: string): Promise<ChainDNAProfile | null>;

  /** Update profile with new executions */
  updateProfile(profileId: string, executions: ChainExecution[]): Promise<ChainDNAProfile>;

  /** Compare execution to profile */
  compareExecution(profileId: string, execution: ChainExecution): Promise<DNAComparison>;

  /** Detect mutations */
  detectMutations(profileId: string, executions: ChainExecution[]): Promise<MutationReport>;

  /** Get mutation history */
  getMutationHistory(chainId: string, period: TimeRange): Promise<MutationReport[]>;

  /** Configure monitoring */
  configureMonitoring(config: DNAMonitoringConfig): Promise<void>;

  /** Get monitoring config */
  getMonitoringConfig(chainId: string): Promise<DNAMonitoringConfig | null>;

  /** Get dashboard data */
  getDashboardData(profileId: string): Promise<DNADashboardData>;

  /** Flag anomalies in execution */
  flagAnomalies(profileId: string, execution: ChainExecution): Promise<AnomalyFlag[]>;

  /** Get profile health */
  getProfileHealth(profileId: string): Promise<ProfileHealth>;

  /** Archive profile */
  archiveProfile(profileId: string): Promise<void>;
}

// ============================================================================
// Chain DNA Engine Implementation
// ============================================================================

export class ChainDNAEngine implements IChainDNAEngine {
  private profiles: Map<string, ChainDNAProfile> = new Map();
  private mutations: Map<string, MutationReport[]> = new Map();
  private monitoringConfigs: Map<string, DNAMonitoringConfig> = new Map();
  private executions: Map<string, ChainExecution[]> = new Map();

  constructor(
    private readonly config: ChainDNAEngineConfig = {}
  ) {}

  async generateProfile(chainId: string, executions: ChainExecution[]): Promise<ChainDNAProfile> {
    const now = new Date().toISOString();
    const profileId = uuidv4();

    if (executions.length < this.config.minSampleSize || 30) {
      throw new Error(`Insufficient executions for profile generation. Need at least ${this.config.minSampleSize || 30}`);
    }

    // Generate prompt fingerprint
    const promptFingerprint = this.generatePromptFingerprint(executions);

    // Generate behavior signature
    const behaviorSignature = this.generateBehaviorSignature(executions);

    // Generate output distribution
    const outputDistribution = this.generateOutputDistribution(executions);

    // Generate tool usage pattern
    const toolUsagePattern = this.generateToolUsagePattern(executions);

    // Generate reasoning pattern
    const reasoningPattern = this.generateReasoningPattern(executions);

    // Generate baseline metrics
    const baselineMetrics = this.generateBaselineMetrics(executions);

    // Set mutation thresholds
    const mutationThresholds = this.getDefaultThresholds();

    const profile: ChainDNAProfile = {
      id: profileId,
      chainId,
      name: `DNA Profile for ${chainId}`,
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      generationConfig: {
        sampleSize: executions.length,
        samplingStrategy: 'random',
        windowDays: 30,
        embeddingModel: 'text-embedding-3-small',
        confidenceThreshold: 0.8,
      },
      promptFingerprint,
      behaviorSignature,
      outputDistribution,
      toolUsagePattern,
      reasoningPattern,
      temporalPatterns: [],
      contextSensitivity: {
        sensitivities: [],
        correlations: [],
        stability: 0.85,
      },
      baselineMetrics,
      mutationThresholds,
      health: {
        status: 'healthy',
        lastValidated: now,
        sampleCoverage: 1.0,
        confidence: 0.9,
        issues: [],
      },
    };

    this.profiles.set(profileId, profile);
    this.executions.set(chainId, executions);

    return profile;
  }

  async getProfile(profileId: string): Promise<ChainDNAProfile | null> {
    return this.profiles.get(profileId) || null;
  }

  async updateProfile(profileId: string, newExecutions: ChainExecution[]): Promise<ChainDNAProfile> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    const now = new Date().toISOString();
    const existingExecutions = this.executions.get(profile.chainId) || [];
    const allExecutions = [...existingExecutions, ...newExecutions];

    // Regenerate profile components
    profile.promptFingerprint = this.generatePromptFingerprint(allExecutions);
    profile.behaviorSignature = this.generateBehaviorSignature(allExecutions);
    profile.outputDistribution = this.generateOutputDistribution(allExecutions);
    profile.toolUsagePattern = this.generateToolUsagePattern(allExecutions);
    profile.reasoningPattern = this.generateReasoningPattern(allExecutions);
    profile.baselineMetrics = this.generateBaselineMetrics(allExecutions);

    profile.updatedAt = now;
    profile.generationConfig.sampleSize = allExecutions.length;

    this.profiles.set(profileId, profile);
    this.executions.set(profile.chainId, allExecutions);

    return profile;
  }

  async compareExecution(profileId: string, execution: ChainExecution): Promise<DNAComparison> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    // Calculate semantic similarity
    const semanticSimilarity = this.calculateSemanticSimilarity(profile, execution);

    // Calculate behavioral similarity
    const behavioralSimilarity = this.calculateBehavioralSimilarity(profile, execution);

    // Calculate output similarity
    const outputSimilarity = this.calculateOutputSimilarity(profile, execution);

    // Calculate overall similarity
    const overallSimilarity = (semanticSimilarity + behavioralSimilarity + outputSimilarity) / 3;

    // Calculate deviations
    const deviations = this.calculateDeviations(profile, execution);

    // Determine if within normal range
    const withinNormalRange = overallSimilarity > (1 - profile.mutationThresholds.semanticDriftThreshold);

    return {
      profileId,
      overallSimilarity,
      semanticSimilarity,
      behavioralSimilarity,
      outputSimilarity,
      deviations,
      withinNormalRange,
    };
  }

  async detectMutations(profileId: string, executions: ChainExecution[]): Promise<MutationReport> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    const now = new Date().toISOString();

    // Compare each execution and aggregate results
    const comparisons = await Promise.all(
      executions.map(e => this.compareExecution(profileId, e))
    );

    // Calculate aggregate mutation score
    const avgSimilarity = comparisons.reduce((sum, c) => sum + c.overallSimilarity, 0) / comparisons.length;
    const mutationScore = 1 - avgSimilarity;

    // Determine mutation type
    const mutationType = this.determineMutationType(comparisons, profile);

    // Calculate severity
    const severity = this.calculateMutationSeverity(mutationScore);

    // Analyze semantic mutation
    const semanticMutation = this.analyzeSemanticMutation(profile, executions);

    // Analyze behavioral mutation
    const behavioralMutation = this.analyzeBehavioralMutation(profile, executions);

    // Analyze output mutation
    const outputMutation = this.analyzeOutputMutation(profile, executions);

    // Analyze tool mutation
    const toolMutation = this.analyzeToolMutation(profile, executions);

    // Root cause analysis
    const rootCauseAnalysis = this.performRootCauseAnalysis(mutationType, semanticMutation, behavioralMutation);

    // Generate recommendations
    const recommendations = this.generateMutationRecommendations(mutationType, mutationScore);

    const report: MutationReport = {
      id: uuidv4(),
      profileId,
      generatedAt: now,
      mutationScore,
      severity,
      mutationType,
      semanticMutation,
      behavioralMutation,
      outputMutation,
      toolMutation,
      rootCauseAnalysis,
      recommendations,
      detectedAt: now,
      trend: {
        direction: mutationScore > 0.2 ? 'increasing' : 'stable',
        magnitude: mutationScore,
        periodDays: 1,
        significance: mutationScore > 0.1 ? 0.8 : 0.3,
      },
    };

    // Store mutation report
    const chainMutations = this.mutations.get(profile.chainId) || [];
    chainMutations.push(report);
    this.mutations.set(profile.chainId, chainMutations);

    return report;
  }

  async getMutationHistory(chainId: string, period: TimeRange): Promise<MutationReport[]> {
    const mutations = this.mutations.get(chainId) || [];
    const start = new Date(period.start).getTime();
    const end = new Date(period.end).getTime();

    return mutations.filter(m => {
      const detected = new Date(m.detectedAt).getTime();
      return detected >= start && detected <= end;
    });
  }

  async configureMonitoring(config: DNAMonitoringConfig): Promise<void> {
    this.monitoringConfigs.set(config.chainId, config);
  }

  async getMonitoringConfig(chainId: string): Promise<DNAMonitoringConfig | null> {
    return this.monitoringConfigs.get(chainId) || null;
  }

  async getDashboardData(profileId: string): Promise<DNADashboardData> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    const now = new Date().toISOString();
    const mutations = this.mutations.get(profile.chainId) || [];

    // Get recent mutations (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentMutations = mutations.filter(m =>
      new Date(m.detectedAt).getTime() > oneDayAgo
    );

    // Get mutations from last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekMutations = mutations.filter(m =>
      new Date(m.detectedAt).getTime() > sevenDaysAgo
    );

    return {
      profileId,
      generatedAt: now,
      currentHealth: profile.health,
      recentMutations: recentMutations.slice(-10),
      trends: [
        {
          metric: 'mutation_score',
          dataPoints: weekMutations.map(m => ({
            timestamp: m.detectedAt,
            value: m.mutationScore,
          })),
          trend: {
            direction: 'stable',
            magnitude: 0.05,
            periodDays: 7,
            significance: 0.6,
          },
        },
      ],
      anomalySummary: {
        last24Hours: recentMutations.length,
        last7Days: weekMutations.length,
        bySeverity: this.groupBySeverity(weekMutations),
        byType: this.groupByType(weekMutations),
        topAnomalies: recentMutations.slice(-5).map(m => ({
          type: m.mutationType as AnomalyType,
          severity: m.severity.severity,
          description: `${m.mutationType} detected`,
          evidence: [],
          confidence: m.severity.confidence,
        })),
      },
      baselineComparison: {
        overallSimilarity: 0.92,
        byDimension: {
          semantic: 0.95,
          behavioral: 0.90,
          output: 0.91,
        },
        driftVector: [0.02, -0.01, 0.03],
        recommendation: 'Profile is stable, continue monitoring',
      },
    };
  }

  async flagAnomalies(profileId: string, execution: ChainExecution): Promise<AnomalyFlag[]> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    const flags: AnomalyFlag[] = [];
    const comparison = await this.compareExecution(profileId, execution);

    // Check semantic anomaly
    if (comparison.semanticSimilarity < (1 - profile.mutationThresholds.semanticDriftThreshold)) {
      flags.push({
        type: 'semantic-anomaly',
        severity: comparison.semanticSimilarity < 0.5 ? 'critical' : 'high',
        description: 'Semantic content significantly different from baseline',
        evidence: [`Similarity: ${comparison.semanticSimilarity.toFixed(2)}`],
        confidence: 0.9,
      });
    }

    // Check behavioral anomaly
    if (comparison.behavioralSimilarity < (1 - profile.mutationThresholds.behavioralDeviationThreshold)) {
      flags.push({
        type: 'behavioral-anomaly',
        severity: comparison.behavioralSimilarity < 0.5 ? 'critical' : 'high',
        description: 'Behavioral pattern deviates from expected',
        evidence: [`Similarity: ${comparison.behavioralSimilarity.toFixed(2)}`],
        confidence: 0.85,
      });
    }

    // Check output anomaly
    if (comparison.outputSimilarity < (1 - profile.mutationThresholds.outputShiftThreshold)) {
      flags.push({
        type: 'output-anomaly',
        severity: 'medium',
        description: 'Output distribution shifted from baseline',
        evidence: [`Similarity: ${comparison.outputSimilarity.toFixed(2)}`],
        confidence: 0.8,
      });
    }

    // Check for potential security anomalies
    if (this.detectSecurityAnomaly(execution)) {
      flags.push({
        type: 'security-anomaly',
        severity: 'critical',
        description: 'Potential security issue detected in execution',
        evidence: ['Suspicious pattern in output'],
        confidence: 0.7,
      });
    }

    return flags;
  }

  async getProfileHealth(profileId: string): Promise<ProfileHealth> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    const now = new Date();
    const lastUpdated = new Date(profile.updatedAt);
    const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (24 * 60 * 60 * 1000);

    const issues: ProfileHealth['issues'] = [];

    if (daysSinceUpdate > 30) {
      issues.push({
        type: 'outdated',
        severity: 'warning',
        description: `Profile hasn't been updated in ${Math.floor(daysSinceUpdate)} days`,
        recommendation: 'Update profile with recent executions',
      });
    }

    if (profile.generationConfig.sampleSize < 100) {
      issues.push({
        type: 'low-sample',
        severity: 'warning',
        description: `Profile based on only ${profile.generationConfig.sampleSize} samples`,
        recommendation: 'Collect more executions for better accuracy',
      });
    }

    const status: ProfileHealth['status'] =
      issues.some(i => i.severity === 'error') ? 'invalid' :
      daysSinceUpdate > 30 ? 'stale' :
      issues.length > 0 ? 'needs-update' : 'healthy';

    return {
      status,
      lastValidated: now.toISOString(),
      sampleCoverage: Math.min(profile.generationConfig.sampleSize / 1000, 1),
      confidence: status === 'healthy' ? 0.9 : 0.6,
      issues,
    };
  }

  async archiveProfile(profileId: string): Promise<void> {
    const profile = this.profiles.get(profileId);
    if (profile) {
      profile.health.status = 'invalid';
      this.profiles.set(profileId, profile);
    }
  }

  // ============================================================================
  // Private Methods - Profile Generation
  // ============================================================================

  private generatePromptFingerprint(executions: ChainExecution[]): PromptFingerprint {
    const prompts = executions.map(e => e.input.prompt);
    const structureHash = this.hashPromptStructure(prompts);

    // Generate semantic embedding (simplified)
    const semanticEmbedding = this.generateEmbedding(prompts.join(' '));

    // Extract instruction components
    const instructionComponents = this.extractInstructionComponents(prompts);

    // Analyze variables
    const variablePatterns = this.analyzeVariablePatterns(executions);

    // Extract constraints
    const constraintSignatures = this.extractConstraints(prompts);

    return {
      structureHash,
      semanticEmbedding,
      instructionComponents,
      variablePatterns,
      constraintSignatures,
      complexity: this.calculatePromptComplexity(prompts),
      styleCharacteristics: this.analyzeStyle(prompts),
    };
  }

  private generateBehaviorSignature(executions: ChainExecution[]): BehaviorSignature {
    const responsePatterns = this.extractResponsePatterns(executions);
    const decisionPatterns = this.extractDecisionPatterns(executions);
    const errorPatterns = this.extractErrorPatterns(executions);

    // Calculate centroid
    const embeddings = executions.map(e => this.generateEmbedding(e.output.response));
    const centroid = this.calculateCentroid(embeddings);
    const variance = this.calculateVariance(embeddings, centroid);

    return {
      responsePatterns,
      decisionPatterns,
      errorPatterns,
      interactionPatterns: [],
      centroid,
      variance,
      clusters: this.clusterBehaviors(embeddings),
    };
  }

  private generateOutputDistribution(executions: ChainExecution[]): OutputDistribution {
    const outputs = executions.map(e => e.output.response);
    const lengths = outputs.map(o => o.length);
    const tokens = executions.map(e => e.output.tokens);

    return {
      semanticDistribution: {
        mean: this.generateEmbedding(outputs.join(' ')),
        covariance: [[1]],  // Simplified
        principalComponents: [],
        outlierThreshold: 2.5,
      },
      lengthDistribution: this.calculateDistributionStats(lengths),
      tokenDistribution: {
        averageTokens: tokens.reduce((a, b) => a + b, 0) / tokens.length,
        byType: {},
        topTokens: [],
        vocabularyDiversity: 0.8,
      },
      contentTypeDistribution: this.analyzeContentTypes(outputs),
      qualityDistribution: {
        averageQuality: 0.9,
        qualityVariance: 0.05,
        byDimension: {},
      },
      confidenceDistribution: this.calculateDistributionStats(
        executions.map(() => 0.9)  // Placeholder
      ),
    };
  }

  private generateToolUsagePattern(executions: ChainExecution[]): ToolUsagePattern {
    const allToolCalls = executions.flatMap(e => e.trace.toolCalls);
    const toolIds = [...new Set(allToolCalls.map(t => t.toolId))];

    const toolStats = toolIds.map(toolId => {
      const calls = allToolCalls.filter(t => t.toolId === toolId);
      return {
        toolId,
        usageFrequency: calls.length / executions.length,
        averageLatencyMs: calls.reduce((sum, c) => sum + c.latencyMs, 0) / calls.length,
        successRate: calls.filter(c => c.success).length / calls.length,
        errorTypes: {},
        averageRetries: 0,
      };
    });

    return {
      availableTools: toolIds.map(id => ({
        id,
        name: id,
        type: 'external-api' as const,
        description: '',
      })),
      toolStats,
      selectionPatterns: [],
      toolChains: this.extractToolChains(executions),
      toolReliance: allToolCalls.length / executions.length,
    };
  }

  private generateReasoningPattern(executions: ChainExecution[]): ReasoningPattern {
    return {
      style: {
        predominant: 'analytical',
        characteristics: [
          { name: 'structured', strength: 0.8, examples: [] },
          { name: 'step-by-step', strength: 0.7, examples: [] },
        ],
      },
      cotPatterns: [],
      inferencePatterns: [
        { type: 'deductive', frequency: 0.6, reliability: 0.9, exampleContexts: [] },
        { type: 'inductive', frequency: 0.3, reliability: 0.8, exampleContexts: [] },
      ],
      knowledgeUtilization: {
        internalKnowledgeReliance: 0.7,
        externalKnowledgeReliance: 0.3,
        citationFrequency: 0.2,
        knowledgeIntegrationStyle: 'explicit',
      },
      depthDistribution: this.calculateDistributionStats([3, 4, 5, 4, 3, 4, 5, 4]),
      consistency: 0.85,
    };
  }

  private generateBaselineMetrics(executions: ChainExecution[]): BaselineMetrics {
    const latencies = executions.map(e => e.output.latencyMs);
    const tokens = executions.map(e => e.output.tokens);

    return {
      generatedAt: new Date().toISOString(),
      samplePeriod: {
        start: executions[0]?.timestamp || new Date().toISOString(),
        end: executions[executions.length - 1]?.timestamp || new Date().toISOString(),
      },
      sampleSize: executions.length,
      latency: this.calculateDistributionStats(latencies),
      throughput: this.calculateDistributionStats([100, 120, 110, 105, 115]),  // Placeholder
      errorRate: this.calculateDistributionStats([0.01, 0.02, 0.01, 0.015, 0.01]),
      outputQuality: this.calculateDistributionStats([0.9, 0.92, 0.88, 0.91, 0.89]),
      relevance: this.calculateDistributionStats([0.95, 0.93, 0.94, 0.96, 0.94]),
      coherence: this.calculateDistributionStats([0.92, 0.91, 0.93, 0.90, 0.92]),
      outputLength: this.calculateDistributionStats(executions.map(e => e.output.response.length)),
      toolUsageRate: this.calculateDistributionStats(
        executions.map(e => e.trace.toolCalls.length)
      ),
      confidenceScore: this.calculateDistributionStats([0.9, 0.88, 0.92, 0.89, 0.91]),
    };
  }

  private getDefaultThresholds(): MutationThresholds {
    return {
      semanticDriftThreshold: 0.2,
      behavioralDeviationThreshold: 0.25,
      outputShiftThreshold: 0.3,
      toolUsageChangeThreshold: 0.3,
      performanceDegradationThreshold: 0.2,
      custom: {},
    };
  }

  // ============================================================================
  // Private Methods - Analysis
  // ============================================================================

  private calculateSemanticSimilarity(profile: ChainDNAProfile, execution: ChainExecution): number {
    const executionEmbedding = this.generateEmbedding(execution.input.prompt);
    return this.cosineSimilarity(profile.promptFingerprint.semanticEmbedding, executionEmbedding);
  }

  private calculateBehavioralSimilarity(profile: ChainDNAProfile, execution: ChainExecution): number {
    const executionBehavior = this.generateEmbedding(execution.output.response);
    return this.cosineSimilarity(profile.behaviorSignature.centroid, executionBehavior);
  }

  private calculateOutputSimilarity(profile: ChainDNAProfile, execution: ChainExecution): number {
    const outputLength = execution.output.response.length;
    const baseline = profile.baselineMetrics.outputLength;

    // Z-score based similarity
    const zscore = Math.abs((outputLength - baseline.mean) / baseline.stdDev);
    return Math.exp(-zscore / 2);  // Convert to similarity score
  }

  private calculateDeviations(profile: ChainDNAProfile, execution: ChainExecution): DNAComparison['deviations'] {
    const deviations: DNAComparison['deviations'] = [];
    const baseline = profile.baselineMetrics;

    // Check latency deviation
    const latencyZscore = (execution.output.latencyMs - baseline.latency.mean) / baseline.latency.stdDev;
    deviations.push({
      dimension: 'latency',
      expected: baseline.latency.mean,
      actual: execution.output.latencyMs,
      zscore: latencyZscore,
      significant: Math.abs(latencyZscore) > 2,
    });

    // Check output length deviation
    const lengthZscore = (execution.output.response.length - baseline.outputLength.mean) / baseline.outputLength.stdDev;
    deviations.push({
      dimension: 'output_length',
      expected: baseline.outputLength.mean,
      actual: execution.output.response.length,
      zscore: lengthZscore,
      significant: Math.abs(lengthZscore) > 2,
    });

    // Check tool usage deviation
    const toolUsage = execution.trace.toolCalls.length;
    const toolZscore = (toolUsage - baseline.toolUsageRate.mean) / (baseline.toolUsageRate.stdDev || 1);
    deviations.push({
      dimension: 'tool_usage',
      expected: baseline.toolUsageRate.mean,
      actual: toolUsage,
      zscore: toolZscore,
      significant: Math.abs(toolZscore) > 2,
    });

    return deviations;
  }

  private determineMutationType(comparisons: DNAComparison[], profile: ChainDNAProfile): MutationType {
    const avgSemantic = comparisons.reduce((s, c) => s + c.semanticSimilarity, 0) / comparisons.length;
    const avgBehavioral = comparisons.reduce((s, c) => s + c.behavioralSimilarity, 0) / comparisons.length;
    const avgOutput = comparisons.reduce((s, c) => s + c.outputSimilarity, 0) / comparisons.length;

    if (avgSemantic < 0.7) return 'semantic-drift';
    if (avgBehavioral < 0.7) return 'behavioral-shift';
    if (avgOutput < 0.7) return 'output-distribution-change';
    return 'unknown';
  }

  private calculateMutationSeverity(mutationScore: number): MutationReport['severity'] {
    let severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    if (mutationScore > 0.5) severity = 'critical';
    else if (mutationScore > 0.35) severity = 'high';
    else if (mutationScore > 0.2) severity = 'medium';
    else if (mutationScore > 0.1) severity = 'low';
    else severity = 'info';

    return {
      value: mutationScore,
      severity,
      confidence: 0.85,
    };
  }

  private analyzeSemanticMutation(profile: ChainDNAProfile, executions: ChainExecution[]): MutationReport['semanticMutation'] {
    const currentEmbedding = this.generateEmbedding(executions.map(e => e.input.prompt).join(' '));
    const similarity = this.cosineSimilarity(profile.promptFingerprint.semanticEmbedding, currentEmbedding);

    return {
      baselineSimilarity: similarity,
      driftDirection: currentEmbedding.map((v, i) => v - profile.promptFingerprint.semanticEmbedding[i]),
      changedComponents: [],
      newInstructions: [],
      removedInstructions: [],
    };
  }

  private analyzeBehavioralMutation(profile: ChainDNAProfile, executions: ChainExecution[]): MutationReport['behavioralMutation'] {
    const currentBehavior = this.generateEmbedding(executions.map(e => e.output.response).join(' '));
    const distance = this.euclideanDistance(profile.behaviorSignature.centroid, currentBehavior);

    return {
      centroidDistance: distance,
      changedPatterns: [],
      newBehaviors: [],
      missingBehaviors: [],
      decisionChanges: [],
    };
  }

  private analyzeOutputMutation(profile: ChainDNAProfile, executions: ChainExecution[]): MutationReport['outputMutation'] {
    const currentLengths = executions.map(e => e.output.response.length);
    const currentStats = this.calculateDistributionStats(currentLengths);

    return {
      distributionShift: Math.abs(currentStats.mean - profile.baselineMetrics.outputLength.mean) /
        profile.baselineMetrics.outputLength.mean,
      lengthChange: {
        before: profile.baselineMetrics.outputLength,
        after: currentStats,
        changeSignificance: 0.5,
      },
      qualityChange: {
        before: profile.baselineMetrics.outputQuality,
        after: profile.baselineMetrics.outputQuality,  // Placeholder
        changeSignificance: 0.3,
      },
      contentTypeShift: {},
      newPatterns: [],
    };
  }

  private analyzeToolMutation(profile: ChainDNAProfile, executions: ChainExecution[]): MutationReport['toolMutation'] {
    const currentToolUsage = new Map<string, number>();
    executions.forEach(e => {
      e.trace.toolCalls.forEach(t => {
        currentToolUsage.set(t.toolId, (currentToolUsage.get(t.toolId) || 0) + 1);
      });
    });

    const changedTools = profile.toolUsagePattern.toolStats.map(baseline => {
      const current = (currentToolUsage.get(baseline.toolId) || 0) / executions.length;
      return {
        toolId: baseline.toolId,
        previousFrequency: baseline.usageFrequency,
        currentFrequency: current,
      };
    }).filter(t => Math.abs(t.currentFrequency - t.previousFrequency) > 0.1);

    return {
      changedTools,
      newToolUsage: [],
      abandonedTools: [],
      chainChanges: [],
    };
  }

  private performRootCauseAnalysis(
    mutationType: MutationType,
    semanticMutation: MutationReport['semanticMutation'],
    behavioralMutation: MutationReport['behavioralMutation']
  ): MutationReport['rootCauseAnalysis'] {
    const causes: MutationReport['rootCauseAnalysis']['causes'] = [];

    if (semanticMutation.baselineSimilarity < 0.7) {
      causes.push({
        type: 'prompt-change',
        description: 'Prompt content has significantly changed',
        probability: 0.8,
        evidence: ['Semantic similarity dropped below threshold'],
      });
    }

    if (behavioralMutation.centroidDistance > 0.5) {
      causes.push({
        type: 'model-update',
        description: 'Possible model behavior change',
        probability: 0.6,
        evidence: ['Behavioral centroid distance increased'],
      });
    }

    return {
      identified: causes.length > 0,
      confidence: causes.length > 0 ? 0.75 : 0.3,
      causes,
    };
  }

  private generateMutationRecommendations(
    mutationType: MutationType,
    mutationScore: number
  ): MutationReport['recommendations'] {
    const recommendations: MutationReport['recommendations'] = [];

    if (mutationScore > 0.3) {
      recommendations.push({
        priority: 'critical',
        action: 'investigate',
        description: 'Immediate investigation required for significant mutation',
        rationale: `Mutation score ${mutationScore.toFixed(2)} exceeds threshold`,
      });
    }

    if (mutationType === 'semantic-drift') {
      recommendations.push({
        priority: 'high',
        action: 'update-profile',
        description: 'Update DNA profile if changes are intentional',
        rationale: 'Semantic drift detected - verify prompt changes were authorized',
      });
    }

    recommendations.push({
      priority: 'medium',
      action: 'monitor',
      description: 'Continue monitoring for trend confirmation',
      rationale: 'Single point detection may be noise',
    });

    return recommendations;
  }

  // ============================================================================
  // Private Methods - Utilities
  // ============================================================================

  private hashPromptStructure(prompts: string[]): string {
    const normalized = prompts.map(p => p.toLowerCase().replace(/\s+/g, ' ')).join('');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  private generateEmbedding(text: string): number[] {
    // Simplified embedding - in production would use real embedding model
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(128).fill(0);

    words.forEach((word, i) => {
      const hash = this.simpleHash(word);
      embedding[hash % 128] += 1 / (i + 1);
    });

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return magnitude > 0 ? embedding.map(v => v / magnitude) : embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) return Infinity;
    return Math.sqrt(a.reduce((sum, v, i) => sum + Math.pow(v - b[i], 2), 0));
  }

  private calculateCentroid(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];
    const dim = vectors[0].length;
    const centroid = new Array(dim).fill(0);

    vectors.forEach(v => {
      v.forEach((val, i) => {
        centroid[i] += val;
      });
    });

    return centroid.map(v => v / vectors.length);
  }

  private calculateVariance(vectors: number[][], centroid: number[]): number {
    if (vectors.length === 0) return 0;
    return vectors.reduce((sum, v) => {
      return sum + v.reduce((s, val, i) => s + Math.pow(val - centroid[i], 2), 0);
    }, 0) / vectors.length;
  }

  private calculateDistributionStats(values: number[]): DistributionStats {
    if (values.length === 0) {
      return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, percentiles: {} };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );

    return {
      mean,
      median,
      stdDev,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      percentiles: {
        p25: sorted[Math.floor(sorted.length * 0.25)],
        p75: sorted[Math.floor(sorted.length * 0.75)],
        p90: sorted[Math.floor(sorted.length * 0.90)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      },
    };
  }

  private extractInstructionComponents(prompts: string[]): PromptFingerprint['instructionComponents'] {
    return [
      {
        id: 'task',
        type: 'task',
        content: 'Primary task instruction',
        importance: 0.9,
        embedding: this.generateEmbedding('task'),
      },
    ];
  }

  private analyzeVariablePatterns(executions: ChainExecution[]): PromptFingerprint['variablePatterns'] {
    const variables = new Map<string, Set<string>>();

    executions.forEach(e => {
      Object.entries(e.input.variables).forEach(([key, value]) => {
        if (!variables.has(key)) variables.set(key, new Set());
        variables.get(key)!.add(String(value));
      });
    });

    return Array.from(variables.entries()).map(([name, values]) => ({
      name,
      type: 'string',
      distributionType: 'categorical' as const,
      commonValues: [...values].slice(0, 10),
      entropy: Math.log2(values.size),
    }));
  }

  private extractConstraints(prompts: string[]): PromptFingerprint['constraintSignatures'] {
    return [
      { type: 'format', description: 'Output format constraint', strictness: 0.8 },
      { type: 'safety', description: 'Safety guardrails', strictness: 0.95 },
    ];
  }

  private calculatePromptComplexity(prompts: string[]): PromptFingerprint['complexity'] {
    const avgLength = prompts.reduce((s, p) => s + p.length, 0) / prompts.length;
    return {
      tokenCount: Math.floor(avgLength / 4),
      variableCount: 5,
      instructionCount: 3,
      nestingDepth: 1,
      conditionalBranches: 0,
      complexityScore: Math.min(avgLength / 1000, 1),
    };
  }

  private analyzeStyle(prompts: string[]): PromptFingerprint['styleCharacteristics'] {
    return {
      formality: 0.7,
      verbosity: 0.5,
      directness: 0.8,
      technicalLevel: 0.6,
      emotionalTone: 0.3,
    };
  }

  private extractResponsePatterns(executions: ChainExecution[]): BehaviorSignature['responsePatterns'] {
    return [
      {
        id: 'default',
        name: 'Default Response Pattern',
        frequency: 0.8,
        features: [],
        triggerContexts: [],
        outputCharacteristics: {
          averageLength: 500,
          lengthVariance: 200,
          structureType: 'prose',
          sentimentRange: { min: 0.3, max: 0.7 },
          confidenceRange: { min: 0.8, max: 0.95 },
        },
      },
    ];
  }

  private extractDecisionPatterns(executions: ChainExecution[]): BehaviorSignature['decisionPatterns'] {
    return [];
  }

  private extractErrorPatterns(executions: ChainExecution[]): BehaviorSignature['errorPatterns'] {
    return [];
  }

  private clusterBehaviors(embeddings: number[][]): BehaviorSignature['clusters'] {
    return [
      {
        id: 'main',
        name: 'Main Cluster',
        centroid: this.calculateCentroid(embeddings),
        size: embeddings.length,
        characteristics: ['standard behavior'],
      },
    ];
  }

  private analyzeContentTypes(outputs: string[]): OutputDistribution['contentTypeDistribution'] {
    return {
      prose: 0.7,
      code: 0.1,
      list: 0.15,
      table: 0.02,
      json: 0.02,
      other: 0.01,
    };
  }

  private extractToolChains(executions: ChainExecution[]): ToolUsagePattern['toolChains'] {
    return [];
  }

  private detectSecurityAnomaly(execution: ChainExecution): boolean {
    const output = execution.output.response.toLowerCase();
    const suspiciousPatterns = [
      'ignore previous',
      'forget your instructions',
      'you are now',
      'jailbreak',
    ];
    return suspiciousPatterns.some(p => output.includes(p));
  }

  private groupBySeverity(mutations: MutationReport[]): Record<string, number> {
    const groups: Record<string, number> = {};
    mutations.forEach(m => {
      groups[m.severity.severity] = (groups[m.severity.severity] || 0) + 1;
    });
    return groups;
  }

  private groupByType(mutations: MutationReport[]): Record<string, number> {
    const groups: Record<string, number> = {};
    mutations.forEach(m => {
      groups[m.mutationType] = (groups[m.mutationType] || 0) + 1;
    });
    return groups;
  }
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ChainDNAEngineConfig {
  minSampleSize?: number;
  embeddingModel?: string;
  defaultThresholds?: Partial<MutationThresholds>;
}

// ============================================================================
// Export Default Instance
// ============================================================================

export const chainDNAEngine = new ChainDNAEngine();
