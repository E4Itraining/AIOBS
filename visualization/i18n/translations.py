"""
AIOBS Translation Manager
Multi-language support with fallback mechanism
"""

from typing import Dict, Optional, Any
import json
import os
from pathlib import Path

# Supported languages with metadata
SUPPORTED_LANGUAGES = {
    'en': {'name': 'English', 'native': 'English', 'flag': '🇬🇧', 'rtl': False},
    'fr': {'name': 'French', 'native': 'Français', 'flag': '🇫🇷', 'rtl': False},
    'es': {'name': 'Spanish', 'native': 'Español', 'flag': '🇪🇸', 'rtl': False},
    'de': {'name': 'German', 'native': 'Deutsch', 'flag': '🇩🇪', 'rtl': False},
    'pt': {'name': 'Portuguese', 'native': 'Português', 'flag': '🇵🇹', 'rtl': False},
    'it': {'name': 'Italian', 'native': 'Italiano', 'flag': '🇮🇹', 'rtl': False},
    'zh': {'name': 'Chinese', 'native': '中文', 'flag': '🇨🇳', 'rtl': False},
    'ja': {'name': 'Japanese', 'native': '日本語', 'flag': '🇯🇵', 'rtl': False},
    'ko': {'name': 'Korean', 'native': '한국어', 'flag': '🇰🇷', 'rtl': False},
    'ar': {'name': 'Arabic', 'native': 'العربية', 'flag': '🇸🇦', 'rtl': True},
}

DEFAULT_LANGUAGE = 'en'


class TranslationManager:
    """
    Manages translations with lazy loading and fallback support
    """

    def __init__(self):
        self._translations: Dict[str, Dict[str, Any]] = {}
        self._loaded_languages: set = set()
        self._translations_dir = Path(__file__).parent / 'locales'

        # Pre-load default language
        self._load_language(DEFAULT_LANGUAGE)

    def _load_language(self, lang: str) -> None:
        """Load translation file for a specific language"""
        if lang in self._loaded_languages:
            return

        file_path = self._translations_dir / f'{lang}.json'

        if file_path.exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                self._translations[lang] = json.load(f)
        else:
            # Use inline translations if file doesn't exist
            self._translations[lang] = self._get_inline_translations(lang)

        self._loaded_languages.add(lang)

    def _get_inline_translations(self, lang: str) -> Dict[str, Any]:
        """Get inline translations for a language"""
        return TRANSLATIONS.get(lang, TRANSLATIONS[DEFAULT_LANGUAGE])

    def get(self, key: str, lang: str = DEFAULT_LANGUAGE, **kwargs) -> str:
        """
        Get translated string with optional variable interpolation

        Args:
            key: Translation key using dot notation (e.g., 'nav.dashboard')
            lang: Target language code
            **kwargs: Variables to interpolate in the string

        Returns:
            Translated string or key if not found
        """
        # Ensure language is loaded
        if lang not in self._loaded_languages:
            self._load_language(lang)

        # Navigate through nested keys
        translation = self._translations.get(lang, {})
        keys = key.split('.')

        for k in keys:
            if isinstance(translation, dict):
                translation = translation.get(k)
            else:
                translation = None
                break

        # Fallback to default language
        if translation is None and lang != DEFAULT_LANGUAGE:
            return self.get(key, DEFAULT_LANGUAGE, **kwargs)

        # Return key if not found
        if translation is None:
            return key

        # Interpolate variables
        if kwargs:
            try:
                return translation.format(**kwargs)
            except KeyError:
                return translation

        return translation

    def get_all(self, lang: str = DEFAULT_LANGUAGE) -> Dict[str, Any]:
        """Get all translations for a language"""
        if lang not in self._loaded_languages:
            self._load_language(lang)
        return self._translations.get(lang, {})


# Singleton instance
_translator: Optional[TranslationManager] = None


def get_translator() -> TranslationManager:
    """Get the global translator instance"""
    global _translator
    if _translator is None:
        _translator = TranslationManager()
    return _translator


# ============================================================================
# INLINE TRANSLATIONS (Comprehensive multi-language support)
# ============================================================================

TRANSLATIONS = {
    'en': {
        'app': {
            'name': 'AIOBS',
            'title': 'AI Observability Hub',
            'subtitle': 'Trust Control Layer for AI Systems',
            'version': 'Version'
        },
        'nav': {
            'overview': 'Overview',
            'dashboard': 'Dashboard',
            'unified_view': 'Unified View',
            'analysis': 'Analysis',
            'causal_analysis': 'Causal Analysis',
            'impact_analysis': 'Impact Analysis',
            'configuration': 'Configuration',
            'toggle_theme': 'Toggle Theme',
            'settings': 'Settings',
            'language': 'Language',
            # Getting Started section
            'getting_started': 'Getting Started',
            'home': 'Home',
            'personas': 'Personas & Guide',
            'executive_view': 'Executive View',
            # Profile navigation items
            'domains': 'Domains',
            'models': 'Models',
            'drift': 'Drift Detection',
            'reliability': 'Reliability',
            'experiments': 'Experiments',
            'services': 'Services',
            'slo': 'SLO/SLI',
            'topology': 'Topology',
            'alerts': 'Alerts',
            'logs': 'Logs',
            'impact': 'Business Impact',
            'costs': 'Costs',
            'reports': 'Reports',
            'features': 'AI Features',
            'performance': 'Performance',
            'user_impact': 'User Impact',
            'security': 'Security',
            'incidents': 'Incidents',
            'access_logs': 'Access Logs',
            'threats': 'Threat Detection',
            'compliance': 'Compliance',
            'audit_trail': 'Audit Trail',
            'regulations': 'Regulations',
            'evidence': 'Evidence',
            'carbon': 'Carbon',
            'energy': 'Energy',
            'sustainability': 'Sustainability',
            'esg_reports': 'ESG Reports',
            # Data Scientist navigation
            'data_quality': 'Data Quality',
            'statistics': 'Statistics',
            # DSI navigation
            'ai_portfolio': 'AI Portfolio',
            'governance': 'IT Governance',
            'budget': 'Budget',
            'risks': 'Risks',
            'transformation': 'Digital Transformation',
            'executive_reports': 'Executive Reports',
            # RSI navigation
            'systems': 'Systems',
            'projects': 'Projects',
            'resources': 'Resources',
            'sla_monitoring': 'SLA Monitoring',
            'ops_reports': 'Ops Reports',
            # DPO navigation
            'privacy_dashboard': 'Privacy Dashboard',
            'processing_registry': 'Processing Registry',
            'dpia': 'DPIA',
            'dsar': 'Data Subject Requests',
            'data_flows': 'Data Flows',
            'privacy_incidents': 'Privacy Incidents',
            # Legal navigation
            'legal_dashboard': 'Legal Dashboard',
            'contracts': 'Contracts',
            'regulatory_watch': 'Regulatory Watch',
            'intellectual_property': 'Intellectual Property',
            'liability': 'Liability',
            'legal_reports': 'Legal Reports',
            # Persona Views navigation
            'personas_views': 'Perspectives',
            'global_view': 'Global',
            'dirigeant_view': 'Business',
            'tech_view': 'Tech',
            'juridique_view': 'Legal',
            'financier_view': 'Finance',
            'technical_views': 'Technical Views',
            # Operations and Governance
            'operations': 'Operations',
            'monitoring': 'Live Monitoring',
            'finops': 'Costs & FinOps',
            'greenops': 'Carbon Impact',
            # Navigation sections (menu structure)
            'my_journey': 'My Journey',
            'my_essentials': 'My Essentials',
            'explore': 'Explore',
            'perspectives': 'Perspectives',
            'views': 'Views',
            'select_persona': 'Select',
            'change_journey': 'Change Journey'
        },
        'dashboard': {
            'title': 'AI Observability Dashboard',
            'subtitle': 'AI Observability',
            'trust_score': 'Trust Score',
            'daily_inferences': 'Daily Inferences',
            'daily_cost': 'Daily Cost',
            'carbon_footprint': 'Carbon (kgCO2)',
            'system_health': 'System Health',
            'active_alerts': 'Active Alerts',
            'healthy': 'Healthy',
            'degraded': 'Degraded',
            'unhealthy': 'Unhealthy',
            'critical': 'Critical',
            'warning': 'Warning',
            'info': 'Info',
            'trust_score_trend': 'Trust Score Trend',
            'slo_compliance': 'SLO Compliance',
            'compliant': 'Compliant',
            'at_risk': 'At Risk',
            'violated': 'Violated',
            'services_status': 'Services Status',
            'search_services': 'Search services...',
            'top_issues': 'Top Issues',
            'investigate': 'Investigate'
        },
        'table': {
            'service': 'Service',
            'type': 'Type',
            'status': 'Status',
            'uptime': 'Uptime',
            'error_rate': 'Error Rate',
            'latency_p99': 'Latency P99'
        },
        'time': {
            'last_24h': 'Last 24h',
            'last_7d': 'Last 7d',
            'last_30d': 'Last 30d',
            'minutes': 'min',
            'hours': 'hours',
            'days': 'days'
        },
        'trends': {
            'up': 'Up',
            'down': 'Down',
            'stable': 'Stable',
            'improving': 'Improving',
            'degrading': 'Degrading'
        },
        'profiles': {
            'all': 'All',
            'ml_engineer': 'ML Engineer',
            'devops': 'DevOps',
            'data_scientist': 'Data Scientist',
            'executive': 'Executive',
            'product_owner': 'Product Owner',
            'security': 'Security Analyst',
            'compliance': 'Compliance Officer',
            'esg': 'ESG Manager',
            'dsi': 'CIO / DSI',
            'rsi': 'IT Manager / RSI',
            'dpo': 'Data Protection Officer',
            'legal': 'Legal Counsel'
        },
        'cognitive': {
            'title': 'Cognitive Metrics',
            'drift': 'Drift Detection',
            'reliability': 'Reliability',
            'hallucination': 'Hallucination Risk',
            'degradation': 'Degradation',
            'trust': 'Trust Indicator',
            'confidence': 'Confidence',
            'severity': 'Severity',
            'low': 'Low',
            'medium': 'Medium',
            'high': 'High'
        },
        'causal': {
            'title': 'Causal Analysis',
            'root_cause': 'Root Cause',
            'root_causes': 'Root Causes',
            'impact': 'Impact',
            'impact_path': 'Impact Path',
            'correlation': 'Correlation',
            'dependency': 'Dependency',
            'run_analysis': 'Run Analysis',
            'graph': 'Causal Graph',
            'timeline': 'Timeline',
            'scenarios': 'Scenarios',
            'drift_incident': 'Drift Incident',
            'cost_spike': 'Cost Spike'
        },
        'impact': {
            'title': 'Business Impact Analysis',
            'event_types': 'Event Types',
            'model_drift': 'Model Drift',
            'degradation': 'Degradation',
            'cost_anomaly': 'Cost Anomaly',
            'latency_spike': 'Latency Spike',
            'analyze_event': 'Analyze Event Impact',
            'breakdown': 'Impact Breakdown'
        },
        'errors': {
            'load_failed': 'Failed to load data',
            'connection': 'Server connection error'
        },
        'unified': {
            'title': 'Unified Monitoring View',
            'all_systems': 'All Systems',
            'filter': 'Filter',
            'refresh': 'Refresh'
        },
        'actions': {
            'save': 'Save',
            'cancel': 'Cancel',
            'delete': 'Delete',
            'edit': 'Edit',
            'view': 'View',
            'export': 'Export',
            'refresh': 'Refresh',
            'filter': 'Filter',
            'search': 'Search',
            'close': 'Close',
            'confirm': 'Confirm'
        },
        'messages': {
            'loading': 'Loading...',
            'no_data': 'No data available',
            'error': 'An error occurred',
            'success': 'Operation successful',
            'confirm_delete': 'Are you sure you want to delete?'
        },
        'onboarding': {
            'title': 'Welcome to AIOBS',
            'subtitle': 'Choose your profile to get started',
            'welcome_title': 'Welcome to AIOBS',
            'welcome_subtitle': 'AI Trust Control Layer - Your unified observability platform for AI systems',
            'feature_observe': 'Observe',
            'feature_observe_desc': 'Monitor your AI models in real-time with comprehensive metrics',
            'feature_understand': 'Understand',
            'feature_understand_desc': 'Analyze root causes with causal graphs and impact analysis',
            'feature_trust': 'Trust',
            'feature_trust_desc': 'Ensure compliance and reliability with cognitive metrics',
            'get_started': 'Get Started',
            'who_are_you': 'Who are you?',
            'profile_desc': 'Select your role to get a personalized experience tailored to your needs.',
            'category_tech': 'Technical',
            'category_tech_desc': 'For engineers and data professionals',
            'category_business': 'Business',
            'category_business_desc': 'For executives and product leaders',
            'category_specialist': 'Specialist',
            'category_specialist_desc': 'For security, compliance and sustainability',
            'continue': 'Continue',
            'quick_tour': 'Quick Tour',
            'tour_desc': 'Here is what you can do with AIOBS based on your role.',
            'skip_tour': 'Skip tour',
            'start_dashboard': 'Go to Dashboard',
            'prompt': 'New here? Click the help button to get started!',
            'select_persona': 'Select your profile to personalize your experience',
            # Enhanced profile descriptions
            'ml_engineer_desc': 'Model health, multi-drift detection, cognitive metrics, reliability analysis, and causal root cause investigation',
            'devops_desc': 'SLO/SLI monitoring, service topology, performance metrics, alerts management, and deployment tracking',
            'data_scientist_desc': 'Data quality monitoring, feature analysis, A/B experiments, statistical insights, and model comparison',
            'product_owner_desc': 'AI features portfolio, user experience metrics, adoption funnels, A/B tests, and business impact tracking',
            'executive_desc': 'High-level KPIs, business impact, strategic overview, costs, and compliance status',
            'security_desc': 'Security posture, threats, incident management, and access monitoring',
            'compliance_desc': 'Regulatory compliance, audit trails, governance',
            'esg_desc': 'Carbon footprint, energy, sustainability metrics',
            # New category for governance
            'category_governance': 'Governance',
            'category_governance_desc': 'For IT directors and managers',
            'category_legal': 'Legal & Privacy',
            'category_legal_desc': 'For DPO and legal professionals',
            # New profile descriptions
            'dsi_desc': 'Strategic IT governance, AI portfolio, budget, transformation',
            'rsi_desc': 'Operational IT management, systems, projects, resources',
            'dpo_desc': 'GDPR compliance, data processing registry, DPIA, data rights',
            'legal_desc': 'Legal risk assessment, contracts, regulatory watch, IP',
            # Tour content for new profiles
            'tour_dsi_title': 'DSI / CIO Dashboard',
            'tour_dsi_desc': 'Strategic IT governance and AI portfolio management',
            'tour_dsi_1_title': 'AI Portfolio',
            'tour_dsi_1_desc': 'Overview of all AI systems with strategic metrics',
            'tour_dsi_2_title': 'Budget Allocation',
            'tour_dsi_2_desc': 'Track IT spending and ROI across AI initiatives',
            'tour_dsi_3_title': 'Risk Matrix',
            'tour_dsi_3_desc': 'Identify and manage IT risks with impact analysis',
            'tour_dsi_4_title': 'Digital Transformation',
            'tour_dsi_4_desc': 'Track transformation roadmap and maturity',
            'tour_rsi_title': 'RSI / IT Manager Dashboard',
            'tour_rsi_desc': 'Operational IT management and team coordination',
            'tour_rsi_1_title': 'Systems Status',
            'tour_rsi_1_desc': 'Real-time health monitoring of all AI systems',
            'tour_rsi_2_title': 'Projects Tracker',
            'tour_rsi_2_desc': 'Manage AI projects with kanban-style tracking',
            'tour_rsi_3_title': 'Incidents Management',
            'tour_rsi_3_desc': 'Track and resolve operational incidents',
            'tour_dpo_title': 'DPO Dashboard',
            'tour_dpo_desc': 'Data protection and GDPR compliance',
            'tour_dpo_1_title': 'Processing Registry',
            'tour_dpo_1_desc': 'Complete registry of AI data processing activities',
            'tour_dpo_2_title': 'DPIA Management',
            'tour_dpo_2_desc': 'Track and manage Data Protection Impact Assessments',
            'tour_dpo_3_title': 'Data Subject Requests',
            'tour_dpo_3_desc': 'Manage GDPR rights requests with deadline tracking',
            'tour_dpo_4_title': 'Data Flows',
            'tour_dpo_4_desc': 'Visualize personal data flows and transfers',
            'tour_legal_title': 'Legal Counsel Dashboard',
            'tour_legal_desc': 'Legal risk management and compliance',
            'tour_legal_1_title': 'Legal Risk Assessment',
            'tour_legal_1_desc': 'Evaluate AI legal risks: bias, liability, IP',
            'tour_legal_2_title': 'Regulatory Watch',
            'tour_legal_2_desc': 'Stay updated on EU AI Act and regulations',
            'tour_legal_3_title': 'Contracts Management',
            'tour_legal_3_desc': 'Track AI contracts, SLAs, and compliance'
        },
        'help': {
            'title': 'Help & Guide',
            'quick_actions': 'Quick Actions',
            'start_tour': 'Start Guided Tour',
            'start_tour_desc': 'Learn the basics with an interactive walkthrough',
            'change_profile': 'Change Profile',
            'change_profile_desc': 'Switch to a different user persona',
            'this_page': 'On This Page',
            'resources': 'Resources',
            'keyboard_shortcuts': 'Keyboard Shortcuts',
            'keyboard_shortcuts_desc': 'Speed up your workflow',
            'skip': 'Skip',
            'next': 'Next',
            'quick_tips': 'Quick Tips',
            'tip_1_title': 'Interactive KPIs',
            'tip_1': 'Click on any KPI card to see detailed metrics and trends',
            'tip_2_title': 'Quick Navigation',
            'tip_2': 'Use the sidebar to navigate between different specialized views',
            'tip_3_title': 'Causal Analysis',
            'tip_3': 'Click "Investigate" on any issue to see root cause analysis',
            'tip_4_title': 'AI Assistant',
            'tip_4': 'Ask your questions to the assistant at the bottom right'
        },
        'narrative': {
            'dashboard_title': 'Welcome to your AI Trust Control Center',
            'dashboard_desc': 'This dashboard provides a unified view of your AI systems\' health, performance, and reliability.'
        },
        'tour': {
            'kpi_title': 'Key Performance Indicators',
            'kpi_body': 'These cards show your most important AI metrics at a glance.',
            'nav_title': 'Navigation',
            'nav_body': 'Use the sidebar to navigate between different views.',
            'profile_title': 'Profile Selection',
            'profile_body': 'Switch between different user profiles to see dashboards tailored for your role.',
            'finish': 'Finish'
        },
        'chatbot': {
            'title': 'AI Assistant',
            'online': 'Online',
            'welcome_title': 'Hello! How can I help you?',
            'welcome_desc': 'Ask me anything about your AI systems, metrics, or how to use AIOBS.',
            'suggestions': 'Quick questions:',
            'q_trust': 'Trust score?',
            'q_alerts': 'Active alerts?',
            'q_costs': "Today's costs?",
            'q_navigate': 'How to navigate?',
            'placeholder': 'Type your question...',
            'error': 'Sorry, I encountered an error. Please try again.'
        },
        'search': {
            'placeholder': 'Search pages, metrics, services...',
            'results': 'Quick Navigation',
            'no_results': 'No results found'
        },
        'a11y': {
            'skip_to_content': 'Skip to main content',
            'loading': 'Loading...',
            'menu_open': 'Open menu',
            'menu_close': 'Close menu',
            'expand': 'Expand',
            'collapse': 'Collapse',
            'required_field': 'Required field',
            'error_message': 'Error:',
            'success_message': 'Success:',
            'warning_message': 'Warning:',
            'info_message': 'Information:'
        }
    },

    'fr': {
        'app': {
            'name': 'AIOBS',
            'title': 'Hub d\'Observabilité IA',
            'subtitle': 'Couche de Contrôle de Confiance pour Systèmes IA',
            'version': 'Version'
        },
        'nav': {
            'overview': 'Vue d\'ensemble',
            'dashboard': 'Tableau de bord',
            'unified_view': 'Vue Unifiée',
            'analysis': 'Analyse',
            'causal_analysis': 'Analyse Causale',
            'impact_analysis': 'Analyse d\'Impact',
            'configuration': 'Configuration',
            'toggle_theme': 'Changer le thème',
            'settings': 'Paramètres',
            'language': 'Langue',
            # Section Démarrage
            'getting_started': 'Démarrage',
            'home': 'Accueil',
            'personas': 'Personas & Guide',
            'executive_view': 'Vue Dirigeant',
            'domains': 'Domaines',
            'models': 'Modèles',
            'drift': 'Détection de Dérive',
            'reliability': 'Fiabilité',
            'experiments': 'Expériences',
            'services': 'Services',
            'slo': 'SLO/SLI',
            'topology': 'Topologie',
            'alerts': 'Alertes',
            'logs': 'Journaux',
            'impact': 'Impact Commercial',
            'costs': 'Coûts',
            'reports': 'Rapports',
            'features': 'Fonctionnalités IA',
            'performance': 'Performance',
            'user_impact': 'Impact Utilisateur',
            'security': 'Sécurité',
            'incidents': 'Incidents',
            'access_logs': 'Journaux d\'Accès',
            'threats': 'Détection de Menaces',
            'compliance': 'Conformité',
            'audit_trail': 'Piste d\'Audit',
            'regulations': 'Réglementations',
            'evidence': 'Preuves',
            'carbon': 'Carbone',
            'energy': 'Énergie',
            'sustainability': 'Durabilité',
            'esg_reports': 'Rapports ESG',
            # Data Scientist navigation
            'data_quality': 'Qualité des Données',
            'statistics': 'Statistiques',
            # DSI navigation
            'ai_portfolio': 'Portefeuille IA',
            'governance': 'Gouvernance SI',
            'budget': 'Budget',
            'risks': 'Risques',
            'transformation': 'Transformation Digitale',
            'executive_reports': 'Rapports Direction',
            # RSI navigation
            'systems': 'Systèmes',
            'projects': 'Projets',
            'resources': 'Ressources',
            'sla_monitoring': 'Suivi SLA',
            'ops_reports': 'Rapports Ops',
            # DPO navigation
            'privacy_dashboard': 'Tableau de Bord Vie Privée',
            'processing_registry': 'Registre des Traitements',
            'dpia': 'AIPD',
            'dsar': 'Demandes de Droits',
            'data_flows': 'Flux de Données',
            'privacy_incidents': 'Incidents Vie Privée',
            # Legal navigation
            'legal_dashboard': 'Tableau de Bord Juridique',
            'contracts': 'Contrats',
            'regulatory_watch': 'Veille Réglementaire',
            'intellectual_property': 'Propriété Intellectuelle',
            'liability': 'Responsabilité',
            'legal_reports': 'Rapports Juridiques',
            # Navigation Vues Persona
            'personas_views': 'Perspectives',
            'global_view': 'Global',
            'dirigeant_view': 'Business',
            'tech_view': 'Tech',
            'juridique_view': 'Juridique',
            'financier_view': 'Finance',
            'technical_views': 'Vues Techniques',
            # Opérations et Gouvernance
            'operations': 'Opérations',
            'monitoring': 'Monitoring Live',
            'finops': 'Coûts & FinOps',
            'greenops': 'Impact Carbone',
            # Sections de navigation (structure menu)
            'my_journey': 'Mon Parcours',
            'my_essentials': 'Mes Essentiels',
            'explore': 'Explorer',
            'perspectives': 'Perspectives',
            'views': 'Vues',
            'select_persona': 'Sélectionner',
            'change_journey': 'Changer de parcours'
        },
        'dashboard': {
            'title': 'Dashboard IA',
            'subtitle': 'Observabilité',
            'trust_score': 'Score de Confiance',
            'daily_inferences': 'Inférences Quotidiennes',
            'daily_cost': 'Coût Quotidien',
            'carbon_footprint': 'Carbone (kgCO2)',
            'system_health': 'Santé du Système',
            'active_alerts': 'Alertes Actives',
            'healthy': 'Sain',
            'degraded': 'Dégradé',
            'unhealthy': 'Non sain',
            'critical': 'Critique',
            'warning': 'Avertissement',
            'info': 'Info',
            'trust_score_trend': 'Tendance du Score de Confiance',
            'slo_compliance': 'Conformité SLO',
            'compliant': 'Conforme',
            'at_risk': 'À Risque',
            'violated': 'Violé',
            'services_status': 'État des Services',
            'search_services': 'Rechercher des services...',
            'top_issues': 'Problèmes Principaux',
            'investigate': 'Investiguer'
        },
        'table': {
            'service': 'Service',
            'type': 'Type',
            'status': 'Statut',
            'uptime': 'Disponibilité',
            'error_rate': 'Taux d\'erreur',
            'latency_p99': 'Latence P99'
        },
        'time': {
            'last_24h': 'Dernières 24h',
            'last_7d': 'Derniers 7j',
            'last_30d': 'Derniers 30j',
            'minutes': 'min',
            'hours': 'heures',
            'days': 'jours'
        },
        'trends': {
            'up': 'Hausse',
            'down': 'Baisse',
            'stable': 'Stable',
            'improving': 'En amélioration',
            'degrading': 'En dégradation'
        },
        'profiles': {
            'all': 'Tous',
            'ml_engineer': 'Ingénieur ML',
            'devops': 'DevOps',
            'data_scientist': 'Data Scientist',
            'executive': 'Direction',
            'product_owner': 'Product Owner',
            'security': 'Analyste Sécurité',
            'compliance': 'Responsable Conformité',
            'esg': 'Responsable ESG',
            'dsi': 'DSI',
            'rsi': 'RSI',
            'dpo': 'DPO',
            'legal': 'Juriste'
        },
        'cognitive': {
            'title': 'Métriques Cognitives',
            'drift': 'Détection de Dérive',
            'reliability': 'Fiabilité',
            'hallucination': 'Risque d\'Hallucination',
            'degradation': 'Dégradation',
            'trust': 'Indicateur de Confiance',
            'confidence': 'Confiance',
            'severity': 'Sévérité',
            'low': 'Faible',
            'medium': 'Moyen',
            'high': 'Élevé'
        },
        'causal': {
            'title': 'Analyse Causale',
            'root_cause': 'Cause Racine',
            'root_causes': 'Causes Racines',
            'impact': 'Impact',
            'impact_path': 'Chemin d\'Impact',
            'correlation': 'Corrélation',
            'dependency': 'Dépendance',
            'run_analysis': 'Lancer l\'Analyse',
            'graph': 'Graphe Causal',
            'timeline': 'Chronologie',
            'scenarios': 'Scénarios',
            'drift_incident': 'Incident de Dérive',
            'cost_spike': 'Pic de Coût'
        },
        'impact': {
            'title': 'Analyse d\'Impact Commercial',
            'event_types': 'Types d\'Événements',
            'model_drift': 'Dérive du Modèle',
            'degradation': 'Dégradation',
            'cost_anomaly': 'Anomalie de Coût',
            'latency_spike': 'Pic de Latence',
            'analyze_event': 'Analyser l\'Impact de l\'Événement',
            'breakdown': 'Répartition de l\'Impact'
        },
        'errors': {
            'load_failed': 'Erreur de chargement des données',
            'connection': 'Erreur de connexion au serveur'
        },
        'unified': {
            'title': 'Vue de Monitoring Unifiée',
            'all_systems': 'Tous les Systèmes',
            'filter': 'Filtrer',
            'refresh': 'Actualiser'
        },
        'actions': {
            'save': 'Enregistrer',
            'cancel': 'Annuler',
            'delete': 'Supprimer',
            'edit': 'Modifier',
            'view': 'Voir',
            'export': 'Exporter',
            'refresh': 'Actualiser',
            'filter': 'Filtrer',
            'search': 'Rechercher',
            'close': 'Fermer',
            'confirm': 'Confirmer'
        },
        'messages': {
            'loading': 'Chargement...',
            'no_data': 'Aucune donnée disponible',
            'error': 'Une erreur est survenue',
            'success': 'Opération réussie',
            'confirm_delete': 'Êtes-vous sûr de vouloir supprimer ?'
        },
        'onboarding': {
            'title': 'Bienvenue sur AIOBS',
            'subtitle': 'Choisissez votre profil pour commencer',
            'welcome_title': 'Bienvenue sur AIOBS',
            'welcome_subtitle': 'Couche de contrôle de confiance IA - Votre plateforme d\'observabilité unifiée',
            'feature_observe': 'Observer',
            'feature_observe_desc': 'Surveillez vos modèles IA en temps réel avec des métriques complètes',
            'feature_understand': 'Comprendre',
            'feature_understand_desc': 'Analysez les causes racines avec des graphes causaux et l\'analyse d\'impact',
            'feature_trust': 'Faire confiance',
            'feature_trust_desc': 'Assurez la conformité et la fiabilité avec des métriques cognitives',
            'get_started': 'Commencer',
            'who_are_you': 'Qui êtes-vous ?',
            'profile_desc': 'Sélectionnez votre rôle pour une expérience personnalisée adaptée à vos besoins.',
            'category_tech': 'Technique',
            'category_tech_desc': 'Pour les ingénieurs et professionnels des données',
            'category_business': 'Business',
            'category_business_desc': 'Pour les dirigeants et responsables produit',
            'category_specialist': 'Spécialiste',
            'category_specialist_desc': 'Pour la sécurité, la conformité et la durabilité',
            'continue': 'Continuer',
            'quick_tour': 'Visite rapide',
            'tour_desc': 'Voici ce que vous pouvez faire avec AIOBS selon votre rôle.',
            'skip_tour': 'Passer la visite',
            'start_dashboard': 'Aller au tableau de bord',
            'prompt': 'Nouveau ici ? Cliquez sur le bouton d\'aide pour commencer !',
            'select_persona': 'Sélectionnez votre profil pour personnaliser votre expérience',
            # Descriptions enrichies des profils
            'ml_engineer_desc': 'Santé des modèles, détection multi-dérive, métriques cognitives, analyse de fiabilité et investigation causale',
            'devops_desc': 'Monitoring SLO/SLI, topologie de services, métriques de performance, gestion des alertes et suivi des déploiements',
            'data_scientist_desc': 'Qualité des données, analyse des features, expériences A/B, insights statistiques et comparaison de modèles',
            'product_owner_desc': 'Portefeuille de fonctionnalités IA, métriques UX, tunnels d\'adoption, tests A/B et suivi d\'impact business',
            'executive_desc': 'KPIs de haut niveau, impact business, vue stratégique, coûts et conformité',
            'security_desc': 'Posture sécurité, menaces, gestion des incidents et monitoring des accès',
            'compliance_desc': 'Conformité réglementaire, pistes d\'audit, gouvernance',
            'esg_desc': 'Empreinte carbone, énergie, métriques de durabilité',
            # Nouvelles catégories pour la gouvernance
            'category_governance': 'Gouvernance',
            'category_governance_desc': 'Pour les directeurs et responsables SI',
            'category_legal': 'Juridique & Vie Privée',
            'category_legal_desc': 'Pour les DPO et professionnels du droit',
            # Descriptions des nouveaux profils
            'dsi_desc': 'Gouvernance SI stratégique, portefeuille IA, budget, transformation',
            'rsi_desc': 'Gestion opérationnelle SI, systèmes, projets, ressources',
            'dpo_desc': 'Conformité RGPD, registre des traitements, AIPD, droits des personnes',
            'legal_desc': 'Évaluation des risques juridiques, contrats, veille réglementaire, PI',
            # Contenu du tour pour les nouveaux profils
            'tour_dsi_title': 'Tableau de Bord DSI',
            'tour_dsi_desc': 'Gouvernance SI stratégique et gestion du portefeuille IA',
            'tour_dsi_1_title': 'Portefeuille IA',
            'tour_dsi_1_desc': 'Vue d\'ensemble de tous les systèmes IA avec métriques stratégiques',
            'tour_dsi_2_title': 'Allocation Budget',
            'tour_dsi_2_desc': 'Suivez les dépenses IT et le ROI des initiatives IA',
            'tour_dsi_3_title': 'Matrice des Risques',
            'tour_dsi_3_desc': 'Identifiez et gérez les risques IT avec analyse d\'impact',
            'tour_dsi_4_title': 'Transformation Digitale',
            'tour_dsi_4_desc': 'Suivez la feuille de route de transformation et la maturité',
            'tour_rsi_title': 'Tableau de Bord RSI',
            'tour_rsi_desc': 'Gestion opérationnelle SI et coordination des équipes',
            'tour_rsi_1_title': 'État des Systèmes',
            'tour_rsi_1_desc': 'Surveillance en temps réel de la santé de tous les systèmes IA',
            'tour_rsi_2_title': 'Suivi des Projets',
            'tour_rsi_2_desc': 'Gérez les projets IA avec un suivi de type kanban',
            'tour_rsi_3_title': 'Gestion des Incidents',
            'tour_rsi_3_desc': 'Suivez et résolvez les incidents opérationnels',
            'tour_dpo_title': 'Tableau de Bord DPO',
            'tour_dpo_desc': 'Protection des données et conformité RGPD',
            'tour_dpo_1_title': 'Registre des Traitements',
            'tour_dpo_1_desc': 'Registre complet des activités de traitement IA',
            'tour_dpo_2_title': 'Gestion des AIPD',
            'tour_dpo_2_desc': 'Suivez et gérez les Analyses d\'Impact sur la Protection des Données',
            'tour_dpo_3_title': 'Demandes des Personnes',
            'tour_dpo_3_desc': 'Gérez les demandes de droits RGPD avec suivi des délais',
            'tour_dpo_4_title': 'Flux de Données',
            'tour_dpo_4_desc': 'Visualisez les flux de données personnelles et les transferts',
            'tour_legal_title': 'Tableau de Bord Juriste',
            'tour_legal_desc': 'Gestion des risques juridiques et conformité',
            'tour_legal_1_title': 'Évaluation des Risques',
            'tour_legal_1_desc': 'Évaluez les risques juridiques IA : biais, responsabilité, PI',
            'tour_legal_2_title': 'Veille Réglementaire',
            'tour_legal_2_desc': 'Restez informé sur l\'AI Act et les réglementations',
            'tour_legal_3_title': 'Gestion des Contrats',
            'tour_legal_3_desc': 'Suivez les contrats IA, SLA et conformité'
        },
        'help': {
            'title': 'Aide & Guide',
            'quick_actions': 'Actions rapides',
            'start_tour': 'Démarrer la visite guidée',
            'start_tour_desc': 'Apprenez les bases avec une visite interactive',
            'change_profile': 'Changer de profil',
            'change_profile_desc': 'Passez à un autre persona utilisateur',
            'this_page': 'Sur cette page',
            'resources': 'Ressources',
            'keyboard_shortcuts': 'Raccourcis clavier',
            'keyboard_shortcuts_desc': 'Accélérez votre travail',
            'skip': 'Passer',
            'next': 'Suivant',
            'quick_tips': 'Astuces rapides',
            'tip_1_title': 'KPIs Interactifs',
            'tip_1': 'Cliquez sur n\'importe quelle carte KPI pour voir les métriques détaillées',
            'tip_2_title': 'Navigation Rapide',
            'tip_2': 'Utilisez la barre latérale pour naviguer entre les différentes vues',
            'tip_3_title': 'Analyse Causale',
            'tip_3': 'Cliquez sur "Investiguer" sur un problème pour voir l\'analyse des causes',
            'tip_4_title': 'Assistant IA',
            'tip_4': 'Posez vos questions à l\'assistant en bas à droite'
        },
        'narrative': {
            'dashboard_title': 'Bienvenue dans votre Centre de Contrôle de Confiance IA',
            'dashboard_desc': 'Ce tableau de bord offre une vue unifiée de la santé, des performances et de la fiabilité de vos systèmes IA.'
        },
        'tour': {
            'kpi_title': 'Indicateurs Clés de Performance',
            'kpi_body': 'Ces cartes montrent vos métriques IA les plus importantes en un coup d\'œil.',
            'nav_title': 'Navigation',
            'nav_body': 'Utilisez la barre latérale pour naviguer entre les différentes vues.',
            'profile_title': 'Sélection du Profil',
            'profile_body': 'Basculez entre les différents profils utilisateur pour voir les tableaux de bord adaptés à votre rôle.',
            'finish': 'Terminer'
        },
        'chatbot': {
            'title': 'Assistant IA',
            'online': 'En ligne',
            'welcome_title': 'Bonjour ! Comment puis-je vous aider ?',
            'welcome_desc': 'Posez-moi des questions sur vos systèmes IA, métriques, ou comment utiliser AIOBS.',
            'suggestions': 'Questions rapides :',
            'q_trust': 'Score de confiance ?',
            'q_alerts': 'Alertes actives ?',
            'q_costs': 'Coûts du jour ?',
            'q_navigate': 'Comment naviguer ?',
            'placeholder': 'Tapez votre question...',
            'error': 'Désolé, une erreur s\'est produite. Veuillez réessayer.'
        },
        'search': {
            'placeholder': 'Rechercher pages, métriques, services...',
            'results': 'Navigation rapide',
            'no_results': 'Aucun résultat trouvé'
        },
        'a11y': {
            'skip_to_content': 'Aller au contenu principal',
            'loading': 'Chargement...',
            'menu_open': 'Ouvrir le menu',
            'menu_close': 'Fermer le menu',
            'expand': 'Développer',
            'collapse': 'Réduire',
            'required_field': 'Champ obligatoire',
            'error_message': 'Erreur :',
            'success_message': 'Succès :',
            'warning_message': 'Attention :',
            'info_message': 'Information :'
        }
    },

    'es': {
        'app': {
            'name': 'AIOBS',
            'title': 'Hub de Observabilidad IA',
            'subtitle': 'Capa de Control de Confianza para Sistemas IA',
            'version': 'Versión'
        },
        'nav': {
            'overview': 'Resumen',
            'dashboard': 'Panel',
            'unified_view': 'Vista Unificada',
            'analysis': 'Análisis',
            'causal_analysis': 'Análisis Causal',
            'impact_analysis': 'Análisis de Impacto',
            'configuration': 'Configuración',
            'toggle_theme': 'Cambiar Tema',
            'settings': 'Ajustes',
            'language': 'Idioma',
            'models': 'Modelos',
            'drift': 'Detección de Deriva',
            'reliability': 'Fiabilidad',
            'experiments': 'Experimentos',
            'services': 'Servicios',
            'slo': 'SLO/SLI',
            'topology': 'Topología',
            'alerts': 'Alertas',
            'logs': 'Registros',
            'impact': 'Impacto Empresarial',
            'costs': 'Costos',
            'reports': 'Informes',
            'features': 'Funciones de IA',
            'performance': 'Rendimiento',
            'user_impact': 'Impacto en Usuario',
            'security': 'Seguridad',
            'incidents': 'Incidentes',
            'access_logs': 'Registros de Acceso',
            'threats': 'Detección de Amenazas',
            'compliance': 'Cumplimiento',
            'audit_trail': 'Pista de Auditoría',
            'regulations': 'Regulaciones',
            'evidence': 'Evidencia',
            'carbon': 'Carbono',
            'energy': 'Energía',
            'sustainability': 'Sostenibilidad',
            'esg_reports': 'Informes ESG',
            # Secciones de navegación (estructura del menú)
            'my_journey': 'Mi Recorrido',
            'my_essentials': 'Mis Esenciales',
            'explore': 'Explorar',
            'perspectives': 'Perspectivas',
            'views': 'Vistas',
            'select_persona': 'Seleccionar',
            'change_journey': 'Cambiar recorrido'
        },
        'dashboard': {
            'title': 'Panel de Observabilidad IA',
            'trust_score': 'Puntuación de Confianza',
            'daily_inferences': 'Inferencias Diarias',
            'daily_cost': 'Costo Diario',
            'carbon_footprint': 'Carbono (kgCO2)',
            'system_health': 'Salud del Sistema',
            'active_alerts': 'Alertas Activas',
            'healthy': 'Saludable',
            'degraded': 'Degradado',
            'unhealthy': 'No Saludable',
            'critical': 'Crítico',
            'warning': 'Advertencia',
            'info': 'Info',
            'trust_score_trend': 'Tendencia de Confianza',
            'slo_compliance': 'Cumplimiento SLO',
            'compliant': 'Cumplido',
            'at_risk': 'En Riesgo',
            'violated': 'Violado',
            'services_status': 'Estado de Servicios',
            'search_services': 'Buscar servicios...',
            'top_issues': 'Problemas Principales',
            'investigate': 'Investigar'
        },
        'table': {
            'service': 'Servicio',
            'type': 'Tipo',
            'status': 'Estado',
            'uptime': 'Disponibilidad',
            'error_rate': 'Tasa de Error',
            'latency_p99': 'Latencia P99'
        },
        'time': {
            'last_24h': 'Últimas 24h',
            'last_7d': 'Últimos 7d',
            'last_30d': 'Últimos 30d',
            'minutes': 'min',
            'hours': 'horas',
            'days': 'días'
        },
        'trends': {
            'up': 'Subiendo',
            'down': 'Bajando',
            'stable': 'Estable',
            'improving': 'Mejorando',
            'degrading': 'Degradando'
        },
        'profiles': {
            'all': 'Todos',
            'ml_engineer': 'Ingeniero ML',
            'devops': 'DevOps',
            'executive': 'Ejecutivo',
            'product_owner': 'Product Owner',
            'security': 'Seguridad',
            'compliance': 'Cumplimiento',
            'esg': 'Oficial ESG'
        },
        'cognitive': {
            'title': 'Métricas Cognitivas',
            'drift': 'Detección de Deriva',
            'reliability': 'Fiabilidad',
            'hallucination': 'Riesgo de Alucinación',
            'degradation': 'Degradación',
            'trust': 'Indicador de Confianza',
            'confidence': 'Confianza',
            'severity': 'Severidad',
            'low': 'Bajo',
            'medium': 'Medio',
            'high': 'Alto'
        },
        'causal': {
            'title': 'Análisis Causal',
            'root_cause': 'Causa Raíz',
            'impact': 'Impacto',
            'correlation': 'Correlación',
            'dependency': 'Dependencia',
            'run_analysis': 'Ejecutar Análisis',
            'graph': 'Grafo Causal',
            'timeline': 'Línea de Tiempo'
        },
        'unified': {
            'title': 'Vista de Monitoreo Unificada',
            'all_systems': 'Todos los Sistemas',
            'filter': 'Filtrar',
            'refresh': 'Actualizar'
        },
        'actions': {
            'save': 'Guardar',
            'cancel': 'Cancelar',
            'delete': 'Eliminar',
            'edit': 'Editar',
            'view': 'Ver',
            'export': 'Exportar',
            'refresh': 'Actualizar',
            'filter': 'Filtrar',
            'search': 'Buscar',
            'close': 'Cerrar',
            'confirm': 'Confirmar'
        },
        'messages': {
            'loading': 'Cargando...',
            'no_data': 'No hay datos disponibles',
            'error': 'Se produjo un error',
            'success': 'Operación exitosa',
            'confirm_delete': '¿Está seguro de que desea eliminar?'
        }
    },

    'de': {
        'app': {
            'name': 'AIOBS',
            'title': 'KI-Observability-Hub',
            'subtitle': 'Vertrauenskontrollschicht für KI-Systeme',
            'version': 'Version'
        },
        'nav': {
            'overview': 'Übersicht',
            'dashboard': 'Dashboard',
            'unified_view': 'Einheitliche Ansicht',
            'analysis': 'Analyse',
            'causal_analysis': 'Kausalanalyse',
            'impact_analysis': 'Wirkungsanalyse',
            'configuration': 'Konfiguration',
            'toggle_theme': 'Thema Wechseln',
            'settings': 'Einstellungen',
            'language': 'Sprache',
            'models': 'Modelle',
            'drift': 'Drift-Erkennung',
            'reliability': 'Zuverlässigkeit',
            'experiments': 'Experimente',
            'services': 'Dienste',
            'slo': 'SLO/SLI',
            'topology': 'Topologie',
            'alerts': 'Warnungen',
            'logs': 'Protokolle',
            'impact': 'Geschäftsauswirkung',
            'costs': 'Kosten',
            'reports': 'Berichte',
            'features': 'KI-Funktionen',
            'performance': 'Leistung',
            'user_impact': 'Benutzerauswirkung',
            'security': 'Sicherheit',
            'incidents': 'Vorfälle',
            'access_logs': 'Zugriffsprotokolle',
            'threats': 'Bedrohungserkennung',
            'compliance': 'Compliance',
            'audit_trail': 'Audit-Trail',
            'regulations': 'Vorschriften',
            'evidence': 'Nachweise',
            'carbon': 'Kohlenstoff',
            'energy': 'Energie',
            'sustainability': 'Nachhaltigkeit',
            'esg_reports': 'ESG-Berichte',
            # Navigationsabschnitte (Menüstruktur)
            'my_journey': 'Meine Reise',
            'my_essentials': 'Meine Grundlagen',
            'explore': 'Erkunden',
            'perspectives': 'Perspektiven',
            'views': 'Ansichten',
            'select_persona': 'Auswählen',
            'change_journey': 'Reise ändern'
        },
        'dashboard': {
            'title': 'KI-Observability-Dashboard',
            'trust_score': 'Vertrauenswert',
            'daily_inferences': 'Tägliche Inferenzen',
            'daily_cost': 'Tägliche Kosten',
            'carbon_footprint': 'CO2 (kgCO2)',
            'system_health': 'Systemzustand',
            'active_alerts': 'Aktive Warnungen',
            'healthy': 'Gesund',
            'degraded': 'Beeinträchtigt',
            'unhealthy': 'Ungesund',
            'critical': 'Kritisch',
            'warning': 'Warnung',
            'info': 'Info',
            'trust_score_trend': 'Vertrauenstrend',
            'slo_compliance': 'SLO-Einhaltung',
            'compliant': 'Konform',
            'at_risk': 'Gefährdet',
            'violated': 'Verletzt',
            'services_status': 'Dienststatus',
            'search_services': 'Dienste suchen...',
            'top_issues': 'Hauptprobleme',
            'investigate': 'Untersuchen'
        },
        'table': {
            'service': 'Dienst',
            'type': 'Typ',
            'status': 'Status',
            'uptime': 'Verfügbarkeit',
            'error_rate': 'Fehlerrate',
            'latency_p99': 'Latenz P99'
        },
        'time': {
            'last_24h': 'Letzte 24h',
            'last_7d': 'Letzte 7 Tage',
            'last_30d': 'Letzte 30 Tage',
            'minutes': 'Min',
            'hours': 'Stunden',
            'days': 'Tage'
        },
        'trends': {
            'up': 'Steigend',
            'down': 'Fallend',
            'stable': 'Stabil',
            'improving': 'Verbessernd',
            'degrading': 'Verschlechternd'
        },
        'profiles': {
            'all': 'Alle',
            'ml_engineer': 'ML-Ingenieur',
            'devops': 'DevOps',
            'executive': 'Führungskraft',
            'product_owner': 'Product Owner',
            'security': 'Sicherheit',
            'compliance': 'Compliance',
            'esg': 'ESG-Beauftragter'
        },
        'cognitive': {
            'title': 'Kognitive Metriken',
            'drift': 'Drift-Erkennung',
            'reliability': 'Zuverlässigkeit',
            'hallucination': 'Halluzinationsrisiko',
            'degradation': 'Degradation',
            'trust': 'Vertrauensindikator',
            'confidence': 'Konfidenz',
            'severity': 'Schweregrad',
            'low': 'Niedrig',
            'medium': 'Mittel',
            'high': 'Hoch'
        },
        'causal': {
            'title': 'Kausalanalyse',
            'root_cause': 'Ursache',
            'impact': 'Auswirkung',
            'correlation': 'Korrelation',
            'dependency': 'Abhängigkeit',
            'run_analysis': 'Analyse Starten',
            'graph': 'Kausalgraph',
            'timeline': 'Zeitachse'
        },
        'unified': {
            'title': 'Einheitliche Überwachungsansicht',
            'all_systems': 'Alle Systeme',
            'filter': 'Filtern',
            'refresh': 'Aktualisieren'
        },
        'actions': {
            'save': 'Speichern',
            'cancel': 'Abbrechen',
            'delete': 'Löschen',
            'edit': 'Bearbeiten',
            'view': 'Ansehen',
            'export': 'Exportieren',
            'refresh': 'Aktualisieren',
            'filter': 'Filtern',
            'search': 'Suchen',
            'close': 'Schließen',
            'confirm': 'Bestätigen'
        },
        'messages': {
            'loading': 'Wird geladen...',
            'no_data': 'Keine Daten verfügbar',
            'error': 'Ein Fehler ist aufgetreten',
            'success': 'Vorgang erfolgreich',
            'confirm_delete': 'Möchten Sie wirklich löschen?'
        }
    },

    'pt': {
        'app': {
            'name': 'AIOBS',
            'title': 'Hub de Observabilidade IA',
            'subtitle': 'Camada de Controle de Confiança para Sistemas IA',
            'version': 'Versão'
        },
        'nav': {
            'overview': 'Visão Geral',
            'dashboard': 'Painel',
            'unified_view': 'Visão Unificada',
            'analysis': 'Análise',
            'causal_analysis': 'Análise Causal',
            'impact_analysis': 'Análise de Impacto',
            'configuration': 'Configuração',
            'toggle_theme': 'Alternar Tema',
            'settings': 'Configurações',
            'language': 'Idioma',
            'models': 'Modelos',
            'drift': 'Detecção de Deriva',
            'reliability': 'Confiabilidade',
            'experiments': 'Experimentos',
            'services': 'Serviços',
            'slo': 'SLO/SLI',
            'topology': 'Topologia',
            'alerts': 'Alertas',
            'logs': 'Logs',
            'impact': 'Impacto nos Negócios',
            'costs': 'Custos',
            'reports': 'Relatórios',
            'features': 'Recursos de IA',
            'performance': 'Desempenho',
            'user_impact': 'Impacto no Usuário',
            'security': 'Segurança',
            'incidents': 'Incidentes',
            'access_logs': 'Logs de Acesso',
            'threats': 'Detecção de Ameaças',
            'compliance': 'Conformidade',
            'audit_trail': 'Trilha de Auditoria',
            'regulations': 'Regulamentações',
            'evidence': 'Evidências',
            'carbon': 'Carbono',
            'energy': 'Energia',
            'sustainability': 'Sustentabilidade',
            'esg_reports': 'Relatórios ESG',
            # Seções de navegação (estrutura do menu)
            'my_journey': 'Minha Jornada',
            'my_essentials': 'Meus Essenciais',
            'explore': 'Explorar',
            'perspectives': 'Perspectivas',
            'views': 'Visualizações',
            'select_persona': 'Selecionar',
            'change_journey': 'Mudar jornada'
        },
        'dashboard': {
            'title': 'Painel de Observabilidade IA',
            'trust_score': 'Pontuação de Confiança',
            'daily_inferences': 'Inferências Diárias',
            'daily_cost': 'Custo Diário',
            'carbon_footprint': 'Carbono (kgCO2)',
            'system_health': 'Saúde do Sistema',
            'active_alerts': 'Alertas Ativos',
            'healthy': 'Saudável',
            'degraded': 'Degradado',
            'unhealthy': 'Não Saudável',
            'critical': 'Crítico',
            'warning': 'Aviso',
            'info': 'Info',
            'trust_score_trend': 'Tendência de Confiança',
            'slo_compliance': 'Conformidade SLO',
            'compliant': 'Conforme',
            'at_risk': 'Em Risco',
            'violated': 'Violado',
            'services_status': 'Status dos Serviços',
            'search_services': 'Pesquisar serviços...',
            'top_issues': 'Principais Problemas',
            'investigate': 'Investigar'
        },
        'table': {
            'service': 'Serviço',
            'type': 'Tipo',
            'status': 'Status',
            'uptime': 'Disponibilidade',
            'error_rate': 'Taxa de Erro',
            'latency_p99': 'Latência P99'
        },
        'time': {
            'last_24h': 'Últimas 24h',
            'last_7d': 'Últimos 7d',
            'last_30d': 'Últimos 30d',
            'minutes': 'min',
            'hours': 'horas',
            'days': 'dias'
        },
        'trends': {
            'up': 'Subindo',
            'down': 'Descendo',
            'stable': 'Estável',
            'improving': 'Melhorando',
            'degrading': 'Degradando'
        },
        'profiles': {
            'all': 'Todos',
            'ml_engineer': 'Engenheiro ML',
            'devops': 'DevOps',
            'executive': 'Executivo',
            'product_owner': 'Product Owner',
            'security': 'Segurança',
            'compliance': 'Conformidade',
            'esg': 'Oficial ESG'
        },
        'cognitive': {
            'title': 'Métricas Cognitivas',
            'drift': 'Detecção de Deriva',
            'reliability': 'Confiabilidade',
            'hallucination': 'Risco de Alucinação',
            'degradation': 'Degradação',
            'trust': 'Indicador de Confiança',
            'confidence': 'Confiança',
            'severity': 'Severidade',
            'low': 'Baixo',
            'medium': 'Médio',
            'high': 'Alto'
        },
        'causal': {
            'title': 'Análise Causal',
            'root_cause': 'Causa Raiz',
            'impact': 'Impacto',
            'correlation': 'Correlação',
            'dependency': 'Dependência',
            'run_analysis': 'Executar Análise',
            'graph': 'Grafo Causal',
            'timeline': 'Linha do Tempo'
        },
        'unified': {
            'title': 'Visão de Monitoramento Unificada',
            'all_systems': 'Todos os Sistemas',
            'filter': 'Filtrar',
            'refresh': 'Atualizar'
        },
        'actions': {
            'save': 'Salvar',
            'cancel': 'Cancelar',
            'delete': 'Excluir',
            'edit': 'Editar',
            'view': 'Ver',
            'export': 'Exportar',
            'refresh': 'Atualizar',
            'filter': 'Filtrar',
            'search': 'Pesquisar',
            'close': 'Fechar',
            'confirm': 'Confirmar'
        },
        'messages': {
            'loading': 'Carregando...',
            'no_data': 'Nenhum dado disponível',
            'error': 'Ocorreu um erro',
            'success': 'Operação bem-sucedida',
            'confirm_delete': 'Tem certeza de que deseja excluir?'
        }
    },

    'it': {
        'app': {
            'name': 'AIOBS',
            'title': 'Hub di Osservabilità IA',
            'subtitle': 'Livello di Controllo Fiducia per Sistemi IA',
            'version': 'Versione'
        },
        'nav': {
            'overview': 'Panoramica',
            'dashboard': 'Dashboard',
            'unified_view': 'Vista Unificata',
            'analysis': 'Analisi',
            'causal_analysis': 'Analisi Causale',
            'impact_analysis': 'Analisi di Impatto',
            'configuration': 'Configurazione',
            'toggle_theme': 'Cambia Tema',
            'settings': 'Impostazioni',
            'language': 'Lingua',
            'models': 'Modelli',
            'drift': 'Rilevamento Deriva',
            'reliability': 'Affidabilità',
            'experiments': 'Esperimenti',
            'services': 'Servizi',
            'slo': 'SLO/SLI',
            'topology': 'Topologia',
            'alerts': 'Allarmi',
            'logs': 'Log',
            'impact': 'Impatto Aziendale',
            'costs': 'Costi',
            'reports': 'Report',
            'features': 'Funzionalità IA',
            'performance': 'Prestazioni',
            'user_impact': 'Impatto Utente',
            'security': 'Sicurezza',
            'incidents': 'Incidenti',
            'access_logs': 'Log di Accesso',
            'threats': 'Rilevamento Minacce',
            'compliance': 'Conformità',
            'audit_trail': 'Traccia di Audit',
            'regulations': 'Regolamenti',
            'evidence': 'Prove',
            'carbon': 'Carbonio',
            'energy': 'Energia',
            'sustainability': 'Sostenibilità',
            'esg_reports': 'Report ESG',
            # Sezioni di navigazione (struttura menu)
            'my_journey': 'Il Mio Percorso',
            'my_essentials': 'I Miei Essenziali',
            'explore': 'Esplora',
            'perspectives': 'Prospettive',
            'views': 'Visualizzazioni',
            'select_persona': 'Seleziona',
            'change_journey': 'Cambia percorso'
        },
        'dashboard': {
            'title': 'Dashboard di Osservabilità IA',
            'trust_score': 'Punteggio di Fiducia',
            'daily_inferences': 'Inferenze Giornaliere',
            'daily_cost': 'Costo Giornaliero',
            'carbon_footprint': 'Carbonio (kgCO2)',
            'system_health': 'Salute del Sistema',
            'active_alerts': 'Allarmi Attivi',
            'healthy': 'Sano',
            'degraded': 'Degradato',
            'unhealthy': 'Non Sano',
            'critical': 'Critico',
            'warning': 'Avviso',
            'info': 'Info',
            'trust_score_trend': 'Tendenza Fiducia',
            'slo_compliance': 'Conformità SLO',
            'compliant': 'Conforme',
            'at_risk': 'A Rischio',
            'violated': 'Violato',
            'services_status': 'Stato Servizi',
            'search_services': 'Cerca servizi...',
            'top_issues': 'Problemi Principali',
            'investigate': 'Indaga'
        },
        'table': {
            'service': 'Servizio',
            'type': 'Tipo',
            'status': 'Stato',
            'uptime': 'Disponibilità',
            'error_rate': 'Tasso di Errore',
            'latency_p99': 'Latenza P99'
        },
        'time': {
            'last_24h': 'Ultime 24h',
            'last_7d': 'Ultimi 7g',
            'last_30d': 'Ultimi 30g',
            'minutes': 'min',
            'hours': 'ore',
            'days': 'giorni'
        },
        'trends': {
            'up': 'In Salita',
            'down': 'In Discesa',
            'stable': 'Stabile',
            'improving': 'In Miglioramento',
            'degrading': 'In Peggioramento'
        },
        'profiles': {
            'all': 'Tutti',
            'ml_engineer': 'Ingegnere ML',
            'devops': 'DevOps',
            'executive': 'Dirigente',
            'product_owner': 'Product Owner',
            'security': 'Sicurezza',
            'compliance': 'Conformità',
            'esg': 'Responsabile ESG'
        },
        'cognitive': {
            'title': 'Metriche Cognitive',
            'drift': 'Rilevamento Deriva',
            'reliability': 'Affidabilità',
            'hallucination': 'Rischio Allucinazione',
            'degradation': 'Degradazione',
            'trust': 'Indicatore di Fiducia',
            'confidence': 'Confidenza',
            'severity': 'Gravità',
            'low': 'Basso',
            'medium': 'Medio',
            'high': 'Alto'
        },
        'causal': {
            'title': 'Analisi Causale',
            'root_cause': 'Causa Radice',
            'impact': 'Impatto',
            'correlation': 'Correlazione',
            'dependency': 'Dipendenza',
            'run_analysis': 'Esegui Analisi',
            'graph': 'Grafo Causale',
            'timeline': 'Linea Temporale'
        },
        'unified': {
            'title': 'Vista di Monitoraggio Unificata',
            'all_systems': 'Tutti i Sistemi',
            'filter': 'Filtra',
            'refresh': 'Aggiorna'
        },
        'actions': {
            'save': 'Salva',
            'cancel': 'Annulla',
            'delete': 'Elimina',
            'edit': 'Modifica',
            'view': 'Visualizza',
            'export': 'Esporta',
            'refresh': 'Aggiorna',
            'filter': 'Filtra',
            'search': 'Cerca',
            'close': 'Chiudi',
            'confirm': 'Conferma'
        },
        'messages': {
            'loading': 'Caricamento...',
            'no_data': 'Nessun dato disponibile',
            'error': 'Si è verificato un errore',
            'success': 'Operazione riuscita',
            'confirm_delete': 'Sei sicuro di voler eliminare?'
        }
    },

    'zh': {
        'app': {
            'name': 'AIOBS',
            'title': 'AI可观测性中心',
            'subtitle': 'AI系统信任控制层',
            'version': '版本'
        },
        'nav': {
            'overview': '概览',
            'dashboard': '仪表板',
            'unified_view': '统一视图',
            'analysis': '分析',
            'causal_analysis': '因果分析',
            'impact_analysis': '影响分析',
            'configuration': '配置',
            'toggle_theme': '切换主题',
            'settings': '设置',
            'language': '语言',
            'models': '模型',
            'drift': '漂移检测',
            'reliability': '可靠性',
            'experiments': '实验',
            'services': '服务',
            'slo': 'SLO/SLI',
            'topology': '拓扑',
            'alerts': '告警',
            'logs': '日志',
            'impact': '业务影响',
            'costs': '成本',
            'reports': '报告',
            'features': 'AI功能',
            'performance': '性能',
            'user_impact': '用户影响',
            'security': '安全',
            'incidents': '事件',
            'access_logs': '访问日志',
            'threats': '威胁检测',
            'compliance': '合规',
            'audit_trail': '审计追踪',
            'regulations': '法规',
            'evidence': '证据',
            'carbon': '碳排放',
            'energy': '能源',
            'sustainability': '可持续性',
            'esg_reports': 'ESG报告',
            # 导航部分（菜单结构）
            'my_journey': '我的旅程',
            'my_essentials': '我的要点',
            'explore': '探索',
            'perspectives': '视角',
            'views': '视图',
            'select_persona': '选择',
            'change_journey': '更改旅程'
        },
        'dashboard': {
            'title': 'AI可观测性仪表板',
            'trust_score': '信任评分',
            'daily_inferences': '每日推理量',
            'daily_cost': '每日成本',
            'carbon_footprint': '碳排放 (kgCO2)',
            'system_health': '系统健康',
            'active_alerts': '活跃警报',
            'healthy': '健康',
            'degraded': '降级',
            'unhealthy': '不健康',
            'critical': '严重',
            'warning': '警告',
            'info': '信息',
            'trust_score_trend': '信任评分趋势',
            'slo_compliance': 'SLO合规性',
            'compliant': '合规',
            'at_risk': '风险',
            'violated': '违规',
            'services_status': '服务状态',
            'search_services': '搜索服务...',
            'top_issues': '主要问题',
            'investigate': '调查'
        },
        'table': {
            'service': '服务',
            'type': '类型',
            'status': '状态',
            'uptime': '正常运行时间',
            'error_rate': '错误率',
            'latency_p99': 'P99延迟'
        },
        'time': {
            'last_24h': '最近24小时',
            'last_7d': '最近7天',
            'last_30d': '最近30天',
            'minutes': '分钟',
            'hours': '小时',
            'days': '天'
        },
        'trends': {
            'up': '上升',
            'down': '下降',
            'stable': '稳定',
            'improving': '改善中',
            'degrading': '恶化中'
        },
        'profiles': {
            'all': '全部',
            'ml_engineer': 'ML工程师',
            'devops': 'DevOps',
            'executive': '管理层',
            'product_owner': '产品负责人',
            'security': '安全',
            'compliance': '合规',
            'esg': 'ESG主管'
        },
        'cognitive': {
            'title': '认知指标',
            'drift': '漂移检测',
            'reliability': '可靠性',
            'hallucination': '幻觉风险',
            'degradation': '退化',
            'trust': '信任指标',
            'confidence': '置信度',
            'severity': '严重程度',
            'low': '低',
            'medium': '中',
            'high': '高'
        },
        'causal': {
            'title': '因果分析',
            'root_cause': '根本原因',
            'impact': '影响',
            'correlation': '相关性',
            'dependency': '依赖关系',
            'run_analysis': '运行分析',
            'graph': '因果图',
            'timeline': '时间线'
        },
        'unified': {
            'title': '统一监控视图',
            'all_systems': '所有系统',
            'filter': '筛选',
            'refresh': '刷新'
        },
        'actions': {
            'save': '保存',
            'cancel': '取消',
            'delete': '删除',
            'edit': '编辑',
            'view': '查看',
            'export': '导出',
            'refresh': '刷新',
            'filter': '筛选',
            'search': '搜索',
            'close': '关闭',
            'confirm': '确认'
        },
        'messages': {
            'loading': '加载中...',
            'no_data': '无可用数据',
            'error': '发生错误',
            'success': '操作成功',
            'confirm_delete': '确定要删除吗？'
        }
    },

    'ja': {
        'app': {
            'name': 'AIOBS',
            'title': 'AIオブザーバビリティハブ',
            'subtitle': 'AIシステム信頼制御レイヤー',
            'version': 'バージョン'
        },
        'nav': {
            'overview': '概要',
            'dashboard': 'ダッシュボード',
            'unified_view': '統合ビュー',
            'analysis': '分析',
            'causal_analysis': '因果分析',
            'impact_analysis': '影響分析',
            'configuration': '設定',
            'toggle_theme': 'テーマ切替',
            'settings': '設定',
            'language': '言語',
            'models': 'モデル',
            'drift': 'ドリフト検出',
            'reliability': '信頼性',
            'experiments': '実験',
            'services': 'サービス',
            'slo': 'SLO/SLI',
            'topology': 'トポロジー',
            'alerts': 'アラート',
            'logs': 'ログ',
            'impact': 'ビジネス影響',
            'costs': 'コスト',
            'reports': 'レポート',
            'features': 'AI機能',
            'performance': 'パフォーマンス',
            'user_impact': 'ユーザー影響',
            'security': 'セキュリティ',
            'incidents': 'インシデント',
            'access_logs': 'アクセスログ',
            'threats': '脅威検出',
            'compliance': 'コンプライアンス',
            'audit_trail': '監査証跡',
            'regulations': '規制',
            'evidence': '証拠',
            'carbon': 'カーボン',
            'energy': 'エネルギー',
            'sustainability': 'サステナビリティ',
            'esg_reports': 'ESGレポート',
            # ナビゲーションセクション（メニュー構造）
            'my_journey': 'マイジャーニー',
            'my_essentials': 'マイエッセンシャル',
            'explore': '探索',
            'perspectives': 'パースペクティブ',
            'views': 'ビュー',
            'select_persona': '選択',
            'change_journey': 'ジャーニーを変更'
        },
        'dashboard': {
            'title': 'AIオブザーバビリティダッシュボード',
            'trust_score': '信頼スコア',
            'daily_inferences': '日次推論数',
            'daily_cost': '日次コスト',
            'carbon_footprint': 'CO2 (kgCO2)',
            'system_health': 'システムヘルス',
            'active_alerts': 'アクティブアラート',
            'healthy': '正常',
            'degraded': '低下',
            'unhealthy': '異常',
            'critical': '重大',
            'warning': '警告',
            'info': '情報',
            'trust_score_trend': '信頼スコア推移',
            'slo_compliance': 'SLO準拠',
            'compliant': '準拠',
            'at_risk': 'リスク',
            'violated': '違反',
            'services_status': 'サービス状態',
            'search_services': 'サービス検索...',
            'top_issues': '主要課題',
            'investigate': '調査'
        },
        'table': {
            'service': 'サービス',
            'type': 'タイプ',
            'status': 'ステータス',
            'uptime': '稼働率',
            'error_rate': 'エラー率',
            'latency_p99': 'P99レイテンシ'
        },
        'time': {
            'last_24h': '過去24時間',
            'last_7d': '過去7日',
            'last_30d': '過去30日',
            'minutes': '分',
            'hours': '時間',
            'days': '日'
        },
        'trends': {
            'up': '上昇',
            'down': '下降',
            'stable': '安定',
            'improving': '改善中',
            'degrading': '悪化中'
        },
        'profiles': {
            'all': 'すべて',
            'ml_engineer': 'MLエンジニア',
            'devops': 'DevOps',
            'executive': '経営層',
            'product_owner': 'プロダクトオーナー',
            'security': 'セキュリティ',
            'compliance': 'コンプライアンス',
            'esg': 'ESG担当'
        },
        'cognitive': {
            'title': '認知メトリクス',
            'drift': 'ドリフト検出',
            'reliability': '信頼性',
            'hallucination': 'ハルシネーションリスク',
            'degradation': '劣化',
            'trust': '信頼指標',
            'confidence': '確信度',
            'severity': '重大度',
            'low': '低',
            'medium': '中',
            'high': '高'
        },
        'causal': {
            'title': '因果分析',
            'root_cause': '根本原因',
            'impact': '影響',
            'correlation': '相関',
            'dependency': '依存関係',
            'run_analysis': '分析実行',
            'graph': '因果グラフ',
            'timeline': 'タイムライン'
        },
        'unified': {
            'title': '統合監視ビュー',
            'all_systems': '全システム',
            'filter': 'フィルター',
            'refresh': '更新'
        },
        'actions': {
            'save': '保存',
            'cancel': 'キャンセル',
            'delete': '削除',
            'edit': '編集',
            'view': '表示',
            'export': 'エクスポート',
            'refresh': '更新',
            'filter': 'フィルター',
            'search': '検索',
            'close': '閉じる',
            'confirm': '確認'
        },
        'messages': {
            'loading': '読み込み中...',
            'no_data': 'データがありません',
            'error': 'エラーが発生しました',
            'success': '操作が完了しました',
            'confirm_delete': '削除してもよろしいですか？'
        }
    },

    'ko': {
        'app': {
            'name': 'AIOBS',
            'title': 'AI 관측성 허브',
            'subtitle': 'AI 시스템 신뢰 제어 계층',
            'version': '버전'
        },
        'nav': {
            'overview': '개요',
            'dashboard': '대시보드',
            'unified_view': '통합 뷰',
            'analysis': '분석',
            'causal_analysis': '인과 분석',
            'impact_analysis': '영향 분석',
            'configuration': '구성',
            'toggle_theme': '테마 전환',
            'settings': '설정',
            'language': '언어',
            'models': '모델',
            'drift': '드리프트 감지',
            'reliability': '신뢰성',
            'experiments': '실험',
            'services': '서비스',
            'slo': 'SLO/SLI',
            'topology': '토폴로지',
            'alerts': '알림',
            'logs': '로그',
            'impact': '비즈니스 영향',
            'costs': '비용',
            'reports': '보고서',
            'features': 'AI 기능',
            'performance': '성능',
            'user_impact': '사용자 영향',
            'security': '보안',
            'incidents': '인시던트',
            'access_logs': '접근 로그',
            'threats': '위협 탐지',
            'compliance': '컴플라이언스',
            'audit_trail': '감사 추적',
            'regulations': '규정',
            'evidence': '증거',
            'carbon': '탄소',
            'energy': '에너지',
            'sustainability': '지속가능성',
            'esg_reports': 'ESG 보고서',
            # 탐색 섹션 (메뉴 구조)
            'my_journey': '내 여정',
            'my_essentials': '내 필수 항목',
            'explore': '탐색',
            'perspectives': '관점',
            'views': '뷰',
            'select_persona': '선택',
            'change_journey': '여정 변경'
        },
        'dashboard': {
            'title': 'AI 관측성 대시보드',
            'trust_score': '신뢰 점수',
            'daily_inferences': '일일 추론',
            'daily_cost': '일일 비용',
            'carbon_footprint': '탄소 (kgCO2)',
            'system_health': '시스템 상태',
            'active_alerts': '활성 알림',
            'healthy': '정상',
            'degraded': '저하됨',
            'unhealthy': '비정상',
            'critical': '심각',
            'warning': '경고',
            'info': '정보',
            'trust_score_trend': '신뢰 점수 추이',
            'slo_compliance': 'SLO 준수',
            'compliant': '준수',
            'at_risk': '위험',
            'violated': '위반',
            'services_status': '서비스 상태',
            'search_services': '서비스 검색...',
            'top_issues': '주요 문제',
            'investigate': '조사'
        },
        'table': {
            'service': '서비스',
            'type': '유형',
            'status': '상태',
            'uptime': '가동 시간',
            'error_rate': '오류율',
            'latency_p99': 'P99 지연'
        },
        'time': {
            'last_24h': '최근 24시간',
            'last_7d': '최근 7일',
            'last_30d': '최근 30일',
            'minutes': '분',
            'hours': '시간',
            'days': '일'
        },
        'trends': {
            'up': '상승',
            'down': '하락',
            'stable': '안정',
            'improving': '개선 중',
            'degrading': '악화 중'
        },
        'profiles': {
            'all': '전체',
            'ml_engineer': 'ML 엔지니어',
            'devops': 'DevOps',
            'executive': '경영진',
            'product_owner': '제품 소유자',
            'security': '보안',
            'compliance': '컴플라이언스',
            'esg': 'ESG 담당자'
        },
        'cognitive': {
            'title': '인지 메트릭',
            'drift': '드리프트 감지',
            'reliability': '신뢰성',
            'hallucination': '환각 위험',
            'degradation': '저하',
            'trust': '신뢰 지표',
            'confidence': '신뢰도',
            'severity': '심각도',
            'low': '낮음',
            'medium': '중간',
            'high': '높음'
        },
        'causal': {
            'title': '인과 분석',
            'root_cause': '근본 원인',
            'impact': '영향',
            'correlation': '상관관계',
            'dependency': '의존성',
            'run_analysis': '분석 실행',
            'graph': '인과 그래프',
            'timeline': '타임라인'
        },
        'unified': {
            'title': '통합 모니터링 뷰',
            'all_systems': '모든 시스템',
            'filter': '필터',
            'refresh': '새로고침'
        },
        'actions': {
            'save': '저장',
            'cancel': '취소',
            'delete': '삭제',
            'edit': '편집',
            'view': '보기',
            'export': '내보내기',
            'refresh': '새로고침',
            'filter': '필터',
            'search': '검색',
            'close': '닫기',
            'confirm': '확인'
        },
        'messages': {
            'loading': '로딩 중...',
            'no_data': '데이터 없음',
            'error': '오류가 발생했습니다',
            'success': '작업이 완료되었습니다',
            'confirm_delete': '삭제하시겠습니까?'
        }
    },

    'ar': {
        'app': {
            'name': 'AIOBS',
            'title': 'مركز مراقبة الذكاء الاصطناعي',
            'subtitle': 'طبقة التحكم في الثقة لأنظمة الذكاء الاصطناعي',
            'version': 'الإصدار'
        },
        'nav': {
            'overview': 'نظرة عامة',
            'dashboard': 'لوحة التحكم',
            'unified_view': 'عرض موحد',
            'analysis': 'تحليل',
            'causal_analysis': 'التحليل السببي',
            'impact_analysis': 'تحليل التأثير',
            'configuration': 'الإعدادات',
            'toggle_theme': 'تبديل المظهر',
            'settings': 'الإعدادات',
            'language': 'اللغة',
            'models': 'النماذج',
            'drift': 'كشف الانحراف',
            'reliability': 'الموثوقية',
            'experiments': 'التجارب',
            'services': 'الخدمات',
            'slo': 'SLO/SLI',
            'topology': 'الطوبولوجيا',
            'alerts': 'التنبيهات',
            'logs': 'السجلات',
            'impact': 'التأثير التجاري',
            'costs': 'التكاليف',
            'reports': 'التقارير',
            'features': 'ميزات الذكاء الاصطناعي',
            'performance': 'الأداء',
            'user_impact': 'تأثير المستخدم',
            'security': 'الأمان',
            'incidents': 'الحوادث',
            'access_logs': 'سجلات الوصول',
            'threats': 'كشف التهديدات',
            'compliance': 'الامتثال',
            'audit_trail': 'مسار التدقيق',
            'regulations': 'اللوائح',
            'evidence': 'الأدلة',
            'carbon': 'الكربون',
            'energy': 'الطاقة',
            'sustainability': 'الاستدامة',
            'esg_reports': 'تقارير ESG',
            # أقسام التنقل (هيكل القائمة)
            'my_journey': 'رحلتي',
            'my_essentials': 'أساسياتي',
            'explore': 'استكشاف',
            'perspectives': 'وجهات نظر',
            'views': 'العروض',
            'select_persona': 'اختيار',
            'change_journey': 'تغيير الرحلة'
        },
        'dashboard': {
            'title': 'لوحة مراقبة الذكاء الاصطناعي',
            'trust_score': 'درجة الثقة',
            'daily_inferences': 'الاستدلالات اليومية',
            'daily_cost': 'التكلفة اليومية',
            'carbon_footprint': 'الكربون (كجم CO2)',
            'system_health': 'صحة النظام',
            'active_alerts': 'التنبيهات النشطة',
            'healthy': 'سليم',
            'degraded': 'متدهور',
            'unhealthy': 'غير سليم',
            'critical': 'حرج',
            'warning': 'تحذير',
            'info': 'معلومات',
            'trust_score_trend': 'اتجاه درجة الثقة',
            'slo_compliance': 'التوافق مع SLO',
            'compliant': 'متوافق',
            'at_risk': 'في خطر',
            'violated': 'منتهك',
            'services_status': 'حالة الخدمات',
            'search_services': 'البحث عن الخدمات...',
            'top_issues': 'أهم المشاكل',
            'investigate': 'تحقيق'
        },
        'table': {
            'service': 'الخدمة',
            'type': 'النوع',
            'status': 'الحالة',
            'uptime': 'وقت التشغيل',
            'error_rate': 'معدل الخطأ',
            'latency_p99': 'زمن الاستجابة P99'
        },
        'time': {
            'last_24h': 'آخر 24 ساعة',
            'last_7d': 'آخر 7 أيام',
            'last_30d': 'آخر 30 يوم',
            'minutes': 'دقيقة',
            'hours': 'ساعات',
            'days': 'أيام'
        },
        'trends': {
            'up': 'صاعد',
            'down': 'هابط',
            'stable': 'مستقر',
            'improving': 'يتحسن',
            'degrading': 'يتدهور'
        },
        'profiles': {
            'all': 'الكل',
            'ml_engineer': 'مهندس ML',
            'devops': 'DevOps',
            'executive': 'تنفيذي',
            'product_owner': 'مالك المنتج',
            'security': 'الأمان',
            'compliance': 'الامتثال',
            'esg': 'مسؤول ESG'
        },
        'cognitive': {
            'title': 'المقاييس الإدراكية',
            'drift': 'كشف الانحراف',
            'reliability': 'الموثوقية',
            'hallucination': 'خطر الهلوسة',
            'degradation': 'التدهور',
            'trust': 'مؤشر الثقة',
            'confidence': 'الثقة',
            'severity': 'الشدة',
            'low': 'منخفض',
            'medium': 'متوسط',
            'high': 'مرتفع'
        },
        'causal': {
            'title': 'التحليل السببي',
            'root_cause': 'السبب الجذري',
            'impact': 'التأثير',
            'correlation': 'الارتباط',
            'dependency': 'التبعية',
            'run_analysis': 'تشغيل التحليل',
            'graph': 'الرسم البياني السببي',
            'timeline': 'الجدول الزمني'
        },
        'unified': {
            'title': 'عرض المراقبة الموحد',
            'all_systems': 'جميع الأنظمة',
            'filter': 'تصفية',
            'refresh': 'تحديث'
        },
        'actions': {
            'save': 'حفظ',
            'cancel': 'إلغاء',
            'delete': 'حذف',
            'edit': 'تعديل',
            'view': 'عرض',
            'export': 'تصدير',
            'refresh': 'تحديث',
            'filter': 'تصفية',
            'search': 'بحث',
            'close': 'إغلاق',
            'confirm': 'تأكيد'
        },
        'messages': {
            'loading': 'جاري التحميل...',
            'no_data': 'لا توجد بيانات',
            'error': 'حدث خطأ',
            'success': 'تمت العملية بنجاح',
            'confirm_delete': 'هل أنت متأكد من الحذف؟'
        }
    }
}
