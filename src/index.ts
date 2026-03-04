import express, { Request, Response, NextFunction } from 'express';
import { config } from './config';
import { GatewayHandler } from './handlers/gatewayHandler';

const app = express();
const gatewayHandler = new GatewayHandler();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- In-memory rate limiting: max 10 requests per minute per IP ---
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Periodically clean up stale entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    entry.timestamps = entry.timestamps.filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW_MS
    );
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let entry = rateLimitStore.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(ip, entry);
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );

  if (entry.timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX_REQUESTS} requests per minute.`,
      retryAfterMs: RATE_LIMIT_WINDOW_MS - (now - entry.timestamps[0]),
    });
    return;
  }

  entry.timestamps.push(now);
  next();
}

app.use(rateLimitMiddleware);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'x402-serverless-payment-gateway',
    version: '1.0.0',
  });
});

// Main gateway handler - catch all routes
app.all('*', async (req: Request, res: Response) => {
  await gatewayHandler.handleRequest(req, res);
});

// Start server
const server = app.listen(config.port, () => {
  console.log(`🚀 x402 Serverless Payment Gateway running on port ${config.port}`);
  console.log(`📡 Target API: ${config.targetApiUrl}`);
  console.log(`💰 Fee Amount: ${config.feeAmount}`);
  console.log(`🌐 Solana Cluster: ${config.solanaCluster}`);
  console.log(`🔑 Receiver: ${gatewayHandler.getReceiverAddress()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Export for serverless environments (AWS Lambda / Vercel)
export const handler = async (event: any, context?: any) => {
  // Handle AWS Lambda format
  if (event.httpMethod || event.requestContext) {
    const req = {
      method: event.httpMethod || event.requestContext?.http?.method || 'GET',
      url: event.path || event.rawPath || (event.pathParameters?.proxy ? `/${event.pathParameters.proxy}` : '/'),
      headers: event.headers || {},
      body: event.body ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) : {},
    };

    const response: any = {
      statusCode: 200,
      headers: {},
      body: '',
      status: (code: number) => {
        response.statusCode = code;
        return response;
      },
      setHeader: (key: string, value: string) => {
        response.headers[key] = value;
        return response;
      },
      json: (data: any) => {
        response.body = JSON.stringify(data);
        return response;
      },
    };

    await gatewayHandler.handleRequest(req as any, response as any);

    return {
      statusCode: response.statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...response.headers,
      },
      body: response.body,
    };
  }

  // Handle Vercel format
  if (event.method) {
    const { req, res } = event;
    await gatewayHandler.handleRequest(req, res);
    return;
  }

  // Default: treat as Express request
  const req = event;
  const res = context || {
    statusCode: 200,
    headers: {},
    body: '',
    status: (code: number) => res,
    setHeader: () => res,
    json: (data: any) => {
      res.body = JSON.stringify(data);
      return res;
    },
  };

  await gatewayHandler.handleRequest(req, res);
  return res;
};

