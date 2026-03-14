# AI Observability Hub (AIOBS)

## A Trust Control Layer for AI Systems

AIOBS is a **system-level AI Observability Hub** that transcends classical MLOps and APM solutions by functioning as a **trust control layer** for enterprise AI systems.

---

## Vision

Modern AI systems require more than metrics and dashboards. They demand:
- **Accountability**: Traceable decisions with clear causality chains
- **Governance by Design**: Built-in compliance with AI Act and emerging regulations
- **Cognitive Awareness**: Understanding not just what systems do, but how they think
- **Operational Trust**: Contracts, SLOs, and enforceable guarantees

AIOBS delivers **end-to-end visibility, cognitive metrics, causal analysis, and governance** across the full AI lifecycle.

---

## Core Capabilities

### 1. End-to-End Visibility
Complete observability across all AI system dimensions:
- **Models**: Performance, drift, degradation, hallucination risk
- **Data**: Quality, lineage, freshness, bias indicators
- **Infrastructure**: Compute, memory, GPU utilization, scaling
- **Costs**: FinOps integration with real-time spend tracking
- **Energy**: GreenOps metrics for sustainability reporting
- **Security**: Access patterns, anomaly detection, adversarial risk

### 2. Cognitive Metrics
AI-specific observability beyond traditional metrics:
- **Drift Detection**: Data drift, concept drift, prediction drift
- **Reliability Scoring**: Model confidence calibration and stability
- **Hallucination Risk**: Output grounding and factuality indicators
- **Performance Degradation**: Trend analysis and early warning systems

### 3. Causal Analysis
Linking infrastructure, data, decisions, and outcomes:
- **Root Cause Graphs**: Automated causality chain construction
- **Impact Analysis**: Understanding downstream effects of changes
- **Human-in-Loop Tracking**: Decision attribution and accountability
- **Pipeline Lineage**: End-to-end data and model provenance

### 4. Governance by Design
Built for AI Act compliance and enterprise governance:
- **Risk Classification**: Automated AI system risk categorization
- **Audit Trails**: Immutable logging with blockchain-style hash chains
- **Compliance Evidence**: Exportable audit packs for regulators
- **Access Control**: Role-based governance with full traceability

### 5. Multi-View Dashboards
Tailored perspectives for every stakeholder:
- **ML Engineer**: Model metrics, drift, reliability
- **DevOps**: SLOs, service topology, infrastructure
- **Security SOC**: Threat detection, incidents
- **Compliance Officer**: Governance, audit trails
- **ESG Officer**: Carbon metrics, sustainability
- **Product Owner**: Feature performance, user impact
- **Executive**: Business KPIs, risk posture
- **Commandant SOC Défense**: Semantic alerts, IT/OT correlation, MITRE ICS

### 6. Defense & Sovereign Capabilities
Purpose-built modules for defense and critical infrastructure:
- **Semantic Drift Detection**: Adversarial semantic shift detection (Isolation Forest + VAE) — catches attacks that bypass statistical drift tests
- **IT/OT Connectors**: OPC-UA, Modbus, MQTT, SNMP with simulation mode
- **Air-Gap / Edge Mode**: Disconnected operation with priority buffer and differential resync
- **MITRE ATT&CK ICS**: Anomaly-to-technique mapping with 12 tactics and custom AI/OT attack patterns
- **Defense SOC Dashboard**: Semantic alerts, causal chains, IT/OT correlation, AI Act evidence export

> See [Defense Capabilities](./docs/DEFENSE_CAPABILITIES.md) and [Edge Mode](./docs/EDGE_MODE.md) for details.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AIOBS - Trust Control Layer                      │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Technical  │  │  Security   │  │Sustainability│  │  Executive  │    │
│  │  Dashboard  │  │  Dashboard  │  │  Dashboard  │  │  Dashboard  │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         └────────────────┴────────────────┴────────────────┘           │
│                                    │                                    │
│  ┌─────────────────────────────────┴─────────────────────────────────┐ │
│  │                    Unified Analytics Engine                        │ │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐      │ │
│  │  │ Cognitive │  │  Causal   │  │Governance │  │   SLO     │      │ │
│  │  │  Metrics  │  │  Analysis │  │  Engine   │  │  Monitor  │      │ │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘      │ │
│  └─────────────────────────────────┬─────────────────────────────────┘ │
│                                    │                                    │
│  ┌─────────────────────────────────┴─────────────────────────────────┐ │
│  │                       Storage Layer                                │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │ │
│  │  │ VictoriaMetrics│  │  OpenObserve   │  │     Redis      │       │ │
│  │  │   (Metrics)    │  │ (Logs/Traces)  │  │    (Cache)     │       │ │
│  │  └────────────────┘  └────────────────┘  └────────────────┘       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
aiobs/
├── src/                          # TypeScript Backend
│   ├── index.ts                  # Platform entry point & HTTP server
│   ├── core/
│   │   ├── types/                # TypeScript interfaces and schemas
│   │   │   ├── cognitive.ts      # Cognitive metrics types
│   │   │   ├── causal.ts         # Causal graph types
│   │   │   ├── governance.ts     # Governance & audit types
│   │   │   ├── slo.ts            # SLO/SLI definitions
│   │   │   └── ...               # Additional type definitions
│   │   ├── cognitive/            # Cognitive Metrics Engine
│   │   │   ├── cognitive-engine.ts
│   │   │   ├── drift-detector.ts
│   │   │   ├── semantic-drift/       # Adversarial semantic shift detection
│   │   │   ├── reliability-analyzer.ts
│   │   │   ├── hallucination-detector.ts
│   │   │   └── degradation-tracker.ts
│   │   └── causal/               # Causal Analysis Engine
│   │       ├── causal-engine.ts
│   │       ├── causal-graph.ts
│   │       ├── root-cause-analyzer.ts
│   │       └── impact-assessor.ts
│   ├── governance/               # Governance Framework
│   │   ├── audit/                # Audit logging & trails
│   │   │   ├── audit-engine.ts
│   │   │   ├── audit-trail.ts
│   │   │   └── evidence-generator.ts
│   │   └── slo/                  # SLO/SLI Management
│   │       ├── slo-monitor.ts
│   │       ├── contract-manager.ts
│   │       └── error-budget.ts
│   ├── connectors/               # IT/OT Protocol Connectors
│   │   └── ot/                   # OPC-UA, Modbus, MQTT, SNMP
│   ├── edge-mode/                # Air-Gap / Edge Deployment
│   │   ├── edge-buffer.ts        # Priority FIFO buffer
│   │   ├── resync-manager.ts     # Differential resync
│   │   └── edge-mode-config.ts   # Env-based configuration
│   ├── security/                 # Security Modules
│   │   └── mitre/                # MITRE ATT&CK ICS mapping
│   └── storage/                  # Storage Connectors
│       ├── victoriametrics-connector.ts
│       ├── openobserve-connector.ts
│       └── hybrid-backend.ts
├── visualization/                # Python FastAPI Frontend
│   ├── app.py                    # FastAPI application
│   ├── run.py                    # Development runner
│   ├── requirements.txt          # Python dependencies
│   ├── routers/                  # API endpoints
│   │   ├── dashboard.py          # Dashboard overview
│   │   ├── defense_soc.py        # Defense SOC dashboard API
│   │   ├── metrics.py            # Metrics endpoints
│   │   ├── profiles.py           # Profile management
│   │   ├── i18n.py               # Internationalization
│   │   ├── realtime.py           # WebSocket connections
│   │   └── assistant.py          # AI assistant
│   ├── core/                     # Business logic
│   │   ├── cognitive.py
│   │   ├── causal.py
│   │   ├── unified_view.py
│   │   └── impact.py
│   ├── templates/                # Jinja2 HTML templates
│   └── static/                   # CSS, JS assets
├── docs/                         # Documentation
│   ├── VISION.md                 # Platform vision
│   ├── FEATURES.md               # Features & API reference
│   ├── DEVELOPMENT.md            # Developer setup guide
│   ├── CONFIGURATION.md          # Configuration reference
│   ├── DOCKER_DEPLOYMENT.md      # Docker deployment guide
│   ├── architecture/
│   │   └── OVERVIEW.md           # Architecture details
│   ├── roadmap/
│   │   └── ROADMAP.md            # Evolution roadmap
│   └── api/
│       └── README.md             # API reference
├── docker/                       # Docker configurations
│   ├── grafana/                  # Grafana provisioning
│   └── prometheus/               # Prometheus config
├── Dockerfile.backend            # Backend container
├── Dockerfile.visualization      # Frontend container
├── docker-compose.yml            # Full-stack deployment
├── package.json                  # Node.js dependencies
├── tsconfig.json                 # TypeScript config
└── .env.example                  # Environment template
```

---

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/aiobs.git
cd aiobs

# Copy environment template
cp .env.example .env

# Start all services
docker-compose up -d

# Access the dashboard
open http://localhost:8000
```

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/your-org/aiobs.git
cd aiobs

# Backend (TypeScript)
npm install
npm run dev

# Visualization (Python) - in a new terminal
cd visualization
pip install -r requirements.txt
python run.py
```

---

## Services & Ports

| Service | Port | Description |
|---------|------|-------------|
| Visualization | 8000 | FastAPI Dashboard (main UI) |
| Backend | 3000 | TypeScript Core Platform |
| VictoriaMetrics | 8428 | Time-series metrics database |
| OpenObserve | 5080 | Logs, traces, compliance storage |
| Redis | 6379 | Caching and real-time pub/sub |
| Prometheus | 9090 | Metrics collection (optional) |
| Grafana | 3001 | Advanced visualization (optional) |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Backend** | TypeScript 5.2, Node.js 20 |
| **Frontend** | FastAPI 0.109, Python 3.11, Jinja2 |
| **Metrics DB** | VictoriaMetrics |
| **Logs/Traces** | OpenObserve |
| **Cache/Pub-Sub** | Redis 7 |
| **Visualization** | Chart.js, D3.js |
| **Containers** | Docker, Docker Compose |

---

## Documentation

- [Platform Vision](./docs/VISION.md) - Philosophy and differentiation
- [Features & API](./docs/FEATURES.md) - Game-changer features
- [Architecture Overview](./docs/architecture/OVERVIEW.md) - System design
- [Defense Capabilities](./docs/DEFENSE_CAPABILITIES.md) - Semantic drift, IT/OT, MITRE, edge mode
- [Edge Mode](./docs/EDGE_MODE.md) - Air-gap deployment guide
- [Development Guide](./docs/DEVELOPMENT.md) - Local setup and development
- [Configuration Guide](./docs/CONFIGURATION.md) - Environment and settings
- [Docker Deployment](./docs/DOCKER_DEPLOYMENT.md) - Container deployment
- [API Reference](./docs/api/README.md) - Complete API documentation
- [Evolution Roadmap](./docs/roadmap/ROADMAP.md) - Future plans

---

## Language Support

AIOBS supports 4 EU sovereign core languages:

| Language | Code |
|----------|------|
| English | en |
| French | fr |
| German | de |
| Dutch | nl |

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

MIT License - see [LICENSE](./LICENSE) for details.
