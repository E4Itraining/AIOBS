"""
AIOBS i18n API Router
Provides language-related API endpoints
"""

from fastapi import APIRouter, Response, Request
from fastapi.responses import JSONResponse

from ..i18n import SUPPORTED_LANGUAGES, get_translator

router = APIRouter(prefix="/api/i18n", tags=["i18n"])


@router.get("/languages")
async def get_languages():
    """
    Get list of supported languages

    Returns:
        List of language objects with code, name, native name, and flag
    """
    languages = [
        {
            'code': code,
            'name': info['name'],
            'native': info['native'],
            'flag': info['flag'],
            'rtl': info['rtl']
        }
        for code, info in SUPPORTED_LANGUAGES.items()
    ]

    return {
        'success': True,
        'data': languages
    }


@router.get("/translations/{lang}")
async def get_translations(lang: str):
    """
    Get all translations for a specific language

    Args:
        lang: Language code (e.g., 'en', 'fr', 'es')

    Returns:
        Translation dictionary for the requested language
    """
    if lang not in SUPPORTED_LANGUAGES:
        return JSONResponse(
            status_code=400,
            content={
                'success': False,
                'error': f'Language {lang} is not supported'
            }
        )

    translator = get_translator()
    translations = translator.get_all(lang)

    return {
        'success': True,
        'data': {
            'language': lang,
            'translations': translations
        }
    }


@router.post("/set-language/{lang}")
async def set_language(lang: str, response: Response):
    """
    Set the preferred language (stores in cookie)

    Args:
        lang: Language code to set

    Returns:
        Success confirmation
    """
    if lang not in SUPPORTED_LANGUAGES:
        return JSONResponse(
            status_code=400,
            content={
                'success': False,
                'error': f'Language {lang} is not supported'
            }
        )

    # Set cookie (expires in 1 year)
    response.set_cookie(
        key='aiobs_lang',
        value=lang,
        max_age=365 * 24 * 60 * 60,  # 1 year
        httponly=False,  # Allow JS access
        samesite='lax'
    )

    return {
        'success': True,
        'data': {
            'language': lang,
            'message': f'Language set to {SUPPORTED_LANGUAGES[lang]["name"]}'
        }
    }


@router.get("/current")
async def get_current_language(request: Request):
    """
    Get the current language based on request context

    Returns:
        Current language code and info
    """
    lang = getattr(request.state, 'language', 'en')

    return {
        'success': True,
        'data': {
            'code': lang,
            **SUPPORTED_LANGUAGES.get(lang, SUPPORTED_LANGUAGES['en'])
        }
    }
