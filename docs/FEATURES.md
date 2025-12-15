# AIOBS Features & Game Changers

## Overview

AIOBS (AI Observability Hub) is a Trust Control Layer for AI Systems that provides comprehensive observability, governance, and intelligent insights for enterprise AI deployments.

---

## Game-Changer Features

### 1. Multilingual Interface

**10 Languages Supported:**
- English (en)
- French (fr)
- Spanish (es)
- German (de)
- Portuguese (pt)
- Italian (it)
- Chinese (zh)
- Japanese (ja)
- Korean (ko)
- Arabic (ar) - with full RTL support

**Features:**
- Automatic language detection from browser settings
- Cookie-based language persistence
- Query parameter override (`?lang=fr`)
- Complete UI translation including metrics, alerts, and insights
- RTL layout support for Arabic

**API Endpoints:**
```
GET  /api/i18n/languages        # List supported languages
GET  /api/i18n/translations/{lang}  # Get translations
POST /api/i18n/set-language/{lang}  # Set language preference
GET  /api/i18n/current          # Get current language
```

---

### 2. Real-time WebSocket Updates

**Live Dashboard Updates:**
- Metrics refresh every 5 seconds
- Instant alert notifications
- Cognitive metrics streaming
- Causal analysis live updates

**WebSocket Channels:**
| Channel | Description |
|---------|-------------|
| `metrics` | Real-time metric updates |
| `alerts` | Alert notifications |
| `events` | System events |
| `cognitive` | Cognitive metrics changes |
| `causal` | Causal analysis updates |
| `all` | All channels combined |

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

**API Endpoints:**
```
POST /api/assistant/query           # Natural language query
GET  /api/assistant/insights        # Automated insights
GET  /api/assistant/recommendations # AI recommendations
POST /api/assistant/explain/{metric} # Metric explanation
GET  /api/assistant/root-cause/{id} # Root cause analysis
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

**Automated Insights:**
- Anomaly detection results
- Trend analysis
- Performance recommendations
- Cost optimization opportunities
- Risk assessments

---

### 4. Docker Containerization

**Full Stack Deployment:**
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

## Core Features

### Cognitive Metrics Engine

AI-specific observability metrics beyond traditional monitoring:

| Metric | Description | Risk Level |
|--------|-------------|------------|
| **Drift Detection** | Data, concept, and prediction drift | 0-1 score |
| **Reliability** | Model trustworthiness and calibration | 0-1 score |
| **Hallucination Risk** | Factuality assessment for generative models | Low/Medium/High |
| **Degradation** | Performance trend analysis | Improving/Stable/Degrading |
| **Trust Score** | Composite trust indicator | 0-1 score |

### Causal Analysis Engine

True root cause analysis (not just correlation):

- **Causal Graph Construction** - Event-based graph building
- **Root Cause Analysis** - Backward traversal with confidence scoring
- **Impact Assessment** - Forward propagation of effects
- **Counterfactual Analysis** - "What-if" scenarios
- **Attribution Analysis** - Shapley value-based responsibility

### Multi-Profile Dashboards

7 role-specific dashboard views:

| Profile | Focus |
|---------|-------|
| ML Engineer | Model metrics, drift, reliability |
| DevOps | SLOs, service topology, infrastructure |
| Executive | Business KPIs, risk posture |
| Product Owner | Feature performance, user impact |
| Security SOC | Threat detection, incidents |
| Compliance Officer | Governance, audit trails |
| ESG Officer | Carbon metrics, sustainability |

### Governance & Compliance

- **Immutable Audit Logs** - Blockchain-style hash chains
- **AI Act Alignment** - Regulatory compliance
- **SLO/SLI Monitoring** - Service level management
- **Access Control** - Role-based governance

---

## API Reference

### REST Endpoints

```
# Dashboard
GET  /api/dashboard/overview    # Dashboard overview
GET  /api/dashboard/services    # Services status

# Profiles
GET  /api/profiles/list         # Available profiles
GET  /api/profiles/{id}         # Profile details

# Metrics
GET  /api/metrics/cognitive     # Cognitive metrics
GET  /api/metrics/services      # Service metrics

# i18n
GET  /api/i18n/languages        # Supported languages
POST /api/i18n/set-language/{lang}

# Real-time
WS   /ws                        # WebSocket connection
GET  /api/realtime/stats        # Connection statistics

# Assistant
POST /api/assistant/query       # Natural language query
GET  /api/assistant/insights    # Automated insights
GET  /api/assistant/recommendations
```

### WebSocket Protocol

```
# Connect with channels
ws://host/ws?channels=metrics,alerts

# Client messages
{"action": "subscribe", "channel": "cognitive"}
{"action": "unsubscribe", "channel": "alerts"}
{"action": "ping"}

# Server messages
{"type": "connected", "channels": [...]}
{"type": "metric_update", "data": {...}}
{"type": "alert", "data": {...}}
{"type": "pong"}
```

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | FastAPI + Jinja2, Chart.js, D3.js |
| Backend | TypeScript 5.2, Node.js 20 |
| Metrics DB | VictoriaMetrics |
| Logs/Traces | OpenObserve |
| Cache | Redis |
| Container | Docker, Docker Compose |

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
