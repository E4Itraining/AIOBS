# AIOBS API Reference

Complete API documentation for the AIOBS platform.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URLs](#base-urls)
- [Response Format](#response-format)
- [REST API Endpoints](#rest-api-endpoints)
  - [Dashboard](#dashboard)
  - [Metrics](#metrics)
  - [Profiles](#profiles)
  - [Internationalization](#internationalization)
  - [AI Assistant](#ai-assistant)
  - [Real-time](#real-time)
- [WebSocket API](#websocket-api)
- [Backend API](#backend-api)
- [Error Handling](#error-handling)

---

## Overview

AIOBS provides a comprehensive REST and WebSocket API for accessing observability data, cognitive metrics, causal analysis, and governance information.

### API Versions

| Component | Version | Base Path |
|-----------|---------|-----------|
| Visualization API | v1 | `/api/` |
| Backend API | v1 | `:3000/api/` |
| WebSocket | v1 | `/ws` |

---

## Authentication

Authentication is planned for production deployments. Currently, the API is open for development use.

**Future Authentication Methods:**
- API Key (Header: `X-API-Key`)
- JWT Bearer Token (Header: `Authorization: Bearer <token>`)
- OAuth 2.0 / OIDC

---

## Base URLs

| Environment | Visualization | Backend |
|-------------|--------------|---------|
| Development | `http://localhost:8000` | `http://localhost:3000` |
| Docker | `http://localhost:8000` | `http://backend:3000` |
| Production | `https://aiobs.your-domain.com` | Internal |

---

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message description"
}
```

---

## REST API Endpoints

### Dashboard

Base path: `/api/dashboard`

#### Get Dashboard Overview

```http
GET /api/dashboard/overview?hours=24
```

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `hours` | integer | 24 | Time range (1-720 hours) |

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_models": 12,
      "total_pipelines": 8,
      "total_endpoints": 45
    },
    "health": {
      "healthy": 10,
      "degraded": 1,
      "unhealthy": 1
    },
    "key_metrics": {
      "avg_trust_score": 0.87,
      "total_daily_inferences": 1500000,
      "total_daily_cost": 1250.50,
      "total_daily_carbon_kg": 15.2
    },
    "slo": {
      "compliance_pct": 98.5,
      "error_budget_remaining_pct": 45.2
    },
    "alerts": {
      "total": 5,
      "critical": 1,
      "warning": 2,
      "info": 2
    },
    "top_issues": [...],
    "trends": {
      "trust": "stable",
      "cost": "increasing",
      "carbon": "decreasing"
    }
  }
}
```

#### Get Services Health

```http
GET /api/dashboard/services?service_type=model
```

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `service_type` | string | null | Filter: model, pipeline, infrastructure |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "model-recommendation",
      "name": "Recommendation Model",
      "type": "model",
      "status": "healthy",
      "uptime_pct": 99.95,
      "error_rate_pct": 0.02,
      "latency_p99_ms": 125,
      "last_check": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Get Service Topology

```http
GET /api/dashboard/topology
```

Returns the dependency graph of services.

#### Get SLO Status

```http
GET /api/dashboard/slo
```

Returns SLO/SLI status across all services.

#### Get Cost Breakdown

```http
GET /api/dashboard/costs?days=30
```

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `days` | integer | 30 | Time range (1-365 days) |

#### Get Carbon Metrics

```http
GET /api/dashboard/carbon?days=30
```

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `days` | integer | 30 | Time range (1-365 days) |

#### Get Compliance Dashboard

```http
GET /api/dashboard/compliance
```

Returns governance and compliance status.

---

### Metrics

Base path: `/api/metrics`

#### Get Cognitive Metrics

```http
GET /api/metrics/cognitive/{model_id}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "model_id": "model-123",
    "drift": {
      "data_drift": 0.12,
      "concept_drift": 0.05,
      "prediction_drift": 0.08,
      "overall": 0.08,
      "status": "warning"
    },
    "reliability": {
      "calibration": 0.92,
      "stability": 0.95,
      "uncertainty": 0.88,
      "ood_detection": 0.90,
      "overall": 0.91
    },
    "hallucination": {
      "risk_level": "low",
      "grounding_score": 0.94,
      "factuality_index": 0.91
    },
    "degradation": {
      "trend": "stable",
      "rate_of_change": -0.02,
      "projected_impact": "minimal"
    },
    "trust": {
      "overall": 0.87,
      "components": {...}
    }
  }
}
```

#### Get Trust Score

```http
GET /api/metrics/trust/{model_id}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "model_id": "model-123",
    "overall_trust": 0.87,
    "components": {
      "drift_risk": 0.12,
      "reliability": 0.91,
      "hallucination_risk": 0.06,
      "degradation_risk": 0.08
    },
    "trend": "stable"
  }
}
```

#### Get Time Series

```http
GET /api/metrics/timeseries?metrics=trust_score,latency_p99&hours=24&granularity=hour
```

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `metrics` | string | required | Comma-separated metric names |
| `hours` | integer | 24 | Time range (1-720 hours) |
| `granularity` | string | hour | minute, hour, day |

**Response:**

```json
{
  "success": true,
  "data": {
    "trust_score": {
      "metric_name": "trust_score",
      "unit": "score",
      "points": [
        {"timestamp": "2024-01-15T00:00:00Z", "value": 0.85},
        {"timestamp": "2024-01-15T01:00:00Z", "value": 0.87}
      ]
    }
  }
}
```

#### Get Correlation Matrix

```http
GET /api/metrics/correlation?metrics=latency,error_rate,drift&hours=24
```

Returns correlation coefficients between specified metrics.

#### Get Anomalies

```http
GET /api/metrics/anomalies?hours=24&min_severity=low
```

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `hours` | integer | 24 | Time range (1-720 hours) |
| `min_severity` | string | low | Minimum severity: low, medium, high, critical |

#### Get Causal Graph

```http
GET /api/metrics/causal/graph/{scenario}
```

**Scenarios:**
- `drift_incident` - Causal graph for drift-related incidents
- `cost_spike` - Causal graph for cost anomalies
- `generic` - Generic causal graph

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "graph-123",
    "nodes": [
      {
        "id": "node-1",
        "type": "event",
        "name": "Data Source Change",
        "description": "Schema modification in upstream data",
        "impact_score": 0.85
      }
    ],
    "edges": [
      {
        "source": "node-1",
        "target": "node-2",
        "type": "causes",
        "weight": 0.9,
        "confidence": 0.85
      }
    ]
  }
}
```

#### Analyze Impact

```http
POST /api/metrics/impact/analyze?event_type=drift&affected_models=model-1,model-2&hours=24
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `event_type` | string | Type of event to analyze |
| `affected_models` | string | Comma-separated model IDs |
| `hours` | integer | Time window for analysis |

#### Get Impact Summary

```http
GET /api/metrics/impact/summary?hours=24
```

---

### Profiles

Base path: `/api/profiles`

#### List Profiles

```http
GET /api/profiles/list
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "tech_ml_engineer",
      "name": "Tech Ml Engineer",
      "category": "technical",
      "description": "Model performance, drift detection, reliability analysis"
    },
    {
      "id": "business_executive",
      "name": "Business Executive",
      "category": "business",
      "description": "High-level KPIs, business impact, costs"
    }
  ]
}
```

**Available Profiles:**

| Profile ID | Category | Description |
|------------|----------|-------------|
| `tech_ml_engineer` | technical | Model metrics, drift, reliability |
| `tech_devops` | technical | SLOs, topology, infrastructure |
| `tech_data_scientist` | technical | Data quality, experiments |
| `business_executive` | business | KPIs, impact, costs |
| `business_product` | business | Feature performance, user impact |
| `security_soc` | specialist | Threats, incidents, access |
| `compliance_legal` | specialist | Governance, audit trails |
| `sustainability_esg` | specialist | Carbon, energy, ESG |

#### Get Profile Dashboard

```http
GET /api/profiles/{profile_id}/dashboard
```

Returns dashboard widget configuration for a profile.

#### Get Profile Navigation

```http
GET /api/profiles/{profile_id}/navigation
```

Returns navigation menu items for a profile.

---

### Internationalization

Base path: `/api/i18n`

#### List Languages

```http
GET /api/i18n/languages
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "code": "en",
      "name": "English",
      "native": "English",
      "flag": "us",
      "rtl": false
    },
    {
      "code": "ar",
      "name": "Arabic",
      "native": "العربية",
      "flag": "sa",
      "rtl": true
    }
  ]
}
```

**Supported Languages:**

| Code | Language | RTL |
|------|----------|-----|
| en | English | No |
| fr | French | No |
| es | Spanish | No |
| de | German | No |
| pt | Portuguese | No |
| it | Italian | No |
| zh | Chinese | No |
| ja | Japanese | No |
| ko | Korean | No |
| ar | Arabic | Yes |

#### Get Translations

```http
GET /api/i18n/translations/{lang}
```

#### Set Language

```http
POST /api/i18n/set-language/{lang}
```

Sets language preference via cookie.

#### Get Current Language

```http
GET /api/i18n/current
```

Returns current language based on request context.

---

### AI Assistant

Base path: `/api/assistant`

#### Query Assistant

```http
POST /api/assistant/query
```

**Request Body:**

```json
{
  "query": "Why did the trust score drop?",
  "context": {"model_id": "model-123"},
  "language": "en"
}
```

**Response:**

```json
{
  "answer": "The Trust Score dropped due to increased drift...",
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

#### Get Automated Insights

```http
GET /api/assistant/insights?metric_type=drift&time_range=24h
```

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `metric_type` | string | null | Filter by metric type |
| `time_range` | string | 24h | Time range |

#### Get Recommendations

```http
GET /api/assistant/recommendations
```

Returns AI-powered recommendations for system improvement.

#### Explain Metric

```http
POST /api/assistant/explain/{metric_type}
```

**Supported Metrics:**
- `trust_score`
- `drift`
- `reliability`
- `hallucination`
- `degradation`
- `latency`
- `error_rate`
- `cost`
- `carbon`

#### Analyze Root Cause

```http
GET /api/assistant/root-cause/{incident_id}
```

Returns AI-powered root cause analysis for an incident.

---

### Real-time

Base path: `/api/realtime`

#### Get Connection Stats

```http
GET /api/realtime/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "total_connections": 42,
    "channels": {
      "metrics": 35,
      "alerts": 28,
      "events": 15,
      "cognitive": 20,
      "causal": 10,
      "all": 42
    }
  }
}
```

---

## WebSocket API

### Connection

```
ws://localhost:8000/ws?channels=metrics,alerts
```

**Query Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `channels` | string | all | Comma-separated channels |

**Available Channels:**

| Channel | Description |
|---------|-------------|
| `metrics` | Real-time metric updates (every 5s) |
| `alerts` | Alert notifications |
| `events` | System events |
| `cognitive` | Cognitive metrics updates (every 10s) |
| `causal` | Causal analysis updates |
| `all` | All channels combined |

### Client Messages

**Subscribe to Channel:**
```json
{"action": "subscribe", "channel": "cognitive"}
```

**Unsubscribe from Channel:**
```json
{"action": "unsubscribe", "channel": "alerts"}
```

**Ping (keep-alive):**
```json
{"action": "ping"}
```

### Server Messages

**Connection Confirmation:**
```json
{
  "type": "connected",
  "channels": ["metrics", "alerts"],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Metric Update:**
```json
{
  "type": "metric_update",
  "channel": "metrics",
  "timestamp": "2024-01-15T10:30:05Z",
  "data": {
    "trust_score": 0.87,
    "daily_inferences": 1500000,
    "daily_cost": 1250.50,
    "carbon_kg": 15.2,
    "latency_p99": 125,
    "error_rate": 0.002
  }
}
```

**Alert:**
```json
{
  "type": "alert",
  "channel": "alerts",
  "timestamp": "2024-01-15T10:30:10Z",
  "data": {
    "id": "alert-1234",
    "alert_type": "drift",
    "severity": "warning",
    "message": "Data drift detected in feature X",
    "service": "recommendation-model"
  }
}
```

**Cognitive Update:**
```json
{
  "type": "cognitive_update",
  "channel": "cognitive",
  "timestamp": "2024-01-15T10:30:15Z",
  "data": {
    "drift": {
      "detected": true,
      "score": 0.15,
      "type": "data"
    },
    "reliability": {
      "score": 0.91,
      "calibration": 0.93
    },
    "hallucination": {
      "risk": "low",
      "grounding_score": 0.94
    },
    "degradation": {
      "trend": "stable",
      "score": 0.08
    }
  }
}
```

**Pong Response:**
```json
{
  "type": "pong",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### JavaScript Example

```javascript
const ws = new WebSocket('ws://localhost:8000/ws?channels=metrics,alerts');

ws.onopen = () => {
  console.log('Connected to AIOBS');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch(data.type) {
    case 'metric_update':
      updateDashboard(data.data);
      break;
    case 'alert':
      showNotification(data.data);
      break;
    case 'cognitive_update':
      updateCognitiveMetrics(data.data);
      break;
  }
};

// Subscribe to additional channel
ws.send(JSON.stringify({
  action: 'subscribe',
  channel: 'cognitive'
}));

// Keep-alive ping
setInterval(() => {
  ws.send(JSON.stringify({ action: 'ping' }));
}, 30000);
```

---

## Backend API

The TypeScript backend exposes a minimal API on port 3000.

### Health Check

```http
GET http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

### API Info

```http
GET http://localhost:3000/api
```

**Response:**
```json
{
  "name": "AIOBS Platform",
  "version": "1.0.0",
  "engines": [
    "CognitiveEngine",
    "CausalEngine",
    "AuditEngine",
    "SLOMonitor"
  ]
}
```

### Root

```http
GET http://localhost:3000/
```

Returns platform information.

---

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized (future) |
| 403 | Forbidden (future) |
| 404 | Not Found |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### Common Errors

| Error | Description | Resolution |
|-------|-------------|------------|
| `Language not supported` | Invalid language code | Use supported language code |
| `Unknown profile` | Invalid profile ID | Use valid profile from `/api/profiles/list` |
| `Invalid time range` | Hours/days out of bounds | Use valid range |
| `Model not found` | Model ID doesn't exist | Verify model ID |

---

## Rate Limiting

Rate limiting is planned for production:

| Endpoint Type | Limit |
|--------------|-------|
| API Endpoints | 100 requests/minute |
| WebSocket Connections | 10 per IP |
| Assistant Queries | 20/minute |

---

## SDK Examples

### Python

```python
import requests
import websockets
import asyncio

# REST API
response = requests.get('http://localhost:8000/api/dashboard/overview')
data = response.json()

# WebSocket
async def listen():
    async with websockets.connect('ws://localhost:8000/ws?channels=all') as ws:
        async for message in ws:
            print(message)

asyncio.run(listen())
```

### JavaScript/TypeScript

```typescript
// REST API
const response = await fetch('/api/dashboard/overview');
const data = await response.json();

// WebSocket
const ws = new WebSocket('ws://localhost:8000/ws?channels=all');
ws.onmessage = (event) => console.log(JSON.parse(event.data));
```

---

## OpenAPI Documentation

Interactive API documentation is available at:

- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json
