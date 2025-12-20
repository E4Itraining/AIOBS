"""
AIOBS Data Ingestion Module
Secure, scalable, and Data Act compliant data injection
"""

from .backends import BackendConnector, OpenObserveClient, RedisClient, VictoriaMetricsClient
from .rate_limiter import RateLimitConfig, RateLimiter
from .schemas import (
    BatchIngestionRequest,
    DataCategory,
    DataSensitivity,
    EventIngestionRequest,
    IngestionResponse,
    LogIngestionRequest,
    MetricIngestionRequest,
    SecurityTestRequest,
)
from .service import DataIngestionService, ingestion_service
from .validators import DataActCompliance, DataValidator

__all__ = [
    "DataIngestionService",
    "ingestion_service",
    "DataValidator",
    "DataActCompliance",
    "BackendConnector",
    "VictoriaMetricsClient",
    "OpenObserveClient",
    "RedisClient",
    "RateLimiter",
    "RateLimitConfig",
    "MetricIngestionRequest",
    "LogIngestionRequest",
    "EventIngestionRequest",
    "BatchIngestionRequest",
    "SecurityTestRequest",
    "IngestionResponse",
    "DataCategory",
    "DataSensitivity",
]
