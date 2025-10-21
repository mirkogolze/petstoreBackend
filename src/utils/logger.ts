import { FastifyLoggerOptions } from 'fastify';

/**
 * Get logger configuration for Fastify
 */
export function getLoggerConfig(): FastifyLoggerOptions | boolean {
  const isDevelopment = process.env['NODE_ENV'] !== 'production';

  if (!isDevelopment) {
    return {
      level: process.env['LOG_LEVEL'] || 'info',
    };
  }

  // Development mode with pino-pretty
  return {
    level: process.env['LOG_LEVEL'] || 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  } as FastifyLoggerOptions;
}
