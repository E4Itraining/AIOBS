"""
AIOBS SDK - Official Python SDK for AIOBS Platform
AI Observability Hub - Trust Control Layer for AI Systems

Example usage:
    from aiobs_sdk import AIObsClient, Metric, Log, Event

    # Initialize client
    client = AIObsClient(
        base_url="https://aiobs.example.com",
        api_key="your-api-key",
    )

    # Send metrics
    client.ingest_metrics([
        Metric(name="model_latency_ms", value=45.2, labels={"model": "fraud-v1"}),
    ])

    # Send logs
    client.ingest_logs([
        Log(level="info", message="Inference completed", context={"latency": 45}),
    ])

    # Context manager for batching
    with client.batch() as batch:
        batch.add_metric(Metric(...))
        batch.add_log(Log(...))
    # Auto-sends on exit
"""

__version__ = "0.1.0"
__author__ = "AIOBS Team"

from .client import AIObsClient, AsyncAIObsClient
from .models import Metric, Log, Event, Trace, Span
from .exceptions import (
    AIObsError,
    AuthenticationError,
    RateLimitError,
    ValidationError,
    ConnectionError,
)
from .batch import BatchContext

__all__ = [
    # Version
    "__version__",
    # Clients
    "AIObsClient",
    "AsyncAIObsClient",
    # Models
    "Metric",
    "Log",
    "Event",
    "Trace",
    "Span",
    # Exceptions
    "AIObsError",
    "AuthenticationError",
    "RateLimitError",
    "ValidationError",
    "ConnectionError",
    # Utilities
    "BatchContext",
]
