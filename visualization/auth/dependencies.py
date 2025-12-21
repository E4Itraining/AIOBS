"""
Authentication Dependencies
FastAPI dependencies for route protection
"""

import logging
from typing import List, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_auth_settings
from .jwt_handler import get_user_from_token, is_token_revoked, verify_token
from .models import User, UserRole

logger = logging.getLogger("aiobs.auth")

# Security scheme
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> User:
    """
    Get current authenticated user from JWT token.
    Raises 401 if not authenticated.
    """
    settings = get_auth_settings()

    # Check if auth is disabled (dev mode)
    if not settings.auth_enabled:
        # Return a default admin user for development
        return User(
            id="dev-user",
            email="dev@aiobs.local",
            full_name="Development User",
            roles=[UserRole.ADMIN],
            provider="dev",
        )

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    token_data = verify_token(token)

    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if token is revoked
    if token_data.jti and is_token_revoked(token_data.jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_user_from_token(token_data)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[User]:
    """
    Get current user if authenticated, None otherwise.
    Does not raise exception for unauthenticated requests.
    """
    settings = get_auth_settings()

    if not settings.auth_enabled:
        return User(
            id="dev-user",
            email="dev@aiobs.local",
            full_name="Development User",
            roles=[UserRole.ADMIN],
            provider="dev",
        )

    if not credentials:
        if settings.allow_anonymous:
            return None
        return None

    token = credentials.credentials
    token_data = verify_token(token)

    if not token_data:
        return None

    if token_data.jti and is_token_revoked(token_data.jti):
        return None

    return get_user_from_token(token_data)


def require_role(allowed_roles: List[UserRole]):
    """
    Dependency factory for role-based access control.

    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(user: User = Depends(require_role([UserRole.ADMIN]))):
            ...
    """
    async def role_checker(
        user: User = Depends(get_current_user),
    ) -> User:
        # Admin has access to everything
        if UserRole.ADMIN in user.roles:
            return user

        # Check if user has any of the allowed roles
        user_role_values = {r.value if isinstance(r, UserRole) else r for r in user.roles}
        allowed_role_values = {r.value for r in allowed_roles}

        if not user_role_values.intersection(allowed_role_values):
            logger.warning(
                f"Access denied for user {user.email}: "
                f"required roles {allowed_role_values}, has {user_role_values}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {[r.value for r in allowed_roles]}",
            )

        return user

    return role_checker


def require_any_role(*roles: UserRole):
    """Shorthand for require_role with multiple roles"""
    return require_role(list(roles))


# Common role combinations
require_admin = require_role([UserRole.ADMIN])
require_tech = require_role([UserRole.ADMIN, UserRole.ML_ENGINEER, UserRole.DEVOPS, UserRole.DATA_SCIENTIST])
require_business = require_role([UserRole.ADMIN, UserRole.EXECUTIVE, UserRole.PRODUCT_OWNER])
require_compliance = require_role([UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.DPO, UserRole.LEGAL])
require_security = require_role([UserRole.ADMIN, UserRole.SECURITY_ANALYST])
