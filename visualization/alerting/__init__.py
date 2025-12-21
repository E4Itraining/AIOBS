"""
AIOBS Alerting Module
Multi-provider alerting with Slack, PagerDuty, and webhook support
"""

from .config import AlertingSettings, get_alerting_settings
from .slack_provider import SlackAlertProvider

__all__ = [
    "AlertingSettings",
    "get_alerting_settings",
    "SlackAlertProvider",
]
