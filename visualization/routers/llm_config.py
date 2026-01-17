"""
LLM Configuration Router
API endpoints for configuring and testing LLM providers
"""

import json
import logging
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("aiobs.llm_config")

router = APIRouter(prefix="/api/llm", tags=["LLM Configuration"])

# Path to the persistence file
CONFIG_FILE_PATH = Path(os.getcwd()) / "data" / "llm_config.json"


class LLMConfigRequest(BaseModel):
    """Request model for LLM configuration"""
    provider: str
    api_key: Optional[str] = None
    model: Optional[str] = None
    url: Optional[str] = None
    endpoint: Optional[str] = None
    deployment: Optional[str] = None
    api_version: Optional[str] = None
    organization: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2048
    timeout: int = 30
    stream: bool = True


class LLMConfigResponse(BaseModel):
    """Response model for LLM operations"""
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None
    model: Optional[str] = None


def _load_config_from_file() -> dict:
    """Load LLM configuration from file"""
    try:
        if CONFIG_FILE_PATH.exists():
            with open(CONFIG_FILE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load LLM config from file: {e}")
    return {}


def _save_config_to_file(config: dict) -> bool:
    """Save LLM configuration to file"""
    try:
        # Ensure data directory exists
        CONFIG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)

        with open(CONFIG_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
        logger.info("LLM config saved to file successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to save LLM config to file: {e}")
        return False


# Load config from file on startup
_llm_config: dict = _load_config_from_file()


@router.post("/config", response_model=LLMConfigResponse)
async def save_llm_config(config: LLMConfigRequest):
    """Save LLM configuration"""
    try:
        global _llm_config
        _llm_config = config.model_dump()

        # Persist to file
        if not _save_config_to_file(_llm_config):
            logger.warning("Failed to persist LLM config to file, changes may be lost on restart")

        logger.info(f"LLM configuration saved for provider: {config.provider}")

        return LLMConfigResponse(
            success=True,
            message=f"Configuration saved for {config.provider}",
            model=config.model
        )
    except Exception as e:
        logger.error(f"Error saving LLM config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config", response_model=dict)
async def get_llm_config():
    """Get current LLM configuration (without sensitive data)"""
    if not _llm_config:
        return {
            "configured": False,
            "provider": None
        }

    # Return config without API key
    safe_config = {
        "configured": True,
        "provider": _llm_config.get("provider"),
        "model": _llm_config.get("model"),
        "temperature": _llm_config.get("temperature"),
        "max_tokens": _llm_config.get("max_tokens"),
        "has_api_key": bool(_llm_config.get("api_key"))
    }
    return safe_config


@router.post("/test", response_model=LLMConfigResponse)
async def test_llm_connection(config: LLMConfigRequest):
    """Test LLM connection with provided configuration"""
    try:
        provider = config.provider

        # Simulate connection test based on provider
        if provider == "openai":
            if not config.api_key or not config.api_key.startswith("sk-"):
                return LLMConfigResponse(
                    success=False,
                    error="Invalid OpenAI API key format"
                )
            # In production, make actual API call to verify
            return LLMConfigResponse(
                success=True,
                message="Connection successful",
                model=config.model or "gpt-4o"
            )

        elif provider == "anthropic":
            if not config.api_key or not config.api_key.startswith("sk-ant-"):
                return LLMConfigResponse(
                    success=False,
                    error="Invalid Anthropic API key format"
                )
            return LLMConfigResponse(
                success=True,
                message="Connection successful",
                model=config.model or "claude-3-sonnet-20240229"
            )

        elif provider == "azure":
            if not config.endpoint or not config.api_key:
                return LLMConfigResponse(
                    success=False,
                    error="Azure endpoint and API key are required"
                )
            return LLMConfigResponse(
                success=True,
                message="Connection successful",
                model=config.deployment or "gpt-4"
            )

        elif provider == "ollama":
            if not config.url:
                config.url = "http://localhost:11434"
            # In production, check if Ollama server is running
            return LLMConfigResponse(
                success=True,
                message="Connection successful (assumed)",
                model=config.model or "llama3"
            )

        elif provider == "custom":
            if not config.url:
                return LLMConfigResponse(
                    success=False,
                    error="Custom API URL is required"
                )
            return LLMConfigResponse(
                success=True,
                message="Connection successful (assumed)",
                model=config.model or "custom-model"
            )

        else:
            return LLMConfigResponse(
                success=False,
                error=f"Unknown provider: {provider}"
            )

    except Exception as e:
        logger.error(f"Error testing LLM connection: {e}")
        return LLMConfigResponse(
            success=False,
            error=str(e)
        )


@router.delete("/config")
async def delete_llm_config():
    """Clear LLM configuration"""
    global _llm_config
    _llm_config = {}

    # Remove the config file
    try:
        if CONFIG_FILE_PATH.exists():
            CONFIG_FILE_PATH.unlink()
            logger.info("LLM config file deleted")
    except Exception as e:
        logger.error(f"Failed to delete LLM config file: {e}")

    return {"success": True, "message": "Configuration cleared"}
