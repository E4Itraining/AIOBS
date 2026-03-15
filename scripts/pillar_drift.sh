#!/bin/bash
# =============================================================================
# AIOBS Pillar Drift Injection Script
# Simulates model drift scenarios
# Usage: ./pillar_drift.sh [drift_type] [intensity]
# drift_type: data | concept | feature | all
# intensity: 0.1 to 1.0
# =============================================================================

BASE_URL="${AIOBS_URL:-http://localhost:8000}"
DRIFT_TYPE="${1:-concept}"
INTENSITY="${2:-0.5}"

echo "╔═══════════════════════════════════════════════════╗"
echo "║     AIOBS - Injection de Drift                   ║"
echo "╠═══════════════════════════════════════════════════╣"
echo "║ Type     : $DRIFT_TYPE"
echo "║ Intensité: $INTENSITY"
echo "║ URL      : $BASE_URL"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

echo "▶ Injection du drift..."
RESULT=$(curl -s -X POST "$BASE_URL/api/pillars/simulator/drift" \
  -H "Content-Type: application/json" \
  -d "{\"drift_type\": \"$DRIFT_TYPE\", \"intensity\": $INTENSITY}")

echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
echo ""

echo "▶ Statut actuel de la fiabilité:"
curl -s "$BASE_URL/api/pillars/reliability" | python3 -m json.tool 2>/dev/null
echo ""

echo "✓ Drift injecté. Observez la dégradation sur /pillars/reliability"
