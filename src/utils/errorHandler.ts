import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Standard error response shape
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Custom application errors
 */
export class AppError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: unknown) {
    super('NOT_FOUND', message, 404, details);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation error', details?: unknown) {
    super('VALIDATION_ERROR', message, 422, details);
    this.name = 'ValidationError';
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: unknown) {
    super('BAD_REQUEST', message, 400, details);
    this.name = 'BadRequestError';
  }
}

/**
 * Centralized error handler for Fastify
 */
export function errorHandler(
  error: FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  // Log the error
  request.log.error({
    err: error,
    url: request.url,
    method: request.method,
  });

  // Handle custom application errors
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      code: error.code,
      message: error.message,
      details: error.details,
    };

    reply.status(error.statusCode).send(response);
    return;
  }

  // Handle Fastify validation errors
  if (error.validation) {
    const response: ErrorResponse = {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.validation,
    };

    reply.status(400).send(response);
    return;
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;

    if (prismaError.code === 'P2002') {
      const response: ErrorResponse = {
        code: 'DUPLICATE_ENTRY',
        message: 'A record with this value already exists',
        details: prismaError.meta,
      };
      reply.status(409).send(response);
      return;
    }

    if (prismaError.code === 'P2025') {
      const response: ErrorResponse = {
        code: 'NOT_FOUND',
        message: 'Record not found',
      };
      reply.status(404).send(response);
      return;
    }
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const response: ErrorResponse = {
    code: error.code || 'INTERNAL_SERVER_ERROR',
    message: statusCode === 500 ? 'Internal server error' : error.message,
  };

  // Only include error details in development
  if (process.env['NODE_ENV'] === 'development') {
    response.details = {
      stack: error.stack,
      ...error,
    };
  }

  reply.status(statusCode).send(response);
}
