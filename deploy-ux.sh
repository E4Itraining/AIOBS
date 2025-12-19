#!/bin/bash
# =============================================================================
# GASKIA UX Enhancements Deployment Script
# =============================================================================

echo "🚀 Déploiement des améliorations UX GASKIA..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker is available
if command -v docker-compose &> /dev/null; then
    DOCKER_CMD="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    DOCKER_CMD="docker compose"
else
    echo -e "${YELLOW}Docker non disponible. Lancement avec uvicorn...${NC}"
    cd visualization
    pip install -r requirements.txt 2>/dev/null
    echo -e "${GREEN}✓ Démarrage du serveur sur http://localhost:8000${NC}"
    echo -e "${GREEN}✓ Page Personas: http://localhost:8000/personas${NC}"
    python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
    exit 0
fi

echo "📦 Arrêt des conteneurs..."
$DOCKER_CMD down visualization 2>/dev/null

echo "🔨 Reconstruction de l'image..."
$DOCKER_CMD build visualization

echo "🚀 Démarrage..."
$DOCKER_CMD up -d

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Déploiement terminé !${NC}"
echo ""
echo -e "  📍 Dashboard:        ${YELLOW}http://localhost:8000${NC}"
echo -e "  📍 Parcours Personas: ${YELLOW}http://localhost:8000/personas${NC}"
echo ""
echo -e "  ⌨️  Raccourcis:"
echo -e "      ${YELLOW}⌘K${NC} - Command Palette"
echo -e "      ${YELLOW}I${NC}  - Quick Insights"
echo -e "      ${YELLOW}?${NC}  - Aide raccourcis"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
