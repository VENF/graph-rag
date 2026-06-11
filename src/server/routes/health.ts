import type { FastifyInstance } from 'fastify';

const startTime = Date.now();

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get('/api/v1/health', async () => {
    return {
      status: 'ok' as const,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    };
  });
}
