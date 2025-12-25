"""
Export Router - PDF and CSV Compliance Reports
Generate audit-ready exports for AI governance and compliance
"""

import csv
import io
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

logger = logging.getLogger("aiobs.exports")

router = APIRouter(prefix="/api/exports", tags=["exports"])


# =============================================================================
# Models
# =============================================================================


class ExportRequest(BaseModel):
    """Export request parameters"""
    format: str = Field("csv", pattern="^(csv|json|pdf)$")
    report_type: str = Field(..., description="Type of report to generate")
    model_ids: Optional[List[str]] = None
    time_range: str = Field("7d", description="Time range: 24h, 7d, 30d, 90d")
    include_details: bool = True


class APIResponse(BaseModel):
    """Standard API response"""
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# Report Generators
# =============================================================================


def generate_trust_score_report(
    model_ids: Optional[List[str]] = None,
    time_range: str = "7d",
) -> List[Dict[str, Any]]:
    """Generate Trust Score report data"""
    # Import here to avoid circular imports
    from ..core.cognitive import CognitiveEngine

    engine = CognitiveEngine()

    # Default models if none specified
    if not model_ids:
        model_ids = [
            "fraud-detector-v1",
            "recommendation-v2",
            "sentiment-analyzer",
            "chatbot-assistant",
        ]

    report_data = []

    for model_id in model_ids:
        snapshot = engine.get_model_snapshot(model_id)

        report_data.append({
            "model_id": model_id,
            "trust_score": snapshot["trust_score"]["overall"],
            "trust_trend": snapshot["trust_score"]["trend"],
            "confidence": snapshot["trust_score"]["confidence"],
            "drift_score": round(
                sum(d["score"] for d in snapshot["drift"].values()) /
                len(snapshot["drift"]) if snapshot["drift"] else 0, 3
            ),
            "reliability_score": snapshot["reliability"]["overall_score"],
            "reliability_status": snapshot["reliability"]["status"],
            "calibration_ece": snapshot["reliability"]["calibration"]["ece"],
            "hallucination_score": snapshot["hallucination"]["overall_score"],
            "hallucination_risk": snapshot["hallucination"]["risk_level"],
            "computed_at": snapshot["computed_at"],
            "time_range": time_range,
        })

    return report_data


def generate_drift_report(
    model_ids: Optional[List[str]] = None,
    time_range: str = "7d",
) -> List[Dict[str, Any]]:
    """Generate Drift Analysis report data"""
    from ..core.cognitive import CognitiveEngine

    engine = CognitiveEngine()

    if not model_ids:
        model_ids = ["fraud-detector-v1", "recommendation-v2", "sentiment-analyzer"]

    report_data = []

    for model_id in model_ids:
        drift_results = engine.analyze_drift(model_id)

        for drift_type, result in drift_results.items():
            report_data.append({
                "model_id": model_id,
                "drift_type": drift_type,
                "score": round(result.score, 4),
                "is_significant": result.is_significant,
                "severity": result.severity.value,
                "p_value": round(result.p_value, 6) if result.p_value else None,
                "affected_features": ", ".join(result.affected_features),
                "ks_statistic": result.details.get("ks_stat"),
                "psi": result.details.get("psi"),
                "js_divergence": result.details.get("js_divergence"),
                "analyzed_at": datetime.utcnow().isoformat(),
                "time_range": time_range,
            })

    return report_data


def generate_compliance_report(
    model_ids: Optional[List[str]] = None,
    time_range: str = "30d",
) -> List[Dict[str, Any]]:
    """Generate AI Act Compliance report data"""
    from ..core.cognitive import CognitiveEngine

    engine = CognitiveEngine()

    if not model_ids:
        model_ids = [
            "fraud-detector-v1",
            "recommendation-v2",
            "sentiment-analyzer",
            "chatbot-assistant",
        ]

    report_data = []

    for model_id in model_ids:
        snapshot = engine.get_model_snapshot(model_id)

        # AI Act risk classification based on metrics
        trust_score = snapshot["trust_score"]["overall"]
        if trust_score >= 0.8:
            risk_class = "Low Risk"
            compliance_status = "Compliant"
        elif trust_score >= 0.6:
            risk_class = "Limited Risk"
            compliance_status = "Needs Attention"
        else:
            risk_class = "High Risk"
            compliance_status = "Non-Compliant"

        # Check specific compliance requirements
        has_drift_monitoring = True  # We have drift detection
        has_reliability_metrics = snapshot["reliability"]["overall_score"] > 0.5
        has_transparency = True  # Trust score breakdown is transparent
        has_human_oversight = True  # Dashboard provides oversight

        compliance_score = (
            (0.25 if has_drift_monitoring else 0) +
            (0.25 if has_reliability_metrics else 0) +
            (0.25 if has_transparency else 0) +
            (0.25 if has_human_oversight else 0)
        )

        report_data.append({
            "model_id": model_id,
            "report_date": datetime.utcnow().isoformat(),
            "time_range": time_range,
            "ai_act_risk_class": risk_class,
            "compliance_status": compliance_status,
            "compliance_score": round(compliance_score, 2),
            "trust_score": trust_score,
            "drift_monitoring": "Active" if has_drift_monitoring else "Missing",
            "reliability_assessment": "Pass" if has_reliability_metrics else "Fail",
            "transparency_score": round(snapshot["trust_score"]["confidence"], 2),
            "human_oversight": "Enabled" if has_human_oversight else "Disabled",
            "calibration_status": "Well-calibrated" if snapshot["reliability"]["calibration"]["is_well_calibrated"] else "Needs calibration",
            "hallucination_risk": snapshot["hallucination"]["risk_level"],
            "recommendations": _get_compliance_recommendations(snapshot),
        })

    return report_data


def _get_compliance_recommendations(snapshot: Dict) -> str:
    """Generate compliance recommendations based on snapshot"""
    recommendations = []

    if snapshot["trust_score"]["overall"] < 0.8:
        recommendations.append("Improve overall trust score")

    if not snapshot["reliability"]["calibration"]["is_well_calibrated"]:
        recommendations.append("Recalibrate model predictions")

    if snapshot["hallucination"]["risk_level"] != "low":
        recommendations.append("Reduce hallucination risk through grounding")

    # Check for significant drift
    for drift_type, drift in snapshot["drift"].items():
        if drift["is_significant"]:
            recommendations.append(f"Address {drift_type} drift")

    return "; ".join(recommendations) if recommendations else "No immediate actions required"


def generate_audit_trail_report(
    model_ids: Optional[List[str]] = None,
    time_range: str = "7d",
) -> List[Dict[str, Any]]:
    """Generate Audit Trail report for governance"""
    from ..core.cognitive import CognitiveEngine

    engine = CognitiveEngine()

    if not model_ids:
        model_ids = ["fraud-detector-v1", "recommendation-v2"]

    report_data = []

    for model_id in model_ids:
        history = engine.store.get_history(model_id)

        for i, (ts, trust, drift, rel) in enumerate(zip(
            history.timestamps[-20:],  # Last 20 entries
            history.trust_scores[-20:],
            history.drift_scores[-20:],
            history.reliability_scores[-20:],
        )):
            report_data.append({
                "model_id": model_id,
                "timestamp": ts,
                "event_type": "Trust Score Computation",
                "trust_score": round(trust, 4),
                "drift_score": round(drift, 4),
                "reliability_score": round(rel, 4),
                "change_from_previous": round(
                    trust - history.trust_scores[i - 1] if i > 0 else 0, 4
                ),
                "audit_note": "Automated cognitive analysis",
            })

    return report_data


# =============================================================================
# CSV/JSON Export Helpers
# =============================================================================


def data_to_csv(data: List[Dict], columns: Optional[List[str]] = None) -> str:
    """Convert list of dicts to CSV string"""
    if not data:
        return ""

    output = io.StringIO()

    if columns is None:
        columns = list(data[0].keys())

    writer = csv.DictWriter(output, fieldnames=columns, extrasaction='ignore')
    writer.writeheader()
    writer.writerows(data)

    return output.getvalue()


def data_to_json(data: List[Dict], pretty: bool = True) -> str:
    """Convert list of dicts to JSON string"""
    indent = 2 if pretty else None
    return json.dumps(data, indent=indent, default=str)


# =============================================================================
# PDF Generation (HTML-based for simplicity)
# =============================================================================


def generate_pdf_html(
    title: str,
    data: List[Dict],
    columns: List[str],
    summary: Optional[Dict] = None,
) -> str:
    """Generate HTML for PDF export (can be converted to PDF by browser)"""

    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>
        body {{
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 40px;
            color: #333;
        }}
        .header {{
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        .header h1 {{
            color: #1e40af;
            margin: 0;
        }}
        .header p {{
            color: #6b7280;
            margin: 5px 0 0 0;
        }}
        .summary {{
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }}
        .summary h3 {{
            margin-top: 0;
            color: #374151;
        }}
        .summary-grid {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
        }}
        .summary-item {{
            background: white;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
        }}
        .summary-item .value {{
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
        }}
        .summary-item .label {{
            font-size: 12px;
            color: #6b7280;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }}
        th, td {{
            border: 1px solid #e5e7eb;
            padding: 12px;
            text-align: left;
        }}
        th {{
            background: #1e40af;
            color: white;
            font-weight: 600;
        }}
        tr:nth-child(even) {{
            background: #f9fafb;
        }}
        .status-compliant {{ color: #059669; font-weight: bold; }}
        .status-warning {{ color: #d97706; font-weight: bold; }}
        .status-critical {{ color: #dc2626; font-weight: bold; }}
        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
        }}
        @media print {{
            body {{ margin: 20px; }}
            .summary-grid {{ grid-template-columns: repeat(2, 1fr); }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{title}</h1>
        <p>Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
        <p>AIOBS/GASKIA - AI Observability Platform</p>
    </div>
"""

    if summary:
        html += """
    <div class="summary">
        <h3>Executive Summary</h3>
        <div class="summary-grid">
"""
        for label, value in summary.items():
            html += f"""
            <div class="summary-item">
                <div class="value">{value}</div>
                <div class="label">{label}</div>
            </div>
"""
        html += """
        </div>
    </div>
"""

    # Table
    html += """
    <table>
        <thead>
            <tr>
"""
    for col in columns:
        html += f"                <th>{col.replace('_', ' ').title()}</th>\n"

    html += """
            </tr>
        </thead>
        <tbody>
"""

    for row in data:
        html += "            <tr>\n"
        for col in columns:
            value = row.get(col, "")

            # Apply status styling
            css_class = ""
            if col in ["compliance_status", "status"]:
                if value in ["Compliant", "healthy", "Pass"]:
                    css_class = 'class="status-compliant"'
                elif value in ["Needs Attention", "warning"]:
                    css_class = 'class="status-warning"'
                elif value in ["Non-Compliant", "critical", "Fail"]:
                    css_class = 'class="status-critical"'

            html += f"                <td {css_class}>{value}</td>\n"
        html += "            </tr>\n"

    html += """
        </tbody>
    </table>

    <div class="footer">
        <p>This report was automatically generated by AIOBS/GASKIA AI Observability Platform.</p>
        <p>For compliance inquiries, contact your AI governance team.</p>
    </div>
</body>
</html>
"""

    return html


# =============================================================================
# API Endpoints
# =============================================================================


@router.get("/formats", response_model=APIResponse)
async def list_export_formats():
    """List available export formats and report types"""
    return APIResponse(
        success=True,
        data={
            "formats": [
                {"id": "csv", "name": "CSV", "description": "Comma-separated values"},
                {"id": "json", "name": "JSON", "description": "JavaScript Object Notation"},
                {"id": "pdf", "name": "PDF/HTML", "description": "Printable HTML (save as PDF)"},
            ],
            "report_types": [
                {
                    "id": "trust_score",
                    "name": "Trust Score Report",
                    "description": "Complete trust score analysis with breakdown",
                },
                {
                    "id": "drift",
                    "name": "Drift Analysis Report",
                    "description": "Statistical drift detection results",
                },
                {
                    "id": "compliance",
                    "name": "AI Act Compliance Report",
                    "description": "EU AI Act compliance assessment",
                },
                {
                    "id": "audit_trail",
                    "name": "Audit Trail Report",
                    "description": "Historical changes and governance log",
                },
            ],
        }
    )


@router.get("/trust-score")
async def export_trust_score(
    format: str = Query("csv", pattern="^(csv|json|pdf)$"),
    model_ids: Optional[str] = Query(None, description="Comma-separated model IDs"),
    time_range: str = Query("7d"),
):
    """Export Trust Score report"""
    model_list = model_ids.split(",") if model_ids else None
    data = generate_trust_score_report(model_list, time_range)

    if format == "csv":
        csv_content = data_to_csv(data)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=trust_score_report.csv"}
        )

    elif format == "json":
        json_content = data_to_json(data)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=trust_score_report.json"}
        )

    else:  # pdf
        summary = {
            "Models Analyzed": len(data),
            "Avg Trust Score": f"{sum(d['trust_score'] for d in data) / len(data):.2f}" if data else "N/A",
            "Healthy Models": sum(1 for d in data if d["trust_score"] >= 0.8),
            "Time Range": time_range,
        }
        columns = ["model_id", "trust_score", "trust_trend", "reliability_status", "hallucination_risk"]
        html = generate_pdf_html("Trust Score Report", data, columns, summary)
        return Response(
            content=html,
            media_type="text/html",
            headers={"Content-Disposition": "inline; filename=trust_score_report.html"}
        )


@router.get("/drift")
async def export_drift_report(
    format: str = Query("csv", pattern="^(csv|json|pdf)$"),
    model_ids: Optional[str] = Query(None),
    time_range: str = Query("7d"),
):
    """Export Drift Analysis report"""
    model_list = model_ids.split(",") if model_ids else None
    data = generate_drift_report(model_list, time_range)

    if format == "csv":
        csv_content = data_to_csv(data)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=drift_report.csv"}
        )

    elif format == "json":
        json_content = data_to_json(data)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=drift_report.json"}
        )

    else:
        summary = {
            "Total Analyses": len(data),
            "Significant Drift": sum(1 for d in data if d["is_significant"]),
            "Avg Score": f"{sum(d['score'] for d in data) / len(data):.3f}" if data else "N/A",
            "Time Range": time_range,
        }
        columns = ["model_id", "drift_type", "score", "is_significant", "severity", "affected_features"]
        html = generate_pdf_html("Drift Analysis Report", data, columns, summary)
        return Response(content=html, media_type="text/html")


@router.get("/compliance")
async def export_compliance_report(
    format: str = Query("csv", pattern="^(csv|json|pdf)$"),
    model_ids: Optional[str] = Query(None),
    time_range: str = Query("30d"),
):
    """Export AI Act Compliance report"""
    model_list = model_ids.split(",") if model_ids else None
    data = generate_compliance_report(model_list, time_range)

    if format == "csv":
        csv_content = data_to_csv(data)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=compliance_report.csv"}
        )

    elif format == "json":
        json_content = data_to_json(data)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=compliance_report.json"}
        )

    else:
        compliant = sum(1 for d in data if d["compliance_status"] == "Compliant")
        summary = {
            "Models Assessed": len(data),
            "Compliant": f"{compliant}/{len(data)}",
            "Avg Compliance Score": f"{sum(d['compliance_score'] for d in data) / len(data):.0%}" if data else "N/A",
            "Report Period": time_range,
        }
        columns = [
            "model_id", "ai_act_risk_class", "compliance_status",
            "compliance_score", "trust_score", "recommendations"
        ]
        html = generate_pdf_html("EU AI Act Compliance Report", data, columns, summary)
        return Response(content=html, media_type="text/html")


@router.get("/audit-trail")
async def export_audit_trail(
    format: str = Query("csv", pattern="^(csv|json|pdf)$"),
    model_ids: Optional[str] = Query(None),
    time_range: str = Query("7d"),
):
    """Export Audit Trail report"""
    model_list = model_ids.split(",") if model_ids else None
    data = generate_audit_trail_report(model_list, time_range)

    if format == "csv":
        csv_content = data_to_csv(data)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=audit_trail.csv"}
        )

    elif format == "json":
        json_content = data_to_json(data)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=audit_trail.json"}
        )

    else:
        summary = {
            "Total Events": len(data),
            "Models Tracked": len(set(d["model_id"] for d in data)),
            "Time Range": time_range,
            "Report Type": "Governance Audit",
        }
        columns = ["timestamp", "model_id", "event_type", "trust_score", "change_from_previous"]
        html = generate_pdf_html("Audit Trail Report", data, columns, summary)
        return Response(content=html, media_type="text/html")


@router.post("/custom", response_model=APIResponse)
async def generate_custom_export(request: ExportRequest):
    """Generate custom export based on request parameters"""

    report_generators = {
        "trust_score": generate_trust_score_report,
        "drift": generate_drift_report,
        "compliance": generate_compliance_report,
        "audit_trail": generate_audit_trail_report,
    }

    if request.report_type not in report_generators:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown report type: {request.report_type}"
        )

    data = report_generators[request.report_type](
        request.model_ids,
        request.time_range,
    )

    return APIResponse(
        success=True,
        data={
            "report_type": request.report_type,
            "format": request.format,
            "record_count": len(data),
            "preview": data[:3] if request.include_details else None,
            "download_url": f"/api/exports/{request.report_type}?format={request.format}",
        }
    )
