import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from '../../config/env.js';
import { registerGraphRoutes } from './routes/graph.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerSearchRoutes } from './routes/search.js';
import { registerClassifyRoutes } from './routes/classify.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
  });

  registerGraphRoutes(app);
  registerHealthRoutes(app);
  registerSearchRoutes(app);
  registerClassifyRoutes(app);

  return app;
}
