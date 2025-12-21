"""
Export Router
API endpoints for generating PDF, CSV, and Excel exports
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from .pdf_exporter import PDFExporter
from .csv_exporter import CSVExporter

logger = logging.getLogger("aiobs.exports")

router = APIRouter(prefix="/api/exports", tags=["exports"])

# Initialize exporters
pdf_exporter = PDFExporter()
csv_exporter = CSVExporter()


@router.get("/compliance/{report_type}")
async def export_compliance_report(
    report_type: str,
    format: str = Query("pdf", pattern="^(pdf|csv|xlsx)$"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """
    Export compliance report in specified format.

    Args:
        report_type: Type of report (eu_ai_act, gdpr, soc2, iso27001)
        format: Export format (pdf, csv, xlsx)
        start_date: Optional start date (YYYY-MM-DD)
        end_date: Optional end date (YYYY-MM-DD)
    """
    valid_types = ["eu_ai_act", "gdpr", "soc2", "iso27001"]
    if report_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid report type. Valid types: {valid_types}"
        )

    # Generate demo data
    data = {
        "summary": {
            "models_assessed": 12,
            "services_assessed": 8,
            "compliance_score": 94,
            "critical_findings": 0,
            "warnings": 3,
        },
        "models": [
            {"id": "fraud-detector-v1", "name": "Fraud Detection v1", "risk_level": "High",
             "trust_score": 0.87, "compliance_status": "Compliant", "last_assessed": "2025-12-21"},
            {"id": "recommendation-v2", "name": "Recommendation Engine v2", "risk_level": "Limited",
             "trust_score": 0.92, "compliance_status": "Compliant", "last_assessed": "2025-12-21"},
            {"id": "chatbot-assistant", "name": "ChatBot Assistant", "risk_level": "High",
             "trust_score": 0.78, "compliance_status": "Review Required", "last_assessed": "2025-12-20"},
        ],
        "findings": [
            {"severity": "Warning", "title": "Data governance documentation incomplete",
             "recommendation": "Update data lineage documentation"},
        ],
    }

    if format == "pdf":
        content = await pdf_exporter.generate_compliance_report(report_type, data)
        filename = f"aiobs_compliance_{report_type}_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
        media_type = "application/pdf"
    elif format == "xlsx":
        content = await csv_exporter.export_compliance_data(data, format="xlsx")
        filename = f"aiobs_compliance_{report_type}_{datetime.utcnow().strftime('%Y%m%d')}.xlsx"
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        content = await csv_exporter.export_compliance_data(data, format="csv")
        filename = f"aiobs_compliance_{report_type}_{datetime.utcnow().strftime('%Y%m%d')}.csv"
        media_type = "text/csv"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/audit-trail")
async def export_audit_trail(
    format: str = Query("csv", pattern="^(pdf|csv|xlsx)$"),
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    limit: int = Query(1000, ge=1, le=10000),
):
    """
    Export audit trail for specified date range.
    """
    try:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Generate demo audit entries
    entries = []
    current = start
    while current <= end and len(entries) < limit:
        entries.extend([
            {
                "timestamp": current.isoformat(),
                "actor": "system",
                "action": "model.inference",
                "resource": "fraud-detector-v1",
                "outcome": "success",
                "context": {"latency_ms": 45, "batch_size": 100},
            },
            {
                "timestamp": (current + timedelta(minutes=5)).isoformat(),
                "actor": "admin@aiobs.local",
                "action": "config.update",
                "resource": "alert-thresholds",
                "outcome": "success",
                "context": {"old_value": 0.3, "new_value": 0.25},
            },
        ])
        current += timedelta(hours=1)

    entries = entries[:limit]

    if format == "pdf":
        content = await pdf_exporter.generate_audit_trail(entries, start, end)
        filename = f"aiobs_audit_trail_{start_date}_{end_date}.pdf"
        media_type = "application/pdf"
    elif format == "xlsx":
        content = await csv_exporter.export_audit_trail(entries, format="xlsx")
        filename = f"aiobs_audit_trail_{start_date}_{end_date}.xlsx"
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        content = await csv_exporter.export_audit_trail(entries, format="csv")
        filename = f"aiobs_audit_trail_{start_date}_{end_date}.csv"
        media_type = "text/csv"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/metrics/{model_id}")
async def export_model_metrics(
    model_id: str,
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    metrics: List[str] = Query(default=["all"]),
    hours: int = Query(24, ge=1, le=720),
):
    """
    Export model metrics data.
    """
    # Generate demo metrics
    now = datetime.utcnow()
    data = []

    metric_names = ["trust_score", "drift_score", "latency_p99", "error_rate", "throughput"]

    for i in range(hours):
        timestamp = now - timedelta(hours=i)
        for metric in metric_names:
            if "all" in metrics or metric in metrics:
                data.append({
                    "timestamp": timestamp.isoformat(),
                    "metric_name": metric,
                    "value": round(0.5 + 0.4 * (i % 10) / 10, 3),
                    "labels": f"model={model_id}",
                })

    if format == "xlsx":
        content = await csv_exporter.export_metrics(model_id, data, format="xlsx")
        filename = f"aiobs_metrics_{model_id}_{datetime.utcnow().strftime('%Y%m%d')}.xlsx"
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        content = await csv_exporter.export_metrics(model_id, data, format="csv")
        filename = f"aiobs_metrics_{model_id}_{datetime.utcnow().strftime('%Y%m%d')}.csv"
        media_type = "text/csv"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/trust-report/{model_id}")
async def export_trust_report(
    model_id: str,
    format: str = Query("pdf", pattern="^(pdf)$"),
):
    """
    Export trust score report for a model.
    """
    metrics = {
        "trust_score": 0.87,
        "trend": "Stable",
        "drift": 0.12,
        "reliability": 0.89,
        "calibration": 0.91,
        "stability": 0.87,
    }

    content = await pdf_exporter.generate_trust_report(model_id, metrics)
    filename = f"aiobs_trust_report_{model_id}_{datetime.utcnow().strftime('%Y%m%d')}.pdf"

    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/alerts")
async def export_alerts(
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    severity: Optional[str] = Query(None, pattern="^(critical|warning|info)$"),
    days: int = Query(7, ge=1, le=90),
):
    """
    Export alert history.
    """
    # Generate demo alerts
    alerts = [
        {
            "id": "alert-001",
            "title": "High drift score detected",
            "severity": "warning",
            "type": "drift",
            "status": "resolved",
            "model_id": "fraud-detector-v1",
            "service_id": None,
            "triggered_at": "2025-12-20T10:30:00Z",
            "resolved_at": "2025-12-20T11:15:00Z",
        },
        {
            "id": "alert-002",
            "title": "SLO violation - P99 latency",
            "severity": "critical",
            "type": "slo_violation",
            "status": "resolved",
            "model_id": None,
            "service_id": "recommendation-v2",
            "triggered_at": "2025-12-19T14:22:00Z",
            "resolved_at": "2025-12-19T15:00:00Z",
        },
    ]

    if severity:
        alerts = [a for a in alerts if a["severity"] == severity]

    if format == "xlsx":
        content = await csv_exporter.export_alerts(alerts, format="xlsx")
        filename = f"aiobs_alerts_{datetime.utcnow().strftime('%Y%m%d')}.xlsx"
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        content = await csv_exporter.export_alerts(alerts, format="csv")
        filename = f"aiobs_alerts_{datetime.utcnow().strftime('%Y%m%d')}.csv"
        media_type = "text/csv"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/formats")
async def list_export_formats():
    """
    List available export formats and their capabilities.
    """
    return {
        "formats": [
            {
                "id": "pdf",
                "name": "PDF Document",
                "extension": ".pdf",
                "mime_type": "application/pdf",
                "supports": ["compliance", "audit_trail", "trust_report"],
            },
            {
                "id": "csv",
                "name": "CSV (Comma-Separated Values)",
                "extension": ".csv",
                "mime_type": "text/csv",
                "supports": ["compliance", "audit_trail", "metrics", "alerts"],
            },
            {
                "id": "xlsx",
                "name": "Excel Spreadsheet",
                "extension": ".xlsx",
                "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "supports": ["compliance", "audit_trail", "metrics", "alerts"],
            },
        ],
        "report_types": [
            {"id": "compliance", "name": "Compliance Report", "formats": ["pdf", "csv", "xlsx"]},
            {"id": "audit_trail", "name": "Audit Trail", "formats": ["pdf", "csv", "xlsx"]},
            {"id": "metrics", "name": "Model Metrics", "formats": ["csv", "xlsx"]},
            {"id": "trust_report", "name": "Trust Score Report", "formats": ["pdf"]},
            {"id": "alerts", "name": "Alert History", "formats": ["csv", "xlsx"]},
        ],
    }
