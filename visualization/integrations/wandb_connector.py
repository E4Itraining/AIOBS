"""
Weights & Biases Connector
Sync W&B projects, runs, and artifacts with AIOBS
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
from pydantic import BaseModel, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from .base import BaseIntegration, IntegrationHealth, IntegrationStatus, SyncResult

logger = logging.getLogger("aiobs.integrations.wandb")


class WandbSettings(BaseSettings):
    """Weights & Biases integration settings"""

    model_config = SettingsConfigDict(
        env_prefix="AIOBS_WANDB_",
        case_sensitive=False,
        extra="ignore"
    )

    enabled: bool = Field(default=False, description="Enable W&B integration")
    api_key: SecretStr = Field(default=SecretStr(""), description="W&B API key")
    base_url: str = Field(
        default="https://api.wandb.ai",
        description="W&B API base URL"
    )
    entity: str = Field(default="", description="W&B entity (team or user)")
    project: str = Field(default="", description="Default W&B project")
    sync_runs: bool = Field(default=True, description="Sync runs")
    sync_artifacts: bool = Field(default=True, description="Sync artifacts")
    sync_interval_minutes: int = Field(default=15, ge=1, le=1440)


class WandbProject(BaseModel):
    """W&B project data"""
    id: str
    name: str
    entity: str
    description: str = ""
    created_at: Optional[datetime] = None
    run_count: int = 0


class WandbRun(BaseModel):
    """W&B run data"""
    id: str
    name: str
    display_name: str = ""
    project: str
    entity: str
    state: str
    created_at: Optional[datetime] = None
    summary: Dict[str, Any] = Field(default_factory=dict)
    config: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)


class WandbArtifact(BaseModel):
    """W&B artifact data"""
    id: str
    name: str
    type: str
    version: str
    created_at: Optional[datetime] = None
    size_bytes: int = 0
    metadata: Dict[str, Any] = Field(default_factory=dict)


class WandbConnector(BaseIntegration):
    """Connector for Weights & Biases platform"""

    def __init__(self, settings: Optional[WandbSettings] = None):
        super().__init__("wandb")
        self.settings = settings or WandbSettings()
        self._client: Optional[httpx.AsyncClient] = None
        self._projects: List[WandbProject] = []
        self._runs: List[WandbRun] = []
        self._artifacts: List[WandbArtifact] = []

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client with W&B auth"""
        if self._client is None:
            api_key = self.settings.api_key.get_secret_value()
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }

            self._client = httpx.AsyncClient(
                base_url=self.settings.base_url,
                timeout=30.0,
                headers=headers,
            )
        return self._client

    async def connect(self) -> bool:
        """Connect to W&B API"""
        if not self.settings.enabled:
            logger.info("W&B integration is disabled")
            return False

        if not self.settings.api_key.get_secret_value():
            logger.error("W&B API key not configured")
            self._status = IntegrationStatus.ERROR
            self._error = "API key not configured"
            return False

        try:
            client = await self._get_client()
            # Test connection with viewer query
            response = await client.get("/graphql", params={
                "query": "{ viewer { id entity } }"
            })

            if response.status_code == 200:
                self._status = IntegrationStatus.CONNECTED
                logger.info(f"Connected to W&B ({self.settings.base_url})")
                return True
            else:
                self._status = IntegrationStatus.ERROR
                self._error = f"W&B returned status {response.status_code}"
                logger.error(self._error)
                return False

        except Exception as e:
            self._status = IntegrationStatus.ERROR
            self._error = str(e)
            logger.exception(f"Failed to connect to W&B: {e}")
            return False

    async def disconnect(self) -> None:
        """Disconnect from W&B"""
        if self._client:
            await self._client.aclose()
            self._client = None
        self._status = IntegrationStatus.DISCONNECTED
        logger.info("Disconnected from W&B")

    async def health_check(self) -> IntegrationHealth:
        """Check W&B connection health"""
        if not self.settings.enabled:
            return IntegrationHealth(status=IntegrationStatus.DISCONNECTED)

        try:
            client = await self._get_client()
            response = await client.get("/healthz")

            if response.status_code == 200:
                return IntegrationHealth(
                    status=IntegrationStatus.CONNECTED,
                    last_sync=self._last_sync,
                    items_synced=len(self._runs) + len(self._artifacts),
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
        """Sync data from W&B"""
        if not self.settings.enabled:
            return SyncResult(success=False, errors=["W&B integration is disabled"])

        start_time = datetime.utcnow()
        self._status = IntegrationStatus.SYNCING
        items_synced = 0
        errors = []

        try:
            # Sync projects
            projects = await self.sync_projects()
            items_synced += len(projects)

            # Sync runs
            if self.settings.sync_runs:
                runs = await self.sync_runs()
                items_synced += len(runs)

            # Sync artifacts
            if self.settings.sync_artifacts:
                artifacts = await self.sync_artifacts()
                items_synced += len(artifacts)

            self._status = IntegrationStatus.CONNECTED
            self._last_sync = datetime.utcnow()

            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            logger.info(f"W&B sync completed: {items_synced} items in {duration_ms}ms")

            return SyncResult(
                success=True,
                items_synced=items_synced,
                duration_ms=duration_ms,
            )

        except Exception as e:
            self._status = IntegrationStatus.ERROR
            self._error = str(e)
            errors.append(str(e))
            logger.exception(f"W&B sync failed: {e}")

            return SyncResult(
                success=False,
                items_synced=items_synced,
                errors=errors,
            )

    async def sync_projects(self) -> List[WandbProject]:
        """Sync projects from W&B"""
        if not self.settings.entity:
            logger.warning("W&B entity not configured, skipping projects sync")
            return []

        try:
            client = await self._get_client()

            # GraphQL query for projects
            query = """
            query GetProjects($entity: String!) {
                entity(name: $entity) {
                    projects(first: 100) {
                        edges {
                            node {
                                id
                                name
                                description
                                createdAt
                            }
                        }
                    }
                }
            }
            """

            response = await client.post("/graphql", json={
                "query": query,
                "variables": {"entity": self.settings.entity}
            })

            if response.status_code != 200:
                raise Exception(f"Failed to fetch projects: {response.status_code}")

            data = response.json()
            projects = []

            entity_data = data.get("data", {}).get("entity", {})
            if entity_data:
                for edge in entity_data.get("projects", {}).get("edges", []):
                    node = edge.get("node", {})
                    projects.append(WandbProject(
                        id=node.get("id", ""),
                        name=node.get("name", ""),
                        entity=self.settings.entity,
                        description=node.get("description", ""),
                    ))

            self._projects = projects
            logger.info(f"Synced {len(projects)} W&B projects")
            return projects

        except Exception as e:
            logger.exception(f"Failed to sync W&B projects: {e}")
            return []

    async def sync_runs(self, project: Optional[str] = None) -> List[WandbRun]:
        """Sync runs from W&B"""
        target_project = project or self.settings.project
        if not target_project:
            logger.warning("W&B project not configured, skipping runs sync")
            return []

        try:
            client = await self._get_client()

            query = """
            query GetRuns($entity: String!, $project: String!) {
                project(name: $project, entityName: $entity) {
                    runs(first: 100) {
                        edges {
                            node {
                                id
                                name
                                displayName
                                state
                                createdAt
                                summaryMetrics
                                config
                                tags
                            }
                        }
                    }
                }
            }
            """

            response = await client.post("/graphql", json={
                "query": query,
                "variables": {
                    "entity": self.settings.entity,
                    "project": target_project
                }
            })

            if response.status_code != 200:
                raise Exception(f"Failed to fetch runs: {response.status_code}")

            data = response.json()
            runs = []

            project_data = data.get("data", {}).get("project", {})
            if project_data:
                for edge in project_data.get("runs", {}).get("edges", []):
                    node = edge.get("node", {})
                    runs.append(WandbRun(
                        id=node.get("id", ""),
                        name=node.get("name", ""),
                        display_name=node.get("displayName", ""),
                        project=target_project,
                        entity=self.settings.entity,
                        state=node.get("state", "unknown"),
                        summary=node.get("summaryMetrics", {}),
                        config=node.get("config", {}),
                        tags=node.get("tags", []),
                    ))

            self._runs = runs
            logger.info(f"Synced {len(runs)} W&B runs")
            return runs

        except Exception as e:
            logger.exception(f"Failed to sync W&B runs: {e}")
            return []

    async def sync_artifacts(self, project: Optional[str] = None) -> List[WandbArtifact]:
        """Sync artifacts from W&B"""
        # Simplified artifact sync - in production would use GraphQL
        logger.info("Artifact sync placeholder - would fetch from W&B API")
        return []

    def get_projects(self) -> List[WandbProject]:
        """Get cached projects"""
        return self._projects

    def get_runs(self) -> List[WandbRun]:
        """Get cached runs"""
        return self._runs

    def get_artifacts(self) -> List[WandbArtifact]:
        """Get cached artifacts"""
        return self._artifacts
