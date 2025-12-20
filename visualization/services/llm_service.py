"""
AIOBS LLM Service
Real AI integration with support for multiple LLM providers (OpenAI, Anthropic)
"""

import asyncio
import json
import logging
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from functools import lru_cache
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx

logger = logging.getLogger("aiobs.llm")


class LLMProvider(str, Enum):
    """Supported LLM providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    MISTRAL = "mistral"
    MOCK = "mock"  # For development/testing


@dataclass
class LLMConfig:
    """LLM service configuration"""
    provider: LLMProvider = LLMProvider.MOCK
    api_key: Optional[str] = None
    model: str = "gpt-4o-mini"
    max_tokens: int = 2048
    temperature: float = 0.7
    timeout: float = 60.0

    # Provider-specific endpoints
    openai_base_url: str = "https://api.openai.com/v1"
    anthropic_base_url: str = "https://api.anthropic.com/v1"
    mistral_base_url: str = "https://api.mistral.ai/v1"


@dataclass
class ChatMessage:
    """Chat message structure"""
    role: str  # "user", "assistant", "system"
    content: str
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class LLMResponse:
    """LLM response structure"""
    content: str
    model: str
    provider: str
    usage: Optional[Dict[str, int]] = None
    finish_reason: Optional[str] = None

    # Additional metadata for AIOBS
    insights: List[Dict[str, Any]] = field(default_factory=list)
    suggested_actions: List[str] = field(default_factory=list)
    related_metrics: List[str] = field(default_factory=list)
    confidence: float = 0.9


class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers"""

    def __init__(self, config: LLMConfig):
        self.config = config
        self.client = httpx.AsyncClient(timeout=config.timeout)

    @abstractmethod
    async def chat(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> LLMResponse:
        """Send chat messages and get response"""
        pass

    @abstractmethod
    async def chat_stream(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> AsyncIterator[str]:
        """Stream chat response"""
        pass

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


class OpenAIProvider(BaseLLMProvider):
    """OpenAI API provider"""

    async def chat(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> LLMResponse:
        """Send chat messages to OpenAI"""

        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})

        for msg in messages:
            formatted_messages.append({"role": msg.role, "content": msg.content})

        try:
            response = await self.client.post(
                f"{self.config.openai_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.config.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.config.model,
                    "messages": formatted_messages,
                    "max_tokens": self.config.max_tokens,
                    "temperature": self.config.temperature,
                },
            )
            response.raise_for_status()
            data = response.json()

            choice = data["choices"][0]
            return LLMResponse(
                content=choice["message"]["content"],
                model=data["model"],
                provider="openai",
                usage=data.get("usage"),
                finish_reason=choice.get("finish_reason"),
            )
        except httpx.HTTPError as e:
            logger.error(f"OpenAI API error: {e}")
            raise

    async def chat_stream(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> AsyncIterator[str]:
        """Stream chat response from OpenAI"""

        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})

        for msg in messages:
            formatted_messages.append({"role": msg.role, "content": msg.content})

        try:
            async with self.client.stream(
                "POST",
                f"{self.config.openai_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.config.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.config.model,
                    "messages": formatted_messages,
                    "max_tokens": self.config.max_tokens,
                    "temperature": self.config.temperature,
                    "stream": True,
                },
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            delta = data["choices"][0].get("delta", {})
                            if content := delta.get("content"):
                                yield content
                        except json.JSONDecodeError:
                            continue
        except httpx.HTTPError as e:
            logger.error(f"OpenAI streaming error: {e}")
            raise


class AnthropicProvider(BaseLLMProvider):
    """Anthropic Claude API provider"""

    async def chat(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> LLMResponse:
        """Send chat messages to Anthropic"""

        # Anthropic uses a different format
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({"role": msg.role, "content": msg.content})

        try:
            request_body = {
                "model": self.config.model,
                "messages": formatted_messages,
                "max_tokens": self.config.max_tokens,
            }
            if system_prompt:
                request_body["system"] = system_prompt

            response = await self.client.post(
                f"{self.config.anthropic_base_url}/messages",
                headers={
                    "x-api-key": self.config.api_key,
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01",
                },
                json=request_body,
            )
            response.raise_for_status()
            data = response.json()

            content = ""
            for block in data.get("content", []):
                if block["type"] == "text":
                    content += block["text"]

            return LLMResponse(
                content=content,
                model=data["model"],
                provider="anthropic",
                usage=data.get("usage"),
                finish_reason=data.get("stop_reason"),
            )
        except httpx.HTTPError as e:
            logger.error(f"Anthropic API error: {e}")
            raise

    async def chat_stream(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> AsyncIterator[str]:
        """Stream chat response from Anthropic"""

        formatted_messages = []
        for msg in messages:
            formatted_messages.append({"role": msg.role, "content": msg.content})

        try:
            request_body = {
                "model": self.config.model,
                "messages": formatted_messages,
                "max_tokens": self.config.max_tokens,
                "stream": True,
            }
            if system_prompt:
                request_body["system"] = system_prompt

            async with self.client.stream(
                "POST",
                f"{self.config.anthropic_base_url}/messages",
                headers={
                    "x-api-key": self.config.api_key,
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01",
                },
                json=request_body,
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        try:
                            data = json.loads(line[6:])
                            if data["type"] == "content_block_delta":
                                if text := data.get("delta", {}).get("text"):
                                    yield text
                        except json.JSONDecodeError:
                            continue
        except httpx.HTTPError as e:
            logger.error(f"Anthropic streaming error: {e}")
            raise


class MistralProvider(BaseLLMProvider):
    """Mistral AI API provider"""

    async def chat(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> LLMResponse:
        """Send chat messages to Mistral AI"""

        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})

        for msg in messages:
            formatted_messages.append({"role": msg.role, "content": msg.content})

        try:
            response = await self.client.post(
                f"{self.config.mistral_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.config.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.config.model,
                    "messages": formatted_messages,
                    "max_tokens": self.config.max_tokens,
                    "temperature": self.config.temperature,
                },
            )
            response.raise_for_status()
            data = response.json()

            choice = data["choices"][0]
            return LLMResponse(
                content=choice["message"]["content"],
                model=data["model"],
                provider="mistral",
                usage=data.get("usage"),
                finish_reason=choice.get("finish_reason"),
            )
        except httpx.HTTPError as e:
            logger.error(f"Mistral API error: {e}")
            raise

    async def chat_stream(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> AsyncIterator[str]:
        """Stream chat response from Mistral AI"""

        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})

        for msg in messages:
            formatted_messages.append({"role": msg.role, "content": msg.content})

        try:
            async with self.client.stream(
                "POST",
                f"{self.config.mistral_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.config.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.config.model,
                    "messages": formatted_messages,
                    "max_tokens": self.config.max_tokens,
                    "temperature": self.config.temperature,
                    "stream": True,
                },
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            delta = data["choices"][0].get("delta", {})
                            if content := delta.get("content"):
                                yield content
                        except json.JSONDecodeError:
                            continue
        except httpx.HTTPError as e:
            logger.error(f"Mistral streaming error: {e}")
            raise


class MockProvider(BaseLLMProvider):
    """Mock provider for development and testing"""

    async def chat(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> LLMResponse:
        """Generate mock response for testing"""

        # Simulate API delay
        await asyncio.sleep(0.5)

        last_message = messages[-1].content if messages else ""

        # Generate contextual mock response based on keywords
        response_content = self._generate_mock_response(last_message)

        return LLMResponse(
            content=response_content,
            model="mock-model",
            provider="mock",
            usage={"prompt_tokens": 50, "completion_tokens": 100},
            finish_reason="stop",
        )

    async def chat_stream(
        self,
        messages: List[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> AsyncIterator[str]:
        """Stream mock response"""

        last_message = messages[-1].content if messages else ""
        response = self._generate_mock_response(last_message)

        # Simulate streaming by yielding word by word
        for word in response.split():
            await asyncio.sleep(0.05)
            yield word + " "

    def _generate_mock_response(self, query: str) -> str:
        """Generate mock response based on query content"""
        query_lower = query.lower()

        if any(word in query_lower for word in ["trust", "score", "confiance"]):
            return (
                "Le **Trust Score** actuel de votre systeme IA est de **87%**, ce qui est dans la plage saine. "
                "Voici les composants principaux:\n\n"
                "- **Fiabilite**: 92% - Excellente stabilite des predictions\n"
                "- **Drift**: 0.08 - Faible derive des donnees\n"
                "- **Hallucination**: 0.05 - Risque minimal\n\n"
                "Je recommande de surveiller le drift des features `age` et `income` qui montrent une legere augmentation."
            )
        elif any(word in query_lower for word in ["drift", "derive", "change"]):
            return (
                "J'ai detecte une **derive des donnees** sur plusieurs features:\n\n"
                "1. **Feature `user_location`**: Distribution shift de +15% (attention)\n"
                "2. **Feature `purchase_amount`**: Stable (+2%)\n"
                "3. **Feature `session_duration`**: Leger drift de +8%\n\n"
                "**Recommandations:**\n"
                "- Investiguer les changements de source de donnees\n"
                "- Envisager un re-entrainement du modele si le drift persiste\n"
                "- Mettre en place des alertes automatiques pour drift > 10%"
            )
        elif any(word in query_lower for word in ["cost", "cout", "budget", "prix"]):
            return (
                "Voici l'analyse **FinOps** de vos systemes IA:\n\n"
                "**Couts Journaliers:** $1,250 (+5% vs hier)\n"
                "**Couts Mensuels Projetes:** $38,500\n\n"
                "**Repartition par modele:**\n"
                "- GPT-4o: 65% ($812/jour)\n"
                "- Claude Opus: 25% ($312/jour)\n"
                "- Modeles internes: 10% ($126/jour)\n\n"
                "**Opportunites d'optimisation:**\n"
                "- Routage intelligent: economie potentielle de **20%**\n"
                "- Mise en cache: economie potentielle de **15%**"
            )
        elif any(word in query_lower for word in ["alert", "alerte", "warning", "incident"]):
            return (
                "**3 alertes actives** dans votre systeme:\n\n"
                "1. **HAUTE** - Latence P99 > 2s sur `recommendation-service`\n"
                "   - Debut: il y a 15 minutes\n"
                "   - Impact: 1,200 utilisateurs affectes\n\n"
                "2. **MOYENNE** - Drift detecte sur `fraud-detection-model`\n"
                "   - Niveau: 12% au-dessus du seuil\n"
                "   - Action: Re-evaluation recommandee\n\n"
                "3. **BASSE** - Augmentation du taux d'erreur sur `api-gateway`\n"
                "   - Taux actuel: 0.5% (seuil: 0.3%)"
            )
        elif any(word in query_lower for word in ["carbon", "carbone", "co2", "green", "environnement"]):
            return (
                "**Empreinte Carbone IA - Rapport Journalier:**\n\n"
                "- **Emissions totales:** 45.2 kg CO2eq\n"
                "- **Consommation energetique:** 180 kWh\n"
                "- **Intensite carbone:** 0.25 kg CO2/1000 inferences\n\n"
                "**Tendances:**\n"
                "- -12% vs mois dernier (excellent!)\n"
                "- Region la plus verte: `eu-north-1` (energie renouvelable)\n\n"
                "**Recommandations GreenOps:**\n"
                "- Migrer les jobs batch vers `eu-north-1` pour -30% d'emissions\n"
                "- Activer le scheduling carbone-aware pour les taches non-urgentes"
            )
        elif any(word in query_lower for word in ["security", "securite", "menace", "threat"]):
            return (
                "**Rapport de Securite IA:**\n\n"
                "**Score de Posture Securite:** 85/100 (Bon)\n\n"
                "**Menaces detectees cette semaine:**\n"
                "- 23 tentatives de prompt injection (bloquees)\n"
                "- 5 requetes de jailbreak (bloquees)\n"
                "- 0 fuite de donnees\n\n"
                "**Vulnerabilites:**\n"
                "- 2 endpoints sans rate limiting (risque moyen)\n"
                "- 1 modele sans validation d'entree (risque faible)\n\n"
                "**Actions recommandees:**\n"
                "- Implementer rate limiting sur tous les endpoints\n"
                "- Activer la detection d'adversarial attacks"
            )
        elif any(word in query_lower for word in ["help", "aide", "comment", "how", "quoi"]):
            return (
                "Bonjour! Je suis l'assistant IA de **GASKIA** et je peux vous aider avec:\n\n"
                "**Analyses disponibles:**\n"
                "- **Trust Score**: Etat de sante global de vos systemes IA\n"
                "- **Drift Detection**: Surveillance des derives de donnees\n"
                "- **FinOps**: Analyse et optimisation des couts\n"
                "- **GreenOps**: Empreinte carbone et durabilite\n"
                "- **Securite**: Posture securite et menaces\n"
                "- **Alertes**: Incidents et problemes en cours\n\n"
                "**Exemples de questions:**\n"
                "- \"Quel est le trust score actuel?\"\n"
                "- \"Y a-t-il des alertes actives?\"\n"
                "- \"Montre-moi les couts du jour\"\n"
                "- \"Analyse l'empreinte carbone\""
            )
        else:
            return (
                "Je comprends votre question. Voici ce que je peux vous dire:\n\n"
                "Vos systemes IA fonctionnent globalement bien avec un **Trust Score de 87%**. "
                "Il n'y a pas d'alerte critique en cours.\n\n"
                "Voulez-vous que j'analyse un aspect specifique comme:\n"
                "- Les metriques de performance?\n"
                "- Les couts et optimisations?\n"
                "- La securite et conformite?\n"
                "- L'empreinte carbone?\n\n"
                "Posez-moi une question plus specifique et je vous fournirai une analyse detaillee."
            )


class LLMService:
    """Main LLM service orchestrator"""

    def __init__(self, config: Optional[LLMConfig] = None):
        self.config = config or self._load_config()
        self.provider = self._create_provider()
        self._conversation_history: Dict[str, List[ChatMessage]] = {}

    def _load_config(self) -> LLMConfig:
        """Load configuration from environment variables"""

        # Determine provider from environment
        provider_name = os.getenv("LLM_PROVIDER", "mock").lower()

        if provider_name == "openai" and os.getenv("OPENAI_API_KEY"):
            provider = LLMProvider.OPENAI
            api_key = os.getenv("OPENAI_API_KEY")
            model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
            logger.info(f"LLM Service initialized with OpenAI provider (model: {model})")
        elif provider_name == "anthropic" and os.getenv("ANTHROPIC_API_KEY"):
            provider = LLMProvider.ANTHROPIC
            api_key = os.getenv("ANTHROPIC_API_KEY")
            model = os.getenv("ANTHROPIC_MODEL", "claude-3-haiku-20240307")
            logger.info(f"LLM Service initialized with Anthropic provider (model: {model})")
        elif provider_name == "mistral" and os.getenv("MISTRAL_API_KEY"):
            provider = LLMProvider.MISTRAL
            api_key = os.getenv("MISTRAL_API_KEY")
            model = os.getenv("MISTRAL_MODEL", "mistral-large-latest")
            logger.info(f"LLM Service initialized with Mistral provider (model: {model})")
        else:
            provider = LLMProvider.MOCK
            api_key = None
            model = "mock-model"
            if provider_name != "mock":
                logger.warning(
                    f"LLM provider '{provider_name}' requested but API key not found. "
                    f"Falling back to Mock provider. Set the appropriate API key "
                    f"(e.g., {provider_name.upper()}_API_KEY) to use this provider."
                )
            else:
                logger.info("LLM Service initialized with Mock provider (for development/testing)")

        return LLMConfig(
            provider=provider,
            api_key=api_key,
            model=model,
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", "2048")),
            temperature=float(os.getenv("LLM_TEMPERATURE", "0.7")),
            timeout=float(os.getenv("LLM_TIMEOUT", "60")),
        )

    def _create_provider(self) -> BaseLLMProvider:
        """Create the appropriate LLM provider"""

        if self.config.provider == LLMProvider.OPENAI:
            return OpenAIProvider(self.config)
        elif self.config.provider == LLMProvider.ANTHROPIC:
            return AnthropicProvider(self.config)
        elif self.config.provider == LLMProvider.MISTRAL:
            return MistralProvider(self.config)
        else:
            return MockProvider(self.config)

    def get_system_prompt(self, language: str = "en") -> str:
        """Get the system prompt for the AI assistant"""

        if language == "fr":
            return """Tu es l'assistant IA de GASKIA, une plateforme d'observabilite pour les systemes IA.

Tu aides les utilisateurs a:
- Comprendre les metriques de confiance (Trust Score, drift, fiabilite, hallucination)
- Analyser les performances et couts de leurs systemes IA
- Investiguer les alertes et incidents
- Optimiser les couts (FinOps) et l'empreinte carbone (GreenOps)
- Assurer la conformite reglementaire (EU AI Act, RGPD)
- Securiser leurs systemes IA

Regles importantes:
- Reponds toujours en francais
- Sois concis mais informatif
- Utilise le markdown pour structurer tes reponses
- Propose des actions concretes quand c'est pertinent
- Si tu ne connais pas une information specifique, dis-le clairement
- Adapte ton niveau technique au contexte de la question"""
        else:
            return """You are the AI assistant for GASKIA, an AI observability platform.

You help users:
- Understand trust metrics (Trust Score, drift, reliability, hallucination)
- Analyze performance and costs of their AI systems
- Investigate alerts and incidents
- Optimize costs (FinOps) and carbon footprint (GreenOps)
- Ensure regulatory compliance (EU AI Act, GDPR)
- Secure their AI systems

Important rules:
- Always respond in English
- Be concise but informative
- Use markdown to structure your responses
- Suggest concrete actions when relevant
- If you don't know specific information, say so clearly
- Adapt your technical level to the context of the question"""

    async def chat(
        self,
        query: str,
        session_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        language: str = "en",
    ) -> LLMResponse:
        """Send a chat message and get response"""

        # Get or create conversation history
        if session_id and session_id in self._conversation_history:
            messages = self._conversation_history[session_id].copy()
        else:
            messages = []

        # Add new user message
        user_message = ChatMessage(role="user", content=query)
        messages.append(user_message)

        # Get system prompt
        system_prompt = self.get_system_prompt(language)

        # Add context if provided
        if context:
            context_str = f"\n\nContexte actuel:\n{json.dumps(context, indent=2, ensure_ascii=False)}"
            system_prompt += context_str

        try:
            # Get response from provider
            response = await self.provider.chat(messages, system_prompt)

            # Save to history
            if session_id:
                messages.append(ChatMessage(role="assistant", content=response.content))
                # Keep only last 20 messages
                self._conversation_history[session_id] = messages[-20:]

            # Extract insights and actions from response
            response = self._enrich_response(response, query, language)

            return response

        except Exception as e:
            logger.error(f"LLM chat error: {e}")
            # Return error response
            error_msg = "Je suis desole, une erreur s'est produite." if language == "fr" else "I'm sorry, an error occurred."
            return LLMResponse(
                content=f"{error_msg} {str(e)}",
                model=self.config.model,
                provider=self.config.provider.value,
                confidence=0.0,
            )

    async def chat_stream(
        self,
        query: str,
        session_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        language: str = "en",
    ) -> AsyncIterator[str]:
        """Stream chat response"""

        # Get or create conversation history
        if session_id and session_id in self._conversation_history:
            messages = self._conversation_history[session_id].copy()
        else:
            messages = []

        # Add new user message
        user_message = ChatMessage(role="user", content=query)
        messages.append(user_message)

        # Get system prompt
        system_prompt = self.get_system_prompt(language)

        # Add context if provided
        if context:
            context_str = f"\n\nContexte actuel:\n{json.dumps(context, indent=2, ensure_ascii=False)}"
            system_prompt += context_str

        full_response = ""
        async for chunk in self.provider.chat_stream(messages, system_prompt):
            full_response += chunk
            yield chunk

        # Save to history
        if session_id:
            messages.append(ChatMessage(role="assistant", content=full_response))
            self._conversation_history[session_id] = messages[-20:]

    def _enrich_response(self, response: LLMResponse, query: str, language: str) -> LLMResponse:
        """Enrich response with insights and suggested actions"""

        query_lower = query.lower()

        # Determine relevant insights based on query
        insights = []
        suggested_actions = []
        related_metrics = []

        if any(word in query_lower for word in ["trust", "score", "confiance"]):
            insights = [
                {"type": "trend", "title": "Trust Score Stable", "severity": "info"},
            ]
            suggested_actions = [
                "Examiner le rapport detaille de drift" if language == "fr" else "Review detailed drift report",
                "Verifier les metriques de fiabilite" if language == "fr" else "Check reliability metrics",
            ]
            related_metrics = ["drift", "reliability", "hallucination"]

        elif any(word in query_lower for word in ["drift", "derive"]):
            insights = [
                {"type": "anomaly", "title": "Data Drift Detected", "severity": "warning"},
            ]
            suggested_actions = [
                "Investiguer les sources de donnees" if language == "fr" else "Investigate data sources",
                "Planifier un re-entrainement" if language == "fr" else "Schedule retraining",
            ]
            related_metrics = ["data_drift", "feature_drift", "prediction_drift"]

        elif any(word in query_lower for word in ["cost", "cout", "budget"]):
            insights = [
                {"type": "optimization", "title": "Cost Optimization Available", "severity": "info"},
            ]
            suggested_actions = [
                "Configurer le routage intelligent" if language == "fr" else "Configure intelligent routing",
                "Activer la mise en cache" if language == "fr" else "Enable caching",
            ]
            related_metrics = ["daily_cost", "cost_per_inference", "budget_utilization"]

        elif any(word in query_lower for word in ["alert", "alerte", "incident"]):
            insights = [
                {"type": "alert", "title": "Active Alerts", "severity": "warning"},
            ]
            suggested_actions = [
                "Voir les details de l'incident" if language == "fr" else "View incident details",
                "Lancer l'analyse causale" if language == "fr" else "Run causal analysis",
            ]
            related_metrics = ["error_rate", "latency_p99", "availability"]

        response.insights = insights
        response.suggested_actions = suggested_actions
        response.related_metrics = related_metrics
        response.confidence = 0.9

        return response

    def clear_history(self, session_id: str):
        """Clear conversation history for a session"""
        if session_id in self._conversation_history:
            del self._conversation_history[session_id]

    async def close(self):
        """Close the service and cleanup resources"""
        await self.provider.close()


# Singleton instance
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get or create the LLM service singleton"""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service


async def shutdown_llm_service():
    """Shutdown the LLM service"""
    global _llm_service
    if _llm_service:
        await _llm_service.close()
        _llm_service = None
