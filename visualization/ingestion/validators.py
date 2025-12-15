"""
AIOBS Data Validators
Security validation and Data Act compliance enforcement
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, field
import re
import hashlib
import json
from enum import Enum

from .schemas import (
    DataCategory,
    DataSensitivity,
    MetricIngestionRequest,
    LogIngestionRequest,
    EventIngestionRequest,
    BatchIngestionRequest,
    SecurityTestRequest,
    DataActMetadata
)


class ValidationSeverity(Enum):
    """Validation issue severity"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class ValidationIssue:
    """Single validation issue"""
    code: str
    message: str
    severity: ValidationSeverity
    field: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ValidationResult:
    """Result of validation"""
    is_valid: bool
    issues: List[ValidationIssue] = field(default_factory=list)
    sanitized_data: Optional[Any] = None
    audit_trail: Dict[str, Any] = field(default_factory=dict)

    def add_issue(self, code: str, message: str, severity: ValidationSeverity,
                  field: Optional[str] = None, details: Optional[Dict] = None):
        self.issues.append(ValidationIssue(
            code=code,
            message=message,
            severity=severity,
            field=field,
            details=details or {}
        ))
        if severity in (ValidationSeverity.ERROR, ValidationSeverity.CRITICAL):
            self.is_valid = False


class DataValidator:
    """
    Comprehensive data validator for ingestion
    Handles security threats including prompt injection, SQL injection, etc.
    """

    # Prompt injection patterns
    PROMPT_INJECTION_PATTERNS = [
        r'ignore\s+(previous|all|above)\s+instructions?',
        r'disregard\s+(previous|all|above)',
        r'forget\s+(everything|all|previous)',
        r'system\s*:\s*you\s+are',
        r'assistant\s*:\s*',
        r'\[system\]',
        r'\[assistant\]',
        r'<\|im_start\|>',
        r'<\|im_end\|>',
        r'jailbreak',
        r'pretend\s+you\s+are',
        r'act\s+as\s+if',
        r'roleplay\s+as',
        r'bypass\s+(safety|filter|restriction)',
        r'override\s+(system|instruction)',
        r'new\s+instruction',
        r'from\s+now\s+on',
        r'do\s+not\s+follow\s+(the|your)\s+(rules|instructions)',
    ]

    # SQL injection patterns
    SQL_INJECTION_PATTERNS = [
        r"('\s*(or|and)\s*'?\d*'?\s*=\s*'?\d*)",
        r'(;\s*(drop|delete|truncate|update|insert)\s+)',
        r'(union\s+(all\s+)?select)',
        r'(--\s*$)',
        r'(/\*.*\*/)',
        r"('\s*;\s*--)",
        r'(\bexec\s*\()',
        r'(\bexecute\s+)',
        r'(xp_cmdshell)',
    ]

    # XSS patterns
    XSS_PATTERNS = [
        r'<script[^>]*>',
        r'javascript\s*:',
        r'on(load|error|click|mouseover|submit)\s*=',
        r'<iframe[^>]*>',
        r'<object[^>]*>',
        r'<embed[^>]*>',
        r'expression\s*\(',
        r'vbscript\s*:',
    ]

    # Command injection patterns
    COMMAND_INJECTION_PATTERNS = [
        r'[;&|`$]',
        r'\$\([^)]+\)',
        r'`[^`]+`',
        r'\|\|',
        r'&&',
        r'>\s*/',
        r'<\s*/',
        r'\brm\s+-rf',
        r'\bsudo\b',
        r'\bchmod\b',
        r'\bchown\b',
    ]

    # Sensitive data patterns (for masking)
    SENSITIVE_PATTERNS = {
        'credit_card': r'\b(?:\d{4}[-\s]?){3}\d{4}\b',
        'ssn': r'\b\d{3}-\d{2}-\d{4}\b',
        'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        'phone': r'\b(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b',
        'api_key': r'\b(api[_-]?key|apikey)\s*[=:]\s*["\']?[\w\-]+["\']?',
        'password': r'\b(password|passwd|pwd)\s*[=:]\s*["\']?[^\s"\']+["\']?',
        'bearer_token': r'\bBearer\s+[A-Za-z0-9\-._~+/]+=*',
        'jwt': r'\beyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+',
    }

    def __init__(self, strict_mode: bool = True):
        self.strict_mode = strict_mode
        self._compile_patterns()

    def _compile_patterns(self):
        """Pre-compile regex patterns for performance"""
        self._prompt_injection_re = [
            re.compile(p, re.IGNORECASE) for p in self.PROMPT_INJECTION_PATTERNS
        ]
        self._sql_injection_re = [
            re.compile(p, re.IGNORECASE) for p in self.SQL_INJECTION_PATTERNS
        ]
        self._xss_re = [
            re.compile(p, re.IGNORECASE) for p in self.XSS_PATTERNS
        ]
        self._command_injection_re = [
            re.compile(p) for p in self.COMMAND_INJECTION_PATTERNS
        ]
        self._sensitive_re = {
            k: re.compile(v, re.IGNORECASE)
            for k, v in self.SENSITIVE_PATTERNS.items()
        }

    def validate_metrics(self, request: MetricIngestionRequest) -> ValidationResult:
        """Validate metric ingestion request"""
        result = ValidationResult(is_valid=True)

        # Validate metadata
        self._validate_metadata(request.metadata, result)

        # Validate compliance
        self._validate_compliance(request.compliance, result)

        # Validate each metric
        for i, metric in enumerate(request.metrics):
            # Check metric name for injection
            if self._check_injection(metric.name, result, f"metrics[{i}].name"):
                continue

            # Validate value range
            if not self._validate_metric_value(metric.value, result, f"metrics[{i}].value"):
                continue

            # Check labels for injection
            for key, value in metric.labels.items():
                self._check_injection(key, result, f"metrics[{i}].labels.{key}")
                self._check_injection(value, result, f"metrics[{i}].labels.{key}.value")

        # Generate audit trail
        result.audit_trail = self._generate_audit_trail(request, result)

        return result

    def validate_logs(self, request: LogIngestionRequest) -> ValidationResult:
        """Validate log ingestion request"""
        result = ValidationResult(is_valid=True)

        # Validate metadata
        self._validate_metadata(request.metadata, result)

        # Validate compliance
        self._validate_compliance(request.compliance, result)

        # Validate each log entry
        for i, log in enumerate(request.logs):
            # Check message for injection and sensitive data
            self._check_injection(log.message, result, f"logs[{i}].message")
            self._check_sensitive_data(log.message, result, f"logs[{i}].message")

            # Check context
            context_str = json.dumps(log.context) if log.context else ""
            self._check_injection(context_str, result, f"logs[{i}].context")
            self._check_sensitive_data(context_str, result, f"logs[{i}].context")

            # Check exception/stack trace
            if log.exception:
                self._check_sensitive_data(log.exception, result, f"logs[{i}].exception")
            if log.stack_trace:
                self._check_sensitive_data(log.stack_trace, result, f"logs[{i}].stack_trace")

        result.audit_trail = self._generate_audit_trail(request, result)
        return result

    def validate_events(self, request: EventIngestionRequest) -> ValidationResult:
        """Validate event ingestion request"""
        result = ValidationResult(is_valid=True)

        # Validate metadata
        self._validate_metadata(request.metadata, result)

        # Validate compliance
        self._validate_compliance(request.compliance, result)

        # Validate each event
        for i, event in enumerate(request.events):
            # Check title and description for injection
            self._check_injection(event.title, result, f"events[{i}].title")
            self._check_injection(event.description, result, f"events[{i}].description")

            # Check payload
            payload_str = json.dumps(event.payload) if event.payload else ""
            self._check_injection(payload_str, result, f"events[{i}].payload")
            self._check_sensitive_data(payload_str, result, f"events[{i}].payload")

        result.audit_trail = self._generate_audit_trail(request, result)
        return result

    def validate_batch(self, request: BatchIngestionRequest) -> ValidationResult:
        """Validate batch ingestion request"""
        result = ValidationResult(is_valid=True)

        # Validate metadata
        self._validate_metadata(request.metadata, result)

        # Validate compliance
        self._validate_compliance(request.compliance, result)

        # Validate metrics if present
        if request.metrics:
            for i, metric in enumerate(request.metrics):
                self._check_injection(metric.name, result, f"metrics[{i}].name")
                self._validate_metric_value(metric.value, result, f"metrics[{i}].value")

        # Validate logs if present
        if request.logs:
            for i, log in enumerate(request.logs):
                self._check_injection(log.message, result, f"logs[{i}].message")
                self._check_sensitive_data(log.message, result, f"logs[{i}].message")

        # Validate events if present
        if request.events:
            for i, event in enumerate(request.events):
                self._check_injection(event.title, result, f"events[{i}].title")

        result.audit_trail = self._generate_audit_trail(request, result)
        return result

    def validate_security_test(self, request: SecurityTestRequest) -> ValidationResult:
        """
        Validate security test request
        Note: Security tests are expected to contain malicious patterns - we just verify authorization
        """
        result = ValidationResult(is_valid=True)

        # Verify authorization
        if not request.metadata.source_id:
            result.add_issue(
                "SEC001",
                "Security test requires source_id",
                ValidationSeverity.ERROR,
                "metadata.source_id"
            )

        for test in request.tests:
            if not test.authorized_by:
                result.add_issue(
                    "SEC002",
                    "Security test requires authorization",
                    ValidationSeverity.ERROR,
                    "tests[].authorized_by"
                )
            if not test.authorization_ticket:
                result.add_issue(
                    "SEC003",
                    "Security test requires authorization ticket",
                    ValidationSeverity.ERROR,
                    "tests[].authorization_ticket"
                )

        result.audit_trail = {
            "type": "security_test_validation",
            "timestamp": datetime.utcnow().isoformat(),
            "test_count": len(request.tests),
            "categories": list(set(t.test_category.value for t in request.tests)),
            "dry_run": request.dry_run
        }

        return result

    def _validate_metadata(self, metadata, result: ValidationResult):
        """Validate ingestion metadata"""
        # Check source_id format
        if not re.match(r'^[a-zA-Z0-9_\-\.]+$', metadata.source_id):
            result.add_issue(
                "META001",
                "Invalid source_id format",
                ValidationSeverity.ERROR,
                "metadata.source_id"
            )

        # Check timestamp is not in the future
        if metadata.timestamp > datetime.utcnow() + timedelta(minutes=5):
            result.add_issue(
                "META002",
                "Timestamp cannot be in the future",
                ValidationSeverity.WARNING,
                "metadata.timestamp"
            )

        # Check timestamp is not too old
        if metadata.timestamp < datetime.utcnow() - timedelta(days=7):
            result.add_issue(
                "META003",
                "Timestamp is too old (>7 days)",
                ValidationSeverity.WARNING,
                "metadata.timestamp"
            )

    def _validate_compliance(self, compliance: DataActMetadata, result: ValidationResult):
        """Validate Data Act compliance metadata"""
        # Personal data requires consent
        if compliance.data_category == DataCategory.PERSONAL and not compliance.consent_verified:
            result.add_issue(
                "COMP001",
                "Personal data requires verified consent",
                ValidationSeverity.ERROR,
                "compliance.consent_verified"
            )

        # Cross-border transfer requires special handling
        if compliance.cross_border_transfer and compliance.sensitivity in (
            DataSensitivity.CONFIDENTIAL, DataSensitivity.RESTRICTED
        ):
            result.add_issue(
                "COMP002",
                "Cross-border transfer of sensitive data requires additional verification",
                ValidationSeverity.WARNING,
                "compliance.cross_border_transfer"
            )

        # Restricted data requires explicit legal basis
        if compliance.sensitivity == DataSensitivity.RESTRICTED:
            if compliance.legal_basis == "legitimate_interest":
                result.add_issue(
                    "COMP003",
                    "Restricted data requires explicit legal basis (not just legitimate interest)",
                    ValidationSeverity.ERROR,
                    "compliance.legal_basis"
                )

    def _check_injection(self, value: str, result: ValidationResult, field: str) -> bool:
        """Check for various injection attacks. Returns True if injection detected."""
        if not value:
            return False

        detected = False

        # Check prompt injection
        for pattern in self._prompt_injection_re:
            if pattern.search(value):
                result.add_issue(
                    "INJ001",
                    f"Potential prompt injection detected",
                    ValidationSeverity.CRITICAL if self.strict_mode else ValidationSeverity.WARNING,
                    field,
                    {"pattern": pattern.pattern[:50]}
                )
                detected = True
                break

        # Check SQL injection
        for pattern in self._sql_injection_re:
            if pattern.search(value):
                result.add_issue(
                    "INJ002",
                    "Potential SQL injection detected",
                    ValidationSeverity.CRITICAL if self.strict_mode else ValidationSeverity.WARNING,
                    field,
                    {"pattern": pattern.pattern[:50]}
                )
                detected = True
                break

        # Check XSS
        for pattern in self._xss_re:
            if pattern.search(value):
                result.add_issue(
                    "INJ003",
                    "Potential XSS detected",
                    ValidationSeverity.ERROR,
                    field,
                    {"pattern": pattern.pattern[:50]}
                )
                detected = True
                break

        # Check command injection
        for pattern in self._command_injection_re:
            if pattern.search(value):
                result.add_issue(
                    "INJ004",
                    "Potential command injection detected",
                    ValidationSeverity.CRITICAL if self.strict_mode else ValidationSeverity.WARNING,
                    field,
                    {"pattern": pattern.pattern[:30]}
                )
                detected = True
                break

        return detected

    def _check_sensitive_data(self, value: str, result: ValidationResult, field: str):
        """Check for sensitive data that should be masked"""
        if not value:
            return

        for data_type, pattern in self._sensitive_re.items():
            if pattern.search(value):
                result.add_issue(
                    "SENS001",
                    f"Sensitive data detected: {data_type}",
                    ValidationSeverity.WARNING,
                    field,
                    {"data_type": data_type}
                )

    def _validate_metric_value(self, value: float, result: ValidationResult, field: str) -> bool:
        """Validate metric value is within reasonable bounds"""
        import math

        if math.isnan(value) or math.isinf(value):
            result.add_issue(
                "VAL001",
                "Metric value must be a finite number",
                ValidationSeverity.ERROR,
                field
            )
            return False

        # Check for suspiciously large values
        if abs(value) > 1e15:
            result.add_issue(
                "VAL002",
                "Metric value exceeds reasonable bounds",
                ValidationSeverity.WARNING,
                field
            )

        return True

    def _generate_audit_trail(self, request: Any, result: ValidationResult) -> Dict[str, Any]:
        """Generate audit trail for the validation"""
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "source_id": getattr(request.metadata, 'source_id', 'unknown'),
            "source": getattr(request.metadata, 'source', 'unknown'),
            "validation_passed": result.is_valid,
            "issues_count": len(result.issues),
            "critical_issues": sum(1 for i in result.issues if i.severity == ValidationSeverity.CRITICAL),
            "error_issues": sum(1 for i in result.issues if i.severity == ValidationSeverity.ERROR),
            "integrity_hash": hashlib.sha256(
                f"{request.metadata.source_id}:{datetime.utcnow().isoformat()}".encode()
            ).hexdigest()[:32]
        }


class DataActCompliance:
    """
    EU Data Act compliance verification and enforcement
    """

    # Retention limits by policy
    RETENTION_DAYS = {
        "ephemeral": 0,
        "short": 7,
        "medium": 30,
        "long": 90,
        "archive": 365,
        "permanent": -1  # No limit
    }

    # Required fields for each data category
    REQUIRED_FIELDS = {
        DataCategory.PERSONAL: ["consent_verified", "data_subject_rights", "processing_purpose"],
        DataCategory.FINANCIAL: ["legal_basis", "processing_purpose"],
        DataCategory.CONFIDENTIAL: ["legal_basis", "data_controller"],
    }

    def __init__(self):
        self.audit_log: List[Dict] = []

    def verify_compliance(self, compliance: DataActMetadata) -> Tuple[bool, List[str]]:
        """
        Verify Data Act compliance for given metadata
        Returns (is_compliant, list of issues)
        """
        issues = []

        # Check required fields for category
        required = self.REQUIRED_FIELDS.get(compliance.data_category, [])
        for field in required:
            value = getattr(compliance, field, None)
            if value is None or (isinstance(value, bool) and value is False and field == "consent_verified"):
                if compliance.data_category == DataCategory.PERSONAL:
                    issues.append(f"Field '{field}' is required for {compliance.data_category.value} data")

        # Check cross-border transfer rules
        if compliance.cross_border_transfer:
            if compliance.sensitivity in (DataSensitivity.CONFIDENTIAL, DataSensitivity.RESTRICTED):
                issues.append(
                    "Cross-border transfer of confidential/restricted data requires "
                    "additional safeguards (standard contractual clauses or adequacy decision)"
                )

        # Check retention policy
        if compliance.data_category == DataCategory.PERSONAL:
            if compliance.retention_policy.value in ("permanent", "archive"):
                issues.append(
                    "Personal data cannot have permanent/archive retention policy "
                    "under Data Act requirements"
                )

        # Log audit entry
        self.audit_log.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "compliance_check",
            "data_category": compliance.data_category.value,
            "sensitivity": compliance.sensitivity.value,
            "compliant": len(issues) == 0,
            "issues": issues
        })

        return len(issues) == 0, issues

    def get_retention_days(self, policy: str) -> int:
        """Get retention days for a policy"""
        return self.RETENTION_DAYS.get(policy, 30)

    def can_process(self, compliance: DataActMetadata, purpose: str) -> bool:
        """
        Check if data can be processed for given purpose
        """
        # Personal data requires matching purpose
        if compliance.data_category == DataCategory.PERSONAL:
            if purpose not in compliance.processing_purpose.lower():
                return False

        # Restricted data requires explicit authorization
        if compliance.sensitivity == DataSensitivity.RESTRICTED:
            # Would need additional authorization check here
            pass

        return True

    def generate_compliance_report(self) -> Dict[str, Any]:
        """Generate compliance report from audit log"""
        if not self.audit_log:
            return {"status": "no_data", "entries": 0}

        compliant_count = sum(1 for entry in self.audit_log if entry.get("compliant", False))
        total_count = len(self.audit_log)

        return {
            "status": "compliant" if compliant_count == total_count else "non_compliant",
            "total_checks": total_count,
            "compliant_checks": compliant_count,
            "compliance_rate": round(compliant_count / total_count * 100, 2) if total_count > 0 else 0,
            "categories_checked": list(set(
                entry.get("data_category", "unknown") for entry in self.audit_log
            )),
            "common_issues": self._get_common_issues(),
            "last_check": self.audit_log[-1]["timestamp"] if self.audit_log else None
        }

    def _get_common_issues(self) -> List[Dict[str, Any]]:
        """Get most common compliance issues"""
        issue_counts: Dict[str, int] = {}
        for entry in self.audit_log:
            for issue in entry.get("issues", []):
                issue_counts[issue] = issue_counts.get(issue, 0) + 1

        sorted_issues = sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)
        return [{"issue": issue, "count": count} for issue, count in sorted_issues[:10]]
