"""
AIOBS Data Ingestion Service
Central service for secure, scalable, and compliant data injection
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
import asyncio
import hashlib
import uuid
import json
import os

from .schemas import (
    MetricIngestionRequest,
    LogIngestionRequest,
    EventIngestionRequest,
    BatchIngestionRequest,
    SecurityTestRequest,
    IngestionResponse,
    IngestionStatus,
    DataCategory,
    MetricValue,
    LogEntry,
    Event
)
from .validators import DataValidator, DataActCompliance, ValidationResult, ValidationSeverity
from .rate_limiter import RateLimiter, RateLimitConfig, AdaptiveRateLimiter
from .backends import (
    BackendManager,
    VictoriaMetricsClient,
    OpenObserveClient,
    RedisClient,
    backend_manager
)


@dataclass
class IngestionStats:
    """Statistics for ingestion operations"""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    rate_limited_requests: int = 0

    total_metrics: int = 0
    total_logs: int = 0
    total_events: int = 0

    total_bytes: int = 0

    validation_failures: int = 0
    compliance_failures: int = 0

    last_ingestion: Optional[datetime] = None
    start_time: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict:
        return {
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "rate_limited_requests": self.rate_limited_requests,
            "success_rate": round(
                self.successful_requests / self.total_requests * 100, 2
            ) if self.total_requests > 0 else 0,
            "total_metrics": self.total_metrics,
            "total_logs": self.total_logs,
            "total_events": self.total_events,
            "total_bytes": self.total_bytes,
            "validation_failures": self.validation_failures,
            "compliance_failures": self.compliance_failures,
            "last_ingestion": self.last_ingestion.isoformat() if self.last_ingestion else None,
            "uptime_seconds": (datetime.utcnow() - self.start_time).total_seconds()
        }


class DataIngestionService:
    """
    Main data ingestion service
    Handles validation, compliance, rate limiting, and storage
    """

    def __init__(
        self,
        validator: Optional[DataValidator] = None,
        compliance: Optional[DataActCompliance] = None,
        rate_limiter: Optional[RateLimiter] = None,
        backend: Optional[BackendManager] = None
    ):
        self.validator = validator or DataValidator(strict_mode=True)
        self.compliance = compliance or DataActCompliance()
        self.rate_limiter = rate_limiter or AdaptiveRateLimiter(RateLimitConfig(
            requests_per_second=100,
            requests_per_minute=3000,
            bytes_per_second=10 * 1024 * 1024
        ))
        self.backend = backend or backend_manager

        self.stats = IngestionStats()
        self._audit_buffer: List[Dict] = []
        self._audit_buffer_max = 1000
        self._initialized = False

    async def initialize(self):
        """Initialize the service and backends"""
        if self._initialized:
            return

        await self.backend.initialize()
        self._initialized = True

    async def shutdown(self):
        """Shutdown the service gracefully"""
        # Flush audit buffer
        await self._flush_audit_buffer()

        # Close backends
        await self.backend.close()

        self._initialized = False

    # =========================================================================
    # Main Ingestion Methods
    # =========================================================================

    async def ingest_metrics(
        self,
        request: MetricIngestionRequest
    ) -> IngestionResponse:
        """
        Ingest metrics into VictoriaMetrics

        Args:
            request: Metric ingestion request

        Returns:
            IngestionResponse with status and details
        """
        request_id = self._generate_request_id()
        self.stats.total_requests += 1

        # Check rate limit
        rate_result = await self.rate_limiter.check_rate_limit(
            request.metadata.source_id,
            self._estimate_request_size(request)
        )

        if not rate_result.allowed:
            self.stats.rate_limited_requests += 1
            return IngestionResponse(
                status=IngestionStatus.RATE_LIMITED,
                request_id=request_id,
                metrics_received=len(request.metrics),
                metrics_processed=0,
                errors=[{"code": "RATE_LIMIT", "message": rate_result.reason}],
                rate_limit_remaining=rate_result.remaining_requests,
                rate_limit_reset=rate_result.reset_time
            )

        # Validate request
        validation_result = self.validator.validate_metrics(request)

        if not validation_result.is_valid:
            self.stats.validation_failures += 1
            return IngestionResponse(
                status=IngestionStatus.FAILED,
                request_id=request_id,
                metrics_received=len(request.metrics),
                metrics_processed=0,
                errors=[
                    {"code": i.code, "message": i.message, "field": i.field}
                    for i in validation_result.issues
                    if i.severity in (ValidationSeverity.ERROR, ValidationSeverity.CRITICAL)
                ],
                warnings=[i.message for i in validation_result.issues if i.severity == ValidationSeverity.WARNING],
                audit_id=validation_result.audit_trail.get("integrity_hash")
            )

        # Check compliance
        is_compliant, compliance_issues = self.compliance.verify_compliance(request.compliance)

        if not is_compliant:
            self.stats.compliance_failures += 1
            return IngestionResponse(
                status=IngestionStatus.FAILED,
                request_id=request_id,
                metrics_received=len(request.metrics),
                metrics_processed=0,
                errors=[{"code": "COMPLIANCE", "message": issue} for issue in compliance_issues],
                audit_id=validation_result.audit_trail.get("integrity_hash")
            )

        # Write to VictoriaMetrics
        if not self._initialized:
            await self.initialize()

        metrics_data = [
            {
                "name": m.name,
                "value": m.value,
                "labels": m.labels,
                "timestamp": m.timestamp or request.metadata.timestamp
            }
            for m in request.metrics
        ]

        write_result = await self.backend.victoria_metrics.write_metrics(metrics_data)

        if write_result.get("success"):
            self.stats.successful_requests += 1
            self.stats.total_metrics += len(request.metrics)
            self.stats.last_ingestion = datetime.utcnow()

            # Record audit
            await self._record_audit(
                "metrics_ingestion",
                request.metadata.source_id,
                len(request.metrics),
                validation_result.audit_trail
            )

            return IngestionResponse(
                status=IngestionStatus.SUCCESS,
                request_id=request_id,
                metrics_received=len(request.metrics),
                metrics_processed=write_result.get("written", 0),
                audit_id=validation_result.audit_trail.get("integrity_hash"),
                integrity_hash=self._compute_integrity_hash(request.metrics),
                rate_limit_remaining=rate_result.remaining_requests
            )
        else:
            self.stats.failed_requests += 1
            return IngestionResponse(
                status=IngestionStatus.FAILED,
                request_id=request_id,
                metrics_received=len(request.metrics),
                metrics_processed=0,
                errors=[{"code": "WRITE_ERROR", "message": write_result.get("error", "Unknown error")}]
            )

    async def ingest_logs(
        self,
        request: LogIngestionRequest
    ) -> IngestionResponse:
        """
        Ingest logs into OpenObserve

        Args:
            request: Log ingestion request

        Returns:
            IngestionResponse with status and details
        """
        request_id = self._generate_request_id()
        self.stats.total_requests += 1

        # Check rate limit
        rate_result = await self.rate_limiter.check_rate_limit(
            request.metadata.source_id,
            self._estimate_request_size(request)
        )

        if not rate_result.allowed:
            self.stats.rate_limited_requests += 1
            return IngestionResponse(
                status=IngestionStatus.RATE_LIMITED,
                request_id=request_id,
                logs_received=len(request.logs),
                logs_processed=0,
                errors=[{"code": "RATE_LIMIT", "message": rate_result.reason}],
                rate_limit_remaining=rate_result.remaining_requests,
                rate_limit_reset=rate_result.reset_time
            )

        # Validate request
        validation_result = self.validator.validate_logs(request)

        if not validation_result.is_valid:
            self.stats.validation_failures += 1
            return IngestionResponse(
                status=IngestionStatus.FAILED,
                request_id=request_id,
                logs_received=len(request.logs),
                logs_processed=0,
                errors=[
                    {"code": i.code, "message": i.message, "field": i.field}
                    for i in validation_result.issues
                    if i.severity in (ValidationSeverity.ERROR, ValidationSeverity.CRITICAL)
                ],
                warnings=[i.message for i in validation_result.issues if i.severity == ValidationSeverity.WARNING],
                audit_id=validation_result.audit_trail.get("integrity_hash")
            )

        # Check compliance
        is_compliant, compliance_issues = self.compliance.verify_compliance(request.compliance)

        if not is_compliant:
            self.stats.compliance_failures += 1
            return IngestionResponse(
                status=IngestionStatus.FAILED,
                request_id=request_id,
                logs_received=len(request.logs),
                logs_processed=0,
                errors=[{"code": "COMPLIANCE", "message": issue} for issue in compliance_issues]
            )

        # Write to OpenObserve
        if not self._initialized:
            await self.initialize()

        logs_data = [
            {
                "level": log.level.value,
                "message": log.message,
                "timestamp": log.timestamp,
                "logger": log.logger,
                "context": log.context,
                "exception": log.exception,
                "stack_trace": log.stack_trace
            }
            for log in request.logs
        ]

        success = await self.backend.openobserve.write_logs(request.stream, logs_data)

        if success:
            self.stats.successful_requests += 1
            self.stats.total_logs += len(request.logs)
            self.stats.last_ingestion = datetime.utcnow()

            # Record audit
            await self._record_audit(
                "logs_ingestion",
                request.metadata.source_id,
                len(request.logs),
                validation_result.audit_trail
            )

            return IngestionResponse(
                status=IngestionStatus.SUCCESS,
                request_id=request_id,
                logs_received=len(request.logs),
                logs_processed=len(request.logs),
                audit_id=validation_result.audit_trail.get("integrity_hash"),
                rate_limit_remaining=rate_result.remaining_requests
            )
        else:
            self.stats.failed_requests += 1
            return IngestionResponse(
                status=IngestionStatus.FAILED,
                request_id=request_id,
                logs_received=len(request.logs),
                logs_processed=0,
                errors=[{"code": "WRITE_ERROR", "message": "Failed to write logs to OpenObserve"}]
            )

    async def ingest_events(
        self,
        request: EventIngestionRequest
    ) -> IngestionResponse:
        """
        Ingest events and broadcast via Redis pub/sub

        Args:
            request: Event ingestion request

        Returns:
            IngestionResponse with status and details
        """
        request_id = self._generate_request_id()
        self.stats.total_requests += 1

        # Check rate limit
        rate_result = await self.rate_limiter.check_rate_limit(
            request.metadata.source_id,
            self._estimate_request_size(request)
        )

        if not rate_result.allowed:
            self.stats.rate_limited_requests += 1
            return IngestionResponse(
                status=IngestionStatus.RATE_LIMITED,
                request_id=request_id,
                events_received=len(request.events),
                events_processed=0,
                errors=[{"code": "RATE_LIMIT", "message": rate_result.reason}],
                rate_limit_remaining=rate_result.remaining_requests,
                rate_limit_reset=rate_result.reset_time
            )

        # Validate request
        validation_result = self.validator.validate_events(request)

        if not validation_result.is_valid:
            self.stats.validation_failures += 1
            return IngestionResponse(
                status=IngestionStatus.FAILED,
                request_id=request_id,
                events_received=len(request.events),
                events_processed=0,
                errors=[
                    {"code": i.code, "message": i.message, "field": i.field}
                    for i in validation_result.issues
                    if i.severity in (ValidationSeverity.ERROR, ValidationSeverity.CRITICAL)
                ]
            )

        # Write to Redis and broadcast
        if not self._initialized:
            await self.initialize()

        processed = 0
        for event in request.events:
            event_data = {
                "type": event.event_type.value,
                "severity": event.severity.value,
                "title": event.title,
                "description": event.description,
                "timestamp": event.timestamp.isoformat(),
                "source_service": event.source_service,
                "affected_services": event.affected_services,
                "payload": event.payload
            }

            # Store event in Redis list
            await self.backend.redis.lpush("aiobs:events", event_data)
            await self.backend.redis.ltrim("aiobs:events", 0, 9999)  # Keep last 10k events

            # Broadcast to channels
            for channel in request.channels:
                subscribers = await self.backend.redis.publish(f"aiobs:{channel}", event_data)

            processed += 1

        self.stats.successful_requests += 1
        self.stats.total_events += processed
        self.stats.last_ingestion = datetime.utcnow()

        return IngestionResponse(
            status=IngestionStatus.SUCCESS,
            request_id=request_id,
            events_received=len(request.events),
            events_processed=processed,
            audit_id=validation_result.audit_trail.get("integrity_hash"),
            rate_limit_remaining=rate_result.remaining_requests
        )

    async def ingest_batch(
        self,
        request: BatchIngestionRequest
    ) -> IngestionResponse:
        """
        Batch ingestion for metrics, logs, and events

        Args:
            request: Batch ingestion request

        Returns:
            IngestionResponse with aggregated status
        """
        request_id = self._generate_request_id()
        self.stats.total_requests += 1

        # Check rate limit for combined size
        total_size = self._estimate_request_size(request)
        rate_result = await self.rate_limiter.check_rate_limit(
            request.metadata.source_id,
            total_size
        )

        if not rate_result.allowed:
            self.stats.rate_limited_requests += 1
            return IngestionResponse(
                status=IngestionStatus.RATE_LIMITED,
                request_id=request_id,
                metrics_received=len(request.metrics) if request.metrics else 0,
                logs_received=len(request.logs) if request.logs else 0,
                events_received=len(request.events) if request.events else 0,
                errors=[{"code": "RATE_LIMIT", "message": rate_result.reason}]
            )

        # Validate batch
        validation_result = self.validator.validate_batch(request)

        if not validation_result.is_valid:
            self.stats.validation_failures += 1
            return IngestionResponse(
                status=IngestionStatus.FAILED,
                request_id=request_id,
                errors=[
                    {"code": i.code, "message": i.message, "field": i.field}
                    for i in validation_result.issues
                    if i.severity in (ValidationSeverity.ERROR, ValidationSeverity.CRITICAL)
                ]
            )

        # Check compliance
        is_compliant, compliance_issues = self.compliance.verify_compliance(request.compliance)

        if not is_compliant:
            self.stats.compliance_failures += 1
            return IngestionResponse(
                status=IngestionStatus.FAILED,
                request_id=request_id,
                errors=[{"code": "COMPLIANCE", "message": issue} for issue in compliance_issues]
            )

        if not self._initialized:
            await self.initialize()

        # Process each type
        metrics_processed = 0
        logs_processed = 0
        events_processed = 0
        errors = []

        # Write metrics
        if request.metrics:
            metrics_data = [
                {
                    "name": m.name,
                    "value": m.value,
                    "labels": m.labels,
                    "timestamp": m.timestamp or request.metadata.timestamp
                }
                for m in request.metrics
            ]
            result = await self.backend.victoria_metrics.write_metrics(metrics_data)
            if result.get("success"):
                metrics_processed = result.get("written", 0)
            else:
                errors.append({"code": "METRICS_ERROR", "message": result.get("error")})

        # Write logs
        if request.logs:
            logs_data = [
                {
                    "level": log.level.value,
                    "message": log.message,
                    "timestamp": log.timestamp,
                    "logger": log.logger,
                    "context": log.context
                }
                for log in request.logs
            ]
            if await self.backend.openobserve.write_logs("aiobs-logs", logs_data):
                logs_processed = len(request.logs)
            else:
                errors.append({"code": "LOGS_ERROR", "message": "Failed to write logs"})

        # Process events
        if request.events:
            for event in request.events:
                event_data = {
                    "type": event.event_type.value,
                    "severity": event.severity.value,
                    "title": event.title,
                    "timestamp": event.timestamp.isoformat()
                }
                await self.backend.redis.lpush("aiobs:events", event_data)
                events_processed += 1

        # Update stats
        self.stats.total_metrics += metrics_processed
        self.stats.total_logs += logs_processed
        self.stats.total_events += events_processed
        self.stats.total_bytes += total_size
        self.stats.last_ingestion = datetime.utcnow()

        if errors:
            self.stats.failed_requests += 1
            status = IngestionStatus.PARTIAL
        else:
            self.stats.successful_requests += 1
            status = IngestionStatus.SUCCESS

        return IngestionResponse(
            status=status,
            request_id=request_id,
            metrics_received=len(request.metrics) if request.metrics else 0,
            metrics_processed=metrics_processed,
            logs_received=len(request.logs) if request.logs else 0,
            logs_processed=logs_processed,
            events_received=len(request.events) if request.events else 0,
            events_processed=events_processed,
            errors=errors,
            audit_id=validation_result.audit_trail.get("integrity_hash"),
            rate_limit_remaining=rate_result.remaining_requests
        )

    async def ingest_security_test(
        self,
        request: SecurityTestRequest
    ) -> IngestionResponse:
        """
        Ingest security test payloads for authorized testing

        Args:
            request: Security test request

        Returns:
            IngestionResponse with test results
        """
        request_id = self._generate_request_id()

        # Validate authorization
        validation_result = self.validator.validate_security_test(request)

        if not validation_result.is_valid:
            return IngestionResponse(
                status=IngestionStatus.FAILED,
                request_id=request_id,
                errors=[
                    {"code": i.code, "message": i.message}
                    for i in validation_result.issues
                ]
            )

        # Record security test for audit
        await self._record_audit(
            "security_test",
            request.metadata.source_id,
            len(request.tests),
            {
                "categories": list(set(t.test_category.value for t in request.tests)),
                "dry_run": request.dry_run,
                "authorized_by": request.tests[0].authorized_by if request.tests else "unknown"
            }
        )

        return IngestionResponse(
            status=IngestionStatus.SUCCESS,
            request_id=request_id,
            events_received=len(request.tests),
            events_processed=len(request.tests),
            audit_id=validation_result.audit_trail.get("integrity_hash")
        )

    # =========================================================================
    # Query Methods
    # =========================================================================

    async def query_metrics(
        self,
        query: str,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Query metrics from VictoriaMetrics"""
        if not self._initialized:
            await self.initialize()

        if start and end:
            return await self.backend.victoria_metrics.query_range(
                query, start, end
            )
        else:
            return await self.backend.victoria_metrics.query(query)

    async def query_logs(
        self,
        query: str,
        stream: str = "aiobs-logs",
        limit: int = 100
    ) -> Dict[str, Any]:
        """Query logs from OpenObserve"""
        if not self._initialized:
            await self.initialize()

        return await self.backend.openobserve.search_logs(stream, query, limit=limit)

    async def get_recent_events(self, limit: int = 100) -> List[Dict]:
        """Get recent events from Redis"""
        if not self._initialized:
            await self.initialize()

        return await self.backend.redis.lrange("aiobs:events", 0, limit - 1)

    # =========================================================================
    # Helper Methods
    # =========================================================================

    def _generate_request_id(self) -> str:
        """Generate unique request ID"""
        return str(uuid.uuid4())

    def _estimate_request_size(self, request: Any) -> int:
        """Estimate request size in bytes"""
        try:
            return len(json.dumps(request.model_dump(), default=str).encode())
        except Exception:
            return 1000  # Default estimate

    def _compute_integrity_hash(self, data: Any) -> str:
        """Compute integrity hash for data"""
        content = json.dumps(data, default=str, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()[:32]

    async def _record_audit(
        self,
        action: str,
        source_id: str,
        count: int,
        details: Dict
    ):
        """Record audit entry"""
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "action": action,
            "source_id": source_id,
            "count": count,
            "details": details
        }

        self._audit_buffer.append(entry)

        # Flush if buffer is full
        if len(self._audit_buffer) >= self._audit_buffer_max:
            await self._flush_audit_buffer()

    async def _flush_audit_buffer(self):
        """Flush audit buffer to storage"""
        if not self._audit_buffer:
            return

        if self._initialized and self.backend.openobserve:
            logs = [
                {
                    "level": "info",
                    "message": f"Audit: {entry['action']}",
                    "timestamp": datetime.fromisoformat(entry['timestamp']),
                    "logger": "audit",
                    "context": entry
                }
                for entry in self._audit_buffer
            ]
            await self.backend.openobserve.write_logs("aiobs-audit", logs)

        self._audit_buffer = []

    async def get_stats(self) -> Dict:
        """Get ingestion statistics"""
        stats = self.stats.to_dict()

        # Add rate limiter stats
        if self.rate_limiter:
            stats["rate_limiter"] = await self.rate_limiter.get_stats()

        # Add backend status
        if self._initialized:
            stats["backends"] = await self.backend.get_status()

        # Add compliance report
        stats["compliance"] = self.compliance.generate_compliance_report()

        return stats

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        if not self._initialized:
            await self.initialize()

        backend_health = await self.backend.health_check_all()

        return {
            "status": "healthy" if all(backend_health.values()) else "degraded",
            "backends": backend_health,
            "stats": {
                "total_requests": self.stats.total_requests,
                "success_rate": round(
                    self.stats.successful_requests / self.stats.total_requests * 100, 2
                ) if self.stats.total_requests > 0 else 100
            }
        }


# Global service instance
ingestion_service = DataIngestionService()
