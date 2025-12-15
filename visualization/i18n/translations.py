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
            # Profile navigation items
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
            'esg_reports': 'ESG Reports'
        },
        'dashboard': {
            'title': 'AI Observability Dashboard',
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
            'executive': 'Executive',
            'product_owner': 'Product Owner',
            'security': 'Security',
            'compliance': 'Compliance',
            'esg': 'ESG Officer'
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
            'impact': 'Impact',
            'correlation': 'Correlation',
            'dependency': 'Dependency',
            'run_analysis': 'Run Analysis',
            'graph': 'Causal Graph',
            'timeline': 'Timeline'
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
            'esg_reports': 'Rapports ESG'
        },
        'dashboard': {
            'title': 'Tableau de Bord d\'Observabilité IA',
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
            'executive': 'Direction',
            'product_owner': 'Product Owner',
            'security': 'Sécurité',
            'compliance': 'Conformité',
            'esg': 'Responsable ESG'
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
            'impact': 'Impact',
            'correlation': 'Corrélation',
            'dependency': 'Dépendance',
            'run_analysis': 'Lancer l\'Analyse',
            'graph': 'Graphe Causal',
            'timeline': 'Chronologie'
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
            'esg_reports': 'Informes ESG'
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
            'esg_reports': 'ESG-Berichte'
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
            'esg_reports': 'Relatórios ESG'
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
            'esg_reports': 'Report ESG'
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
            'esg_reports': 'ESG报告'
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
            'esg_reports': 'ESGレポート'
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
            'esg_reports': 'ESG 보고서'
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
            'esg_reports': 'تقارير ESG'
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
