/**
 * Causal Analysis Type Definitions
 * Types for causal reasoning, root cause analysis, and impact assessment
 */

import {
  ISO8601,
  UUID,
  NormalizedScore,
  ResourceIdentifier,
  ActorIdentity,
  JSONValue,
} from './common';

// ============================================================================
// Causal Graph Types
// ============================================================================

/** Causal graph representing cause-effect relationships */
export interface CausalGraph {
  id: UUID;
  name: string;
  createdAt: ISO8601;
  updatedAt: ISO8601;

  // Graph structure
  nodes: CausalNode[];
  edges: CausalEdge[];

  // Metadata
  scope: CausalScope;
  confidence: NormalizedScore;
  lastValidated: ISO8601;
}

/** Scope of causal analysis */
export interface CausalScope {
  resources: ResourceIdentifier[];
  timeRange: {
    start: ISO8601;
    end: ISO8601;
  };
  includeInfrastructure: boolean;
  includeData: boolean;
  includeHuman: boolean;
}

/** Node in causal graph */
export interface CausalNode {
  id: UUID;
  type: CausalNodeType;
  name: string;
  description: string;

  // Node properties
  properties: CausalNodeProperties;

  // Timing
  timestamp: ISO8601;
  duration?: number;

  // Attribution
  actor?: ActorIdentity;
  resource?: ResourceIdentifier;

  // Metrics at this point
  metrics?: Record<string, number>;
}

export type CausalNodeType =
  | 'event'           // System event
  | 'change'          // Configuration/code change
  | 'metric_anomaly'  // Metric deviation
  | 'decision'        // Human or automated decision
  | 'deployment'      // Model/system deployment
  | 'data_change'     // Data pipeline change
  | 'infrastructure'  // Infrastructure event
  | 'external'        // External factor
  | 'outcome';        // Observed outcome

export interface CausalNodeProperties {
  severity?: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  tags: string[];
  metadata: Record<string, JSONValue>;
}

/** Edge in causal graph representing cause-effect relationship */
export interface CausalEdge {
  id: UUID;
  sourceId: UUID;
  targetId: UUID;

  // Relationship properties
  relationship: CausalRelationship;

  // Strength and confidence
  strength: NormalizedScore;
  confidence: NormalizedScore;

  // Timing
  lagTime?: number; // Time between cause and effect (ms)

  // Evidence
  evidence: CausalEvidence[];
}

export interface CausalRelationship {
  type: CausalRelationType;
  mechanism?: string;
  reversible: boolean;
  directEffect: boolean;
}

export type CausalRelationType =
  | 'causes'
  | 'contributes_to'
  | 'triggers'
  | 'enables'
  | 'prevents'
  | 'mitigates'
  | 'correlates_with'
  | 'depends_on';

export interface CausalEvidence {
  type: EvidenceType;
  description: string;
  confidence: NormalizedScore;
  source: string;
  timestamp: ISO8601;
}

export type EvidenceType =
  | 'statistical'
  | 'temporal'
  | 'domain_knowledge'
  | 'intervention'
  | 'counterfactual'
  | 'expert_annotation';

// ============================================================================
// Root Cause Analysis
// ============================================================================

/** Root cause analysis result */
export interface RootCauseAnalysis {
  id: UUID;
  timestamp: ISO8601;

  // Target event being analyzed
  targetEvent: CausalNode;

  // Identified root causes
  rootCauses: RootCause[];

  // Causal chain from root to effect
  causalChains: CausalChain[];

  // Contributing factors
  contributingFactors: ContributingFactor[];

  // Confidence in analysis
  overallConfidence: NormalizedScore;

  // Analysis metadata
  methodology: AnalysisMethodology;
}

export interface RootCause {
  id: UUID;
  node: CausalNode;

  // Root cause classification
  classification: RootCauseClassification;

  // Likelihood this is the true root cause
  probability: NormalizedScore;
  confidence: NormalizedScore;

  // Supporting evidence
  evidence: CausalEvidence[];

  // Impact on target
  impactMagnitude: NormalizedScore;
}

export interface RootCauseClassification {
  category: RootCauseCategory;
  subcategory: string;
  tags: string[];
}

export type RootCauseCategory =
  | 'data_quality'
  | 'model_drift'
  | 'infrastructure'
  | 'configuration'
  | 'code_change'
  | 'external_dependency'
  | 'human_error'
  | 'resource_constraint'
  | 'security_incident'
  | 'unknown';

export interface CausalChain {
  id: UUID;

  // Ordered list of nodes from root to effect
  nodes: CausalNode[];
  edges: CausalEdge[];

  // Chain properties
  totalLagTime: number;
  weakestLink: CausalEdge;
  overallStrength: NormalizedScore;
}

export interface ContributingFactor {
  node: CausalNode;
  contributionWeight: NormalizedScore;
  isRemovable: boolean;
  removalImpact: NormalizedScore;
}

export interface AnalysisMethodology {
  algorithms: string[];
  dataSourcesUsed: string[];
  timeRange: {
    start: ISO8601;
    end: ISO8601;
  };
  computationTime: number;
}

// ============================================================================
// Impact Analysis
// ============================================================================

/** Impact analysis for a change or event */
export interface ImpactAnalysis {
  id: UUID;
  timestamp: ISO8601;

  // Source of change
  sourceEvent: CausalNode;

  // Projected impacts
  impacts: ProjectedImpact[];

  // Affected resources
  affectedResources: AffectedResource[];

  // Risk assessment
  riskAssessment: ImpactRiskAssessment;

  // Recommendations
  recommendations: ImpactRecommendation[];
}

export interface ProjectedImpact {
  id: UUID;
  targetNode: CausalNode;

  // Impact properties
  impactType: ImpactType;
  magnitude: NormalizedScore;
  probability: NormalizedScore;

  // Timing
  expectedLagTime: number;
  timeToRecover?: number;

  // Quantified impact
  quantifiedEffect?: QuantifiedEffect;
}

export type ImpactType =
  | 'performance_degradation'
  | 'availability_reduction'
  | 'accuracy_decrease'
  | 'latency_increase'
  | 'cost_increase'
  | 'security_risk'
  | 'compliance_violation'
  | 'user_experience_degradation';

export interface QuantifiedEffect {
  metric: string;
  currentValue: number;
  projectedValue: number;
  unit: string;
  confidence: NormalizedScore;
}

export interface AffectedResource {
  resource: ResourceIdentifier;
  impactSeverity: 'critical' | 'high' | 'medium' | 'low';
  impactTypes: ImpactType[];
  dependencyDepth: number;
}

export interface ImpactRiskAssessment {
  overallRisk: 'critical' | 'high' | 'medium' | 'low';
  riskScore: NormalizedScore;

  // Risk breakdown
  breakdownByCategory: Record<ImpactType, NormalizedScore>;

  // Mitigation potential
  mitigationPotential: NormalizedScore;
}

export interface ImpactRecommendation {
  id: UUID;
  type: 'prevent' | 'mitigate' | 'monitor' | 'accept';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  estimatedEffort: string;
  expectedRiskReduction: NormalizedScore;
}

// ============================================================================
// Counterfactual Analysis
// ============================================================================

/** Counterfactual scenario analysis */
export interface CounterfactualAnalysis {
  id: UUID;
  timestamp: ISO8601;

  // Original scenario
  originalScenario: Scenario;

  // Counterfactual scenarios
  counterfactuals: CounterfactualScenario[];

  // Comparison
  comparison: ScenarioComparison;
}

export interface Scenario {
  id: UUID;
  name: string;
  description: string;

  // Scenario conditions
  conditions: ScenarioCondition[];

  // Observed/projected outcomes
  outcomes: ScenarioOutcome[];
}

export interface ScenarioCondition {
  nodeId: UUID;
  variable: string;
  value: JSONValue;
  originalValue?: JSONValue;
}

export interface ScenarioOutcome {
  metric: string;
  value: number;
  confidence: NormalizedScore;
}

export interface CounterfactualScenario extends Scenario {
  // What was changed
  interventions: Intervention[];

  // Likelihood this would have happened
  plausibility: NormalizedScore;
}

export interface Intervention {
  nodeId: UUID;
  variable: string;
  originalValue: JSONValue;
  counterfactualValue: JSONValue;
  description: string;
}

export interface ScenarioComparison {
  originalOutcome: ScenarioOutcome[];
  counterfactualOutcomes: {
    scenarioId: UUID;
    outcomes: ScenarioOutcome[];
    delta: Record<string, number>;
  }[];
  insights: ComparisonInsight[];
}

export interface ComparisonInsight {
  type: 'opportunity' | 'risk' | 'neutral';
  description: string;
  significance: NormalizedScore;
  actionable: boolean;
}

// ============================================================================
// Attribution
// ============================================================================

/** Attribution of outcomes to causes */
export interface AttributionAnalysis {
  id: UUID;
  timestamp: ISO8601;

  // Outcome being attributed
  outcome: CausalNode;

  // Attribution results
  attributions: Attribution[];

  // Methodology
  method: AttributionMethod;
}

export interface Attribution {
  cause: CausalNode;
  attributionWeight: NormalizedScore;
  confidence: NormalizedScore;
  mechanism: string;
  evidence: CausalEvidence[];
}

export type AttributionMethod =
  | 'shapley'
  | 'granger'
  | 'do_calculus'
  | 'propensity_score'
  | 'instrumental_variable'
  | 'regression_discontinuity'
  | 'hybrid';

// ============================================================================
// Causal Discovery
// ============================================================================

/** Causal discovery results */
export interface CausalDiscoveryResult {
  id: UUID;
  timestamp: ISO8601;

  // Discovered graph
  discoveredGraph: CausalGraph;

  // Discovery metadata
  algorithm: CausalDiscoveryAlgorithm;
  dataUsed: DataSourceSummary[];

  // Quality metrics
  quality: DiscoveryQuality;
}

export type CausalDiscoveryAlgorithm =
  | 'pc'
  | 'fci'
  | 'ges'
  | 'lingam'
  | 'notears'
  | 'dag_gnn'
  | 'ensemble';

export interface DataSourceSummary {
  source: string;
  recordCount: number;
  features: string[];
  timeRange: {
    start: ISO8601;
    end: ISO8601;
  };
}

export interface DiscoveryQuality {
  structuralHammingDistance?: number;
  edgePrecision: NormalizedScore;
  edgeRecall: NormalizedScore;
  orientationAccuracy: NormalizedScore;
  overallConfidence: NormalizedScore;
}
