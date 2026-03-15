# Skophia — Sovereign AI Cybersecurity Platform

**Open-source, on-premise, air-gap capable. Zero US cloud dependency.**

Skophia is a sovereign AI cybersecurity platform purpose-built for defense environments (Cyber Defense Factory / COMCYBER) and critical infrastructure operators (OIV). It detects threats that conventional SIEM and EDR tools miss — including adversarial semantic drift, where AI models are compromised while maintaining statistically normal behavior.

**NIS2-native. AI Act-compliant. 100% open source.**

---

## Three Pillars

### Skophia — AI Governance & Telemetry

OpenTelemetry-native collection layer with sovereign storage. Ingests inference streams, model metrics, and operational telemetry into VictoriaMetrics (time-series) and OpenObserve (logs/traces/audit). Provides the data foundation for all detection and compliance workflows.

- Unified OTel ingestion pipeline (OTLP)
- VictoriaMetrics + OpenObserve storage backend
- Cognitive metrics: drift, reliability, hallucination risk, degradation
- Causal analysis: root cause graphs, impact assessment
- Full audit trail with hash-chain integrity

### Synapsix — Post-Deployment AI Threat Detection

The core innovation. Detects when an AI model's *operational meaning* shifts — even when statistical metrics remain normal. A TRM agent deployed on an OPC-UA controller could be compromised to modify setpoints while maintaining statistically valid responses. EDR sees nothing. Synapsix detects it.

- **Semantic Drift Detection**: Isolation Forest + VAE latent space analysis on inference streams
- **MITRE ATT&CK ICS Correlation**: Maps anomalies to ICS-specific TTPs (T0836, T0855, T0840, T1021, T1570, T0816)
- **IT/OT Correlation**: Cross-domain threat detection bridging IT network signals and OT process anomalies
- **Playbook Engine**: Automated COMCYBER-aligned response playbooks
- **Semantic Alert Engine**: Context-aware alerting with evidence chains

### TRM — Tiny Recursive Models (Edge AI Agents)

Lightweight AI agents designed for tactical networks with intermittent satellite links. Operate fully offline with local Synapsix detection, then resync when connectivity restores.

- Air-gap capable with local inference + detection
- Priority-based offline buffer with TTL and deduplication
- Federated sync with differential resync on reconnect
- LevelDB/file-based local storage (no cloud dependency)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERFACE LAYER                                │
│  ┌───────────┐  ┌───────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Defense    │  │ SOC       │  │ Compliance   │  │ COMCYBER           │   │
│  │ Dashboard  │  │ Dashboard │  │ Dashboard    │  │ Playbook Console   │   │
│  └─────┬─────┘  └─────┬─────┘  └──────┬───────┘  └─────────┬──────────┘  │
├────────┴──────────────┴──────────────┴───────────────────┴──────────────┤
│                               CORE LAYER                                    │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐   │
│  │   Synapsix     │  │   Skophia     │  │  Governance  │  │  Causal    │   │
│  │  Semantic Drift│  │  OTel Ingest │  │  AI Act Pack │  │  Analysis  │   │
│  │  MITRE ICS     │  │  Cognitive   │  │  Audit Trail │  │  Root Cause│   │
│  │  IT/OT Correl. │  │  Metrics     │  │  Hash Chain  │  │  Impact    │   │
│  └────────────────┘  └──────────────┘  └──────────────┘  └────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│                             TRANSPORT LAYER                                 │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  VictoriaMetrics (Metrics)  │  OpenObserve (Logs/Traces)  │ Redis │    │
│  └────────────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│                               EDGE LAYER                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ OPC-UA   │  │ Modbus   │  │ MQTT     │  │ PCAP     │  │ TRM      │   │
│  │ Connector│  │ Connector│  │ Connector│  │ Connector│  │ Agent    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
skophia/
├── src/
│   ├── core/
│   │   ├── skophia/                    # Skophia — Telemetry & Storage
│   │   │   ├── otel-pipeline.ts       # Unified OTel ingestion
│   │   │   ├── victoriametrics-connector.ts
│   │   │   └── openobserve-connector.ts
│   │   ├── cognitive/                 # Cognitive Metrics Engine
│   │   │   ├── drift-detector.ts
│   │   │   ├── semantic-drift/        # Semantic Drift Detection (IF + VAE)
│   │   │   ├── reliability-analyzer.ts
│   │   │   └── hallucination-detector.ts
│   │   ├── causal/                    # Causal Analysis Engine
│   │   └── types/                     # TypeScript interfaces
│   ├── synapsix/                      # Synapsix — Threat Detection
│   │   ├── mitre-ics-correlator.ts    # MITRE ATT&CK ICS mapping
│   │   ├── it-ot-correlator.ts        # IT/OT cross-domain correlation
│   │   ├── semantic-alert-engine.ts   # Context-aware alerting
│   │   └── playbook-engine.ts         # COMCYBER response playbooks
│   ├── trm/                           # TRM — Edge AI Agents
│   │   ├── trm-agent.ts              # Lightweight edge agent
│   │   ├── offline-buffer.ts          # Air-gap local buffer
│   │   └── federated-sync.ts          # Differential resync
│   ├── connectors/
│   │   ├── ot/                        # OT Protocol Connectors
│   │   │   ├── opcua-connector.ts     # OPC-UA (1s cycles)
│   │   │   ├── modbus-connector.ts    # Modbus TCP/RTU (100ms)
│   │   │   └── mqtt-connector.ts      # MQTT 3.1.1/5.0 (async)
│   │   └── it/                        # IT Network Connectors
│   │       ├── pcap-connector.ts      # Network packet capture
│   │       ├── suricata-zeek-connector.ts  # IDS integration
│   │       └── edr-connector.ts       # EDR telemetry
│   ├── governance/                    # Governance & Compliance
│   │   ├── audit/                     # Audit trail + evidence
│   │   └── classification/            # AI Act classification
│   │       ├── compartment-manager.ts # Security compartments
│   │       └── evidence-generator.ts  # AI Act exportable packs
│   ├── edge-mode/                     # Air-Gap / Edge Deployment
│   ├── security/                      # Security Modules
│   │   └── mitre/                     # MITRE ATT&CK ICS database
│   └── storage/                       # Storage Backend Adapters
├── visualization/                     # Python FastAPI Dashboard
├── docker/                            # Docker configurations
└── tests/                             # Test suites
```

---

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/E4Itraining/AIOBS.git skophia
cd skophia

cp .env.example .env
# Edit .env — change all default passwords

docker compose up -d

# Dashboard: http://localhost:8000
# Backend API: http://localhost:3000
```

### Air-Gap Deployment

```bash
# Build images on connected machine
docker compose build
docker save skophia-backend skophia-visualization | gzip > skophia-images.tar.gz

# Transfer to air-gapped host
docker load < skophia-images.tar.gz
AIOBS_EDGE_MODE=true docker compose --profile airgap up -d
```

### Local Development

```bash
# Backend (TypeScript)
npm install
npm run dev

# Visualization (Python)
cd visualization
pip install -r requirements.txt
python run.py
```

---

## Services & Ports

| Service          | Port | Description                          |
|------------------|------|--------------------------------------|
| Visualization    | 8000 | FastAPI SOC Dashboard (main UI)      |
| Backend          | 3000 | TypeScript Core Platform             |
| VictoriaMetrics  | 8428 | Time-series metrics (sovereign)      |
| OpenObserve      | 5080 | Logs, traces, audit (sovereign)      |
| Redis            | 6379 | Cache, pub/sub, rate limiting        |
| Synapsix         | 3001 | Threat detection engine              |
| TRM Agent        | 3002 | Edge agent (optional, demo)          |

---

## Technology Stack

| Layer              | Technology                                    |
|--------------------|-----------------------------------------------|
| **Core Engine**    | TypeScript 5.2, Node.js 20                    |
| **Dashboard**      | FastAPI 0.109, Python 3.11, Jinja2            |
| **Metrics Store**  | VictoriaMetrics (on-premise, sovereign)        |
| **Log/Trace Store**| OpenObserve (on-premise, sovereign)            |
| **Cache**          | Redis 7 (no external dependency)              |
| **OT Protocols**   | OPC-UA, Modbus TCP/RTU, MQTT 3.1.1/5.0       |
| **IT Protocols**   | PCAP, Suricata/Zeek, EDR telemetry            |
| **Detection**      | Isolation Forest, VAE latent space analysis    |
| **Compliance**     | AI Act, NIS2, MITRE ATT&CK ICS               |
| **Containers**     | Docker, Docker Compose                        |

All dependencies are 100% open source. No proprietary SDKs. No cloud provider clients.

---

## Compliance & Regulatory

- **AI Act** (deadline: August 2, 2026): Automated evidence pack generation, risk classification, audit trails with hash-chain integrity
- **NIS2**: Built-in incident detection, reporting capabilities, and audit compliance for essential/important entities
- **MITRE ATT&CK ICS**: 12 tactics, 40+ techniques mapped to AI/OT anomalies with automated correlation

---

## Language Support

| Language | Code |
|----------|------|
| English  | en   |
| French   | fr   |
| German   | de   |
| Dutch    | nl   |

---

## Documentation

- [Defense Capabilities](./docs/DEFENSE_CAPABILITIES.md) — Semantic drift, IT/OT, MITRE, edge mode
- [OT Connectors](./docs/OT_CONNECTORS.md) — Protocol connector guide
- [MITRE ATT&CK ICS](./docs/MITRE_ATTACK_ICS.md) — Technique mapping reference
- [Edge Mode](./docs/EDGE_MODE.md) — Air-gap deployment guide
- [Architecture Overview](./docs/architecture/OVERVIEW.md) — System design
- [Configuration Guide](./docs/CONFIGURATION.md) — Environment and settings
- [Docker Deployment](./docs/DOCKER_DEPLOYMENT.md) — Container deployment
- [API Reference](./docs/api/README.md) — Complete API documentation

---

## Contributing

We welcome contributions. See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

MIT License — see [LICENSE](./LICENSE) for details.
