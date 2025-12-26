/**
 * GASKIA - 5 Pillars JavaScript Module
 * Handles pillar-specific interactions, data loading, and visualizations
 */

(function() {
    'use strict';

    // Pillar configuration
    const PILLARS = {
        reliability: {
            name: 'Fiabilité',
            color: '#10b981',
            icon: 'check-circle',
            endpoints: {
                score: '/api/pillars/reliability',
                metrics: '/api/pillars/reliability/metrics',
                drift: '/api/pillars/reliability/drift'
            }
        },
        security: {
            name: 'Sécurité',
            color: '#f59e0b',
            icon: 'shield',
            endpoints: {
                score: '/api/pillars/security',
                threats: '/api/pillars/security/threats',
                incidents: '/api/pillars/security/incidents'
            }
        },
        compliance: {
            name: 'Conformité',
            color: '#6366f1',
            icon: 'scale',
            endpoints: {
                score: '/api/pillars/compliance',
                audit: '/api/pillars/compliance/audit',
                aiact: '/api/pillars/compliance/aiact'
            }
        },
        explainability: {
            name: 'Explicabilité',
            color: '#8b5cf6',
            icon: 'lightbulb',
            endpoints: {
                score: '/api/pillars/explainability',
                features: '/api/pillars/explainability/features',
                confidence: '/api/pillars/explainability/confidence'
            }
        },
        performance: {
            name: 'Performance',
            color: '#3b82f6',
            icon: 'zap',
            endpoints: {
                score: '/api/pillars/performance',
                latency: '/api/pillars/performance/latency',
                cost: '/api/pillars/performance/cost'
            }
        }
    };

    // Persona configurations with pillar priorities
    const PERSONAS = {
        business_executive: {
            name: 'Dirigeant',
            icon: 'briefcase',
            pillarPriority: ['compliance', 'performance', 'reliability', 'security', 'explainability'],
            quickLinks: ['/pillars/compliance', '/pillars/performance', '/executive']
        },
        tech_ml_engineer: {
            name: 'ML Engineer',
            icon: 'cpu',
            pillarPriority: ['reliability', 'explainability', 'performance', 'security', 'compliance'],
            quickLinks: ['/pillars/reliability', '/pillars/explainability', '/causal']
        },
        tech_devops: {
            name: 'DevOps Engineer',
            icon: 'terminal',
            pillarPriority: ['performance', 'reliability', 'security', 'compliance', 'explainability'],
            quickLinks: ['/pillars/performance', '/pillars/reliability', '/monitoring']
        },
        security_soc: {
            name: 'Security SOC',
            icon: 'shield',
            pillarPriority: ['security', 'compliance', 'reliability', 'performance', 'explainability'],
            quickLinks: ['/pillars/security', '/pillars/compliance', '/security']
        },
        compliance_legal: {
            name: 'Compliance Officer',
            icon: 'scale',
            pillarPriority: ['compliance', 'explainability', 'security', 'reliability', 'performance'],
            quickLinks: ['/pillars/compliance', '/pillars/explainability', '/compliance']
        },
        sustainability_esg: {
            name: 'ESG Manager',
            icon: 'leaf',
            pillarPriority: ['performance', 'compliance', 'reliability', 'security', 'explainability'],
            quickLinks: ['/pillars/performance', '/greenops', '/pillars/compliance']
        }
    };

    /**
     * PillarsManager - Main controller for pillar functionality
     */
    class PillarsManager {
        constructor() {
            this.currentPersona = localStorage.getItem('gaskia-persona') || 'business_executive';
            this.scores = {};
            this.init();
        }

        async init() {
            await this.loadAllScores();
            this.setupPersona();
            this.setupEventListeners();
        }

        async loadAllScores() {
            try {
                const response = await fetch('/api/pillars/scores');
                const data = await response.json();

                if (data.success) {
                    this.scores = data.data;
                    this.updateScoreDisplays();
                }
            } catch (error) {
                console.log('Using demo scores');
                this.scores = {
                    reliability: 0.87,
                    security: 0.82,
                    compliance: 0.78,
                    explainability: 0.75,
                    performance: 0.91
                };
                this.updateScoreDisplays();
            }
        }

        updateScoreDisplays() {
            Object.keys(this.scores).forEach(pillar => {
                const scoreEl = document.getElementById(`${pillar}Score`);
                if (scoreEl) {
                    scoreEl.textContent = Math.round(this.scores[pillar] * 100) + '%';
                }
            });
        }

        setupPersona() {
            const persona = PERSONAS[this.currentPersona];
            if (!persona) return;

            const iconEl = document.getElementById('currentPersonaIcon');
            const labelEl = document.getElementById('currentPersonaLabel');

            if (iconEl) iconEl.setAttribute('data-lucide', persona.icon);
            if (labelEl) labelEl.textContent = persona.name;

            // Reinitialize icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }

        setupEventListeners() {
            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                // Cmd/Ctrl + 1-5 for quick pillar access
                if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '5') {
                    e.preventDefault();
                    const pillars = ['reliability', 'security', 'compliance', 'explainability', 'performance'];
                    const pillar = pillars[parseInt(e.key) - 1];
                    window.location.href = `/pillars/${pillar}`;
                }
            });
        }

        getPersonaPrioritizedPillars() {
            const persona = PERSONAS[this.currentPersona];
            if (!persona) return Object.keys(PILLARS);
            return persona.pillarPriority;
        }

        calculateGlobalScore() {
            const values = Object.values(this.scores);
            if (values.length === 0) return 0;
            return values.reduce((sum, val) => sum + val, 0) / values.length;
        }
    }

    /**
     * Pentagon Chart - Radar/Pentagon visualization for 5 pillars
     */
    class PentagonChart {
        constructor(containerId, scores) {
            this.container = document.getElementById(containerId);
            this.scores = scores || {};
            this.pillars = [
                { key: 'reliability', name: 'Fiabilité', angle: -90 },
                { key: 'security', name: 'Sécurité', angle: -18 },
                { key: 'performance', name: 'Performance', angle: 54 },
                { key: 'explainability', name: 'Explicabilité', angle: 126 },
                { key: 'compliance', name: 'Conformité', angle: 198 }
            ];
            this.center = { x: 200, y: 200 };
            this.maxRadius = 150;
        }

        render() {
            if (!this.container) return;

            const svg = this.container.querySelector('svg') || this.createSvg();
            svg.innerHTML = '';

            this.drawGrid(svg);
            this.drawAxes(svg);
            this.drawShape(svg);
            this.drawPoints(svg);
            this.drawLabels(svg);
        }

        createSvg() {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 400 400');
            svg.style.width = '100%';
            svg.style.height = '100%';
            this.container.appendChild(svg);
            return svg;
        }

        drawGrid(svg) {
            for (let i = 1; i <= 5; i++) {
                const radius = this.maxRadius * (i / 5);
                const points = this.pillars.map(p => this.getPoint(p.angle, radius)).join(' ');

                const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                polygon.setAttribute('points', points);
                polygon.setAttribute('fill', 'none');
                polygon.setAttribute('stroke', 'var(--border-color)');
                polygon.setAttribute('stroke-width', '0.5');
                polygon.setAttribute('opacity', '0.5');
                svg.appendChild(polygon);
            }
        }

        drawAxes(svg) {
            this.pillars.forEach(p => {
                const end = this.getPoint(p.angle, this.maxRadius);
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', this.center.x);
                line.setAttribute('y1', this.center.y);
                line.setAttribute('x2', end.split(',')[0]);
                line.setAttribute('y2', end.split(',')[1]);
                line.setAttribute('stroke', 'var(--border-color)');
                line.setAttribute('stroke-width', '1');
                svg.appendChild(line);
            });
        }

        drawShape(svg) {
            const points = this.pillars.map(p => {
                const score = this.scores[p.key] || 0;
                return this.getPoint(p.angle, this.maxRadius * score);
            }).join(' ');

            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('points', points);
            polygon.setAttribute('fill', 'rgba(99, 102, 241, 0.2)');
            polygon.setAttribute('stroke', 'var(--color-primary)');
            polygon.setAttribute('stroke-width', '2');
            svg.appendChild(polygon);
        }

        drawPoints(svg) {
            this.pillars.forEach(p => {
                const score = this.scores[p.key] || 0;
                const point = this.getPoint(p.angle, this.maxRadius * score);
                const [x, y] = point.split(',');

                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', x);
                circle.setAttribute('cy', y);
                circle.setAttribute('r', '6');
                circle.setAttribute('fill', PILLARS[p.key]?.color || 'var(--color-primary)');
                circle.setAttribute('cursor', 'pointer');
                circle.onclick = () => window.location.href = `/pillars/${p.key}`;
                svg.appendChild(circle);
            });
        }

        drawLabels(svg) {
            this.pillars.forEach(p => {
                const labelRadius = this.maxRadius + 30;
                const point = this.getPoint(p.angle, labelRadius);
                const [x, y] = point.split(',');

                // Name label
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', x);
                text.setAttribute('y', y);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('fill', 'var(--text-primary)');
                text.setAttribute('font-size', '0.85rem');
                text.setAttribute('font-weight', '600');
                text.textContent = p.name;
                svg.appendChild(text);

                // Score label
                const scoreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                scoreText.setAttribute('x', x);
                scoreText.setAttribute('y', parseFloat(y) + 16);
                scoreText.setAttribute('text-anchor', 'middle');
                scoreText.setAttribute('fill', 'var(--text-muted)');
                scoreText.setAttribute('font-size', '0.75rem');
                scoreText.textContent = Math.round((this.scores[p.key] || 0) * 100) + '%';
                svg.appendChild(scoreText);
            });
        }

        getPoint(angle, radius) {
            const rad = angle * Math.PI / 180;
            const x = this.center.x + radius * Math.cos(rad);
            const y = this.center.y + radius * Math.sin(rad);
            return `${x},${y}`;
        }

        updateScores(newScores) {
            this.scores = newScores;
            this.render();
        }
    }

    // Export to global namespace
    window.GASKIA = window.GASKIA || {};
    window.GASKIA.pillars = {
        PILLARS,
        PERSONAS,
        PillarsManager,
        PentagonChart
    };

    // Auto-initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        window.GASKIA.pillarsManager = new PillarsManager();
    });

})();
