"""
Alerting Configuration
Settings for alert providers and routing
"""

from functools import lru_cache
from typing import Dict, List, Optional

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class AlertingSettings(BaseSettings):
    """Alerting system settings"""

    model_config = SettingsConfigDict(
        env_prefix="AIOBS_ALERTING_",
        case_sensitive=False,
        extra="ignore"
    )

    # Alerting enabled
    enabled: bool = Field(default=True, description="Enable alerting system")

    # Slack Configuration
    slack_enabled: bool = Field(default=False, description="Enable Slack alerts")
    slack_webhook_url: SecretStr = Field(
        default=SecretStr(""),
        description="Slack Incoming Webhook URL"
    )
    slack_bot_token: SecretStr = Field(
        default=SecretStr(""),
        description="Slack Bot Token (for Slack App API)"
    )
    slack_default_channel: str = Field(
        default="#aiobs-alerts",
        description="Default Slack channel for alerts"
    )

    # Channel mapping by severity
    slack_channel_critical: str = Field(
        default="#aiobs-critical",
        description="Slack channel for critical alerts"
    )
    slack_channel_warning: str = Field(
        default="#aiobs-alerts",
        description="Slack channel for warning alerts"
    )
    slack_channel_info: str = Field(
        default="#aiobs-info",
        description="Slack channel for info alerts"
    )

    # PagerDuty Configuration
    pagerduty_enabled: bool = Field(default=False, description="Enable PagerDuty alerts")
    pagerduty_routing_key: SecretStr = Field(
        default=SecretStr(""),
        description="PagerDuty Events API routing key"
    )
    pagerduty_service_id: str = Field(
        default="",
        description="PagerDuty service ID"
    )

    # OpsGenie Configuration
    opsgenie_enabled: bool = Field(default=False, description="Enable OpsGenie alerts")
    opsgenie_api_key: SecretStr = Field(
        default=SecretStr(""),
        description="OpsGenie API key"
    )

    # Generic Webhook
    webhook_enabled: bool = Field(default=False, description="Enable generic webhook alerts")
    webhook_url: str = Field(
        default="",
        description="Generic webhook URL for alerts"
    )
    webhook_secret: SecretStr = Field(
        default=SecretStr(""),
        description="Webhook signing secret"
    )

    # Alert Routing
    route_critical_to_pagerduty: bool = Field(
        default=True,
        description="Route critical alerts to PagerDuty"
    )
    route_all_to_slack: bool = Field(
        default=True,
        description="Send all alerts to Slack"
    )

    # Rate Limiting
    rate_limit_per_minute: int = Field(
        default=30,
        ge=1,
        le=100,
        description="Maximum alerts per minute"
    )
    dedup_window_seconds: int = Field(
        default=300,
        ge=60,
        le=3600,
        description="Deduplication window in seconds"
    )

    @property
    def has_slack(self) -> bool:
        """Check if Slack is properly configured"""
        return self.slack_enabled and bool(
            self.slack_webhook_url.get_secret_value() or
            self.slack_bot_token.get_secret_value()
        )

    @property
    def has_pagerduty(self) -> bool:
        """Check if PagerDuty is properly configured"""
        return self.pagerduty_enabled and bool(
            self.pagerduty_routing_key.get_secret_value()
        )

    @property
    def has_opsgenie(self) -> bool:
        """Check if OpsGenie is properly configured"""
        return self.opsgenie_enabled and bool(
            self.opsgenie_api_key.get_secret_value()
        )

    @property
    def has_webhook(self) -> bool:
        """Check if generic webhook is configured"""
        return self.webhook_enabled and bool(self.webhook_url)

    def get_slack_channel(self, severity: str) -> str:
        """Get Slack channel for alert severity"""
        channels = {
            "critical": self.slack_channel_critical,
            "warning": self.slack_channel_warning,
            "info": self.slack_channel_info,
        }
        return channels.get(severity.lower(), self.slack_default_channel)


@lru_cache()
def get_alerting_settings() -> AlertingSettings:
    """Get cached alerting settings"""
    return AlertingSettings()
