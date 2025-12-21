"""
AIOBS SDK Exceptions
Custom exception classes for the SDK
"""

from typing import Optional


class AIObsError(Exception):
    """Base exception for all AIOBS SDK errors"""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        response_body: Optional[str] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.response_body = response_body
        super().__init__(self.message)

    def __str__(self) -> str:
        if self.status_code:
            return f"[{self.status_code}] {self.message}"
        return self.message


class AuthenticationError(AIObsError):
    """Raised when authentication fails"""

    def __init__(
        self,
        message: str = "Authentication failed",
        status_code: Optional[int] = 401,
        response_body: Optional[str] = None,
    ):
        super().__init__(message, status_code, response_body)


class RateLimitError(AIObsError):
    """Raised when rate limit is exceeded"""

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        status_code: int = 429,
        retry_after: Optional[int] = None,
        response_body: Optional[str] = None,
    ):
        self.retry_after = retry_after
        super().__init__(message, status_code, response_body)

    def __str__(self) -> str:
        msg = super().__str__()
        if self.retry_after:
            msg += f" (retry after {self.retry_after}s)"
        return msg


class ValidationError(AIObsError):
    """Raised when request validation fails"""

    def __init__(
        self,
        message: str = "Validation error",
        status_code: int = 400,
        errors: Optional[list] = None,
        response_body: Optional[str] = None,
    ):
        self.errors = errors or []
        super().__init__(message, status_code, response_body)


class ConnectionError(AIObsError):
    """Raised when connection to AIOBS server fails"""

    def __init__(
        self,
        message: str = "Connection failed",
        original_error: Optional[Exception] = None,
    ):
        self.original_error = original_error
        super().__init__(message)

    def __str__(self) -> str:
        if self.original_error:
            return f"{self.message}: {self.original_error}"
        return self.message


class TimeoutError(AIObsError):
    """Raised when request times out"""

    def __init__(
        self,
        message: str = "Request timed out",
        timeout_seconds: Optional[float] = None,
    ):
        self.timeout_seconds = timeout_seconds
        super().__init__(message)


class ServerError(AIObsError):
    """Raised when server returns 5xx error"""

    def __init__(
        self,
        message: str = "Server error",
        status_code: int = 500,
        response_body: Optional[str] = None,
    ):
        super().__init__(message, status_code, response_body)


class ConfigurationError(AIObsError):
    """Raised when SDK configuration is invalid"""

    def __init__(self, message: str = "Configuration error"):
        super().__init__(message)
