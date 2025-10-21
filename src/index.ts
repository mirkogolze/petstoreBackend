import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import openapiGlue from 'fastify-openapi-glue';
import { readFileSync } from 'fs';
import { join } from 'path';
import { OpenAPIServiceHandler } from './services/openapiService';
import { errorHandler } from './utils/errorHandler';
import { getLoggerConfig } from './utils/logger';
import { prisma, disconnectPrisma } from './utils/prisma';

/**
 * Build and configure the Fastify application
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: getLoggerConfig(),
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
        useDefaults: true,
        // Allow 'example' keyword from OpenAPI spec (it's metadata, not validation)
        strict: false,
      },
    },
  });

  // Register security plugins
  await app.register(helmet, {
    contentSecurityPolicy: false, // Disable CSP for API
    crossOriginOpenerPolicy: false, // Disable COOP for HTTP environments
    crossOriginResourcePolicy: false, // Disable CORP for API usage
    originAgentCluster: false, // Disable Origin-Agent-Cluster for compatibility
    // Keep other security headers enabled
    strictTransportSecurity:
      process.env['NODE_ENV'] === 'production' && process.env['HTTPS'] === 'true'
        ? { maxAge: 31536000, includeSubDomains: true }
        : false, // Only enable HSTS over HTTPS
  });

  await app.register(cors, {
    origin: process.env['CORS_ORIGIN'] || '*',
    credentials: true,
  });

  await app.register(rateLimit, {
    max: parseInt(process.env['RATE_LIMIT_MAX'] || '100', 10),
    timeWindow: process.env['RATE_LIMIT_WINDOW'] || '15 minutes',
  });

  // Register Swagger documentation
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Swagger Petstore - OpenAPI 3.0',
        description: 'This is a sample Pet Store Server based on the OpenAPI 3.0 specification.',
        termsOfService: 'https://swagger.io/terms/',
        contact: {
          email: 'apiteam@swagger.io',
        },
        license: {
          name: 'Apache 2.0',
          url: 'https://www.apache.org/licenses/LICENSE-2.0.html',
        },
        version: '1.0.27-SNAPSHOT',
      },
      tags: [
        {
          name: 'pet',
          description: 'Everything about your Pets',
        },
        {
          name: 'category',
          description: 'Everything about the Pet categories',
        },
      ],
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
      ],
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    // Customize CSP for HTTP/HTTPS environments
    staticCSP:
      process.env['NODE_ENV'] === 'production' && process.env['HTTPS'] === 'true'
        ? true // Use default strict CSP for HTTPS production
        : false, // Disable CSP for HTTP environments to avoid upgrade-insecure-requests
    transformStaticCSP:
      process.env['NODE_ENV'] === 'production' && process.env['HTTPS'] === 'true'
        ? (header: string) => header
        : undefined,
  });

  // Health check endpoint
  app.get('/health', async () => {
    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
      };
    } catch (error) {
      app.log.error(error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      };
    }
  });

  // Root endpoint
  app.get('/', async () => {
    return {
      name: 'Petstore API',
      version: '1.0.0',
      description: 'TypeScript backend for Petstore API based on OpenAPI 3.0',
      documentation: '/docs',
      endpoints: {
        health: '/health',
        pets: '/pet',
        categories: '/category',
      },
    };
  });

  // Load OpenAPI specification
  // In production (Docker), dist structure is dist/src/index.js, need to go up 2 levels
  const specPath = join(__dirname, '..', '..', 'openapi', 'petstore.yml');
  const specification = readFileSync(specPath, 'utf8');

  // Create service handler with all operationIds
  const serviceHandler = new OpenAPIServiceHandler(prisma);

  // Register OpenAPI Glue - auto-generates routes from OpenAPI spec
  await app.register(openapiGlue, {
    specification,
    serviceHandlers: serviceHandler, // Updated from deprecated 'service' option
  });

  // Set custom error handler
  app.setErrorHandler(errorHandler);

  // Graceful shutdown
  const listeners = ['SIGINT', 'SIGTERM'];
  listeners.forEach((signal) => {
    process.on(signal, async () => {
      app.log.info(`${signal} received, closing server gracefully...`);
      await disconnectPrisma();
      await app.close();
      process.exit(0);
    });
  });

  return app;
}

/**
 * Start the server
 */
async function start(): Promise<void> {
  try {
    const app = await buildApp();

    const port = parseInt(process.env['PORT'] || '3000', 10);
    const host = process.env['HOST'] || '0.0.0.0';

    await app.listen({ port, host });

    app.log.info(`Server listening on ${host}:${port}`);
    app.log.info(`Environment: ${process.env['NODE_ENV'] || 'development'}`);
    app.log.info('Database: Connected');
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  start();
}
