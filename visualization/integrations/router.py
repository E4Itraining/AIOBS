"""
Integrations Router
API endpoints for managing external integrations
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from .mlflow_connector import MLflowConnector, MLflowSettings
from .wandb_connector import WandbConnector, WandbSettings

logger = logging.getLogger("aiobs.integrations")

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

# Initialize connectors (lazy loading)
_mlflow: Optional[MLflowConnector] = None
_wandb: Optional[WandbConnector] = None


def get_mlflow_connector() -> MLflowConnector:
    global _mlflow
    if _mlflow is None:
        _mlflow = MLflowConnector()
    return _mlflow


def get_wandb_connector() -> WandbConnector:
    global _wandb
    if _wandb is None:
        _wandb = WandbConnector()
    return _wandb


class APIResponse(BaseModel):
    """Standard API response"""
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


@router.get("/status", response_model=APIResponse)
async def get_integrations_status():
    """
    Get status of all integrations.
    """
    mlflow = get_mlflow_connector()
    wandb = get_wandb_connector()

    return APIResponse(
        success=True,
        data={
            "integrations": [
                {
                    "id": "mlflow",
                    "name": "MLflow",
                    "description": "ML experiment tracking and model registry",
                    "enabled": mlflow.settings.enabled,
                    "status": mlflow.status.value,
                    "last_sync": mlflow._last_sync.isoformat() if mlflow._last_sync else None,
                    "config": {
                        "tracking_uri": mlflow.settings.tracking_uri,
                        "sync_experiments": mlflow.settings.sync_experiments,
                        "sync_models": mlflow.settings.sync_models,
                    },
                },
                {
                    "id": "wandb",
                    "name": "Weights & Biases",
                    "description": "ML experiment tracking and collaboration",
                    "enabled": wandb.settings.enabled,
                    "status": wandb.status.value,
                    "last_sync": wandb._last_sync.isoformat() if wandb._last_sync else None,
                    "config": {
                        "entity": wandb.settings.entity or "(not configured)",
                        "project": wandb.settings.project or "(not configured)",
                        "sync_runs": wandb.settings.sync_runs,
                        "sync_artifacts": wandb.settings.sync_artifacts,
                    },
                },
            ],
        }
    )


@router.post("/mlflow/connect", response_model=APIResponse)
async def connect_mlflow():
    """
    Connect to MLflow tracking server.
    """
    mlflow = get_mlflow_connector()

    if not mlflow.settings.enabled:
        raise HTTPException(
            status_code=400,
            detail="MLflow integration is disabled. Set AIOBS_MLFLOW_ENABLED=true"
        )

    success = await mlflow.connect()

    return APIResponse(
        success=success,
        data={
            "status": mlflow.status.value,
            "tracking_uri": mlflow.settings.tracking_uri,
        },
        error=mlflow._error if not success else None,
    )


@router.post("/mlflow/sync", response_model=APIResponse)
async def sync_mlflow():
    """
    Sync data from MLflow.
    """
    mlflow = get_mlflow_connector()

    if not mlflow.settings.enabled:
        raise HTTPException(
            status_code=400,
            detail="MLflow integration is disabled"
        )

    result = await mlflow.sync()

    return APIResponse(
        success=result.success,
        data={
            "items_synced": result.items_synced,
            "items_failed": result.items_failed,
            "duration_ms": result.duration_ms,
        },
        error=result.errors[0] if result.errors else None,
    )


@router.get("/mlflow/experiments", response_model=APIResponse)
async def get_mlflow_experiments():
    """
    Get synced MLflow experiments.
    """
    mlflow = get_mlflow_connector()

    experiments = mlflow.get_experiments()

    return APIResponse(
        success=True,
        data={
            "experiments": [e.model_dump() for e in experiments],
            "total": len(experiments),
            "last_sync": mlflow._last_sync.isoformat() if mlflow._last_sync else None,
        }
    )


@router.get("/mlflow/models", response_model=APIResponse)
async def get_mlflow_models():
    """
    Get synced MLflow registered models.
    """
    mlflow = get_mlflow_connector()

    models = mlflow.get_models()

    return APIResponse(
        success=True,
        data={
            "models": [m.model_dump() for m in models],
            "total": len(models),
        }
    )


@router.post("/wandb/connect", response_model=APIResponse)
async def connect_wandb():
    """
    Connect to Weights & Biases.
    """
    wandb = get_wandb_connector()

    if not wandb.settings.enabled:
        raise HTTPException(
            status_code=400,
            detail="W&B integration is disabled. Set AIOBS_WANDB_ENABLED=true"
        )

    success = await wandb.connect()

    return APIResponse(
        success=success,
        data={
            "status": wandb.status.value,
            "entity": wandb.settings.entity,
        },
        error=wandb._error if not success else None,
    )


@router.post("/wandb/sync", response_model=APIResponse)
async def sync_wandb():
    """
    Sync data from Weights & Biases.
    """
    wandb = get_wandb_connector()

    if not wandb.settings.enabled:
        raise HTTPException(
            status_code=400,
            detail="W&B integration is disabled"
        )

    result = await wandb.sync()

    return APIResponse(
        success=result.success,
        data={
            "items_synced": result.items_synced,
            "items_failed": result.items_failed,
            "duration_ms": result.duration_ms,
        },
        error=result.errors[0] if result.errors else None,
    )


@router.get("/wandb/projects", response_model=APIResponse)
async def get_wandb_projects():
    """
    Get synced W&B projects.
    """
    wandb = get_wandb_connector()

    projects = wandb.get_projects()

    return APIResponse(
        success=True,
        data={
            "projects": [p.model_dump() for p in projects],
            "total": len(projects),
        }
    )


@router.get("/wandb/runs", response_model=APIResponse)
async def get_wandb_runs():
    """
    Get synced W&B runs.
    """
    wandb = get_wandb_connector()

    runs = wandb.get_runs()

    return APIResponse(
        success=True,
        data={
            "runs": [r.model_dump() for r in runs],
            "total": len(runs),
        }
    )


@router.get("/available", response_model=APIResponse)
async def list_available_integrations():
    """
    List all available integrations and their configuration requirements.
    """
    return APIResponse(
        success=True,
        data={
            "integrations": [
                {
                    "id": "mlflow",
                    "name": "MLflow",
                    "description": "Open source platform for the ML lifecycle",
                    "category": "mlops",
                    "documentation_url": "https://mlflow.org/docs/latest/",
                    "config_keys": [
                        "AIOBS_MLFLOW_ENABLED",
                        "AIOBS_MLFLOW_TRACKING_URI",
                        "AIOBS_MLFLOW_USERNAME",
                        "AIOBS_MLFLOW_PASSWORD",
                    ],
                    "features": ["experiments", "runs", "model_registry", "artifacts"],
                },
                {
                    "id": "wandb",
                    "name": "Weights & Biases",
                    "description": "ML experiment tracking, dataset versioning, and model management",
                    "category": "mlops",
                    "documentation_url": "https://docs.wandb.ai/",
                    "config_keys": [
                        "AIOBS_WANDB_ENABLED",
                        "AIOBS_WANDB_API_KEY",
                        "AIOBS_WANDB_ENTITY",
                        "AIOBS_WANDB_PROJECT",
                    ],
                    "features": ["projects", "runs", "artifacts", "sweeps"],
                },
                {
                    "id": "datadog",
                    "name": "Datadog",
                    "description": "Monitoring and analytics platform",
                    "category": "observability",
                    "documentation_url": "https://docs.datadoghq.com/",
                    "status": "coming_soon",
                },
                {
                    "id": "prometheus",
                    "name": "Prometheus",
                    "description": "Open source monitoring and alerting",
                    "category": "observability",
                    "documentation_url": "https://prometheus.io/docs/",
                    "status": "coming_soon",
                },
            ],
        }
    )
