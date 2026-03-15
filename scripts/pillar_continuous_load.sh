#!/bin/bash
# =============================================================================
# AIOBS Continuous Load Generator for Pillars
# Generates continuous background activity: random attacks, drift, and data
# Usage: ./pillar_continuous_load.sh [interval_seconds]
# =============================================================================

BASE_URL="${AIOBS_URL:-http://localhost:8000}"
INTERVAL="${1:-10}"

echo "╔═══════════════════════════════════════════════════╗"
echo "║   AIOBS - Générateur de Charge Continue          ║"
echo "║   Intervalle: ${INTERVAL}s | Ctrl+C pour arrêter ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

ATTACK_TYPES=("injection" "adversarial" "jailbreak" "data_extraction")
SEVERITIES=("low" "medium" "high")
MODELS=("chatbot-assistant" "code-generator" "customer-support" "fraud-detection-v3")
DRIFT_TYPES=("data" "concept" "feature")
COUNTER=0

while true; do
    COUNTER=$((COUNTER + 1))
    TIMESTAMP=$(date '+%H:%M:%S')

    # Every tick: random event
    ROLL=$((RANDOM % 100))

    if [ $ROLL -lt 30 ]; then
        # 30% chance: small attack
        TYPE=${ATTACK_TYPES[$((RANDOM % ${#ATTACK_TYPES[@]}))]}
        SEV=${SEVERITIES[$((RANDOM % ${#SEVERITIES[@]}))]}
        MODEL=${MODELS[$((RANDOM % ${#MODELS[@]}))]}
        COUNT=$((RANDOM % 3 + 1))
        echo "[$TIMESTAMP] #$COUNTER 🔴 Attaque: $TYPE ($SEV) x$COUNT → $MODEL"
        curl -s -X POST "$BASE_URL/api/pillars/simulator/attack" \
          -H "Content-Type: application/json" \
          -d "{\"attack_type\": \"$TYPE\", \"severity\": \"$SEV\", \"count\": $COUNT, \"model\": \"$MODEL\"}" > /dev/null

    elif [ $ROLL -lt 45 ]; then
        # 15% chance: drift
        DTYPE=${DRIFT_TYPES[$((RANDOM % ${#DRIFT_TYPES[@]}))]}
        INTENSITY=$(echo "scale=2; ($RANDOM % 30 + 10) / 100" | bc)
        echo "[$TIMESTAMP] #$COUNTER 🟡 Drift: $DTYPE (intensité: $INTENSITY)"
        curl -s -X POST "$BASE_URL/api/pillars/simulator/drift" \
          -H "Content-Type: application/json" \
          -d "{\"drift_type\": \"$DTYPE\", \"intensity\": $INTENSITY}" > /dev/null

    elif [ $ROLL -lt 50 ]; then
        # 5% chance: latency spike
        MULT=$(echo "scale=1; ($RANDOM % 20 + 15) / 10" | bc)
        echo "[$TIMESTAMP] #$COUNTER 🟠 Latency spike: x$MULT"
        curl -s -X POST "$BASE_URL/api/pillars/simulator/latency-spike" \
          -H "Content-Type: application/json" \
          -d "{\"multiplier\": $MULT}" > /dev/null

    else
        # 50% chance: nominal operation (just check status)
        echo "[$TIMESTAMP] #$COUNTER 🟢 Nominal"
    fi

    # Every 50 ticks: show scores summary
    if [ $((COUNTER % 50)) -eq 0 ]; then
        echo ""
        echo "--- Scores à $TIMESTAMP ---"
        curl -s "$BASE_URL/api/pillars/scores" | python3 -c "
import sys, json
d = json.load(sys.stdin).get('data', {})
for k in ['reliability','security','compliance','explainability','performance']:
    v = d.get(k, 0)
    bar = '█' * int(v * 20) + '░' * (20 - int(v * 20))
    print(f'  {k:15s} {bar} {v*100:.1f}%')
print(f'  {\"GLOBAL\":15s} {\"\":20s} {d.get(\"global\",0)*100:.1f}%')
" 2>/dev/null
        echo "---"
        echo ""
    fi

    sleep $INTERVAL
done
