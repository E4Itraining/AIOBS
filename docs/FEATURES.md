# AIOBS Features

Comprehensive overview of AIOBS capabilities and game-changing features.

## Table of Contents

- [Core Capabilities](#core-capabilities)
- [Game-Changer Features](#game-changer-features)
- [Defense & Sovereign Capabilities](#defense--sovereign-capabilities)
- [Cognitive Metrics Engine](#cognitive-metrics-engine)
- [Causal Analysis Engine](#causal-analysis-engine)
- [Governance Framework](#governance-framework)
- [Multi-Profile Dashboards](#multi-profile-dashboards)
- [Technology Stack](#technology-stack)

---

## Core Capabilities

### End-to-End Visibility

AIOBS provides unified observability across all AI system dimensions:

| Dimension | Metrics | Insights |
|-----------|---------|----------|
| **Models** | Accuracy, latency, throughput | Drift, hallucination risk, reliability |
| **Data** | Volume, freshness, completeness | Quality, bias, lineage |
| **Infrastructure** | CPU, GPU, memory, network | Efficiency, bottlenecks, scaling |
| **Costs** | Compute, storage, API calls | Optimization opportunities, trends |
| **Energy** | Power consumption, carbon | Sustainability score, efficiency |
| **Security** | Access, anomalies, threats | Risk score, compliance gaps |

### Trust Score

A composite metric measuring overall AI system trustworthiness:

```
Trust Score = f(Drift, Reliability, Hallucination, Degradation)
```

**Score Interpretation:**
- **0.8-1.0**: Healthy - System operating within expected parameters
- **0.6-0.8**: Warning - Some indicators require attention
- **0.0-0.6**: Critical - Immediate action required

---

## Game-Changer Features

### 1. Multilingual Interface

**10 Languages Supported:**

| Language | Code | Native | RTL Support |
|----------|------|--------|-------------|
| English | en | English | - |
| French | fr | Français | - |
| Spanish | es | Español | - |
| German | de | Deutsch | - |
| Portuguese | pt | Português | - |
| Italian | it | Italiano | - |
| Chinese | zh | 中文 | - |
| Japanese | ja | 日本語 | - |
| Korean | ko | 한국어 | - |
| Arabic | ar | العربية | Full RTL |

**Features:**
- Automatic language detection from browser settings
- Cookie-based language persistence
- Query parameter override (`?lang=fr`)
- Complete UI translation including metrics, alerts, and insights
- Full RTL layout support for Arabic

**API Endpoints:**
```
GET  /api/i18n/languages           # List supported languages
GET  /api/i18n/translations/{lang} # Get translations
POST /api/i18n/set-language/{lang} # Set language preference
GET  /api/i18n/current             # Get current language
```

---

### 2. Real-time WebSocket Updates

**Live Dashboard Updates:**
- Metrics refresh every 5 seconds
- Instant alert notifications
- Cognitive metrics streaming (every 10 seconds)
- Causal analysis live updates

**WebSocket Channels:**

| Channel | Description | Update Frequency |
|---------|-------------|------------------|
| `metrics` | Real-time metric updates | 5 seconds |
| `alerts` | Alert notifications | Event-driven |
| `events` | System events | Event-driven |
| `cognitive` | Cognitive metrics changes | 10 seconds |
| `causal` | Causal analysis updates | On-demand |
| `all` | All channels combined | Combined |

**Connection Example:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws?channels=metrics,alerts');

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Update:', data);
};

// Subscribe to additional channel
ws.send(JSON.stringify({ action: 'subscribe', channel: 'cognitive' }));
```

**Message Types:**
```json
// Metric update
{
    "type": "metric_update",
    "channel": "metrics",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
        "trust_score": 0.87,
        "daily_inferences": 1500000,
        "daily_cost": 1250.50,
        "carbon_kg": 15.2
    }
}

// Alert notification
{
    "type": "alert",
    "channel": "alerts",
    "timestamp": "2024-01-15T10:30:05Z",
    "data": {
        "id": "alert-1234",
        "alert_type": "drift",
        "severity": "warning",
        "message": "Data drift detected in feature X",
        "service": "recommendation-model"
    }
}
```

---

### 3. AI Assistant Integration

**Natural Language Queries:**
- Ask questions about your AI system in plain language
- Get intelligent insights and recommendations
- Receive root cause analysis for incidents
- Understand complex metrics with explanations

**Capabilities:**
- Explain metrics and their meanings
- Analyze trends and anomalies
- Suggest root causes for issues
- Recommend remediation actions
- Answer questions about system health

**API Endpoints:**
```
POST /api/assistant/query            # Natural language query
GET  /api/assistant/insights         # Automated insights
GET  /api/assistant/recommendations  # AI recommendations
POST /api/assistant/explain/{metric} # Metric explanation
GET  /api/assistant/root-cause/{id}  # Root cause analysis
```

**Query Examples:**
```json
// Request
POST /api/assistant/query
{
    "query": "Why did the trust score drop?",
    "language": "en"
}

// Response
{
    "answer": "The Trust Score dropped due to increased drift in input data...",
    "insights": [
        {
            "type": "anomaly",
            "title": "Data Drift Detected",
            "description": "Feature distribution shift in input data",
            "severity": "warning"
        }
    ],
    "suggested_actions": [
        "Investigate data source changes",
        "Review feature distributions",
        "Consider model retraining"
    ],
    "related_metrics": ["drift", "reliability", "prediction_accuracy"],
    "confidence": 0.88
}
```

---

### 4. Full-Stack Docker Deployment

**One-Command Deployment:**
```bash
docker-compose up -d
```

**Included Services:**
- AIOBS Visualization (FastAPI)
- AIOBS Backend (TypeScript)
- VictoriaMetrics (Time-series DB)
- OpenObserve (Logs/Traces)
- Redis (Caching/Pub-Sub)
- Optional: Prometheus, Grafana

**Features:**
- Multi-stage builds for minimal image size
- Non-root user security
- Health checks for all services
- Volume persistence
- Configurable via environment variables
- Production-ready with Traefik labels

---

## Cognitive Metrics Engine

AI-specific observability metrics beyond traditional monitoring.

### Drift Detection

| Metric | Description | Score Range |
|--------|-------------|-------------|
| **Data Drift** | Input distribution shift | 0-1 (lower is better) |
| **Concept Drift** | Relationship shift between inputs and outputs | 0-1 (lower is better) |
| **Prediction Drift** | Output distribution shift | 0-1 (lower is better) |

**Thresholds:**
- Good: < 0.1
- Warning: 0.1 - 0.3
- Critical: > 0.3

### Reliability Analysis

| Metric | Description | Score Range |
|--------|-------------|-------------|
| **Calibration** | Prediction confidence accuracy | 0-1 (higher is better) |
| **Stability** | Output consistency over time | 0-1 (higher is better) |
| **Uncertainty** | Proper uncertainty quantification | 0-1 (higher is better) |
| **OOD Detection** | Out-of-distribution detection capability | 0-1 (higher is better) |

### Hallucination Detection

For generative models:

| Metric | Description | Values |
|--------|-------------|--------|
| **Risk Level** | Overall hallucination risk | Low / Medium / High |
| **Grounding Score** | Output grounding to source data | 0-1 (higher is better) |
| **Factuality Index** | Factual accuracy of outputs | 0-1 (higher is better) |

### Degradation Tracking

| Metric | Description | Values |
|--------|-------------|--------|
| **Trend** | Performance trend direction | Improving / Stable / Degrading |
| **Rate of Change** | Speed of degradation | Percentage per period |
| **Projected Impact** | Estimated future impact | Minimal / Moderate / Severe |

---

## Causal Analysis Engine

True root cause analysis beyond correlation.

### Capabilities

- **Causal Graph Construction** - Event-based graph building
- **Root Cause Analysis** - Backward traversal with confidence scoring
- **Impact Assessment** - Forward propagation of effects
- **Counterfactual Analysis** - "What-if" scenarios (roadmap)
- **Attribution Analysis** - Shapley value-based responsibility (roadmap)

### Causal Graph Structure

```typescript
interface CausalGraph {
  nodes: CausalNode[];      // Events, changes, metrics
  edges: CausalEdge[];      // Cause-effect relationships
}

interface CausalNode {
  id: string;
  type: 'event' | 'metric' | 'decision' | 'outcome';
  name: string;
  description: string;
  impact_score: number;     // 0-1 impact magnitude
}

interface CausalEdge {
  source_id: string;
  target_id: string;
  type: 'causes' | 'correlates' | 'contributes';
  weight: number;           // Relationship strength
  confidence: number;       // Analysis confidence
}
```

### Analysis Scenarios

- **drift_incident** - Causal chains for drift-related issues
- **cost_spike** - Cost anomaly causality
- **latency_degradation** - Performance issue analysis
- **generic** - General causal exploration

---

## Governance Framework

### Audit Engine

Immutable audit logging with blockchain-style hash chains:

```typescript
interface AuditEntry {
  id: string;
  timestamp: ISO8601;
  actor: ActorIdentity;
  action: AuditableAction;
  resource: Resource;
  context: ExecutionContext;
  outcome: ActionOutcome;
  hash: SHA256;           // Entry integrity
  previousHash: SHA256;   // Chain linking
}
```

**Features:**
- Tamper-evident logging
- Cryptographic chain verification
- Compliance evidence generation
- Actor attribution tracking

### SLO/SLI Monitoring

Service Level Objectives for AI systems:

| Dimension | Example SLIs | Example Target |
|-----------|--------------|----------------|
| **Availability** | Uptime, success rate | 99.9% |
| **Latency** | p50, p95, p99 | p99 < 200ms |
| **Drift** | Data drift score | < 0.3 |
| **Reliability** | Trust score | > 0.8 |
| **Energy** | kWh per 1000 requests | < 0.01 |
| **Cost** | Cost per inference | < $0.001 |

### Error Budget Management

- Real-time error budget tracking
- Burn rate calculations
- Budget depletion alerts
- Policy enforcement on budget exhaustion

---

## Multi-Profile Dashboards

7 role-specific dashboard views with tailored widgets.

### Available Profiles

| Profile | Primary Focus | Key Widgets |
|---------|---------------|-------------|
| **ML Engineer** | Model metrics, drift, reliability | Trust gauge, drift chart, reliability radar |
| **DevOps** | SLOs, service topology, infrastructure | SLO cards, topology graph, latency trends |
| **Executive** | Business KPIs, risk posture | KPI row, cost breakdown, impact summary |
| **Product Owner** | Feature performance, user impact | Model cards, user impact chart |
| **Security SOC** | Threats, incidents, access | Security score, threat timeline |
| **Compliance** | Governance, audit trails | Compliance grid, audit findings |
| **ESG** | Carbon, energy, sustainability | Carbon metrics, green recommendations |

### Profile-Based Navigation

Each profile has customized navigation:

**ML Engineer:**
- Models, Drift Detection, Reliability, Experiments, Causal Analysis

**DevOps:**
- Services, SLO/SLI, Topology, Alerts, Logs

**Executive:**
- Overview, Business Impact, Costs, Reports

### Widget Types

| Widget | Description |
|--------|-------------|
| `gauge` | Single value with thresholds |
| `line_chart` | Time-series data |
| `bar_chart` | Categorical comparisons |
| `pie_chart` / `donut_chart` | Proportions |
| `radar_chart` | Multi-dimensional comparison |
| `table` | Tabular data with sorting/filtering |
| `topology` | Service dependency graph |
| `kpi_row` | Multiple KPI cards |
| `timeline` | Event sequence |

---

## Defense & Sovereign Capabilities

Purpose-built modules for defense, critical infrastructure, and sovereign deployment.

### Semantic Drift Detection (Differentiating Feature)

Detects adversarial semantic shifts where AI outputs remain statistically normal but operational meaning has shifted — the critical gap that existing MLOps tools miss.

- **Isolation Forest** + **VAE** dual-detection pipeline
- 6 semantic shift types: meaning inversion, context displacement, confidence manipulation, boundary erosion, label semantic drift, operational decorrelation
- Stealth attack detection (normal stats + shifted meaning)
- Full AI Act evidence chain traceability

> See [DEFENSE_CAPABILITIES.md](./DEFENSE_CAPABILITIES.md) for technical details.

### IT/OT Protocol Connectors

Four industrial protocol connectors with abstract base class and simulation mode:

| Protocol | Use Case |
|----------|----------|
| OPC-UA | SCADA, PLC, DCS |
| Modbus TCP/RTU | Motor controllers, sensors |
| MQTT 3.1.1/5.0 | IoT sensors, edge devices |
| SNMP v2c/v3 | Network infrastructure |

> See [OT_CONNECTORS.md](./OT_CONNECTORS.md) for configuration and usage.

### Air-Gap / Edge Mode

Fully disconnected operation with priority-based buffer and differential resync:
- Priority levels: critical > high > medium > low
- Configurable via environment variables (no Docker required)
- Automatic resync on connectivity restoration

> See [EDGE_MODE.md](./EDGE_MODE.md) for deployment guide.

### MITRE ATT&CK for ICS

Local database mapping anomalies to ICS attack techniques:
- 12 ICS tactics, 10+ techniques
- 6 custom AI/OT attack patterns (AIOBS-AP-001 through AIOBS-AP-006)
- Kill chain positioning and threat response recommendations

> See [MITRE_ATTACK_ICS.md](./MITRE_ATTACK_ICS.md) for technique coverage.

### Defense SOC Dashboard

Dedicated **Commandant SOC Défense** profile at `/defense-soc`:
- Semantic alerts feed (not classical MLOps metrics)
- Causal inference chains (attack → drift → alert)
- IT/OT real-time correlation
- MITRE ATT&CK ICS matrix visualization
- Edge node status monitoring
- AI Act evidence export (JSON + PDF)

---

## Technology Stack

### Backend

| Component | Technology | Version |
|-----------|------------|---------|
| Language | TypeScript | 5.2 |
| Runtime | Node.js | 20.x |
| Build | tsc | - |
| Testing | Jest | 29.x |
| Code Quality | ESLint, Prettier | Latest |
| Documentation | TypeDoc | 0.25.x |

### Frontend (Visualization)

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | FastAPI | 0.109.x |
| Server | Uvicorn | 0.27.x |
| Templates | Jinja2 | 3.1.x |
| WebSockets | websockets | 12.x |
| Real-time | Redis (async) | 5.x |
| Validation | Pydantic | 2.5.x |
| Telemetry | OpenTelemetry | Latest |

### Data & Observability

| Component | Technology | Version |
|-----------|------------|---------|
| Metrics DB | VictoriaMetrics | 1.96.x |
| Logs/Traces | OpenObserve | Latest |
| Cache/Pub-Sub | Redis | 7.x |
| Optional: Metrics | Prometheus | 2.48.x |
| Optional: Viz | Grafana | 10.2.x |

### Visualization Libraries

| Library | Purpose |
|---------|---------|
| Chart.js | Charts and graphs |
| D3.js | Complex visualizations |
| Cytoscape.js | Network graphs (planned) |

### Deployment

| Component | Technology |
|-----------|------------|
| Containers | Docker (multi-stage builds) |
| Orchestration | Docker Compose |
| Reverse Proxy | Traefik (optional) |
| Security | Non-root users, health checks |

---

## Feature Comparison

### AIOBS vs Traditional Solutions

| Capability | Traditional APM | MLOps Tools | AIOBS |
|------------|----------------|-------------|-------|
| Infrastructure Metrics | Yes | Partial | Yes |
| Model Performance | No | Yes | Yes |
| Drift Detection | No | Basic | Advanced |
| Hallucination Detection | No | No | Yes |
| Causal Analysis | No | No | Yes |
| Multi-Stakeholder Views | No | No | Yes |
| Governance by Design | No | No | Yes |
| AI Act Compliance | No | Partial | Yes |
| Real-time Updates | Yes | Partial | Yes |
| Semantic Drift Detection | No | No | Yes |
| IT/OT Convergence | No | No | Yes |
| MITRE ATT&CK ICS | No | No | Yes |
| Air-Gap Deployment | No | No | Yes |
| Multilingual UI | Rare | No | 4 EU Languages |

---

## Getting Started

### Development

```bash
# Backend (TypeScript)
npm install
npm run dev

# Visualization (Python)
cd visualization
pip install -r requirements.txt
python run.py
```

### Production (Docker)

```bash
cp .env.example .env
docker-compose up -d
```

Access the dashboard at http://localhost:8000

---

## Documentation Links

- [API Reference](./api/README.md) - Complete endpoint documentation
- [Architecture Overview](./architecture/OVERVIEW.md) - System design
- [Defense Capabilities](./DEFENSE_CAPABILITIES.md) - Semantic drift, MITRE, IT/OT, edge mode
- [OT Connectors](./OT_CONNECTORS.md) - Protocol connector guide
- [MITRE ATT&CK ICS](./MITRE_ATTACK_ICS.md) - Technique mapping
- [Edge Mode](./EDGE_MODE.md) - Air-gap deployment
- [Development Guide](./DEVELOPMENT.md) - Local setup
- [Configuration Guide](./CONFIGURATION.md) - Settings and options
- [Docker Deployment](./DOCKER_DEPLOYMENT.md) - Container deployment
- [Evolution Roadmap](./roadmap/ROADMAP.md) - Future plans
