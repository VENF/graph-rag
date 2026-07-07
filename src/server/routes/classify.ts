import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { app } from '../../modules/search/index.js';
import { createJob, getJob, updateJob } from '../services/jobStore.js';
import type { ClassificationResult } from '../services/jobStore.js';
import { env } from '../../../config/env.js';

interface ProductoInput {
  descripcion_comercial: string;
  uso_previsto: string;
  item?: number;
  cantidad?: number;
  precio_unitario?: number;
  total_linea?: number;
}

interface StartBody {
  producto: ProductoInput;
  tipo_operacion?: string;
  pais_destino?: string;
}

export function registerClassifyRoutes(server: FastifyInstance): void {
  server.post<{ Body: StartBody }>('/api/classify/start', async (request, reply) => {
    const { producto, tipo_operacion, pais_destino } = request.body;

    if (!producto?.descripcion_comercial || !producto?.uso_previsto) {
      return reply.status(400).send({
        error: 'Los campos "producto.descripcion_comercial" y "producto.uso_previsto" son obligatorios.',
      });
    }

    const id = randomUUID();
    createJob(id, { producto, tipo_operacion, pais_destino });
    return reply.status(201).send({ id });
  });

  server.get<{ Querystring: { id: string } }>('/api/classify/sse', async (request, reply) => {
    const { id } = request.query;
    if (!id) {
      reply.status(400).send({ error: 'Falta el par\u00e1metro "id"' });
      return;
    }

    const job = getJob(id);
    if (!job) {
      reply.status(404).send({ error: `Job "${id}" no encontrado` });
      return;
    }

    if (job.status === 'processing') {
      reply.status(409).send({ error: `Job "${id}" ya est\u00e1 en procesamiento` });
      return;
    }

    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': env.CORS_ORIGIN,
    });

    const emit = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const keepAlive = setInterval(() => {
      reply.raw.write(':keepalive\n\n');
    }, 15000);

    request.raw.on('close', () => {
      clearInterval(keepAlive);
    });

    try {
      if (job.status === 'complete' && job.result) {
        emit('progress', { percent: 100, eta: 'Completado' });
        emit('complete', job.result);
        return;
      }

      if (job.status === 'error') {
        emit('progress', { percent: 100, eta: 'Error' });
        emit('complete', { error: job.error });
        return;
      }

      updateJob(id, { status: 'processing' });

      const state: Record<string, unknown> = {
        inputJson: job.input,
        operationType: job.input.tipo_operacion ?? 'Importaci\u00f3n',
        destinationCountry: job.input.pais_destino ?? 'Venezuela',
      };

      const stream = await app.stream(state, { streamMode: 'updates' });
      const iter = stream[Symbol.asyncIterator]();

      // variables
      emit('step', { stepId: 'variables', status: 'running' });
      emit('progress', { percent: 10, eta: '8s aprox.' });
      const r1 = await iter.next();
      Object.assign(state, r1.value?.distil_input ?? {});
      emit('step', { stepId: 'variables', status: 'ok' });

      // scanning
      emit('step', { stepId: 'scanning', status: 'running' });
      emit('progress', { percent: 25, eta: '6s aprox.' });
      const r2 = await iter.next();
      Object.assign(state, r2.value?.candidate_search ?? {});
      emit('step', { stepId: 'scanning', status: 'ok' });

      // analyzing
      emit('step', { stepId: 'analyzing', status: 'running' });
      emit('progress', { percent: 50, eta: '4s aprox.' });
      const r3 = await iter.next();
      Object.assign(state, r3.value?.verdict_node ?? {});
      emit('step', { stepId: 'analyzing', status: 'ok' });

      // redirect loop: if verdict_node returned {} (redirect), LangGraph
      // re-runs candidate_search → verdict_node. Consume those updates.
      if (!state.verdict && (state.searchAttempt as number) < 2) {
        emit('step', { stepId: 'scanning', status: 'running' });
        emit('progress', { percent: 25, eta: '6s aprox.' });
        const r4 = await iter.next();
        Object.assign(state, r4.value?.candidate_search ?? {});
        emit('step', { stepId: 'scanning', status: 'ok' });

        emit('step', { stepId: 'analyzing', status: 'running' });
        emit('progress', { percent: 50, eta: '4s aprox.' });
        const r5 = await iter.next();
        Object.assign(state, r5.value?.verdict_node ?? {});
        emit('step', { stepId: 'analyzing', status: 'ok' });
      }

      // legal
      emit('step', { stepId: 'legal', status: 'running' });
      emit('progress', { percent: 80, eta: '2s aprox.' });
      emit('step', { stepId: 'legal', status: 'ok' });

      const result: ClassificationResult = {
        technical: state.technicalSheet,
        candidates: state.candidates as unknown[],
        verdict: state.verdict,
      };

      updateJob(id, { status: 'complete', result });

      emit('progress', { percent: 100, eta: 'Completado' });
      emit('complete', result);
    } catch (err) {
      const errorMessage = (err as Error).message;
      updateJob(id, { status: 'error', error: errorMessage });
      emit('progress', { percent: 100, eta: 'Error' });
      emit('complete', { error: errorMessage });
    } finally {
      clearInterval(keepAlive);
    }
  });
}
