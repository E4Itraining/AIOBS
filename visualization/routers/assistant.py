"""
AIOBS AI Assistant API
Advanced feature: Real AI-powered intelligent insights and natural language queries
"""

import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from ..services.llm_service import get_llm_service, LLMResponse

router = APIRouter(prefix="/api/assistant", tags=["assistant"])
logger = logging.getLogger("aiobs.assistant")


# =============================================================================
# Request/Response Models
# =============================================================================


class AssistantQuery(BaseModel):
    """User query to the AI assistant"""

    query: str = Field(..., min_length=1, max_length=2000)
    context: Optional[Dict[str, Any]] = None
    language: Optional[str] = "en"
    session_id: Optional[str] = None


class InsightRequest(BaseModel):
    """Request for automated insights"""

    metric_type: Optional[str] = None  # drift, reliability, cost, etc.
    time_range: str = "24h"
    severity_filter: Optional[str] = None


class AssistantResponse(BaseModel):
    """Response from AI assistant"""

    answer: str
    insights: List[Dict[str, Any]] = []
    suggested_actions: List[str] = []
    related_metrics: List[str] = []
    confidence: float = 0.9
    model: Optional[str] = None
    provider: Optional[str] = None
    session_id: Optional[str] = None


class ConversationMessage(BaseModel):
    """Single message in a conversation"""

    role: str  # "user" or "assistant"
    content: str
    timestamp: str


class ConversationHistory(BaseModel):
    """Conversation history response"""

    session_id: str
    messages: List[ConversationMessage] = []


# =============================================================================
# AI Assistant Endpoints
# =============================================================================


@router.post("/query", response_model=AssistantResponse)
async def query_assistant(request: Request, query: AssistantQuery):
    """
    Natural language query to the AI assistant

    This endpoint uses real LLM integration (OpenAI, Anthropic, or fallback to mock)
    to provide intelligent responses about your AI systems.

    The assistant can:
    - Explain metrics and their meanings
    - Analyze trends and anomalies
    - Suggest root causes for issues
    - Recommend actions
    - Answer questions about system health
    - Provide cost optimization suggestions
    - Analyze carbon footprint and sustainability

    Example queries:
    - "Why did the trust score drop?"
    - "What's causing the high latency?"
    - "Explain the drift detection results"
    - "What should I do about the reliability warning?"
    - "How can I reduce my AI costs?"
    - "Show me the carbon footprint analysis"
    """
    # Get language from request state or query parameter
    lang = getattr(request.state, "language", query.language or "en")

    # Generate session ID if not provided
    session_id = query.session_id or str(uuid.uuid4())

    try:
        # Get LLM service
        llm_service = get_llm_service()

        # Build context from current system state
        context = query.context or {}
        context["current_page"] = request.headers.get("referer", "unknown")
        context["timestamp"] = datetime.utcnow().isoformat()

        # Get response from LLM
        llm_response: LLMResponse = await llm_service.chat(
            query=query.query,
            session_id=session_id,
            context=context,
            language=lang,
        )

        return AssistantResponse(
            answer=llm_response.content,
            insights=llm_response.insights,
            suggested_actions=llm_response.suggested_actions,
            related_metrics=llm_response.related_metrics,
            confidence=llm_response.confidence,
            model=llm_response.model,
            provider=llm_response.provider,
            session_id=session_id,
        )

    except Exception as e:
        logger.error(f"Assistant query error: {e}")
        error_msg = (
            "Desolee, une erreur s'est produite. Veuillez reessayer."
            if lang == "fr"
            else "Sorry, an error occurred. Please try again."
        )
        return AssistantResponse(
            answer=error_msg,
            insights=[],
            suggested_actions=[],
            related_metrics=[],
            confidence=0.0,
            session_id=session_id,
        )


@router.websocket("/stream")
async def stream_assistant(websocket: WebSocket):
    """
    WebSocket endpoint for streaming AI assistant responses

    This provides real-time streaming of AI responses for a better user experience.

    Message format (send):
    {
        "query": "Your question here",
        "session_id": "optional-session-id",
        "language": "en" or "fr",
        "context": {}
    }

    Message format (receive):
    {
        "type": "chunk" | "done" | "error",
        "content": "text chunk or full message",
        "session_id": "session-id"
    }
    """
    await websocket.accept()

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()

            query = data.get("query", "")
            session_id = data.get("session_id") or str(uuid.uuid4())
            language = data.get("language", "en")
            context = data.get("context", {})

            if not query:
                await websocket.send_json({
                    "type": "error",
                    "content": "Query is required",
                    "session_id": session_id,
                })
                continue

            try:
                # Get LLM service
                llm_service = get_llm_service()

                # Stream response chunks
                async for chunk in llm_service.chat_stream(
                    query=query,
                    session_id=session_id,
                    context=context,
                    language=language,
                ):
                    await websocket.send_json({
                        "type": "chunk",
                        "content": chunk,
                        "session_id": session_id,
                    })

                # Send completion message
                await websocket.send_json({
                    "type": "done",
                    "content": "",
                    "session_id": session_id,
                })

            except Exception as e:
                logger.error(f"Streaming error: {e}")
                await websocket.send_json({
                    "type": "error",
                    "content": str(e),
                    "session_id": session_id,
                })

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")


@router.get("/insights")
async def get_automated_insights(
    request: Request, metric_type: Optional[str] = None, time_range: str = "24h"
):
    """
    Get AI-generated insights about your AI systems

    Uses the LLM to analyze current metrics and provide proactive insights about:
    - Anomaly detection results
    - Trend analysis
    - Performance recommendations
    - Cost optimization opportunities
    - Risk assessments
    """
    lang = getattr(request.state, "language", "en")

    try:
        llm_service = get_llm_service()

        # Generate insights query based on parameters
        if lang == "fr":
            if metric_type:
                query = f"Genere des insights automatiques pour la metrique '{metric_type}' sur les dernieres {time_range}."
            else:
                query = f"Genere un resume des insights cles pour tous les systemes IA sur les dernieres {time_range}."
        else:
            if metric_type:
                query = f"Generate automated insights for the '{metric_type}' metric over the last {time_range}."
            else:
                query = f"Generate a summary of key insights for all AI systems over the last {time_range}."

        # Get response from LLM
        response = await llm_service.chat(
            query=query,
            language=lang,
            context={"metric_type": metric_type, "time_range": time_range},
        )

        return {
            "success": True,
            "data": {
                "summary": response.content,
                "insights": response.insights,
                "recommendations": response.suggested_actions,
                "generated_at": datetime.utcnow().isoformat(),
                "time_range": time_range,
                "metric_type": metric_type,
                "model": response.model,
            },
        }

    except Exception as e:
        logger.error(f"Insights generation error: {e}")
        return {
            "success": False,
            "error": str(e),
            "data": {
                "insights": [],
                "generated_at": datetime.utcnow().isoformat(),
            },
        }


@router.get("/recommendations")
async def get_recommendations(request: Request):
    """
    Get AI-powered recommendations for system improvement

    Categories:
    - Performance optimization
    - Cost reduction
    - Reliability improvement
    - Compliance actions
    - Risk mitigation
    - Sustainability improvements
    """
    lang = getattr(request.state, "language", "en")

    try:
        llm_service = get_llm_service()

        if lang == "fr":
            query = (
                "Genere des recommandations prioritaires pour ameliorer mes systemes IA dans les categories suivantes: "
                "1) Optimisation des performances, 2) Reduction des couts, 3) Amelioration de la fiabilite, "
                "4) Actions de conformite, 5) Attenuation des risques, 6) Durabilite."
            )
        else:
            query = (
                "Generate priority recommendations to improve my AI systems in the following categories: "
                "1) Performance optimization, 2) Cost reduction, 3) Reliability improvement, "
                "4) Compliance actions, 5) Risk mitigation, 6) Sustainability."
            )

        response = await llm_service.chat(query=query, language=lang)

        return {
            "success": True,
            "data": {
                "summary": response.content,
                "recommendations": response.suggested_actions,
                "related_metrics": response.related_metrics,
                "generated_at": datetime.utcnow().isoformat(),
                "model": response.model,
            },
        }

    except Exception as e:
        logger.error(f"Recommendations generation error: {e}")
        return {
            "success": False,
            "error": str(e),
            "data": {
                "recommendations": [],
                "generated_at": datetime.utcnow().isoformat(),
            },
        }


@router.post("/explain/{metric_type}")
async def explain_metric(
    request: Request,
    metric_type: str,
    data: Optional[Dict[str, Any]] = None
):
    """
    Get AI explanation for a specific metric

    Supported metric types:
    - trust_score
    - drift
    - reliability
    - hallucination
    - degradation
    - latency
    - error_rate
    - cost
    - carbon
    """
    lang = getattr(request.state, "language", "en")

    try:
        llm_service = get_llm_service()

        if lang == "fr":
            query = (
                f"Explique en detail la metrique '{metric_type}' dans le contexte de l'observabilite IA. "
                f"Inclus: 1) Definition, 2) Comment elle est calculee, 3) Plages de valeurs, "
                f"4) Seuils (bon/attention/critique), 5) Actions recommandees pour l'ameliorer."
            )
        else:
            query = (
                f"Explain in detail the '{metric_type}' metric in the context of AI observability. "
                f"Include: 1) Definition, 2) How it's calculated, 3) Value ranges, "
                f"4) Thresholds (good/warning/critical), 5) Recommended actions to improve it."
            )

        context = {"metric_type": metric_type}
        if data:
            context["metric_data"] = data

        response = await llm_service.chat(query=query, language=lang, context=context)

        return {
            "success": True,
            "data": {
                "metric_type": metric_type,
                "explanation": response.content,
                "suggested_actions": response.suggested_actions,
                "related_metrics": response.related_metrics,
                "model": response.model,
            },
        }

    except Exception as e:
        logger.error(f"Metric explanation error: {e}")
        return {
            "success": False,
            "error": str(e),
            "data": {
                "metric_type": metric_type,
                "explanation": "",
            },
        }


@router.get("/root-cause/{incident_id}")
async def analyze_root_cause(request: Request, incident_id: str):
    """
    AI-powered root cause analysis for an incident

    Returns:
    - Probable root causes with confidence scores
    - Contributing factors
    - Causal chain visualization
    - Recommended remediation steps
    """
    lang = getattr(request.state, "language", "en")

    try:
        llm_service = get_llm_service()

        if lang == "fr":
            query = (
                f"Effectue une analyse de cause racine pour l'incident '{incident_id}'. "
                f"Fournis: 1) Causes probables avec scores de confiance, 2) Facteurs contributifs, "
                f"3) Chaine causale, 4) Etapes de remediation recommandees, 5) Actions preventives."
            )
        else:
            query = (
                f"Perform a root cause analysis for incident '{incident_id}'. "
                f"Provide: 1) Probable causes with confidence scores, 2) Contributing factors, "
                f"3) Causal chain, 4) Recommended remediation steps, 5) Preventive actions."
            )

        response = await llm_service.chat(
            query=query,
            language=lang,
            context={"incident_id": incident_id}
        )

        return {
            "success": True,
            "data": {
                "incident_id": incident_id,
                "status": "analyzed",
                "analysis": response.content,
                "recommended_actions": response.suggested_actions,
                "related_metrics": response.related_metrics,
                "confidence": response.confidence,
                "model": response.model,
            },
        }

    except Exception as e:
        logger.error(f"Root cause analysis error: {e}")
        return {
            "success": False,
            "error": str(e),
            "data": {
                "incident_id": incident_id,
                "status": "error",
            },
        }


@router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """
    Clear conversation history for a session
    """
    try:
        llm_service = get_llm_service()
        llm_service.clear_history(session_id)

        return {
            "success": True,
            "message": f"Session {session_id} cleared",
        }
    except Exception as e:
        logger.error(f"Session clear error: {e}")
        return {
            "success": False,
            "error": str(e),
        }


@router.get("/status")
async def get_assistant_status():
    """
    Get the current status of the AI assistant service

    Returns information about:
    - Active provider (OpenAI, Anthropic, or Mock)
    - Model being used
    - Service availability
    """
    try:
        llm_service = get_llm_service()

        return {
            "success": True,
            "data": {
                "status": "online",
                "provider": llm_service.config.provider.value,
                "model": llm_service.config.model,
                "max_tokens": llm_service.config.max_tokens,
                "streaming_available": True,
            },
        }
    except Exception as e:
        logger.error(f"Status check error: {e}")
        return {
            "success": False,
            "data": {
                "status": "error",
                "error": str(e),
            },
        }
