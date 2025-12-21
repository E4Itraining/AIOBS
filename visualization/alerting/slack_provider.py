"""
Slack Alert Provider
Send alerts to Slack via webhook or Slack App API
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx

from .config import get_alerting_settings
from .models import AlertPayload, AlertResponse, AlertSeverity, SlackMessage

logger = logging.getLogger("aiobs.alerting.slack")

# Severity to emoji mapping
SEVERITY_EMOJI = {
    "critical": ":rotating_light:",
    "warning": ":warning:",
    "info": ":information_source:",
}

# Severity to color mapping (Slack attachment colors)
SEVERITY_COLOR = {
    "critical": "#dc3545",  # Red
    "warning": "#ffc107",  # Yellow/Orange
    "info": "#17a2b8",  # Blue
}


class SlackAlertProvider:
    """Slack alerting provider using webhook or Slack App API"""

    def __init__(self):
        self.settings = get_alerting_settings()
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=10.0)
        return self._client

    async def close(self):
        """Close HTTP client"""
        if self._client:
            await self._client.aclose()
            self._client = None

    def _build_block_kit_message(self, alert: AlertPayload) -> List[Dict[str, Any]]:
        """Build Slack Block Kit message from alert payload"""
        severity = alert.severity if isinstance(alert.severity, str) else alert.severity.value
        emoji = SEVERITY_EMOJI.get(severity, ":bell:")

        blocks = [
            # Header
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{emoji} {alert.title}",
                    "emoji": True,
                },
            },
            # Description
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": alert.description,
                },
            },
            # Divider
            {"type": "divider"},
            # Fields
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Severity:*\n{severity.upper()}",
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Type:*\n{alert.alert_type}",
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Status:*\n{alert.status}",
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Time:*\n{alert.triggered_at.strftime('%Y-%m-%d %H:%M:%S UTC')}",
                    },
                ],
            },
        ]

        # Add model/service info if present
        if alert.model_id or alert.service_id:
            context_fields = []
            if alert.model_id:
                context_fields.append({
                    "type": "mrkdwn",
                    "text": f"*Model:* `{alert.model_id}`",
                })
            if alert.service_id:
                context_fields.append({
                    "type": "mrkdwn",
                    "text": f"*Service:* `{alert.service_id}`",
                })
            blocks.append({
                "type": "section",
                "fields": context_fields,
            })

        # Add metric info if present
        if alert.metric_name and alert.metric_value is not None:
            metric_text = f"*{alert.metric_name}:* `{alert.metric_value}`"
            if alert.threshold is not None:
                metric_text += f" (threshold: `{alert.threshold}`)"
            blocks.append({
                "type": "section",
                "text": {"type": "mrkdwn", "text": metric_text},
            })

        # Add action buttons
        actions = []
        if alert.dashboard_url:
            actions.append({
                "type": "button",
                "text": {"type": "plain_text", "text": "View in Dashboard", "emoji": True},
                "url": alert.dashboard_url,
                "style": "primary",
            })
        if alert.runbook_url:
            actions.append({
                "type": "button",
                "text": {"type": "plain_text", "text": "View Runbook", "emoji": True},
                "url": alert.runbook_url,
            })

        if actions:
            blocks.append({
                "type": "actions",
                "elements": actions,
            })

        # Context footer
        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"Alert ID: `{alert.id}` | Source: {alert.source}",
                },
            ],
        })

        return blocks

    async def send_alert(
        self,
        alert: AlertPayload,
        channel: Optional[str] = None,
    ) -> AlertResponse:
        """
        Send alert to Slack.

        Args:
            alert: Alert payload
            channel: Optional channel override

        Returns:
            AlertResponse with success status
        """
        if not self.settings.has_slack:
            return AlertResponse(
                success=False,
                provider="slack",
                error="Slack is not configured",
            )

        try:
            client = await self._get_client()
            severity = alert.severity if isinstance(alert.severity, str) else alert.severity.value

            # Determine channel
            target_channel = channel or self.settings.get_slack_channel(severity)

            # Build message
            blocks = self._build_block_kit_message(alert)
            fallback_text = f"[{severity.upper()}] {alert.title}: {alert.description}"

            # Send via webhook
            webhook_url = self.settings.slack_webhook_url.get_secret_value()
            if webhook_url:
                payload = {
                    "channel": target_channel,
                    "text": fallback_text,
                    "blocks": blocks,
                    "attachments": [
                        {
                            "color": SEVERITY_COLOR.get(severity, "#808080"),
                            "fallback": fallback_text,
                        }
                    ],
                }

                response = await client.post(webhook_url, json=payload)

                if response.status_code == 200:
                    logger.info(f"Slack alert sent successfully: {alert.id}")
                    return AlertResponse(
                        success=True,
                        provider="slack",
                        message_id=alert.id,
                    )
                else:
                    error_msg = f"Slack webhook error: {response.status_code} - {response.text}"
                    logger.error(error_msg)
                    return AlertResponse(
                        success=False,
                        provider="slack",
                        error=error_msg,
                    )

            # Send via Slack App API (if bot token configured)
            bot_token = self.settings.slack_bot_token.get_secret_value()
            if bot_token:
                headers = {
                    "Authorization": f"Bearer {bot_token}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "channel": target_channel,
                    "text": fallback_text,
                    "blocks": blocks,
                }

                response = await client.post(
                    "https://slack.com/api/chat.postMessage",
                    headers=headers,
                    json=payload,
                )

                result = response.json()
                if result.get("ok"):
                    logger.info(f"Slack alert sent via API: {alert.id}")
                    return AlertResponse(
                        success=True,
                        provider="slack",
                        message_id=result.get("ts"),
                    )
                else:
                    error_msg = f"Slack API error: {result.get('error')}"
                    logger.error(error_msg)
                    return AlertResponse(
                        success=False,
                        provider="slack",
                        error=error_msg,
                    )

            return AlertResponse(
                success=False,
                provider="slack",
                error="No Slack webhook or bot token configured",
            )

        except Exception as e:
            logger.exception(f"Failed to send Slack alert: {e}")
            return AlertResponse(
                success=False,
                provider="slack",
                error=str(e),
            )

    async def send_test_alert(self, channel: Optional[str] = None) -> AlertResponse:
        """Send a test alert to verify Slack configuration"""
        test_alert = AlertPayload(
            id=f"test-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            title="AIOBS Test Alert",
            description="This is a test alert from AIOBS to verify Slack integration.",
            severity=AlertSeverity.INFO,
            alert_type="custom",
            source="aiobs-test",
            dashboard_url="http://localhost:8000/",
        )

        return await self.send_alert(test_alert, channel=channel)


# Singleton instance
_slack_provider: Optional[SlackAlertProvider] = None


def get_slack_provider() -> SlackAlertProvider:
    """Get Slack provider singleton"""
    global _slack_provider
    if _slack_provider is None:
        _slack_provider = SlackAlertProvider()
    return _slack_provider
