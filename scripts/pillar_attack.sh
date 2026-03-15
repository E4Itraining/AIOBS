#!/bin/bash
# =============================================================================
# AIOBS Pillar Attack Script
# Simulates security attacks against the AI platform
# Usage: ./pillar_attack.sh [attack_type] [severity] [count]
# =============================================================================

BASE_URL="${AIOBS_URL:-http://localhost:8000}"
ATTACK_TYPE="${1:-injection}"
SEVERITY="${2:-high}"
COUNT="${3:-5}"
MODEL="${4:-chatbot-assistant}"

echo "╔═══════════════════════════════════════════════════╗"
echo "║     AIOBS - Simulation d'Attaque IA              ║"
echo "╠═══════════════════════════════════════════════════╣"
echo "║ Type    : $ATTACK_TYPE"
echo "║ Sévérité: $SEVERITY"
echo "║ Nombre  : $COUNT"
echo "║ Modèle  : $MODEL"
echo "║ URL     : $BASE_URL"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# Send attack
echo "▶ Injection de l'attaque..."
RESULT=$(curl -s -X POST "$BASE_URL/api/pillars/simulator/attack" \
  -H "Content-Type: application/json" \
  -d "{\"attack_type\": \"$ATTACK_TYPE\", \"severity\": \"$SEVERITY\", \"count\": $COUNT, \"model\": \"$MODEL\"}")

echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
echo ""

# Show current status
echo "▶ Statut du simulateur:"
curl -s "$BASE_URL/api/pillars/simulator/status" | python3 -m json.tool 2>/dev/null
echo ""

echo "✓ Attaque injectée. Les dashboards se mettent à jour en temps réel."
