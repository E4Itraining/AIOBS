"""
AIOBS Data Injection Monitoring Router
=======================================
Real-time monitoring of data injection pipelines to Victoria Metrics,
OpenObserve, and Redis backends.
"""

import asyncio
import os
from datetime import datetime, timedelta
from typing import Any, Optional

import aiohttp
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

from ..models.schemas import APIResponse

router = APIRouter(prefix="/api/monitoring/injection", tags=["data-injection-monitoring"])

# ============================================================================
# Configuration
# ============================================================================

VICTORIA_METRICS_URL = os.getenv("VICTORIA_METRICS_URL", "http://victoriametrics:8428")
OPENOBSERVE_URL = os.getenv("OPENOBSERVE_URL", "http://openobserve:5080")
OPENOBSERVE_USER = os.getenv("OPENOBSERVE_USER", "admin@aiobs.local")
OPENOBSERVE_PASSWORD = os.getenv("OPENOBSERVE_PASSWORD", "Complexpass#123")
OPENOBSERVE_ORG = os.getenv("OPENOBSERVE_ORG", "default")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")


# ============================================================================
# Health Check Endpoints
# ============================================================================

@router.get("/health")
async def get_injection_health() -> APIResponse:
    """
    Get health status of all data injection backends.
    """
    health = {
        "victoria_metrics": await _check_victoria_metrics_health(),
        "openobserve": await _check_openobserve_health(),
        "redis": await _check_redis_health(),
    }

    all_healthy = all(h["status"] == "healthy" for h in health.values())

    return APIResponse(
        success=True,
        data={
            "overall_status": "healthy" if all_healthy else "degraded",
            "backends": health,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


async def _check_victoria_metrics_health() -> dict[str, Any]:
    """Check Victoria Metrics health."""
    try:
        async with aiohttp.ClientSession() as session:
            url = f"{VICTORIA_METRICS_URL}/-/healthy"
            async with session.get(url, timeout=5) as resp:
                if resp.status == 200:
                    return {"status": "healthy", "url": VICTORIA_METRICS_URL}
                return {"status": "unhealthy", "error": f"HTTP {resp.status}"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


async def _check_openobserve_health() -> dict[str, Any]:
    """Check OpenObserve health."""
    try:
        async with aiohttp.ClientSession() as session:
            url = f"{OPENOBSERVE_URL}/healthz"
            async with session.get(url, timeout=5) as resp:
                if resp.status == 200:
                    return {"status": "healthy", "url": OPENOBSERVE_URL}
                return {"status": "unhealthy", "error": f"HTTP {resp.status}"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


async def _check_redis_health() -> dict[str, Any]:
    """Check Redis health."""
    try:
        import redis.asyncio as redis_async

        client = redis_async.from_url(REDIS_URL)
        result = await client.ping()
        await client.close()
        if result:
            return {"status": "healthy", "url": REDIS_URL}
        return {"status": "unhealthy", "error": "PING failed"}
    except ImportError:
        return {"status": "unknown", "error": "redis package not installed"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


# ============================================================================
# Victoria Metrics Statistics
# ============================================================================

@router.get("/victoria-metrics/stats")
async def get_victoria_metrics_stats(
    hours: int = Query(24, ge=1, le=168, description="Time range in hours"),
) -> APIResponse:
    """
    Get Victoria Metrics ingestion statistics.
    """
    try:
        async with aiohttp.ClientSession() as session:
            stats = {}

            # Get total time series count
            url = f"{VICTORIA_METRICS_URL}/api/v1/status/tsdb"
            async with session.get(url, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    stats["tsdb"] = data.get("data", {})

            # Get active time series
            url = f"{VICTORIA_METRICS_URL}/api/v1/query"
            params = {"query": "count({__name__=~'.+'})"}
            async with session.get(url, params=params, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    result = data.get("data", {}).get("result", [])
                    if result:
                        stats["active_series"] = int(float(result[0].get("value", [0, 0])[1]))

            # Get ingestion rate (metrics per second)
            params = {"query": "sum(rate(vm_rows_inserted_total[5m]))"}
            async with session.get(url, params=params, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    result = data.get("data", {}).get("result", [])
                    if result:
                        stats["ingestion_rate_per_sec"] = float(result[0].get("value", [0, 0])[1])

            # Get AIOBS-specific metrics count
            params = {"query": 'count({__name__=~"aiobs_.*"})'}
            async with session.get(url, params=params, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    result = data.get("data", {}).get("result", [])
                    if result:
                        stats["aiobs_metrics_count"] = int(float(result[0].get("value", [0, 0])[1]))

            # Get model-specific metrics
            model_metrics = await _get_model_metrics_summary(session)
            stats["models"] = model_metrics

            return APIResponse(
                success=True,
                data={
                    "backend": "victoria_metrics",
                    "url": VICTORIA_METRICS_URL,
                    "stats": stats,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

    except Exception as e:
        return APIResponse(success=False, error=str(e))


async def _get_model_metrics_summary(session: aiohttp.ClientSession) -> list[dict[str, Any]]:
    """Get summary of metrics per model."""
    models = []

    url = f"{VICTORIA_METRICS_URL}/api/v1/query"
    params = {"query": 'group by (model_id) ({__name__=~"aiobs_.*"})'}

    try:
        async with session.get(url, params=params, timeout=10) as resp:
            if resp.status == 200:
                data = await resp.json()
                for result in data.get("data", {}).get("result", []):
                    model_id = result.get("metric", {}).get("model_id")
                    if model_id:
                        models.append({"model_id": model_id})
    except Exception:
        pass

    return models


# ============================================================================
# OpenObserve Statistics
# ============================================================================

@router.get("/openobserve/stats")
async def get_openobserve_stats(
    hours: int = Query(24, ge=1, le=168, description="Time range in hours"),
) -> APIResponse:
    """
    Get OpenObserve ingestion statistics.
    """
    try:
        async with aiohttp.ClientSession() as session:
            auth = aiohttp.BasicAuth(OPENOBSERVE_USER, OPENOBSERVE_PASSWORD)
            stats = {}

            # Get streams list
            url = f"{OPENOBSERVE_URL}/api/{OPENOBSERVE_ORG}/streams"
            async with session.get(url, auth=auth, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    streams = data.get("list", [])
                    stats["streams"] = [
                        {
                            "name": s.get("name"),
                            "stream_type": s.get("stream_type"),
                            "storage_size_mb": s.get("storage_size", 0) / (1024 * 1024),
                            "doc_count": s.get("doc_num", 0),
                        }
                        for s in streams
                        if s.get("name", "").startswith("aiobs")
                    ]
                    stats["total_streams"] = len(streams)
                    stats["aiobs_streams"] = len(stats["streams"])

            # Get recent log count per stream
            end_time = int(datetime.utcnow().timestamp() * 1_000_000)
            start_time = end_time - (hours * 3600 * 1_000_000)

            for stream in stats.get("streams", []):
                stream_name = stream["name"]
                query = {
                    "query": {
                        "sql": f'SELECT COUNT(*) as count FROM "{stream_name}"',
                        "start_time": start_time,
                        "end_time": end_time,
                        "from": 0,
                        "size": 0,
                    }
                }

                url = f"{OPENOBSERVE_URL}/api/{OPENOBSERVE_ORG}/_search"
                try:
                    async with session.post(url, json=query, auth=auth, timeout=10) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            stream["recent_docs"] = data.get("total", 0)
                except Exception:
                    stream["recent_docs"] = "N/A"

            return APIResponse(
                success=True,
                data={
                    "backend": "openobserve",
                    "url": OPENOBSERVE_URL,
                    "organization": OPENOBSERVE_ORG,
                    "time_range_hours": hours,
                    "stats": stats,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

    except Exception as e:
        return APIResponse(success=False, error=str(e))


# ============================================================================
# Redis Statistics
# ============================================================================

@router.get("/redis/stats")
async def get_redis_stats() -> APIResponse:
    """
    Get Redis event queue statistics.
    """
    try:
        import redis.asyncio as redis_async

        client = redis_async.from_url(REDIS_URL)
        stats = {}

        # Get INFO
        info = await client.info()
        stats["memory"] = {
            "used_memory_mb": info.get("used_memory", 0) / (1024 * 1024),
            "used_memory_peak_mb": info.get("used_memory_peak", 0) / (1024 * 1024),
            "maxmemory_mb": info.get("maxmemory", 0) / (1024 * 1024),
        }
        stats["clients"] = {
            "connected": info.get("connected_clients", 0),
        }
        stats["keyspace"] = {
            "total_keys": info.get("db0", {}).get("keys", 0) if isinstance(info.get("db0"), dict) else 0,
        }

        # Get AIOBS-specific keys
        aiobs_keys = []
        async for key in client.scan_iter(match="aiobs:*", count=100):
            key_str = key.decode() if isinstance(key, bytes) else key
            key_type = await client.type(key)
            key_type_str = key_type.decode() if isinstance(key_type, bytes) else key_type

            key_info = {"key": key_str, "type": key_type_str}

            if key_type_str == "list":
                key_info["length"] = await client.llen(key)
            elif key_type_str == "set":
                key_info["cardinality"] = await client.scard(key)
            elif key_type_str == "hash":
                key_info["fields"] = await client.hlen(key)
            elif key_type_str == "stream":
                key_info["length"] = await client.xlen(key)

            aiobs_keys.append(key_info)

        stats["aiobs_keys"] = aiobs_keys

        # Get pub/sub channels
        channels = await client.pubsub_channels("aiobs:*")
        stats["pubsub_channels"] = [c.decode() if isinstance(c, bytes) else c for c in channels]

        await client.close()

        return APIResponse(
            success=True,
            data={
                "backend": "redis",
                "url": REDIS_URL,
                "stats": stats,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

    except ImportError:
        return APIResponse(success=False, error="redis package not installed")
    except Exception as e:
        return APIResponse(success=False, error=str(e))


# ============================================================================
# Real-time Metrics Query
# ============================================================================

@router.get("/metrics/realtime")
async def get_realtime_metrics(
    metric_name: str = Query(..., description="Metric name (e.g., aiobs_inference_latency_ms)"),
    model_id: Optional[str] = Query(None, description="Filter by model ID"),
    minutes: int = Query(15, ge=1, le=60, description="Time range in minutes"),
) -> APIResponse:
    """
    Get real-time metric values from Victoria Metrics.
    """
    try:
        async with aiohttp.ClientSession() as session:
            # Build query
            if model_id:
                query = f'{metric_name}{{model_id="{model_id}"}}'
            else:
                query = metric_name

            # Query range
            end = datetime.utcnow()
            start = end - timedelta(minutes=minutes)

            url = f"{VICTORIA_METRICS_URL}/api/v1/query_range"
            params = {
                "query": query,
                "start": start.isoformat() + "Z",
                "end": end.isoformat() + "Z",
                "step": "15s",
            }

            async with session.get(url, params=params, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    results = data.get("data", {}).get("result", [])

                    formatted_results = []
                    for result in results:
                        formatted_results.append({
                            "metric": result.get("metric", {}),
                            "values": [
                                {
                                    "timestamp": datetime.fromtimestamp(v[0]).isoformat(),
                                    "value": float(v[1]),
                                }
                                for v in result.get("values", [])
                            ],
                        })

                    return APIResponse(
                        success=True,
                        data={
                            "metric_name": metric_name,
                            "model_id": model_id,
                            "time_range_minutes": minutes,
                            "results": formatted_results,
                            "timestamp": datetime.utcnow().isoformat(),
                        },
                    )
                else:
                    text = await resp.text()
                    return APIResponse(success=False, error=f"Query failed: {resp.status} - {text}")

    except Exception as e:
        return APIResponse(success=False, error=str(e))


# ============================================================================
# Ingestion Rate Monitoring
# ============================================================================

@router.get("/rate")
async def get_ingestion_rate(
    minutes: int = Query(5, ge=1, le=60, description="Time window in minutes"),
) -> APIResponse:
    """
    Get current ingestion rates across all backends.
    """
    try:
        async with aiohttp.ClientSession() as session:
            rates = {}

            # Victoria Metrics ingestion rate
            url = f"{VICTORIA_METRICS_URL}/api/v1/query"

            # Metrics per second
            params = {"query": f"sum(rate(vm_rows_inserted_total[{minutes}m]))"}
            async with session.get(url, params=params, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    result = data.get("data", {}).get("result", [])
                    if result:
                        rates["metrics_per_second"] = round(float(result[0].get("value", [0, 0])[1]), 2)

            # Bytes per second
            params = {"query": f"sum(rate(vm_rows_inserted_bytes_total[{minutes}m]))"}
            async with session.get(url, params=params, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    result = data.get("data", {}).get("result", [])
                    if result:
                        rates["bytes_per_second"] = round(float(result[0].get("value", [0, 0])[1]), 2)

            # AIOBS metrics rate
            params = {"query": f'sum(rate({{__name__=~"aiobs_.*"}}[{minutes}m]))'}
            async with session.get(url, params=params, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    result = data.get("data", {}).get("result", [])
                    if result:
                        rates["aiobs_metrics_per_second"] = round(float(result[0].get("value", [0, 0])[1]), 2)

            return APIResponse(
                success=True,
                data={
                    "time_window_minutes": minutes,
                    "rates": rates,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

    except Exception as e:
        return APIResponse(success=False, error=str(e))


# ============================================================================
# WebSocket for Real-time Updates
# ============================================================================

@router.websocket("/ws/live")
async def websocket_live_monitoring(websocket: WebSocket):
    """
    WebSocket endpoint for real-time monitoring updates.
    Sends health and rate updates every 5 seconds.
    """
    await websocket.accept()

    try:
        while True:
            async with aiohttp.ClientSession() as session:
                update = {
                    "type": "monitoring_update",
                    "timestamp": datetime.utcnow().isoformat(),
                    "health": {
                        "victoria_metrics": await _check_victoria_metrics_health(),
                        "openobserve": await _check_openobserve_health(),
                        "redis": await _check_redis_health(),
                    },
                    "rates": {},
                }

                # Get ingestion rate
                url = f"{VICTORIA_METRICS_URL}/api/v1/query"
                params = {"query": "sum(rate(vm_rows_inserted_total[1m]))"}
                try:
                    async with session.get(url, params=params, timeout=5) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            result = data.get("data", {}).get("result", [])
                            if result:
                                update["rates"]["metrics_per_second"] = round(
                                    float(result[0].get("value", [0, 0])[1]), 2
                                )
                except Exception:
                    pass

                await websocket.send_json(update)

            await asyncio.sleep(5)

    except WebSocketDisconnect:
        pass
    except Exception:
        await websocket.close()


# ============================================================================
# Dashboard Page
# ============================================================================

@router.get("/dashboard", response_class=HTMLResponse)
async def get_monitoring_dashboard():
    """
    Serve the data injection monitoring dashboard HTML page.
    """
    return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AIOBS - Data Injection Monitoring</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .status-healthy { color: #10b981; }
        .status-degraded { color: #f59e0b; }
        .status-unhealthy { color: #ef4444; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body class="bg-gray-900 text-white min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <header class="mb-8">
            <h1 class="text-3xl font-bold mb-2">Data Injection Monitoring</h1>
            <p class="text-gray-400">Real-time monitoring of Victoria Metrics, OpenObserve, and Redis</p>
            <div id="connection-status" class="mt-2 text-sm">
                <span class="pulse">Connecting...</span>
            </div>
        </header>

        <!-- Health Status Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div id="vm-health" class="bg-gray-800 rounded-lg p-6">
                <h3 class="text-lg font-semibold mb-2">Victoria Metrics</h3>
                <div class="status text-2xl font-bold">--</div>
                <div class="text-gray-400 text-sm mt-2">Time-series metrics</div>
            </div>
            <div id="oo-health" class="bg-gray-800 rounded-lg p-6">
                <h3 class="text-lg font-semibold mb-2">OpenObserve</h3>
                <div class="status text-2xl font-bold">--</div>
                <div class="text-gray-400 text-sm mt-2">Logs & traces</div>
            </div>
            <div id="redis-health" class="bg-gray-800 rounded-lg p-6">
                <h3 class="text-lg font-semibold mb-2">Redis</h3>
                <div class="status text-2xl font-bold">--</div>
                <div class="text-gray-400 text-sm mt-2">Events & pub/sub</div>
            </div>
        </div>

        <!-- Ingestion Rate -->
        <div class="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 class="text-lg font-semibold mb-4">Ingestion Rate</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <div class="text-3xl font-bold text-blue-400" id="rate-metrics">--</div>
                    <div class="text-gray-400 text-sm">metrics/sec</div>
                </div>
                <div>
                    <div class="text-3xl font-bold text-green-400" id="rate-bytes">--</div>
                    <div class="text-gray-400 text-sm">KB/sec</div>
                </div>
                <div>
                    <div class="text-3xl font-bold text-purple-400" id="rate-aiobs">--</div>
                    <div class="text-gray-400 text-sm">AIOBS metrics/sec</div>
                </div>
                <div>
                    <div class="text-3xl font-bold text-yellow-400" id="last-update">--</div>
                    <div class="text-gray-400 text-sm">last update</div>
                </div>
            </div>
        </div>

        <!-- Metrics Chart -->
        <div class="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 class="text-lg font-semibold mb-4">Ingestion Rate (Last 15 minutes)</h3>
            <canvas id="rateChart" height="100"></canvas>
        </div>

        <!-- Backend Stats -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-gray-800 rounded-lg p-6">
                <h3 class="text-lg font-semibold mb-4">Victoria Metrics Stats</h3>
                <div id="vm-stats" class="space-y-2 text-sm">
                    <div class="text-gray-400">Loading...</div>
                </div>
            </div>
            <div class="bg-gray-800 rounded-lg p-6">
                <h3 class="text-lg font-semibold mb-4">OpenObserve Streams</h3>
                <div id="oo-stats" class="space-y-2 text-sm">
                    <div class="text-gray-400">Loading...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const rateHistory = [];
        const maxPoints = 60;
        let chart;

        // Initialize chart
        const ctx = document.getElementById('rateChart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Metrics/sec',
                    data: [],
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: { display: true, grid: { color: 'rgba(255,255,255,0.1)' } },
                    y: { display: true, grid: { color: 'rgba(255,255,255,0.1)' }, beginAtZero: true }
                },
                plugins: { legend: { display: false } }
            }
        });

        function updateHealth(elementId, status) {
            const el = document.querySelector(`#${elementId} .status`);
            el.textContent = status.status.toUpperCase();
            el.className = 'status text-2xl font-bold status-' + status.status;
        }

        function formatTime(isoString) {
            return new Date(isoString).toLocaleTimeString();
        }

        // WebSocket connection
        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const ws = new WebSocket(`${protocol}//${window.location.host}/api/monitoring/injection/ws/live`);

            ws.onopen = () => {
                document.getElementById('connection-status').innerHTML =
                    '<span class="text-green-400">Connected</span>';
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);

                // Update health
                updateHealth('vm-health', data.health.victoria_metrics);
                updateHealth('oo-health', data.health.openobserve);
                updateHealth('redis-health', data.health.redis);

                // Update rates
                if (data.rates.metrics_per_second !== undefined) {
                    document.getElementById('rate-metrics').textContent =
                        data.rates.metrics_per_second.toFixed(1);

                    // Update chart
                    rateHistory.push({
                        time: formatTime(data.timestamp),
                        value: data.rates.metrics_per_second
                    });
                    if (rateHistory.length > maxPoints) rateHistory.shift();

                    chart.data.labels = rateHistory.map(p => p.time);
                    chart.data.datasets[0].data = rateHistory.map(p => p.value);
                    chart.update('none');
                }

                document.getElementById('last-update').textContent = formatTime(data.timestamp);
            };

            ws.onclose = () => {
                document.getElementById('connection-status').innerHTML =
                    '<span class="text-red-400">Disconnected - Reconnecting...</span>';
                setTimeout(connectWebSocket, 3000);
            };

            ws.onerror = () => ws.close();
        }

        // Fetch detailed stats
        async function fetchStats() {
            try {
                const vmResp = await fetch('/api/monitoring/injection/victoria-metrics/stats');
                const vmData = await vmResp.json();
                if (vmData.success) {
                    const stats = vmData.data.stats;
                    document.getElementById('vm-stats').innerHTML = `
                        <div class="flex justify-between"><span>Active Series:</span><span>${stats.active_series || 'N/A'}</span></div>
                        <div class="flex justify-between"><span>AIOBS Metrics:</span><span>${stats.aiobs_metrics_count || 'N/A'}</span></div>
                        <div class="flex justify-between"><span>Ingestion Rate:</span><span>${(stats.ingestion_rate_per_sec || 0).toFixed(1)}/s</span></div>
                        <div class="flex justify-between"><span>Models Tracked:</span><span>${(stats.models || []).length}</span></div>
                    `;
                }

                const ooResp = await fetch('/api/monitoring/injection/openobserve/stats');
                const ooData = await ooResp.json();
                if (ooData.success) {
                    const streams = ooData.data.stats.streams || [];
                    document.getElementById('oo-stats').innerHTML = streams.map(s => `
                        <div class="flex justify-between">
                            <span>${s.name}</span>
                            <span>${s.doc_count.toLocaleString()} docs</span>
                        </div>
                    `).join('') || '<div class="text-gray-400">No AIOBS streams found</div>';
                }

                const rateResp = await fetch('/api/monitoring/injection/rate');
                const rateData = await rateResp.json();
                if (rateData.success) {
                    const rates = rateData.data.rates;
                    if (rates.bytes_per_second) {
                        document.getElementById('rate-bytes').textContent =
                            (rates.bytes_per_second / 1024).toFixed(1);
                    }
                    if (rates.aiobs_metrics_per_second) {
                        document.getElementById('rate-aiobs').textContent =
                            rates.aiobs_metrics_per_second.toFixed(1);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch stats:', e);
            }
        }

        // Initialize
        connectWebSocket();
        fetchStats();
        setInterval(fetchStats, 30000);
    </script>
</body>
</html>
"""
