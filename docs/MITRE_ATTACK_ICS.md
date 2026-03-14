# MITRE ATT&CK for ICS Integration

AIOBS integrates with the MITRE ATT&CK for ICS framework to map detected anomalies — including AI semantic drift — to known adversary tactics and techniques.

## Overview

The MITRE module provides:
- **Local database** (zero cloud dependency) with 12 ICS tactics and 10+ techniques
- **6 custom AI/OT attack patterns** bridging AI-specific threats with ICS techniques
- **Automatic anomaly-to-technique mapping** with confidence scoring
- **Kill chain phase positioning** for threat context
- **Threat response recommendations** with escalation paths

## Architecture

```
┌───────────────────────┐     ┌──────────────────────────┐
│ Semantic Drift Engine │────▶│                          │
├───────────────────────┤     │   MITRE ICS Mapper       │
│ OT Connector Anomaly  │────▶│   (attack-pattern-db +   │
├───────────────────────┤     │    mitre-ics-mapper)     │
│ Network/IT Anomaly    │────▶│                          │
└───────────────────────┘     └───────────┬──────────────┘
                                          │
                              ┌───────────▼──────────────┐
                              │   MITRE Alert Enricher   │
                              │   (context, response,    │
                              │    kill chain, evidence)  │
                              └───────────┬──────────────┘
                                          │
                              ┌───────────▼──────────────┐
                              │   Defense SOC Dashboard   │
                              │   (MITRE matrix view)    │
                              └──────────────────────────┘
```

## Tactics Coverage

All 12 ICS-specific tactics from MITRE ATT&CK:

| ID | Tactic | Description |
|----|--------|-------------|
| TA0108 | Initial Access | Gain initial foothold in ICS network |
| TA0104 | Execution | Run adversary-controlled code |
| TA0110 | Persistence | Maintain foothold across restarts |
| TA0109 | Evasion | Avoid detection by security tools |
| TA0100 | Discovery | Map the ICS environment |
| TA0101 | Lateral Movement | Move between IT and OT zones |
| TA0102 | Collection | Gather ICS intelligence |
| TA0103 | Command and Control | Communicate with compromised systems |
| TA0106 | Impair Process Control | Disrupt physical processes |
| TA0107 | Inhibit Response Function | Prevent operator response |
| TA0111 | Steal Operational Information | Exfiltrate process data |
| TA0105 | Impact | Damage, disrupt, or destroy |

## Key Techniques

| ID | Technique | Common Mapping |
|----|-----------|---------------|
| T0816 | Device Restart/Shutdown | Unexpected PLC restarts |
| T0855 | Unauthorized Command Message | Rogue OPC-UA writes |
| T0882 | Theft of Operational Information | Data exfiltration patterns |
| T0836 | Modify Parameter | OT parameter tampering |
| T0831 | Manipulation of Control | Process control subversion |
| T0879 | Damage to Property | Physical impact scenarios |
| T0856 | Spoof Reporting Message | **Semantic drift indicator** |
| T0863 | User Execution | Social engineering in OT |
| T0886 | Remote Services | Lateral movement via OT protocols |
| T0857 | System Firmware | Firmware manipulation |

## Custom AI/OT Attack Patterns

AIOBS defines 6 attack patterns that bridge AI-specific threats with ICS techniques:

### AIOBS-AP-001: AI Model Semantic Poisoning
- **Description**: Adversary manipulates training data or inference pipeline to produce semantically shifted outputs that pass statistical validation
- **Mapped Techniques**: T0831 (Manipulation of Control), T0856 (Spoof Reporting)
- **Detection**: Semantic drift engine detects statistically-normal-but-semantically-shifted outputs
- **Kill Chain Phase**: Actions on Objectives

### AIOBS-AP-002: OT Sensor Data Manipulation
- **Description**: Adversary modifies sensor readings at protocol level to provide false operational picture
- **Mapped Techniques**: T0836 (Modify Parameter), T0856 (Spoof Reporting)
- **Detection**: Cross-correlation between IT metrics and OT readings, physical model validation
- **Kill Chain Phase**: Impair Process Control

### AIOBS-AP-003: AI-Assisted Lateral Movement
- **Description**: Adversary leverages AI model access to pivot between IT and OT zones
- **Mapped Techniques**: T0886 (Remote Services), T0855 (Unauthorized Command)
- **Detection**: Unusual model API access patterns, cross-zone authentication anomalies
- **Kill Chain Phase**: Lateral Movement

### AIOBS-AP-004: Confidence Score Manipulation
- **Description**: Adversary manipulates model confidence outputs to suppress or amplify alerts
- **Mapped Techniques**: T0831 (Manipulation of Control)
- **Detection**: Semantic drift engine confidence calibration analysis
- **Kill Chain Phase**: Evasion

### AIOBS-AP-005: Edge Node Compromise
- **Description**: Adversary compromises air-gapped edge node to inject false data during resync
- **Mapped Techniques**: T0857 (System Firmware), T0863 (User Execution)
- **Detection**: Edge buffer integrity checks, resync anomaly detection
- **Kill Chain Phase**: Initial Access

### AIOBS-AP-006: AI Training Data Exfiltration
- **Description**: Adversary exfiltrates operational data through model query patterns
- **Mapped Techniques**: T0882 (Theft of Operational Information)
- **Detection**: Query pattern analysis, data volume monitoring
- **Kill Chain Phase**: Collection

## Usage

### Map an Anomaly

```typescript
import { MITREICSMapper } from '@aiobs/platform';

const mapper = new MITREICSMapper();

const result = mapper.mapAnomaly({
  type: 'semantic_drift',
  source: 'ThreatDetector-v3',
  description: 'Statistically normal outputs with semantic meaning shift',
  severity: 0.85,
  indicators: {
    statisticallyNormal: true,
    semanticallyShifted: true,
    driftScore: 0.78,
    affectedOutputs: ['threat_classification', 'risk_score'],
  },
  timestamp: new Date().toISOString(),
});

// result.techniques: [{ technique: T0856, confidence: 0.85, ... }]
// result.killChainPhase: 'actions_on_objectives'
// result.narrative: "Semantic drift mapped to T0856 Spoof Reporting Message..."
```

### Enrich an Alert

```typescript
import { MITREAlertEnricher } from '@aiobs/platform';

const enricher = new MITREAlertEnricher();

const enriched = enricher.enrich(alert, mappingResult);
// Adds: MITRE context, threat severity, response recommendations
// Response includes: immediate actions, investigation steps,
//   containment strategy, escalation path, MITRE mitigations

// Search for correlated alerts
const correlated = enricher.findCorrelated('T0856');
```

### Platform Factory

```typescript
import { AIOBS } from '@aiobs/platform';

const platform = AIOBS.create({
  mitre: { enabled: true },
  // ... other config
});

const mapping = platform.mitre.mapper.mapAnomaly(anomaly);
const enriched = platform.mitre.enricher.enrich(alert, mapping);
```

## Defense SOC Dashboard

The MITRE matrix visualization at `/defense-soc` shows:
- Tactic coverage with detected/total technique counts
- Active technique matches with confidence scores
- Kill chain positioning for ongoing incidents
- Correlation with semantic drift and OT connector alerts

## AI Act Compliance

All MITRE mappings produce evidence chains compatible with EU AI Act requirements:

```json
{
  "mitreMappings": [
    {
      "technique": "T0856",
      "name": "Spoof Reporting Message",
      "confidence": 0.85,
      "attackPattern": "AIOBS-AP-001",
      "killChainPhase": "actions_on_objectives",
      "timestamp": "2026-03-14T10:30:00Z"
    }
  ],
  "evidenceChain": {
    "detectionSource": "semantic-drift-engine",
    "mitreMappingSource": "mitre-ics-mapper",
    "signature": "AIOBS-Evidence-v1.0"
  }
}
```
