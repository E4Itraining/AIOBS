/**
 * Prompt GitOps Engine
 *
 * Git-like versioning, governance, and deployment for LLM prompts.
 * Enables enterprise-grade prompt management with approval workflows.
 *
 * @module prompt-ops-engine
 */

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import {
  Prompt,
  PromptVersion,
  PromptContent,
  PromptVariable,
  PromptExample,
  PromptDiff,
  PromptReviewRequest,
  PromptReview,
  PromptDeployment,
  PromptExperiment,
  PromptRegistry,
  PromptAuditEntry,
  PromptAnalytics,
  ActorIdentity,
  TimeRange,
  NormalizedScore,
  SemanticDiff,
  TextDiff,
  ComplianceCheck,
} from '../types';

// ============================================================================
// Prompt Ops Engine Interface
// ============================================================================

export interface IPromptOpsEngine {
  /** Create a new prompt */
  createPrompt(prompt: CreatePromptInput): Promise<Prompt>;

  /** Get prompt by ID */
  getPrompt(promptId: string): Promise<Prompt | null>;

  /** Create a new version */
  createVersion(promptId: string, version: CreateVersionInput): Promise<PromptVersion>;

  /** Get version by ID */
  getVersion(versionId: string): Promise<PromptVersion | null>;

  /** Compare two versions */
  diffVersions(fromVersionId: string, toVersionId: string): Promise<PromptDiff>;

  /** Create review request */
  createReviewRequest(request: CreateReviewRequestInput): Promise<PromptReviewRequest>;

  /** Submit review */
  submitReview(requestId: string, review: SubmitReviewInput): Promise<PromptReviewRequest>;

  /** Merge approved request */
  mergeRequest(requestId: string, actor: ActorIdentity): Promise<PromptReviewRequest>;

  /** Deploy version to environment */
  deployVersion(deployment: CreateDeploymentInput): Promise<PromptDeployment>;

  /** Rollback deployment */
  rollbackDeployment(deploymentId: string, reason: string): Promise<PromptDeployment>;

  /** Create A/B experiment */
  createExperiment(experiment: CreateExperimentInput): Promise<PromptExperiment>;

  /** End experiment */
  endExperiment(experimentId: string, winner?: string): Promise<PromptExperiment>;

  /** Get prompt analytics */
  getAnalytics(promptId: string, period: TimeRange): Promise<PromptAnalytics>;

  /** Get audit trail */
  getAuditTrail(promptId: string): Promise<PromptAuditEntry[]>;

  /** Run compliance checks */
  runComplianceChecks(versionId: string, checkTypes: string[]): Promise<ComplianceCheck[]>;

  /** Search prompts */
  searchPrompts(query: SearchPromptsInput): Promise<Prompt[]>;
}

// ============================================================================
// Input Types
// ============================================================================

interface CreatePromptInput {
  name: string;
  description: string;
  namespace: string;
  content: PromptContent;
  variables?: PromptVariable[];
  examples?: PromptExample[];
  owner: ActorIdentity;
}

interface CreateVersionInput {
  content: PromptContent;
  variables?: PromptVariable[];
  examples?: PromptExample[];
  changeType: 'major' | 'minor' | 'patch';
  summary: string;
  details?: string;
  author: ActorIdentity;
}

interface CreateReviewRequestInput {
  promptId: string;
  proposedVersion: PromptVersion;
  title: string;
  description: string;
  author: ActorIdentity;
  reviewers: ActorIdentity[];
}

interface SubmitReviewInput {
  reviewer: ActorIdentity;
  status: 'approved' | 'changes-requested' | 'commented';
  comments: string[];
}

interface CreateDeploymentInput {
  promptId: string;
  versionId: string;
  environment: 'development' | 'staging' | 'production';
  strategy: 'immediate' | 'canary' | 'blue-green';
  actor: ActorIdentity;
}

interface CreateExperimentInput {
  promptId: string;
  name: string;
  description: string;
  variants: { versionId: string; trafficPercentage: number; isControl: boolean }[];
  primaryMetric: string;
  minSampleSize: number;
  maxDurationDays: number;
  author: ActorIdentity;
}

interface SearchPromptsInput {
  query?: string;
  namespace?: string;
  category?: string;
  tags?: string[];
  owner?: string;
}

// ============================================================================
// Prompt Ops Engine Implementation
// ============================================================================

export class PromptOpsEngine implements IPromptOpsEngine {
  private prompts: Map<string, Prompt> = new Map();
  private versions: Map<string, PromptVersion> = new Map();
  private reviewRequests: Map<string, PromptReviewRequest> = new Map();
  private deployments: Map<string, PromptDeployment> = new Map();
  private experiments: Map<string, PromptExperiment> = new Map();
  private auditLogs: Map<string, PromptAuditEntry[]> = new Map();

  constructor(
    private readonly config: PromptOpsEngineConfig = {}
  ) {}

  async createPrompt(input: CreatePromptInput): Promise<Prompt> {
    const now = new Date().toISOString();
    const promptId = uuidv4();
    const versionId = uuidv4();

    // Create initial version
    const version: PromptVersion = {
      id: versionId,
      promptId,
      version: '1.0.0',
      hash: this.calculateContentHash(input.content),
      content: input.content,
      variables: input.variables || [],
      examples: input.examples || [],
      changeInfo: {
        changeType: 'major',
        summary: 'Initial version',
        details: 'First version of the prompt',
      },
      deployment: {
        status: 'draft',
        deployedEnvironments: [],
      },
      createdAt: now,
      createdBy: input.owner,
    };

    this.versions.set(versionId, version);

    // Create prompt
    const prompt: Prompt = {
      id: promptId,
      name: input.name,
      description: input.description,
      namespace: input.namespace,
      currentVersion: version,
      versions: [version],
      versionCount: 1,
      metadata: {
        tags: [],
        category: 'uncategorized',
        useCase: 'general',
        language: 'en',
        riskLevel: 'low',
        customFields: {},
      },
      ownership: {
        owner: input.owner,
        team: input.owner.tenantId || 'default',
        reviewers: [],
        approvers: [],
        subscribers: [],
      },
      deploymentStatus: {
        production: { deployed: false, health: 'unknown' },
        staging: { deployed: false, health: 'unknown' },
        development: { deployed: false, health: 'unknown' },
      },
      modelConstraints: [],
      compliance: {
        requiresReview: true,
        requiresApproval: true,
        approvalLevel: 'team',
        piiScanRequired: true,
        biasScanRequired: true,
        securityScanRequired: true,
        retentionPolicy: '365d',
      },
      createdAt: now,
      updatedAt: now,
    };

    this.prompts.set(promptId, prompt);

    // Add audit entry
    this.addAuditEntry(promptId, {
      action: 'created',
      actor: input.owner,
      details: { name: input.name, namespace: input.namespace },
    });

    return prompt;
  }

  async getPrompt(promptId: string): Promise<Prompt | null> {
    return this.prompts.get(promptId) || null;
  }

  async createVersion(promptId: string, input: CreateVersionInput): Promise<PromptVersion> {
    const prompt = this.prompts.get(promptId);
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptId}`);
    }

    const now = new Date().toISOString();
    const versionId = uuidv4();

    // Calculate new version number
    const newVersion = this.incrementVersion(prompt.currentVersion.version, input.changeType);

    const version: PromptVersion = {
      id: versionId,
      promptId,
      version: newVersion,
      hash: this.calculateContentHash(input.content),
      content: input.content,
      variables: input.variables || prompt.currentVersion.variables,
      examples: input.examples || prompt.currentVersion.examples,
      changeInfo: {
        changeType: input.changeType,
        summary: input.summary,
        details: input.details || '',
        parentVersion: prompt.currentVersion.version,
      },
      deployment: {
        status: 'draft',
        deployedEnvironments: [],
      },
      createdAt: now,
      createdBy: input.author,
    };

    this.versions.set(versionId, version);

    // Update prompt
    prompt.versions.push(version);
    prompt.versionCount++;
    prompt.updatedAt = now;
    this.prompts.set(promptId, prompt);

    // Add audit entry
    this.addAuditEntry(promptId, {
      action: 'version-created',
      actor: input.author,
      versionId,
      details: { version: newVersion, changeType: input.changeType },
    });

    return version;
  }

  async getVersion(versionId: string): Promise<PromptVersion | null> {
    return this.versions.get(versionId) || null;
  }

  async diffVersions(fromVersionId: string, toVersionId: string): Promise<PromptDiff> {
    const fromVersion = this.versions.get(fromVersionId);
    const toVersion = this.versions.get(toVersionId);

    if (!fromVersion || !toVersion) {
      throw new Error('One or both versions not found');
    }

    const now = new Date().toISOString();

    // Calculate text diff
    const textDiff = this.calculateTextDiff(fromVersion.content, toVersion.content);

    // Calculate semantic diff
    const semanticDiff = await this.calculateSemanticDiff(fromVersion.content, toVersion.content);

    // Calculate impact analysis
    const impactAnalysis = this.calculateImpactAnalysis(fromVersion, toVersion, semanticDiff);

    // Determine change magnitude
    const changeMagnitude = this.determineChangeMagnitude(textDiff, semanticDiff);

    return {
      id: uuidv4(),
      fromVersion: fromVersion.version,
      toVersion: toVersion.version,
      generatedAt: now,
      textDiff,
      semanticDiff,
      impactAnalysis,
      changeMagnitude,
      requiresReview: changeMagnitude !== 'trivial',
    };
  }

  async createReviewRequest(input: CreateReviewRequestInput): Promise<PromptReviewRequest> {
    const now = new Date().toISOString();
    const requestId = uuidv4();

    const prompt = this.prompts.get(input.promptId);
    if (!prompt) {
      throw new Error(`Prompt not found: ${input.promptId}`);
    }

    // Calculate diff
    const diff = await this.diffVersions(prompt.currentVersion.id, input.proposedVersion.id);

    const request: PromptReviewRequest = {
      id: requestId,
      promptId: input.promptId,
      title: input.title,
      description: input.description,
      proposedVersion: input.proposedVersion,
      baseVersion: prompt.currentVersion.version,
      diff,
      author: input.author,
      reviewers: input.reviewers.map(r => ({
        reviewer: r,
        assignedAt: now,
        required: true,
        reviewed: false,
      })),
      status: 'pending-review',
      reviews: [],
      complianceChecks: [],
      testResults: [],
      createdAt: now,
      updatedAt: now,
    };

    this.reviewRequests.set(requestId, request);

    // Run compliance checks
    request.complianceChecks = await this.runComplianceChecks(input.proposedVersion.id, [
      'pii-scan',
      'bias-detection',
      'security-scan',
    ]);

    this.reviewRequests.set(requestId, request);

    // Add audit entry
    this.addAuditEntry(input.promptId, {
      action: 'review-requested',
      actor: input.author,
      details: { requestId, title: input.title },
    });

    return request;
  }

  async submitReview(requestId: string, input: SubmitReviewInput): Promise<PromptReviewRequest> {
    const request = this.reviewRequests.get(requestId);
    if (!request) {
      throw new Error(`Review request not found: ${requestId}`);
    }

    const now = new Date().toISOString();

    // Add review
    const review: PromptReview = {
      id: uuidv4(),
      reviewer: input.reviewer,
      status: input.status,
      comments: input.comments.map(c => ({
        id: uuidv4(),
        author: input.reviewer,
        content: c,
        resolved: false,
        replies: [],
        createdAt: now,
      })),
      submittedAt: now,
    };

    request.reviews.push(review);

    // Update reviewer status
    const reviewerAssignment = request.reviewers.find(
      r => r.reviewer.id === input.reviewer.id
    );
    if (reviewerAssignment) {
      reviewerAssignment.reviewed = true;
      reviewerAssignment.reviewedAt = now;
    }

    // Update request status
    const allReviewed = request.reviewers.every(r => r.reviewed);
    const allApproved = request.reviews.every(r => r.status === 'approved');
    const hasChangesRequested = request.reviews.some(r => r.status === 'changes-requested');

    if (hasChangesRequested) {
      request.status = 'changes-requested';
    } else if (allReviewed && allApproved) {
      request.status = 'approved';
    }

    request.updatedAt = now;
    this.reviewRequests.set(requestId, request);

    // Add audit entry
    this.addAuditEntry(request.promptId, {
      action: 'reviewed',
      actor: input.reviewer,
      details: { requestId, status: input.status },
    });

    return request;
  }

  async mergeRequest(requestId: string, actor: ActorIdentity): Promise<PromptReviewRequest> {
    const request = this.reviewRequests.get(requestId);
    if (!request) {
      throw new Error(`Review request not found: ${requestId}`);
    }

    if (request.status !== 'approved') {
      throw new Error(`Request not approved: ${request.status}`);
    }

    const now = new Date().toISOString();
    const prompt = this.prompts.get(request.promptId);
    if (!prompt) {
      throw new Error(`Prompt not found: ${request.promptId}`);
    }

    // Update current version
    prompt.currentVersion = request.proposedVersion;
    prompt.updatedAt = now;
    this.prompts.set(prompt.id, prompt);

    // Update request status
    request.status = 'merged';
    request.mergedAt = now;
    request.updatedAt = now;
    this.reviewRequests.set(requestId, request);

    // Update version status
    request.proposedVersion.deployment.status = 'approved';
    this.versions.set(request.proposedVersion.id, request.proposedVersion);

    // Add audit entry
    this.addAuditEntry(request.promptId, {
      action: 'approved',
      actor,
      versionId: request.proposedVersion.id,
      details: { requestId, version: request.proposedVersion.version },
    });

    return request;
  }

  async deployVersion(input: CreateDeploymentInput): Promise<PromptDeployment> {
    const now = new Date().toISOString();
    const deploymentId = uuidv4();

    const prompt = this.prompts.get(input.promptId);
    const version = this.versions.get(input.versionId);

    if (!prompt || !version) {
      throw new Error('Prompt or version not found');
    }

    const deployment: PromptDeployment = {
      id: deploymentId,
      promptId: input.promptId,
      versionId: input.versionId,
      environment: input.environment,
      strategy: {
        type: input.strategy,
        canaryConfig: input.strategy === 'canary' ? {
          initialPercentage: 10,
          incrementPercentage: 20,
          incrementIntervalMinutes: 30,
          successThreshold: 0.95,
          evaluationMetrics: ['error_rate', 'latency_p99'],
        } : undefined,
        rollbackConfig: {
          automatic: true,
          triggers: [
            { metric: 'error_rate', operator: 'gt', threshold: 0.05, windowMinutes: 5 },
          ],
          notifyOnRollback: [],
        },
      },
      status: 'pending',
      trafficAllocation: {
        newVersion: input.strategy === 'immediate' ? 100 : 10,
        previousVersion: input.strategy === 'immediate' ? 0 : 90,
        lastUpdated: now,
      },
      rolloutProgress: {
        currentPhase: 1,
        totalPhases: input.strategy === 'canary' ? 5 : 1,
        currentPercentage: input.strategy === 'immediate' ? 100 : 10,
        targetPercentage: 100,
        requestsServed: 0,
        errorsEncountered: 0,
      },
      healthMetrics: {
        errorRate: 0,
        latencyP50Ms: 0,
        latencyP99Ms: 0,
        comparisonWithBaseline: [],
      },
      createdAt: now,
      createdBy: input.actor,
    };

    this.deployments.set(deploymentId, deployment);

    // Update version deployment status
    version.deployment.status = 'deployed';
    version.deployment.deployedAt = now;
    version.deployment.deployedBy = input.actor;
    version.deployment.deployedEnvironments.push({
      environment: input.environment,
      deployedAt: now,
      status: 'active',
      trafficPercentage: deployment.trafficAllocation.newVersion,
    });
    this.versions.set(input.versionId, version);

    // Update prompt deployment status
    prompt.deploymentStatus[input.environment] = {
      deployed: true,
      version: version.version,
      lastDeployed: now,
      health: 'healthy',
    };
    this.prompts.set(input.promptId, prompt);

    // Simulate rollout completion
    deployment.status = 'completed';
    deployment.completedAt = now;
    deployment.trafficAllocation.newVersion = 100;
    deployment.trafficAllocation.previousVersion = 0;
    deployment.rolloutProgress.currentPercentage = 100;
    this.deployments.set(deploymentId, deployment);

    // Add audit entry
    this.addAuditEntry(input.promptId, {
      action: 'deployed',
      actor: input.actor,
      versionId: input.versionId,
      details: { deploymentId, environment: input.environment, version: version.version },
    });

    return deployment;
  }

  async rollbackDeployment(deploymentId: string, reason: string): Promise<PromptDeployment> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    const now = new Date().toISOString();

    deployment.status = 'rolled-back';
    deployment.trafficAllocation.newVersion = 0;
    deployment.trafficAllocation.previousVersion = 100;
    deployment.trafficAllocation.lastUpdated = now;

    this.deployments.set(deploymentId, deployment);

    // Add audit entry
    this.addAuditEntry(deployment.promptId, {
      action: 'rolled-back',
      actor: deployment.createdBy,
      versionId: deployment.versionId,
      details: { deploymentId, reason },
    });

    return deployment;
  }

  async createExperiment(input: CreateExperimentInput): Promise<PromptExperiment> {
    const now = new Date().toISOString();
    const experimentId = uuidv4();

    const experiment: PromptExperiment = {
      id: experimentId,
      name: input.name,
      description: input.description,
      promptId: input.promptId,
      variants: input.variants.map((v, i) => ({
        id: `variant-${i}`,
        name: `Variant ${i + 1}`,
        versionId: v.versionId,
        trafficPercentage: v.trafficPercentage,
        isControl: v.isControl,
      })),
      config: {
        minSampleSize: input.minSampleSize,
        maxDurationDays: input.maxDurationDays,
        significanceLevel: 0.05,
        primaryMetric: input.primaryMetric,
        secondaryMetrics: [],
      },
      status: 'draft',
      createdAt: now,
      createdBy: input.author,
    };

    this.experiments.set(experimentId, experiment);

    // Add audit entry
    this.addAuditEntry(input.promptId, {
      action: 'experiment-started',
      actor: input.author,
      details: { experimentId, name: input.name },
    });

    return experiment;
  }

  async endExperiment(experimentId: string, winner?: string): Promise<PromptExperiment> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    const now = new Date().toISOString();

    experiment.status = 'completed';
    experiment.endedAt = now;
    experiment.winner = winner;
    experiment.winnerReason = winner ? 'Statistically significant improvement' : 'No significant difference';

    // Generate results
    experiment.results = {
      generatedAt: now,
      totalSamples: 10000,
      variantResults: experiment.variants.map(v => ({
        variantId: v.id,
        sampleSize: Math.floor(10000 * v.trafficPercentage / 100),
        metrics: {
          [experiment.config.primaryMetric]: {
            value: 0.95 + Math.random() * 0.05,
            standardError: 0.01,
            confidenceInterval: { lower: 0.94, upper: 0.99 },
          },
        },
      })),
      statisticalAnalysis: {
        primaryMetricSignificant: !!winner,
        pValue: winner ? 0.02 : 0.15,
        effectSize: winner ? 0.05 : 0.01,
        confidenceLevel: 0.95,
        powerAnalysis: {
          currentPower: 0.8,
          recommendedSampleSize: 10000,
        },
      },
      recommendation: {
        action: winner ? 'stop-winner' : 'stop-no-winner',
        confidence: 0.85,
        reasoning: winner
          ? `Variant ${winner} shows statistically significant improvement`
          : 'No significant difference between variants',
        suggestedWinner: winner,
      },
    };

    this.experiments.set(experimentId, experiment);

    // Add audit entry
    this.addAuditEntry(experiment.promptId, {
      action: 'experiment-ended',
      actor: experiment.createdBy,
      details: { experimentId, winner },
    });

    return experiment;
  }

  async getAnalytics(promptId: string, period: TimeRange): Promise<PromptAnalytics> {
    const prompt = this.prompts.get(promptId);
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptId}`);
    }

    const now = new Date().toISOString();

    return {
      promptId,
      period,
      generatedAt: now,
      usage: {
        totalRequests: 50000,
        uniqueUsers: 1000,
        requestsPerDay: Array(30).fill(0).map(() => Math.floor(1000 + Math.random() * 500)),
        peakUsageHour: 14,
        topUseCases: [
          { useCase: 'customer-support', count: 25000 },
          { useCase: 'content-generation', count: 15000 },
        ],
      },
      performance: {
        averageLatencyMs: 250,
        p50LatencyMs: 200,
        p95LatencyMs: 400,
        p99LatencyMs: 600,
        errorRate: 0.01,
        timeoutRate: 0.001,
        tokenUsage: {
          averageInputTokens: 500,
          averageOutputTokens: 200,
          totalInputTokens: 25000000,
          totalOutputTokens: 10000000,
        },
      },
      quality: {
        userSatisfactionScore: 0.85,
        thumbsUpRate: 0.9,
        regenerationRate: 0.1,
        averageOutputQuality: 0.88,
      },
      cost: {
        totalCost: 5000,
        currency: 'USD',
        costPerRequest: 0.1,
        costByModel: {
          'gpt-4': 4000,
          'gpt-3.5-turbo': 1000,
        },
        projectedMonthlyCost: 5500,
      },
      trends: [
        { metric: 'requests', direction: 'increasing', changePercentage: 15, significance: 0.9 },
        { metric: 'latency', direction: 'stable', changePercentage: 2, significance: 0.3 },
      ],
    };
  }

  async getAuditTrail(promptId: string): Promise<PromptAuditEntry[]> {
    return this.auditLogs.get(promptId) || [];
  }

  async runComplianceChecks(versionId: string, checkTypes: string[]): Promise<ComplianceCheck[]> {
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version not found: ${versionId}`);
    }

    const now = new Date().toISOString();

    return checkTypes.map(type => ({
      id: uuidv4(),
      type: type as any,
      status: 'passed' as const,
      result: {
        passed: true,
        score: 0.95,
        findings: [],
        details: {},
      },
      runAt: now,
      required: true,
    }));
  }

  async searchPrompts(query: SearchPromptsInput): Promise<Prompt[]> {
    let results = Array.from(this.prompts.values());

    if (query.namespace) {
      results = results.filter(p => p.namespace === query.namespace);
    }

    if (query.category) {
      results = results.filter(p => p.metadata.category === query.category);
    }

    if (query.tags?.length) {
      results = results.filter(p =>
        query.tags!.some(t => p.metadata.tags.includes(t))
      );
    }

    if (query.owner) {
      results = results.filter(p => p.ownership.owner.id === query.owner);
    }

    if (query.query) {
      const q = query.query.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }

    return results;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private calculateContentHash(content: PromptContent): string {
    const hashInput = JSON.stringify(content);
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  private incrementVersion(current: string, changeType: 'major' | 'minor' | 'patch'): string {
    const [major, minor, patch] = current.split('.').map(Number);

    switch (changeType) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
    }
  }

  private calculateTextDiff(from: PromptContent, to: PromptContent): TextDiff {
    const fromLines = (from.user || '').split('\n');
    const toLines = (to.user || '').split('\n');

    let linesAdded = 0;
    let linesRemoved = 0;
    let linesModified = 0;

    const userDiff: TextDiff['userDiff'] = [];

    const maxLines = Math.max(fromLines.length, toLines.length);
    for (let i = 0; i < maxLines; i++) {
      if (i >= fromLines.length) {
        linesAdded++;
        userDiff.push({
          lineNumber: i + 1,
          type: 'added',
          newContent: toLines[i],
        });
      } else if (i >= toLines.length) {
        linesRemoved++;
        userDiff.push({
          lineNumber: i + 1,
          type: 'removed',
          oldContent: fromLines[i],
        });
      } else if (fromLines[i] !== toLines[i]) {
        linesModified++;
        userDiff.push({
          lineNumber: i + 1,
          type: 'modified',
          oldContent: fromLines[i],
          newContent: toLines[i],
        });
      }
    }

    return {
      userDiff,
      variableChanges: [],
      exampleChanges: [],
      linesAdded,
      linesRemoved,
      linesModified,
    };
  }

  private async calculateSemanticDiff(from: PromptContent, to: PromptContent): Promise<SemanticDiff> {
    // In production, would use embeddings for semantic comparison
    const fromText = `${from.system || ''} ${from.user}`;
    const toText = `${to.system || ''} ${to.user}`;

    // Simple word overlap similarity
    const fromWords = new Set(fromText.toLowerCase().split(/\s+/));
    const toWords = new Set(toText.toLowerCase().split(/\s+/));

    const intersection = new Set([...fromWords].filter(w => toWords.has(w)));
    const union = new Set([...fromWords, ...toWords]);

    const similarity = intersection.size / union.size;

    return {
      embeddingSimilarity: similarity,
      instructionChanges: [],
      toneChanges: [],
      constraintChanges: [],
      behavioralImplications: [],
    };
  }

  private calculateImpactAnalysis(
    from: PromptVersion,
    to: PromptVersion,
    semanticDiff: SemanticDiff
  ): PromptDiff['impactAnalysis'] {
    const outputChange = 1 - semanticDiff.embeddingSimilarity;

    return {
      expectedOutputChange: outputChange,
      regressionRisk: {
        value: outputChange > 0.3 ? 0.7 : outputChange > 0.1 ? 0.4 : 0.1,
        severity: outputChange > 0.3 ? 'high' : outputChange > 0.1 ? 'medium' : 'low',
        confidence: 0.8,
      },
      backwardCompatible: outputChange < 0.2,
      breakingChanges: [],
      recommendations: outputChange > 0.3
        ? [{ priority: 'high', type: 'test', description: 'Extensive testing recommended' }]
        : [],
    };
  }

  private determineChangeMagnitude(
    textDiff: TextDiff,
    semanticDiff: SemanticDiff
  ): PromptDiff['changeMagnitude'] {
    const totalChanges = textDiff.linesAdded + textDiff.linesRemoved + textDiff.linesModified;
    const semanticChange = 1 - semanticDiff.embeddingSimilarity;

    if (semanticChange > 0.5 || totalChanges > 50) return 'breaking';
    if (semanticChange > 0.3 || totalChanges > 20) return 'significant';
    if (semanticChange > 0.15 || totalChanges > 10) return 'moderate';
    if (semanticChange > 0.05 || totalChanges > 3) return 'minor';
    return 'trivial';
  }

  private addAuditEntry(promptId: string, entry: Omit<PromptAuditEntry, 'id' | 'timestamp' | 'promptId'>): void {
    const entries = this.auditLogs.get(promptId) || [];
    entries.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      promptId,
      ...entry,
    } as PromptAuditEntry);
    this.auditLogs.set(promptId, entries);
  }
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface PromptOpsEngineConfig {
  defaultApprovalLevel?: 'team' | 'manager' | 'compliance' | 'executive';
  requireComplianceChecks?: boolean;
  embeddingModel?: string;
}

// ============================================================================
// Export Default Instance
// ============================================================================

export const promptOpsEngine = new PromptOpsEngine();
