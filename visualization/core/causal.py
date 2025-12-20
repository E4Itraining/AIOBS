"""
AIOBS Causal Analysis Engine - Python Implementation
Root cause analysis linking infrastructure, data, and AI outcomes
"""

import random
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Set, Tuple
from uuid import uuid4


class NodeType(Enum):
    """Types of nodes in causal graph"""

    MODEL = "model"
    FEATURE = "feature"
    DATA_SOURCE = "data_source"
    INFRASTRUCTURE = "infrastructure"
    CONFIGURATION = "configuration"
    EXTERNAL_EVENT = "external_event"
    BUSINESS_METRIC = "business_metric"
    INCIDENT = "incident"


class EdgeType(Enum):
    """Types of causal relationships"""

    CAUSAL = "causal"  # Direct cause
    CORRELATION = "correlation"  # Statistical correlation
    DEPENDENCY = "dependency"  # System dependency
    TEMPORAL = "temporal"  # Temporal precedence


@dataclass
class CausalNode:
    """Node in the causal graph"""

    id: str
    node_type: NodeType
    name: str
    description: str = ""
    timestamp: Optional[datetime] = None
    attributes: Dict = field(default_factory=dict)
    impact_score: float = 0.0  # -1 to 1
    confidence: float = 0.0  # 0 to 1


@dataclass
class CausalEdge:
    """Edge in the causal graph"""

    source_id: str
    target_id: str
    edge_type: EdgeType
    weight: float = 1.0  # 0 to 1, strength of relationship
    confidence: float = 0.0  # 0 to 1
    lag_seconds: int = 0  # Temporal lag


@dataclass
class CausalGraph:
    """Complete causal graph structure"""

    id: str
    nodes: Dict[str, CausalNode]
    edges: List[CausalEdge]
    root_node_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class RootCauseResult:
    """Result of root cause analysis"""

    root_causes: List[CausalNode]
    confidence_scores: Dict[str, float]
    causal_chain: List[str]  # Node IDs in causal order
    shapley_values: Dict[str, float]  # Attribution scores
    explanation: str


@dataclass
class CounterfactualResult:
    """Result of counterfactual analysis"""

    scenario: str
    original_outcome: float
    counterfactual_outcome: float
    difference: float
    confidence: float
    affected_paths: List[List[str]]


class CausalEngine:
    """
    Causal Analysis Engine for AI Systems

    Provides:
    - Causal graph construction from events
    - Root cause analysis with confidence scoring
    - Impact propagation analysis
    - Counterfactual "what-if" scenarios
    - Shapley value-based attribution
    """

    def __init__(
        self,
        max_depth: int = 10,
        min_confidence: float = 0.5,
        discovery_algorithm: str = "ensemble",
    ):
        self.max_depth = max_depth
        self.min_confidence = min_confidence
        self.discovery_algorithm = discovery_algorithm
        self._graphs: Dict[str, CausalGraph] = {}

    def build_graph(self, events: List[Dict], scope: Optional[Dict] = None) -> CausalGraph:
        """
        Build a causal graph from a list of events.

        Events should contain:
        - id: unique identifier
        - type: event type (model_update, config_change, etc.)
        - timestamp: when it occurred
        - entity_id: what entity was affected
        - attributes: additional context
        """
        graph_id = str(uuid4())
        nodes = {}
        edges = []

        # Create nodes from events
        for event in events:
            node = CausalNode(
                id=event.get("id", str(uuid4())),
                node_type=self._infer_node_type(event),
                name=event.get("name", event.get("type", "unknown")),
                description=event.get("description", ""),
                timestamp=event.get("timestamp"),
                attributes=event.get("attributes", {}),
            )
            nodes[node.id] = node

        # Discover causal relationships
        edges = self._discover_edges(nodes, events)

        graph = CausalGraph(id=graph_id, nodes=nodes, edges=edges)

        self._graphs[graph_id] = graph
        return graph

    def analyze_root_cause(self, graph: CausalGraph, incident_node_id: str) -> RootCauseResult:
        """
        Analyze root causes for an incident.

        Uses backward traversal from incident to identify
        contributing factors with confidence scoring.
        """
        if incident_node_id not in graph.nodes:
            raise ValueError(f"Incident node {incident_node_id} not in graph")

        # Backward BFS to find root causes
        visited = set()
        root_causes = []
        causal_chain = []
        confidence_scores = {}

        queue = [(incident_node_id, 1.0, [incident_node_id])]

        while queue:
            current_id, current_confidence, path = queue.pop(0)

            if current_id in visited:
                continue
            visited.add(current_id)

            node = graph.nodes[current_id]
            causal_chain.append(current_id)
            confidence_scores[current_id] = current_confidence

            # Find incoming edges (causes)
            incoming = [e for e in graph.edges if e.target_id == current_id]

            if not incoming:
                # This is a root cause
                root_causes.append(node)
            else:
                for edge in incoming:
                    new_confidence = current_confidence * edge.confidence
                    if new_confidence >= self.min_confidence:
                        new_path = path + [edge.source_id]
                        queue.append((edge.source_id, new_confidence, new_path))

        # Compute Shapley values for attribution
        shapley = self._compute_shapley_values(graph, incident_node_id, root_causes)

        # Generate explanation
        explanation = self._generate_explanation(root_causes, confidence_scores)

        return RootCauseResult(
            root_causes=root_causes,
            confidence_scores=confidence_scores,
            causal_chain=list(reversed(causal_chain)),
            shapley_values=shapley,
            explanation=explanation,
        )

    def analyze_impact(
        self, graph: CausalGraph, source_node_id: str, change_magnitude: float = 1.0
    ) -> Dict[str, float]:
        """
        Analyze downstream impact of a change at source node.

        Returns impact scores for all affected nodes.
        """
        if source_node_id not in graph.nodes:
            raise ValueError(f"Source node {source_node_id} not in graph")

        impacts = {source_node_id: change_magnitude}
        visited = set()
        queue = [source_node_id]

        while queue:
            current_id = queue.pop(0)
            if current_id in visited:
                continue
            visited.add(current_id)

            current_impact = impacts[current_id]

            # Find outgoing edges (effects)
            outgoing = [e for e in graph.edges if e.source_id == current_id]

            for edge in outgoing:
                propagated_impact = current_impact * edge.weight
                if edge.target_id in impacts:
                    impacts[edge.target_id] = max(impacts[edge.target_id], propagated_impact)
                else:
                    impacts[edge.target_id] = propagated_impact

                queue.append(edge.target_id)

        return impacts

    def counterfactual(
        self, graph: CausalGraph, intervention: Dict[str, float], target_node_id: str
    ) -> CounterfactualResult:
        """
        Perform counterfactual analysis: "What if X had been different?"

        intervention: Dict mapping node_id -> new value
        target_node_id: The outcome we want to predict
        """
        # Original outcome (mock - in production, this would be from data)
        original_outcome = graph.nodes[target_node_id].impact_score

        # Compute counterfactual by propagating intervention
        total_effect = 0.0
        affected_paths = []

        for source_id, new_value in intervention.items():
            impacts = self.analyze_impact(graph, source_id, new_value)
            if target_node_id in impacts:
                total_effect += impacts[target_node_id]
                # Trace path
                path = self._trace_path(graph, source_id, target_node_id)
                if path:
                    affected_paths.append(path)

        counterfactual_outcome = original_outcome + total_effect
        confidence = min(
            [
                graph.edges[i].confidence
                for i, e in enumerate(graph.edges)
                if any(e.source_id in p and e.target_id in p for p in affected_paths)
            ]
            or [0.5]
        )

        return CounterfactualResult(
            scenario=f"Intervention on {list(intervention.keys())}",
            original_outcome=original_outcome,
            counterfactual_outcome=counterfactual_outcome,
            difference=counterfactual_outcome - original_outcome,
            confidence=confidence,
            affected_paths=affected_paths,
        )

    def get_demo_graph(self, scenario: str = "drift_incident") -> CausalGraph:
        """Generate a demo causal graph for visualization"""
        if scenario == "drift_incident":
            return self._create_drift_incident_graph()
        elif scenario == "cost_spike":
            return self._create_cost_spike_graph()
        else:
            return self._create_generic_graph()

    # =========================================================================
    # Private Helper Methods
    # =========================================================================

    def _infer_node_type(self, event: Dict) -> NodeType:
        """Infer node type from event data"""
        event_type = event.get("type", "").lower()

        if "model" in event_type:
            return NodeType.MODEL
        elif "feature" in event_type or "data" in event_type:
            return NodeType.FEATURE
        elif "config" in event_type:
            return NodeType.CONFIGURATION
        elif "infra" in event_type or "server" in event_type:
            return NodeType.INFRASTRUCTURE
        elif "incident" in event_type or "alert" in event_type:
            return NodeType.INCIDENT
        elif "metric" in event_type or "kpi" in event_type:
            return NodeType.BUSINESS_METRIC
        else:
            return NodeType.EXTERNAL_EVENT

    def _discover_edges(self, nodes: Dict[str, CausalNode], events: List[Dict]) -> List[CausalEdge]:
        """Discover causal edges between nodes"""
        edges = []

        # Simple temporal-based discovery
        sorted_nodes = sorted(nodes.values(), key=lambda n: n.timestamp or datetime.min)

        for i, node in enumerate(sorted_nodes[:-1]):
            next_node = sorted_nodes[i + 1]

            # Check if there's a plausible causal link
            if self._is_plausible_cause(node, next_node):
                edge = CausalEdge(
                    source_id=node.id,
                    target_id=next_node.id,
                    edge_type=EdgeType.CAUSAL,
                    weight=0.7 + random.uniform(-0.2, 0.2),
                    confidence=0.6 + random.uniform(-0.1, 0.2),
                )
                edges.append(edge)

        return edges

    def _is_plausible_cause(self, source: CausalNode, target: CausalNode) -> bool:
        """Check if source could plausibly cause target"""
        # Simple heuristic - in production, use domain knowledge
        causal_pairs = {
            (NodeType.DATA_SOURCE, NodeType.FEATURE),
            (NodeType.FEATURE, NodeType.MODEL),
            (NodeType.CONFIGURATION, NodeType.MODEL),
            (NodeType.INFRASTRUCTURE, NodeType.MODEL),
            (NodeType.MODEL, NodeType.BUSINESS_METRIC),
            (NodeType.MODEL, NodeType.INCIDENT),
            (NodeType.EXTERNAL_EVENT, NodeType.DATA_SOURCE),
        }
        return (source.node_type, target.node_type) in causal_pairs

    def _compute_shapley_values(
        self, graph: CausalGraph, target_id: str, root_causes: List[CausalNode]
    ) -> Dict[str, float]:
        """Compute Shapley values for root cause attribution"""
        # Simplified Shapley approximation
        if not root_causes:
            return {}

        total_attribution = 1.0
        shapley = {}

        for node in root_causes:
            # Base attribution on path strength to target
            path_strength = self._compute_path_strength(graph, node.id, target_id)
            shapley[node.id] = path_strength

        # Normalize
        total = sum(shapley.values())
        if total > 0:
            shapley = {k: v / total for k, v in shapley.items()}

        return shapley

    def _compute_path_strength(self, graph: CausalGraph, source_id: str, target_id: str) -> float:
        """Compute strength of causal path between nodes"""
        # BFS with strength accumulation
        visited = set()
        queue = [(source_id, 1.0)]

        while queue:
            current, strength = queue.pop(0)
            if current == target_id:
                return strength
            if current in visited:
                continue
            visited.add(current)

            for edge in graph.edges:
                if edge.source_id == current:
                    new_strength = strength * edge.weight * edge.confidence
                    queue.append((edge.target_id, new_strength))

        return 0.0

    def _trace_path(self, graph: CausalGraph, source_id: str, target_id: str) -> List[str]:
        """Trace causal path between two nodes"""
        visited = set()
        queue = [(source_id, [source_id])]

        while queue:
            current, path = queue.pop(0)
            if current == target_id:
                return path
            if current in visited:
                continue
            visited.add(current)

            for edge in graph.edges:
                if edge.source_id == current:
                    queue.append((edge.target_id, path + [edge.target_id]))

        return []

    def _generate_explanation(
        self, root_causes: List[CausalNode], confidence_scores: Dict[str, float]
    ) -> str:
        """Generate natural language explanation of root causes"""
        if not root_causes:
            return "No root causes identified with sufficient confidence."

        causes_str = ", ".join(
            [
                f"{rc.name} (confidence: {confidence_scores.get(rc.id, 0):.0%})"
                for rc in root_causes[:3]
            ]
        )

        return f"Identified {len(root_causes)} potential root cause(s): {causes_str}"

    def _create_drift_incident_graph(self) -> CausalGraph:
        """Create demo graph for drift incident scenario"""
        nodes = {
            "data_change": CausalNode(
                id="data_change",
                node_type=NodeType.DATA_SOURCE,
                name="Data Distribution Shift",
                description="Upstream data provider changed schema",
                impact_score=0.8,
            ),
            "feature_drift": CausalNode(
                id="feature_drift",
                node_type=NodeType.FEATURE,
                name="Feature Drift Detected",
                description="Key features showing significant drift",
                impact_score=0.7,
            ),
            "model_degradation": CausalNode(
                id="model_degradation",
                node_type=NodeType.MODEL,
                name="Model Accuracy Drop",
                description="Model accuracy dropped 15%",
                impact_score=0.9,
            ),
            "business_impact": CausalNode(
                id="business_impact",
                node_type=NodeType.BUSINESS_METRIC,
                name="Conversion Rate Drop",
                description="Conversion rate dropped 8%",
                impact_score=0.6,
            ),
        }

        edges = [
            CausalEdge("data_change", "feature_drift", EdgeType.CAUSAL, 0.9, 0.85),
            CausalEdge("feature_drift", "model_degradation", EdgeType.CAUSAL, 0.85, 0.9),
            CausalEdge("model_degradation", "business_impact", EdgeType.CAUSAL, 0.7, 0.75),
        ]

        return CausalGraph(id="drift_demo", nodes=nodes, edges=edges)

    def _create_cost_spike_graph(self) -> CausalGraph:
        """Create demo graph for cost spike scenario"""
        nodes = {
            "traffic_spike": CausalNode(
                id="traffic_spike",
                node_type=NodeType.EXTERNAL_EVENT,
                name="Traffic Spike",
                description="10x normal traffic",
                impact_score=0.9,
            ),
            "autoscale": CausalNode(
                id="autoscale",
                node_type=NodeType.INFRASTRUCTURE,
                name="Auto-scaling Triggered",
                description="Scaled to 50 instances",
                impact_score=0.7,
            ),
            "inference_volume": CausalNode(
                id="inference_volume",
                node_type=NodeType.MODEL,
                name="High Inference Volume",
                description="5M inferences/hour",
                impact_score=0.8,
            ),
            "cost_spike": CausalNode(
                id="cost_spike",
                node_type=NodeType.BUSINESS_METRIC,
                name="Cost Spike",
                description="300% above budget",
                impact_score=0.95,
            ),
        }

        edges = [
            CausalEdge("traffic_spike", "autoscale", EdgeType.CAUSAL, 0.95, 0.95),
            CausalEdge("traffic_spike", "inference_volume", EdgeType.CAUSAL, 0.9, 0.9),
            CausalEdge("autoscale", "cost_spike", EdgeType.CAUSAL, 0.8, 0.85),
            CausalEdge("inference_volume", "cost_spike", EdgeType.CAUSAL, 0.85, 0.9),
        ]

        return CausalGraph(id="cost_demo", nodes=nodes, edges=edges)

    def _create_generic_graph(self) -> CausalGraph:
        """Create a generic demo graph"""
        nodes = {
            "root": CausalNode(id="root", node_type=NodeType.EXTERNAL_EVENT, name="Event"),
            "effect": CausalNode(id="effect", node_type=NodeType.INCIDENT, name="Outcome"),
        }
        edges = [CausalEdge("root", "effect", EdgeType.CAUSAL, 0.8, 0.7)]
        return CausalGraph(id="generic", nodes=nodes, edges=edges)
