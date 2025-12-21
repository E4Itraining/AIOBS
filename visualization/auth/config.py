"""
Authentication Configuration
OAuth2 providers and JWT settings
"""

from functools import lru_cache
from typing import List, Optional

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class AuthSettings(BaseSettings):
    """Authentication and OAuth2 settings"""

    model_config = SettingsConfigDict(
        env_prefix="AIOBS_AUTH_",
        case_sensitive=False,
        extra="ignore"
    )

    # JWT Configuration
    jwt_secret: SecretStr = Field(
        default=SecretStr("aiobs-dev-secret-change-in-production"),
        description="Secret key for JWT signing (CHANGE IN PRODUCTION!)"
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT signing algorithm")
    access_token_expire_minutes: int = Field(
        default=30, ge=5, le=1440, description="Access token expiration in minutes"
    )
    refresh_token_expire_days: int = Field(
        default=7, ge=1, le=30, description="Refresh token expiration in days"
    )

    # Auth Mode
    auth_enabled: bool = Field(
        default=True, description="Enable authentication (disable for dev)"
    )
    allow_anonymous: bool = Field(
        default=False, description="Allow anonymous access to read endpoints"
    )

    # OAuth2 Providers
    oauth2_providers: str = Field(
        default="", description="Comma-separated OAuth2 providers (google,azure,keycloak)"
    )

    # Google OAuth2
    google_client_id: str = Field(default="", description="Google OAuth2 Client ID")
    google_client_secret: SecretStr = Field(
        default=SecretStr(""), description="Google OAuth2 Client Secret"
    )

    # Azure AD OAuth2
    azure_client_id: str = Field(default="", description="Azure AD Client ID")
    azure_client_secret: SecretStr = Field(
        default=SecretStr(""), description="Azure AD Client Secret"
    )
    azure_tenant_id: str = Field(default="", description="Azure AD Tenant ID")

    # Keycloak OAuth2
    keycloak_server_url: str = Field(default="", description="Keycloak server URL")
    keycloak_realm: str = Field(default="", description="Keycloak realm")
    keycloak_client_id: str = Field(default="", description="Keycloak Client ID")
    keycloak_client_secret: SecretStr = Field(
        default=SecretStr(""), description="Keycloak Client Secret"
    )

    # Local Users (for development/demo)
    local_users_enabled: bool = Field(
        default=True, description="Enable local user authentication"
    )

    @property
    def enabled_providers(self) -> List[str]:
        """Get list of enabled OAuth2 providers"""
        if not self.oauth2_providers:
            return []
        return [p.strip().lower() for p in self.oauth2_providers.split(",") if p.strip()]

    @property
    def has_google(self) -> bool:
        return "google" in self.enabled_providers and bool(self.google_client_id)

    @property
    def has_azure(self) -> bool:
        return "azure" in self.enabled_providers and bool(self.azure_client_id)

    @property
    def has_keycloak(self) -> bool:
        return "keycloak" in self.enabled_providers and bool(self.keycloak_client_id)

    @field_validator("jwt_algorithm")
    @classmethod
    def validate_algorithm(cls, v: str) -> str:
        valid = ["HS256", "HS384", "HS512", "RS256", "RS384", "RS512"]
        if v not in valid:
            raise ValueError(f"jwt_algorithm must be one of {valid}")
        return v


@lru_cache()
def get_auth_settings() -> AuthSettings:
    """Get cached authentication settings"""
    return AuthSettings()
