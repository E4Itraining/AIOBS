"""
AIOBS Services Module
Contains business logic and external service integrations
"""

from .llm_service import LLMService, get_llm_service

__all__ = ["LLMService", "get_llm_service"]
