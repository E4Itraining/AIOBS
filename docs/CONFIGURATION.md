# AIOBS Configuration Guide

This guide covers all configuration options for the AIOBS platform.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Service Configuration](#service-configuration)
- [Storage Configuration](#storage-configuration)
- [Language Configuration](#language-configuration)
- [Security Configuration](#security-configuration)
- [Docker Configuration](#docker-configuration)
- [Advanced Configuration](#advanced-configuration)

---

## Environment Variables

Create a `.env` file from the template:

```bash
cp .env.example .env
```

### General Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Environment: development, production, test |
| `LOG_LEVEL` | `info` | Logging level: debug, info, warn, error |
| `DEFAULT_LANGUAGE` | `en` | Default UI language code |

### Service Ports

| Variable | Default | Description |
|----------|---------|-------------|
| `VISUALIZATION_PORT` | `8000` | FastAPI dashboard port |
| `BACKEND_PORT` | `3000` | TypeScript backend port |
| `VICTORIA_METRICS_PORT` | `8428` | VictoriaMetrics port |
| `OPENOBSERVE_PORT` | `5080` | OpenObserve port |
| `REDIS_PORT` | `6379` | Redis port |
| `PROMETHEUS_PORT` | `9090` | Prometheus port (optional) |
| `GRAFANA_PORT` | `3001` | Grafana port (optional) |

### Database Credentials

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENOBSERVE_USER` | `admin@aiobs.local` | OpenObserve admin username |
| `OPENOBSERVE_PASSWORD` | `Complexpass#123` | OpenObserve admin password |
| `GRAFANA_USER` | `admin` | Grafana admin username |
| `GRAFANA_PASSWORD` | `admin` | Grafana admin password |

### Storage Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `VICTORIA_METRICS_RETENTION` | `90d` | Metrics retention period |
| `REDIS_MAXMEMORY` | `256mb` | Redis memory limit |

### Security (Production)

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | - | JWT signing secret |
| `API_KEY` | - | API key for external integrations |

### External Integrations

| Variable | Default | Description |
|----------|---------|-------------|
| `SLACK_WEBHOOK_URL` | - | Slack webhook for alerts |
| `PAGERDUTY_API_KEY` | - | PagerDuty API key |
| `DATADOG_API_KEY` | - | Datadog API key |

### AI/ML Provider Keys

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | - | OpenAI API key for AI assistant |
| `ANTHROPIC_API_KEY` | - | Anthropic API key |
| `HUGGINGFACE_API_KEY` | - | Hugging Face API key |

---

## Service Configuration

### Visualization (FastAPI)

The visualization service is configured via environment variables and the `app.py` factory function.

**Key Settings:**

```python
# visualization/app.py
app = FastAPI(
    title="AIOBS Visualization",
    description="AI Observability Hub Dashboard",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)
```

**Uvicorn Settings:**

```bash
# Development
uvicorn app:create_app --factory --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app:create_app --factory --host 0.0.0.0 --port 8000 --workers 4
```

### Backend (TypeScript)

The backend is configured via `package.json` and environment variables.

**TypeScript Configuration (`tsconfig.json`):**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "strict": true,
    "outDir": "./dist"
  }
}
```

**HTTP Server Settings:**

The backend runs on port 3000 by default. Modify in `src/index.ts`:

```typescript
const PORT = process.env.BACKEND_PORT || 3000;
```

---

## Storage Configuration

### VictoriaMetrics

VictoriaMetrics is used for time-series metrics storage.

**Docker Configuration:**

```yaml
victoriametrics:
  image: victoriametrics/victoria-metrics:v1.96.0
  command:
    - "--storageDataPath=/storage"
    - "--retentionPeriod=${VICTORIA_METRICS_RETENTION:-90d}"
    - "--httpListenAddr=:8428"
  volumes:
    - victoriametrics-data:/storage
```

**Query Examples:**

```bash
# Query metrics
curl "http://localhost:8428/api/v1/query?query=aiobs_trust_score"

# Range query
curl "http://localhost:8428/api/v1/query_range?query=aiobs_trust_score&start=2024-01-01T00:00:00Z&end=2024-01-02T00:00:00Z&step=1h"
```

### OpenObserve

OpenObserve handles logs, traces, and compliance data.

**Docker Configuration:**

```yaml
openobserve:
  image: openobserve/openobserve:latest
  environment:
    - ZO_ROOT_USER_EMAIL=${OPENOBSERVE_USER:-admin@aiobs.local}
    - ZO_ROOT_USER_PASSWORD=${OPENOBSERVE_PASSWORD:-Complexpass#123}
  volumes:
    - openobserve-data:/data
```

**Access:**
- URL: http://localhost:5080
- Default credentials: admin@aiobs.local / Complexpass#123

### Redis

Redis provides caching and real-time pub/sub functionality.

**Docker Configuration:**

```yaml
redis:
  image: redis:7-alpine
  command: redis-server --maxmemory ${REDIS_MAXMEMORY:-256mb} --maxmemory-policy allkeys-lru
  volumes:
    - redis-data:/data
```

**Connection String:**

```
redis://localhost:6379
```

---

## Language Configuration

AIOBS supports 10 languages with full UI translation.

### Supported Languages

| Code | Language | Native Name | RTL |
|------|----------|-------------|-----|
| `en` | English | English | No |
| `fr` | French | Français | No |
| `es` | Spanish | Español | No |
| `de` | German | Deutsch | No |
| `pt` | Portuguese | Português | No |
| `it` | Italian | Italiano | No |
| `zh` | Chinese | 中文 | No |
| `ja` | Japanese | 日本語 | No |
| `ko` | Korean | 한국어 | No |
| `ar` | Arabic | العربية | Yes |

### Setting Default Language

**Environment Variable:**
```bash
DEFAULT_LANGUAGE=fr
```

**Query Parameter:**
```
http://localhost:8000?lang=es
```

**Cookie:**
The language preference is stored in the `aiobs_lang` cookie.

### Adding Translations

Edit `visualization/i18n/translations.py`:

```python
TRANSLATIONS = {
    'en': {
        'dashboard': 'Dashboard',
        'trust_score': 'Trust Score',
        # ...
    },
    'fr': {
        'dashboard': 'Tableau de bord',
        'trust_score': 'Score de confiance',
        # ...
    },
    # Add new language
    'nl': {
        'dashboard': 'Dashboard',
        'trust_score': 'Vertrouwensscore',
        # ...
    }
}
```

---

## Security Configuration

### Production Security Checklist

1. **Change Default Passwords**
   ```bash
   OPENOBSERVE_PASSWORD=your-secure-password
   GRAFANA_PASSWORD=your-secure-password
   ```

2. **Set JWT Secret**
   ```bash
   JWT_SECRET=$(openssl rand -hex 32)
   ```

3. **Enable TLS**
   Use a reverse proxy (Traefik, nginx) with SSL certificates.

4. **Configure CORS**
   Update FastAPI CORS settings for your domain.

5. **Network Isolation**
   Expose only necessary ports externally.

### Traefik Integration

The docker-compose includes Traefik labels:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.aiobs-viz.rule=Host(`aiobs.your-domain.com`)"
  - "traefik.http.routers.aiobs-viz.tls=true"
  - "traefik.http.routers.aiobs-viz.tls.certresolver=letsencrypt"
```

### Network Configuration

Default Docker network configuration:

```yaml
networks:
  aiobs-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

---

## Docker Configuration

### Docker Compose Profiles

**Default (core services):**
```bash
docker-compose up -d
```

**With Monitoring (Prometheus + Grafana):**
```bash
docker-compose --profile monitoring up -d
```

### Resource Limits

Add resource limits for production:

```yaml
services:
  visualization:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Health Checks

All services include health checks:

| Service | Health Endpoint |
|---------|-----------------|
| Visualization | `http://localhost:8000/health` |
| Backend | `http://localhost:3000/health` |
| VictoriaMetrics | `http://localhost:8428/health` |
| OpenObserve | `http://localhost:5080/healthz` |
| Redis | `redis-cli ping` |

### Volume Management

**Data Volumes:**
- `victoriametrics-data` - Metrics storage
- `openobserve-data` - Logs and traces
- `redis-data` - Cache data
- `prometheus-data` - Prometheus TSDB (optional)
- `grafana-data` - Grafana config (optional)

**Backup Command:**
```bash
docker run --rm \
  -v aiobs_victoriametrics-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/vm-backup.tar.gz /data
```

---

## Advanced Configuration

### Cognitive Engine Configuration

The cognitive engine can be configured programmatically:

```typescript
import { CognitiveEngine } from './core/cognitive';

const engine = new CognitiveEngine({
  driftThreshold: 0.3,
  reliabilityMinimum: 0.7,
  hallucinationRiskThreshold: 'medium',
  degradationWindow: 24 * 60 * 60 * 1000 // 24 hours
});
```

### SLO Configuration

Define SLOs in the governance module:

```typescript
import { SLOMonitor } from './governance/slo';

const slo = new SLOMonitor({
  targets: {
    availability: 0.999,
    latencyP99: 200, // ms
    errorRate: 0.001,
    driftScore: 0.3
  },
  evaluationWindow: '30d',
  burnRateAlerts: [2, 6, 24] // hours
});
```

### Audit Configuration

Configure audit logging:

```typescript
import { AuditEngine } from './governance/audit';

const audit = new AuditEngine({
  retentionDays: 365,
  hashAlgorithm: 'sha256',
  enableChaining: true,
  complianceFrameworks: ['AI_ACT', 'GDPR', 'ISO_27001']
});
```

### Custom Metrics

Add custom metrics to VictoriaMetrics:

```bash
# Push metric
curl -d 'aiobs_custom_metric{model="test"} 0.95' \
  http://localhost:8428/api/v1/import/prometheus

# Query metric
curl 'http://localhost:8428/api/v1/query?query=aiobs_custom_metric'
```

### WebSocket Configuration

Configure WebSocket behavior:

```python
# visualization/routers/realtime.py
class ConnectionManager:
    def __init__(self):
        self.channels = {
            'metrics': set(),
            'alerts': set(),
            'events': set(),
            'cognitive': set(),
            'causal': set(),
            'all': set()
        }
```

**Broadcast Intervals:**
- Metrics: Every 5 seconds
- Cognitive: Every 10 seconds
- Alerts: Event-driven (30-120 second check interval)

---

## Configuration Examples

### Development Environment

```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug
DEFAULT_LANGUAGE=en
VISUALIZATION_PORT=8000
BACKEND_PORT=3000
```

### Production Environment

```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=info
DEFAULT_LANGUAGE=en

# Security
JWT_SECRET=your-256-bit-secret
API_KEY=your-api-key

# External services
OPENOBSERVE_PASSWORD=secure-password-here
GRAFANA_PASSWORD=secure-password-here

# Storage
VICTORIA_METRICS_RETENTION=365d
REDIS_MAXMEMORY=1gb

# Integrations
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
```

### High Availability Setup

For HA deployments:

1. **Multiple visualization instances** with load balancer
2. **VictoriaMetrics cluster** mode
3. **Redis Sentinel** or Cluster
4. **External PostgreSQL** for OpenObserve (production)

---

## Troubleshooting Configuration Issues

### Common Issues

**Port Conflict:**
```bash
# Check port usage
lsof -i :8000
# Change port in .env
VISUALIZATION_PORT=8001
```

**Memory Issues:**
```bash
# Increase Redis memory
REDIS_MAXMEMORY=512mb
```

**Language Not Loading:**
- Check `DEFAULT_LANGUAGE` is a valid code
- Clear browser cookies
- Verify translation file exists

**Database Connection:**
```bash
# Test connectivity
docker-compose exec visualization ping victoriametrics
docker-compose exec backend ping redis
```

For more help, see [Development Guide](./DEVELOPMENT.md) or open an issue.
