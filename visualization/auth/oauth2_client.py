"""
OAuth2 Client - Token Exchange Implementation
Exchanges authorization codes for tokens with OAuth2 providers
"""

import logging
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlencode

import httpx

from .config import get_auth_settings

logger = logging.getLogger("aiobs.auth.oauth2")


@dataclass
class OAuth2TokenResponse:
    """Response from OAuth2 token exchange"""
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: Optional[str] = None
    id_token: Optional[str] = None
    scope: Optional[str] = None


@dataclass
class OAuth2UserInfo:
    """User info from OAuth2 provider"""
    sub: str  # Provider's user ID
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    email_verified: bool = False
    provider: str = "unknown"


class OAuth2Client:
    """
    OAuth2 client for token exchange and user info retrieval.

    Supports:
    - Google OAuth2
    - Microsoft Azure AD
    - Keycloak
    """

    def __init__(self):
        self.settings = get_auth_settings()
        self.http_client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Close HTTP client"""
        await self.http_client.aclose()

    # =========================================================================
    # Google OAuth2
    # =========================================================================

    async def exchange_google_code(
        self, code: str, redirect_uri: str
    ) -> OAuth2TokenResponse:
        """
        Exchange authorization code for tokens with Google.
        """
        token_url = "https://oauth2.googleapis.com/token"

        data = {
            "code": code,
            "client_id": self.settings.google_client_id,
            "client_secret": self.settings.google_client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }

        response = await self.http_client.post(token_url, data=data)

        if response.status_code != 200:
            logger.error(f"Google token exchange failed: {response.text}")
            raise ValueError(f"Token exchange failed: {response.status_code}")

        token_data = response.json()

        return OAuth2TokenResponse(
            access_token=token_data["access_token"],
            token_type=token_data.get("token_type", "Bearer"),
            expires_in=token_data.get("expires_in", 3600),
            refresh_token=token_data.get("refresh_token"),
            id_token=token_data.get("id_token"),
            scope=token_data.get("scope"),
        )

    async def get_google_user_info(self, access_token: str) -> OAuth2UserInfo:
        """
        Get user info from Google using access token.
        """
        userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"

        headers = {"Authorization": f"Bearer {access_token}"}
        response = await self.http_client.get(userinfo_url, headers=headers)

        if response.status_code != 200:
            logger.error(f"Google userinfo failed: {response.text}")
            raise ValueError(f"User info retrieval failed: {response.status_code}")

        user_data = response.json()

        return OAuth2UserInfo(
            sub=user_data["sub"],
            email=user_data["email"],
            name=user_data.get("name"),
            picture=user_data.get("picture"),
            email_verified=user_data.get("email_verified", False),
            provider="google",
        )

    # =========================================================================
    # Azure AD OAuth2
    # =========================================================================

    async def exchange_azure_code(
        self, code: str, redirect_uri: str
    ) -> OAuth2TokenResponse:
        """
        Exchange authorization code for tokens with Azure AD.
        """
        token_url = f"https://login.microsoftonline.com/{self.settings.azure_tenant_id}/oauth2/v2.0/token"

        data = {
            "code": code,
            "client_id": self.settings.azure_client_id,
            "client_secret": self.settings.azure_client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
            "scope": "openid email profile",
        }

        response = await self.http_client.post(token_url, data=data)

        if response.status_code != 200:
            logger.error(f"Azure token exchange failed: {response.text}")
            raise ValueError(f"Token exchange failed: {response.status_code}")

        token_data = response.json()

        return OAuth2TokenResponse(
            access_token=token_data["access_token"],
            token_type=token_data.get("token_type", "Bearer"),
            expires_in=token_data.get("expires_in", 3600),
            refresh_token=token_data.get("refresh_token"),
            id_token=token_data.get("id_token"),
            scope=token_data.get("scope"),
        )

    async def get_azure_user_info(self, access_token: str) -> OAuth2UserInfo:
        """
        Get user info from Microsoft Graph API.
        """
        userinfo_url = "https://graph.microsoft.com/v1.0/me"

        headers = {"Authorization": f"Bearer {access_token}"}
        response = await self.http_client.get(userinfo_url, headers=headers)

        if response.status_code != 200:
            logger.error(f"Azure userinfo failed: {response.text}")
            raise ValueError(f"User info retrieval failed: {response.status_code}")

        user_data = response.json()

        return OAuth2UserInfo(
            sub=user_data["id"],
            email=user_data.get("mail") or user_data.get("userPrincipalName", ""),
            name=user_data.get("displayName"),
            picture=None,  # Azure requires separate call for photo
            email_verified=True,  # Azure AD emails are verified
            provider="azure",
        )

    # =========================================================================
    # Keycloak OAuth2
    # =========================================================================

    async def exchange_keycloak_code(
        self, code: str, redirect_uri: str
    ) -> OAuth2TokenResponse:
        """
        Exchange authorization code for tokens with Keycloak.
        """
        token_url = (
            f"{self.settings.keycloak_server_url}/realms/{self.settings.keycloak_realm}"
            f"/protocol/openid-connect/token"
        )

        data = {
            "code": code,
            "client_id": self.settings.keycloak_client_id,
            "client_secret": self.settings.keycloak_client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }

        response = await self.http_client.post(token_url, data=data)

        if response.status_code != 200:
            logger.error(f"Keycloak token exchange failed: {response.text}")
            raise ValueError(f"Token exchange failed: {response.status_code}")

        token_data = response.json()

        return OAuth2TokenResponse(
            access_token=token_data["access_token"],
            token_type=token_data.get("token_type", "Bearer"),
            expires_in=token_data.get("expires_in", 3600),
            refresh_token=token_data.get("refresh_token"),
            id_token=token_data.get("id_token"),
            scope=token_data.get("scope"),
        )

    async def get_keycloak_user_info(self, access_token: str) -> OAuth2UserInfo:
        """
        Get user info from Keycloak.
        """
        userinfo_url = (
            f"{self.settings.keycloak_server_url}/realms/{self.settings.keycloak_realm}"
            f"/protocol/openid-connect/userinfo"
        )

        headers = {"Authorization": f"Bearer {access_token}"}
        response = await self.http_client.get(userinfo_url, headers=headers)

        if response.status_code != 200:
            logger.error(f"Keycloak userinfo failed: {response.text}")
            raise ValueError(f"User info retrieval failed: {response.status_code}")

        user_data = response.json()

        return OAuth2UserInfo(
            sub=user_data["sub"],
            email=user_data.get("email", ""),
            name=user_data.get("name") or user_data.get("preferred_username"),
            picture=user_data.get("picture"),
            email_verified=user_data.get("email_verified", False),
            provider="keycloak",
        )

    # =========================================================================
    # Generic Methods
    # =========================================================================

    async def exchange_code(
        self, provider: str, code: str, redirect_uri: str
    ) -> OAuth2TokenResponse:
        """
        Exchange code for tokens with any supported provider.
        """
        if provider == "google":
            return await self.exchange_google_code(code, redirect_uri)
        elif provider == "azure":
            return await self.exchange_azure_code(code, redirect_uri)
        elif provider == "keycloak":
            return await self.exchange_keycloak_code(code, redirect_uri)
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    async def get_user_info(
        self, provider: str, access_token: str
    ) -> OAuth2UserInfo:
        """
        Get user info from any supported provider.
        """
        if provider == "google":
            return await self.get_google_user_info(access_token)
        elif provider == "azure":
            return await self.get_azure_user_info(access_token)
        elif provider == "keycloak":
            return await self.get_keycloak_user_info(access_token)
        else:
            raise ValueError(f"Unsupported provider: {provider}")


# Global client instance
_oauth2_client: Optional[OAuth2Client] = None


def get_oauth2_client() -> OAuth2Client:
    """Get or create OAuth2 client instance"""
    global _oauth2_client
    if _oauth2_client is None:
        _oauth2_client = OAuth2Client()
    return _oauth2_client
