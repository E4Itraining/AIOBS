"""
AIOBS Visualization Platform
Python-based lightweight visualization for AI Observability

Features:
- Dynamic, interactive dashboards
- Profile-based navigation (tech/non-tech)
- Unified monitoring & observability view
- Causal analysis visualization
- Impact analysis with business metrics
"""

__version__ = "1.0.0"
__author__ = "AIOBS Team"

from .app import app, create_app
from .core import CausalEngine, CognitiveEngine, ImpactAnalyzer, UnifiedObservabilityView

__all__ = [
    "app",
    "create_app",
    "CognitiveEngine",
    "CausalEngine",
    "ImpactAnalyzer",
    "UnifiedObservabilityView",
]
