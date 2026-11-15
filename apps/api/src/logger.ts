import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.env === 'test' ? 'silent' : 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
});
