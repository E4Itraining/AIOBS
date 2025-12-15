"""AIOBS API Routers"""
from .dashboard import router as dashboard_router
from .metrics import router as metrics_router
from .profiles import router as profiles_router
from .i18n import router as i18n_router
from .realtime import router as realtime_router
from .assistant import router as assistant_router
from .ingestion import router as ingestion_router
from .monitoring import router as monitoring_router
from .federated import router as federated_router

__all__ = [
    "dashboard_router",
    "metrics_router",
    "profiles_router",
    "i18n_router",
    "realtime_router",
    "assistant_router",
    "ingestion_router",
    "monitoring_router",
    "federated_router"
]
