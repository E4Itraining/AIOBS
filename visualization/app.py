"""
AIOBS Visualization Platform
FastAPI Application - Lightweight, Modern, Interactive
"""
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, PlainTextResponse
import os
import time
import psutil

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

# Metrics state for tracking
class MetricsState:
    def __init__(self):
        self.start_time = time.time()
        self.request_count = 0
        self.request_durations: list[float] = []

    def record_request(self, duration: float):
        self.request_count += 1
        self.request_durations.append(duration)
        # Keep only last 1000 samples
        if len(self.request_durations) > 1000:
            self.request_durations.pop(0)

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
    return {
        "status": "healthy",
        "version": APP_VERSION,
        "service": "aiobs-visualization"
    }


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
        metrics_lines.extend([
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
        ])

    return "\n".join(metrics_lines) + "\n"


# ============================================================================
# Entry Point
# ============================================================================

def create_app() -> FastAPI:
    """Factory function for creating the application"""
    return app
