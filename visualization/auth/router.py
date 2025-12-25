"""
Authentication Router
Login, logout, OAuth2 callbacks, and token management
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse

from .config import get_auth_settings
from .dependencies import get_current_user
from .jwt_handler import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    revoke_token,
    verify_token,
)
from .models import (
    LoginRequest,
    OAuth2AuthorizeResponse,
    PasswordChangeRequest,
    RefreshTokenRequest,
    Token,
    User,
)

logger = logging.getLogger("aiobs.auth")

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/login", response_model=Token)
async def login(request: LoginRequest):
    """
    Authenticate user with email and password.
    Returns JWT access and refresh tokens.
    """
    settings = get_auth_settings()

    if not settings.local_users_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Local authentication is disabled. Use OAuth2 provider.",
        )

    user = authenticate_user(request.email, request.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(request: RefreshTokenRequest):
    """
    Refresh access token using refresh token.
    """
    settings = get_auth_settings()
    token_data = verify_token(request.refresh_token)

    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Create new user object from token data
    user = User(
        id=token_data.sub,
        email=token_data.email,
        roles=token_data.roles,
        provider="refresh",
    )

    access_token = create_access_token(user)
    new_refresh_token = create_refresh_token(user)

    # Revoke old refresh token
    if token_data.jti:
        revoke_token(token_data.jti)

    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/logout")
async def logout(user: User = Depends(get_current_user)):
    """
    Logout current user (revoke tokens).
    """
    # In a full implementation, we would revoke the current token
    # For now, just log the logout
    logger.info(f"User logged out: {user.email}")

    return {"message": "Successfully logged out", "email": user.email}


@router.get("/me", response_model=User)
async def get_current_user_info(user: User = Depends(get_current_user)):
    """
    Get current authenticated user information.
    """
    return user


@router.get("/providers")
async def get_oauth2_providers():
    """
    Get list of enabled OAuth2 providers.
    """
    settings = get_auth_settings()

    providers = []

    if settings.has_google:
        providers.append({
            "id": "google",
            "name": "Google",
            "icon": "google",
            "authorize_url": "/api/auth/authorize/google",
        })

    if settings.has_azure:
        providers.append({
            "id": "azure",
            "name": "Microsoft Azure AD",
            "icon": "microsoft",
            "authorize_url": "/api/auth/authorize/azure",
        })

    if settings.has_keycloak:
        providers.append({
            "id": "keycloak",
            "name": "Keycloak SSO",
            "icon": "key",
            "authorize_url": "/api/auth/authorize/keycloak",
        })

    return {
        "local_enabled": settings.local_users_enabled,
        "providers": providers,
    }


@router.get("/authorize/{provider}")
async def oauth2_authorize(provider: str, redirect_uri: Optional[str] = Query(None)):
    """
    Initiate OAuth2 authorization flow.
    Redirects to provider's authorization page.
    """
    settings = get_auth_settings()

    if provider == "google" and settings.has_google:
        # Google OAuth2 authorization URL
        auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth"
            f"?client_id={settings.google_client_id}"
            f"&redirect_uri={redirect_uri or 'http://localhost:8000/api/auth/callback/google'}"
            f"&response_type=code"
            f"&scope=openid email profile"
            f"&state=google-oauth2"
        )
        return RedirectResponse(url=auth_url)

    elif provider == "azure" and settings.has_azure:
        auth_url = (
            f"https://login.microsoftonline.com/{settings.azure_tenant_id}/oauth2/v2.0/authorize"
            f"?client_id={settings.azure_client_id}"
            f"&redirect_uri={redirect_uri or 'http://localhost:8000/api/auth/callback/azure'}"
            f"&response_type=code"
            f"&scope=openid email profile"
            f"&state=azure-oauth2"
        )
        return RedirectResponse(url=auth_url)

    elif provider == "keycloak" and settings.has_keycloak:
        auth_url = (
            f"{settings.keycloak_server_url}/realms/{settings.keycloak_realm}/protocol/openid-connect/auth"
            f"?client_id={settings.keycloak_client_id}"
            f"&redirect_uri={redirect_uri or 'http://localhost:8000/api/auth/callback/keycloak'}"
            f"&response_type=code"
            f"&scope=openid email profile"
            f"&state=keycloak-oauth2"
        )
        return RedirectResponse(url=auth_url)

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"OAuth2 provider '{provider}' is not enabled or configured",
    )


@router.get("/callback/{provider}")
async def oauth2_callback(
    provider: str,
    code: str = Query(...),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
):
    """
    OAuth2 callback handler.
    Exchanges authorization code for tokens and creates user session.
    """
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth2 error: {error}",
        )

    settings = get_auth_settings()

    # Validate provider
    valid_providers = []
    if settings.has_google:
        valid_providers.append("google")
    if settings.has_azure:
        valid_providers.append("azure")
    if settings.has_keycloak:
        valid_providers.append("keycloak")

    if provider not in valid_providers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Provider '{provider}' is not enabled",
        )

    try:
        # Import OAuth2 client
        from .oauth2_client import get_oauth2_client

        oauth2_client = get_oauth2_client()

        # Determine redirect URI
        redirect_uri = f"http://localhost:8000/api/auth/callback/{provider}"

        # Exchange code for tokens
        logger.info(f"Exchanging code for tokens with {provider}...")
        token_response = await oauth2_client.exchange_code(provider, code, redirect_uri)

        # Get user info from provider
        logger.info(f"Fetching user info from {provider}...")
        user_info = await oauth2_client.get_user_info(provider, token_response.access_token)

        logger.info(f"OAuth2 login successful for {user_info.email} via {provider}")

        # Create local user object
        user = User(
            id=f"{provider}:{user_info.sub}",
            email=user_info.email,
            name=user_info.name,
            roles=["user"],  # Default role
            provider=provider,
            picture=user_info.picture,
        )

        # Generate our JWT tokens
        access_token = create_access_token(user)
        refresh_token = create_refresh_token(user)

        # Return tokens (in production, would redirect with token in URL fragment)
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
            user=user.model_dump() if hasattr(user, 'model_dump') else {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "provider": user.provider,
            },
        )

    except Exception as e:
        logger.error(f"OAuth2 callback error for {provider}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}",
        )


@router.get("/status")
async def auth_status():
    """
    Get authentication system status.
    """
    settings = get_auth_settings()

    return {
        "auth_enabled": settings.auth_enabled,
        "local_users_enabled": settings.local_users_enabled,
        "allow_anonymous": settings.allow_anonymous,
        "oauth2_providers": settings.enabled_providers,
        "token_expiry_minutes": settings.access_token_expire_minutes,
        "refresh_expiry_days": settings.refresh_token_expire_days,
    }
