import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';

const app = createApp();

const server = app.listen(config.port, config.host, () => {
  logger.info(
    `TEAM B Coaching Institute API listening on ${config.host}:${config.port} (Env: ${config.env}, TZ: ${config.appTimezone})`
  );
});

// Port conflict and startup error handling
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(
      `⚠️ [PORT CONFLICT] Port ${config.port} is already occupied by another process. ` +
        `Check if another TEAM B API instance or background service is running on port ${config.port}. ` +
        `To resolve: stop the conflicting process or set PORT in your .env file (e.g. PORT=4001).`
    );
  } else {
    logger.error({ err }, 'Failed to start API server due to a system error');
  }
  process.exit(1);
});

// Graceful termination
const shutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down API server gracefully...`);
  server.close(() => {
    logger.info('API server closed cleanly.');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default server;
