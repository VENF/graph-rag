import type { FastifyInstance } from 'fastify';
import { startBuildJob, getJob } from '../services/builder-service.js';

export function registerGraphRoutes(app: FastifyInstance): void {
  app.post('/api/v1/build-graph', async (request, reply) => {
    try {
      const jobId = startBuildJob();
      return reply.status(202).send({ jobId });
    } catch (err) {
      request.log.error({ err }, 'Build-graph failed to start');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  app.get('/api/v1/jobs/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const job = getJob(jobId);

    if (!job) {
      return reply.status(404).send({ error: `Job ${jobId} no encontrado` });
    }

    return {
      id: job.id,
      status: job.status,
      startedAt: job.startedAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
      error: job.error,
    };
  });
}
