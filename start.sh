#!/bin/bash
# =============================================================================
# AIOBS - Script de demarrage simplifie
# =============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "  █████╗ ██╗ ██████╗ ██████╗ ███████╗"
echo " ██╔══██╗██║██╔═══██╗██╔══██╗██╔════╝"
echo " ███████║██║██║   ██║██████╔╝███████╗"
echo " ██╔══██║██║██║   ██║██╔══██╗╚════██║"
echo " ██║  ██║██║╚██████╔╝██████╔╝███████║"
echo " ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═════╝ ╚══════╝"
echo -e "${NC}"
echo "AI Observability Hub - Version Simplifiee"
echo ""

# Verifier si on est dans le bon repertoire
if [ ! -f "visualization/app.py" ]; then
    echo -e "${RED}Erreur: Executez ce script depuis le repertoire AIOBS${NC}"
    exit 1
fi

# Mode de demarrage
MODE="${1:-standalone}"

case "$MODE" in
    "standalone"|"local")
        echo -e "${YELLOW}Mode: Standalone (Python uniquement)${NC}"
        echo ""

        # Verifier Python
        if ! command -v python3 &> /dev/null; then
            echo -e "${RED}Erreur: Python 3 n'est pas installe${NC}"
            exit 1
        fi

        # Creer un environnement virtuel si necessaire
        if [ ! -d "venv" ]; then
            echo -e "${BLUE}Creation de l'environnement virtuel...${NC}"
            python3 -m venv venv
        fi

        # Activer l'environnement virtuel
        source venv/bin/activate

        # Installer les dependances
        echo -e "${BLUE}Installation des dependances...${NC}"
        pip install -q -r visualization/requirements.txt

        # Configuration pour le mode standalone
        export AIOBS_DEV_MODE=true
        export VICTORIA_METRICS_URL=http://localhost:8428
        export OPENOBSERVE_URL=http://localhost:5080
        export REDIS_URL=redis://localhost:6379
        export DEFAULT_LANGUAGE=fr

        echo ""
        echo -e "${GREEN}Demarrage de AIOBS...${NC}"
        echo -e "${BLUE}Dashboard: http://localhost:8000${NC}"
        echo -e "${BLUE}API Docs:  http://localhost:8000/api/docs${NC}"
        echo ""

        # Demarrer l'application
        python -m uvicorn visualization.app:app --host 0.0.0.0 --port 8000 --reload
        ;;

    "docker")
        echo -e "${YELLOW}Mode: Docker Simplifie${NC}"
        echo ""

        # Verifier Docker
        if ! command -v docker &> /dev/null; then
            echo -e "${RED}Erreur: Docker n'est pas installe${NC}"
            exit 1
        fi

        # Demarrer avec docker-compose simplifie
        echo -e "${BLUE}Demarrage des conteneurs...${NC}"
        docker-compose -f docker-compose.simple.yml up --build -d

        echo ""
        echo -e "${GREEN}AIOBS demarre!${NC}"
        echo -e "${BLUE}Dashboard:        http://localhost:8000${NC}"
        echo -e "${BLUE}API Docs:         http://localhost:8000/api/docs${NC}"
        echo -e "${BLUE}VictoriaMetrics:  http://localhost:8428${NC}"
        echo ""
        echo "Pour voir les logs: docker-compose -f docker-compose.simple.yml logs -f"
        echo "Pour arreter:       docker-compose -f docker-compose.simple.yml down"
        ;;

    "stop")
        echo -e "${YELLOW}Arret de AIOBS...${NC}"
        docker-compose -f docker-compose.simple.yml down
        echo -e "${GREEN}Arrete.${NC}"
        ;;

    *)
        echo "Usage: $0 [standalone|docker|stop]"
        echo ""
        echo "  standalone  - Demarre en mode Python local (par defaut)"
        echo "  docker      - Demarre avec Docker"
        echo "  stop        - Arrete les conteneurs Docker"
        exit 1
        ;;
esac
