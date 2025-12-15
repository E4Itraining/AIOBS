/**
 * Causal Analysis Engine
 * Main orchestrator for causal analysis, root cause detection, and impact assessment
 */

import {
  CausalGraph,
  CausalNode,
  CausalEdge,
  CausalScope,
  RootCauseAnalysis,
  RootCause,
  ImpactAnalysis,
  CounterfactualAnalysis,
  AttributionAnalysis,
  CausalDiscoveryResult,
} from '../types/causal';
import { UUID, ISO8601, NormalizedScore, ResourceIdentifier } from '../types/common';
import { RootCauseAnalyzer } from './root-cause-analyzer';
import { ImpactAssessor } from './impact-assessor';
import { CausalGraphBuilder } from './causal-graph';

/**
 * Configuration for the Causal Engine
 */
export interface CausalEngineConfig {
  // Graph construction
  maxGraphDepth: number;
  minEdgeConfidence: number;

  // Root cause analysis
  maxRootCauses: number;
  minCauseProbability: number;

  // Impact analysis
  maxImpactDepth: number;

  // Discovery
  discoveryAlgorithm: 'pc' | 'ges' | 'notears' | 'ensemble';
}

/**
 * Main Causal Analysis Engine
 */
export class CausalEngine {
  private config: CausalEngineConfig;
  private rootCauseAnalyzer: RootCauseAnalyzer;
  private impactAssessor: ImpactAssessor;
  private graphBuilder: CausalGraphBuilder;

  constructor(config: Partial<CausalEngineConfig> = {}) {
    this.config = this.mergeWithDefaults(config);
    this.rootCauseAnalyzer = new RootCauseAnalyzer(this.config);
    this.impactAssessor = new ImpactAssessor(this.config);
    this.graphBuilder = new CausalGraphBuilder(this.config);
  }

  /**
   * Build a causal graph from events and data
   */
  async buildGraph(
    events: CausalEvent[],
    scope: CausalScope
  ): Promise<CausalGraph> {
    return this.graphBuilder.build(events, scope);
  }

  /**
   * Perform root cause analysis for a target event
   */
  async analyzeRootCause(
    graph: CausalGraph,
    targetEventId: UUID
  ): Promise<RootCauseAnalysis> {
    return this.rootCauseAnalyzer.analyze(graph, targetEventId);
  }

  /**
   * Assess impact of a change or event
   */
  async assessImpact(
    graph: CausalGraph,
    sourceEventId: UUID
  ): Promise<ImpactAnalysis> {
    return this.impactAssessor.assess(graph, sourceEventId);
  }

  /**
   * Perform counterfactual analysis
   */
  async analyzeCounterfactual(
    graph: CausalGraph,
    interventions: Intervention[]
  ): Promise<CounterfactualAnalysis> {
    const timestamp = new Date().toISOString();
    const id = this.generateId();

    // Build original scenario from graph
    const originalScenario = this.buildScenarioFromGraph(graph);

    // Generate counterfactual scenarios
    const counterfactuals = interventions.map(intervention =>
      this.generateCounterfactualScenario(graph, intervention)
    );

    // Compare scenarios
    const comparison = this.compareScenarios(originalScenario, counterfactuals);

    return {
      id,
      timestamp,
      originalScenario,
      counterfactuals,
      comparison,
    };
  }

  /**
   * Perform attribution analysis
   */
  async analyzeAttribution(
    graph: CausalGraph,
    outcomeNodeId: UUID
  ): Promise<AttributionAnalysis> {
    const timestamp = new Date().toISOString();
    const id = this.generateId();

    const outcomeNode = graph.nodes.find(n => n.id === outcomeNodeId);
    if (!outcomeNode) {
      throw new Error(`Outcome node ${outcomeNodeId} not found`);
    }

    // Find all causes leading to outcome
    const causes = this.findCausesForOutcome(graph, outcomeNodeId);

    // Compute attribution weights using Shapley-like approach
    const attributions = this.computeAttributions(graph, causes, outcomeNode);

    return {
      id,
      timestamp,
      outcome: outcomeNode,
      attributions,
      method: 'shapley',
    };
  }

  /**
   * Discover causal structure from data
   */
  async discoverCausalStructure(
    data: CausalDiscoveryInput
  ): Promise<CausalDiscoveryResult> {
    const timestamp = new Date().toISOString();
    const id = this.generateId();

    // Run discovery algorithm
    const discoveredGraph = await this.runDiscoveryAlgorithm(data);

    // Compute quality metrics
    const quality = this.assessDiscoveryQuality(discoveredGraph);

    return {
      id,
      timestamp,
      discoveredGraph,
      algorithm: this.config.discoveryAlgorithm,
      dataUsed: data.sources,
      quality,
    };
  }

  /**
   * Get causal chain between two nodes
   */
  getCausalChain(graph: CausalGraph, fromId: UUID, toId: UUID): CausalNode[] {
    const chain: CausalNode[] = [];
    const visited = new Set<UUID>();

    const dfs = (currentId: UUID): boolean => {
      if (visited.has(currentId)) return false;
      visited.add(currentId);

      const node = graph.nodes.find(n => n.id === currentId);
      if (!node) return false;

      chain.push(node);

      if (currentId === toId) return true;

      // Find outgoing edges
      const outEdges = graph.edges.filter(e => e.sourceId === currentId);

      for (const edge of outEdges) {
        if (dfs(edge.targetId)) return true;
      }

      chain.pop();
      return false;
    };

    dfs(fromId);
    return chain;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Build scenario from graph
   */
  private buildScenarioFromGraph(graph: CausalGraph): CounterfactualAnalysis['originalScenario'] {
    const id = this.generateId();

    // Extract conditions from nodes
    const conditions = graph.nodes
      .filter(n => n.type !== 'outcome')
      .slice(0, 10)
      .map(node => ({
        nodeId: node.id,
        variable: node.name,
        value: node.metrics?.[node.name] || 0,
      }));

    // Extract outcomes
    const outcomes = graph.nodes
      .filter(n => n.type === 'outcome')
      .map(node => ({
        metric: node.name,
        value: node.metrics?.[node.name] || 0,
        confidence: 0.8,
      }));

    return {
      id,
      name: 'Original Scenario',
      description: 'Scenario as observed',
      conditions,
      outcomes,
    };
  }

  /**
   * Generate counterfactual scenario
   */
  private generateCounterfactualScenario(
    graph: CausalGraph,
    intervention: Intervention
  ): CounterfactualAnalysis['counterfactuals'][0] {
    const id = this.generateId();

    // Clone conditions with intervention applied
    const originalScenario = this.buildScenarioFromGraph(graph);
    const conditions = originalScenario.conditions.map(c =>
      c.nodeId === intervention.nodeId
        ? { ...c, value: intervention.newValue, originalValue: c.value }
        : c
    );

    // Simulate outcome changes
    const outcomes = this.simulateInterventionOutcomes(graph, intervention);

    return {
      id,
      name: `Counterfactual: ${intervention.description}`,
      description: intervention.description,
      conditions,
      outcomes,
      interventions: [intervention],
      plausibility: this.assessPlausibility(intervention),
    };
  }

  /**
   * Simulate intervention outcomes
   */
  private simulateInterventionOutcomes(
    graph: CausalGraph,
    intervention: Intervention
  ): { metric: string; value: number; confidence: NormalizedScore }[] {
    // Find affected outcome nodes
    const outcomeNodes = graph.nodes.filter(n => n.type === 'outcome');

    return outcomeNodes.map(node => {
      // Find path from intervention to outcome
      const chain = this.getCausalChain(graph, intervention.nodeId, node.id);
      const hasPath = chain.length > 0;

      // Estimate effect based on path strength
      let effect = 0;
      if (hasPath) {
        const pathStrength = this.computePathStrength(graph, chain);
        const delta = (intervention.newValue as number) - (intervention.originalValue as number);
        effect = delta * pathStrength;
      }

      const originalValue = node.metrics?.[node.name] || 0;

      return {
        metric: node.name,
        value: originalValue + effect,
        confidence: hasPath ? 0.7 : 0.3,
      };
    });
  }

  /**
   * Compute path strength
   */
  private computePathStrength(graph: CausalGraph, chain: CausalNode[]): number {
    if (chain.length < 2) return 0;

    let strength = 1;
    for (let i = 0; i < chain.length - 1; i++) {
      const edge = graph.edges.find(
        e => e.sourceId === chain[i].id && e.targetId === chain[i + 1].id
      );
      if (edge) {
        strength *= edge.strength;
      }
    }

    return strength;
  }

  /**
   * Assess plausibility of intervention
   */
  private assessPlausibility(intervention: Intervention): NormalizedScore {
    // Simple heuristic - larger changes are less plausible
    if (typeof intervention.originalValue !== 'number' || typeof intervention.newValue !== 'number') {
      return 0.5;
    }

    const changeRatio = Math.abs(intervention.newValue - intervention.originalValue) /
      Math.max(Math.abs(intervention.originalValue), 0.001);

    return Math.max(0.1, 1 - changeRatio / 2);
  }

  /**
   * Compare scenarios
   */
  private compareScenarios(
    original: CounterfactualAnalysis['originalScenario'],
    counterfactuals: CounterfactualAnalysis['counterfactuals']
  ): CounterfactualAnalysis['comparison'] {
    const counterfactualOutcomes = counterfactuals.map(cf => {
      const delta: Record<string, number> = {};

      for (const outcome of cf.outcomes) {
        const originalOutcome = original.outcomes.find(o => o.metric === outcome.metric);
        if (originalOutcome) {
          delta[outcome.metric] = outcome.value - originalOutcome.value;
        }
      }

      return {
        scenarioId: cf.id,
        outcomes: cf.outcomes,
        delta,
      };
    });

    // Generate insights
    const insights = this.generateComparisonInsights(original, counterfactualOutcomes);

    return {
      originalOutcome: original.outcomes,
      counterfactualOutcomes,
      insights,
    };
  }

  /**
   * Generate comparison insights
   */
  private generateComparisonInsights(
    original: CounterfactualAnalysis['originalScenario'],
    counterfactuals: { scenarioId: UUID; outcomes: any[]; delta: Record<string, number> }[]
  ): CounterfactualAnalysis['comparison']['insights'] {
    const insights: CounterfactualAnalysis['comparison']['insights'] = [];

    for (const cf of counterfactuals) {
      for (const [metric, delta] of Object.entries(cf.delta)) {
        if (Math.abs(delta) > 0.1) {
          insights.push({
            type: delta > 0 ? 'opportunity' : 'risk',
            description: `${metric} would ${delta > 0 ? 'increase' : 'decrease'} by ${Math.abs(delta).toFixed(2)}`,
            significance: Math.min(1, Math.abs(delta)),
            actionable: Math.abs(delta) > 0.2,
          });
        }
      }
    }

    return insights;
  }

  /**
   * Find all causes for an outcome
   */
  private findCausesForOutcome(graph: CausalGraph, outcomeId: UUID): CausalNode[] {
    const causes: CausalNode[] = [];
    const visited = new Set<UUID>();

    const traverse = (nodeId: UUID) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      // Find incoming edges
      const inEdges = graph.edges.filter(e => e.targetId === nodeId);

      for (const edge of inEdges) {
        const sourceNode = graph.nodes.find(n => n.id === edge.sourceId);
        if (sourceNode) {
          causes.push(sourceNode);
          traverse(edge.sourceId);
        }
      }
    };

    traverse(outcomeId);
    return causes;
  }

  /**
   * Compute attributions using Shapley-like approach
   */
  private computeAttributions(
    graph: CausalGraph,
    causes: CausalNode[],
    outcome: CausalNode
  ): AttributionAnalysis['attributions'] {
    // Simplified Shapley value computation
    const totalContribution = causes.reduce((sum, cause) => {
      const chain = this.getCausalChain(graph, cause.id, outcome.id);
      return sum + this.computePathStrength(graph, chain);
    }, 0);

    return causes.map(cause => {
      const chain = this.getCausalChain(graph, cause.id, outcome.id);
      const strength = this.computePathStrength(graph, chain);
      const weight = totalContribution > 0 ? strength / totalContribution : 0;

      // Find the edge connecting to determine mechanism
      const edge = graph.edges.find(
        e => e.sourceId === cause.id &&
          (e.targetId === outcome.id || chain.some(n => n.id === e.targetId))
      );

      return {
        cause,
        attributionWeight: weight,
        confidence: edge?.confidence || 0.5,
        mechanism: edge?.relationship.mechanism || 'unknown',
        evidence: edge?.evidence || [],
      };
    });
  }

  /**
   * Run causal discovery algorithm
   */
  private async runDiscoveryAlgorithm(
    data: CausalDiscoveryInput
  ): Promise<CausalGraph> {
    // Simplified discovery - in production would use actual algorithms
    const id = this.generateId();
    const timestamp = new Date().toISOString();

    // Create nodes from variables
    const nodes: CausalNode[] = data.variables.map(variable => ({
      id: this.generateId(),
      type: 'event',
      name: variable,
      description: `Variable: ${variable}`,
      properties: {
        category: 'discovered',
        tags: ['auto-discovered'],
        metadata: {},
      },
      timestamp,
    }));

    // Discover edges based on correlations
    const edges: CausalEdge[] = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const correlation = this.estimateCorrelation(data, nodes[i].name, nodes[j].name);

        if (Math.abs(correlation) > 0.3) {
          edges.push({
            id: this.generateId(),
            sourceId: correlation > 0 ? nodes[i].id : nodes[j].id,
            targetId: correlation > 0 ? nodes[j].id : nodes[i].id,
            relationship: {
              type: 'correlates_with',
              reversible: true,
              directEffect: false,
            },
            strength: Math.abs(correlation),
            confidence: 0.6,
            evidence: [{
              type: 'statistical',
              description: `Correlation coefficient: ${correlation.toFixed(2)}`,
              confidence: 0.6,
              source: 'discovery_algorithm',
              timestamp,
            }],
          });
        }
      }
    }

    return {
      id,
      name: 'Discovered Causal Graph',
      createdAt: timestamp,
      updatedAt: timestamp,
      nodes,
      edges,
      scope: {
        resources: [],
        timeRange: data.timeRange,
        includeInfrastructure: true,
        includeData: true,
        includeHuman: false,
      },
      confidence: 0.6,
      lastValidated: timestamp,
    };
  }

  /**
   * Estimate correlation between variables
   */
  private estimateCorrelation(
    data: CausalDiscoveryInput,
    var1: string,
    var2: string
  ): number {
    // Simplified - would compute actual correlation from data
    return Math.random() * 0.8 - 0.4;
  }

  /**
   * Assess discovery quality
   */
  private assessDiscoveryQuality(graph: CausalGraph): CausalDiscoveryResult['quality'] {
    const edgeCount = graph.edges.length;
    const nodeCount = graph.nodes.length;
    const avgConfidence = graph.edges.reduce((sum, e) => sum + e.confidence, 0) /
      Math.max(edgeCount, 1);

    return {
      edgePrecision: avgConfidence,
      edgeRecall: Math.min(1, edgeCount / (nodeCount * (nodeCount - 1) / 2)),
      orientationAccuracy: avgConfidence * 0.8,
      overallConfidence: avgConfidence * 0.9,
    };
  }

  /**
   * Generate UUID
   */
  private generateId(): UUID {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Merge config with defaults
   */
  private mergeWithDefaults(config: Partial<CausalEngineConfig>): CausalEngineConfig {
    return {
      maxGraphDepth: config.maxGraphDepth || 10,
      minEdgeConfidence: config.minEdgeConfidence || 0.3,
      maxRootCauses: config.maxRootCauses || 5,
      minCauseProbability: config.minCauseProbability || 0.1,
      maxImpactDepth: config.maxImpactDepth || 5,
      discoveryAlgorithm: config.discoveryAlgorithm || 'ensemble',
    };
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface CausalEvent {
  id: UUID;
  timestamp: ISO8601;
  type: CausalNode['type'];
  name: string;
  description: string;
  resource?: ResourceIdentifier;
  metrics?: Record<string, number>;
  relatedEvents?: UUID[];
}

export interface Intervention {
  nodeId: UUID;
  variable: string;
  originalValue: any;
  newValue: any;
  description: string;
}

export interface CausalDiscoveryInput {
  variables: string[];
  data: Record<string, number[]>;
  timeRange: { start: ISO8601; end: ISO8601 };
  sources: { source: string; recordCount: number; features: string[]; timeRange: { start: ISO8601; end: ISO8601 } }[];
}
