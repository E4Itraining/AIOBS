/**
 * Root Cause Analyzer
 * Identifies root causes and builds causal chains for incidents and anomalies
 */

import {
  CausalGraph,
  CausalNode,
  CausalEdge,
  RootCauseAnalysis,
  RootCause,
  CausalChain,
  ContributingFactor,
  CausalEvidence,
  RootCauseCategory,
} from '../types/causal';
import { UUID, NormalizedScore } from '../types/common';
import { CausalEngineConfig } from './causal-engine';

/**
 * Root Cause Analyzer
 */
export class RootCauseAnalyzer {
  private config: CausalEngineConfig;

  constructor(config: CausalEngineConfig) {
    this.config = config;
  }

  /**
   * Analyze root causes for a target event
   */
  async analyze(graph: CausalGraph, targetEventId: UUID): Promise<RootCauseAnalysis> {
    const timestamp = new Date().toISOString();
    const id = this.generateId();

    // Find target node
    const targetNode = graph.nodes.find(n => n.id === targetEventId);
    if (!targetNode) {
      throw new Error(`Target event ${targetEventId} not found in graph`);
    }

    // Find all root causes (nodes with no incoming edges that lead to target)
    const rootCauses = this.findRootCauses(graph, targetEventId);

    // Build causal chains from root causes to target
    const causalChains = this.buildCausalChains(graph, rootCauses, targetEventId);

    // Identify contributing factors
    const contributingFactors = this.findContributingFactors(graph, rootCauses, targetEventId);

    // Compute overall confidence
    const overallConfidence = this.computeOverallConfidence(rootCauses, causalChains);

    return {
      id,
      timestamp,
      targetEvent: targetNode,
      rootCauses,
      causalChains,
      contributingFactors,
      overallConfidence,
      methodology: {
        algorithms: ['backward_traversal', 'probability_ranking'],
        dataSourcesUsed: ['event_logs', 'metrics', 'topology'],
        timeRange: graph.scope.timeRange,
        computationTime: Date.now(),
      },
    };
  }

  /**
   * Find root causes leading to target event
   */
  private findRootCauses(graph: CausalGraph, targetEventId: UUID): RootCause[] {
    const visited = new Set<UUID>();
    const candidates: { node: CausalNode; depth: number; pathStrength: number }[] = [];

    // Backward BFS to find all ancestor nodes
    const queue: { nodeId: UUID; depth: number; pathStrength: number }[] = [
      { nodeId: targetEventId, depth: 0, pathStrength: 1 }
    ];

    while (queue.length > 0) {
      const { nodeId, depth, pathStrength } = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      if (depth > this.config.maxGraphDepth) continue;

      // Find incoming edges
      const inEdges = graph.edges.filter(e => e.targetId === nodeId);

      if (inEdges.length === 0 && nodeId !== targetEventId) {
        // This is a root node
        const node = graph.nodes.find(n => n.id === nodeId);
        if (node) {
          candidates.push({ node, depth, pathStrength });
        }
      }

      // Continue backward traversal
      for (const edge of inEdges) {
        queue.push({
          nodeId: edge.sourceId,
          depth: depth + 1,
          pathStrength: pathStrength * edge.strength,
        });
      }
    }

    // Rank and select top root causes
    const ranked = candidates
      .sort((a, b) => b.pathStrength - a.pathStrength)
      .slice(0, this.config.maxRootCauses);

    return ranked.map(({ node, pathStrength }) => this.buildRootCause(graph, node, pathStrength));
  }

  /**
   * Build root cause object from node
   */
  private buildRootCause(
    graph: CausalGraph,
    node: CausalNode,
    pathStrength: number
  ): RootCause {
    // Classify the root cause
    const classification = this.classifyRootCause(node);

    // Gather evidence
    const evidence = this.gatherEvidence(graph, node);

    return {
      id: this.generateId(),
      node,
      classification,
      probability: Math.min(1, pathStrength),
      confidence: this.computeNodeConfidence(graph, node),
      evidence,
      impactMagnitude: pathStrength,
    };
  }

  /**
   * Classify root cause category
   */
  private classifyRootCause(node: CausalNode): RootCause['classification'] {
    const category = this.inferCategory(node);

    return {
      category,
      subcategory: node.properties.category || 'unknown',
      tags: node.properties.tags || [],
    };
  }

  /**
   * Infer root cause category from node
   */
  private inferCategory(node: CausalNode): RootCauseCategory {
    const name = node.name.toLowerCase();
    const type = node.type;

    if (type === 'data_change' || name.includes('data')) {
      return 'data_quality';
    }
    if (name.includes('drift') || name.includes('shift')) {
      return 'model_drift';
    }
    if (type === 'infrastructure' || name.includes('cpu') || name.includes('memory')) {
      return 'infrastructure';
    }
    if (name.includes('config') || name.includes('setting')) {
      return 'configuration';
    }
    if (type === 'deployment' || name.includes('deploy')) {
      return 'code_change';
    }
    if (type === 'external' || name.includes('external') || name.includes('api')) {
      return 'external_dependency';
    }
    if (type === 'decision' || name.includes('manual')) {
      return 'human_error';
    }
    if (name.includes('resource') || name.includes('limit') || name.includes('quota')) {
      return 'resource_constraint';
    }
    if (name.includes('security') || name.includes('auth')) {
      return 'security_incident';
    }

    return 'unknown';
  }

  /**
   * Gather evidence for a node
   */
  private gatherEvidence(graph: CausalGraph, node: CausalNode): CausalEvidence[] {
    const evidence: CausalEvidence[] = [];

    // Add temporal evidence
    evidence.push({
      type: 'temporal',
      description: `Event occurred at ${node.timestamp}`,
      confidence: 0.9,
      source: 'event_log',
      timestamp: node.timestamp,
    });

    // Add metric evidence if available
    if (node.metrics) {
      for (const [metric, value] of Object.entries(node.metrics)) {
        evidence.push({
          type: 'statistical',
          description: `${metric}: ${value}`,
          confidence: 0.8,
          source: 'metrics',
          timestamp: node.timestamp,
        });
      }
    }

    // Add edge evidence
    const outEdges = graph.edges.filter(e => e.sourceId === node.id);
    for (const edge of outEdges) {
      evidence.push(...edge.evidence);
    }

    return evidence;
  }

  /**
   * Compute confidence for a node
   */
  private computeNodeConfidence(graph: CausalGraph, node: CausalNode): NormalizedScore {
    const outEdges = graph.edges.filter(e => e.sourceId === node.id);

    if (outEdges.length === 0) return 0.5;

    return outEdges.reduce((sum, e) => sum + e.confidence, 0) / outEdges.length;
  }

  /**
   * Build causal chains from root causes to target
   */
  private buildCausalChains(
    graph: CausalGraph,
    rootCauses: RootCause[],
    targetEventId: UUID
  ): CausalChain[] {
    const chains: CausalChain[] = [];

    for (const rootCause of rootCauses) {
      const chain = this.findPath(graph, rootCause.node.id, targetEventId);
      if (chain) {
        chains.push(chain);
      }
    }

    return chains;
  }

  /**
   * Find path between two nodes
   */
  private findPath(graph: CausalGraph, fromId: UUID, toId: UUID): CausalChain | null {
    const visited = new Set<UUID>();
    const path: { node: CausalNode; edge?: CausalEdge }[] = [];

    const dfs = (currentId: UUID): boolean => {
      if (visited.has(currentId)) return false;
      visited.add(currentId);

      const node = graph.nodes.find(n => n.id === currentId);
      if (!node) return false;

      path.push({ node });

      if (currentId === toId) return true;

      const outEdges = graph.edges.filter(e => e.sourceId === currentId);

      for (const edge of outEdges) {
        path[path.length - 1].edge = edge;
        if (dfs(edge.targetId)) return true;
      }

      path.pop();
      return false;
    };

    if (!dfs(fromId)) return null;

    const nodes = path.map(p => p.node);
    const edges = path.filter(p => p.edge).map(p => p.edge!);

    // Find weakest link
    const weakestLink = edges.reduce(
      (weakest, edge) => (edge.strength < weakest.strength ? edge : weakest),
      edges[0]
    );

    // Compute total lag time
    const totalLagTime = edges.reduce((sum, e) => sum + (e.lagTime || 0), 0);

    // Compute overall strength
    const overallStrength = edges.reduce((strength, e) => strength * e.strength, 1);

    return {
      id: this.generateId(),
      nodes,
      edges,
      totalLagTime,
      weakestLink,
      overallStrength,
    };
  }

  /**
   * Find contributing factors
   */
  private findContributingFactors(
    graph: CausalGraph,
    rootCauses: RootCause[],
    targetEventId: UUID
  ): ContributingFactor[] {
    const factors: ContributingFactor[] = [];
    const rootCauseIds = new Set(rootCauses.map(rc => rc.node.id));

    // Find all nodes on paths between root causes and target
    const visited = new Set<UUID>();

    const findFactors = (nodeId: UUID) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const inEdges = graph.edges.filter(e => e.targetId === nodeId);

      for (const edge of inEdges) {
        const sourceNode = graph.nodes.find(n => n.id === edge.sourceId);
        if (!sourceNode) continue;

        // Skip if this is already a root cause
        if (rootCauseIds.has(sourceNode.id)) continue;

        // This is a contributing factor
        factors.push({
          node: sourceNode,
          contributionWeight: edge.strength,
          isRemovable: this.assessRemovability(sourceNode),
          removalImpact: edge.strength * 0.8, // Estimate
        });

        findFactors(edge.sourceId);
      }
    };

    findFactors(targetEventId);

    return factors;
  }

  /**
   * Assess if a factor is removable
   */
  private assessRemovability(node: CausalNode): boolean {
    // External events and infrastructure issues are typically not removable
    return node.type !== 'external' && node.type !== 'infrastructure';
  }

  /**
   * Compute overall analysis confidence
   */
  private computeOverallConfidence(
    rootCauses: RootCause[],
    chains: CausalChain[]
  ): NormalizedScore {
    if (rootCauses.length === 0) return 0;

    const avgRootCauseConfidence =
      rootCauses.reduce((sum, rc) => sum + rc.confidence, 0) / rootCauses.length;

    const avgChainStrength =
      chains.length > 0
        ? chains.reduce((sum, c) => sum + c.overallStrength, 0) / chains.length
        : 0;

    return (avgRootCauseConfidence + avgChainStrength) / 2;
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
}
