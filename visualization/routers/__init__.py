"""AIOBS API Routers"""
from .dashboard import router as dashboard_router
from .metrics import router as metrics_router
from .profiles import router as profiles_router
from .i18n import router as i18n_router
from .realtime import router as realtime_router
from .assistant import router as assistant_router

__all__ = [
    "dashboard_router",
    "metrics_router",
    "profiles_router",
    "i18n_router",
    "realtime_router",
    "assistant_router"
]
