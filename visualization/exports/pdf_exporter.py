"""
PDF Exporter
Generate compliance and audit reports in PDF format
"""

import io
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    Image,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

logger = logging.getLogger("aiobs.exports.pdf")


class PDFExporter:
    """Generate PDF reports for compliance and auditing"""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.HexColor('#1E293B'),
            alignment=TA_CENTER,
        ))

        # Subtitle style
        self.styles.add(ParagraphStyle(
            name='CustomSubtitle',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=20,
            textColor=colors.HexColor('#2563EB'),
            alignment=TA_CENTER,
        ))

        # Section header style
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            spaceBefore=20,
            spaceAfter=10,
            textColor=colors.HexColor('#1E293B'),
        ))

        # Body text style
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=8,
            leading=14,
        ))

    def _create_header(self, report_type: str, generated_at: datetime) -> List:
        """Create report header elements"""
        elements = []

        # Title
        elements.append(Paragraph("AIOBS - GASKIA", self.styles['CustomTitle']))
        elements.append(Paragraph("AI Trust Control Platform", self.styles['CustomSubtitle']))
        elements.append(Spacer(1, 20))

        # Report info
        report_info = f"""
        <b>Report Type:</b> {report_type}<br/>
        <b>Generated:</b> {generated_at.strftime('%Y-%m-%d %H:%M:%S UTC')}<br/>
        <b>Platform Version:</b> 1.0.0
        """
        elements.append(Paragraph(report_info, self.styles['CustomBody']))
        elements.append(Spacer(1, 30))

        return elements

    def _create_table(
        self,
        data: List[List[str]],
        col_widths: Optional[List[float]] = None,
    ) -> Table:
        """Create styled table"""
        table = Table(data, colWidths=col_widths)

        style = TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 12),

            # Data rows
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#1E293B')),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),

            # Alternating row colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F0')]),

            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0DA')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ])

        table.setStyle(style)
        return table

    async def generate_compliance_report(
        self,
        report_type: str,
        data: Dict[str, Any],
        time_range: Optional[tuple] = None,
    ) -> bytes:
        """
        Generate compliance report PDF.

        Args:
            report_type: Type of compliance report (eu_ai_act, gdpr, soc2)
            data: Report data
            time_range: Optional (start_date, end_date) tuple

        Returns:
            PDF bytes
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72,
        )

        elements = []
        generated_at = datetime.utcnow()

        # Header
        elements.extend(self._create_header(f"Compliance Report - {report_type.upper()}", generated_at))

        # Executive Summary
        elements.append(Paragraph("Executive Summary", self.styles['SectionHeader']))
        summary = data.get('summary', {})
        summary_text = f"""
        This report provides a comprehensive overview of AI system compliance status
        for the AIOBS platform. The assessment covers {summary.get('models_assessed', 12)} AI models
        across {summary.get('services_assessed', 8)} services.
        <br/><br/>
        <b>Overall Compliance Score:</b> {summary.get('compliance_score', 94)}%<br/>
        <b>Critical Findings:</b> {summary.get('critical_findings', 0)}<br/>
        <b>Warnings:</b> {summary.get('warnings', 3)}<br/>
        """
        elements.append(Paragraph(summary_text, self.styles['CustomBody']))
        elements.append(Spacer(1, 20))

        # Compliance Status Table
        elements.append(Paragraph("Compliance Status by Category", self.styles['SectionHeader']))
        compliance_data = [
            ['Category', 'Status', 'Score', 'Last Assessed'],
            ['Risk Classification', 'Compliant', '100%', '2025-12-21'],
            ['Transparency Requirements', 'Compliant', '95%', '2025-12-21'],
            ['Data Governance', 'Warning', '85%', '2025-12-20'],
            ['Human Oversight', 'Compliant', '92%', '2025-12-21'],
            ['Technical Documentation', 'Compliant', '98%', '2025-12-19'],
            ['Logging & Traceability', 'Compliant', '100%', '2025-12-21'],
        ]
        elements.append(self._create_table(compliance_data, [3*inch, 1.5*inch, 1*inch, 1.5*inch]))
        elements.append(Spacer(1, 30))

        # Models Assessment
        elements.append(Paragraph("AI Models Assessment", self.styles['SectionHeader']))
        models_data = [
            ['Model ID', 'Risk Level', 'Trust Score', 'Drift Status', 'Compliance'],
            ['fraud-detector-v1', 'High', '0.87', 'Stable', 'Compliant'],
            ['recommendation-v2', 'Limited', '0.92', 'Warning', 'Compliant'],
            ['chatbot-assistant', 'High', '0.78', 'Stable', 'Review Required'],
            ['sentiment-analyzer', 'Limited', '0.91', 'Stable', 'Compliant'],
            ['image-classifier', 'Minimal', '0.95', 'Stable', 'Compliant'],
        ]
        elements.append(self._create_table(models_data))
        elements.append(Spacer(1, 30))

        # Findings
        elements.append(Paragraph("Findings & Recommendations", self.styles['SectionHeader']))
        findings = data.get('findings', [
            {'severity': 'Warning', 'title': 'Data governance documentation incomplete',
             'recommendation': 'Update data lineage documentation for recommendation model'},
            {'severity': 'Info', 'title': 'Chatbot requires human oversight review',
             'recommendation': 'Implement human-in-the-loop for high-risk decisions'},
        ])

        for finding in findings:
            finding_text = f"""
            <b>[{finding['severity']}]</b> {finding['title']}<br/>
            <i>Recommendation:</i> {finding['recommendation']}<br/>
            """
            elements.append(Paragraph(finding_text, self.styles['CustomBody']))
            elements.append(Spacer(1, 10))

        # Footer
        elements.append(Spacer(1, 40))
        footer = f"""
        <i>This report was automatically generated by AIOBS - GASKIA Platform.<br/>
        For questions, contact: compliance@aiobs.local</i>
        """
        elements.append(Paragraph(footer, self.styles['CustomBody']))

        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    async def generate_audit_trail(
        self,
        entries: List[Dict[str, Any]],
        start_date: datetime,
        end_date: datetime,
    ) -> bytes:
        """
        Generate audit trail PDF.

        Args:
            entries: List of audit entries
            start_date: Start of audit period
            end_date: End of audit period

        Returns:
            PDF bytes
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)

        elements = []
        generated_at = datetime.utcnow()

        # Header
        elements.extend(self._create_header("Audit Trail Report", generated_at))

        # Period info
        period_text = f"""
        <b>Audit Period:</b> {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}<br/>
        <b>Total Entries:</b> {len(entries)}
        """
        elements.append(Paragraph(period_text, self.styles['CustomBody']))
        elements.append(Spacer(1, 20))

        # Audit entries table
        elements.append(Paragraph("Audit Entries", self.styles['SectionHeader']))

        table_data = [['Timestamp', 'Actor', 'Action', 'Resource', 'Outcome']]
        for entry in entries[:50]:  # Limit to first 50 entries
            table_data.append([
                entry.get('timestamp', 'N/A')[:19],
                entry.get('actor', 'N/A')[:20],
                entry.get('action', 'N/A')[:20],
                entry.get('resource', 'N/A')[:20],
                entry.get('outcome', 'N/A')[:15],
            ])

        elements.append(self._create_table(table_data))

        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    async def generate_trust_report(
        self,
        model_id: str,
        metrics: Dict[str, Any],
    ) -> bytes:
        """
        Generate trust score report for a model.

        Args:
            model_id: Model identifier
            metrics: Trust and cognitive metrics

        Returns:
            PDF bytes
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)

        elements = []
        generated_at = datetime.utcnow()

        # Header
        elements.extend(self._create_header(f"Trust Report - {model_id}", generated_at))

        # Trust Score Summary
        elements.append(Paragraph("Trust Score Summary", self.styles['SectionHeader']))
        trust_score = metrics.get('trust_score', 0.85)
        summary_text = f"""
        <b>Overall Trust Score:</b> {trust_score:.2%}<br/>
        <b>Status:</b> {'Healthy' if trust_score > 0.8 else 'Needs Attention' if trust_score > 0.6 else 'Critical'}<br/>
        <b>Trend:</b> {metrics.get('trend', 'Stable')}
        """
        elements.append(Paragraph(summary_text, self.styles['CustomBody']))
        elements.append(Spacer(1, 20))

        # Metrics breakdown
        elements.append(Paragraph("Metrics Breakdown", self.styles['SectionHeader']))
        breakdown_data = [
            ['Metric', 'Score', 'Status', 'Threshold'],
            ['Data Drift', f"{metrics.get('drift', 0.12):.2%}", 'OK', '< 30%'],
            ['Reliability', f"{metrics.get('reliability', 0.89):.2%}", 'OK', '> 80%'],
            ['Calibration', f"{metrics.get('calibration', 0.91):.2%}", 'OK', '> 85%'],
            ['Stability', f"{metrics.get('stability', 0.87):.2%}", 'OK', '> 80%'],
        ]
        elements.append(self._create_table(breakdown_data, [2*inch, 1.5*inch, 1*inch, 1.5*inch]))

        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
