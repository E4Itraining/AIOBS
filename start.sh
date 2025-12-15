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
            echo -e "${RED}=============================================="
            echo "ERROR: Python 3 is not installed!"
            echo "==============================================${NC}"
            echo ""
            echo "Please install Python 3.8 or higher:"
            echo "  - Ubuntu/Debian: sudo apt install python3 python3-pip python3-venv"
            echo "  - macOS: brew install python3"
            echo "  - Windows: Download from https://www.python.org/downloads/"
            exit 1
        fi

        echo -e "${GREEN}✓${NC} Python found: $(python3 --version)"

        # Verifier venv module
        if ! python3 -c "import venv" 2>/dev/null; then
            echo -e "${RED}=============================================="
            echo "ERROR: Python venv module not available!"
            echo "==============================================${NC}"
            echo ""
            echo "Please install the venv module:"
            echo "  - Ubuntu/Debian: sudo apt install python3-venv"
            echo "  - Fedora: sudo dnf install python3-venv"
            exit 1
        fi

        # Creer un environnement virtuel si necessaire
        if [ ! -d "venv" ]; then
            echo -e "${BLUE}Creation de l'environnement virtuel...${NC}"
            python3 -m venv venv || {
                echo -e "${RED}Failed to create virtual environment!${NC}"
                echo "Please ensure python3-venv is installed."
                exit 1
            }
        fi

        # Activer l'environnement virtuel
        source venv/bin/activate || {
            echo -e "${RED}Failed to activate virtual environment!${NC}"
            echo "Try removing the venv folder and running again:"
            echo "  rm -rf venv && ./start.sh"
            exit 1
        }

        echo -e "${GREEN}✓${NC} Virtual environment activated"

        # Verifier si requirements.txt existe
        if [ ! -f "visualization/requirements.txt" ]; then
            echo -e "${YELLOW}Warning: visualization/requirements.txt not found${NC}"
            echo "Installing minimal dependencies..."
            pip install -q fastapi uvicorn pydantic
        else
            # Installer les dependances
            echo -e "${BLUE}Installation des dependances...${NC}"
            pip install -q -r visualization/requirements.txt || {
                echo -e "${RED}=============================================="
                echo "ERROR: Failed to install dependencies!"
                echo "==============================================${NC}"
                echo ""
                echo "Try installing manually:"
                echo "  source venv/bin/activate"
                echo "  pip install -r visualization/requirements.txt"
                exit 1
            }
        fi

        echo -e "${GREEN}✓${NC} Dependencies installed"

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
            echo -e "${RED}=============================================="
            echo "ERROR: Docker is not installed!"
            echo "==============================================${NC}"
            echo ""
            echo "Please install Docker:"
            echo "  - Ubuntu: https://docs.docker.com/engine/install/ubuntu/"
            echo "  - macOS: https://docs.docker.com/docker-for-mac/install/"
            echo "  - Windows: https://docs.docker.com/docker-for-windows/install/"
            exit 1
        fi

        echo -e "${GREEN}✓${NC} Docker found: $(docker --version)"

        # Verifier docker-compose
        if ! command -v docker-compose &> /dev/null; then
            echo -e "${RED}=============================================="
            echo "ERROR: docker-compose is not installed!"
            echo "==============================================${NC}"
            echo ""
            echo "Please install docker-compose:"
            echo "  - pip install docker-compose"
            echo "  - Or use: docker compose (Docker Compose V2)"
            exit 1
        fi

        echo -e "${GREEN}✓${NC} docker-compose found"

        # Verifier le fichier docker-compose
        if [ ! -f "docker-compose.simple.yml" ]; then
            echo -e "${RED}=============================================="
            echo "ERROR: docker-compose.simple.yml not found!"
            echo "==============================================${NC}"
            echo ""
            echo "Please ensure you are in the AIOBS directory."
            exit 1
        fi

        # Demarrer avec docker-compose simplifie
        echo -e "${BLUE}Demarrage des conteneurs...${NC}"
        docker-compose -f docker-compose.simple.yml up --build -d || {
            echo -e "${RED}=============================================="
            echo "ERROR: Failed to start Docker containers!"
            echo "==============================================${NC}"
            echo ""
            echo "Check the following:"
            echo "  - Docker daemon is running"
            echo "  - Port 8000 is not in use"
            echo "  - You have sufficient permissions"
            exit 1
        }

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
