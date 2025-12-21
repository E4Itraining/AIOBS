"""
MLflow Connector
Sync MLflow experiments, runs, and model registry with AIOBS
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
from pydantic import BaseModel, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from .base import BaseIntegration, IntegrationHealth, IntegrationStatus, SyncResult

logger = logging.getLogger("aiobs.integrations.mlflow")


class MLflowSettings(BaseSettings):
    """MLflow integration settings"""

    model_config = SettingsConfigDict(
        env_prefix="AIOBS_MLFLOW_",
        case_sensitive=False,
        extra="ignore"
    )

    enabled: bool = Field(default=False, description="Enable MLflow integration")
    tracking_uri: str = Field(
        default="http://localhost:5000",
        description="MLflow tracking server URI"
    )
    username: str = Field(default="", description="MLflow username (if auth enabled)")
    password: SecretStr = Field(default=SecretStr(""), description="MLflow password")
    sync_experiments: bool = Field(default=True, description="Sync experiments")
    sync_models: bool = Field(default=True, description="Sync model registry")
    sync_interval_minutes: int = Field(default=15, ge=1, le=1440)


class MLflowExperiment(BaseModel):
    """MLflow experiment data"""
    experiment_id: str
    name: str
    artifact_location: str
    lifecycle_stage: str
    creation_time: Optional[datetime] = None
    last_update_time: Optional[datetime] = None
    run_count: int = 0


class MLflowRun(BaseModel):
    """MLflow run data"""
    run_id: str
    experiment_id: str
    status: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    metrics: Dict[str, float] = Field(default_factory=dict)
    params: Dict[str, str] = Field(default_factory=dict)
    tags: Dict[str, str] = Field(default_factory=dict)


class MLflowModel(BaseModel):
    """MLflow registered model"""
    name: str
    creation_timestamp: Optional[datetime] = None
    last_updated_timestamp: Optional[datetime] = None
    description: str = ""
    latest_versions: List[Dict[str, Any]] = Field(default_factory=list)


class MLflowConnector(BaseIntegration):
    """Connector for MLflow tracking server and model registry"""

    def __init__(self, settings: Optional[MLflowSettings] = None):
        super().__init__("mlflow")
        self.settings = settings or MLflowSettings()
        self._client: Optional[httpx.AsyncClient] = None
        self._experiments: List[MLflowExperiment] = []
        self._models: List[MLflowModel] = []

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None:
            headers = {}
            auth = None

            if self.settings.username and self.settings.password.get_secret_value():
                auth = (self.settings.username, self.settings.password.get_secret_value())

            self._client = httpx.AsyncClient(
                base_url=self.settings.tracking_uri,
                timeout=30.0,
                auth=auth,
                headers=headers,
            )
        return self._client

    async def connect(self) -> bool:
        """Connect to MLflow tracking server"""
        if not self.settings.enabled:
            logger.info("MLflow integration is disabled")
            return False

        try:
            client = await self._get_client()
            # Test connection with experiments list
            response = await client.get("/api/2.0/mlflow/experiments/list")

            if response.status_code == 200:
                self._status = IntegrationStatus.CONNECTED
                logger.info(f"Connected to MLflow at {self.settings.tracking_uri}")
                return True
            else:
                self._status = IntegrationStatus.ERROR
                self._error = f"MLflow returned status {response.status_code}"
                logger.error(self._error)
                return False

        except Exception as e:
            self._status = IntegrationStatus.ERROR
            self._error = str(e)
            logger.exception(f"Failed to connect to MLflow: {e}")
            return False

    async def disconnect(self) -> None:
        """Disconnect from MLflow"""
        if self._client:
            await self._client.aclose()
            self._client = None
        self._status = IntegrationStatus.DISCONNECTED
        logger.info("Disconnected from MLflow")

    async def health_check(self) -> IntegrationHealth:
        """Check MLflow connection health"""
        if not self.settings.enabled:
            return IntegrationHealth(status=IntegrationStatus.DISCONNECTED)

        try:
            client = await self._get_client()
            response = await client.get("/health")

            if response.status_code == 200:
                return IntegrationHealth(
                    status=IntegrationStatus.CONNECTED,
                    last_sync=self._last_sync,
                    items_synced=len(self._experiments) + len(self._models),
                )
            else:
                return IntegrationHealth(
                    status=IntegrationStatus.ERROR,
                    error_message=f"Health check failed: {response.status_code}",
                )

        except Exception as e:
            return IntegrationHealth(
                status=IntegrationStatus.ERROR,
                error_message=str(e),
            )

    async def sync(self) -> SyncResult:
        """Sync data from MLflow"""
        if not self.settings.enabled:
            return SyncResult(success=False, errors=["MLflow integration is disabled"])

        start_time = datetime.utcnow()
        self._status = IntegrationStatus.SYNCING
        items_synced = 0
        errors = []

        try:
            # Sync experiments
            if self.settings.sync_experiments:
                experiments = await self.sync_experiments()
                items_synced += len(experiments)

            # Sync models
            if self.settings.sync_models:
                models = await self.sync_models()
                items_synced += len(models)

            self._status = IntegrationStatus.CONNECTED
            self._last_sync = datetime.utcnow()

            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            logger.info(f"MLflow sync completed: {items_synced} items in {duration_ms}ms")

            return SyncResult(
                success=True,
                items_synced=items_synced,
                duration_ms=duration_ms,
            )

        except Exception as e:
            self._status = IntegrationStatus.ERROR
            self._error = str(e)
            errors.append(str(e))
            logger.exception(f"MLflow sync failed: {e}")

            return SyncResult(
                success=False,
                items_synced=items_synced,
                errors=errors,
            )

    async def sync_experiments(self) -> List[MLflowExperiment]:
        """Sync experiments from MLflow"""
        try:
            client = await self._get_client()
            response = await client.get("/api/2.0/mlflow/experiments/list")

            if response.status_code != 200:
                raise Exception(f"Failed to list experiments: {response.status_code}")

            data = response.json()
            experiments = []

            for exp in data.get("experiments", []):
                experiments.append(MLflowExperiment(
                    experiment_id=exp.get("experiment_id", ""),
                    name=exp.get("name", ""),
                    artifact_location=exp.get("artifact_location", ""),
                    lifecycle_stage=exp.get("lifecycle_stage", "active"),
                ))

            self._experiments = experiments
            logger.info(f"Synced {len(experiments)} MLflow experiments")
            return experiments

        except Exception as e:
            logger.exception(f"Failed to sync MLflow experiments: {e}")
            return []

    async def sync_models(self) -> List[MLflowModel]:
        """Sync registered models from MLflow model registry"""
        try:
            client = await self._get_client()
            response = await client.get("/api/2.0/mlflow/registered-models/list")

            if response.status_code != 200:
                raise Exception(f"Failed to list models: {response.status_code}")

            data = response.json()
            models = []

            for model in data.get("registered_models", []):
                models.append(MLflowModel(
                    name=model.get("name", ""),
                    description=model.get("description", ""),
                    latest_versions=model.get("latest_versions", []),
                ))

            self._models = models
            logger.info(f"Synced {len(models)} MLflow models")
            return models

        except Exception as e:
            logger.exception(f"Failed to sync MLflow models: {e}")
            return []

    async def get_run_metrics(self, run_id: str) -> Dict[str, float]:
        """Get metrics for a specific run"""
        try:
            client = await self._get_client()
            response = await client.get(f"/api/2.0/mlflow/runs/get?run_id={run_id}")

            if response.status_code != 200:
                return {}

            data = response.json()
            run_data = data.get("run", {}).get("data", {})
            metrics = {}

            for metric in run_data.get("metrics", []):
                metrics[metric.get("key", "")] = metric.get("value", 0.0)

            return metrics

        except Exception as e:
            logger.exception(f"Failed to get run metrics: {e}")
            return {}

    def get_experiments(self) -> List[MLflowExperiment]:
        """Get cached experiments"""
        return self._experiments

    def get_models(self) -> List[MLflowModel]:
        """Get cached models"""
        return self._models
