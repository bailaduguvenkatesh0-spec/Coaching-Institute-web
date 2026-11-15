import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
// Also load the monorepo-root environment file when running the API workspace locally.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'teamb-super-secure-dev-jwt-secret-key-must-be-long',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSecret: process.env.COOKIE_SECRET || 'teamb-cookie-secret-key',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/teamb_db?schema=public',
  appTimezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  n8nSharedWebhookSecret: process.env.N8N_WEBHOOK_SECRET || process.env.N8N_SHARED_WEBHOOK_SECRET || 'teamb-n8n-shared-secret-demo',
  llmProvider: process.env.LLM_PROVIDER || 'mock',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  corsOrigins: (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
  emailProvider: process.env.EMAIL_PROVIDER || 'demo',
};
