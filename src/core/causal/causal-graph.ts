/**
 * Causal Graph Builder
 * Constructs causal graphs from events and data
 */

import {
  CausalGraph,
  CausalNode,
  CausalEdge,
  CausalScope,
  CausalNodeType,
  CausalRelationType,
  CausalEvidence,
} from '../types/causal';
import { UUID, ISO8601, NormalizedScore, ResourceIdentifier } from '../types/common';
import { CausalEngineConfig, CausalEvent } from './causal-engine';

/**
 * Causal Graph Builder
 */
export class CausalGraphBuilder {
  private config: CausalEngineConfig;

  constructor(config: CausalEngineConfig) {
    this.config = config;
  }

  /**
   * Build a causal graph from events
   */
  async build(events: CausalEvent[], scope: CausalScope): Promise<CausalGraph> {
    const timestamp = new Date().toISOString();
    const id = this.generateId();

    // Convert events to nodes
    const nodes = events.map(event => this.eventToNode(event));

    // Discover edges between nodes
    const edges = this.discoverEdges(nodes, events);

    // Filter edges by confidence threshold
    const filteredEdges = edges.filter(e => e.confidence >= this.config.minEdgeConfidence);

    return {
      id,
      name: `Causal Graph - ${timestamp}`,
      createdAt: timestamp,
      updatedAt: timestamp,
      nodes,
      edges: filteredEdges,
      scope,
      confidence: this.computeGraphConfidence(filteredEdges),
      lastValidated: timestamp,
    };
  }

  /**
   * Add a node to an existing graph
   */
  addNode(graph: CausalGraph, event: CausalEvent): CausalGraph {
    const newNode = this.eventToNode(event);
    const newEdges = this.discoverEdgesForNode(newNode, graph.nodes, event);

    return {
      ...graph,
      nodes: [...graph.nodes, newNode],
      edges: [...graph.edges, ...newEdges],
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Add an edge to an existing graph
   */
  addEdge(
    graph: CausalGraph,
    sourceId: UUID,
    targetId: UUID,
    relationship: CausalRelationType,
    evidence: CausalEvidence[]
  ): CausalGraph {
    const sourceNode = graph.nodes.find(n => n.id === sourceId);
    const targetNode = graph.nodes.find(n => n.id === targetId);

    if (!sourceNode || !targetNode) {
      throw new Error('Source or target node not found');
    }

    const newEdge = this.createEdge(sourceNode, targetNode, relationship, evidence);

    return {
      ...graph,
      edges: [...graph.edges, newEdge],
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Merge two graphs
   */
  mergeGraphs(graph1: CausalGraph, graph2: CausalGraph): CausalGraph {
    const timestamp = new Date().toISOString();

    // Merge nodes (deduplicate by ID)
    const nodeMap = new Map<UUID, CausalNode>();
    [...graph1.nodes, ...graph2.nodes].forEach(n => nodeMap.set(n.id, n));
    const mergedNodes = Array.from(nodeMap.values());

    // Merge edges (deduplicate by source-target pair)
    const edgeMap = new Map<string, CausalEdge>();
    [...graph1.edges, ...graph2.edges].forEach(e => {
      const key = `${e.sourceId}-${e.targetId}`;
      const existing = edgeMap.get(key);
      if (!existing || e.confidence > existing.confidence) {
        edgeMap.set(key, e);
      }
    });
    const mergedEdges = Array.from(edgeMap.values());

    // Merge scopes
    const mergedScope: CausalScope = {
      resources: [
        ...graph1.scope.resources,
        ...graph2.scope.resources.filter(r2 =>
          !graph1.scope.resources.some(r1 => r1.id === r2.id)
        ),
      ],
      timeRange: {
        start: graph1.scope.timeRange.start < graph2.scope.timeRange.start
          ? graph1.scope.timeRange.start
          : graph2.scope.timeRange.start,
        end: graph1.scope.timeRange.end > graph2.scope.timeRange.end
          ? graph1.scope.timeRange.end
          : graph2.scope.timeRange.end,
      },
      includeInfrastructure: graph1.scope.includeInfrastructure || graph2.scope.includeInfrastructure,
      includeData: graph1.scope.includeData || graph2.scope.includeData,
      includeHuman: graph1.scope.includeHuman || graph2.scope.includeHuman,
    };

    return {
      id: this.generateId(),
      name: `Merged Graph - ${timestamp}`,
      createdAt: timestamp,
      updatedAt: timestamp,
      nodes: mergedNodes,
      edges: mergedEdges,
      scope: mergedScope,
      confidence: Math.min(graph1.confidence, graph2.confidence),
      lastValidated: timestamp,
    };
  }

  /**
   * Prune graph to remove low-confidence edges
   */
  pruneGraph(graph: CausalGraph, minConfidence: number): CausalGraph {
    const prunedEdges = graph.edges.filter(e => e.confidence >= minConfidence);

    // Remove orphan nodes (nodes with no edges)
    const connectedNodeIds = new Set<UUID>();
    prunedEdges.forEach(e => {
      connectedNodeIds.add(e.sourceId);
      connectedNodeIds.add(e.targetId);
    });

    const prunedNodes = graph.nodes.filter(n => connectedNodeIds.has(n.id));

    return {
      ...graph,
      nodes: prunedNodes,
      edges: prunedEdges,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Convert event to causal node
   */
  private eventToNode(event: CausalEvent): CausalNode {
    return {
      id: event.id,
      type: event.type,
      name: event.name,
      description: event.description,
      properties: {
        category: this.inferCategory(event),
        tags: this.inferTags(event),
        metadata: {},
      },
      timestamp: event.timestamp,
      resource: event.resource,
      metrics: event.metrics,
    };
  }

  /**
   * Infer category from event
   */
  private inferCategory(event: CausalEvent): string {
    const typeCategories: Record<CausalNodeType, string> = {
      'event': 'system',
      'change': 'configuration',
      'metric_anomaly': 'metrics',
      'decision': 'human',
      'deployment': 'deployment',
      'data_change': 'data',
      'infrastructure': 'infrastructure',
      'external': 'external',
      'outcome': 'outcome',
    };

    return typeCategories[event.type] || 'unknown';
  }

  /**
   * Infer tags from event
   */
  private inferTags(event: CausalEvent): string[] {
    const tags: string[] = [event.type];

    if (event.resource) {
      tags.push(event.resource.type);
    }

    // Add metric-based tags
    if (event.metrics) {
      for (const metric of Object.keys(event.metrics)) {
        if (metric.includes('error')) tags.push('error');
        if (metric.includes('latency')) tags.push('performance');
        if (metric.includes('cost')) tags.push('cost');
      }
    }

    return tags;
  }

  /**
   * Discover edges between nodes
   */
  private discoverEdges(nodes: CausalNode[], events: CausalEvent[]): CausalEdge[] {
    const edges: CausalEdge[] = [];

    // Create event lookup
    const eventMap = new Map(events.map(e => [e.id, e]));

    // Discover edges based on explicit relationships
    for (const event of events) {
      if (event.relatedEvents) {
        for (const relatedId of event.relatedEvents) {
          const relatedEvent = eventMap.get(relatedId);
          if (relatedEvent) {
            const sourceNode = nodes.find(n => n.id === relatedId);
            const targetNode = nodes.find(n => n.id === event.id);

            if (sourceNode && targetNode) {
              edges.push(this.createEdge(
                sourceNode,
                targetNode,
                'causes',
                [{
                  type: 'domain_knowledge',
                  description: 'Explicit relationship defined',
                  confidence: 0.9,
                  source: 'event_definition',
                  timestamp: new Date().toISOString(),
                }]
              ));
            }
          }
        }
      }
    }

    // Discover edges based on temporal proximity
    const sortedNodes = [...nodes].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (let i = 0; i < sortedNodes.length - 1; i++) {
      const current = sortedNodes[i];
      const next = sortedNodes[i + 1];

      const timeDiff = new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // If events are close in time, they might be related
      if (hoursDiff < 1) {
        // Check if they share resources
        const shareResource = current.resource && next.resource &&
          current.resource.id === next.resource.id;

        if (shareResource || this.areRelatedByType(current, next)) {
          edges.push(this.createEdge(
            current,
            next,
            'contributes_to',
            [{
              type: 'temporal',
              description: `Events occurred within ${hoursDiff.toFixed(2)} hours`,
              confidence: Math.max(0.3, 1 - hoursDiff),
              source: 'temporal_analysis',
              timestamp: new Date().toISOString(),
            }]
          ));
        }
      }
    }

    return edges;
  }

  /**
   * Discover edges for a new node
   */
  private discoverEdgesForNode(
    newNode: CausalNode,
    existingNodes: CausalNode[],
    event: CausalEvent
  ): CausalEdge[] {
    const edges: CausalEdge[] = [];

    // Check explicit relationships
    if (event.relatedEvents) {
      for (const relatedId of event.relatedEvents) {
        const relatedNode = existingNodes.find(n => n.id === relatedId);
        if (relatedNode) {
          // Determine direction based on timestamps
          const newTime = new Date(newNode.timestamp).getTime();
          const relatedTime = new Date(relatedNode.timestamp).getTime();

          if (relatedTime < newTime) {
            edges.push(this.createEdge(relatedNode, newNode, 'causes', []));
          } else {
            edges.push(this.createEdge(newNode, relatedNode, 'causes', []));
          }
        }
      }
    }

    // Check for related nodes by resource and time
    for (const existing of existingNodes) {
      const timeDiff = Math.abs(
        new Date(newNode.timestamp).getTime() - new Date(existing.timestamp).getTime()
      );
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff < 2 && this.areRelatedByType(newNode, existing)) {
        const isNewLater = new Date(newNode.timestamp) > new Date(existing.timestamp);

        edges.push(this.createEdge(
          isNewLater ? existing : newNode,
          isNewLater ? newNode : existing,
          'contributes_to',
          [{
            type: 'temporal',
            description: 'Temporal proximity detected',
            confidence: Math.max(0.3, 1 - hoursDiff / 2),
            source: 'auto_discovery',
            timestamp: new Date().toISOString(),
          }]
        ));
      }
    }

    return edges;
  }

  /**
   * Check if nodes are related by type
   */
  private areRelatedByType(node1: CausalNode, node2: CausalNode): boolean {
    const relatedTypes: Record<CausalNodeType, CausalNodeType[]> = {
      'deployment': ['metric_anomaly', 'outcome'],
      'change': ['metric_anomaly', 'outcome'],
      'data_change': ['metric_anomaly', 'outcome'],
      'infrastructure': ['metric_anomaly', 'outcome'],
      'metric_anomaly': ['outcome'],
      'decision': ['deployment', 'change', 'outcome'],
      'external': ['metric_anomaly', 'outcome', 'infrastructure'],
      'event': ['metric_anomaly', 'outcome'],
      'outcome': [],
    };

    return relatedTypes[node1.type]?.includes(node2.type) ||
           relatedTypes[node2.type]?.includes(node1.type);
  }

  /**
   * Create a causal edge
   */
  private createEdge(
    source: CausalNode,
    target: CausalNode,
    relationship: CausalRelationType,
    evidence: CausalEvidence[]
  ): CausalEdge {
    const lagTime = new Date(target.timestamp).getTime() - new Date(source.timestamp).getTime();

    // Compute edge strength based on evidence
    const strength = this.computeEdgeStrength(evidence);
    const confidence = evidence.length > 0
      ? evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length
      : 0.5;

    return {
      id: this.generateId(),
      sourceId: source.id,
      targetId: target.id,
      relationship: {
        type: relationship,
        reversible: relationship === 'correlates_with',
        directEffect: relationship === 'causes' || relationship === 'triggers',
      },
      strength,
      confidence,
      lagTime: Math.max(0, lagTime),
      evidence,
    };
  }

  /**
   * Compute edge strength from evidence
   */
  private computeEdgeStrength(evidence: CausalEvidence[]): NormalizedScore {
    if (evidence.length === 0) return 0.5;

    // Weight different evidence types
    const typeWeights: Record<string, number> = {
      'intervention': 1.0,
      'counterfactual': 0.9,
      'statistical': 0.7,
      'temporal': 0.5,
      'domain_knowledge': 0.6,
      'expert_annotation': 0.8,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const e of evidence) {
      const weight = typeWeights[e.type] || 0.5;
      weightedSum += e.confidence * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  /**
   * Compute overall graph confidence
   */
  private computeGraphConfidence(edges: CausalEdge[]): NormalizedScore {
    if (edges.length === 0) return 0;

    return edges.reduce((sum, e) => sum + e.confidence, 0) / edges.length;
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
