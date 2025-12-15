"""
AIOBS Visualization Platform
FastAPI Application - Lightweight, Modern, Interactive
"""
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import os

from .routers import (
    dashboard_router, metrics_router, profiles_router, i18n_router,
    realtime_router, assistant_router, ingestion_router
)
from .i18n import I18nMiddleware, SUPPORTED_LANGUAGES, get_translator
from .i18n.middleware import create_i18n_context
from .routers.realtime import start_background_tasks, stop_background_tasks
from .routers.ingestion import startup as ingestion_startup, shutdown as ingestion_shutdown

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

# Create FastAPI application
app = FastAPI(
    title=APP_TITLE,
    description=APP_DESCRIPTION,
    version=APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
            **i18n
        }
    )


@app.get("/profile/{profile_id}", response_class=HTMLResponse)
async def profile_dashboard(request: Request, profile_id: str):
    """Profile-specific dashboard"""
    i18n = create_i18n_context(request)
    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "title": APP_TITLE,
            "profile_id": profile_id,
            **i18n
        }
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
            **i18n
        }
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
            **i18n
        }
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
            **i18n
        }
    )


# ============================================================================
# Health Check
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": APP_VERSION,
        "service": "aiobs-visualization"
    }


# ============================================================================
# Entry Point
# ============================================================================

def create_app() -> FastAPI:
    """Factory function for creating the application"""
    return app
