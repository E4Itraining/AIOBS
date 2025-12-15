"""
AIOBS i18n Middleware
Handles language detection and context for requests
"""

from typing import Optional
from contextvars import ContextVar
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from .translations import SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, get_translator

# Context variable for current language
_current_language: ContextVar[str] = ContextVar('current_language', default=DEFAULT_LANGUAGE)


def get_current_language() -> str:
    """Get the current language from context"""
    return _current_language.get()


def set_current_language(lang: str) -> None:
    """Set the current language in context"""
    if lang in SUPPORTED_LANGUAGES:
        _current_language.set(lang)
    else:
        _current_language.set(DEFAULT_LANGUAGE)


class I18nMiddleware(BaseHTTPMiddleware):
    """
    Middleware to detect and set the current language for each request

    Language detection priority:
    1. Query parameter (?lang=fr)
    2. Cookie (aiobs_lang)
    3. Accept-Language header
    4. Default language (en)
    """

    async def dispatch(self, request: Request, call_next):
        # Detect language
        lang = self._detect_language(request)

        # Set in context
        set_current_language(lang)

        # Add language info to request state
        request.state.language = lang
        request.state.languages = SUPPORTED_LANGUAGES
        request.state.translator = get_translator()

        # Process request
        response = await call_next(request)

        return response

    def _detect_language(self, request: Request) -> str:
        """Detect the preferred language for the request"""

        # 1. Check query parameter
        lang = request.query_params.get('lang')
        if lang and lang in SUPPORTED_LANGUAGES:
            return lang

        # 2. Check cookie
        lang = request.cookies.get('aiobs_lang')
        if lang and lang in SUPPORTED_LANGUAGES:
            return lang

        # 3. Check Accept-Language header
        accept_lang = request.headers.get('Accept-Language', '')
        lang = self._parse_accept_language(accept_lang)
        if lang:
            return lang

        # 4. Default
        return DEFAULT_LANGUAGE

    def _parse_accept_language(self, header: str) -> Optional[str]:
        """
        Parse Accept-Language header and return best matching language

        Example: "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
        """
        if not header:
            return None

        # Parse language preferences with quality values
        languages = []
        for part in header.split(','):
            part = part.strip()
            if ';' in part:
                lang, q = part.split(';')
                lang = lang.strip()
                try:
                    q = float(q.split('=')[1])
                except (ValueError, IndexError):
                    q = 1.0
            else:
                lang = part
                q = 1.0

            # Extract base language (e.g., 'fr' from 'fr-FR')
            base_lang = lang.split('-')[0].lower()
            languages.append((base_lang, q))

        # Sort by quality value (descending)
        languages.sort(key=lambda x: x[1], reverse=True)

        # Find first matching language
        for lang, _ in languages:
            if lang in SUPPORTED_LANGUAGES:
                return lang

        return None


def create_i18n_context(request: Request) -> dict:
    """
    Create template context with translation functions

    Use in Jinja2 templates:
    {{ t('nav.dashboard') }}
    {{ t('messages.loading') }}
    """
    lang = getattr(request.state, 'language', DEFAULT_LANGUAGE)
    translator = get_translator()

    def t(key: str, **kwargs) -> str:
        """Translate function for templates"""
        return translator.get(key, lang, **kwargs)

    def get_all_translations() -> dict:
        """Get all translations for the current language"""
        return translator.get_all(lang)

    return {
        'lang': lang,
        'languages': SUPPORTED_LANGUAGES,
        'is_rtl': SUPPORTED_LANGUAGES.get(lang, {}).get('rtl', False),
        't': t,
        'translations': get_all_translations()
    }
