"""
AIOBS Internationalization (i18n) Module
Provides multilingual support for the visualization platform
"""

from .middleware import I18nMiddleware, get_current_language
from .translations import SUPPORTED_LANGUAGES, TranslationManager, get_translator

__all__ = [
    "TranslationManager",
    "get_translator",
    "SUPPORTED_LANGUAGES",
    "I18nMiddleware",
    "get_current_language",
]
