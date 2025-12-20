"""
AIOBS Configuration Module
Centralized environment variable validation using Pydantic Settings
"""

import logging
from functools import lru_cache
from typing import List, Optional

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("aiobs.config")


class ServerSettings(BaseSettings):
    """Server configuration settings"""

    model_config = SettingsConfigDict(env_prefix="AIOBS_", case_sensitive=False, extra="ignore")

    host: str = Field(default="0.0.0.0", description="Server host address")  # nosec B104 - intentional for Docker
    port: int = Field(default=8000, ge=1, le=65535, description="Server port")
    reload: bool = Field(default=True, description="Enable hot reload")
    log_level: str = Field(default="info", description="Logging level")
    dev_mode: bool = Field(default=False, description="Enable development mode")

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        valid_levels = ["debug", "info", "warning", "error", "critical"]
        if v.lower() not in valid_levels:
            raise ValueError(f"log_level must be one of {valid_levels}")
        return v.lower()


class CORSSettings(BaseSettings):
    """CORS configuration settings"""

    model_config = SettingsConfigDict(case_sensitive=False, extra="ignore")

    cors_origins: str = Field(
        default="http://localhost:8000,http://localhost:3000,http://127.0.0.1:8000",
        alias="CORS_ORIGINS",
        description="Comma-separated list of allowed origins",
    )

    @property
    def origins_list(self) -> List[str]:
        """Parse CORS origins string into a list"""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @field_validator("cors_origins")
    @classmethod
    def validate_cors_origins(cls, v: str) -> str:
        origins = [o.strip() for o in v.split(",") if o.strip()]
        if "*" in origins and len(origins) > 1:
            logger.warning("CORS_ORIGINS contains '*' with other origins - using wildcard")
        for origin in origins:
            if origin != "*" and not origin.startswith(("http://", "https://")):
                raise ValueError(f"Invalid origin format: {origin}")
        return v


class SecuritySettings(BaseSettings):
    """Security-related settings"""

    model_config = SettingsConfigDict(env_prefix="AIOBS_", case_sensitive=False, extra="ignore")

    api_keys: str = Field(default="", description="Comma-separated list of valid API keys")
    signing_secret: SecretStr = Field(
        default=SecretStr("dev-secret"), description="HMAC signing secret for request verification"
    )
    security_auth: str = Field(
        default="", description="Comma-separated list of valid security auth tokens"
    )

    @property
    def api_keys_list(self) -> List[str]:
        """Parse API keys string into a list"""
        return [k.strip() for k in self.api_keys.split(",") if k.strip()]

    @property
    def security_auth_list(self) -> List[str]:
        """Parse security auth tokens into a list"""
        return [t.strip() for t in self.security_auth.split(",") if t.strip()]

    def is_valid_api_key(self, key: str) -> bool:
        """Check if API key is valid"""
        return key in self.api_keys_list


class BackendSettings(BaseSettings):
    """Backend service connection settings"""

    model_config = SettingsConfigDict(case_sensitive=False, extra="ignore")

    victoria_metrics_url: str = Field(
        default="http://victoriametrics:8428",
        alias="VICTORIA_METRICS_URL",
        description="VictoriaMetrics endpoint URL",
    )
    openobserve_url: str = Field(
        default="http://openobserve:5080",
        alias="OPENOBSERVE_URL",
        description="OpenObserve endpoint URL",
    )
    openobserve_user: str = Field(
        default="admin@aiobs.local", alias="OPENOBSERVE_USER", description="OpenObserve username"
    )
    openobserve_password: SecretStr = Field(
        default=SecretStr("Complexpass#123"),
        alias="OPENOBSERVE_PASSWORD",
        description="OpenObserve password",
    )
    redis_url: str = Field(
        default="redis://redis:6379", alias="REDIS_URL", description="Redis connection URL"
    )

    @field_validator("victoria_metrics_url", "openobserve_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError(f"URL must start with http:// or https://: {v}")
        return v.rstrip("/")

    @field_validator("redis_url")
    @classmethod
    def validate_redis_url(cls, v: str) -> str:
        if not v.startswith(("redis://", "rediss://")):
            raise ValueError(f"Redis URL must start with redis:// or rediss://: {v}")
        return v


class Settings(BaseSettings):
    """Main application settings - combines all configuration"""

    model_config = SettingsConfigDict(case_sensitive=False, extra="ignore")

    # Nested settings
    server: ServerSettings = Field(default_factory=ServerSettings)
    cors: CORSSettings = Field(default_factory=CORSSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    backends: BackendSettings = Field(default_factory=BackendSettings)

    # App metadata
    app_name: str = "AIOBS - AI Observability Hub"
    app_version: str = "1.0.0"

    @property
    def is_dev(self) -> bool:
        """Check if running in development mode"""
        return self.server.dev_mode

    def log_config(self) -> None:
        """Log non-sensitive configuration values"""
        logger.info("AIOBS Configuration:")
        logger.info(f"  Server: {self.server.host}:{self.server.port}")
        logger.info(f"  Log Level: {self.server.log_level}")
        logger.info(f"  Dev Mode: {self.server.dev_mode}")
        logger.info(f"  Hot Reload: {self.server.reload}")
        logger.info(f"  CORS Origins: {len(self.cors.origins_list)} configured")
        logger.info(f"  API Keys: {len(self.security.api_keys_list)} configured")
        logger.info(f"  VictoriaMetrics: {self.backends.victoria_metrics_url}")
        logger.info(f"  OpenObserve: {self.backends.openobserve_url}")
        logger.info(f"  Redis: {self.backends.redis_url}")


@lru_cache()
def get_settings() -> Settings:
    """
    Get application settings (cached singleton).
    Use this function to access settings throughout the application.

    Example:
        from visualization.config import get_settings
        settings = get_settings()
        print(settings.server.port)
    """
    settings = Settings()
    return settings


# Export commonly used settings shortcuts
def get_server_settings() -> ServerSettings:
    """Get server settings"""
    return get_settings().server


def get_cors_settings() -> CORSSettings:
    """Get CORS settings"""
    return get_settings().cors


def get_security_settings() -> SecuritySettings:
    """Get security settings"""
    return get_settings().security


def get_backend_settings() -> BackendSettings:
    """Get backend connection settings"""
    return get_settings().backends


# Validate settings on module import in non-dev mode
def validate_production_settings() -> List[str]:
    """
    Validate settings for production deployment.
    Returns a list of warnings/errors.
    """
    settings = get_settings()
    issues: List[str] = []

    if settings.server.dev_mode:
        issues.append("WARNING: Running in dev mode - disable for production")

    if settings.security.signing_secret.get_secret_value() == "dev-secret":
        issues.append("CRITICAL: Using default signing secret - set AIOBS_SIGNING_SECRET")

    if not settings.security.api_keys_list:
        issues.append("WARNING: No API keys configured - set AIOBS_API_KEYS")

    if "*" in settings.cors.cors_origins:
        issues.append("WARNING: CORS allows all origins - restrict for production")

    return issues
