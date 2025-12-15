# AIOBS Docker Deployment Guide

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/aiobs.git
cd aiobs

# Copy environment template
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

## Services Overview

| Service | Port | Description |
|---------|------|-------------|
| **visualization** | 8000 | FastAPI Dashboard (main UI) |
| **backend** | 3000 | TypeScript Core Platform |
| **victoriametrics** | 8428 | Time-series metrics database |
| **openobserve** | 5080 | Logs, traces, compliance storage |
| **redis** | 6379 | Caching and real-time pub/sub |

### Optional Services (monitoring profile)

| Service | Port | Description |
|---------|------|-------------|
| **prometheus** | 9090 | Metrics collection |
| **grafana** | 3001 | Advanced visualization |

## Access Points

- **AIOBS Dashboard**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/docs
- **VictoriaMetrics UI**: http://localhost:8428/vmui
- **OpenObserve UI**: http://localhost:5080 (admin@aiobs.local / Complexpass#123)

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# General
NODE_ENV=production
LOG_LEVEL=info
DEFAULT_LANGUAGE=en  # en, fr, es, de, pt, it, zh, ja, ko, ar

# Ports
VISUALIZATION_PORT=8000
BACKEND_PORT=3000
VICTORIA_METRICS_PORT=8428
OPENOBSERVE_PORT=5080
REDIS_PORT=6379

# OpenObserve Credentials
OPENOBSERVE_USER=admin@aiobs.local
OPENOBSERVE_PASSWORD=Complexpass#123
```

### Language Support

AIOBS supports 10 languages:
- English (en)
- French (fr)
- Spanish (es)
- German (de)
- Portuguese (pt)
- Italian (it)
- Chinese (zh)
- Japanese (ja)
- Korean (ko)
- Arabic (ar) - with RTL support

Set the default language via `DEFAULT_LANGUAGE` environment variable or let users choose via the UI.

## Docker Commands

### Basic Operations

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service_name]

# Restart a service
docker-compose restart [service_name]

# Rebuild and start
docker-compose up -d --build
```

### With Monitoring Profile

```bash
# Start with Prometheus and Grafana
docker-compose --profile monitoring up -d
```

### Resource Cleanup

```bash
# Stop and remove volumes
docker-compose down -v

# Remove all AIOBS images
docker rmi $(docker images | grep aiobs | awk '{print $3}')
```

## Health Checks

All services include health checks. Verify status with:

```bash
# Check all services
docker-compose ps

# Individual health checks
curl http://localhost:8000/health  # Visualization
curl http://localhost:3000/health  # Backend
curl http://localhost:8428/health  # VictoriaMetrics
curl http://localhost:5080/healthz # OpenObserve
```

## Scaling

### Horizontal Scaling

```bash
# Scale visualization service
docker-compose up -d --scale visualization=3
```

Note: When scaling, use a reverse proxy (nginx, traefik) for load balancing.

### Production Considerations

1. **Use external databases**: For production, consider managed services for VictoriaMetrics/OpenObserve
2. **Enable TLS**: Use traefik or nginx with SSL certificates
3. **Resource limits**: Set memory and CPU limits in docker-compose
4. **Secrets management**: Use Docker secrets or external vault

## Networking

All services communicate on the `aiobs-network` bridge network with subnet `172.28.0.0/16`.

### Exposing to External Network

For Traefik integration, labels are already configured:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.aiobs-viz.rule=Host(`aiobs.local`)"
```

## Volume Management

Data is persisted in Docker volumes:

- `victoriametrics-data`: Metrics time-series data
- `openobserve-data`: Logs and traces
- `redis-data`: Cache data
- `prometheus-data`: Prometheus TSDB
- `grafana-data`: Grafana dashboards and config

### Backup

```bash
# Backup volumes
docker run --rm -v aiobs_victoriametrics-data:/data -v $(pwd):/backup alpine tar czf /backup/vm-backup.tar.gz /data

# Restore
docker run --rm -v aiobs_victoriametrics-data:/data -v $(pwd):/backup alpine tar xzf /backup/vm-backup.tar.gz -C /
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs [service_name]

# Check resource usage
docker stats
```

### Database connection issues

```bash
# Verify network connectivity
docker-compose exec visualization ping victoriametrics
docker-compose exec backend ping openobserve
```

### Reset everything

```bash
docker-compose down -v
docker system prune -f
docker-compose up -d --build
```

## Architecture Diagram

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
│         │                   │                                    │
│         ▼                   ▼                                    │
│  ┌──────────────┐    ┌──────────────┐                           │
│  │VictoriaMetrics│   │ OpenObserve  │                           │
│  │   (Metrics)  │    │(Logs/Traces) │                           │
│  │   :8428      │    │   :5080      │                           │
│  └──────────────┘    └──────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
