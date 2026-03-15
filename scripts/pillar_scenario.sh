#!/bin/bash
# =============================================================================
# AIOBS Pillar Full Scenario Script
# Runs a complete 5-minute demo scenario with progressive degradation
# Usage: ./pillar_scenario.sh
# =============================================================================

BASE_URL="${AIOBS_URL:-http://localhost:8000}"

echo "╔═══════════════════════════════════════════════════╗"
echo "║   AIOBS - Scénario de Démonstration Complet      ║"
echo "║   Durée estimée: ~3 minutes                      ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# Phase 0: Reset
echo "═══ Phase 0: Reset du simulateur ═══"
curl -s -X POST "$BASE_URL/api/pillars/simulator/reset" | python3 -m json.tool 2>/dev/null
echo "✓ Baseline rétablie"
echo ""
sleep 3

# Phase 1: Baseline observation
echo "═══ Phase 1: Observation baseline (10s) ═══"
echo "→ Tous les scores sont nominaux..."
curl -s "$BASE_URL/api/pillars/scores" | python3 -m json.tool 2>/dev/null
sleep 10

# Phase 2: Concept drift begins
echo ""
echo "═══ Phase 2: Début de concept drift ═══"
echo "→ Le modèle recommendation-engine commence à dériver..."
curl -s -X POST "$BASE_URL/api/pillars/simulator/drift" \
  -H "Content-Type: application/json" \
  -d '{"drift_type": "concept", "intensity": 0.3}' | python3 -m json.tool 2>/dev/null
sleep 15

# Phase 3: Security attack wave
echo ""
echo "═══ Phase 3: Vague d'attaques par injection ═══"
echo "→ 10 tentatives de prompt injection..."
curl -s -X POST "$BASE_URL/api/pillars/simulator/attack" \
  -H "Content-Type: application/json" \
  -d '{"attack_type": "injection", "severity": "high", "count": 10, "model": "chatbot-assistant"}' | python3 -m json.tool 2>/dev/null
sleep 5

echo "→ 3 tentatives de jailbreak..."
curl -s -X POST "$BASE_URL/api/pillars/simulator/attack" \
  -H "Content-Type: application/json" \
  -d '{"attack_type": "jailbreak", "severity": "critical", "count": 3, "model": "code-generator"}' | python3 -m json.tool 2>/dev/null
sleep 10

# Phase 4: Latency spike
echo ""
echo "═══ Phase 4: Pic de latence (×3) ═══"
echo "→ Surcharge infrastructure détectée..."
curl -s -X POST "$BASE_URL/api/pillars/simulator/latency-spike" \
  -H "Content-Type: application/json" \
  -d '{"multiplier": 3.0}' | python3 -m json.tool 2>/dev/null
sleep 15

# Phase 5: Drift intensifies
echo ""
echo "═══ Phase 5: Drift s'aggrave ═══"
echo "→ Data drift + concept drift simultanés..."
curl -s -X POST "$BASE_URL/api/pillars/simulator/drift" \
  -H "Content-Type: application/json" \
  -d '{"drift_type": "all", "intensity": 0.7}' | python3 -m json.tool 2>/dev/null
sleep 15

# Phase 6: Combined attack
echo ""
echo "═══ Phase 6: Attaque combinée ═══"
echo "→ Extraction de données + adversarial..."
curl -s -X POST "$BASE_URL/api/pillars/simulator/attack" \
  -H "Content-Type: application/json" \
  -d '{"attack_type": "data_extraction", "severity": "critical", "count": 5}' | python3 -m json.tool 2>/dev/null
curl -s -X POST "$BASE_URL/api/pillars/simulator/attack" \
  -H "Content-Type: application/json" \
  -d '{"attack_type": "adversarial", "severity": "high", "count": 8}' | python3 -m json.tool 2>/dev/null
sleep 15

# Phase 7: Show degraded state
echo ""
echo "═══ Phase 7: État dégradé ═══"
echo "→ Scores après les attaques et le drift:"
curl -s "$BASE_URL/api/pillars/scores" | python3 -m json.tool 2>/dev/null
echo ""
echo "→ Statut du simulateur:"
curl -s "$BASE_URL/api/pillars/simulator/status" | python3 -m json.tool 2>/dev/null

# Phase 8: Recovery
echo ""
echo "═══ Phase 8: Remédiation ═══"
echo "→ Reset pour rétablir la baseline..."
sleep 10
curl -s -X POST "$BASE_URL/api/pillars/simulator/reset" | python3 -m json.tool 2>/dev/null

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║   ✓ Scénario terminé                             ║"
echo "║   Les dashboards montrent la récupération        ║"
echo "╚═══════════════════════════════════════════════════╝"
