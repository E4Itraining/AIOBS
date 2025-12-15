/**
 * AIOBS Backend Server
 * Express.js API server with WebSocket support
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

// Import routes
import { dashboardRouter } from './api/routes/dashboard';
import { metricsRouter } from './api/routes/metrics';
import { servicesRouter } from './api/routes/services';
import { alertsRouter } from './api/routes/alerts';
import { cognitiveRouter } from './api/routes/cognitive';
import { causalRouter } from './api/routes/causal';
import { sloRouter } from './api/routes/slo';
import { ingestionRouter } from './api/routes/ingestion';

// Import services
import { DataStore } from './api/services/data-store';
import { RealtimeService } from './api/services/realtime';

const PORT = parseInt(process.env.PORT || '3000', 10);
const VERSION = '1.0.0';

// Initialize Express app
const app: Application = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.headers['x-request-id'] as string);
  next();
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Initialize data store
const dataStore = DataStore.getInstance();

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    version: VERSION,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      api: 'healthy',
      dataStore: dataStore.isReady() ? 'healthy' : 'initializing',
    },
  });
});

// Platform info
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'AIOBS Platform API',
    version: VERSION,
    description: 'AI Observability Hub - Trust Control Layer for AI Systems',
    documentation: '/api/docs',
    endpoints: {
      health: '/health',
      dashboard: '/api/dashboard',
      services: '/api/services',
      metrics: '/api/metrics',
      alerts: '/api/alerts',
      cognitive: '/api/cognitive',
      causal: '/api/causal',
      slo: '/api/slo',
      ingestion: '/api/ingest',
    },
  });
});

// API routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api/services', servicesRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/cognitive', cognitiveRouter);
app.use('/api/causal', causalRouter);
app.use('/api/slo', sloRouter);
app.use('/api/ingest', ingestionRouter);

// API docs placeholder
app.get('/api/docs', (req: Request, res: Response) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'AIOBS API',
      version: VERSION,
      description: 'AI Observability Hub REST API',
    },
    paths: {
      '/api/dashboard/overview': { get: { summary: 'Get system overview' } },
      '/api/dashboard/kpis': { get: { summary: 'Get KPI metrics' } },
      '/api/services': { get: { summary: 'List all services' } },
      '/api/services/{id}': { get: { summary: 'Get service details' } },
      '/api/metrics/cognitive/{modelId}': { get: { summary: 'Get cognitive metrics' } },
      '/api/alerts': { get: { summary: 'List alerts' } },
      '/api/slo': { get: { summary: 'List SLOs' } },
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString(),
  });
});

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });
const realtimeService = RealtimeService.getInstance(wss);

wss.on('connection', (ws: WebSocket, req) => {
  console.log('WebSocket client connected');

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    timestamp: new Date().toISOString(),
    message: 'Connected to AIOBS real-time feed',
  }));

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      realtimeService.handleMessage(ws, message);
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    realtimeService.removeClient(ws);
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    AIOBS Platform v${VERSION}                     ║
║              AI Observability Hub - Backend API              ║
╠══════════════════════════════════════════════════════════════╣
║  HTTP Server:    http://localhost:${PORT}                       ║
║  WebSocket:      ws://localhost:${PORT}/ws                      ║
║  Health Check:   http://localhost:${PORT}/health                ║
║  API Docs:       http://localhost:${PORT}/api/docs              ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Initialize demo data
  dataStore.initialize();
});

export { app, server, wss };
