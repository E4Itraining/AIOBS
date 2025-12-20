"""
AIOBS Data Ingestion API Router
Secure endpoints for continuous data injection
"""

from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Header, Query, Depends, Request, BackgroundTasks
from fastapi.responses import JSONResponse
import hashlib
import hmac

from ..config import get_settings, get_security_settings
from ..ingestion import (
    DataIngestionService,
    MetricIngestionRequest,
    LogIngestionRequest,
    EventIngestionRequest,
    BatchIngestionRequest,
    SecurityTestRequest,
    IngestionResponse,
    ingestion_service
)
from ..models.schemas import APIResponse

router = APIRouter(prefix="/api/ingest", tags=["ingestion"])

# Load settings
_settings = get_settings()
_security = get_security_settings()


# =============================================================================
# Security Dependencies
# =============================================================================

async def verify_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None)
) -> str:
    """
    Verify API key for ingestion requests
    Returns the source_id associated with the key
    """
    # Get API key from header
    api_key = x_api_key

    if not api_key and authorization:
        if authorization.startswith("Bearer "):
            api_key = authorization[7:]

    if not api_key:
        # In development mode, allow requests without API key
        if _settings.is_dev:
            return "dev-source"
        raise HTTPException(
            status_code=401,
            detail="API key required. Provide X-API-Key header or Bearer token."
        )

    # Validate API key against configured keys
    if api_key in _security.api_keys_list or _settings.is_dev:
        # Extract source_id from key hash
        return hashlib.sha256(api_key.encode()).hexdigest()[:16]

    raise HTTPException(
        status_code=401,
        detail="Invalid API key"
    )


async def verify_signature(
    request: Request,
    x_signature: Optional[str] = Header(None, alias="X-Signature"),
    x_timestamp: Optional[str] = Header(None, alias="X-Timestamp")
) -> bool:
    """
    Verify request signature for integrity
    """
    # Skip in dev mode
    if _settings.is_dev:
        return True

    if not x_signature or not x_timestamp:
        return True  # Signature is optional but recommended

    # Verify timestamp is recent (within 5 minutes)
    try:
        ts = datetime.fromisoformat(x_timestamp)
        if abs((datetime.utcnow() - ts).total_seconds()) > 300:
            raise HTTPException(
                status_code=401,
                detail="Request timestamp too old"
            )
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid timestamp format"
        )

    # Verify signature using configured secret
    secret = _security.signing_secret.get_secret_value()
    body = await request.body()

    expected_sig = hmac.new(
        secret.encode(),
        f"{x_timestamp}.{body.decode()}".encode(),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, x_signature):
        raise HTTPException(
            status_code=401,
            detail="Invalid signature"
        )

    return True


# =============================================================================
# Metric Ingestion Endpoints
# =============================================================================

@router.post("/metrics", response_model=IngestionResponse)
async def ingest_metrics(
    request: MetricIngestionRequest,
    background_tasks: BackgroundTasks,
    source_id: str = Depends(verify_api_key)
):
    """
    Ingest metrics into the observability platform.

    Metrics are validated, compliance-checked, and stored in VictoriaMetrics.

    **Rate Limits:**
    - 100 requests/second per source
    - 3000 requests/minute per source
    - 10 MB/second data volume

    **Security:**
    - Validates for injection attacks (SQL, prompt, XSS, command)
    - Sanitizes labels and values
    - Enforces Data Act compliance

    **Example Request:**
    ```json
    {
        "metrics": [
            {
                "name": "model_latency_ms",
                "value": 45.2,
                "labels": {"model": "fraud-v1", "env": "prod"}
            }
        ],
        "metadata": {
            "source": "ai_model",
            "source_id": "fraud-detector-v1"
        },
        "compliance": {
            "data_category": "performance",
            "processing_purpose": "AI model performance monitoring"
        }
    }
    ```
    """
    # Override source_id from auth
    request.metadata.source_id = source_id

    response = await ingestion_service.ingest_metrics(request)

    if response.status.value == "rate_limited":
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit exceeded",
                "retry_after": response.rate_limit_reset.isoformat() if response.rate_limit_reset else None
            },
            headers={
                "Retry-After": str(int((response.rate_limit_reset - datetime.utcnow()).total_seconds()))
                if response.rate_limit_reset else "60"
            }
        )

    return response


@router.post("/metrics/batch", response_model=IngestionResponse)
async def ingest_metrics_batch(
    metrics: List[dict],
    source_id: str = Depends(verify_api_key),
    environment: str = Query(default="production"),
    data_category: str = Query(default="performance")
):
    """
    Simplified batch metric ingestion endpoint.

    For quick integration without full request structure.
    """
    from ..ingestion.schemas import (
        MetricValue, IngestionMetadata, DataActMetadata,
        IngestionSource, DataCategory, DataSensitivity
    )

    # Build full request
    request = MetricIngestionRequest(
        metrics=[MetricValue(**m) for m in metrics],
        metadata=IngestionMetadata(
            source=IngestionSource.APPLICATION,
            source_id=source_id,
            environment=environment
        ),
        compliance=DataActMetadata(
            data_category=DataCategory(data_category),
            sensitivity=DataSensitivity.INTERNAL,
            processing_purpose="Metric ingestion for AI observability monitoring"
        )
    )

    return await ingestion_service.ingest_metrics(request)


# =============================================================================
# Log Ingestion Endpoints
# =============================================================================

@router.post("/logs", response_model=IngestionResponse)
async def ingest_logs(
    request: LogIngestionRequest,
    source_id: str = Depends(verify_api_key)
):
    """
    Ingest logs into the observability platform.

    Logs are validated for sensitive data, sanitized, and stored in OpenObserve.

    **Security Features:**
    - Automatic PII detection and masking
    - Sensitive credential detection
    - Log injection prevention
    - Compliance audit trail

    **Example Request:**
    ```json
    {
        "logs": [
            {
                "level": "info",
                "message": "Model inference completed",
                "context": {"model_id": "fraud-v1", "latency_ms": 45}
            }
        ],
        "stream": "aiobs-logs",
        "metadata": {
            "source": "ai_model",
            "source_id": "fraud-detector-v1"
        },
        "compliance": {
            "data_category": "operational",
            "processing_purpose": "AI model operational logging"
        }
    }
    ```
    """
    request.metadata.source_id = source_id
    response = await ingestion_service.ingest_logs(request)

    if response.status.value == "rate_limited":
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded"
        )

    return response


@router.post("/logs/simple")
async def ingest_logs_simple(
    logs: List[dict],
    source_id: str = Depends(verify_api_key),
    stream: str = Query(default="aiobs-logs")
):
    """
    Simplified log ingestion for quick integration.
    """
    from ..ingestion.schemas import (
        LogEntry, LogLevel, IngestionMetadata, DataActMetadata,
        IngestionSource, DataCategory, DataSensitivity
    )

    # Build log entries
    log_entries = []
    for log in logs:
        level = log.get("level", "info")
        if isinstance(level, str):
            level = LogLevel(level.lower())
        log_entries.append(LogEntry(
            level=level,
            message=log.get("message", ""),
            context=log.get("context", {}),
            timestamp=datetime.fromisoformat(log["timestamp"]) if "timestamp" in log else datetime.utcnow()
        ))

    request = LogIngestionRequest(
        logs=log_entries,
        stream=stream,
        metadata=IngestionMetadata(
            source=IngestionSource.APPLICATION,
            source_id=source_id
        ),
        compliance=DataActMetadata(
            data_category=DataCategory.OPERATIONAL,
            sensitivity=DataSensitivity.INTERNAL,
            processing_purpose="Log ingestion for AI observability monitoring"
        )
    )

    return await ingestion_service.ingest_logs(request)


# =============================================================================
# Event Ingestion Endpoints
# =============================================================================

@router.post("/events", response_model=IngestionResponse)
async def ingest_events(
    request: EventIngestionRequest,
    source_id: str = Depends(verify_api_key)
):
    """
    Ingest events for real-time broadcasting.

    Events are validated, stored in Redis, and broadcast via WebSocket.

    **Event Types:**
    - alert, incident, deployment, config_change
    - model_update, drift_detected, anomaly
    - slo_breach, cost_spike, security, audit

    **Channels:**
    - all: Broadcast to all subscribers
    - alerts: Alert-specific channel
    - metrics: Metric update channel
    - cognitive: AI cognitive metrics channel

    **Example Request:**
    ```json
    {
        "events": [
            {
                "event_type": "drift_detected",
                "severity": "warning",
                "title": "Data drift detected in fraud model",
                "source_service": "fraud-detector-v1",
                "payload": {"drift_score": 0.25}
            }
        ],
        "channels": ["alerts", "cognitive"],
        "metadata": {
            "source": "ai_model",
            "source_id": "drift-monitor"
        },
        "compliance": {
            "data_category": "operational",
            "processing_purpose": "AI model drift monitoring and alerting"
        }
    }
    ```
    """
    request.metadata.source_id = source_id
    response = await ingestion_service.ingest_events(request)

    if response.status.value == "rate_limited":
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded"
        )

    return response


# =============================================================================
# Batch Ingestion Endpoint
# =============================================================================

@router.post("/batch", response_model=IngestionResponse)
async def ingest_batch(
    request: BatchIngestionRequest,
    source_id: str = Depends(verify_api_key)
):
    """
    Batch ingestion for metrics, logs, and events in a single request.

    Efficient for high-volume data sources that produce multiple data types.

    **Example Request:**
    ```json
    {
        "metrics": [{"name": "latency", "value": 45}],
        "logs": [{"level": "info", "message": "Inference complete"}],
        "events": [{"event_type": "custom", "title": "Batch processed"}],
        "metadata": {
            "source": "pipeline",
            "source_id": "inference-pipeline"
        },
        "compliance": {
            "data_category": "operational",
            "processing_purpose": "AI pipeline observability data ingestion"
        }
    }
    ```
    """
    request.metadata.source_id = source_id
    return await ingestion_service.ingest_batch(request)


# =============================================================================
# Security Testing Endpoint
# =============================================================================

@router.post("/security-test", response_model=IngestionResponse)
async def ingest_security_test(
    request: SecurityTestRequest,
    source_id: str = Depends(verify_api_key),
    x_security_auth: str = Header(..., alias="X-Security-Authorization")
):
    """
    Ingest security test payloads for authorized testing.

    **RESTRICTED ENDPOINT** - Requires special authorization.

    Used for:
    - Prompt injection testing
    - Adversarial input testing
    - Security vulnerability assessment
    - Model robustness testing

    **Required Headers:**
    - X-Security-Authorization: Authorization ticket for security testing

    **Example Request:**
    ```json
    {
        "tests": [
            {
                "test_category": "prompt_injection",
                "test_id": "PI-001",
                "payload": "Ignore previous instructions...",
                "expected_behavior": "reject",
                "authorized_by": "security-team",
                "authorization_ticket": "SEC-2024-001"
            }
        ],
        "dry_run": true,
        "metadata": {
            "source": "automated_test",
            "source_id": "security-scanner"
        },
        "compliance": {
            "data_category": "compliance",
            "processing_purpose": "Authorized security testing for AI model robustness"
        }
    }
    ```
    """
    # Verify security authorization using config
    if x_security_auth not in _security.security_auth_list and not _settings.is_dev:
        raise HTTPException(
            status_code=403,
            detail="Invalid security authorization"
        )

    request.metadata.source_id = source_id
    return await ingestion_service.ingest_security_test(request)


# =============================================================================
# Query Endpoints
# =============================================================================

@router.get("/metrics/query")
async def query_metrics(
    query: str = Query(..., description="PromQL query"),
    start: Optional[str] = Query(None, description="Start time (ISO format)"),
    end: Optional[str] = Query(None, description="End time (ISO format)"),
    source_id: str = Depends(verify_api_key)
):
    """
    Query metrics using PromQL.

    **Example Queries:**
    - `model_latency_ms{model="fraud-v1"}` - Instant query
    - `rate(model_requests_total[5m])` - Rate of requests
    - `avg_over_time(trust_score[1h])` - Average trust score
    """
    start_dt = datetime.fromisoformat(start) if start else None
    end_dt = datetime.fromisoformat(end) if end else None

    result = await ingestion_service.query_metrics(query, start_dt, end_dt)
    return APIResponse(success=True, data=result)


@router.get("/logs/search")
async def search_logs(
    query: str = Query(..., description="Search query"),
    stream: str = Query(default="aiobs-logs"),
    limit: int = Query(default=100, le=1000),
    source_id: str = Depends(verify_api_key)
):
    """
    Search logs in OpenObserve.
    """
    result = await ingestion_service.query_logs(query, stream, limit)
    return APIResponse(success=True, data=result)


@router.get("/events/recent")
async def get_recent_events(
    limit: int = Query(default=100, le=1000),
    source_id: str = Depends(verify_api_key)
):
    """
    Get recent events from the event store.
    """
    events = await ingestion_service.get_recent_events(limit)
    return APIResponse(success=True, data=events)


# =============================================================================
# Health & Stats Endpoints
# =============================================================================

@router.get("/health")
async def ingestion_health():
    """
    Check ingestion service health.
    """
    health = await ingestion_service.health_check()
    status_code = 200 if health["status"] == "healthy" else 503

    return JSONResponse(
        status_code=status_code,
        content=health
    )


@router.get("/stats")
async def ingestion_stats(source_id: str = Depends(verify_api_key)):
    """
    Get ingestion statistics.
    """
    stats = await ingestion_service.get_stats()
    return APIResponse(success=True, data=stats)


# =============================================================================
# Lifecycle Events
# =============================================================================

async def startup():
    """Initialize ingestion service on startup"""
    await ingestion_service.initialize()


async def shutdown():
    """Shutdown ingestion service gracefully"""
    await ingestion_service.shutdown()
