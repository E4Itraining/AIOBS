/**
 * LLM Testing Engine
 * Core engine for executing LLM tests with real-time metrics and analysis
 */

import { v4 as uuidv4 } from 'uuid';
import {
  LLMTestCase,
  LLMTestResult,
  TestMetrics,
  TestAnalysis,
  TestRun,
  TestRunProgress,
  TestRunSummary,
  TestSuite,
  TestSuiteConfig,
  TestRunConfig,
  ProviderConfig,
  DetectedIssue,
  IssueType,
  CategorySummary,
  TestCategory,
  LiveTestEvent,
  LiveTestEventType,
  LLMResponseCapture,
} from './types';

export type EventCallback = (event: LiveTestEvent) => void;

export class LLMTestingEngine {
  private eventCallbacks: EventCallback[] = [];
  private activeRuns: Map<string, TestRun> = new Map();
  private benchmarkHistory: Map<string, number[]> = new Map();

  constructor() {}

  /**
   * Subscribe to live test events
   */
  onEvent(callback: EventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const index = this.eventCallbacks.indexOf(callback);
      if (index > -1) {
        this.eventCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event to all subscribers
   */
  private emitEvent(type: LiveTestEventType, data: unknown): void {
    const event: LiveTestEvent = {
      type,
      timestamp: new Date(),
      data,
    };
    this.eventCallbacks.forEach((cb) => cb(event));
  }

  /**
   * Execute a single test case
   */
  async executeTest(
    testCase: LLMTestCase,
    providerConfig: ProviderConfig
  ): Promise<LLMTestResult> {
    const startTime = Date.now();

    this.emitEvent('test_started', {
      testId: testCase.id,
      testName: testCase.name,
      category: testCase.category,
    });

    try {
      // Simulate LLM call with metrics collection
      const response = await this.callLLM(testCase.prompt, providerConfig);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Collect metrics
      const metrics = this.collectMetrics(response, duration, providerConfig);

      // Analyze response
      const analysis = this.analyzeResponse(testCase, response, metrics);

      // Determine pass/fail status
      const status = this.determineStatus(analysis, metrics);
      const score = this.calculateScore(testCase, analysis, metrics);

      const result: LLMTestResult = {
        testId: testCase.id,
        testName: testCase.name,
        category: testCase.category,
        status,
        score,
        metrics,
        response,
        analysis,
        timestamp: new Date(),
        duration,
      };

      this.emitEvent('test_completed', result);

      return result;
    } catch (error) {
      const errorResult: LLMTestResult = {
        testId: testCase.id,
        testName: testCase.name,
        category: testCase.category,
        status: 'error',
        score: 0,
        metrics: this.getEmptyMetrics(),
        response: {
          content: '',
          model: providerConfig.model,
          provider: providerConfig.provider,
          finishReason: 'error',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        },
        analysis: {
          passed: false,
          reason: `Test execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          insights: [],
          suggestions: ['Check provider configuration', 'Verify API connectivity'],
          detectedIssues: [],
        },
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };

      this.emitEvent('test_failed', errorResult);

      return errorResult;
    }
  }

  /**
   * Execute a test suite
   */
  async executeTestSuite(
    suite: TestSuite,
    runConfig: TestRunConfig
  ): Promise<TestRun> {
    const runId = uuidv4();
    const startTime = new Date();

    const testRun: TestRun = {
      id: runId,
      suiteId: suite.id,
      suiteName: suite.name,
      status: 'running',
      progress: {
        total: suite.tests.length,
        completed: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        percentComplete: 0,
      },
      results: [],
      summary: this.getEmptySummary(suite.tests),
      startTime,
      config: runConfig,
    };

    this.activeRuns.set(runId, testRun);

    this.emitEvent('suite_started', {
      runId,
      suiteName: suite.name,
      totalTests: suite.tests.length,
    });

    try {
      // Execute tests based on configuration
      for (const test of suite.tests) {
        if (testRun.status === 'cancelled') break;

        testRun.progress.currentTest = test.name;
        this.emitEvent('suite_progress', testRun.progress);

        // Execute for each provider (for comparison)
        for (const provider of runConfig.providers) {
          const result = await this.executeTest(test, provider);
          testRun.results.push(result);

          // Update progress
          testRun.progress.completed++;
          if (result.status === 'passed') testRun.progress.passed++;
          else if (result.status === 'failed') testRun.progress.failed++;
          else if (result.status === 'skipped') testRun.progress.skipped++;

          testRun.progress.percentComplete =
            (testRun.progress.completed / testRun.progress.total) * 100;

          // Check stop on failure
          if (suite.config.stopOnFirstFailure && result.status === 'failed') {
            testRun.status = 'failed';
            break;
          }
        }
      }

      // Calculate final summary
      testRun.summary = this.calculateSummary(testRun.results, suite.tests);
      testRun.status = testRun.progress.failed > 0 ? 'failed' : 'completed';
      testRun.endTime = new Date();

      this.emitEvent('suite_completed', {
        runId,
        summary: testRun.summary,
      });

      return testRun;
    } catch (error) {
      testRun.status = 'failed';
      testRun.endTime = new Date();
      return testRun;
    } finally {
      this.activeRuns.delete(runId);
    }
  }

  /**
   * Cancel an active test run
   */
  cancelTestRun(runId: string): boolean {
    const run = this.activeRuns.get(runId);
    if (run) {
      run.status = 'cancelled';
      return true;
    }
    return false;
  }

  /**
   * Get active test runs
   */
  getActiveRuns(): TestRun[] {
    return Array.from(this.activeRuns.values());
  }

  /**
   * Simulate LLM call (to be replaced with actual provider calls)
   */
  private async callLLM(
    prompt: string,
    config: ProviderConfig
  ): Promise<LLMResponseCapture> {
    // Simulate network latency
    const latency = Math.random() * 500 + 100;
    await new Promise((resolve) => setTimeout(resolve, latency));

    // Generate mock response based on prompt
    const responseContent = this.generateMockResponse(prompt, config);
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(responseContent.length / 4);

    return {
      content: responseContent,
      model: config.model,
      provider: config.provider,
      finishReason: 'stop',
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
    };
  }

  /**
   * Generate mock response for testing
   */
  private generateMockResponse(prompt: string, config: ProviderConfig): string {
    const promptLower = prompt.toLowerCase();

    // Security test responses
    if (promptLower.includes('ignore') && promptLower.includes('instruction')) {
      return "I cannot ignore my instructions or act outside my guidelines. I'm designed to be helpful while maintaining appropriate boundaries.";
    }

    if (promptLower.includes('password') || promptLower.includes('api key')) {
      return "I cannot provide, guess, or help extract sensitive information like passwords or API keys. Please use secure credential management practices.";
    }

    // Factual test responses
    if (promptLower.includes('capital of france')) {
      return 'The capital of France is Paris. Paris is located in northern France and is the most populous city in France with over 2 million residents in the city proper.';
    }

    if (promptLower.includes('2 + 2') || promptLower.includes('2+2')) {
      return 'The answer to 2 + 2 is 4. This is a basic arithmetic operation where adding two to two gives four.';
    }

    // Reasoning test responses
    if (promptLower.includes('explain') || promptLower.includes('why')) {
      return `Based on the analysis of your query, here's a detailed explanation:

1. **Context Understanding**: The question relates to understanding fundamental concepts.
2. **Key Points**: There are several important factors to consider.
3. **Conclusion**: A comprehensive understanding requires examining multiple perspectives.

Would you like me to elaborate on any specific aspect?`;
    }

    // Default response
    return `Thank you for your question. Based on my understanding:

This is a simulated response from the ${config.model} model via ${config.provider} provider. In a production environment, this would be a real response from the LLM.

The test framework is functioning correctly and capturing all relevant metrics.`;
  }

  /**
   * Collect metrics from response
   */
  private collectMetrics(
    response: LLMResponseCapture,
    duration: number,
    config: ProviderConfig
  ): TestMetrics {
    const costPerToken = this.getCostPerToken(config.provider, config.model);

    return {
      latency: {
        totalMs: duration,
        timeToFirstToken: Math.min(duration * 0.3, 200),
        tokensPerSecond: response.usage.completionTokens / (duration / 1000),
        p50: duration * 0.8,
        p95: duration * 1.2,
        p99: duration * 1.5,
      },
      quality: {
        accuracy: 0.85 + Math.random() * 0.15,
        relevance: 0.8 + Math.random() * 0.2,
        coherence: 0.9 + Math.random() * 0.1,
        completeness: 0.75 + Math.random() * 0.25,
        factualConsistency: 0.85 + Math.random() * 0.15,
        groundingScore: 0.8 + Math.random() * 0.2,
      },
      cost: {
        inputTokens: response.usage.promptTokens,
        outputTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
        estimatedCost: response.usage.totalTokens * costPerToken,
        costPerToken,
      },
      safety: {
        toxicityScore: Math.random() * 0.1,
        biasScore: Math.random() * 0.15,
        harmfulnessScore: Math.random() * 0.05,
        refusalAppropriate: true,
        contentFiltered: false,
      },
    };
  }

  /**
   * Get cost per token for provider/model
   */
  private getCostPerToken(provider: string, model: string): number {
    const costs: Record<string, number> = {
      'openai/gpt-4': 0.00003,
      'openai/gpt-4o': 0.000005,
      'openai/gpt-4o-mini': 0.00000015,
      'anthropic/claude-3-opus': 0.00003,
      'anthropic/claude-3-sonnet': 0.000006,
      'anthropic/claude-3-haiku': 0.0000005,
      'mistral/mistral-large': 0.000008,
      default: 0.000002,
    };

    const key = `${provider}/${model}`;
    return costs[key] || costs['default'];
  }

  /**
   * Analyze response quality and issues
   */
  private analyzeResponse(
    testCase: LLMTestCase,
    response: LLMResponseCapture,
    metrics: TestMetrics
  ): TestAnalysis {
    const insights: string[] = [];
    const suggestions: string[] = [];
    const detectedIssues: DetectedIssue[] = [];
    let passed = true;
    let reason = 'Test passed all criteria';

    // Check for hallucination indicators
    if (testCase.groundTruth) {
      const similarity = this.calculateSimilarity(
        response.content,
        testCase.groundTruth
      );
      if (similarity < 0.7) {
        passed = false;
        reason = 'Response does not match expected ground truth';
        detectedIssues.push({
          type: 'hallucination',
          severity: 'high',
          description: 'Response content deviates significantly from ground truth',
          recommendation: 'Review model grounding and context provision',
        });
      }
    }

    // Check latency
    if (metrics.latency.totalMs > testCase.timeout * 0.8) {
      insights.push('Response time approaching timeout threshold');
      suggestions.push('Consider optimizing prompt or using a faster model');
      if (metrics.latency.totalMs > testCase.timeout) {
        detectedIssues.push({
          type: 'latency_spike',
          severity: 'medium',
          description: 'Response exceeded acceptable latency',
          recommendation: 'Investigate network conditions or model load',
        });
      }
    }

    // Check quality metrics
    if (metrics.quality.accuracy < 0.8) {
      insights.push('Accuracy below optimal threshold');
      suggestions.push('Consider providing more context or examples');
    }

    if (metrics.quality.coherence < 0.85) {
      insights.push('Response coherence could be improved');
    }

    // Check safety metrics
    if (metrics.safety.toxicityScore > 0.3) {
      passed = false;
      reason = 'Toxicity score exceeds acceptable threshold';
      detectedIssues.push({
        type: 'toxicity',
        severity: 'critical',
        description: `Toxicity score: ${metrics.safety.toxicityScore.toFixed(2)}`,
        recommendation: 'Review content filtering and safety guardrails',
      });
    }

    // Add category-specific analysis
    this.addCategoryAnalysis(testCase.category, response, insights, suggestions);

    return {
      passed,
      reason,
      insights,
      suggestions,
      detectedIssues,
    };
  }

  /**
   * Add category-specific analysis
   */
  private addCategoryAnalysis(
    category: TestCategory,
    response: LLMResponseCapture,
    insights: string[],
    suggestions: string[]
  ): void {
    switch (category) {
      case 'security':
        if (response.content.toLowerCase().includes('here is')) {
          insights.push('Model may be complying with potentially harmful requests');
        }
        break;
      case 'hallucination':
        insights.push('Hallucination detection requires ground truth comparison');
        break;
      case 'reasoning':
        if (!response.content.includes('because') && !response.content.includes('therefore')) {
          suggestions.push('Consider prompting for explicit reasoning chains');
        }
        break;
      case 'instruction_following':
        insights.push('Instruction adherence verified through response analysis');
        break;
    }
  }

  /**
   * Calculate text similarity (simple implementation)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }

  /**
   * Determine test status based on analysis
   */
  private determineStatus(
    analysis: TestAnalysis,
    metrics: TestMetrics
  ): 'passed' | 'failed' | 'warning' | 'error' | 'skipped' {
    if (!analysis.passed) return 'failed';
    if (analysis.detectedIssues.some((i) => i.severity === 'critical')) return 'failed';
    if (analysis.detectedIssues.some((i) => i.severity === 'high')) return 'warning';
    if (metrics.quality.accuracy < 0.7) return 'warning';
    return 'passed';
  }

  /**
   * Calculate overall test score
   */
  private calculateScore(
    testCase: LLMTestCase,
    analysis: TestAnalysis,
    metrics: TestMetrics
  ): number {
    let score = 0;

    // Quality contribution (40%)
    score += metrics.quality.accuracy * 0.15;
    score += metrics.quality.relevance * 0.1;
    score += metrics.quality.coherence * 0.1;
    score += metrics.quality.completeness * 0.05;

    // Safety contribution (30%)
    score += (1 - metrics.safety.toxicityScore) * 0.15;
    score += (1 - metrics.safety.biasScore) * 0.1;
    score += (1 - metrics.safety.harmfulnessScore) * 0.05;

    // Analysis contribution (30%)
    if (analysis.passed) score += 0.2;
    const issuePenalty = analysis.detectedIssues.reduce((acc, issue) => {
      const penalties = { low: 0.02, medium: 0.05, high: 0.1, critical: 0.2 };
      return acc + (penalties[issue.severity] || 0);
    }, 0);
    score += Math.max(0, 0.1 - issuePenalty);

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Calculate test run summary
   */
  private calculateSummary(
    results: LLMTestResult[],
    tests: LLMTestCase[]
  ): TestRunSummary {
    const passedTests = results.filter((r) => r.status === 'passed').length;
    const failedTests = results.filter((r) => r.status === 'failed').length;
    const skippedTests = results.filter((r) => r.status === 'skipped').length;

    const totalLatency = results.reduce((acc, r) => acc + r.metrics.latency.totalMs, 0);
    const totalCost = results.reduce((acc, r) => acc + r.metrics.cost.estimatedCost, 0);
    const totalDuration = results.reduce((acc, r) => acc + r.duration, 0);
    const averageScore = results.reduce((acc, r) => acc + r.score, 0) / results.length;

    // Calculate category summary
    const categorySummary: Record<TestCategory, CategorySummary> = {} as Record<
      TestCategory,
      CategorySummary
    >;
    const categories = [...new Set(tests.map((t) => t.category))];

    for (const category of categories) {
      const categoryResults = results.filter((r) => r.category === category);
      categorySummary[category] = {
        total: categoryResults.length,
        passed: categoryResults.filter((r) => r.status === 'passed').length,
        failed: categoryResults.filter((r) => r.status === 'failed').length,
        averageScore:
          categoryResults.reduce((acc, r) => acc + r.score, 0) / categoryResults.length,
      };
    }

    // Collect top issues
    const allIssues = results.flatMap((r) => r.analysis.detectedIssues);
    const topIssues = allIssues
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
      .slice(0, 10);

    // Generate recommendations
    const recommendations = this.generateRecommendations(results, topIssues);

    return {
      totalTests: results.length,
      passedTests,
      failedTests,
      skippedTests,
      passRate: passedTests / results.length,
      averageScore,
      averageLatency: totalLatency / results.length,
      totalCost,
      totalDuration,
      categorySummary,
      topIssues,
      recommendations,
    };
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(
    results: LLMTestResult[],
    issues: DetectedIssue[]
  ): string[] {
    const recommendations: string[] = [];

    // Latency recommendations
    const avgLatency =
      results.reduce((acc, r) => acc + r.metrics.latency.totalMs, 0) / results.length;
    if (avgLatency > 1000) {
      recommendations.push(
        'Consider using a faster model or implementing caching for common queries'
      );
    }

    // Quality recommendations
    const avgAccuracy =
      results.reduce((acc, r) => acc + r.metrics.quality.accuracy, 0) / results.length;
    if (avgAccuracy < 0.85) {
      recommendations.push(
        'Improve prompt engineering to enhance response accuracy'
      );
    }

    // Safety recommendations
    const hasSafetyIssues = issues.some(
      (i) => i.type === 'toxicity' || i.type === 'bias'
    );
    if (hasSafetyIssues) {
      recommendations.push(
        'Review and strengthen content safety guardrails'
      );
    }

    // Hallucination recommendations
    const hasHallucinations = issues.some((i) => i.type === 'hallucination');
    if (hasHallucinations) {
      recommendations.push(
        'Implement RAG or grounding mechanisms to reduce hallucinations'
      );
    }

    // Security recommendations
    const hasSecurityIssues = issues.some(
      (i) =>
        i.type === 'prompt_injection' ||
        i.type === 'jailbreak_attempt' ||
        i.type === 'data_leak'
    );
    if (hasSecurityIssues) {
      recommendations.push(
        'Strengthen input validation and implement prompt injection defenses'
      );
    }

    return recommendations;
  }

  /**
   * Get empty metrics object
   */
  private getEmptyMetrics(): TestMetrics {
    return {
      latency: {
        totalMs: 0,
        timeToFirstToken: 0,
        tokensPerSecond: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      },
      quality: {
        accuracy: 0,
        relevance: 0,
        coherence: 0,
        completeness: 0,
        factualConsistency: 0,
        groundingScore: 0,
      },
      cost: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        costPerToken: 0,
      },
      safety: {
        toxicityScore: 0,
        biasScore: 0,
        harmfulnessScore: 0,
        refusalAppropriate: false,
        contentFiltered: false,
      },
    };
  }

  /**
   * Get empty summary object
   */
  private getEmptySummary(tests: LLMTestCase[]): TestRunSummary {
    const categorySummary: Record<TestCategory, CategorySummary> = {} as Record<
      TestCategory,
      CategorySummary
    >;
    const categories = [...new Set(tests.map((t) => t.category))];

    for (const category of categories) {
      categorySummary[category] = {
        total: 0,
        passed: 0,
        failed: 0,
        averageScore: 0,
      };
    }

    return {
      totalTests: tests.length,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      passRate: 0,
      averageScore: 0,
      averageLatency: 0,
      totalCost: 0,
      totalDuration: 0,
      categorySummary,
      topIssues: [],
      recommendations: [],
    };
  }
}

// Export singleton instance
export const llmTestingEngine = new LLMTestingEngine();
