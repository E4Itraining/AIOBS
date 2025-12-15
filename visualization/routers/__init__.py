"""AIOBS API Routers"""
from .dashboard import router as dashboard_router
from .metrics import router as metrics_router
from .profiles import router as profiles_router

__all__ = ["dashboard_router", "metrics_router", "profiles_router"]
