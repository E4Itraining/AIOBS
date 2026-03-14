/**
 * GASKIA - Données Temps Réel Cyberdéfense
 * Inspiré de iattack (attaques LLM) et aiobs-lab (observabilité IA)
 * Simule des flux de données réalistes pour le contexte Ministère des Armées
 */

window.GASKIA_RT = (function() {
    'use strict';

    // =============================================
    // Configuration des menaces (inspiré iattack)
    // =============================================
    const ATTACK_TYPES = [
        { id: 'prompt_injection', label: 'Injection de Prompt', severity: 'critical', mitre: 'T1059.007', color: '#DC2626' },
        { id: 'data_poisoning', label: 'Empoisonnement Données', severity: 'high', mitre: 'T1565.001', color: '#F59E0B' },
        { id: 'jailbreak', label: 'Contournement Garde-fous', severity: 'critical', mitre: 'T1548', color: '#DC2626' },
        { id: 'model_extraction', label: 'Extraction de Modèle', severity: 'high', mitre: 'T1005', color: '#F59E0B' },
        { id: 'membership_inference', label: 'Inférence d\'Appartenance', severity: 'medium', mitre: 'T1530', color: '#3B82F6' },
        { id: 'adversarial_input', label: 'Entrée Adversariale', severity: 'high', mitre: 'T1499', color: '#F59E0B' },
        { id: 'data_exfiltration', label: 'Exfiltration via IA', severity: 'critical', mitre: 'T1048', color: '#DC2626' },
    ];

    const DEFENSE_SYSTEMS = [
        { id: 'sioc', name: 'Passerelle SIOC', type: 'gateway', status: 'nominal' },
        { id: 'routeur_ia', name: 'Routeur Modèles IA', type: 'router', status: 'nominal' },
        { id: 'cluster', name: 'Cluster Inférence', type: 'compute', status: 'nominal' },
        { id: 'bdd_tactique', name: 'Base Données Tactique', type: 'storage', status: 'nominal' },
        { id: 'soc_analyzer', name: 'Analyseur SOC', type: 'analysis', status: 'nominal' },
        { id: 'guardrails', name: 'Module Garde-fous', type: 'defense', status: 'nominal' },
    ];

    const MITRE_TECHNIQUES = [
        'T1059.007', 'T1565.001', 'T1548', 'T1005', 'T1530',
        'T1499', 'T1048', 'T1190', 'T1203', 'T1071.001',
        'T1059.001', 'T1027', 'T1055', 'T1543', 'T1098',
    ];

    // =============================================
    // Générateur de métriques temps réel (inspiré aiobs-lab)
    // =============================================
    const state = {
        trustScore: 0.87,
        driftLevel: 0.12,
        hallucinationRate: 0.02,
        totalRequests: 145230,
        totalAttacks: 47,
        blockedAttacks: 44,
        activeAlerts: [],
        systemHealth: {},
        metrics: {
            ttft: [],         // Time to First Token
            latency: [],      // Latence inférence
            throughput: [],    // Débit requêtes
            errorRate: [],     // Taux d'erreur
            costPerQuery: [],  // Coût par requête
            evalScore: [],     // Score d'évaluation
        },
        attackTimeline: [],
        listeners: {},
    };

    // Initialize system health
    DEFENSE_SYSTEMS.forEach(sys => {
        state.systemHealth[sys.id] = {
            ...sys,
            uptime: 99.5 + Math.random() * 0.49,
            latency: 10 + Math.random() * 80,
            requestsPerMin: 500 + Math.random() * 5000,
            errorRate: Math.random() * 0.5,
            lastCheck: Date.now(),
        };
    });

    // =============================================
    // Simulation Engine
    // =============================================
    function addNoise(value, range) {
        return value + (Math.random() - 0.5) * range;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function generateTimestamp() {
        return new Date().toISOString();
    }

    // Generate LLM metrics (inspired by aiobs-lab)
    function generateLLMMetrics() {
        const now = Date.now();

        // Time to First Token (seconds)
        const ttft = clamp(addNoise(0.3, 0.15), 0.05, 2.0);
        state.metrics.ttft.push({ time: now, value: ttft });

        // Inference latency (ms)
        const lat = clamp(addNoise(45, 25), 10, 200);
        state.metrics.latency.push({ time: now, value: lat });

        // Throughput (req/min)
        const hour = new Date().getMinutes() % 24;
        const trafficMultiplier = 0.5 + Math.sin(hour / 24 * Math.PI * 2) * 0.5;
        const throughput = clamp(addNoise(8000 * trafficMultiplier, 1500), 500, 15000);
        state.metrics.throughput.push({ time: now, value: throughput });

        // Error rate
        const errRate = clamp(addNoise(0.2, 0.3), 0, 5);
        state.metrics.errorRate.push({ time: now, value: errRate });

        // Cost per query (€)
        const cost = clamp(addNoise(0.003, 0.001), 0.001, 0.01);
        state.metrics.costPerQuery.push({ time: now, value: cost });

        // Eval score
        const evalScore = clamp(addNoise(state.trustScore, 0.05), 0.5, 1.0);
        state.metrics.evalScore.push({ time: now, value: evalScore });

        // Keep last 120 points per metric
        Object.keys(state.metrics).forEach(key => {
            if (state.metrics[key].length > 120) {
                state.metrics[key] = state.metrics[key].slice(-120);
            }
        });

        state.totalRequests += Math.floor(throughput / 60);

        emit('metrics-update', {
            ttft, latency: lat, throughput, errorRate: errRate,
            costPerQuery: cost, evalScore,
            totalRequests: state.totalRequests,
        });
    }

    // Generate attack events (inspired by iattack)
    function maybeGenerateAttack() {
        // ~5% chance per tick of an attack attempt
        if (Math.random() > 0.05) return;

        const attack = ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)];
        const blocked = Math.random() < 0.93; // 93% detection rate
        const system = DEFENSE_SYSTEMS[Math.floor(Math.random() * DEFENSE_SYSTEMS.length)];

        const event = {
            id: `ATK-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            timestamp: generateTimestamp(),
            type: attack.id,
            label: attack.label,
            severity: attack.severity,
            mitre: attack.mitre,
            color: attack.color,
            targetSystem: system.name,
            targetId: system.id,
            blocked: blocked,
            confidence: clamp(0.75 + Math.random() * 0.25, 0.5, 1.0),
            responseTimeMs: Math.floor(10 + Math.random() * 90),
            details: blocked
                ? `Attaque ${attack.label} détectée et bloquée sur ${system.name}`
                : `ALERTE: ${attack.label} non bloquée sur ${system.name}`,
        };

        state.totalAttacks++;
        if (blocked) state.blockedAttacks++;

        state.attackTimeline.push(event);
        if (state.attackTimeline.length > 50) {
            state.attackTimeline = state.attackTimeline.slice(-50);
        }

        if (!blocked) {
            state.activeAlerts.push({
                id: event.id,
                timestamp: event.timestamp,
                severity: 'critical',
                message: event.details,
                mitre: attack.mitre,
                system: system.name,
            });
            // Degrade trust score on unblocked attack
            state.trustScore = clamp(state.trustScore - 0.02, 0.5, 1.0);
        }

        emit('attack-event', event);
        emit('stats-update', getStats());
    }

    // Drift simulation (inspired by aiobs-lab)
    function simulateDrift() {
        // Slowly drift over time
        state.driftLevel = clamp(addNoise(state.driftLevel, 0.02), 0.0, 1.0);
        state.hallucinationRate = clamp(addNoise(state.hallucinationRate, 0.005), 0.0, 0.5);

        // If drift is high, degrade trust
        if (state.driftLevel > 0.3) {
            state.trustScore = clamp(state.trustScore - 0.001, 0.5, 1.0);
        } else {
            // Slowly recover
            state.trustScore = clamp(state.trustScore + 0.0005, 0.5, 0.95);
        }

        emit('drift-update', {
            driftLevel: state.driftLevel,
            hallucinationRate: state.hallucinationRate,
            trustScore: state.trustScore,
        });
    }

    // System health updates
    function updateSystemHealth() {
        DEFENSE_SYSTEMS.forEach(sys => {
            const h = state.systemHealth[sys.id];
            h.latency = clamp(addNoise(h.latency, 10), 5, 300);
            h.requestsPerMin = clamp(addNoise(h.requestsPerMin, 200), 100, 10000);
            h.errorRate = clamp(addNoise(h.errorRate, 0.1), 0, 5);
            h.lastCheck = Date.now();

            // Status based on metrics
            if (h.errorRate > 2 || h.latency > 200) {
                h.status = 'degraded';
            } else if (h.errorRate > 4 || h.latency > 500) {
                h.status = 'critical';
            } else {
                h.status = 'nominal';
            }
        });

        emit('health-update', state.systemHealth);
    }

    // Clean old alerts
    function cleanAlerts() {
        const fiveMinAgo = Date.now() - 5 * 60 * 1000;
        state.activeAlerts = state.activeAlerts.filter(a =>
            new Date(a.timestamp).getTime() > fiveMinAgo
        );
    }

    // =============================================
    // Event System
    // =============================================
    function on(event, callback) {
        if (!state.listeners[event]) state.listeners[event] = [];
        state.listeners[event].push(callback);
    }

    function off(event, callback) {
        if (!state.listeners[event]) return;
        state.listeners[event] = state.listeners[event].filter(cb => cb !== callback);
    }

    function emit(event, data) {
        if (!state.listeners[event]) return;
        state.listeners[event].forEach(cb => {
            try { cb(data); } catch (e) { console.error('RT event error:', e); }
        });
    }

    // =============================================
    // API
    // =============================================
    function getStats() {
        return {
            trustScore: state.trustScore,
            driftLevel: state.driftLevel,
            hallucinationRate: state.hallucinationRate,
            totalRequests: state.totalRequests,
            totalAttacks: state.totalAttacks,
            blockedAttacks: state.blockedAttacks,
            detectionRate: state.totalAttacks > 0
                ? (state.blockedAttacks / state.totalAttacks * 100).toFixed(1)
                : '100.0',
            activeAlerts: state.activeAlerts.length,
            criticalAlerts: state.activeAlerts.filter(a => a.severity === 'critical').length,
        };
    }

    function getMetrics(type, count) {
        const data = state.metrics[type] || [];
        return count ? data.slice(-count) : data;
    }

    function getAttackTimeline(count) {
        return count ? state.attackTimeline.slice(-count) : state.attackTimeline;
    }

    function getSystemHealth() {
        return { ...state.systemHealth };
    }

    function getActiveAlerts() {
        return [...state.activeAlerts];
    }

    function getMITRECoverage() {
        const detected = new Set(state.attackTimeline.map(a => a.mitre));
        return {
            total: MITRE_TECHNIQUES.length,
            covered: detected.size,
            percentage: ((detected.size / MITRE_TECHNIQUES.length) * 100).toFixed(0),
            techniques: MITRE_TECHNIQUES.map(t => ({
                id: t,
                covered: detected.has(t),
            })),
        };
    }

    // =============================================
    // Lifecycle
    // =============================================
    let intervals = [];

    function start() {
        // LLM metrics every 2s
        intervals.push(setInterval(generateLLMMetrics, 2000));
        // Attack attempts every 3s
        intervals.push(setInterval(maybeGenerateAttack, 3000));
        // Drift simulation every 5s
        intervals.push(setInterval(simulateDrift, 5000));
        // System health every 4s
        intervals.push(setInterval(updateSystemHealth, 4000));
        // Clean old alerts every 30s
        intervals.push(setInterval(cleanAlerts, 30000));

        // Initial data generation
        for (let i = 0; i < 60; i++) {
            generateLLMMetrics();
        }
        updateSystemHealth();

        console.log('[GASKIA-RT] Flux temps réel démarré - Cyberdéfense IA');
    }

    function stop() {
        intervals.forEach(clearInterval);
        intervals = [];
        console.log('[GASKIA-RT] Flux temps réel arrêté');
    }

    // Auto-start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    return {
        on, off,
        getStats, getMetrics, getAttackTimeline,
        getSystemHealth, getActiveAlerts, getMITRECoverage,
        start, stop,
        ATTACK_TYPES, DEFENSE_SYSTEMS, MITRE_TECHNIQUES,
    };
})();
