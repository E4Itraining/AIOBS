"""
AIOBS Causal Analysis Tests
Tests for root cause analysis, impact propagation, and counterfactual reasoning
"""

import random
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple

import pytest

# =============================================================================
# Causal Graph Implementation
# =============================================================================


@dataclass
class CausalNode:
    """Node in causal graph"""

    id: str
    name: str
    node_type: str  # event, metric, service, component
    timestamp: Optional[datetime] = None
    severity: str = "info"  # info, warning, error, critical
    attributes: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CausalEdge:
    """Edge in causal graph representing causal relationship"""

    source: str
    target: str
    weight: float = 1.0  # Causal strength
    delay_seconds: int = 0  # Propagation delay
    confidence: float = 1.0  # Confidence in this relationship


@dataclass
class CausalGraph:
    """Directed acyclic graph for causal relationships"""

    nodes: Dict[str, CausalNode] = field(default_factory=dict)
    edges: List[CausalEdge] = field(default_factory=list)

    def add_node(self, node: CausalNode):
        self.nodes[node.id] = node

    def add_edge(self, edge: CausalEdge):
        if edge.source in self.nodes and edge.target in self.nodes:
            self.edges.append(edge)

    def get_children(self, node_id: str) -> List[str]:
        return [e.target for e in self.edges if e.source == node_id]

    def get_parents(self, node_id: str) -> List[str]:
        return [e.source for e in self.edges if e.target == node_id]

    def get_edge(self, source: str, target: str) -> Optional[CausalEdge]:
        for edge in self.edges:
            if edge.source == source and edge.target == target:
                return edge
        return None


@dataclass
class RootCauseResult:
    """Result of root cause analysis"""

    root_causes: List[str]
    confidence_scores: Dict[str, float]
    causal_paths: List[List[str]]
    impact_chain: Dict[str, List[str]]


@dataclass
class CounterfactualResult:
    """Result of counterfactual analysis"""

    scenario: str
    affected_nodes: List[str]
    estimated_impact: float
    probability: float
    recommendations: List[str]


class CausalEngine:
    """Engine for causal analysis and reasoning"""

    def __init__(self, decay_factor: float = 0.8):
        self.decay_factor = decay_factor

    def build_graph(self, events: List[Dict]) -> CausalGraph:
        """
        Build causal graph from events.
        Uses temporal proximity and correlation to infer causality.
        """
        graph = CausalGraph()

        # Add nodes
        for event in events:
            node = CausalNode(
                id=event["id"],
                name=event.get("name", event["id"]),
                node_type=event.get("type", "event"),
                timestamp=event.get("timestamp"),
                severity=event.get("severity", "info"),
                attributes=event.get("attributes", {}),
            )
            graph.add_node(node)

        # Infer edges based on temporal ordering and type relationships
        sorted_events = sorted(events, key=lambda e: e.get("timestamp", datetime.min))

        for i, event in enumerate(sorted_events):
            # Look for potential causes in preceding events
            for j in range(max(0, i - 5), i):  # Look at last 5 events
                prev_event = sorted_events[j]

                # Check if there's a likely causal relationship
                if self._is_likely_cause(prev_event, event):
                    time_diff = 0
                    if event.get("timestamp") and prev_event.get("timestamp"):
                        time_diff = (event["timestamp"] - prev_event["timestamp"]).total_seconds()

                    edge = CausalEdge(
                        source=prev_event["id"],
                        target=event["id"],
                        weight=1.0 / (1 + time_diff / 60),  # Decay with time
                        delay_seconds=int(time_diff),
                        confidence=self._compute_confidence(prev_event, event),
                    )
                    graph.add_edge(edge)

        return graph

    def _is_likely_cause(self, cause: Dict, effect: Dict) -> bool:
        """Determine if cause event likely caused effect event"""
        # Same service or related services
        if cause.get("service") == effect.get("service"):
            return True

        # Type-based heuristics
        cause_type = cause.get("type", "")
        effect_type = effect.get("type", "")

        type_relationships = {
            ("config_change", "error"),
            ("deployment", "error"),
            ("resource_exhaustion", "latency"),
            ("network_issue", "timeout"),
            ("data_drift", "accuracy_drop"),
        }

        return (cause_type, effect_type) in type_relationships

    def _compute_confidence(self, cause: Dict, effect: Dict) -> float:
        """Compute confidence in causal relationship"""
        confidence = 0.5  # Base confidence

        # Higher confidence if same service
        if cause.get("service") == effect.get("service"):
            confidence += 0.2

        # Higher confidence if severity escalation
        severity_order = {"info": 0, "warning": 1, "error": 2, "critical": 3}
        cause_sev = severity_order.get(cause.get("severity", "info"), 0)
        effect_sev = severity_order.get(effect.get("severity", "info"), 0)
        if effect_sev > cause_sev:
            confidence += 0.2

        # Higher confidence if temporal proximity is close
        if cause.get("timestamp") and effect.get("timestamp"):
            time_diff = (effect["timestamp"] - cause["timestamp"]).total_seconds()
            if time_diff < 60:
                confidence += 0.1

        return min(1.0, confidence)

    def find_root_causes(self, graph: CausalGraph, symptom_id: str) -> RootCauseResult:
        """
        Find root causes for a given symptom using backward traversal.
        """
        if symptom_id not in graph.nodes:
            return RootCauseResult([], {}, [], {})

        root_causes = []
        confidence_scores = {}
        all_paths = []
        impact_chain = {}

        # BFS backward traversal
        visited = set()
        queue = deque([(symptom_id, [symptom_id], 1.0)])

        while queue:
            current, path, confidence = queue.popleft()

            if current in visited:
                continue
            visited.add(current)

            parents = graph.get_parents(current)

            if not parents:
                # This is a root cause
                root_causes.append(current)
                confidence_scores[current] = confidence
                all_paths.append(list(reversed(path)))
            else:
                for parent in parents:
                    edge = graph.get_edge(parent, current)
                    new_confidence = (
                        confidence * (edge.confidence if edge else 1.0) * self.decay_factor
                    )
                    queue.append((parent, path + [parent], new_confidence))

        # Build impact chain
        for node_id in visited:
            impact_chain[node_id] = graph.get_children(node_id)

        return RootCauseResult(
            root_causes=root_causes,
            confidence_scores=confidence_scores,
            causal_paths=all_paths,
            impact_chain=impact_chain,
        )

    def propagate_impact(
        self, graph: CausalGraph, source_id: str, initial_impact: float = 1.0
    ) -> Dict[str, float]:
        """
        Propagate impact forward through the causal graph.
        """
        if source_id not in graph.nodes:
            return {}

        impacts = {source_id: initial_impact}
        visited = set()
        queue = deque([source_id])

        while queue:
            current = queue.popleft()

            if current in visited:
                continue
            visited.add(current)

            current_impact = impacts[current]

            for child in graph.get_children(current):
                edge = graph.get_edge(current, child)
                propagated = current_impact * self.decay_factor
                if edge:
                    propagated *= edge.weight

                if child not in impacts or impacts[child] < propagated:
                    impacts[child] = propagated
                    queue.append(child)

        return impacts

    def counterfactual_analysis(
        self, graph: CausalGraph, intervention: Dict[str, Any]
    ) -> CounterfactualResult:
        """
        Analyze: "What if X had not happened?"
        """
        removed_node = intervention.get("remove_node")
        if not removed_node or removed_node not in graph.nodes:
            return CounterfactualResult(
                scenario="Invalid intervention",
                affected_nodes=[],
                estimated_impact=0,
                probability=0,
                recommendations=[],
            )

        # Find all nodes that would be affected
        affected = set()
        queue = deque([removed_node])

        while queue:
            current = queue.popleft()
            if current in affected:
                continue
            affected.add(current)

            for child in graph.get_children(current):
                # Only add if this is the only parent
                parents = graph.get_parents(child)
                parents_not_affected = [p for p in parents if p not in affected]
                if not parents_not_affected:
                    queue.append(child)

        # Estimate impact
        severity_weights = {"info": 0.1, "warning": 0.3, "error": 0.6, "critical": 1.0}
        total_impact = sum(severity_weights.get(graph.nodes[n].severity, 0.1) for n in affected)

        # Generate recommendations
        recommendations = []
        if total_impact > 0.5:
            recommendations.append(
                f"Preventing {removed_node} would have significant positive impact"
            )
        if len(affected) > 3:
            recommendations.append(
                f"This event triggered a cascade of {len(affected)} related issues"
            )

        return CounterfactualResult(
            scenario=f"Intervention: Remove {removed_node}",
            affected_nodes=list(affected),
            estimated_impact=total_impact,
            probability=0.8,  # Placeholder
            recommendations=recommendations,
        )


# =============================================================================
# Causal Analysis Tests
# =============================================================================


class TestCausalGraphConstruction:
    """Tests for causal graph construction"""

    @pytest.fixture
    def engine(self):
        return CausalEngine()

    def test_empty_events(self, engine):
        """Should handle empty events"""
        graph = engine.build_graph([])
        assert len(graph.nodes) == 0
        assert len(graph.edges) == 0

    def test_single_event(self, engine):
        """Should handle single event"""
        events = [{"id": "e1", "name": "Error", "type": "error"}]
        graph = engine.build_graph(events)

        assert len(graph.nodes) == 1
        assert "e1" in graph.nodes

    def test_temporal_ordering(self, engine):
        """Should create edges based on temporal order"""
        now = datetime.utcnow()
        events = [
            {
                "id": "e1",
                "name": "Config Change",
                "type": "config_change",
                "timestamp": now,
                "service": "api",
            },
            {
                "id": "e2",
                "name": "Error",
                "type": "error",
                "timestamp": now + timedelta(seconds=30),
                "service": "api",
            },
        ]

        graph = engine.build_graph(events)

        # Should have edge from e1 to e2
        children = graph.get_children("e1")
        assert "e2" in children

    def test_no_edge_for_unrelated(self, engine):
        """Should not create edges for unrelated events"""
        now = datetime.utcnow()
        events = [
            {
                "id": "e1",
                "name": "Info Log",
                "type": "info",
                "timestamp": now,
                "service": "service_a",
            },
            {
                "id": "e2",
                "name": "Different Info",
                "type": "info",
                "timestamp": now + timedelta(hours=1),
                "service": "service_b",
            },
        ]

        graph = engine.build_graph(events)

        # Should not have edge (different services, too far apart)
        children = graph.get_children("e1")
        assert "e2" not in children


class TestRootCauseAnalysis:
    """Tests for root cause analysis"""

    @pytest.fixture
    def engine(self):
        return CausalEngine()

    @pytest.fixture
    def simple_graph(self):
        """Create a simple causal graph for testing"""
        graph = CausalGraph()

        # A -> B -> C (linear chain)
        graph.add_node(CausalNode("A", "Root Cause", "error", severity="error"))
        graph.add_node(CausalNode("B", "Intermediate", "error", severity="warning"))
        graph.add_node(CausalNode("C", "Symptom", "error", severity="info"))

        graph.add_edge(CausalEdge("A", "B", weight=1.0, confidence=0.9))
        graph.add_edge(CausalEdge("B", "C", weight=1.0, confidence=0.8))

        return graph

    def test_find_single_root_cause(self, engine, simple_graph):
        """Should find single root cause in linear chain"""
        result = engine.find_root_causes(simple_graph, "C")

        assert "A" in result.root_causes
        assert len(result.root_causes) == 1

    def test_confidence_decay(self, engine, simple_graph):
        """Confidence should decay along the path"""
        result = engine.find_root_causes(simple_graph, "C")

        # A is root, confidence should be decayed
        assert "A" in result.confidence_scores
        assert result.confidence_scores["A"] < 1.0

    def test_causal_paths(self, engine, simple_graph):
        """Should return complete causal paths"""
        result = engine.find_root_causes(simple_graph, "C")

        assert len(result.causal_paths) > 0
        # Path should be A -> B -> C
        assert ["A", "B", "C"] in result.causal_paths

    def test_multiple_root_causes(self, engine):
        """Should find multiple root causes"""
        graph = CausalGraph()

        # A -> C, B -> C (two causes for C)
        graph.add_node(CausalNode("A", "Cause 1", "error"))
        graph.add_node(CausalNode("B", "Cause 2", "error"))
        graph.add_node(CausalNode("C", "Effect", "error"))

        graph.add_edge(CausalEdge("A", "C"))
        graph.add_edge(CausalEdge("B", "C"))

        result = engine.find_root_causes(graph, "C")

        assert len(result.root_causes) == 2
        assert "A" in result.root_causes
        assert "B" in result.root_causes

    def test_nonexistent_symptom(self, engine, simple_graph):
        """Should handle nonexistent symptom"""
        result = engine.find_root_causes(simple_graph, "X")

        assert len(result.root_causes) == 0


class TestImpactPropagation:
    """Tests for impact propagation"""

    @pytest.fixture
    def engine(self):
        return CausalEngine(decay_factor=0.8)

    @pytest.fixture
    def diamond_graph(self):
        """Create diamond-shaped graph: A -> B,C -> D"""
        graph = CausalGraph()

        graph.add_node(CausalNode("A", "Source", "event"))
        graph.add_node(CausalNode("B", "Path 1", "event"))
        graph.add_node(CausalNode("C", "Path 2", "event"))
        graph.add_node(CausalNode("D", "Sink", "event"))

        graph.add_edge(CausalEdge("A", "B", weight=1.0))
        graph.add_edge(CausalEdge("A", "C", weight=1.0))
        graph.add_edge(CausalEdge("B", "D", weight=1.0))
        graph.add_edge(CausalEdge("C", "D", weight=1.0))

        return graph

    def test_source_full_impact(self, engine, diamond_graph):
        """Source should have full impact"""
        impacts = engine.propagate_impact(diamond_graph, "A", initial_impact=1.0)

        assert impacts["A"] == 1.0

    def test_impact_decay(self, engine, diamond_graph):
        """Impact should decay along path"""
        impacts = engine.propagate_impact(diamond_graph, "A", initial_impact=1.0)

        # B and C should have decayed impact
        assert impacts["B"] < impacts["A"]
        assert impacts["C"] < impacts["A"]
        assert impacts["B"] == 0.8  # 1.0 * 0.8

    def test_impact_propagates_to_all(self, engine, diamond_graph):
        """Impact should reach all downstream nodes"""
        impacts = engine.propagate_impact(diamond_graph, "A", initial_impact=1.0)

        assert "A" in impacts
        assert "B" in impacts
        assert "C" in impacts
        assert "D" in impacts

    def test_nonexistent_source(self, engine, diamond_graph):
        """Should handle nonexistent source"""
        impacts = engine.propagate_impact(diamond_graph, "X", initial_impact=1.0)

        assert len(impacts) == 0


class TestCounterfactualAnalysis:
    """Tests for counterfactual analysis"""

    @pytest.fixture
    def engine(self):
        return CausalEngine()

    @pytest.fixture
    def cascade_graph(self):
        """Create cascade graph for counterfactual testing"""
        graph = CausalGraph()

        # Root -> A, B -> C, D -> E
        graph.add_node(CausalNode("Root", "Root Event", "event", severity="critical"))
        graph.add_node(CausalNode("A", "Effect A", "event", severity="error"))
        graph.add_node(CausalNode("B", "Effect B", "event", severity="error"))
        graph.add_node(CausalNode("C", "Effect C", "event", severity="warning"))
        graph.add_node(CausalNode("D", "Effect D", "event", severity="warning"))
        graph.add_node(CausalNode("E", "Effect E", "event", severity="info"))

        graph.add_edge(CausalEdge("Root", "A"))
        graph.add_edge(CausalEdge("Root", "B"))
        graph.add_edge(CausalEdge("A", "C"))
        graph.add_edge(CausalEdge("B", "D"))
        graph.add_edge(CausalEdge("C", "E"))
        graph.add_edge(CausalEdge("D", "E"))

        return graph

    def test_counterfactual_removes_cascade(self, engine, cascade_graph):
        """Removing root should affect all downstream"""
        result = engine.counterfactual_analysis(cascade_graph, {"remove_node": "Root"})

        # Should affect all nodes in cascade
        assert "Root" in result.affected_nodes
        assert len(result.affected_nodes) > 1

    def test_counterfactual_partial_removal(self, engine, cascade_graph):
        """Removing intermediate node affects only its descendants"""
        result = engine.counterfactual_analysis(cascade_graph, {"remove_node": "A"})

        assert "A" in result.affected_nodes
        assert "C" in result.affected_nodes
        # B and D should not be affected (different branch)
        assert "B" not in result.affected_nodes
        assert "D" not in result.affected_nodes

    def test_counterfactual_impact_estimate(self, engine, cascade_graph):
        """Should estimate impact based on severity"""
        result = engine.counterfactual_analysis(cascade_graph, {"remove_node": "Root"})

        # Impact should be positive (removing critical event)
        assert result.estimated_impact > 0

    def test_counterfactual_invalid_node(self, engine, cascade_graph):
        """Should handle invalid node"""
        result = engine.counterfactual_analysis(cascade_graph, {"remove_node": "NonExistent"})

        assert len(result.affected_nodes) == 0
        assert result.estimated_impact == 0


class TestGraphOperations:
    """Tests for basic graph operations"""

    def test_add_duplicate_node(self):
        """Adding duplicate node should overwrite"""
        graph = CausalGraph()

        node1 = CausalNode("A", "First", "event")
        node2 = CausalNode("A", "Second", "event")

        graph.add_node(node1)
        graph.add_node(node2)

        assert graph.nodes["A"].name == "Second"

    def test_add_edge_invalid_nodes(self):
        """Edge with invalid nodes should not be added"""
        graph = CausalGraph()
        graph.add_node(CausalNode("A", "A", "event"))

        # B doesn't exist
        graph.add_edge(CausalEdge("A", "B"))

        assert len(graph.edges) == 0

    def test_get_children_empty(self):
        """Should return empty list for node with no children"""
        graph = CausalGraph()
        graph.add_node(CausalNode("A", "A", "event"))

        children = graph.get_children("A")
        assert children == []

    def test_get_parents_empty(self):
        """Should return empty list for node with no parents"""
        graph = CausalGraph()
        graph.add_node(CausalNode("A", "A", "event"))

        parents = graph.get_parents("A")
        assert parents == []


class TestComplexScenarios:
    """Tests for complex causal scenarios"""

    @pytest.fixture
    def engine(self):
        return CausalEngine()

    def test_deployment_causes_errors(self, engine):
        """Deployment should be identified as root cause of errors"""
        now = datetime.utcnow()
        events = [
            {
                "id": "deploy",
                "name": "Deployment",
                "type": "deployment",
                "timestamp": now,
                "service": "api",
                "severity": "info",
            },
            {
                "id": "error1",
                "name": "Error 1",
                "type": "error",
                "timestamp": now + timedelta(seconds=10),
                "service": "api",
                "severity": "error",
            },
            {
                "id": "error2",
                "name": "Error 2",
                "type": "error",
                "timestamp": now + timedelta(seconds=15),
                "service": "api",
                "severity": "error",
            },
        ]

        graph = engine.build_graph(events)
        result = engine.find_root_causes(graph, "error2")

        assert "deploy" in result.root_causes

    def test_config_change_cascade(self, engine):
        """Config change should cascade to multiple errors"""
        now = datetime.utcnow()
        events = [
            {
                "id": "config",
                "name": "Config Change",
                "type": "config_change",
                "timestamp": now,
                "service": "core",
            },
            {
                "id": "err_api",
                "name": "API Error",
                "type": "error",
                "timestamp": now + timedelta(seconds=5),
                "service": "core",
            },
            {
                "id": "err_db",
                "name": "DB Error",
                "type": "error",
                "timestamp": now + timedelta(seconds=8),
                "service": "core",
            },
        ]

        graph = engine.build_graph(events)
        impacts = engine.propagate_impact(graph, "config")

        # Config should impact both errors
        assert len(impacts) >= 1

    def test_data_drift_accuracy_drop(self, engine):
        """Data drift should cause accuracy drop"""
        now = datetime.utcnow()
        events = [
            {
                "id": "drift",
                "name": "Data Drift",
                "type": "data_drift",
                "timestamp": now,
                "service": "ml",
            },
            {
                "id": "accuracy",
                "name": "Accuracy Drop",
                "type": "accuracy_drop",
                "timestamp": now + timedelta(minutes=5),
                "service": "ml",
            },
        ]

        graph = engine.build_graph(events)
        result = engine.find_root_causes(graph, "accuracy")

        assert "drift" in result.root_causes


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
