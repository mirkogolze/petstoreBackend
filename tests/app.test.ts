// Mock fastify-openapi-glue before importing buildApp
jest.mock('fastify-openapi-glue', () => {
  return jest.fn().mockImplementation(() => async (_fastify: unknown) => {
    // Mock implementation - routes will be registered via the mock
  });
});

import { buildApp } from '../src/index';
import { FastifyInstance } from 'fastify';

describe('Application', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: 'healthy',
        database: expect.any(String),
      });
    });
  });

  describe('Root Endpoint', () => {
    it('should return API information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('name');
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('endpoints');
    });
  });
});
