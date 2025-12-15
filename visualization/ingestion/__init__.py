"""
AIOBS Data Ingestion Module
Secure, scalable, and Data Act compliant data injection
"""

from .service import DataIngestionService
from .validators import DataValidator, DataActCompliance
from .backends import BackendConnector, VictoriaMetricsClient, OpenObserveClient, RedisClient
from .rate_limiter import RateLimiter, RateLimitConfig
from .schemas import (
    MetricIngestionRequest,
    LogIngestionRequest,
    EventIngestionRequest,
    BatchIngestionRequest,
    IngestionResponse,
    DataCategory,
    DataSensitivity
)

__all__ = [
    'DataIngestionService',
    'DataValidator',
    'DataActCompliance',
    'BackendConnector',
    'VictoriaMetricsClient',
    'OpenObserveClient',
    'RedisClient',
    'RateLimiter',
    'RateLimitConfig',
    'MetricIngestionRequest',
    'LogIngestionRequest',
    'EventIngestionRequest',
    'BatchIngestionRequest',
    'IngestionResponse',
    'DataCategory',
    'DataSensitivity',
]
