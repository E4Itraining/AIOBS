"""
AIOBS Authentication Module
OAuth2 + JWT authentication with RBAC support
"""

from .config import AuthSettings, get_auth_settings
from .dependencies import get_current_user, require_role, get_optional_user
from .models import User, Token, TokenData, UserRole
from .jwt_handler import create_access_token, create_refresh_token, verify_token

__all__ = [
    "AuthSettings",
    "get_auth_settings",
    "get_current_user",
    "require_role",
    "get_optional_user",
    "User",
    "Token",
    "TokenData",
    "UserRole",
    "create_access_token",
    "create_refresh_token",
    "verify_token",
]
