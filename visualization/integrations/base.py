"""
Base Integration Class
Abstract base for all external integrations
"""

import logging
from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

logger = logging.getLogger("aiobs.integrations")


class IntegrationStatus(str, Enum):
    """Integration connection status"""
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    SYNCING = "syncing"


class IntegrationHealth(BaseModel):
    """Integration health status"""
    status: IntegrationStatus
    last_sync: Optional[datetime] = None
    error_message: Optional[str] = None
    items_synced: int = 0
    sync_duration_ms: Optional[int] = None


class SyncResult(BaseModel):
    """Result of a sync operation"""
    success: bool
    items_synced: int = 0
    items_failed: int = 0
    errors: List[str] = Field(default_factory=list)
    duration_ms: int = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class BaseIntegration(ABC):
    """Abstract base class for external integrations"""

    def __init__(self, name: str):
        self.name = name
        self._status = IntegrationStatus.DISCONNECTED
        self._last_sync: Optional[datetime] = None
        self._error: Optional[str] = None

    @property
    def status(self) -> IntegrationStatus:
        return self._status

    @abstractmethod
    async def connect(self) -> bool:
        """Establish connection to external service"""
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Close connection to external service"""
        pass

    @abstractmethod
    async def health_check(self) -> IntegrationHealth:
        """Check integration health"""
        pass

    @abstractmethod
    async def sync(self) -> SyncResult:
        """Synchronize data from external service"""
        pass

    def get_health(self) -> IntegrationHealth:
        """Get current health status"""
        return IntegrationHealth(
            status=self._status,
            last_sync=self._last_sync,
            error_message=self._error,
        )


class IntegrationConfig(BaseModel):
    """Base configuration for integrations"""
    enabled: bool = False
    sync_interval_minutes: int = Field(default=15, ge=1, le=1440)
    auto_sync: bool = True
