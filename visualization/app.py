"""
AIOBS Visualization Platform
FastAPI Application - Lightweight, Modern, Interactive
"""

import logging
import os
import time
from collections import deque

# Load .env file for environment variables (optional dependency)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, env vars must be set directly

import psutil
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .i18n import SUPPORTED_LANGUAGES, I18nMiddleware, get_translator
from .i18n.middleware import create_i18n_context
from .routers import (
    assistant_router,
    dashboard_router,
    i18n_router,
    ingestion_router,
    metrics_router,
    monitoring_router,
    profiles_router,
    realtime_router,
    cognitive_router,
    causal_router,
)

# Import new module routers (optional - may fail due to dependencies)
auth_router = None
alerting_router = None
exports_router = None
integrations_router = None

try:
    from .auth.router import router as auth_router
except Exception as e:
    logging.warning(f"Auth module not available: {e}")

try:
    from .alerting.router import router as alerting_router
except Exception as e:
    logging.warning(f"Alerting module not available: {e}")

try:
    from .exports.router import router as exports_router
except Exception as e:
    logging.warning(f"Exports module not available: {e}")

try:
    from .integrations.router import router as integrations_router
except Exception as e:
    logging.warning(f"Integrations module not available: {e}")

from .routers.ingestion import shutdown as ingestion_shutdown
from .routers.ingestion import startup as ingestion_startup
from .routers.realtime import start_background_tasks, stop_background_tasks

# Configure logging
logger = logging.getLogger("aiobs.app")

# Application metadata
APP_TITLE = "AIOBS - AI Observability Hub"
APP_DESCRIPTION = """
## Trust Control Layer for AI Systems

AIOBS provides unified observability for AI systems with:

- **Cognitive Metrics**: Drift, reliability, hallucination detection
- **Causal Analysis**: Root cause analysis, impact assessment
- **Multi-Profile Views**: Adaptive dashboards for tech and non-tech users
- **Unified Monitoring**: Single pane of glass for all AI operations
"""
APP_VERSION = "1.0.0"


# Metrics state for tracking (optimized with deque)
class MetricsState:
    def __init__(self):
        self.start_time = time.time()
        self.request_count = 0
        self.request_durations: deque = deque(maxlen=1000)  # O(1) append/pop

    def record_request(self, duration: float):
        self.request_count += 1
        self.request_durations.append(duration)

    def avg_duration(self) -> float:
        if not self.request_durations:
            return 0.0
        return sum(self.request_durations) / len(self.request_durations)

    def uptime(self) -> float:
        return time.time() - self.start_time


metrics_state = MetricsState()

# Create FastAPI application
app = FastAPI(
    title=APP_TITLE,
    description=APP_DESCRIPTION,
    version=APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS configuration from validated settings
from .config import get_cors_settings

cors_settings = get_cors_settings()
CORS_ORIGINS = cors_settings.origins_list
logger.info(f"CORS configured with {len(CORS_ORIGINS)} origins")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID", "Accept-Language"],
)

# i18n middleware for multilingual support
app.add_middleware(I18nMiddleware)

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Templates
templates_dir = os.path.join(os.path.dirname(__file__), "templates")
templates = Jinja2Templates(directory=templates_dir)

# Include API routers
app.include_router(dashboard_router)
app.include_router(metrics_router)
app.include_router(profiles_router)
app.include_router(i18n_router)
app.include_router(realtime_router)
app.include_router(assistant_router)
app.include_router(ingestion_router)
app.include_router(monitoring_router)

# New feature routers
app.include_router(cognitive_router)
app.include_router(causal_router)

# Optional routers (may not be available due to dependencies)
if auth_router:
    app.include_router(auth_router)
if alerting_router:
    app.include_router(alerting_router)
if exports_router:
    app.include_router(exports_router)
if integrations_router:
    app.include_router(integrations_router)


# =============================================================================
# Application Lifecycle Events
# =============================================================================


@app.on_event("startup")
async def startup_event():
    """Start background tasks and services on application startup"""
    start_background_tasks()
    await ingestion_startup()


@app.on_event("shutdown")
async def shutdown_event():
    """Stop background tasks and services on application shutdown"""
    stop_background_tasks()
    await ingestion_shutdown()


# ============================================================================
# HTML Routes (Server-Side Rendered Pages)
# ============================================================================


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Main dashboard page"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "title": APP_TITLE,
            "version": APP_VERSION,
            "active_page": "dashboard",
            **i18n,
        },
    )


@app.get("/profile/{profile_id}", response_class=HTMLResponse)
async def profile_dashboard(request: Request, profile_id: str):
    """Profile-specific dashboard"""
    i18n = create_i18n_context(request)

    # Profile metadata for enhanced dashboard
    PROFILE_META = {
        "tech_ml_engineer": {
            "name": "ML Engineer",
            "description": "Drift detection, cognitive metrics, reliability analysis et performance ML",
            "color": "#6366f1",
            "icon": "brain",
        },
        "tech_devops": {
            "name": "DevOps Engineer",
            "description": "SLOs/SLIs, latences, uptime et monitoring infrastructure",
            "color": "#3b82f6",
            "icon": "server",
        },
        "tech_data_scientist": {
            "name": "Data Scientist",
            "description": "Data quality, feature analysis, experiments et statistiques",
            "color": "#8b5cf6",
            "icon": "database",
        },
        "business_product": {
            "name": "Product Owner",
            "description": "AI features, user experience, adoption et impact business",
            "color": "#f59e0b",
            "icon": "zap",
        },
        "business_executive": {
            "name": "Executive",
            "description": "KPIs stratégiques, ROI, conformité et vue d'ensemble",
            "color": "#10b981",
            "icon": "briefcase",
        },
        "security_soc": {
            "name": "Security Analyst",
            "description": "Posture sécurité, menaces, incidents et vulnérabilités",
            "color": "#ef4444",
            "icon": "shield-alert",
        },
        "compliance_legal": {
            "name": "Compliance Officer",
            "description": "Conformité réglementaire, audit trail et documentation",
            "color": "#f59e0b",
            "icon": "scale",
        },
        "sustainability_esg": {
            "name": "ESG Manager",
            "description": "Empreinte carbone, consommation énergétique et reporting ESG",
            "color": "#059669",
            "icon": "leaf",
        },
        "governance_dsi": {
            "name": "DSI / CIO",
            "description": "Gouvernance IT stratégique, portefeuille IA, budget et transformation digitale",
            "color": "#6366f1",
            "icon": "landmark",
        },
        "governance_rsi": {
            "name": "RSI / IT Manager",
            "description": "Gestion opérationnelle IT, systèmes IA, projets et ressources équipe",
            "color": "#3b82f6",
            "icon": "settings",
        },
        "privacy_dpo": {
            "name": "Data Protection Officer",
            "description": "Protection des données, GDPR, registre des traitements et droits des personnes",
            "color": "#8b5cf6",
            "icon": "user-check",
        },
        "legal_counsel": {
            "name": "Legal Counsel",
            "description": "Risques juridiques IA, contrats, propriété intellectuelle et veille réglementaire",
            "color": "#0ea5e9",
            "icon": "scale",
        },
    }

    meta = PROFILE_META.get(
        profile_id,
        {
            "name": profile_id.replace("_", " ").title(),
            "description": "Tableau de bord personnalisé",
            "color": "#6366f1",
            "icon": "layout-dashboard",
        },
    )

    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "title": f"{meta['name']} | {APP_TITLE}",
            "profile_id": profile_id,
            "profile_name": meta["name"],
            "profile_description": meta["description"],
            "profile_color": meta["color"],
            "profile_icon": meta["icon"],
            **i18n,
        },
    )


@app.get("/unified", response_class=HTMLResponse)
async def unified_view(request: Request):
    """Unified monitoring view"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "unified.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - {i18n['t']('nav.unified_view')}",
            "active_page": "unified",
            **i18n,
        },
    )


@app.get("/causal", response_class=HTMLResponse)
async def causal_view(request: Request):
    """Causal analysis view"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "causal.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - {i18n['t']('causal.title')}",
            "active_page": "causal",
            **i18n,
        },
    )


@app.get("/impact", response_class=HTMLResponse)
async def impact_view(request: Request):
    """Impact analysis view"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "impact.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - {i18n['t']('causal.impact')}",
            "active_page": "impact",
            **i18n,
        },
    )


@app.get("/executive", response_class=HTMLResponse)
async def executive_view(request: Request):
    """Executive/Business dashboard for non-technical users"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "executive.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Executive Dashboard",
            "active_page": "executive",
            **i18n,
        },
    )


@app.get("/compliance", response_class=HTMLResponse)
async def compliance_view(request: Request):
    """Compliance and governance dashboard"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "compliance.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Compliance & Governance",
            "active_page": "compliance",
            **i18n,
        },
    )


@app.get("/greenops", response_class=HTMLResponse)
async def greenops_view(request: Request):
    """GreenOps sustainability dashboard"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "greenops.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - GreenOps Sustainability",
            "active_page": "greenops",
            **i18n,
        },
    )


@app.get("/finops", response_class=HTMLResponse)
async def finops_view(request: Request):
    """FinOps cost management dashboard"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "finops.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - FinOps Cost Management",
            "active_page": "finops",
            **i18n,
        },
    )


@app.get("/monitoring", response_class=HTMLResponse)
async def monitoring_view(request: Request):
    """Live monitoring dashboard"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "monitoring.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Live Monitoring",
            "active_page": "monitoring",
            **i18n,
        },
    )


@app.get("/security", response_class=HTMLResponse)
async def security_view(request: Request):
    """Security center dashboard"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "security.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Security Center",
            "active_page": "security",
            **i18n,
        },
    )


@app.get("/onboarding", response_class=HTMLResponse)
async def onboarding_view(request: Request):
    """Onboarding flow for new users - persona selection and guided tour"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "onboarding.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Welcome",
            "active_page": "onboarding",
            **i18n,
        },
    )


@app.get("/personas", response_class=HTMLResponse)
async def personas_view(request: Request):
    """Personas hub - select user journey based on role"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "personas.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Parcours Utilisateurs",
            "active_page": "personas",
            **i18n,
        },
    )


@app.get("/global", response_class=HTMLResponse)
async def global_view(request: Request):
    """Global overview dashboard - consolidated view for all personas"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "global.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Vue Globale",
            "active_page": "global",
            **i18n,
        },
    )


@app.get("/dirigeant", response_class=HTMLResponse)
async def dirigeant_view(request: Request):
    """Dirigeant/Business strategic dashboard"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "dirigeant.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Vue Dirigeant",
            "active_page": "dirigeant",
            **i18n,
        },
    )


@app.get("/tech", response_class=HTMLResponse)
async def tech_view(request: Request):
    """Tech (DSI/RSSI) dashboard - IT governance and security"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "tech.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Vue Tech (DSI/RSSI)",
            "active_page": "tech",
            **i18n,
        },
    )


@app.get("/juridique", response_class=HTMLResponse)
async def juridique_view(request: Request):
    """Juridique/Compliance dashboard - EU AI Act, GDPR"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "juridique.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Conformité Juridique",
            "active_page": "juridique",
            **i18n,
        },
    )


@app.get("/financier", response_class=HTMLResponse)
async def financier_view(request: Request):
    """Financier/FinOps dashboard - costs, budgets, ROI"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "financier.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Vue Financier",
            "active_page": "financier",
            **i18n,
        },
    )


# ============================================================================
# New Differentiating Features - Routes
# ============================================================================


@app.get("/guardrails", response_class=HTMLResponse)
async def guardrails_view(request: Request):
    """GenAI Guardrails & Safety Mesh dashboard"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "guardrails.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - GenAI Guardrails",
            "active_page": "guardrails",
            **i18n,
        },
    )


@app.get("/multi-agent", response_class=HTMLResponse)
async def multi_agent_view(request: Request):
    """Multi-Agent Observability Hub dashboard"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "multi-agent.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Multi-Agent Hub",
            "active_page": "multi-agent",
            **i18n,
        },
    )


@app.get("/supply-chain", response_class=HTMLResponse)
async def supply_chain_view(request: Request):
    """AI Supply Chain Security dashboard"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "supply-chain.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - AI Supply Chain",
            "active_page": "supply-chain",
            **i18n,
        },
    )


@app.get("/healing", response_class=HTMLResponse)
async def healing_view(request: Request):
    """Autonomous Healing & Self-Remediation dashboard"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "healing.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Autonomous Healing",
            "active_page": "healing",
            **i18n,
        },
    )


@app.get("/business-intelligence", response_class=HTMLResponse)
async def business_intelligence_view(request: Request):
    """Business Intelligence & ROI dashboard"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "business-intelligence.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Business Intelligence",
            "active_page": "business-intelligence",
            **i18n,
        },
    )


# ============================================================================
# Request tracking middleware
# ============================================================================


@app.middleware("http")
async def track_requests(request: Request, call_next):
    """Track request metrics"""
    start_time = time.time()
    response = await call_next(request)
    duration = (time.time() - start_time) * 1000  # Convert to ms
    metrics_state.record_request(duration)
    return response


# ============================================================================
# Health Check
# ============================================================================


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": APP_VERSION, "service": "aiobs-visualization"}


# ============================================================================
# Prometheus-compatible Metrics Endpoint
# ============================================================================


@app.get("/metrics", response_class=PlainTextResponse)
async def prometheus_metrics():
    """Prometheus-compatible metrics endpoint for VictoriaMetrics scraping"""
    try:
        process = psutil.Process()
        memory_info = process.memory_info()
        cpu_percent = process.cpu_percent()
    except Exception:
        memory_info = None
        cpu_percent = 0.0

    metrics_lines = [
        "# HELP aiobs_visualization_info Visualization service information",
        "# TYPE aiobs_visualization_info gauge",
        f'aiobs_visualization_info{{version="{APP_VERSION}",service="aiobs-visualization"}} 1',
        "",
        "# HELP aiobs_visualization_uptime_seconds Visualization uptime in seconds",
        "# TYPE aiobs_visualization_uptime_seconds counter",
        f"aiobs_visualization_uptime_seconds {metrics_state.uptime():.2f}",
        "",
        "# HELP aiobs_visualization_requests_total Total number of HTTP requests",
        "# TYPE aiobs_visualization_requests_total counter",
        f"aiobs_visualization_requests_total {metrics_state.request_count}",
        "",
        "# HELP aiobs_visualization_request_duration_ms Average request duration in milliseconds",
        "# TYPE aiobs_visualization_request_duration_ms gauge",
        f"aiobs_visualization_request_duration_ms {metrics_state.avg_duration():.2f}",
    ]

    if memory_info:
        metrics_lines.extend(
            [
                "",
                "# HELP aiobs_visualization_memory_rss_bytes Resident set size",
                "# TYPE aiobs_visualization_memory_rss_bytes gauge",
                f"aiobs_visualization_memory_rss_bytes {memory_info.rss}",
                "",
                "# HELP aiobs_visualization_memory_vms_bytes Virtual memory size",
                "# TYPE aiobs_visualization_memory_vms_bytes gauge",
                f"aiobs_visualization_memory_vms_bytes {memory_info.vms}",
                "",
                "# HELP aiobs_visualization_cpu_percent CPU usage percentage",
                "# TYPE aiobs_visualization_cpu_percent gauge",
                f"aiobs_visualization_cpu_percent {cpu_percent:.2f}",
            ]
        )

    return "\n".join(metrics_lines) + "\n"


# ============================================================================
# Entry Point
# ============================================================================


def create_app() -> FastAPI:
    """Factory function for creating the application"""
    return app
