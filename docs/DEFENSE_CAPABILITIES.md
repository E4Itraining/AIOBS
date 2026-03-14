# Defense & Sovereign Capabilities

AIOBS includes specialized modules for defense, critical infrastructure, and sovereign deployment contexts. These capabilities position AIOBS for the **Cyber Defense Factory AID/COMCYBER** program.

## Modules Overview

| Module | Priority | Path | Description |
|--------|----------|------|-------------|
| Semantic Drift Detection | P1 Critical | `src/core/cognitive/semantic-drift/` | Adversarial semantic shift detection |
| IT/OT Connectors | P1 Critical | `src/connectors/ot/` | OPC-UA, Modbus, MQTT, SNMP |
| Air-Gap / Edge Mode | P1 Critical | `src/edge-mode/` | Disconnected operation with differential resync |
| MITRE ATT&CK ICS | P2 Important | `src/security/mitre/` | Anomaly-to-technique mapping |
| Defense SOC Dashboard | P2 Important | `visualization/routers/defense_soc.py` | Commandant SOC Défense profile |

---

## 1. Semantic Drift Detection (Differentiating Feature)

**What it detects**: Adversarial semantic shifts where AI model outputs remain statistically normal but operational meaning has shifted — the key gap that existing MLOps tools miss.

### Architecture

```
Inference Stream ──▶ Isolation Forest ──▶ Anomaly Score (0.30 weight)
                 ──▶ VAE Analysis     ──▶ Reconstruction Error (0.30 weight)
                 ──▶ Context Analyzer ──▶ Semantic Coherence (0.40 weight)
                                              │
                                     ┌────────▼────────┐
                                     │ Stealth Attack?  │
                                     │ (Normal stats +  │
                                     │  Shifted meaning) │
                                     └────────┬────────┘
                                              │
                                     ┌────────▼────────┐
                                     │ Alert + Evidence │
                                     │ (AI Act chain)   │
                                     └─────────────────┘
```

### Semantic Shift Types
- **meaning_inversion** — Output labels remain valid but meaning is inverted
- **context_displacement** — Correct outputs in wrong operational context
- **confidence_manipulation** — Artificially inflated/deflated confidence scores
- **boundary_erosion** — Decision boundaries gradually shift without threshold triggers
- **label_semantic_drift** — Label meanings evolve while statistical distributions hold
- **operational_decorrelation** — Model outputs decorrelate from operational outcomes

### Key Differentiator
Existing drift detection (statistical KS/PSI tests) catches distributional shifts. Semantic drift detection catches the scenario where distributions remain stable but the *meaning* of outputs has been adversarially manipulated — a critical gap in defense AI systems.

---

## 2. IT/OT Connectors

Four protocol connectors with abstract base class and simulation mode:

| Protocol | Use Case | Simulation Data |
|----------|----------|-----------------|
| **OPC-UA** | SCADA, PLC, DCS systems | Temperature, pressure, flow, level, speed |
| **Modbus** (TCP/RTU) | Motor controllers, sensors | Motor speed, current, vibration, coils |
| **MQTT** (3.1.1/5.0) | IoT sensors, edge devices | Temperature, humidity, pressure, alarms |
| **SNMP** (v2c/v3) | Network infrastructure | CPU, memory, bandwidth, uptime |

### Simulation Mode
All connectors support `simulation: true` for demos and testing without physical equipment. Factory functions provide pre-configured simulation instances:

```typescript
import { createOPCUASimulationConnector } from '@aiobs/platform';

const connector = createOPCUASimulationConnector();
await connector.connect();
const data = await connector.collect();
// Returns realistic industrial sensor readings
```

---

## 3. Air-Gap / Edge Mode

See [EDGE_MODE.md](./EDGE_MODE.md) for detailed documentation.

Key features:
- Priority-based FIFO buffer (critical > high > medium > low)
- Differential resync on connectivity restoration
- No Docker dependency — runs on bare Node.js
- Configurable via environment variables only

---

## 4. MITRE ATT&CK ICS Mapping

Local database (zero cloud dependency) mapping AIOBS anomalies to ICS attack techniques:

### Coverage
- **12 ICS tactics** (TA0100–TA0111)
- **10 key techniques** (T0816, T0855, T0882, T0836, T0831, T0879, T0856, T0863, T0886, T0857)
- **6 AI/OT-specific attack patterns** (AIOBS-AP-001 through AIOBS-AP-006)

### Custom Attack Patterns
| ID | Name | Mapped Techniques |
|----|------|-------------------|
| AIOBS-AP-001 | AI Model Semantic Poisoning | T0831, T0856 |
| AIOBS-AP-002 | OT Sensor Data Manipulation | T0836, T0856 |
| AIOBS-AP-003 | AI-Assisted Lateral Movement | T0886, T0855 |
| AIOBS-AP-004 | Confidence Score Manipulation | T0831 |
| AIOBS-AP-005 | Edge Node Compromise | T0857, T0863 |
| AIOBS-AP-006 | AI Training Data Exfiltration | T0882 |

### Semantic Drift → MITRE Mapping
When the semantic drift engine detects a statistically-normal-but-semantically-shifted anomaly, it maps to **T0856 (Spoof Reporting Message)** — an adversary manipulating AI outputs while maintaining statistical normalcy.

---

## 5. Defense SOC Dashboard

Accessible at `/defense-soc`, dedicated to the **Commandant SOC Défense** profile:

- **Semantic alerts feed** (not classical MLOps metrics) with severity filtering
- **Causal inference chains** (attack → drift → alert) with step visualization
- **IT/OT real-time correlation** (ms-network vs s-OPC-UA signal comparison)
- **MITRE ATT&CK ICS matrix** with coverage visualization
- **Edge node status** (online/offline, buffer utilization, pending entries)
- **AI Act evidence export** (JSON + PDF format, AIOBS-Evidence-v1.0 signature)

---

## AI Act Compliance

All modules produce exportable evidence chains:

```json
{
  "signature": "AIOBS-Evidence-v1.0",
  "complianceFramework": "EU AI Act",
  "evidenceChain": {
    "detectionMethod": "Semantic Drift Detection (Isolation Forest + VAE)",
    "analysisResults": { ... },
    "mitreMappings": [ ... ],
    "auditTrail": [ ... ]
  }
}
```

## Constraints

- **100% open source** — No proprietary dependencies
- **Zero US cloud dependency** — All processing local/sovereign
- **Simulation mode** — All OT connectors work without physical equipment
- **Portable deployment** — Air-gap mode runs without Docker
- **i18n** — French, English, German, Dutch (EU sovereign core)
