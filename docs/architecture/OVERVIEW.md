# AIOBS Architecture Overview

Detailed system architecture for the AI Observability Hub.

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [System Components](#system-components)
- [Backend Architecture](#backend-architecture)
- [Visualization Architecture](#visualization-architecture)
- [Data Flow](#data-flow)
- [Storage Layer](#storage-layer)
- [Deployment Architecture](#deployment-architecture)
- [Security Architecture](#security-architecture)
- [Scalability](#scalability)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Presentation Layer                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │Technical│ │Security │ │Sustain- │ │Business │ │Executive│ │Compliance│     │
│  │Dashboard│ │Dashboard│ │ability  │ │Dashboard│ │Dashboard│ │Dashboard │     │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘      │
│       └──────────┴──────────┴──────────┴──────────┴──────────┘               │
│                                    │                                           │
│  ┌─────────────────────────────────┴─────────────────────────────────────────┐ │
│  │                    Visualization Layer (FastAPI)                           │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │ │
│  │  │  Dashboard  │  │   Metrics   │  │  Profiles   │  │    i18n     │       │ │
│  │  │   Router    │  │   Router    │  │   Router    │  │   Router    │       │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │ │
│  │  │  Assistant  │  │  Realtime   │  │   Core      │                         │ │
│  │  │   Router    │  │   (WS)      │  │   Logic     │                         │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                         │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Backend Layer (TypeScript)                          │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                         Core Platform                                     │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │   │
│  │  │    Cognitive    │  │     Causal      │  │   Governance    │          │   │
│  │  │     Engine      │  │     Engine      │  │    Framework    │          │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘          │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Storage Layer                                       │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                    │
│  │ VictoriaMetrics│  │  OpenObserve   │  │     Redis      │                    │
│  │   (Metrics)    │  │ (Logs/Traces)  │  │ (Cache/PubSub) │                    │
│  └────────────────┘  └────────────────┘  └────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## System Components

### Component Summary

| Component | Technology | Port | Purpose |
|-----------|------------|------|---------|
| Visualization | FastAPI/Python | 8000 | UI and API gateway |
| Backend | TypeScript/Node.js | 3000 | Core platform logic |
| VictoriaMetrics | Time-series DB | 8428 | Metrics storage |
| OpenObserve | Log/Trace platform | 5080 | Logs and compliance |
| Redis | In-memory cache | 6379 | Caching and pub/sub |
| Prometheus | Metrics collector | 9090 | Optional monitoring |
| Grafana | Visualization | 3001 | Optional dashboards |

---

## Backend Architecture

The TypeScript backend implements the core AIOBS platform logic.

### Directory Structure

```
src/
├── index.ts                    # Entry point & HTTP server
├── core/
│   ├── types/                  # Type definitions
│   │   ├── index.ts           # Type exports
│   │   ├── common.ts          # Common types (UUID, ISO8601, etc.)
│   │   ├── cognitive.ts       # Cognitive metrics types
│   │   ├── causal.ts          # Causal graph types
│   │   ├── governance.ts      # Governance types
│   │   ├── slo.ts             # SLO/SLI types
│   │   ├── metrics.ts         # Metrics interfaces
│   │   ├── incidents.ts       # Incident types
│   │   └── tenant.ts          # Multi-tenancy types
│   ├── cognitive/              # Cognitive Metrics Engine
│   │   ├── index.ts           # Module exports
│   │   ├── cognitive-engine.ts # Main orchestrator
│   │   ├── drift-detector.ts   # Drift detection
│   │   ├── reliability-analyzer.ts
│   │   ├── hallucination-detector.ts
│   │   └── degradation-tracker.ts
│   └── causal/                 # Causal Analysis Engine
│       ├── index.ts
│       ├── causal-engine.ts
│       ├── causal-graph.ts
│       ├── root-cause-analyzer.ts
│       └── impact-assessor.ts
├── governance/                  # Governance Framework
│   ├── audit/
│   │   ├── index.ts
│   │   ├── audit-engine.ts
│   │   ├── audit-trail.ts
│   │   └── evidence-generator.ts
│   └── slo/
│       ├── index.ts
│       ├── slo-monitor.ts
│       ├── contract-manager.ts
│       └── error-budget.ts
└── storage/                     # Storage Connectors
    ├── index.ts
    ├── types.ts
    ├── victoriametrics-connector.ts
    ├── openobserve-connector.ts
    └── hybrid-backend.ts
```

### Core Engines

#### Cognitive Metrics Engine

```typescript
// Core interface
interface CognitiveEngine {
  // Drift detection
  detectDrift(modelId: string): Promise<DriftAnalysis>;

  // Reliability analysis
  analyzeReliability(modelId: string): Promise<ReliabilityAnalysis>;

  // Hallucination detection
  detectHallucination(output: ModelOutput): Promise<HallucinationRisk>;

  // Degradation tracking
  trackDegradation(modelId: string): Promise<DegradationAnalysis>;

  // Combined trust score
  computeTrustScore(modelId: string): Promise<TrustScore>;
}
```

**Components:**
- **DriftDetector**: Monitors data, concept, and prediction drift
- **ReliabilityAnalyzer**: Assesses calibration, stability, uncertainty
- **HallucinationDetector**: Evaluates output grounding and factuality
- **DegradationTracker**: Tracks performance trends over time

#### Causal Analysis Engine

```typescript
// Core interface
interface CausalEngine {
  // Graph construction
  buildGraph(events: Event[]): CausalGraph;

  // Root cause analysis
  findRootCause(effect: Event): Promise<RootCauseAnalysis>;

  // Impact assessment
  assessImpact(cause: Event): Promise<ImpactAnalysis>;

  // Attribution
  computeAttribution(outcome: Outcome): Promise<Attribution>;
}
```

**Components:**
- **CausalGraph**: Graph data structure for causal relationships
- **RootCauseAnalyzer**: Backward traversal to find causes
- **ImpactAssessor**: Forward propagation of effects

#### Governance Framework

```typescript
// Audit interface
interface AuditEngine {
  log(entry: AuditEntry): Promise<void>;
  verify(entryId: string): Promise<VerificationResult>;
  generateEvidence(query: EvidenceQuery): Promise<EvidencePack>;
}

// SLO interface
interface SLOMonitor {
  define(slo: SLODefinition): void;
  evaluate(): Promise<SLOStatus[]>;
  getErrorBudget(sloId: string): ErrorBudget;
}
```

---

## Visualization Architecture

The FastAPI visualization layer provides the UI and API gateway.

### Directory Structure

```
visualization/
├── app.py                      # Application factory
├── run.py                      # Development runner
├── requirements.txt            # Dependencies
├── routers/                    # API endpoints
│   ├── __init__.py
│   ├── dashboard.py            # Dashboard overview
│   ├── metrics.py              # Metrics endpoints
│   ├── profiles.py             # Profile management
│   ├── i18n.py                 # Internationalization
│   ├── realtime.py             # WebSocket connections
│   └── assistant.py            # AI assistant
├── core/                       # Business logic
│   ├── __init__.py
│   ├── cognitive.py            # Cognitive metrics
│   ├── causal.py               # Causal analysis
│   ├── unified_view.py         # Unified monitoring
│   └── impact.py               # Impact analysis
├── models/                     # Data models
│   ├── __init__.py
│   └── schemas.py              # Pydantic schemas
├── i18n/                       # Internationalization
│   ├── __init__.py
│   ├── translations.py         # Translation strings
│   └── middleware.py           # Language middleware
├── templates/                  # Jinja2 templates
│   ├── base.html
│   ├── index.html
│   ├── dashboard.html
│   ├── unified.html
│   ├── causal.html
│   └── impact.html
└── static/                     # Static assets
    ├── css/
    └── js/
```

### API Routers

| Router | Prefix | Description |
|--------|--------|-------------|
| dashboard | `/api/dashboard` | Overview, services, SLOs |
| metrics | `/api/metrics` | Cognitive, time-series, causal |
| profiles | `/api/profiles` | Profile management |
| i18n | `/api/i18n` | Language support |
| realtime | `/ws` | WebSocket connections |
| assistant | `/api/assistant` | AI assistant |

### WebSocket Architecture

```python
class ConnectionManager:
    """
    WebSocket connection manager for real-time updates
    """
    channels: Dict[str, Set[WebSocket]] = {
        'metrics': set(),     # Metric updates (5s interval)
        'alerts': set(),      # Alert notifications
        'events': set(),      # System events
        'cognitive': set(),   # Cognitive updates (10s interval)
        'causal': set(),      # Causal analysis updates
        'all': set()          # All channels
    }
```

---

## Data Flow

### Real-Time Flow

```
AI System → Metrics → VictoriaMetrics → Backend → WebSocket → Dashboard
                              │
                              └→ Cognitive Engine → Trust Score
```

### Query Flow

```
User → Dashboard → Visualization API → Backend → Storage → Response
```

### Governance Flow

```
Action → Audit Engine → OpenObserve → Evidence Generator → Export
             │
             └→ Hash Chain → Verification
```

### Alert Flow

```
Metric Change → Threshold Check → Alert → WebSocket → Notification
                                    │
                                    └→ Incident Manager
```

---

## Storage Layer

### VictoriaMetrics (Time-Series)

**Purpose:** High-performance metrics storage

**Data Stored:**
- Trust scores
- Drift metrics
- Latency measurements
- Throughput metrics
- Cost metrics
- Carbon metrics

**Configuration:**
```yaml
image: victoriametrics/victoria-metrics:v1.96.0
command:
  - "--storageDataPath=/storage"
  - "--retentionPeriod=90d"
  - "--httpListenAddr=:8428"
```

### OpenObserve (Logs/Traces)

**Purpose:** Logs, traces, and compliance data

**Data Stored:**
- Audit logs
- System events
- Compliance evidence
- Trace data

**Configuration:**
```yaml
image: openobserve/openobserve:latest
environment:
  - ZO_ROOT_USER_EMAIL=admin@aiobs.local
  - ZO_ROOT_USER_PASSWORD=Complexpass#123
```

### Redis (Cache/Pub-Sub)

**Purpose:** Caching and real-time messaging

**Usage:**
- Session caching
- Metric caching
- WebSocket pub/sub
- Rate limiting

**Configuration:**
```yaml
image: redis:7-alpine
command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### Hybrid Backend

```typescript
// Storage connector abstraction
interface StorageBackend {
  metrics: VictoriaMetricsConnector;
  logs: OpenObserveConnector;
  cache: RedisConnector;

  // Query across backends
  query(params: QueryParams): Promise<QueryResult>;
}
```

---

## Deployment Architecture

### Docker Compose (Default)

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
│                                                                  │
│  Optional (monitoring profile):                                  │
│  ┌──────────────┐    ┌──────────────┐                           │
│  │  Prometheus  │    │   Grafana    │                           │
│  │   :9090      │    │   :3001      │                           │
│  └──────────────┘    └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

### Kubernetes (Planned)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    AIOBS Namespace                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │ Visualization│  │   Backend   │  │    Redis    │      │   │
│  │  │   (3 pods)  │  │  (3 pods)   │  │  (cluster)  │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐                        │   │
│  │  │VictoriaMetrics│ │ OpenObserve │                        │   │
│  │  │  (cluster)  │  │  (cluster)  │                        │   │
│  │  └─────────────┘  └─────────────┘                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────┐                                            │
│  │  Ingress/Load   │                                            │
│  │    Balancer     │                                            │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Hybrid (Edge + Core)

```
Edge Sites                          Core Cloud
┌───────────────┐                  ┌───────────────────────────┐
│ Edge Agent    │                  │     AIOBS Control Plane   │
│  - Metrics    │    ───sync───►   │                           │
│  - Alerts     │                  │  - Aggregated metrics     │
│  - Local UI   │                  │  - Central governance     │
└───────────────┘                  │  - Cross-site analytics   │
                                   └───────────────────────────┘
```

---

## Security Architecture

### Authentication (Planned)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │ ──► │   OIDC/     │ ──► │   AIOBS     │
│             │     │   SAML      │     │   API       │
└─────────────┘     └─────────────┘     └─────────────┘
```

**Supported Methods:**
- OIDC/SAML integration
- API key authentication
- JWT tokens
- Role-based access control (RBAC)

### Data Protection

| Layer | Protection |
|-------|------------|
| Transport | TLS 1.3 |
| Storage | AES-256 encryption at rest |
| Audit | Hash chain integrity |
| Secrets | External vault integration |

### Network Security

```yaml
# Docker network isolation
networks:
  aiobs-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

### Audit Trail

```typescript
interface AuditEntry {
  id: string;
  timestamp: ISO8601;
  actor: {
    id: string;
    type: 'user' | 'service' | 'system';
    attributes: Record<string, string>;
  };
  action: string;
  resource: string;
  outcome: 'success' | 'failure';
  hash: SHA256;        // Entry integrity
  previousHash: SHA256; // Chain linking
}
```

---

## Scalability

### Horizontal Scaling

| Component | Scaling Method | Notes |
|-----------|---------------|-------|
| Visualization | Replicas behind LB | Stateless |
| Backend | Replicas | Stateless |
| Redis | Sentinel/Cluster | HA mode |
| VictoriaMetrics | Cluster mode | Sharding |
| OpenObserve | Cluster mode | Distributed |

### Performance Targets

| Metric | Target |
|--------|--------|
| API Latency (p95) | < 100ms |
| Dashboard Refresh | < 5 seconds |
| WebSocket Latency | < 50ms |
| Metric Ingestion | 100k/second |

### Multi-Tenancy (Planned)

```typescript
interface TenantConfig {
  id: string;
  name: string;
  isolation: 'logical' | 'physical';
  quotas: {
    maxModels: number;
    maxMetrics: number;
    retentionDays: number;
  };
  features: string[];
}
```

---

## Integration Points

### External Systems

| Integration | Protocol | Purpose |
|-------------|----------|---------|
| Prometheus | HTTP scrape | Metric collection |
| OpenTelemetry | OTLP | Traces and metrics |
| Slack | Webhook | Alert notifications |
| PagerDuty | API | Incident management |
| Datadog | API | External monitoring |

### API Integration

```typescript
// REST API
GET  /api/dashboard/overview
GET  /api/metrics/cognitive/{model_id}
POST /api/assistant/query

// WebSocket
ws://host/ws?channels=metrics,alerts
```

---

## Future Architecture

### Planned Enhancements

1. **Kubernetes Native**: Full K8s deployment with operators
2. **Multi-Region**: Global deployment with data locality
3. **Edge Computing**: Lightweight edge agents
4. **GraphQL API**: Alternative to REST
5. **Event Sourcing**: Full event-driven architecture
6. **ML Pipeline Integration**: Native MLflow/Kubeflow support

---

## Related Documentation

- [Features](../FEATURES.md) - Detailed feature documentation
- [API Reference](../api/README.md) - Complete API documentation
- [Development Guide](../DEVELOPMENT.md) - Setup instructions
- [Configuration](../CONFIGURATION.md) - Configuration options
- [Roadmap](../roadmap/ROADMAP.md) - Future plans
