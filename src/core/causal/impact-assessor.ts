/**
 * Impact Assessor
 * Assesses downstream impact of changes and events
 */

import {
  CausalGraph,
  CausalNode,
  ImpactAnalysis,
  ProjectedImpact,
  AffectedResource,
  ImpactRiskAssessment,
  ImpactRecommendation,
  ImpactType,
  QuantifiedEffect,
} from '../types/causal';
import { UUID, NormalizedScore, ResourceIdentifier } from '../types/common';
import { CausalEngineConfig } from './causal-engine';

/**
 * Impact Assessment Engine
 */
export class ImpactAssessor {
  private config: CausalEngineConfig;

  constructor(config: CausalEngineConfig) {
    this.config = config;
  }

  /**
   * Assess impact of a source event
   */
  async assess(graph: CausalGraph, sourceEventId: UUID): Promise<ImpactAnalysis> {
    const timestamp = new Date().toISOString();
    const id = this.generateId();

    // Find source node
    const sourceNode = graph.nodes.find(n => n.id === sourceEventId);
    if (!sourceNode) {
      throw new Error(`Source event ${sourceEventId} not found in graph`);
    }

    // Find all downstream impacts
    const impacts = this.findDownstreamImpacts(graph, sourceEventId);

    // Identify affected resources
    const affectedResources = this.identifyAffectedResources(graph, impacts);

    // Assess overall risk
    const riskAssessment = this.assessRisk(impacts);

    // Generate recommendations
    const recommendations = this.generateRecommendations(impacts, riskAssessment);

    return {
      id,
      timestamp,
      sourceEvent: sourceNode,
      impacts,
      affectedResources,
      riskAssessment,
      recommendations,
    };
  }

  /**
   * Find downstream impacts using forward traversal
   */
  private findDownstreamImpacts(
    graph: CausalGraph,
    sourceEventId: UUID
  ): ProjectedImpact[] {
    const impacts: ProjectedImpact[] = [];
    const visited = new Set<UUID>();

    const traverse = (nodeId: UUID, depth: number, cumulativeStrength: number, cumulativeLag: number) => {
      if (visited.has(nodeId) || depth > this.config.maxImpactDepth) return;
      visited.add(nodeId);

      // Find outgoing edges
      const outEdges = graph.edges.filter(e => e.sourceId === nodeId);

      for (const edge of outEdges) {
        const targetNode = graph.nodes.find(n => n.id === edge.targetId);
        if (!targetNode) continue;

        const newStrength = cumulativeStrength * edge.strength;
        const newLag = cumulativeLag + (edge.lagTime || 0);

        // Create impact projection
        const impact = this.projectImpact(targetNode, newStrength, newLag);
        impacts.push(impact);

        // Continue traversal
        traverse(edge.targetId, depth + 1, newStrength, newLag);
      }
    };

    traverse(sourceEventId, 0, 1, 0);

    return impacts;
  }

  /**
   * Project impact for a target node
   */
  private projectImpact(
    targetNode: CausalNode,
    strength: number,
    lagTime: number
  ): ProjectedImpact {
    const impactType = this.inferImpactType(targetNode);

    // Quantify effect if metrics available
    const quantifiedEffect = this.quantifyEffect(targetNode, strength);

    // Estimate recovery time
    const timeToRecover = this.estimateRecoveryTime(impactType, strength);

    return {
      id: this.generateId(),
      targetNode,
      impactType,
      magnitude: strength,
      probability: Math.min(1, strength * 1.2), // Slightly adjust probability
      expectedLagTime: lagTime,
      timeToRecover,
      quantifiedEffect,
    };
  }

  /**
   * Infer impact type from target node
   */
  private inferImpactType(node: CausalNode): ImpactType {
    const name = node.name.toLowerCase();
    const type = node.type;

    if (name.includes('latency') || name.includes('response')) {
      return 'latency_increase';
    }
    if (name.includes('accuracy') || name.includes('quality')) {
      return 'accuracy_decrease';
    }
    if (name.includes('available') || name.includes('uptime')) {
      return 'availability_reduction';
    }
    if (name.includes('performance') || name.includes('throughput')) {
      return 'performance_degradation';
    }
    if (name.includes('cost') || name.includes('expense')) {
      return 'cost_increase';
    }
    if (name.includes('security') || name.includes('breach')) {
      return 'security_risk';
    }
    if (name.includes('compliance') || name.includes('audit')) {
      return 'compliance_violation';
    }
    if (name.includes('user') || name.includes('experience')) {
      return 'user_experience_degradation';
    }

    return 'performance_degradation';
  }

  /**
   * Quantify effect on metrics
   */
  private quantifyEffect(
    node: CausalNode,
    strength: number
  ): QuantifiedEffect | undefined {
    if (!node.metrics || Object.keys(node.metrics).length === 0) {
      return undefined;
    }

    // Take the first metric as representative
    const [metric, currentValue] = Object.entries(node.metrics)[0];

    // Project impact
    const projectedChange = currentValue * strength * 0.2; // 20% max change
    const projectedValue = this.inferImpactType(node).includes('increase') ||
                           this.inferImpactType(node).includes('degradation')
      ? currentValue + projectedChange
      : currentValue - projectedChange;

    return {
      metric,
      currentValue,
      projectedValue,
      unit: 'units',
      confidence: Math.max(0.3, 1 - strength * 0.5),
    };
  }

  /**
   * Estimate recovery time
   */
  private estimateRecoveryTime(impactType: ImpactType, strength: number): number | undefined {
    const baseRecoveryHours: Record<ImpactType, number> = {
      'performance_degradation': 2,
      'availability_reduction': 1,
      'accuracy_decrease': 24,
      'latency_increase': 1,
      'cost_increase': 168, // 1 week
      'security_risk': 48,
      'compliance_violation': 72,
      'user_experience_degradation': 4,
    };

    const baseHours = baseRecoveryHours[impactType] || 4;
    return Math.ceil(baseHours * (1 + strength));
  }

  /**
   * Identify affected resources
   */
  private identifyAffectedResources(
    graph: CausalGraph,
    impacts: ProjectedImpact[]
  ): AffectedResource[] {
    const resourceMap = new Map<string, AffectedResource>();

    for (const impact of impacts) {
      const resource = impact.targetNode.resource;
      if (!resource) continue;

      const key = `${resource.type}:${resource.id}`;
      const existing = resourceMap.get(key);

      if (existing) {
        // Update with worst impact
        if (this.getSeverityRank(impact.magnitude) > this.getSeverityRank(existing.impactSeverity)) {
          existing.impactSeverity = this.magnitudeToSeverity(impact.magnitude);
        }
        if (!existing.impactTypes.includes(impact.impactType)) {
          existing.impactTypes.push(impact.impactType);
        }
      } else {
        resourceMap.set(key, {
          resource,
          impactSeverity: this.magnitudeToSeverity(impact.magnitude),
          impactTypes: [impact.impactType],
          dependencyDepth: this.computeDependencyDepth(graph, impact.targetNode.id),
        });
      }
    }

    return Array.from(resourceMap.values());
  }

  /**
   * Convert magnitude to severity
   */
  private magnitudeToSeverity(magnitude: number): 'critical' | 'high' | 'medium' | 'low' {
    if (magnitude >= 0.8) return 'critical';
    if (magnitude >= 0.6) return 'high';
    if (magnitude >= 0.3) return 'medium';
    return 'low';
  }

  /**
   * Get severity rank for comparison
   */
  private getSeverityRank(severity: string | number): number {
    if (typeof severity === 'number') {
      return severity;
    }
    const ranks: Record<string, number> = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1,
    };
    return ranks[severity] || 0;
  }

  /**
   * Compute dependency depth
   */
  private computeDependencyDepth(graph: CausalGraph, nodeId: UUID): number {
    const visited = new Set<UUID>();
    let maxDepth = 0;

    const traverse = (currentId: UUID, depth: number) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);
      maxDepth = Math.max(maxDepth, depth);

      const outEdges = graph.edges.filter(e => e.sourceId === currentId);
      for (const edge of outEdges) {
        traverse(edge.targetId, depth + 1);
      }
    };

    traverse(nodeId, 0);
    return maxDepth;
  }

  /**
   * Assess overall risk
   */
  private assessRisk(impacts: ProjectedImpact[]): ImpactRiskAssessment {
    if (impacts.length === 0) {
      return {
        overallRisk: 'low',
        riskScore: 0,
        breakdownByCategory: {} as Record<ImpactType, NormalizedScore>,
        mitigationPotential: 1,
      };
    }

    // Compute risk score
    const riskScore = Math.min(1, impacts.reduce(
      (sum, i) => sum + i.magnitude * i.probability,
      0
    ) / impacts.length);

    // Breakdown by category
    const breakdownByCategory: Record<ImpactType, NormalizedScore> = {} as Record<ImpactType, NormalizedScore>;
    for (const impact of impacts) {
      const current = breakdownByCategory[impact.impactType] || 0;
      breakdownByCategory[impact.impactType] = Math.max(current, impact.magnitude);
    }

    // Determine overall risk level
    let overallRisk: 'critical' | 'high' | 'medium' | 'low';
    if (riskScore >= 0.7) overallRisk = 'critical';
    else if (riskScore >= 0.5) overallRisk = 'high';
    else if (riskScore >= 0.3) overallRisk = 'medium';
    else overallRisk = 'low';

    // Mitigation potential (inverse of certainty)
    const mitigationPotential = 1 - (impacts.reduce(
      (sum, i) => sum + i.probability,
      0
    ) / impacts.length);

    return {
      overallRisk,
      riskScore,
      breakdownByCategory,
      mitigationPotential,
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    impacts: ProjectedImpact[],
    risk: ImpactRiskAssessment
  ): ImpactRecommendation[] {
    const recommendations: ImpactRecommendation[] = [];

    // Add risk-level specific recommendations
    if (risk.overallRisk === 'critical') {
      recommendations.push({
        id: this.generateId(),
        type: 'prevent',
        priority: 'critical',
        description: 'Immediate action required - consider rollback or emergency mitigation',
        estimatedEffort: 'Immediate',
        expectedRiskReduction: 0.7,
      });
    }

    // Add impact-type specific recommendations
    const impactTypes = [...new Set(impacts.map(i => i.impactType))];

    for (const impactType of impactTypes) {
      const recommendation = this.getRecommendationForImpactType(impactType, risk.breakdownByCategory[impactType]);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    // Add monitoring recommendation
    if (risk.overallRisk !== 'low') {
      recommendations.push({
        id: this.generateId(),
        type: 'monitor',
        priority: 'medium',
        description: 'Increase monitoring frequency for affected systems',
        estimatedEffort: 'Low',
        expectedRiskReduction: 0.1,
      });
    }

    return recommendations;
  }

  /**
   * Get recommendation for impact type
   */
  private getRecommendationForImpactType(
    impactType: ImpactType,
    severity: NormalizedScore
  ): ImpactRecommendation | null {
    if (severity < 0.2) return null;

    const recommendations: Record<ImpactType, Partial<ImpactRecommendation>> = {
      'performance_degradation': {
        type: 'mitigate',
        description: 'Scale resources or optimize workloads to maintain performance',
        estimatedEffort: 'Medium',
        expectedRiskReduction: 0.4,
      },
      'availability_reduction': {
        type: 'prevent',
        description: 'Enable redundancy and failover mechanisms',
        estimatedEffort: 'High',
        expectedRiskReduction: 0.6,
      },
      'accuracy_decrease': {
        type: 'mitigate',
        description: 'Consider model retraining or feature engineering improvements',
        estimatedEffort: 'High',
        expectedRiskReduction: 0.5,
      },
      'latency_increase': {
        type: 'mitigate',
        description: 'Optimize caching and reduce network hops',
        estimatedEffort: 'Medium',
        expectedRiskReduction: 0.3,
      },
      'cost_increase': {
        type: 'monitor',
        description: 'Implement cost alerts and optimize resource usage',
        estimatedEffort: 'Low',
        expectedRiskReduction: 0.2,
      },
      'security_risk': {
        type: 'prevent',
        description: 'Apply security patches and review access controls',
        estimatedEffort: 'High',
        expectedRiskReduction: 0.7,
      },
      'compliance_violation': {
        type: 'prevent',
        description: 'Review compliance requirements and implement missing controls',
        estimatedEffort: 'High',
        expectedRiskReduction: 0.8,
      },
      'user_experience_degradation': {
        type: 'mitigate',
        description: 'Implement graceful degradation and user communication',
        estimatedEffort: 'Medium',
        expectedRiskReduction: 0.3,
      },
    };

    const rec = recommendations[impactType];
    if (!rec) return null;

    return {
      id: this.generateId(),
      type: rec.type as 'prevent' | 'mitigate' | 'monitor' | 'accept',
      priority: severity >= 0.6 ? 'high' : 'medium',
      description: rec.description!,
      estimatedEffort: rec.estimatedEffort!,
      expectedRiskReduction: rec.expectedRiskReduction!,
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
}
