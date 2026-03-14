# Edge Mode / Air-Gap Deployment

AIOBS supports fully disconnected (air-gap) operation for defense, classified, and remote environments where continuous connectivity to a central server is not available.

## Overview

Edge mode enables AIOBS to:
- **Buffer data locally** when upstream connectivity is lost
- **Prioritize critical data** (semantic alerts, security events) over routine metrics
- **Resynchronize differentially** when connectivity is restored
- **Operate without Docker** for portable deployment on hardened systems

## Architecture

```
┌─────────────────────────────────────────────┐
│  Edge Node (Air-Gapped / Intermittent)      │
│                                             │
│  ┌──────────┐   ┌────────────┐              │
│  │ AIOBS    │──▶│ Edge       │              │
│  │ Core     │   │ Buffer     │              │
│  └──────────┘   │ (FIFO +   │              │
│                 │  Priority) │              │
│                 └─────┬──────┘              │
│                       │                     │
│                 ┌─────▼──────┐              │
│                 │ Resync     │──── ─ ─ ─ ─ ▶│ Upstream
│                 │ Manager    │  (when       │ Central
│                 └────────────┘   connected) │
└─────────────────────────────────────────────┘
```

## Configuration

All configuration via environment variables (no Docker required):

| Variable | Default | Description |
|----------|---------|-------------|
| `AIOBS_EDGE_MODE` | `false` | Enable edge/air-gap mode |
| `AIOBS_UPSTREAM_URL` | — | Central AIOBS sync endpoint |
| `AIOBS_EDGE_STORAGE_PATH` | `./data/edge-buffer` | Local buffer storage path |
| `AIOBS_EDGE_MAX_BUFFER_MB` | `100` | Maximum buffer size in MB |
| `AIOBS_EDGE_MAX_ENTRIES` | `100000` | Maximum buffered entries |
| `AIOBS_EDGE_TTL_HOURS` | `168` (7 days) | Entry time-to-live |
| `AIOBS_EDGE_SYNC_STRATEGY` | `priority_first` | Sync strategy (`priority_first`, `fifo`, `latest_first`) |
| `AIOBS_EDGE_SYNC_BATCH_SIZE` | `500` | Entries per sync batch |
| `AIOBS_EDGE_CONNECTIVITY_CHECK_INTERVAL` | `30000` | Connectivity check interval (ms) |

## Edge Buffer

The edge buffer implements a priority-aware FIFO queue:

### Priority Levels
1. **critical** (4) — Semantic drift alerts, security incidents
2. **high** (3) — OT anomalies, MITRE-mapped events
3. **medium** (2) — Standard metrics, health checks
4. **low** (1) — Routine telemetry, debug data

### Overflow Policies
- `drop_oldest` — Remove oldest entries first (default)
- `drop_lowest_priority` — Remove lowest-priority entries first
- `reject_new` — Reject new entries when full

### Data Integrity
- Each entry includes a SHA-256-based checksum
- Entries track sync state: `pending`, `syncing`, `synced`, `failed`
- Failed syncs are retried with exponential backoff

## Differential Resync

When connectivity is restored:

1. **Detection** — Resync manager detects upstream availability via periodic health checks
2. **Batch Processing** — Pending entries are sent in configurable batches (default: 500)
3. **Priority Order** — Critical and high-priority entries sync first
4. **Retry Logic** — Failed batches retry with exponential backoff (max 3 retries)
5. **Cleanup** — Successfully synced entries are purged from the local buffer

## Usage

```typescript
import { EdgeBuffer, ResyncManager, getEdgeModeConfig } from '@aiobs/platform';

const config = getEdgeModeConfig();
const buffer = new EdgeBuffer(config.buffer);
const resync = new ResyncManager(buffer, config.resync);

// Buffer data locally
buffer.push({
  type: 'semantic_alert',
  data: alertPayload,
  priority: 'critical',
  source: 'semantic-drift-engine',
});

// Set sync callback
resync.onSync(async (batch) => {
  await fetch(config.upstreamUrl + '/ingest', {
    method: 'POST',
    body: JSON.stringify(batch),
  });
});

// Start monitoring connectivity
resync.startMonitoring();
```

## Deployment Without Docker

Edge mode is designed to run on bare metal or hardened VMs:

```bash
# Set environment
export AIOBS_EDGE_MODE=true
export AIOBS_UPSTREAM_URL=https://aiobs-central.mil/api/sync
export AIOBS_EDGE_STORAGE_PATH=/opt/aiobs/buffer

# Run directly with Node.js
node dist/index.js
```

## Integration with Defense SOC

Edge nodes appear in the Defense SOC dashboard at `/defense-soc`:
- Online/offline status with last sync timestamp
- Buffer utilization percentage
- Pending entry count
- Automatic alerts when buffer approaches capacity
