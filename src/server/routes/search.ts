import type { FastifyInstance } from 'fastify';
import { app } from '../../modules/search/index.js';

interface ProductoInput {
  item?: number;
  descripcion_comercial: string;
  uso_previsto: string;
  cantidad?: number;
  precio_unitario?: number;
  total_linea?: number;
}

interface SearchBody {
  metadata_factura?: Record<string, unknown>;
  importador?: Record<string, unknown>;
  producto: ProductoInput;
}

export function registerSearchRoutes(server: FastifyInstance): void {
  server.post<{ Body: SearchBody }>('/api/v1/search', async (request, reply) => {
    const { producto } = request.body;

    if (!producto?.descripcion_comercial || !producto?.uso_previsto) {
      return reply.status(400).send({
        error: 'Los campos "producto.descripcion_comercial" y "producto.uso_previsto" son obligatorios.',
      });
    }

    try {
      const finalState = await app.invoke({
        inputJson: { producto },
      });

      const { inputJson: _, ...rest } = finalState;
      return rest;
    } catch (err) {
      request.log.error({ err }, 'Search pipeline failed');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });
}
