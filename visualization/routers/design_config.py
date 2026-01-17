"""
Design Configuration Router
API endpoints for persisting design/theme preferences
"""

import json
import logging
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("aiobs.design_config")

router = APIRouter(prefix="/api/design", tags=["Design Configuration"])

# Path to the persistence file (relative to module, not cwd)
# This ensures the path is stable regardless of where the process is started
_BASE_DIR = Path(__file__).resolve().parent.parent.parent
CONFIG_FILE_PATH = _BASE_DIR / "data" / "design_config.json"


class DesignConfigRequest(BaseModel):
    """Request model for design configuration"""
    theme: str = "light"  # 'light' or 'dark'
    persona: Optional[str] = None  # persona ID if any
    accent_color: Optional[str] = None  # custom accent color


class DesignConfigResponse(BaseModel):
    """Response model for design operations"""
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None
    config: Optional[dict] = None


def _load_config_from_file() -> dict:
    """Load design configuration from file"""
    try:
        if CONFIG_FILE_PATH.exists():
            with open(CONFIG_FILE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load design config from file: {e}")
    return {}


def _save_config_to_file(config: dict) -> bool:
    """Save design configuration to file"""
    try:
        # Ensure data directory exists
        CONFIG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)

        with open(CONFIG_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
        logger.info("Design config saved to file successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to save design config to file: {e}")
        return False


# Load config from file on startup
_design_config: dict = _load_config_from_file()


@router.post("/config", response_model=DesignConfigResponse)
async def save_design_config(config: DesignConfigRequest):
    """Save design configuration"""
    try:
        global _design_config
        _design_config = config.model_dump()

        # Persist to file
        if not _save_config_to_file(_design_config):
            logger.warning("Failed to persist design config to file, changes may be lost on restart")

        logger.info(f"Design configuration saved: theme={config.theme}")

        return DesignConfigResponse(
            success=True,
            message=f"Configuration saved: theme={config.theme}",
            config=_design_config
        )
    except Exception as e:
        logger.error(f"Error saving design config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config", response_model=dict)
async def get_design_config():
    """Get current design configuration"""
    if not _design_config:
        return {
            "configured": False,
            "theme": "light",
            "persona": None,
            "accent_color": None
        }

    return {
        "configured": True,
        "theme": _design_config.get("theme", "light"),
        "persona": _design_config.get("persona"),
        "accent_color": _design_config.get("accent_color")
    }


@router.delete("/config")
async def reset_design_config():
    """Reset design configuration to defaults"""
    global _design_config
    _design_config = {"theme": "light", "persona": None, "accent_color": None}

    # Save default config
    _save_config_to_file(_design_config)

    return {"success": True, "message": "Design configuration reset to defaults"}
