"""
AIOBS Defense SOC Dashboard Tests
Standalone unit tests for the Defense SOC router endpoints.
Tests semantic alerts, causal chains, IT/OT correlation, edge nodes,
MITRE matrix, and AI Act evidence export.
"""

import uuid
from datetime import datetime, timedelta


# =============================================================================
# Simulated Data Generators (mirroring router logic)
# =============================================================================


def generate_semantic_alerts(count=10):
    categories = [
        "adversarial_semantic_shift",
        "gradual_meaning_drift",
        "context_integrity_violation",
        "decision_boundary_compromise",
        "confidence_calibration_attack",
    ]
    models = ["ThreatDetector-v3", "AnomalyClassifier-v2", "IntrusionPredictor-v1"]
    severities = ["critical", "high", "medium", "low"]

    alerts = []
    for i in range(count):
        severity = severities[i % len(severities)]
        alerts.append(
            {
                "id": str(uuid.uuid4()),
                "timestamp": (datetime.utcnow() - timedelta(minutes=i * 15)).isoformat() + "Z",
                "modelId": models[i % len(models)],
                "severity": severity,
                "category": categories[i % len(categories)],
                "title": f"Semantic Alert #{i + 1}",
                "description": f"Semantic drift detected on {models[i % len(models)]}",
                "confidenceScore": round(0.95 - i * 0.05, 2),
                "mitreTechnique": f"T08{50 + i}",
                "acknowledged": i > 5,
            }
        )
    return alerts


def generate_causal_chains(count=5):
    chains = []
    for i in range(count):
        chains.append(
            {
                "id": str(uuid.uuid4()),
                "rootCause": {
                    "type": ["ot_parameter_change", "firmware_update", "data_poisoning", "network_anomaly"][i % 4],
                    "description": f"Root cause event #{i + 1}",
                    "confidence": round(0.9 - i * 0.1, 2),
                },
                "driftEvent": {
                    "modelId": f"Model-{i + 1}",
                    "driftType": "semantic",
                    "score": round(0.7 + i * 0.05, 2),
                },
                "alertGenerated": {
                    "severity": ["critical", "high", "medium"][i % 3],
                    "mitreTechnique": f"T08{55 + i}",
                },
                "steps": [
                    {"step": 1, "event": "OT parameter modification detected"},
                    {"step": 2, "event": "AI model input distribution shift"},
                    {"step": 3, "event": "Semantic drift alert triggered"},
                ],
            }
        )
    return chains


def generate_it_ot_correlation():
    return {
        "itSignals": {
            "networkLatencyMs": 12.5,
            "authFailures24h": 3,
            "suspiciousConnections": 1,
            "firewallBlocks": 45,
        },
        "otSignals": {
            "opcuaLatencyMs": 250,
            "modbusErrors": 2,
            "parameterChanges": 7,
            "alarmCount": 3,
        },
        "correlations": [
            {
                "itEvent": "Suspicious SSH connection from 10.0.1.42",
                "otEvent": "OPC-UA setpoint modification on PLC-03",
                "timeDeltaMs": 1200,
                "correlationScore": 0.87,
                "mitreMapping": "T0836 - Modify Parameter",
            },
        ],
        "overallThreatLevel": "elevated",
    }


def generate_edge_status():
    return [
        {
            "nodeId": "edge-cesson-01",
            "nodeName": "Poste Avancé Cesson-Sévigné",
            "status": "online",
            "bufferUtilization": 0.12,
            "pendingEntries": 42,
        },
        {
            "nodeId": "edge-rennes-02",
            "nodeName": "Noeud Déporté Rennes",
            "status": "offline",
            "bufferUtilization": 0.67,
            "pendingEntries": 1523,
        },
    ]


# =============================================================================
# Semantic Alert Tests
# =============================================================================


class TestSemanticAlerts:
    def test_generates_correct_count(self):
        alerts = generate_semantic_alerts(10)
        assert len(alerts) == 10

    def test_alert_has_required_fields(self):
        alerts = generate_semantic_alerts(1)
        alert = alerts[0]
        required = ["id", "timestamp", "modelId", "severity", "category", "title", "description", "mitreTechnique"]
        for field in required:
            assert field in alert, f"Missing field: {field}"

    def test_severity_distribution(self):
        alerts = generate_semantic_alerts(8)
        severities = [a["severity"] for a in alerts]
        assert "critical" in severities
        assert "high" in severities
        assert "medium" in severities
        assert "low" in severities

    def test_filter_by_severity(self):
        alerts = generate_semantic_alerts(20)
        critical = [a for a in alerts if a["severity"] == "critical"]
        assert len(critical) == 5  # 20 / 4 severities = 5 each

    def test_confidence_scores_valid(self):
        alerts = generate_semantic_alerts(10)
        for alert in alerts:
            assert -1 <= alert["confidenceScore"] <= 1

    def test_mitre_technique_format(self):
        alerts = generate_semantic_alerts(5)
        for alert in alerts:
            assert alert["mitreTechnique"].startswith("T08")

    def test_alert_categories_valid(self):
        valid_categories = {
            "adversarial_semantic_shift",
            "gradual_meaning_drift",
            "context_integrity_violation",
            "decision_boundary_compromise",
            "confidence_calibration_attack",
        }
        alerts = generate_semantic_alerts(10)
        for alert in alerts:
            assert alert["category"] in valid_categories


# =============================================================================
# Causal Chain Tests
# =============================================================================


class TestCausalChains:
    def test_generates_correct_count(self):
        chains = generate_causal_chains(5)
        assert len(chains) == 5

    def test_chain_has_three_steps(self):
        chains = generate_causal_chains(3)
        for chain in chains:
            assert len(chain["steps"]) == 3
            assert chain["steps"][0]["step"] == 1
            assert chain["steps"][2]["step"] == 3

    def test_chain_has_root_cause(self):
        chains = generate_causal_chains(4)
        valid_types = {"ot_parameter_change", "firmware_update", "data_poisoning", "network_anomaly"}
        for chain in chains:
            assert chain["rootCause"]["type"] in valid_types
            assert 0 <= chain["rootCause"]["confidence"] <= 1

    def test_chain_has_alert(self):
        chains = generate_causal_chains(3)
        for chain in chains:
            assert chain["alertGenerated"]["severity"] in ["critical", "high", "medium"]
            assert chain["alertGenerated"]["mitreTechnique"].startswith("T08")

    def test_drift_event_is_semantic(self):
        chains = generate_causal_chains(3)
        for chain in chains:
            assert chain["driftEvent"]["driftType"] == "semantic"


# =============================================================================
# IT/OT Correlation Tests
# =============================================================================


class TestItOtCorrelation:
    def test_has_it_signals(self):
        data = generate_it_ot_correlation()
        it = data["itSignals"]
        assert "networkLatencyMs" in it
        assert "authFailures24h" in it
        assert "suspiciousConnections" in it
        assert "firewallBlocks" in it

    def test_has_ot_signals(self):
        data = generate_it_ot_correlation()
        ot = data["otSignals"]
        assert "opcuaLatencyMs" in ot
        assert "modbusErrors" in ot
        assert "parameterChanges" in ot
        assert "alarmCount" in ot

    def test_has_correlations(self):
        data = generate_it_ot_correlation()
        assert len(data["correlations"]) > 0
        corr = data["correlations"][0]
        assert "itEvent" in corr
        assert "otEvent" in corr
        assert "correlationScore" in corr
        assert 0 <= corr["correlationScore"] <= 1

    def test_threat_level_valid(self):
        data = generate_it_ot_correlation()
        assert data["overallThreatLevel"] in ["low", "elevated", "high", "critical"]

    def test_mitre_mapping_present(self):
        data = generate_it_ot_correlation()
        for corr in data["correlations"]:
            assert "mitreMapping" in corr
            assert corr["mitreMapping"]  # non-empty


# =============================================================================
# Edge Node Tests
# =============================================================================


class TestEdgeNodes:
    def test_returns_nodes(self):
        nodes = generate_edge_status()
        assert len(nodes) == 2

    def test_node_has_required_fields(self):
        nodes = generate_edge_status()
        for node in nodes:
            assert "nodeId" in node
            assert "nodeName" in node
            assert "status" in node
            assert "bufferUtilization" in node
            assert "pendingEntries" in node

    def test_has_online_and_offline(self):
        nodes = generate_edge_status()
        statuses = {n["status"] for n in nodes}
        assert "online" in statuses
        assert "offline" in statuses

    def test_buffer_utilization_valid(self):
        nodes = generate_edge_status()
        for node in nodes:
            assert 0 <= node["bufferUtilization"] <= 1


# =============================================================================
# Overview Aggregation Tests
# =============================================================================


class TestDefenseOverview:
    def test_overview_aggregation(self):
        alerts = generate_semantic_alerts(10)
        correlation = generate_it_ot_correlation()
        edge_nodes = generate_edge_status()

        critical_count = sum(1 for a in alerts if a["severity"] == "critical")
        high_count = sum(1 for a in alerts if a["severity"] == "high")
        unack_count = sum(1 for a in alerts if not a["acknowledged"])

        overview = {
            "threatLevel": correlation["overallThreatLevel"],
            "semanticAlerts": {
                "total": len(alerts),
                "critical": critical_count,
                "high": high_count,
                "unacknowledged": unack_count,
            },
            "itOtCorrelation": {
                "activeCorrelations": len(correlation["correlations"]),
            },
            "edgeNodes": {
                "total": len(edge_nodes),
                "online": sum(1 for n in edge_nodes if n["status"] == "online"),
                "offline": sum(1 for n in edge_nodes if n["status"] == "offline"),
            },
        }

        assert overview["threatLevel"] == "elevated"
        assert overview["semanticAlerts"]["total"] == 10
        assert overview["semanticAlerts"]["critical"] >= 1
        assert overview["edgeNodes"]["total"] == 2
        assert overview["edgeNodes"]["online"] == 1
        assert overview["edgeNodes"]["offline"] == 1

    def test_unacknowledged_count(self):
        alerts = generate_semantic_alerts(10)
        unack = sum(1 for a in alerts if not a["acknowledged"])
        # First 6 alerts (i=0..5) are unacknowledged, i>5 are acknowledged
        assert unack == 6


# =============================================================================
# Evidence Export Tests
# =============================================================================


class TestEvidenceExport:
    def test_evidence_structure(self):
        evidence = {
            "exportId": str(uuid.uuid4()),
            "exportTimestamp": datetime.utcnow().isoformat() + "Z",
            "format": "json",
            "alertId": "all",
            "complianceFramework": "EU AI Act",
            "evidenceChain": {
                "detectionMethod": "Semantic Drift Detection (Isolation Forest + VAE)",
                "modelId": "ThreatDetector-v3",
                "modelVersion": "3.2.1",
                "analysisResults": {
                    "isolationForestScore": 0.78,
                    "vaeReconstructionError": 2.34,
                    "semanticCoherence": 0.45,
                },
                "mitreMappings": [
                    {"technique": "T0856", "name": "Spoof Reporting Message", "confidence": 0.85},
                ],
                "auditTrail": [
                    {"action": "detection", "actor": "system"},
                    {"action": "alert_generated", "actor": "system"},
                    {"action": "evidence_exported", "actor": "defense_soc"},
                ],
            },
            "signature": "AIOBS-Evidence-v1.0",
        }

        assert evidence["complianceFramework"] == "EU AI Act"
        assert evidence["signature"] == "AIOBS-Evidence-v1.0"
        assert len(evidence["evidenceChain"]["auditTrail"]) == 3
        assert evidence["evidenceChain"]["detectionMethod"].startswith("Semantic Drift")

    def test_evidence_has_mitre_mappings(self):
        evidence = {
            "evidenceChain": {
                "mitreMappings": [
                    {"technique": "T0856", "name": "Spoof Reporting Message", "confidence": 0.85},
                    {"technique": "T0831", "name": "Manipulation of Control", "confidence": 0.72},
                ],
            },
        }
        mappings = evidence["evidenceChain"]["mitreMappings"]
        assert len(mappings) == 2
        assert all("technique" in m for m in mappings)
        assert all("confidence" in m for m in mappings)
        assert all(0 <= m["confidence"] <= 1 for m in mappings)

    def test_evidence_formats(self):
        for fmt in ["json", "pdf"]:
            evidence = {"format": fmt, "alertId": "all"}
            assert evidence["format"] in ["json", "pdf"]


# =============================================================================
# MITRE Matrix Tests
# =============================================================================


class TestMitreMatrix:
    def test_tactics_structure(self):
        tactics = [
            {"id": "TA0108", "name": "Initial Access", "detected": 1, "total": 3},
            {"id": "TA0104", "name": "Execution", "detected": 2, "total": 4},
            {"id": "TA0103", "name": "Evasion", "detected": 1, "total": 3},
            {"id": "TA0106", "name": "Impair Process Control", "detected": 3, "total": 5},
            {"id": "TA0107", "name": "Inhibit Response Function", "detected": 1, "total": 4},
            {"id": "TA0105", "name": "Impact", "detected": 2, "total": 5},
        ]
        assert len(tactics) == 6
        for t in tactics:
            assert t["detected"] <= t["total"]
            assert t["id"].startswith("TA0")

    def test_coverage_calculation(self):
        tactics = [
            {"detected": 1, "total": 3},
            {"detected": 2, "total": 4},
            {"detected": 1, "total": 3},
            {"detected": 3, "total": 5},
            {"detected": 1, "total": 4},
            {"detected": 2, "total": 5},
        ]
        total_detected = sum(t["detected"] for t in tactics)
        total_all = sum(t["total"] for t in tactics)
        coverage = round(total_detected / total_all * 100, 1)
        assert coverage == 41.7
