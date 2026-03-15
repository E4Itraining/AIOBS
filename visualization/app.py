"""
AIOBS Visualization Platform
FastAPI Application - Lightweight, Modern, Interactive
"""

import logging
import os
import time
from collections import deque
from pathlib import Path

# Load .env file for environment variables
from dotenv import load_dotenv
load_dotenv()

import psutil
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, PlainTextResponse, RedirectResponse
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
    defense_soc_router,
    pillars_router,
    llm_testing_router,
    llm_config_router,
    design_config_router,
    guardrails_router,
    healing_router,
    business_intelligence_router,
    multi_agent_router,
    supply_chain_router,
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
from .services.pillar_simulator import run_simulator_loop

# Configure logging
logger = logging.getLogger("aiobs.app")

# Application metadata
APP_TITLE = "SKOPHIA - Cyberdéfense IA Souveraine"
APP_DESCRIPTION = """
## Plateforme de Supervision IA - Ministère des Armées

SKOPHIA fournit une supervision souveraine des systèmes d'IA pour la Défense :

- **Détection de menaces IA** : Drift, adversarial, injection de prompts
- **Corrélation IT/OT** : Chaînes causales, analyse d'impact opérationnel
- **Conformité LPM/AI Act** : Homologation, traçabilité, classification DR/CD
- **Supervision SOC Défense** : Vue unifiée COMCYBER, alertes sémantiques MITRE
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
app.include_router(pillars_router)
app.include_router(llm_testing_router)
app.include_router(llm_config_router)
app.include_router(design_config_router)
app.include_router(defense_soc_router)

# New differentiating feature routers
app.include_router(guardrails_router)
app.include_router(healing_router)
app.include_router(business_intelligence_router)
app.include_router(multi_agent_router)
app.include_router(supply_chain_router)

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
    # Ensure data directory exists for configuration persistence
    data_dir = Path(__file__).resolve().parent.parent / "data"
    try:
        data_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Data directory ensured at: {data_dir}")
    except Exception as e:
        logger.error(f"Failed to create data directory: {e}")

    start_background_tasks()
    await ingestion_startup()

    # Start pillar simulator background loop (ticks every 2s)
    import asyncio
    asyncio.create_task(run_simulator_loop())


@app.on_event("shutdown")
async def shutdown_event():
    """Stop background tasks and services on application shutdown"""
    stop_background_tasks()
    await ingestion_shutdown()


# ============================================================================
# HTML Routes (Server-Side Rendered Pages)
# ============================================================================


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Home page - Simplified hub as funnel entry point"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "hub.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Centre Opérationnel",
            "active_page": "hub",
            **i18n,
        },
    )


@app.get("/welcome", response_class=HTMLResponse)
async def welcome(request: Request):
    """Welcome page - Persona selection"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "welcome.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Bienvenue",
            "active_page": "welcome",
            **i18n,
        },
    )


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
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
        "defense_soc": {
            "name": "Commandant SOC Défense",
            "description": "Alertes sémantiques, corrélation IT/OT, MITRE ATT&CK/ICS, supervision COMCYBER",
            "color": "#1e3a5f",
            "icon": "shield",
        },
        "officier_cyber": {
            "name": "Officier Cyber",
            "description": "Posture cyberdéfense, menaces IA adverses, incidents et chaînes causales",
            "color": "#8B1A2B",
            "icon": "sword",
        },
        "ossi": {
            "name": "OSSI / RSSI Défense",
            "description": "Homologation, classification DR/CD, conformité LPM et IGI 1300",
            "color": "#ef4444",
            "icon": "shield-alert",
        },
        "tech_sic": {
            "name": "Officier SIC",
            "description": "Infrastructure SIC, réseaux classifiés, latences et disponibilité systèmes",
            "color": "#3b82f6",
            "icon": "server",
        },
        "tech_ml_engineer": {
            "name": "Ingénieur IA Défense",
            "description": "Drift détection, robustesse adversariale, fiabilité modèles opérationnels",
            "color": "#6366f1",
            "icon": "brain",
        },
        "compliance_legal": {
            "name": "Juriste Défense",
            "description": "Conformité AI Act, LPM, RGPD Défense, homologation et audit",
            "color": "#f59e0b",
            "icon": "scale",
        },
        "etat_major": {
            "name": "État-Major / COMCYBER",
            "description": "Vue stratégique, posture cyber nationale, indicateurs de menace globaux",
            "color": "#10b981",
            "icon": "landmark",
        },
        "dga": {
            "name": "DGA / ANSSI",
            "description": "Évaluation technique, certification, tests adversariaux et benchmarks",
            "color": "#8b5cf6",
            "icon": "flask-conical",
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


@app.get("/unified")
async def unified_view(request: Request):
    """Redirect to global view (merged)"""
    return RedirectResponse(url="/global", status_code=302)


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
            "title": f"{APP_TITLE} - Vue État-Major",
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
            "title": f"{APP_TITLE} - Conformité & Homologation",
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
            "title": f"{APP_TITLE} - Sobriété Numérique",
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
            "title": f"{APP_TITLE} - Ressources & Budget",
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
            "title": f"{APP_TITLE} - Surveillance Opérationnelle",
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
            "title": f"{APP_TITLE} - Cyberdéfense",
            "active_page": "security",
            **i18n,
        },
    )


@app.get("/defense-soc", response_class=HTMLResponse)
async def defense_soc_view(request: Request):
    """Defense SOC dashboard — Commandant SOC Défense profile"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "defense_soc.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Commandant SOC Défense",
            "active_page": "defense-soc",
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


@app.get("/personas")
async def personas_view(request: Request):
    """Redirect to welcome (merged persona selection)"""
    return RedirectResponse(url="/welcome", status_code=302)


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


@app.get("/dirigeant")
async def dirigeant_view(request: Request):
    """Redirect to executive view (merged)"""
    return RedirectResponse(url="/executive", status_code=302)


@app.get("/tech", response_class=HTMLResponse)
async def tech_view(request: Request):
    """Tech (DSI/RSSI) dashboard - IT governance and security"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "tech.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Vue Technique (SIC/SSI)",
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
            "title": f"{APP_TITLE} - Garde-fous IA",
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
            "title": f"{APP_TITLE} - Hub Multi-Agents",
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
            "title": f"{APP_TITLE} - Chaîne d'Approvisionnement IA",
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
            "title": f"{APP_TITLE} - Auto-Remédiation",
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
            "title": f"{APP_TITLE} - Renseignement Opérationnel",
            "active_page": "business-intelligence",
            **i18n,
        },
    )


@app.get("/llm-testing", response_class=HTMLResponse)
async def llm_testing_view(request: Request):
    """LLM Testing Environment - Real-time testing and benchmarking"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "llm-testing.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Banc d'Essai LLM",
            "active_page": "llm-testing",
            **i18n,
        },
    )


@app.get("/settings/llm", response_class=HTMLResponse)
async def settings_llm_view(request: Request):
    """LLM Configuration Settings - Connect your own LLM provider"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "settings_llm.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Configuration LLM",
            "active_page": "settings",
            **i18n,
        },
    )


# ============================================================================
# 5 Pillars Routes - New UX Architecture
# ============================================================================

# Personas configuration for pillars
PILLAR_PERSONAS = [
    {"id": "etat_major", "name": "État-Major", "icon": "landmark"},
    {"id": "defense_soc", "name": "SOC Défense", "icon": "shield"},
    {"id": "officier_cyber", "name": "Officier Cyber", "icon": "sword"},
    {"id": "ossi", "name": "OSSI/RSSI", "icon": "shield-alert"},
    {"id": "tech_ml_engineer", "name": "Ingénieur IA", "icon": "brain"},
    {"id": "compliance_legal", "name": "Juriste", "icon": "scale"},
]


@app.get("/pillars", response_class=HTMLResponse)
async def pillars_home(request: Request):
    """5 Pillars Overview - Main landing page for pillar-based navigation"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "pillars/home.html",
        {
            "request": request,
            "title": "Les 5 Piliers de la Confiance IA",
            "active_pillar": "home",
            "personas": PILLAR_PERSONAS,
            **i18n,
        },
    )


@app.get("/pillars/reliability", response_class=HTMLResponse)
async def pillars_reliability(request: Request):
    """Reliability Pillar - Accuracy, Drift, Quality over time"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "pillars/reliability.html",
        {
            "request": request,
            "title": "Fiabilité - Les 5 Piliers",
            "active_pillar": "reliability",
            "personas": PILLAR_PERSONAS,
            **i18n,
        },
    )


@app.get("/pillars/security", response_class=HTMLResponse)
async def pillars_security(request: Request):
    """Security Pillar - Prompt Injection, Adversarial, Anomaly Detection"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "pillars/security.html",
        {
            "request": request,
            "title": "Sécurité - Les 5 Piliers",
            "active_pillar": "security",
            "personas": PILLAR_PERSONAS,
            **i18n,
        },
    )


@app.get("/pillars/compliance", response_class=HTMLResponse)
async def pillars_compliance(request: Request):
    """Compliance Pillar - Traceability, Versioning, AI Act"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "pillars/compliance.html",
        {
            "request": request,
            "title": "Conformité - Les 5 Piliers",
            "active_pillar": "compliance",
            "personas": PILLAR_PERSONAS,
            **i18n,
        },
    )


@app.get("/pillars/explainability", response_class=HTMLResponse)
async def pillars_explainability(request: Request):
    """Explainability Pillar - Feature Importance, Confidence, Ethics"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "pillars/explainability.html",
        {
            "request": request,
            "title": "Explicabilité - Les 5 Piliers",
            "active_pillar": "explainability",
            "personas": PILLAR_PERSONAS,
            **i18n,
        },
    )


@app.get("/pillars/performance", response_class=HTMLResponse)
async def pillars_performance(request: Request):
    """Performance Pillar - Latency, Cost, GPU, Trade-offs"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "pillars/performance.html",
        {
            "request": request,
            "title": "Performance - Les 5 Piliers",
            "active_pillar": "performance",
            "personas": PILLAR_PERSONAS,
            **i18n,
        },
    )


@app.get("/pillars/ingestion", response_class=HTMLResponse)
async def pillars_ingestion(request: Request):
    """Ingestion & Collection - PCAP, Suricata, Zeek, OTel, Syslog, Modbus"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "pillars/ingestion.html",
        {
            "request": request,
            "title": "Ingestion & Collecte - Modules Défense",
            "active_pillar": "ingestion",
            "personas": PILLAR_PERSONAS,
            **i18n,
        },
    )


@app.get("/pillars/semantic-drift", response_class=HTMLResponse)
async def pillars_semantic_drift(request: Request):
    """Semantic Drift - 6 drift types, tri-layer engine, MITRE mapping"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "pillars/semantic_drift.html",
        {
            "request": request,
            "title": "Dérive Sémantique - Modules Défense",
            "active_pillar": "semantic_drift",
            "personas": PILLAR_PERSONAS,
            **i18n,
        },
    )


@app.get("/pillars/homologation", response_class=HTMLResponse)
async def pillars_homologation(request: Request):
    """Homologation - DSSI, EBIOS RM, Pentest, ANSSI qualification"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "pillars/homologation.html",
        {
            "request": request,
            "title": "Homologation Défense - Modules Défense",
            "active_pillar": "homologation",
            "personas": PILLAR_PERSONAS,
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
    return {"status": "healthy", "version": APP_VERSION, "service": "skophia-defense"}


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
