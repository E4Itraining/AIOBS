# AIOBS Development Guide

This guide covers setting up a local development environment for AIOBS.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Backend Development](#backend-development)
- [Visualization Development](#visualization-development)
- [Full Stack Development](#full-stack-development)
- [Development Workflows](#development-workflows)
- [Debugging](#debugging)
- [IDE Setup](#ide-setup)

---

## Prerequisites

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18.x+ | TypeScript backend runtime |
| npm | 9.x+ | Node package manager |
| Python | 3.11+ | Visualization frontend |
| pip | 23.x+ | Python package manager |
| Docker | 24.x+ | Containerization |
| Docker Compose | 2.x+ | Multi-container orchestration |
| Git | 2.x+ | Version control |

### Verify Installation

```bash
# Check versions
node --version    # Should be 18.x or higher
npm --version     # Should be 9.x or higher
python --version  # Should be 3.11 or higher
docker --version  # Should be 24.x or higher
docker compose version  # Should be 2.x or higher
```

---

## Project Structure

```
aiobs/
├── src/                          # TypeScript Backend
│   ├── index.ts                  # Entry point with HTTP server
│   ├── core/
│   │   ├── types/                # Type definitions
│   │   ├── cognitive/            # Cognitive metrics engine
│   │   └── causal/               # Causal analysis engine
│   ├── governance/
│   │   ├── audit/                # Audit engine
│   │   └── slo/                  # SLO monitoring
│   └── storage/                  # Database connectors
├── visualization/                # Python FastAPI Frontend
│   ├── app.py                    # FastAPI application
│   ├── run.py                    # Dev server runner
│   ├── routers/                  # API routes
│   ├── core/                     # Business logic
│   ├── templates/                # Jinja2 templates
│   └── static/                   # Static assets
├── docker/                       # Docker configurations
├── docs/                         # Documentation
└── tests/                        # Test files
```

---

## Backend Development

The backend is written in TypeScript and provides the core platform functionality.

### Setup

```bash
# From project root
npm install
```

### Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format

# Generate API documentation
npm run docs

# Clean build artifacts
npm run clean
```

### Project Configuration

#### tsconfig.json

Key settings:
- `strict: true` - Strict type checking enabled
- `target: ES2022` - Modern JavaScript output
- `module: NodeNext` - Node.js module resolution
- `outDir: dist` - Compiled output directory

#### package.json Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start dev server with ts-node-dev |
| `build` | Compile TypeScript to JavaScript |
| `test` | Run Jest test suite |
| `lint` | Run ESLint |
| `format` | Run Prettier |
| `docs` | Generate TypeDoc documentation |

### Backend Architecture

#### Entry Point (src/index.ts)

The main entry point:
- Exports all engines and types
- Creates HTTP server on port 3000
- Provides `/health`, `/api`, and `/` endpoints
- Factory method `createAIOBS()` for initialization

#### Core Engines

**Cognitive Engine** (`src/core/cognitive/`)
- `CognitiveEngine` - Main orchestrator
- `DriftDetector` - Detects data, concept, and prediction drift
- `ReliabilityAnalyzer` - Analyzes model reliability
- `HallucinationDetector` - Detects hallucination risk
- `DegradationTracker` - Tracks performance degradation

**Causal Engine** (`src/core/causal/`)
- `CausalEngine` - Main orchestrator
- `CausalGraph` - Graph data structure
- `RootCauseAnalyzer` - Finds root causes
- `ImpactAssessor` - Assesses downstream impact

#### Governance

**Audit** (`src/governance/audit/`)
- `AuditEngine` - Immutable audit logging
- `AuditTrail` - Trail management
- `EvidenceGenerator` - Compliance evidence

**SLO** (`src/governance/slo/`)
- `SLOMonitor` - SLO monitoring
- `ContractManager` - Contract lifecycle
- `ErrorBudget` - Error budget tracking

---

## Visualization Development

The visualization layer is a Python FastAPI application.

### Setup

```bash
cd visualization

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Development Commands

```bash
# Start development server
python run.py

# Or with uvicorn directly
uvicorn app:create_app --factory --reload --host 0.0.0.0 --port 8000
```

### Project Structure

```
visualization/
├── app.py              # FastAPI application factory
├── run.py              # Development runner
├── requirements.txt    # Python dependencies
├── routers/            # API endpoints
│   ├── dashboard.py    # Dashboard routes
│   ├── metrics.py      # Metrics routes
│   ├── profiles.py     # Profile routes
│   ├── i18n.py         # i18n routes
│   ├── realtime.py     # WebSocket routes
│   └── assistant.py    # AI assistant routes
├── core/               # Business logic
│   ├── cognitive.py    # Cognitive metrics
│   ├── causal.py       # Causal analysis
│   ├── unified_view.py # Unified monitoring
│   └── impact.py       # Impact analysis
├── models/             # Pydantic models
│   └── schemas.py      # Request/response schemas
├── i18n/               # Internationalization
│   └── translations.py # Translation strings
├── templates/          # Jinja2 HTML templates
│   ├── base.html       # Base template
│   ├── index.html      # Landing page
│   ├── dashboard.html  # Dashboard view
│   ├── unified.html    # Unified view
│   └── causal.html     # Causal analysis view
└── static/             # Static assets
    ├── css/            # Stylesheets
    └── js/             # JavaScript
```

### Key Components

#### Application Factory (`app.py`)

```python
def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="AIOBS Visualization",
        description="AI Observability Hub Dashboard"
    )
    # Register routers, middleware, lifecycle
    return app
```

#### Routers

| Router | Path Prefix | Description |
|--------|-------------|-------------|
| dashboard | `/api/dashboard` | Overview and service status |
| metrics | `/api/metrics` | Cognitive and service metrics |
| profiles | `/api/profiles` | Profile management |
| i18n | `/api/i18n` | Language management |
| realtime | `/ws` | WebSocket connections |
| assistant | `/api/assistant` | AI assistant queries |

---

## Full Stack Development

### Using Docker Compose

```bash
# Start all services
cp .env.example .env
docker-compose up -d

# View logs
docker-compose logs -f

# Rebuild after changes
docker-compose up -d --build

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Docker Network                           │
│                       (aiobs-network)                            │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ Visualization│    │   Backend    │    │    Redis     │       │
│  │   (FastAPI)  │◄──►│ (TypeScript) │◄──►│   (Cache)    │       │
│  │   :8000      │    │   :3000      │    │   :6379      │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                                    │
│         ▼                   ▼                                    │
│  ┌──────────────┐    ┌──────────────┐                           │
│  │VictoriaMetrics│   │ OpenObserve  │                           │
│  │   (Metrics)  │    │(Logs/Traces) │                           │
│  │   :8428      │    │   :5080      │                           │
│  └──────────────┘    └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

### Access Points

| Service | URL |
|---------|-----|
| AIOBS Dashboard | http://localhost:8000 |
| API Documentation | http://localhost:8000/api/docs |
| Backend API | http://localhost:3000/api |
| VictoriaMetrics UI | http://localhost:8428/vmui |
| OpenObserve UI | http://localhost:5080 |

---

## Development Workflows

### Adding a New Feature

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement backend logic** (if needed)
   - Add types in `src/core/types/`
   - Implement engine in `src/core/`
   - Add tests

3. **Implement visualization** (if needed)
   - Add routes in `visualization/routers/`
   - Add business logic in `visualization/core/`
   - Update templates if needed

4. **Test thoroughly**
   ```bash
   npm test
   npm run lint
   ```

5. **Submit pull request**

### Adding a New API Endpoint

1. **Backend (TypeScript)**
   ```typescript
   // src/index.ts or dedicated router
   app.get('/api/your-endpoint', (req, res) => {
     // Implementation
   });
   ```

2. **Visualization (Python)**
   ```python
   # visualization/routers/your_router.py
   @router.get("/your-endpoint")
   async def get_your_data():
       return {"data": "value"}
   ```

### Adding Translations

1. Edit `visualization/i18n/translations.py`
2. Add keys for all 10 supported languages
3. Use in templates: `{{ t('your_key') }}`

---

## Debugging

### Backend Debugging

**VS Code launch.json:**
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/ts-node-dev",
  "args": ["${workspaceFolder}/src/index.ts"],
  "cwd": "${workspaceFolder}",
  "console": "integratedTerminal"
}
```

**Console logging:**
```typescript
console.log('Debug:', JSON.stringify(data, null, 2));
```

### Visualization Debugging

**VS Code launch.json:**
```json
{
  "type": "python",
  "request": "launch",
  "name": "Debug Visualization",
  "module": "uvicorn",
  "args": ["app:create_app", "--factory", "--reload"],
  "cwd": "${workspaceFolder}/visualization"
}
```

**Python logging:**
```python
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
logger.debug("Debug message: %s", data)
```

### Docker Debugging

```bash
# View container logs
docker-compose logs -f [service_name]

# Execute shell in container
docker-compose exec visualization /bin/sh
docker-compose exec backend /bin/sh

# Check container health
docker-compose ps
```

---

## IDE Setup

### VS Code

**Recommended Extensions:**
- ESLint
- Prettier
- TypeScript + JavaScript Grammar
- Python
- Pylance
- Docker
- YAML

**Settings (`.vscode/settings.json`):**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "python.analysis.typeCheckingMode": "basic"
}
```

### JetBrains (WebStorm/PyCharm)

- Enable TypeScript service
- Configure ESLint integration
- Set up Python interpreter for visualization
- Configure Docker integration

---

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find process using port
lsof -i :8000
lsof -i :3000

# Kill process
kill -9 <PID>
```

**Docker container won't start:**
```bash
# Check logs
docker-compose logs [service_name]

# Reset everything
docker-compose down -v
docker system prune -f
docker-compose up -d --build
```

**TypeScript compilation errors:**
```bash
# Clean and rebuild
npm run clean
npm run build
```

**Python import errors:**
```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

---

## Next Steps

- Read the [Architecture Overview](./architecture/OVERVIEW.md)
- Explore the [API Reference](./api/README.md)
- Check the [Configuration Guide](./CONFIGURATION.md)
- Review [Contributing Guidelines](../CONTRIBUTING.md)
