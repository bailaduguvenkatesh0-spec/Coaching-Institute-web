import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { store } from '../store/index.js';
import { logger } from '../logger.js';

export function idempotency(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Extract key from header or body
  const idempotencyKey =
    (req.headers['x-idempotency-key'] as string) ||
    (req.body && req.body.idempotencyKey);

  if (!idempotencyKey) {
    return next();
  }

  // Check if we have an existing record for this idempotency key
  const existing = store.getIdempotency(idempotencyKey);
  if (existing) {
    logger.info({ idempotencyKey, endpoint: req.originalUrl }, 'Idempotent request replay detected');
    res.setHeader('X-Idempotent-Replay', 'true');
    return res.status(existing.responseStatus).json(existing.responseBody);
  }

  // Compute request hash
  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(req.body || {}))
    .digest('hex');

  // Intercept response to store result
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    try {
      // Only cache successful or completed client responses (2xx / 4xx)
      if (res.statusCode < 500) {
        store.setIdempotency({
          idempotencyKey,
          endpoint: req.originalUrl,
          requestHash,
          responseStatus: res.statusCode,
          responseBody: body,
        });
      }
    } catch (e) {
      logger.error({ err: e }, 'Failed to persist idempotency record');
    }
    return originalJson(body);
  };

  next();
}
