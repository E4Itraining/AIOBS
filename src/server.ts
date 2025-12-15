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

const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_PORT_ATTEMPTS = 10;
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

// Server and WebSocket instances (initialized in startServer)
let server: ReturnType<typeof createServer>;
let wss: WebSocketServer;

// Function to check if a port is available
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const testServer = createServer();
    testServer.once('error', () => {
      resolve(false);
    });
    testServer.once('listening', () => {
      testServer.close(() => resolve(true));
    });
    testServer.listen(port, '0.0.0.0');
  });
}

// Function to find an available port starting from the default
async function findAvailablePort(startPort: number): Promise<number> {
  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt++) {
    const port = startPort + attempt;
    if (await isPortAvailable(port)) {
      return port;
    }
    console.log(`Port ${port} is in use, trying port ${port + 1}...`);
  }
  throw new Error(`Could not find an available port after ${MAX_PORT_ATTEMPTS} attempts`);
}

// Function to initialize and start the server
async function startServer(): Promise<void> {
  try {
    const port = await findAvailablePort(DEFAULT_PORT);

    // Create HTTP server
    server = createServer(app);

    // Initialize WebSocket server
    wss = new WebSocketServer({ server, path: '/ws' });
    const realtimeService = RealtimeService.getInstance(wss);

    wss.on('connection', (ws: WebSocket) => {
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

    // Handle server errors
    server.on('error', (err: NodeJS.ErrnoException) => {
      console.error('Server error:', err);
      process.exit(1);
    });

    // Start listening
    server.listen(port, '0.0.0.0', () => {
      const portStr = port.toString().padEnd(5, ' ');
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    AIOBS Platform v${VERSION}                     ║
║              AI Observability Hub - Backend API              ║
╠══════════════════════════════════════════════════════════════╣
║  HTTP Server:    http://localhost:${portStr}                      ║
║  WebSocket:      ws://localhost:${portStr}/ws                     ║
║  Health Check:   http://localhost:${portStr}/health               ║
║  API Docs:       http://localhost:${portStr}/api/docs             ║
╚══════════════════════════════════════════════════════════════╝
      `);

      // Initialize demo data
      dataStore.initialize();
    });
  } catch (err) {
    console.error(`\nError: ${(err as Error).message}`);
    console.error(`Ports ${DEFAULT_PORT}-${DEFAULT_PORT + MAX_PORT_ATTEMPTS - 1} are all in use.`);
    console.error('\nSuggestions:');
    console.error('  1. Stop other processes using these ports');
    console.error('  2. Set a different PORT environment variable: PORT=4000 npm start');
    process.exit(1);
  }
}

// Start server with automatic port resolution
startServer();

export { app, server, wss };
