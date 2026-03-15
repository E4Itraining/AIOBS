"""AIOBS API Routers"""

from .assistant import router as assistant_router
from .dashboard import router as dashboard_router
from .i18n import router as i18n_router
from .ingestion import router as ingestion_router
from .metrics import router as metrics_router
from .monitoring import router as monitoring_router
from .profiles import router as profiles_router
from .realtime import router as realtime_router

# Feature routers
from .cognitive import router as cognitive_router
from .causal import router as causal_router
from .defense_soc import router as defense_soc_router
from .pillars import router as pillars_router
from .llm_testing import router as llm_testing_router
from .llm_config import router as llm_config_router
from .design_config import router as design_config_router

# New differentiating feature routers
from .guardrails import router as guardrails_router
from .healing import router as healing_router
from .business_intelligence import router as business_intelligence_router
from .multi_agent import router as multi_agent_router
from .supply_chain import router as supply_chain_router

__all__ = [
    "dashboard_router",
    "metrics_router",
    "profiles_router",
    "i18n_router",
    "realtime_router",
    "assistant_router",
    "ingestion_router",
    "monitoring_router",
    # Feature routers
    "cognitive_router",
    "causal_router",
    "defense_soc_router",
    "pillars_router",
    "llm_testing_router",
    "llm_config_router",
    "design_config_router",
    # New differentiating feature routers
    "guardrails_router",
    "healing_router",
    "business_intelligence_router",
    "multi_agent_router",
    "supply_chain_router",
]
