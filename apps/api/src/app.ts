import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { errorHandler } from './middleware/errorHandler.js';
import { idempotency } from './middleware/idempotency.js';
import authRoutes from './routes/auth.js';
import admissionsRoutes from './routes/admissions.js';
import academicRoutes from './routes/academic.js';
import automationRoutes from './routes/automation.js';
import staffRoutes from './routes/staff.js';
import { checkDbConnection } from './prisma.js';
import { config } from './config.js';
import { apiLimiter } from './middleware/rateLimiter.js';

const webDistPath = path.resolve(__dirname, '../../web/dist');

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return true;
  const normalized = origin.trim().replace(/\/+$/, '');

  // 1. Explicitly configured origins from env (CORS_ORIGINS, FRONTEND_URL, APP_URL)
  if (config.corsOrigins.some((allowed) => allowed === normalized || allowed === '*')) {
    return true;
  }

  // 2. Allow all Vercel domains (production & branch previews)
  if (normalized.endsWith('.vercel.app')) {
    return true;
  }

  // 3. Allow all Render domains
  if (normalized.endsWith('.onrender.com')) {
    return true;
  }

  // 4. Allow all Netlify domains
  if (normalized.endsWith('.netlify.app')) {
    return true;
  }

  // 5. Localhost and private LAN RFC1918 IPv4 (same Wi-Fi mobile testing)
  try {
    const url = new URL(normalized);
    const hostname = url.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    const octets = hostname.split('.').map(Number);
    if (
      octets.length === 4 &&
      octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) &&
      (octets[0] === 10 || (octets[0] === 192 && octets[1] === 168) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31))
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function createApp(): Express {
  const app = express();

  // Trust reverse proxy (Render, Cloudflare, Vercel) for accurate client IPs and secure cookies
  app.set('trust proxy', 1);

  // Security & standard middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows flexible API usage
    })
  );

  const corsOptions: cors.CorsOptions = {
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Idempotency-Key',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Set-Cookie'],
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  app.use('/api', apiLimiter);
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Global Idempotency middleware
  app.use(idempotency);

  // Serve static assets from built web frontend if available
  if (fs.existsSync(webDistPath)) {
    app.use(express.static(webDistPath));
  }

  // Health check endpoint (accessible at both /health and /api/health)
  const healthHandler = async (req: Request, res: Response) => {
    let dbConnected = false;
    try {
      dbConnected = await checkDbConnection();
    } catch {
      dbConnected = false;
    }

    const isHealthy = dbConnected || config.env !== 'production';

    return res.status(isHealthy ? 200 : 503).json({
      status: dbConnected ? 'HEALTHY' : 'DEGRADED',
      service: 'TEAM B Coaching Institute API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      demoMode: !dbConnected,
      database: {
        connected: dbConnected,
        dialect: 'postgresql',
      },
      storage: {
        mode: dbConnected ? 'postgresql-prisma' : 'in-memory-fallback',
        persistent: dbConnected,
      },
      endpoints: {
        frontend: config.frontendUrl,
        publicEnquiry: '/enquire',
        apiDocs: '/api',
      },
    });
  };

  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // Root landing page: serves the web dashboard if built, or fallback developer portal
  app.get('/', (req: Request, res: Response) => {
    if (req.headers['accept']?.includes('application/json')) {
      return healthHandler(req, res);
    }
    const indexPath = path.join(webDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    if (req.accepts('html')) {
      return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TEAM B Coaching Institute — API Server</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; display: flex; justify-content: center; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; max-width: 650px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h1 { color: #38bdf8; font-size: 24px; margin-top: 0; margin-bottom: 8px; }
    .status-badge { display: inline-block; background: #15803d; color: #dcfce7; padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 13px; margin-bottom: 20px; }
    p { color: #94a3b8; line-height: 1.6; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; margin-right: 12px; margin-top: 12px; transition: background 0.2s; }
    .btn:hover { background: #1d4ed8; }
    .btn-outline { background: transparent; border: 1px solid #475569; color: #e2e8f0; }
    .btn-outline:hover { background: #334155; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 14px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #334155; }
    th { color: #cbd5e1; font-weight: 600; }
    code { background: #0f172a; padding: 2px 6px; border-radius: 4px; color: #a5f3fc; font-family: monospace; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🚀 TEAM B Coaching Institute API</h1>
    <div class="status-badge">● BACKEND ONLINE &amp; HEALTHY (Port 4000)</div>
    <p>You have accessed the REST API backend. The web interface URL is configured as ${config.frontendUrl}.</p>
    <div>
      <a href="${config.frontendUrl}" class="btn">Open Web App Dashboard &rarr;</a>
      <a href="${config.frontendUrl.replace(/\/$/, '')}/enquire" class="btn btn-outline">Public Enquiry Form &rarr;</a>
    </div>
    <table>
      <thead>
        <tr><th>Endpoint</th><th>Method</th><th>Access</th></tr>
      </thead>
      <tbody>
        <tr><td><code>/health</code> or <code>/api/health</code></td><td>GET</td><td>Public (Health Status)</td></tr>
        <tr><td><code>/api</code></td><td>GET</td><td>Public (API Directory)</td></tr>
        <tr><td><code>/api/leads</code></td><td>POST</td><td>Public (Enquiry Submission)</td></tr>
        <tr><td><code>/api/auth/login</code></td><td>POST</td><td>Public (Auth Portal)</td></tr>
        <tr><td><code>/api/leads</code></td><td>GET</td><td>Protected (Admissions Staff)</td></tr>
        <tr><td><code>/api/students</code></td><td>GET</td><td>Protected (Academic Staff)</td></tr>
      </tbody>
    </table>
  </div>
</body>
</html>`);
    }
    return healthHandler(req, res);
  });

  // API Directory endpoint
  app.get('/api', (req: Request, res: Response) => {
    return res.json({
      service: 'TEAM B Coaching Institute API',
      status: 'HEALTHY',
      version: '1.0.0',
      frontendUrl: config.frontendUrl,
      publicEnquiryUrl: `${config.frontendUrl.replace(/\/$/, '')}/enquire`,
      endpoints: {
        auth: [
          'POST /api/auth/register',
          'POST /api/auth/login',
          'POST /api/auth/logout',
          'GET /api/auth/me',
        ],
        admissions: [
          'GET /api/leads',
          'POST /api/leads',
          'POST /api/leads/check-duplicate',
          'GET /api/leads/recovery',
          'GET /api/leads/:id',
          'PATCH /api/leads/:id',
          'DELETE /api/leads/:id',
          'POST /api/leads/:id/score',
          'POST /api/leads/:id/ai-analyze',
          'POST /api/leads/:id/assign',
          'POST /api/leads/:id/stage',
          'POST /api/leads/:id/ai-draft',
          'GET /api/counsellors',
          'PATCH /api/counsellors/:id',
          'GET /api/follow-ups',
          'POST /api/follow-ups/:id/complete',
          'GET /api/admissions/analytics',
        ],
        academic: [
          'GET /api/students',
          'GET /api/students/:id',
          'GET /api/attendance',
          'POST /api/attendance',
          'POST /api/attendance/import',
          'GET /api/attendance/stats',
          'POST /api/imports/attendance',
          'POST /api/imports/assessments',
          'GET /api/imports',
          'GET /api/imports/:id',
          'GET /api/at-risk',
          'POST /api/at-risk/evaluate/:studentId',
          'POST /api/at-risk/:id/resolve',
          'POST /api/at-risk/:id/dismiss',
          'GET /api/tasks',
          'POST /api/tasks',
          'PATCH /api/tasks/:id',
          'GET /api/parents',
          'GET /api/parents/:id',
          'PATCH /api/parents/:id/preferences',
          'GET /api/communications',
          'POST /api/communications',
          'POST /api/communications/:id/approve',
          'GET /api/summaries/weekly',
          'POST /api/summaries/weekly/generate',
          'GET /api/academic/analytics',
        ],
        dashboard: [
          'GET /api/dashboard',
          'GET /api/dashboard/overview',
        ],
        staff: [
          'GET /api/staff',
          'GET /api/staff/stats',
          'GET /api/staff/:id',
          'POST /api/staff',
          'PUT /api/staff/:id',
          'DELETE /api/staff/:id',
        ],
        automation: [
          'POST /api/webhooks/n8n/lead',
          'POST /api/webhooks/n8n/counsellor-assignment',
          'POST /api/webhooks/n8n/attendance',
          'POST /api/webhooks/n8n/at-risk-alert',
          'POST /api/webhooks/n8n/coordinator-task',
          'POST /api/webhooks/n8n/weekly-summary',
          'POST /api/webhooks/n8n/parent-communication',
          'POST /api/webhooks/n8n/workflow-error',
          'POST /api/webhooks/n8n',
          'GET /api/automation/runs',
          'POST /api/automation/runs',
        ],
        system: ['GET /api/settings', 'PATCH /api/settings', 'GET /api/audit-logs'],
      },
    });
  });


  // Mount Auth, Settings & Audit routes
  app.use('/api/auth', authRoutes);
  app.use('/api', authRoutes); // Exposes /api/settings and /api/audit-logs

  // Mount Project 1: Admissions routes
  app.use('/api', admissionsRoutes);

  // Mount Project 2: Academic routes
  app.use('/api', academicRoutes);

  // Mount Staff Management routes
  app.use('/api', staffRoutes);

  // Mount n8n Webhook & Automation routes
  app.use('/api', automationRoutes);

  // SPA Fallback: serve web app index.html for all non-API GET routes (e.g. /leads, /enquire, /login, /students)
  app.get('*', (req: Request, res: Response, next) => {
    if (req.path.startsWith('/api') || req.headers['accept']?.includes('application/json')) {
      return next();
    }
    const indexPath = path.join(webDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return next();
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
