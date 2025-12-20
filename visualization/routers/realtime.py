"""
AIOBS Real-time WebSocket API
Game-changer feature: Live updates for dashboards and alerts
"""

import asyncio
import json
import random
from datetime import datetime
from typing import Dict, Optional, Set

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["realtime"])


class ConnectionManager:
    """
    WebSocket connection manager for real-time updates

    Features:
    - Multi-channel subscription (metrics, alerts, events)
    - Automatic reconnection support
    - Broadcasting to specific channels
    - Connection health monitoring
    """

    def __init__(self):
        # Channel -> Set of WebSocket connections
        self.channels: Dict[str, Set[WebSocket]] = {
            "metrics": set(),
            "alerts": set(),
            "events": set(),
            "cognitive": set(),
            "causal": set(),
            "all": set(),
        }
        # WebSocket -> Set of subscribed channels
        self.subscriptions: Dict[WebSocket, Set[str]] = {}

    async def connect(self, websocket: WebSocket, channels: list = None):
        """Accept connection and subscribe to channels"""
        await websocket.accept()

        channels = channels or ["all"]
        self.subscriptions[websocket] = set(channels)

        for channel in channels:
            if channel in self.channels:
                self.channels[channel].add(websocket)

        # Send welcome message
        await websocket.send_json(
            {"type": "connected", "channels": channels, "timestamp": datetime.utcnow().isoformat()}
        )

    def disconnect(self, websocket: WebSocket):
        """Remove connection from all channels"""
        if websocket in self.subscriptions:
            for channel in self.subscriptions[websocket]:
                if channel in self.channels:
                    self.channels[channel].discard(websocket)
            del self.subscriptions[websocket]

    async def subscribe(self, websocket: WebSocket, channel: str):
        """Subscribe to a specific channel"""
        if channel in self.channels:
            self.channels[channel].add(websocket)
            if websocket in self.subscriptions:
                self.subscriptions[websocket].add(channel)

    async def unsubscribe(self, websocket: WebSocket, channel: str):
        """Unsubscribe from a specific channel"""
        if channel in self.channels:
            self.channels[channel].discard(websocket)
            if websocket in self.subscriptions:
                self.subscriptions[websocket].discard(channel)

    async def broadcast(self, channel: str, message: dict):
        """Broadcast message to all connections in a channel"""
        if channel not in self.channels:
            return

        disconnected = set()
        message["timestamp"] = datetime.utcnow().isoformat()
        message["channel"] = channel

        for websocket in self.channels[channel]:
            try:
                await websocket.send_json(message)
            except:
                disconnected.add(websocket)

        # Clean up disconnected clients
        for ws in disconnected:
            self.disconnect(ws)

    async def broadcast_all(self, message: dict):
        """Broadcast to all connected clients"""
        await self.broadcast("all", message)

    def get_stats(self) -> dict:
        """Get connection statistics"""
        return {
            "total_connections": len(self.subscriptions),
            "channels": {
                channel: len(connections) for channel, connections in self.channels.items()
            },
        }


# Global connection manager
manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, channels: str = Query(default="all")):
    """
    WebSocket endpoint for real-time updates

    Query params:
        channels: Comma-separated list of channels to subscribe
                  (metrics, alerts, events, cognitive, causal, all)

    Message types received:
        - subscribe: {"action": "subscribe", "channel": "metrics"}
        - unsubscribe: {"action": "unsubscribe", "channel": "alerts"}
        - ping: {"action": "ping"}

    Message types sent:
        - connected: Initial connection confirmation
        - metric_update: Real-time metric updates
        - alert: New alert notifications
        - event: System events
        - cognitive_update: Cognitive metrics updates
        - causal_update: Causal analysis updates
        - pong: Ping response
    """
    channel_list = [c.strip() for c in channels.split(",")]
    await manager.connect(websocket, channel_list)

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "subscribe":
                channel = data.get("channel")
                await manager.subscribe(websocket, channel)
                await websocket.send_json({"type": "subscribed", "channel": channel})

            elif action == "unsubscribe":
                channel = data.get("channel")
                await manager.unsubscribe(websocket, channel)
                await websocket.send_json({"type": "unsubscribed", "channel": channel})

            elif action == "ping":
                await websocket.send_json(
                    {"type": "pong", "timestamp": datetime.utcnow().isoformat()}
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.get("/api/realtime/stats")
async def get_realtime_stats():
    """Get real-time connection statistics"""
    return {"success": True, "data": manager.get_stats()}


# =============================================================================
# Background Tasks for Real-time Updates
# =============================================================================


async def metric_broadcaster():
    """
    Background task to broadcast metric updates

    In production, this would read from VictoriaMetrics/Redis
    """
    while True:
        await asyncio.sleep(5)  # Update every 5 seconds

        # Simulated metric update
        update = {
            "type": "metric_update",
            "data": {
                "trust_score": round(0.75 + random.uniform(-0.05, 0.05), 3),
                "daily_inferences": random.randint(1000000, 2000000),
                "daily_cost": round(random.uniform(1000, 2000), 2),
                "carbon_kg": round(random.uniform(10, 20), 2),
                "latency_p99": random.randint(50, 150),
                "error_rate": round(random.uniform(0.001, 0.01), 4),
            },
        }
        await manager.broadcast("metrics", update)
        await manager.broadcast("all", update)


async def alert_broadcaster():
    """
    Background task to broadcast alerts

    In production, this would read from alerting system
    """
    alert_types = ["drift", "reliability", "latency", "error_rate", "cost"]
    severities = ["info", "warning", "critical"]

    while True:
        await asyncio.sleep(random.randint(30, 120))  # Random interval

        # Simulated alert (only sometimes)
        if random.random() > 0.7:
            alert = {
                "type": "alert",
                "data": {
                    "id": f"alert-{random.randint(1000, 9999)}",
                    "alert_type": random.choice(alert_types),
                    "severity": random.choice(severities),
                    "message": "Simulated alert for demonstration",
                    "service": f"service-{random.randint(1, 5)}",
                    "timestamp": datetime.utcnow().isoformat(),
                },
            }
            await manager.broadcast("alerts", alert)
            await manager.broadcast("all", alert)


async def cognitive_broadcaster():
    """
    Background task to broadcast cognitive metrics updates
    """
    while True:
        await asyncio.sleep(10)  # Update every 10 seconds

        update = {
            "type": "cognitive_update",
            "data": {
                "drift": {
                    "detected": random.random() > 0.8,
                    "score": round(random.uniform(0, 0.3), 3),
                    "type": random.choice(["data", "concept", "prediction"]),
                },
                "reliability": {
                    "score": round(random.uniform(0.8, 0.99), 3),
                    "calibration": round(random.uniform(0.85, 0.98), 3),
                },
                "hallucination": {
                    "risk": random.choice(["low", "medium", "high"]),
                    "grounding_score": round(random.uniform(0.7, 0.95), 3),
                },
                "degradation": {
                    "trend": random.choice(["improving", "stable", "degrading"]),
                    "score": round(random.uniform(0, 0.2), 3),
                },
            },
        }
        await manager.broadcast("cognitive", update)


# Store background tasks
_background_tasks = []


def start_background_tasks():
    """Start all background broadcaster tasks"""
    global _background_tasks
    _background_tasks = [
        asyncio.create_task(metric_broadcaster()),
        asyncio.create_task(alert_broadcaster()),
        asyncio.create_task(cognitive_broadcaster()),
    ]


def stop_background_tasks():
    """Stop all background broadcaster tasks"""
    global _background_tasks
    for task in _background_tasks:
        task.cancel()
    _background_tasks = []
