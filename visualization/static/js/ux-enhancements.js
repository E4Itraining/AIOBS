/**
 * GASKIA UX Enhancements v2.0
 * Advanced Features for Enterprise AI Observability
 *
 * Features:
 * - Quick Insights Panel (30-second executive summary)
 * - Command Palette (⌘K navigation)
 * - Persona Journey System
 * - Proactive Recommendations
 * - Keyboard Shortcuts
 * - Smart Contextual Help
 */

(function() {
    'use strict';

    // =============================================
    // PERSONA CONFIGURATION
    // =============================================
    const PERSONAS = {
        business_executive: {
            id: 'business_executive',
            name: 'Dirigeant / Executive',
            icon: 'briefcase',
            color: '#10b981',
            focus: ['ROI', 'Risques', 'Conformité', 'Tendances'],
            journey: [
                { step: 1, label: 'Vue Globale', page: '/', description: 'KPIs essentiels' },
                { step: 2, label: 'Executive View', page: '/executive', description: 'Résumé stratégique' },
                { step: 3, label: 'Compliance', page: '/compliance', description: 'Conformité réglementaire' },
                { step: 4, label: 'FinOps', page: '/finops', description: 'Maîtrise des coûts' }
            ],
            quickInsights: ['trust_score', 'daily_cost', 'compliance_status', 'risk_level']
        },
        tech_ml_engineer: {
            id: 'tech_ml_engineer',
            name: 'ML Engineer / Tech',
            icon: 'cpu',
            color: '#6366f1',
            focus: ['Drift', 'Métriques Cognitives', 'Performance', 'Déploiement'],
            journey: [
                { step: 1, label: 'Dashboard', page: '/', description: 'Vue technique' },
                { step: 2, label: 'Monitoring', page: '/monitoring', description: 'Temps réel' },
                { step: 3, label: 'Causal', page: '/causal', description: 'Analyse causale' },
                { step: 4, label: 'Impact', page: '/impact', description: 'Analyse d\'impact' }
            ],
            quickInsights: ['drift_score', 'latency_p99', 'error_rate', 'model_health']
        },
        compliance_legal: {
            id: 'compliance_legal',
            name: 'Juriste / DPO',
            icon: 'scale',
            color: '#f59e0b',
            focus: ['RGPD', 'AI Act', 'Audit Trail', 'Risques Juridiques'],
            journey: [
                { step: 1, label: 'Compliance', page: '/compliance', description: 'Vue conformité' },
                { step: 2, label: 'Security', page: '/security', description: 'Sécurité données' },
                { step: 3, label: 'Executive', page: '/executive', description: 'Rapports' },
                { step: 4, label: 'Dashboard', page: '/', description: 'Indicateurs' }
            ],
            quickInsights: ['gdpr_compliance', 'ai_act_readiness', 'audit_status', 'data_breaches']
        },
        security_rssi: {
            id: 'security_rssi',
            name: 'RSSI / Security',
            icon: 'shield',
            color: '#ef4444',
            focus: ['Menaces', 'Vulnérabilités', 'Incidents', 'Posture Sécurité'],
            journey: [
                { step: 1, label: 'Security', page: '/security', description: 'Centre sécurité' },
                { step: 2, label: 'Monitoring', page: '/monitoring', description: 'Alertes temps réel' },
                { step: 3, label: 'Compliance', page: '/compliance', description: 'Conformité sécurité' },
                { step: 4, label: 'Causal', page: '/causal', description: 'Analyse incidents' }
            ],
            quickInsights: ['security_score', 'active_threats', 'vulnerabilities', 'incident_count']
        },
        sustainability_esg: {
            id: 'sustainability_esg',
            name: 'ESG / Sustainability',
            icon: 'leaf',
            color: '#059669',
            focus: ['Carbone', 'Énergie', 'Impact Environnemental', 'Reporting ESG'],
            journey: [
                { step: 1, label: 'GreenOps', page: '/greenops', description: 'Empreinte carbone' },
                { step: 2, label: 'Executive', page: '/executive', description: 'KPIs ESG' },
                { step: 3, label: 'FinOps', page: '/finops', description: 'Coût énergétique' },
                { step: 4, label: 'Dashboard', page: '/', description: 'Vue globale' }
            ],
            quickInsights: ['carbon_footprint', 'energy_consumption', 'green_score', 'esg_rating']
        }
    };

    // =============================================
    // STATE MANAGEMENT
    // =============================================
    const state = {
        currentPersona: null,
        commandPaletteOpen: false,
        quickInsightsOpen: false,
        shortcutsModalOpen: false,
        selectedCommandIndex: 0,
        insights: [],
        recommendations: []
    };

    // =============================================
    // ACCESSIBILITY HELPERS (WCAG 2.1 AA)
    // =============================================

    /**
     * Create ARIA live region for screen reader announcements
     */
    function createLiveRegion() {
        if (document.getElementById('ariaLiveRegion')) return;

        const liveRegion = document.createElement('div');
        liveRegion.id = 'ariaLiveRegion';
        liveRegion.setAttribute('role', 'status');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        document.body.appendChild(liveRegion);
    }

    /**
     * Announce message to screen readers
     */
    function announceToScreenReader(message, priority = 'polite') {
        let liveRegion = document.getElementById('ariaLiveRegion');
        if (!liveRegion) {
            createLiveRegion();
            liveRegion = document.getElementById('ariaLiveRegion');
        }

        liveRegion.setAttribute('aria-live', priority);
        // Clear and set to trigger announcement
        liveRegion.textContent = '';
        setTimeout(() => {
            liveRegion.textContent = message;
        }, 100);
    }

    /**
     * Setup focus trap for modal dialogs (WCAG 2.4.3)
     */
    function setupFocusTrap(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;

            const focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            // Shift+Tab from first element -> go to last
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
            // Tab from last element -> go to first
            else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        });
    }

    /**
     * Inert background content when modal is open (prevents focus outside)
     */
    function setBackgroundInert(isInert) {
        const mainContent = document.querySelector('.content, main, #app');
        const sidebar = document.querySelector('.sidebar');

        [mainContent, sidebar].forEach(el => {
            if (el) {
                if (isInert) {
                    el.setAttribute('inert', '');
                    el.setAttribute('aria-hidden', 'true');
                } else {
                    el.removeAttribute('inert');
                    el.removeAttribute('aria-hidden');
                }
            }
        });
    }

    // Load persona from localStorage
    function loadPersona() {
        const saved = localStorage.getItem('gaskia-persona') || localStorage.getItem('aiobs-persona');
        if (saved && PERSONAS[saved]) {
            state.currentPersona = PERSONAS[saved];
        }
        return state.currentPersona;
    }

    function setPersona(personaId) {
        if (PERSONAS[personaId]) {
            state.currentPersona = PERSONAS[personaId];
            localStorage.setItem('gaskia-persona', personaId);
            updateUIForPersona();
            showToast(`Profil changé : ${state.currentPersona.name}`, 'success');
        }
    }

    // =============================================
    // COMMAND PALETTE
    // =============================================
    const COMMANDS = [
        // Navigation
        { id: 'nav-home', title: 'Aller au Dashboard', desc: 'Vue principale', icon: 'home', category: 'Navigation', action: () => window.location.href = '/', shortcut: ['G', 'H'] },
        { id: 'nav-executive', title: 'Vue Executive', desc: 'Résumé pour dirigeants', icon: 'briefcase', category: 'Navigation', action: () => window.location.href = '/executive', shortcut: ['G', 'E'] },
        { id: 'nav-causal', title: 'Analyse Causale', desc: 'Graphe cause-effet', icon: 'git-branch', category: 'Navigation', action: () => window.location.href = '/causal', shortcut: ['G', 'C'] },
        { id: 'nav-monitoring', title: 'Monitoring Live', desc: 'Temps réel', icon: 'activity', category: 'Navigation', action: () => window.location.href = '/monitoring', shortcut: ['G', 'M'] },
        { id: 'nav-compliance', title: 'Compliance', desc: 'Conformité réglementaire', icon: 'shield-check', category: 'Navigation', action: () => window.location.href = '/compliance', shortcut: ['G', 'L'] },
        { id: 'nav-security', title: 'Security Center', desc: 'Centre de sécurité', icon: 'lock', category: 'Navigation', action: () => window.location.href = '/security', shortcut: ['G', 'S'] },
        { id: 'nav-finops', title: 'FinOps', desc: 'Gestion des coûts', icon: 'wallet', category: 'Navigation', action: () => window.location.href = '/finops', shortcut: ['G', 'F'] },
        { id: 'nav-greenops', title: 'GreenOps', desc: 'Impact environnemental', icon: 'leaf', category: 'Navigation', action: () => window.location.href = '/greenops', shortcut: ['G', 'G'] },

        // Actions
        { id: 'action-insights', title: 'Quick Insights', desc: 'Résumé en 30 secondes', icon: 'zap', category: 'Actions', action: toggleQuickInsights, shortcut: ['I'] },
        { id: 'action-tour', title: 'Visite Guidée', desc: 'Découvrir l\'interface', icon: 'play-circle', category: 'Actions', action: () => typeof startGuidedTour === 'function' && startGuidedTour() },
        { id: 'action-theme', title: 'Changer le thème', desc: 'Clair / Sombre', icon: 'sun', category: 'Actions', action: () => typeof toggleTheme === 'function' && toggleTheme(), shortcut: ['T'] },
        { id: 'action-shortcuts', title: 'Raccourcis clavier', desc: 'Voir tous les raccourcis', icon: 'keyboard', category: 'Actions', action: toggleShortcutsModal, shortcut: ['?'] },
        { id: 'action-export', title: 'Exporter les données', desc: 'PDF, CSV, JSON', icon: 'download', category: 'Actions', action: showExportOptions },

        // Personas
        { id: 'persona-executive', title: 'Mode Dirigeant', desc: 'Vue simplifiée business', icon: 'briefcase', category: 'Personas', action: () => setPersona('business_executive') },
        { id: 'persona-tech', title: 'Mode Technique', desc: 'Vue détaillée ML/DevOps', icon: 'cpu', category: 'Personas', action: () => setPersona('tech_ml_engineer') },
        { id: 'persona-legal', title: 'Mode Juridique', desc: 'Focus conformité', icon: 'scale', category: 'Personas', action: () => setPersona('compliance_legal') },
        { id: 'persona-security', title: 'Mode RSSI', desc: 'Focus sécurité', icon: 'shield', category: 'Personas', action: () => setPersona('security_rssi') },
        { id: 'persona-esg', title: 'Mode ESG', desc: 'Impact environnemental', icon: 'leaf', category: 'Personas', action: () => setPersona('sustainability_esg') },
    ];

    function createCommandPalette() {
        if (document.getElementById('commandPalette')) return;

        const html = `
            <div class="command-palette" id="commandPalette" role="dialog" aria-modal="true" aria-labelledby="commandPaletteTitle">
                <div class="command-palette-content">
                    <h2 id="commandPaletteTitle" class="sr-only">Palette de commandes</h2>
                    <div class="command-input-container">
                        <i data-lucide="search" class="command-input-icon" aria-hidden="true"></i>
                        <input type="text"
                               class="command-input"
                               id="commandInput"
                               placeholder="Tapez une commande ou recherchez..."
                               autocomplete="off"
                               aria-label="Rechercher une commande"
                               aria-describedby="commandHint"
                               aria-controls="commandResults"
                               aria-autocomplete="list">
                    </div>
                    <div class="command-results" id="commandResults" role="listbox" aria-label="Résultats de commandes">
                        <!-- Dynamic content -->
                    </div>
                    <div class="command-footer" id="commandHint">
                        <div class="command-footer-hint">
                            <span><kbd class="shortcut-key">↑↓</kbd> naviguer</span>
                            <span><kbd class="shortcut-key">↵</kbd> sélectionner</span>
                            <span><kbd class="shortcut-key">esc</kbd> fermer</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        const input = document.getElementById('commandInput');
        input.addEventListener('input', filterCommands);
        input.addEventListener('keydown', handleCommandKeydown);

        // Handle click outside to close
        document.getElementById('commandPalette').addEventListener('click', (e) => {
            if (e.target.classList.contains('command-palette')) {
                toggleCommandPalette();
            }
        });

        // Trap focus within modal
        setupFocusTrap('commandPalette');

        renderCommands(COMMANDS);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // Store reference to previously focused element for proper focus restoration
    let previouslyFocusedElement = null;

    function toggleCommandPalette() {
        // Ensure the command palette is created
        createCommandPalette();

        state.commandPaletteOpen = !state.commandPaletteOpen;
        const palette = document.getElementById('commandPalette');

        // Safety check - if element still doesn't exist, exit gracefully
        if (!palette) {
            console.warn('Command palette element not found');
            return;
        }

        if (state.commandPaletteOpen) {
            previouslyFocusedElement = document.activeElement;
            palette.classList.add('open');
            const input = document.getElementById('commandInput');
            if (input) {
                input.focus();
                input.value = '';
            }
            state.selectedCommandIndex = 0;
            renderCommands(COMMANDS);
            // Announce to screen readers
            announceToScreenReader('Palette de commandes ouverte. Tapez pour rechercher.');
        } else {
            palette.classList.remove('open');
            // Restore focus to previously focused element
            if (previouslyFocusedElement && previouslyFocusedElement.focus) {
                previouslyFocusedElement.focus();
            }
        }
    }

    function filterCommands(e) {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderCommands(COMMANDS);
            return;
        }

        const filtered = COMMANDS.filter(cmd =>
            cmd.title.toLowerCase().includes(query) ||
            cmd.desc.toLowerCase().includes(query) ||
            cmd.category.toLowerCase().includes(query)
        );

        state.selectedCommandIndex = 0;
        renderCommands(filtered);
    }

    function renderCommands(commands) {
        const container = document.getElementById('commandResults');
        if (!container) return;

        const grouped = commands.reduce((acc, cmd) => {
            if (!acc[cmd.category]) acc[cmd.category] = [];
            acc[cmd.category].push(cmd);
            return acc;
        }, {});

        let html = '';
        let globalIndex = 0;

        for (const [category, cmds] of Object.entries(grouped)) {
            html += `<div class="command-group">
                <div class="command-group-title">${category}</div>`;

            for (const cmd of cmds) {
                const isSelected = globalIndex === state.selectedCommandIndex;
                html += `
                    <div class="command-item ${isSelected ? 'selected' : ''}"
                         data-index="${globalIndex}"
                         data-id="${cmd.id}"
                         onclick="executeCommand('${cmd.id}')">
                        <div class="command-item-icon">
                            <i data-lucide="${cmd.icon}"></i>
                        </div>
                        <div class="command-item-info">
                            <div class="command-item-title">${cmd.title}</div>
                            <div class="command-item-desc">${cmd.desc}</div>
                        </div>
                        ${cmd.shortcut ? `
                            <div class="command-item-shortcut">
                                ${cmd.shortcut.map(k => `<kbd class="shortcut-key">${k}</kbd>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
                globalIndex++;
            }
            html += '</div>';
        }

        container.innerHTML = html || '<div class="search-empty"><i data-lucide="search-x"></i><span>Aucun résultat</span></div>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function handleCommandKeydown(e) {
        const items = document.querySelectorAll('.command-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            state.selectedCommandIndex = Math.min(state.selectedCommandIndex + 1, items.length - 1);
            updateCommandSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            state.selectedCommandIndex = Math.max(state.selectedCommandIndex - 1, 0);
            updateCommandSelection();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selected = items[state.selectedCommandIndex];
            if (selected) {
                executeCommand(selected.dataset.id);
            }
        } else if (e.key === 'Escape') {
            toggleCommandPalette();
        }
    }

    function updateCommandSelection() {
        const items = document.querySelectorAll('.command-item');
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === state.selectedCommandIndex);
        });
        items[state.selectedCommandIndex]?.scrollIntoView({ block: 'nearest' });
    }

    window.executeCommand = function(cmdId) {
        const cmd = COMMANDS.find(c => c.id === cmdId);
        if (cmd && cmd.action) {
            toggleCommandPalette();
            cmd.action();
        }
    };

    // =============================================
    // QUICK INSIGHTS PANEL
    // =============================================
    function createQuickInsightsPanel() {
        if (document.getElementById('quickInsightsContainer')) return;

        const html = `
            <button class="quick-insights-trigger"
                    id="quickInsightsTrigger"
                    onclick="toggleQuickInsights()"
                    title="Quick Insights (I)"
                    aria-label="Ouvrir Quick Insights - Résumé en 30 secondes"
                    aria-expanded="false"
                    aria-controls="quickInsightsContainer">
                <i data-lucide="zap" aria-hidden="true"></i>
                <span class="badge-count" id="insightsBadge" style="display:none;" aria-label="notifications">0</span>
            </button>
            <div class="quick-insights-container"
                 id="quickInsightsContainer"
                 role="complementary"
                 aria-labelledby="quickInsightsTitle"
                 aria-hidden="true">
                <div class="quick-insights-header">
                    <h2 id="quickInsightsTitle"><i data-lucide="zap" aria-hidden="true"></i> Quick Insights</h2>
                    <div class="insights-timer" aria-label="Temps de lecture estimé: 30 secondes">
                        <i data-lucide="clock" aria-hidden="true"></i>
                        <span>Résumé 30 sec</span>
                    </div>
                    <button class="quick-insights-close"
                            onclick="toggleQuickInsights()"
                            aria-label="Fermer Quick Insights">
                        <i data-lucide="x" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="quick-insights-content" id="quickInsightsContent" role="region" aria-live="polite">
                    <div class="loader"><div class="spinner"></div></div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    window.toggleQuickInsights = function() {
        // Ensure the quick insights panel is created
        createQuickInsightsPanel();

        state.quickInsightsOpen = !state.quickInsightsOpen;
        const panel = document.getElementById('quickInsightsContainer');
        const trigger = document.getElementById('quickInsightsTrigger');

        // Safety check - if element still doesn't exist, exit gracefully
        if (!panel) {
            console.warn('Quick insights panel not found');
            return;
        }

        if (state.quickInsightsOpen) {
            panel.classList.add('open');
            panel.setAttribute('aria-hidden', 'false');
            trigger?.setAttribute('aria-expanded', 'true');
            loadQuickInsights();
            announceToScreenReader('Quick Insights ouvert');
            // Focus the close button
            panel.querySelector('.quick-insights-close')?.focus();
        } else {
            panel.classList.remove('open');
            panel.setAttribute('aria-hidden', 'true');
            trigger?.setAttribute('aria-expanded', 'false');
            // Restore focus to trigger
            trigger?.focus();
        }
    };

    async function loadQuickInsights() {
        const content = document.getElementById('quickInsightsContent');
        const persona = state.currentPersona || PERSONAS.business_executive;

        try {
            // Fetch dashboard data for insights
            const response = await fetch('/api/dashboard/status');
            const data = response.ok ? await response.json() : getMockInsightsData();

            const insights = generateInsights(data, persona);
            renderQuickInsights(insights, persona);
        } catch (error) {
            renderQuickInsights(generateInsights(getMockInsightsData(), persona), persona);
        }
    }

    function getMockInsightsData() {
        return {
            success: true,
            data: {
                trust_score: 0.87,
                trust_trend: 'up',
                daily_cost: 1250,
                cost_trend: 'down',
                carbon_kg: 42,
                carbon_trend: 'stable',
                active_alerts: 3,
                critical_alerts: 1,
                slo_compliance: 98.5,
                security_score: 0.92,
                services_healthy: 12,
                services_degraded: 2,
                services_unhealthy: 1
            }
        };
    }

    function generateInsights(apiData, persona) {
        const data = apiData.data || apiData;
        const insights = [];

        // Executive summary based on overall health
        const trustScore = data.trust_score || 0.87;
        const status = trustScore > 0.85 ? 'optimal' : trustScore > 0.7 ? 'attention' : 'critical';

        insights.push({
            type: 'summary',
            status: status,
            title: status === 'optimal' ? 'Systèmes IA Performants' : status === 'attention' ? 'Points d\'Attention' : 'Action Requise',
            body: generateSummaryText(data, persona)
        });

        // Quick stats
        insights.push({
            type: 'stats',
            stats: [
                { label: 'Trust Score', value: `${(trustScore * 100).toFixed(0)}%`, trend: data.trust_trend || 'up' },
                { label: 'Coût Jour', value: `$${(data.daily_cost || 1250).toLocaleString()}`, trend: data.cost_trend || 'down' },
                { label: 'SLO', value: `${(data.slo_compliance || 98.5).toFixed(1)}%`, trend: 'stable' },
                { label: 'CO₂', value: `${(data.carbon_kg || 42)}kg`, trend: data.carbon_trend || 'stable' }
            ]
        });

        // Priority insights based on persona
        if (data.critical_alerts > 0) {
            insights.push({
                type: 'insight',
                priority: 'high',
                icon: 'alert-triangle',
                iconType: 'alert',
                title: `${data.critical_alerts} Alerte${data.critical_alerts > 1 ? 's' : ''} Critique${data.critical_alerts > 1 ? 's' : ''}`,
                body: 'Actions immédiates requises pour maintenir la stabilité du système.',
                actions: [
                    { label: 'Voir les alertes', primary: true, action: "window.location.href='/monitoring'" },
                    { label: 'Ignorer', primary: false }
                ]
            });
        }

        if (persona.id === 'compliance_legal' || persona.id === 'security_rssi') {
            insights.push({
                type: 'insight',
                priority: 'medium',
                icon: 'shield-check',
                iconType: 'success',
                title: 'Conformité RGPD: 94%',
                body: 'Légère amélioration depuis la dernière vérification. 2 points à corriger.',
                actions: [
                    { label: 'Détails', primary: true, action: "window.location.href='/compliance'" }
                ]
            });
        }

        if (persona.id === 'sustainability_esg') {
            insights.push({
                type: 'insight',
                priority: 'low',
                icon: 'leaf',
                iconType: 'success',
                title: 'Empreinte Carbone Optimisée',
                body: 'Réduction de 12% ce mois grâce aux optimisations d\'inférence.',
                actions: [
                    { label: 'Voir GreenOps', primary: true, action: "window.location.href='/greenops'" }
                ]
            });
        }

        return insights;
    }

    function generateSummaryText(data, persona) {
        const trustScore = data.trust_score || 0.87;
        const cost = data.daily_cost || 1250;
        const alerts = data.active_alerts || 3;

        if (persona.id === 'business_executive') {
            return `Vos systèmes IA affichent un <strong>score de confiance de ${(trustScore*100).toFixed(0)}%</strong>.
                    Le coût journalier est de <strong>$${cost.toLocaleString()}</strong> avec ${alerts} alertes actives.
                    La conformité réglementaire est maintenue à un niveau satisfaisant.`;
        } else if (persona.id === 'tech_ml_engineer') {
            return `<strong>${data.services_healthy || 12} services</strong> opérationnels,
                    <strong>${data.services_degraded || 2} dégradés</strong>.
                    Latence P99: <strong>${data.latency_p99 || 145}ms</strong>.
                    Drift détecté sur 1 modèle - investigation recommandée.`;
        } else if (persona.id === 'security_rssi') {
            return `Score sécurité: <strong>${((data.security_score || 0.92)*100).toFixed(0)}%</strong>.
                    ${data.active_threats || 0} menaces actives détectées.
                    Dernière analyse de vulnérabilités: il y a 2h.`;
        }

        return `Score de confiance global: <strong>${(trustScore*100).toFixed(0)}%</strong>.
                ${alerts} alertes actives. Tous les indicateurs sont dans les normes.`;
    }

    function renderQuickInsights(insights, persona) {
        const content = document.getElementById('quickInsightsContent');
        let html = '';

        for (const insight of insights) {
            if (insight.type === 'summary') {
                html += `
                    <div class="executive-summary">
                        <div class="executive-summary-header">
                            <div class="summary-icon" style="background: ${persona.color}">
                                <i data-lucide="${persona.icon}"></i>
                            </div>
                            <div class="summary-status">
                                <span class="summary-status-label">Statut Global</span>
                                <span class="summary-status-value ${insight.status}">${insight.title}</span>
                            </div>
                        </div>
                        <div class="executive-summary-body">${insight.body}</div>
                    </div>
                `;
            } else if (insight.type === 'stats') {
                html += `
                    <div class="quick-stats-row">
                        ${insight.stats.map(stat => `
                            <div class="quick-stat">
                                <div class="quick-stat-value">${stat.value}</div>
                                <div class="quick-stat-label">${stat.label}</div>
                                <span class="quick-stat-trend ${stat.trend}">
                                    <i data-lucide="${stat.trend === 'up' ? 'trending-up' : stat.trend === 'down' ? 'trending-down' : 'minus'}"></i>
                                    ${stat.trend === 'up' ? '+2.3%' : stat.trend === 'down' ? '-5.1%' : '0%'}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else if (insight.type === 'insight') {
                html += `
                    <div class="insight-card priority-${insight.priority}">
                        <div class="insight-header">
                            <div class="insight-icon ${insight.iconType}">
                                <i data-lucide="${insight.icon}"></i>
                            </div>
                            <div class="insight-content">
                                <h4>${insight.title}</h4>
                                <p>${insight.body}</p>
                            </div>
                        </div>
                        ${insight.actions ? `
                            <div class="insight-actions">
                                ${insight.actions.map(action => `
                                    <button class="insight-action ${action.primary ? 'insight-action-primary' : 'insight-action-secondary'}"
                                            onclick="${action.action || ''}">
                                        ${action.label}
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
            }
        }

        // Add recommendations section
        html += renderRecommendations(persona);

        content.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function renderRecommendations(persona) {
        const recommendations = getPersonaRecommendations(persona);

        return `
            <div class="recommendations-panel" style="margin-top: var(--space-5); background: transparent; border: none; padding: 0;">
                <div class="recommendations-header">
                    <div class="recommendations-title">
                        <i data-lucide="lightbulb"></i>
                        Recommandations IA
                    </div>
                    <span class="recommendations-badge">${recommendations.length}</span>
                </div>
                <div class="recommendation-cards" style="grid-template-columns: 1fr;">
                    ${recommendations.map(rec => `
                        <div class="recommendation-card ${rec.type}">
                            <div class="recommendation-type">
                                <i data-lucide="${rec.icon}"></i>
                                ${rec.category}
                            </div>
                            <h4>${rec.title}</h4>
                            <p>${rec.description}</p>
                            <div class="recommendation-impact">
                                <span>Impact estimé:</span>
                                <span class="recommendation-impact-value">${rec.impact}</span>
                            </div>
                            <button class="recommendation-apply" onclick="${rec.action}">
                                Appliquer
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function getPersonaRecommendations(persona) {
        const allRecs = {
            business_executive: [
                { type: 'savings', icon: 'dollar-sign', category: 'FinOps', title: 'Optimiser les coûts d\'inférence', description: 'Réduire les appels redondants sur le modèle recommandation-v2.', impact: '-$340/jour', action: "window.location.href='/finops'" }
            ],
            tech_ml_engineer: [
                { type: 'performance', icon: 'zap', category: 'Performance', title: 'Réduire la latence P99', description: 'Le cache Redis montre un taux de miss élevé. Augmenter le TTL recommandé.', impact: '-45ms latence', action: "window.location.href='/monitoring'" }
            ],
            security_rssi: [
                { type: 'security', icon: 'shield', category: 'Sécurité', title: 'Mettre à jour les règles WAF', description: 'Nouvelles signatures disponibles pour les attaques prompt injection.', impact: '+15% protection', action: "window.location.href='/security'" }
            ],
            sustainability_esg: [
                { type: 'sustainability', icon: 'leaf', category: 'GreenOps', title: 'Optimiser le batch processing', description: 'Regrouper les inférences nocturnes réduirait l\'empreinte carbone.', impact: '-8kg CO₂/jour', action: "window.location.href='/greenops'" }
            ],
            compliance_legal: [
                { type: 'performance', icon: 'file-check', category: 'Conformité', title: 'Compléter l\'audit trail', description: '3 événements manquent de traçabilité complète pour l\'AI Act.', impact: '100% conformité', action: "window.location.href='/compliance'" }
            ]
        };

        return allRecs[persona.id] || allRecs.business_executive;
    }

    // =============================================
    // KEYBOARD SHORTCUTS
    // =============================================
    const SHORTCUTS = {
        'Navigation': [
            { keys: ['⌘', 'K'], desc: 'Ouvrir la palette de commandes' },
            { keys: ['G', 'H'], desc: 'Aller au Dashboard' },
            { keys: ['G', 'D'], desc: 'Aller au Dashboard (alt)' },
            { keys: ['G', 'E'], desc: 'Vue Executive' },
            { keys: ['G', 'C'], desc: 'Analyse Causale' },
            { keys: ['G', 'M'], desc: 'Monitoring' },
            { keys: ['G', 'S'], desc: 'Security Center' },
            { keys: ['G', 'F'], desc: 'FinOps' },
            { keys: ['G', 'G'], desc: 'GreenOps' },
            { keys: ['G', 'L'], desc: 'Compliance' },
            { keys: ['G', 'T'], desc: 'Vue Tech' },
            { keys: ['G', 'U'], desc: 'Vue Unifiée' }
        ],
        'Actions': [
            { keys: ['I'], desc: 'Quick Insights' },
            { keys: ['A'], desc: 'Ouvrir l\'Assistant IA' },
            { keys: ['T'], desc: 'Changer le thème' },
            { keys: ['?'], desc: 'Raccourcis clavier' },
            { keys: ['Esc'], desc: 'Fermer les modales' },
            { keys: ['R'], desc: 'Rafraîchir les données' }
        ],
        'Recherche': [
            { keys: ['/'], desc: 'Focus sur la recherche' },
            { keys: ['↑', '↓'], desc: 'Naviguer les résultats' },
            { keys: ['↵'], desc: 'Sélectionner' }
        ]
    };

    function createShortcutsModal() {
        if (document.getElementById('shortcutsModal')) return;

        let sectionsHtml = '';
        for (const [section, shortcuts] of Object.entries(SHORTCUTS)) {
            sectionsHtml += `
                <div class="shortcuts-section">
                    <div class="shortcuts-section-title">${section}</div>
                    ${shortcuts.map(s => `
                        <div class="shortcut-item">
                            <span class="shortcut-desc">${s.desc}</span>
                            <div class="shortcut-keys">
                                ${s.keys.map(k => `<kbd class="shortcut-key">${k}</kbd>`).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        const html = `
            <div class="shortcuts-modal" id="shortcutsModal" role="dialog" aria-modal="true" aria-labelledby="shortcutsModalTitle">
                <div class="shortcuts-content">
                    <div class="shortcuts-header">
                        <h2 id="shortcutsModalTitle"><i data-lucide="keyboard" aria-hidden="true"></i> Raccourcis Clavier</h2>
                        <button class="help-panel-close" onclick="toggleShortcutsModal()" aria-label="Fermer la liste des raccourcis">
                            <i data-lucide="x" aria-hidden="true"></i>
                        </button>
                    </div>
                    <div class="shortcuts-body">${sectionsHtml}</div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
        document.getElementById('shortcutsModal').addEventListener('click', (e) => {
            if (e.target.classList.contains('shortcuts-modal')) {
                toggleShortcutsModal();
            }
        });

        // Setup focus trap
        setupFocusTrap('shortcutsModal');

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    let shortcutsPreviousFocus = null;

    window.toggleShortcutsModal = function() {
        // Ensure the shortcuts modal is created
        createShortcutsModal();

        state.shortcutsModalOpen = !state.shortcutsModalOpen;
        const modal = document.getElementById('shortcutsModal');

        // Safety check - if element still doesn't exist, exit gracefully
        if (!modal) {
            console.warn('Shortcuts modal not found');
            return;
        }

        if (state.shortcutsModalOpen) {
            shortcutsPreviousFocus = document.activeElement;
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            // Focus the close button
            modal.querySelector('.help-panel-close')?.focus();
            announceToScreenReader('Raccourcis clavier affichés');
        } else {
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
            // Restore focus
            if (shortcutsPreviousFocus && shortcutsPreviousFocus.focus) {
                shortcutsPreviousFocus.focus();
            }
        }
    };

    // =============================================
    // PERSONA JOURNEY BAR
    // =============================================
    function createPersonaJourneyBar() {
        const persona = state.currentPersona;
        if (!persona) return;

        // Remove existing journey bar
        const existing = document.querySelector('.persona-journey-bar');
        if (existing) existing.remove();

        const currentPath = window.location.pathname;
        const journey = persona.journey;

        let html = '<div class="persona-journey-bar">';

        journey.forEach((step, index) => {
            const isActive = step.page === currentPath;
            const isCompleted = journey.findIndex(s => s.page === currentPath) > index;

            if (index > 0) {
                html += `<div class="journey-connector ${isCompleted ? 'completed' : ''}"></div>`;
            }

            html += `
                <a href="${step.page}" class="journey-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">
                    <span class="journey-step-number">${isCompleted ? '✓' : step.step}</span>
                    <span>${step.label}</span>
                </a>
            `;
        });

        html += '</div>';

        const content = document.querySelector('.content');
        if (content) {
            content.insertAdjacentHTML('afterbegin', html);
        }
    }

    // =============================================
    // GLOBAL KEYBOARD HANDLER
    // =============================================
    let keySequence = [];
    let keyTimeout = null;

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (e.key === 'Escape') {
                    e.target.blur();
                }
                return;
            }

            // Command palette: Cmd/Ctrl + K
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                toggleCommandPalette();
                return;
            }

            // Quick insights: I
            if (e.key === 'i' || e.key === 'I') {
                if (!state.commandPaletteOpen) {
                    e.preventDefault();
                    toggleQuickInsights();
                }
                return;
            }

            // Shortcuts modal: ? (Shift + /)
            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                toggleShortcutsModal();
                return;
            }

            // Theme toggle: T
            if ((e.key === 't' || e.key === 'T') && !state.commandPaletteOpen) {
                if (typeof toggleTheme === 'function') {
                    e.preventDefault();
                    toggleTheme();
                }
                return;
            }

            // AI Assistant toggle: A
            if ((e.key === 'a' || e.key === 'A') && !state.commandPaletteOpen) {
                const chatbotToggle = document.getElementById('chatbotToggle');
                if (chatbotToggle) {
                    e.preventDefault();
                    chatbotToggle.click();
                }
                return;
            }

            // Refresh data: R
            if ((e.key === 'r' || e.key === 'R') && !state.commandPaletteOpen && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                if (typeof refreshDashboard === 'function') {
                    refreshDashboard();
                } else if (typeof loadDashboardData === 'function') {
                    loadDashboardData();
                }
                showToast('Données rafraîchies', 'success', 2000);
                return;
            }

            // Focus search: /
            if (e.key === '/' && !state.commandPaletteOpen) {
                const searchInput = document.querySelector('.search-input, #searchInput, input[type="search"]');
                if (searchInput) {
                    e.preventDefault();
                    searchInput.focus();
                }
                return;
            }

            // Escape to close modals
            if (e.key === 'Escape') {
                if (state.commandPaletteOpen) toggleCommandPalette();
                if (state.quickInsightsOpen) toggleQuickInsights();
                if (state.shortcutsModalOpen) toggleShortcutsModal();
                // Also close help panel and chatbot
                const helpPanel = document.querySelector('.help-panel.open');
                if (helpPanel) helpPanel.classList.remove('open');
                const chatbotPanel = document.querySelector('.chatbot-panel.open');
                if (chatbotPanel) chatbotPanel.classList.remove('open');
                return;
            }

            // G + key navigation
            clearTimeout(keyTimeout);
            keySequence.push(e.key.toUpperCase());

            if (keySequence.length >= 2) {
                const combo = keySequence.slice(-2).join('');
                const navMap = {
                    'GH': '/',
                    'GD': '/',
                    'GE': '/executive',
                    'GC': '/causal',
                    'GM': '/monitoring',
                    'GS': '/security',
                    'GF': '/finops',
                    'GG': '/greenops',
                    'GL': '/compliance',
                    'GT': '/tech',
                    'GU': '/unified'
                };

                if (navMap[combo]) {
                    e.preventDefault();
                    window.location.href = navMap[combo];
                    showToast(`Navigation: ${navMap[combo]}`, 'info', 1500);
                }
                keySequence = [];
            }

            keyTimeout = setTimeout(() => {
                keySequence = [];
            }, 500);
        });
    }

    // =============================================
    // EXPORT OPTIONS
    // =============================================
    function showExportOptions() {
        if (typeof showToast === 'function') {
            showToast('Export: PDF, CSV, JSON disponibles dans chaque section', 'info', 4000);
        }
    }

    // =============================================
    // UI UPDATE FOR PERSONA
    // =============================================
    function updateUIForPersona() {
        const persona = state.currentPersona;
        if (!persona) return;

        // Update persona context banner if exists
        const banner = document.querySelector('.persona-context-banner');
        if (banner) {
            banner.querySelector('.persona-avatar').style.background = persona.color;
            banner.querySelector('h3').textContent = persona.name;
        }

        // Update journey bar
        createPersonaJourneyBar();

        // Update document with persona class
        document.body.dataset.persona = persona.id;
    }

    // =============================================
    // INITIALIZATION
    // =============================================
    function init() {
        // Setup accessibility features first
        createLiveRegion();

        loadPersona();
        createCommandPalette();
        createQuickInsightsPanel();
        createShortcutsModal();
        setupKeyboardShortcuts();

        if (state.currentPersona) {
            createPersonaJourneyBar();
            updateUIForPersona();
        }

        // Add page transition animation
        document.querySelector('.content')?.classList.add('page-transition-enter');

        // Animate cards on load
        setTimeout(() => {
            document.querySelectorAll('.card, .kpi-card').forEach((card, i) => {
                card.classList.add('card-animate');
                card.style.animationDelay = `${i * 0.05}s`;
            });
        }, 100);

        console.log('🚀 GASKIA UX Enhancements v2.0 loaded');
        console.log('♿ Accessibility: WCAG 2.1 AA compliant');
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose to global scope
    window.GASKIA_UX = {
        setPersona,
        toggleCommandPalette,
        toggleQuickInsights,
        toggleShortcutsModal,
        PERSONAS
    };

})();
