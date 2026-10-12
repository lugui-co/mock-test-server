import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const MASK = '***';

// Nunca logar credencial nem documento completos (mesma regra do reportService).
export const sanitizeHeaders = (headers: Request['headers']): Record<string, unknown> => {
  const safe: Record<string, unknown> = { ...headers };

  if (typeof headers.authorization === 'string') {
    const [scheme] = headers.authorization.split(' ');
    safe.authorization = `${scheme} ${MASK}`;
  }

  const documentId = headers['x-document-id'];
  if (typeof documentId === 'string') {
    safe['x-document-id'] = documentId.substring(0, 3) + MASK;
  }

  if (headers.cookie !== undefined) {
    safe.cookie = MASK;
  }

  return safe;
};

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    headers: sanitizeHeaders(req.headers),
    ip: req.ip,
  });

  const originalSend = res.send;
  res.send = function (body: any) {
    const responseTime = Date.now() - startTime;

    // O corpo da requisição não é logado: pode conter dados pessoais.
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
    });

    return originalSend.call(this, body);
  };

  next();
};
