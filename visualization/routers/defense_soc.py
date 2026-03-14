"""
AIOBS Defense SOC Dashboard API Router
Endpoints for the "Commandant SOC Défense" profile.
Centered on semantic alerts, causal inference chains, IT/OT correlation,
and AI Act evidence export.
"""

import json
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from ..models.schemas import APIResponse

router = APIRouter(prefix="/api/defense-soc", tags=["defense-soc"])


# =============================================================================
# Simulated Data (production: backed by AIOBS backend + storage)
# =============================================================================


def _generate_semantic_alerts(count: int = 10):
    """Generate simulated semantic drift alerts for demo."""
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
                "timestamp": (
                    datetime.utcnow() - timedelta(minutes=i * 15)
                ).isoformat()
                + "Z",
                "modelId": models[i % len(models)],
                "severity": severity,
                "category": categories[i % len(categories)],
                "title": f"Semantic Alert #{i + 1}",
                "description": f"Semantic drift detected on {models[i % len(models)]}",
                "confidenceScore": round(0.95 - i * 0.05, 2),
                "detectionSources": ["isolation_forest", "vae_reconstruction"],
                "mitreTechnique": f"T08{50 + i}",
                "acknowledged": i > 5,
                "operationalImpact": {
                    "severity": "mission_critical" if severity == "critical" else "operational",
                    "safetyCritical": severity == "critical",
                    "affectedSystems": [models[i % len(models)]],
                },
            }
        )
    return alerts


def _generate_causal_chains(count: int = 5):
    """Generate simulated causal inference chains."""
    chains = []
    for i in range(count):
        chains.append(
            {
                "id": str(uuid.uuid4()),
                "timestamp": (
                    datetime.utcnow() - timedelta(hours=i * 2)
                ).isoformat()
                + "Z",
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
                    {"step": 1, "event": "OT parameter modification detected", "timestamp": (datetime.utcnow() - timedelta(hours=i * 2 + 1)).isoformat() + "Z"},
                    {"step": 2, "event": "AI model input distribution shift", "timestamp": (datetime.utcnow() - timedelta(hours=i * 2, minutes=30)).isoformat() + "Z"},
                    {"step": 3, "event": "Semantic drift alert triggered", "timestamp": (datetime.utcnow() - timedelta(hours=i * 2)).isoformat() + "Z"},
                ],
            }
        )
    return chains


def _generate_it_ot_correlation():
    """Generate simulated IT/OT correlation data."""
    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
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
            {
                "itEvent": "Unusual DNS query pattern",
                "otEvent": "Modbus register write anomaly",
                "timeDeltaMs": 3500,
                "correlationScore": 0.62,
                "mitreMapping": "T0855 - Unauthorized Command Message",
            },
        ],
        "overallThreatLevel": "elevated",
    }


def _generate_edge_status():
    """Generate simulated edge node status."""
    return [
        {
            "nodeId": "edge-cesson-01",
            "nodeName": "Poste Avancé Cesson-Sévigné",
            "status": "online",
            "lastSync": (datetime.utcnow() - timedelta(minutes=5)).isoformat() + "Z",
            "bufferUtilization": 0.12,
            "pendingEntries": 42,
            "disconnectedDurationMs": 0,
        },
        {
            "nodeId": "edge-rennes-02",
            "nodeName": "Noeud Déporté Rennes",
            "status": "offline",
            "lastSync": (datetime.utcnow() - timedelta(hours=2)).isoformat() + "Z",
            "bufferUtilization": 0.67,
            "pendingEntries": 1523,
            "disconnectedDurationMs": 7200000,
        },
    ]


# =============================================================================
# API Endpoints
# =============================================================================


@router.get("/overview")
async def defense_soc_overview(hours: int = Query(24, ge=1, le=720)) -> APIResponse:
    """
    Defense SOC overview — semantic alerts, threat level, MITRE mapping.
    """
    alerts = _generate_semantic_alerts(10)
    correlation = _generate_it_ot_correlation()
    edge_nodes = _generate_edge_status()

    critical_count = sum(1 for a in alerts if a["severity"] == "critical")
    high_count = sum(1 for a in alerts if a["severity"] == "high")

    return APIResponse(
        success=True,
        data={
            "threatLevel": correlation["overallThreatLevel"],
            "semanticAlerts": {
                "total": len(alerts),
                "critical": critical_count,
                "high": high_count,
                "unacknowledged": sum(1 for a in alerts if not a["acknowledged"]),
            },
            "itOtCorrelation": {
                "activeCorrelations": len(correlation["correlations"]),
                "topCorrelation": correlation["correlations"][0] if correlation["correlations"] else None,
            },
            "edgeNodes": {
                "total": len(edge_nodes),
                "online": sum(1 for n in edge_nodes if n["status"] == "online"),
                "offline": sum(1 for n in edge_nodes if n["status"] == "offline"),
            },
            "mitreCoverage": {
                "tacticsDetected": 4,
                "techniquesMatched": 6,
                "killChainPhase": "actions_on_objectives",
            },
        },
    )


@router.get("/semantic-alerts")
async def get_semantic_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity"),
    limit: int = Query(20, ge=1, le=100),
) -> APIResponse:
    """
    Get semantic drift alerts (not classical MLOps metrics).
    """
    alerts = _generate_semantic_alerts(limit)
    if severity:
        alerts = [a for a in alerts if a["severity"] == severity]

    return APIResponse(success=True, data=alerts)


@router.get("/causal-chains")
async def get_causal_chains(limit: int = Query(10, ge=1, le=50)) -> APIResponse:
    """
    Get causal inference chains: attack → drift → alert.
    """
    chains = _generate_causal_chains(min(limit, 10))
    return APIResponse(success=True, data=chains)


@router.get("/it-ot-correlation")
async def get_it_ot_correlation() -> APIResponse:
    """
    Real-time IT/OT signal correlation.
    """
    return APIResponse(success=True, data=_generate_it_ot_correlation())


@router.get("/edge-nodes")
async def get_edge_nodes() -> APIResponse:
    """
    Edge node status for air-gap deployments.
    """
    return APIResponse(success=True, data=_generate_edge_status())


@router.get("/evidence-export")
async def export_evidence(
    alert_id: Optional[str] = Query(None, description="Export evidence for specific alert"),
    format: str = Query("json", description="Export format: json or pdf"),
) -> JSONResponse:
    """
    Export AI Act compliance evidence package (JSON or PDF metadata).
    """
    evidence = {
        "exportId": str(uuid.uuid4()),
        "exportTimestamp": datetime.utcnow().isoformat() + "Z",
        "format": format,
        "alertId": alert_id or "all",
        "complianceFramework": "EU AI Act",
        "evidenceChain": {
            "detectionMethod": "Semantic Drift Detection (Isolation Forest + VAE)",
            "detectionTimestamp": (datetime.utcnow() - timedelta(hours=1)).isoformat() + "Z",
            "modelId": "ThreatDetector-v3",
            "modelVersion": "3.2.1",
            "modelChecksum": "sha256:a1b2c3d4e5f6...",
            "analysisResults": {
                "isolationForestScore": 0.78,
                "vaeReconstructionError": 2.34,
                "semanticCoherence": 0.45,
                "statisticallyNormal": True,
                "semanticallyShifted": True,
            },
            "mitreMappings": [
                {"technique": "T0856", "name": "Spoof Reporting Message", "confidence": 0.85},
                {"technique": "T0831", "name": "Manipulation of Control", "confidence": 0.72},
            ],
            "auditTrail": [
                {"action": "detection", "timestamp": (datetime.utcnow() - timedelta(hours=1)).isoformat() + "Z", "actor": "system"},
                {"action": "alert_generated", "timestamp": (datetime.utcnow() - timedelta(minutes=55)).isoformat() + "Z", "actor": "system"},
                {"action": "evidence_exported", "timestamp": datetime.utcnow().isoformat() + "Z", "actor": "defense_soc"},
            ],
        },
        "signature": "AIOBS-Evidence-v1.0",
    }

    return JSONResponse(content={"success": True, "data": evidence})


@router.get("/mitre-matrix")
async def get_mitre_matrix() -> APIResponse:
    """
    Get MITRE ATT&CK ICS matrix with current detection coverage.
    """
    tactics = [
        {"id": "TA0108", "name": "Initial Access", "detected": 1, "total": 3},
        {"id": "TA0104", "name": "Execution", "detected": 2, "total": 4},
        {"id": "TA0103", "name": "Evasion", "detected": 1, "total": 3},
        {"id": "TA0106", "name": "Impair Process Control", "detected": 3, "total": 5},
        {"id": "TA0107", "name": "Inhibit Response Function", "detected": 1, "total": 4},
        {"id": "TA0105", "name": "Impact", "detected": 2, "total": 5},
    ]

    return APIResponse(
        success=True,
        data={
            "version": "14.1",
            "tactics": tactics,
            "coveragePercent": round(
                sum(t["detected"] for t in tactics) / sum(t["total"] for t in tactics) * 100, 1
            ),
        },
    )
