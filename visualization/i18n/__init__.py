"""
AIOBS Internationalization (i18n) Module
Provides multilingual support for the visualization platform
"""

from .translations import TranslationManager, get_translator, SUPPORTED_LANGUAGES
from .middleware import I18nMiddleware, get_current_language

__all__ = [
    'TranslationManager',
    'get_translator',
    'SUPPORTED_LANGUAGES',
    'I18nMiddleware',
    'get_current_language'
]
