// ─── Global Error Handler Middleware ─────────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errors';
import logger from '../config/logger';
import { ApiResponse } from '@rsn/shared';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = String(res.getHeader('x-request-id') || req.headers['x-request-id'] || 'unknown');

  // Handle known application errors
  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };

    if (err.statusCode >= 500) {
      logger.error({ err, code: err.code, requestId, method: req.method, path: req.path }, err.message);
    } else {
      logger.warn({ code: err.code, statusCode: err.statusCode, requestId, method: req.method, path: req.path }, err.message);
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle unexpected errors
  logger.error({ err, requestId, method: req.method, path: req.path }, 'Unhandled error');

  const response: ApiResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  };

  res.status(500).json(response);
}

export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  };
  res.status(404).json(response);
}
