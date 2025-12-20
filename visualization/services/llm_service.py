"""
AIOBS LLM Service
Using LiteLLM for unified, robust multi-provider LLM support
"""

import asyncio
import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, AsyncIterator, Dict, List, Optional

logger = logging.getLogger("aiobs.llm")


class LLMProvider(str, Enum):
    """Supported LLM providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    MISTRAL = "mistral"
    MOCK = "mock"


@dataclass
class LLMConfig:
    """LLM service configuration"""
    provider: LLMProvider = LLMProvider.MOCK
    api_key: Optional[str] = None
    model: str = "gpt-4o-mini"
    max_tokens: int = 2048
    temperature: float = 0.7
    timeout: float = 60.0


@dataclass
class ChatMessage:
    """Chat message structure"""
    role: str
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
    insights: List[Dict[str, Any]] = field(default_factory=list)
    suggested_actions: List[str] = field(default_factory=list)
    related_metrics: List[str] = field(default_factory=list)
    confidence: float = 0.9


class LLMService:
    """Main LLM service using LiteLLM for multi-provider support"""

    def __init__(self, config: Optional[LLMConfig] = None):
        self.config = config or self._load_config()
        self._conversation_history: Dict[str, List[ChatMessage]] = {}
        self._litellm = None
        self._init_litellm()

    def _init_litellm(self):
        """Initialize LiteLLM if available and provider is not mock"""
        if self.config.provider == LLMProvider.MOCK:
            return

        try:
            import litellm
            self._litellm = litellm

            # Configure LiteLLM
            litellm.set_verbose = False

            # Set API keys from config
            if self.config.provider == LLMProvider.OPENAI and self.config.api_key:
                os.environ["OPENAI_API_KEY"] = self.config.api_key
            elif self.config.provider == LLMProvider.ANTHROPIC and self.config.api_key:
                os.environ["ANTHROPIC_API_KEY"] = self.config.api_key
            elif self.config.provider == LLMProvider.MISTRAL and self.config.api_key:
                os.environ["MISTRAL_API_KEY"] = self.config.api_key

            logger.info(f"LiteLLM initialized with {self.config.provider.value} provider")
        except ImportError:
            logger.warning("LiteLLM not installed. Falling back to mock provider. Install with: pip install litellm")
            self.config.provider = LLMProvider.MOCK

    def _load_config(self) -> LLMConfig:
        """Load configuration from environment variables"""
        provider_name = os.getenv("LLM_PROVIDER", "mock").lower()

        # Map provider name to config
        provider_configs = {
            "openai": {
                "provider": LLMProvider.OPENAI,
                "api_key_env": "OPENAI_API_KEY",
                "model_env": "OPENAI_MODEL",
                "default_model": "gpt-4o-mini"
            },
            "anthropic": {
                "provider": LLMProvider.ANTHROPIC,
                "api_key_env": "ANTHROPIC_API_KEY",
                "model_env": "ANTHROPIC_MODEL",
                "default_model": "claude-3-haiku-20240307"
            },
            "mistral": {
                "provider": LLMProvider.MISTRAL,
                "api_key_env": "MISTRAL_API_KEY",
                "model_env": "MISTRAL_MODEL",
                "default_model": "mistral-large-latest"
            }
        }

        if provider_name in provider_configs:
            cfg = provider_configs[provider_name]
            api_key = os.getenv(cfg["api_key_env"])

            if api_key:
                provider = cfg["provider"]
                model = os.getenv(cfg["model_env"], cfg["default_model"])

                # Add provider prefix for LiteLLM
                if provider == LLMProvider.MISTRAL and not model.startswith("mistral/"):
                    model = f"mistral/{model}"
                elif provider == LLMProvider.ANTHROPIC and not model.startswith("anthropic/"):
                    # Anthropic models don't need prefix in LiteLLM
                    pass

                logger.info(f"LLM Service configured with {provider.value} provider (model: {model})")

                return LLMConfig(
                    provider=provider,
                    api_key=api_key,
                    model=model,
                    max_tokens=int(os.getenv("LLM_MAX_TOKENS", "2048")),
                    temperature=float(os.getenv("LLM_TEMPERATURE", "0.7")),
                    timeout=float(os.getenv("LLM_TIMEOUT", "60")),
                )
            else:
                logger.warning(
                    f"Provider '{provider_name}' requested but {cfg['api_key_env']} not found. "
                    f"Falling back to Mock provider."
                )

        logger.info("LLM Service initialized with Mock provider (for development/testing)")
        return LLMConfig(
            provider=LLMProvider.MOCK,
            api_key=None,
            model="mock-model",
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", "2048")),
            temperature=float(os.getenv("LLM_TEMPERATURE", "0.7")),
            timeout=float(os.getenv("LLM_TIMEOUT", "60")),
        )

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

        # Build messages
        messages = []

        # Get conversation history
        if session_id and session_id in self._conversation_history:
            for msg in self._conversation_history[session_id]:
                messages.append({"role": msg.role, "content": msg.content})

        # Add user message
        messages.append({"role": "user", "content": query})

        # Get system prompt
        system_prompt = self.get_system_prompt(language)
        if context:
            system_prompt += f"\n\nContexte actuel:\n{json.dumps(context, indent=2, ensure_ascii=False)}"

        try:
            if self.config.provider == LLMProvider.MOCK or self._litellm is None:
                # Use mock response
                response = await self._mock_chat(query, language)
            else:
                # Use LiteLLM
                response = await self._litellm_chat(messages, system_prompt)

            # Save to history
            if session_id:
                if session_id not in self._conversation_history:
                    self._conversation_history[session_id] = []
                self._conversation_history[session_id].append(
                    ChatMessage(role="user", content=query)
                )
                self._conversation_history[session_id].append(
                    ChatMessage(role="assistant", content=response.content)
                )
                # Keep only last 20 messages
                self._conversation_history[session_id] = self._conversation_history[session_id][-20:]

            # Enrich response
            return self._enrich_response(response, query, language)

        except Exception as e:
            logger.error(f"LLM chat error: {e}")
            error_msg = "Je suis desole, une erreur s'est produite." if language == "fr" else "I'm sorry, an error occurred."
            return LLMResponse(
                content=f"{error_msg} {str(e)}",
                model=self.config.model,
                provider=self.config.provider.value,
                confidence=0.0,
            )

    async def _litellm_chat(self, messages: List[Dict], system_prompt: str) -> LLMResponse:
        """Call LiteLLM for chat completion"""
        import litellm

        # Prepare messages with system prompt
        full_messages = [{"role": "system", "content": system_prompt}] + messages

        try:
            # Use acompletion for async
            response = await litellm.acompletion(
                model=self.config.model,
                messages=full_messages,
                max_tokens=self.config.max_tokens,
                temperature=self.config.temperature,
                timeout=self.config.timeout,
            )

            content = response.choices[0].message.content

            return LLMResponse(
                content=content,
                model=response.model or self.config.model,
                provider=self.config.provider.value,
                usage={
                    "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                    "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                },
                finish_reason=response.choices[0].finish_reason,
            )
        except Exception as e:
            logger.error(f"LiteLLM error: {e}")
            raise

    async def _mock_chat(self, query: str, language: str) -> LLMResponse:
        """Generate mock response for testing"""
        await asyncio.sleep(0.5)  # Simulate API delay

        response_content = self._generate_mock_response(query, language)

        return LLMResponse(
            content=response_content,
            model="mock-model",
            provider="mock",
            usage={"prompt_tokens": 50, "completion_tokens": 100},
            finish_reason="stop",
        )

    def _generate_mock_response(self, query: str, language: str = "en") -> str:
        """Generate mock response based on query content"""
        query_lower = query.lower()

        if any(word in query_lower for word in ["trust", "score", "confiance"]):
            if language == "fr":
                return (
                    "Le **Trust Score** actuel de votre systeme IA est de **87%**, ce qui est dans la plage saine. "
                    "Voici les composants principaux:\n\n"
                    "- **Fiabilite**: 92% - Excellente stabilite des predictions\n"
                    "- **Drift**: 0.08 - Faible derive des donnees\n"
                    "- **Hallucination**: 0.05 - Risque minimal\n\n"
                    "Je recommande de surveiller le drift des features `age` et `income` qui montrent une legere augmentation."
                )
            return (
                "The current **Trust Score** of your AI system is **87%**, which is in the healthy range. "
                "Here are the main components:\n\n"
                "- **Reliability**: 92% - Excellent prediction stability\n"
                "- **Drift**: 0.08 - Low data drift\n"
                "- **Hallucination**: 0.05 - Minimal risk\n\n"
                "I recommend monitoring the drift of `age` and `income` features which show a slight increase."
            )

        elif any(word in query_lower for word in ["alert", "alerte", "warning", "incident"]):
            if language == "fr":
                return (
                    "**3 alertes actives** dans votre systeme:\n\n"
                    "1. **HAUTE** - Latence P99 > 2s sur `recommendation-service`\n"
                    "   - Debut: il y a 15 minutes\n"
                    "   - Impact: 1,200 utilisateurs affectes\n\n"
                    "2. **MOYENNE** - Drift detecte sur `fraud-detection-model`\n"
                    "   - Niveau: 12% au-dessus du seuil\n\n"
                    "3. **BASSE** - Augmentation du taux d'erreur sur `api-gateway`\n"
                    "   - Taux actuel: 0.5% (seuil: 0.3%)"
                )
            return (
                "**3 active alerts** in your system:\n\n"
                "1. **HIGH** - P99 latency > 2s on `recommendation-service`\n"
                "   - Started: 15 minutes ago\n"
                "   - Impact: 1,200 users affected\n\n"
                "2. **MEDIUM** - Drift detected on `fraud-detection-model`\n"
                "   - Level: 12% above threshold\n\n"
                "3. **LOW** - Error rate increase on `api-gateway`\n"
                "   - Current rate: 0.5% (threshold: 0.3%)"
            )

        elif any(word in query_lower for word in ["cost", "cout", "budget", "prix"]):
            if language == "fr":
                return (
                    "Voici l'analyse **FinOps** de vos systemes IA:\n\n"
                    "**Couts Journaliers:** $1,250 (+5% vs hier)\n"
                    "**Couts Mensuels Projetes:** $38,500\n\n"
                    "**Repartition par modele:**\n"
                    "- GPT-4o: 65% ($812/jour)\n"
                    "- Claude: 25% ($312/jour)\n"
                    "- Modeles internes: 10% ($126/jour)\n\n"
                    "**Opportunites d'optimisation:**\n"
                    "- Routage intelligent: economie potentielle de **20%**\n"
                    "- Mise en cache: economie potentielle de **15%**"
                )
            return (
                "Here's the **FinOps** analysis of your AI systems:\n\n"
                "**Daily Costs:** $1,250 (+5% vs yesterday)\n"
                "**Projected Monthly Costs:** $38,500\n\n"
                "**Breakdown by model:**\n"
                "- GPT-4o: 65% ($812/day)\n"
                "- Claude: 25% ($312/day)\n"
                "- Internal models: 10% ($126/day)\n\n"
                "**Optimization opportunities:**\n"
                "- Intelligent routing: potential savings of **20%**\n"
                "- Caching: potential savings of **15%**"
            )

        elif any(word in query_lower for word in ["drift", "derive", "change"]):
            if language == "fr":
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
            return (
                "I've detected **data drift** on several features:\n\n"
                "1. **Feature `user_location`**: Distribution shift of +15% (warning)\n"
                "2. **Feature `purchase_amount`**: Stable (+2%)\n"
                "3. **Feature `session_duration`**: Slight drift of +8%\n\n"
                "**Recommendations:**\n"
                "- Investigate data source changes\n"
                "- Consider model retraining if drift persists\n"
                "- Set up automatic alerts for drift > 10%"
            )

        elif any(word in query_lower for word in ["carbon", "carbone", "co2", "green", "environnement"]):
            if language == "fr":
                return (
                    "**Empreinte Carbone IA - Rapport Journalier:**\n\n"
                    "- **Emissions totales:** 45.2 kg CO2eq\n"
                    "- **Consommation energetique:** 180 kWh\n"
                    "- **Intensite carbone:** 0.25 kg CO2/1000 inferences\n\n"
                    "**Tendances:**\n"
                    "- -12% vs mois dernier (excellent!)\n"
                    "- Region la plus verte: `eu-north-1`\n\n"
                    "**Recommandations GreenOps:**\n"
                    "- Migrer les jobs batch vers `eu-north-1` pour -30% d'emissions"
                )
            return (
                "**AI Carbon Footprint - Daily Report:**\n\n"
                "- **Total emissions:** 45.2 kg CO2eq\n"
                "- **Energy consumption:** 180 kWh\n"
                "- **Carbon intensity:** 0.25 kg CO2/1000 inferences\n\n"
                "**Trends:**\n"
                "- -12% vs last month (excellent!)\n"
                "- Greenest region: `eu-north-1`\n\n"
                "**GreenOps Recommendations:**\n"
                "- Migrate batch jobs to `eu-north-1` for -30% emissions"
            )

        elif any(word in query_lower for word in ["help", "aide", "comment", "how", "quoi", "navigate"]):
            if language == "fr":
                return (
                    "Bonjour! Je suis l'assistant IA de **GASKIA** et je peux vous aider avec:\n\n"
                    "**Analyses disponibles:**\n"
                    "- **Trust Score**: Etat de sante global de vos systemes IA\n"
                    "- **Drift Detection**: Surveillance des derives de donnees\n"
                    "- **FinOps**: Analyse et optimisation des couts\n"
                    "- **GreenOps**: Empreinte carbone et durabilite\n"
                    "- **Securite**: Posture securite et menaces\n"
                    "- **Alertes**: Incidents et problemes en cours\n\n"
                    "**Navigation:**\n"
                    "- Menu lateral gauche pour acceder aux dashboards\n"
                    "- Selecteur de persona en haut pour changer de vue\n"
                    "- Recherche globale avec Ctrl+K"
                )
            return (
                "Hello! I'm the **GASKIA** AI assistant and I can help you with:\n\n"
                "**Available analyses:**\n"
                "- **Trust Score**: Overall health of your AI systems\n"
                "- **Drift Detection**: Data drift monitoring\n"
                "- **FinOps**: Cost analysis and optimization\n"
                "- **GreenOps**: Carbon footprint and sustainability\n"
                "- **Security**: Security posture and threats\n"
                "- **Alerts**: Active incidents and issues\n\n"
                "**Navigation:**\n"
                "- Left sidebar for dashboard access\n"
                "- Persona selector at top to switch views\n"
                "- Global search with Ctrl+K"
            )
        else:
            if language == "fr":
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
            return (
                "I understand your question. Here's what I can tell you:\n\n"
                "Your AI systems are running well overall with a **Trust Score of 87%**. "
                "There are no critical alerts at this time.\n\n"
                "Would you like me to analyze a specific aspect like:\n"
                "- Performance metrics?\n"
                "- Costs and optimizations?\n"
                "- Security and compliance?\n"
                "- Carbon footprint?\n\n"
                "Ask me a more specific question and I'll provide a detailed analysis."
            )

    async def chat_stream(
        self,
        query: str,
        session_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        language: str = "en",
    ) -> AsyncIterator[str]:
        """Stream chat response"""

        # Build messages
        messages = []
        if session_id and session_id in self._conversation_history:
            for msg in self._conversation_history[session_id]:
                messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": query})

        # Get system prompt
        system_prompt = self.get_system_prompt(language)
        if context:
            system_prompt += f"\n\nContexte actuel:\n{json.dumps(context, indent=2, ensure_ascii=False)}"

        full_response = ""

        if self.config.provider == LLMProvider.MOCK or self._litellm is None:
            # Mock streaming
            response = self._generate_mock_response(query, language)
            for word in response.split():
                await asyncio.sleep(0.03)
                chunk = word + " "
                full_response += chunk
                yield chunk
        else:
            # LiteLLM streaming
            try:
                import litellm

                full_messages = [{"role": "system", "content": system_prompt}] + messages

                response = await litellm.acompletion(
                    model=self.config.model,
                    messages=full_messages,
                    max_tokens=self.config.max_tokens,
                    temperature=self.config.temperature,
                    stream=True,
                )

                async for chunk in response:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_response += content
                        yield content

            except Exception as e:
                logger.error(f"Streaming error: {e}")
                error_msg = f"Error: {str(e)}"
                yield error_msg
                full_response = error_msg

        # Save to history
        if session_id:
            if session_id not in self._conversation_history:
                self._conversation_history[session_id] = []
            self._conversation_history[session_id].append(
                ChatMessage(role="user", content=query)
            )
            self._conversation_history[session_id].append(
                ChatMessage(role="assistant", content=full_response)
            )
            self._conversation_history[session_id] = self._conversation_history[session_id][-20:]

    def _enrich_response(self, response: LLMResponse, query: str, language: str) -> LLMResponse:
        """Enrich response with insights and suggested actions"""
        query_lower = query.lower()

        if any(word in query_lower for word in ["trust", "score", "confiance"]):
            response.insights = [{"type": "trend", "title": "Trust Score Stable", "severity": "info"}]
            response.suggested_actions = [
                "Examiner le rapport detaille de drift" if language == "fr" else "Review detailed drift report",
                "Verifier les metriques de fiabilite" if language == "fr" else "Check reliability metrics",
            ]
            response.related_metrics = ["drift", "reliability", "hallucination"]

        elif any(word in query_lower for word in ["drift", "derive"]):
            response.insights = [{"type": "anomaly", "title": "Data Drift Detected", "severity": "warning"}]
            response.suggested_actions = [
                "Investiguer les sources de donnees" if language == "fr" else "Investigate data sources",
                "Planifier un re-entrainement" if language == "fr" else "Schedule retraining",
            ]
            response.related_metrics = ["data_drift", "feature_drift", "prediction_drift"]

        elif any(word in query_lower for word in ["cost", "cout", "budget"]):
            response.insights = [{"type": "optimization", "title": "Cost Optimization Available", "severity": "info"}]
            response.suggested_actions = [
                "Configurer le routage intelligent" if language == "fr" else "Configure intelligent routing",
                "Activer la mise en cache" if language == "fr" else "Enable caching",
            ]
            response.related_metrics = ["daily_cost", "cost_per_inference", "budget_utilization"]

        elif any(word in query_lower for word in ["alert", "alerte", "incident"]):
            response.insights = [{"type": "alert", "title": "Active Alerts", "severity": "warning"}]
            response.suggested_actions = [
                "Voir les details de l'incident" if language == "fr" else "View incident details",
                "Lancer l'analyse causale" if language == "fr" else "Run causal analysis",
            ]
            response.related_metrics = ["error_rate", "latency_p99", "availability"]

        response.confidence = 0.9
        return response

    def clear_history(self, session_id: str):
        """Clear conversation history for a session"""
        if session_id in self._conversation_history:
            del self._conversation_history[session_id]

    async def close(self):
        """Close the service and cleanup resources"""
        pass


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
