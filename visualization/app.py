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

from .routers import dashboard_router, metrics_router, profiles_router

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


# ============================================================================
# HTML Routes (Server-Side Rendered Pages)
# ============================================================================

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Main dashboard page"""
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "title": APP_TITLE,
            "version": APP_VERSION
        }
    )


@app.get("/profile/{profile_id}", response_class=HTMLResponse)
async def profile_dashboard(request: Request, profile_id: str):
    """Profile-specific dashboard"""
    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "title": APP_TITLE,
            "profile_id": profile_id
        }
    )


@app.get("/unified", response_class=HTMLResponse)
async def unified_view(request: Request):
    """Unified monitoring view"""
    return templates.TemplateResponse(
        "unified.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Unified View"
        }
    )


@app.get("/causal", response_class=HTMLResponse)
async def causal_view(request: Request):
    """Causal analysis view"""
    return templates.TemplateResponse(
        "causal.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Causal Analysis"
        }
    )


@app.get("/impact", response_class=HTMLResponse)
async def impact_view(request: Request):
    """Impact analysis view"""
    return templates.TemplateResponse(
        "impact.html",
        {
            "request": request,
            "title": f"{APP_TITLE} - Impact Analysis"
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
