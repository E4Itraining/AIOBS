# AIOBS SDK

Official Python SDK for **AIOBS** - AI Observability Platform.

AIOBS is a Trust Control Layer for AI Systems, providing unified observability with cognitive metrics, causal analysis, and governance by design.

## Installation

```bash
pip install aiobs-sdk
```

With optional dependencies:

```bash
# Async support with HTTP/2
pip install aiobs-sdk[async]

# Prometheus integration
pip install aiobs-sdk[prometheus]

# OpenTelemetry integration
pip install aiobs-sdk[opentelemetry]

# All optional dependencies
pip install aiobs-sdk[all]
```

## Quick Start

### Basic Usage

```python
from aiobs_sdk import AIObsClient, Metric, Log, Event

# Initialize client
client = AIObsClient(
    base_url="https://aiobs.example.com",
    api_key="your-api-key",
    environment="production",
)

# Send metrics
response = client.ingest_metrics([
    Metric(
        name="model_latency_ms",
        value=45.2,
        labels={"model": "fraud-detector-v1", "version": "1.2.0"},
    ),
    Metric(
        name="trust_score",
        value=0.87,
        labels={"model": "fraud-detector-v1"},
    ),
])

print(f"Ingested {response.items_processed} metrics")

# Send logs
client.ingest_logs([
    Log(
        level="info",
        message="Model inference completed successfully",
        context={"model_id": "fraud-detector-v1", "latency_ms": 45.2},
    ),
])

# Send events
client.ingest_events([
    Event(
        event_type="drift_detected",
        severity="warning",
        title="Data drift detected in fraud model",
        description="Input feature distribution shifted by 25%",
        model_id="fraud-detector-v1",
    ),
])
```

### Batch Context

For efficient batching of multiple data types:

```python
with client.batch() as batch:
    # Add metrics
    batch.add_metric(Metric(name="latency_ms", value=45.0))
    batch.add_metric(Metric(name="throughput", value=1250))

    # Add logs
    batch.add_log(Log(level="info", message="Request processed"))

    # Add events
    batch.add_event(Event(
        event_type="model_update",
        title="Model v1.3.0 deployed",
    ))

# Automatically sent on exit
print(f"Batch sent: {batch.response.items_processed} items")
```

### Async Client

For async applications:

```python
from aiobs_sdk import AsyncAIObsClient, Metric

async def main():
    async with AsyncAIObsClient(
        base_url="https://aiobs.example.com",
        api_key="your-api-key",
    ) as client:
        response = await client.ingest_metrics([
            Metric(name="latency_ms", value=45.2),
        ])
        print(f"Ingested {response.items_processed} metrics")

import asyncio
asyncio.run(main())
```

## Data Models

### Metric

```python
Metric(
    name="model_latency_ms",           # Required: Metric name
    value=45.2,                         # Required: Metric value
    labels={"model": "fraud-v1"},       # Optional: Dimension labels
    metric_type="gauge",                # Optional: gauge, counter, histogram, summary
    unit="ms",                          # Optional: Unit of measurement
    timestamp=datetime.utcnow(),        # Optional: Defaults to now
)
```

### Log

```python
Log(
    level="info",                       # Required: debug, info, warning, error, critical
    message="Inference completed",      # Required: Log message
    context={"latency": 45},           # Optional: Structured context
    trace_id="abc123",                 # Optional: Trace correlation
    service="fraud-service",           # Optional: Service name
)
```

### Event

```python
Event(
    event_type="drift_detected",        # Required: Event type
    title="Data drift detected",        # Required: Event title
    severity="warning",                 # Optional: info, warning, critical
    description="Feature shifted...",   # Optional: Description
    model_id="fraud-v1",               # Optional: Model ID
    metadata={"drift_score": 0.35},    # Optional: Additional data
    tags=["drift", "monitoring"],      # Optional: Tags
)
```

## Error Handling

```python
from aiobs_sdk import (
    AIObsClient,
    AuthenticationError,
    RateLimitError,
    ConnectionError,
)

client = AIObsClient(base_url="https://aiobs.example.com")

try:
    client.ingest_metrics([...])
except AuthenticationError:
    print("Invalid API key")
except RateLimitError as e:
    print(f"Rate limited, retry after {e.retry_after}s")
except ConnectionError:
    print("Could not connect to AIOBS server")
```

## Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `base_url` | str | `http://localhost:8000` | AIOBS server URL |
| `api_key` | str | None | API key for authentication |
| `environment` | str | None | Environment name (production, staging) |
| `timeout` | float | 30.0 | Request timeout in seconds |
| `max_retries` | int | 3 | Maximum retry attempts |
| `verify_ssl` | bool | True | Verify SSL certificates |

## Environment Variables

The SDK respects these environment variables:

- `AIOBS_BASE_URL` - Server URL
- `AIOBS_API_KEY` - API key
- `AIOBS_ENVIRONMENT` - Environment name

## License

MIT License - see LICENSE file for details.

## Links

- [AIOBS Platform](https://aiobs.io)
- [Documentation](https://docs.aiobs.io/sdk/python)
- [GitHub Repository](https://github.com/aiobs/aiobs-sdk-python)
