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
  tipo_operacion?: string;
  pais_destino?: string;
}

export function registerSearchRoutes(server: FastifyInstance): void {
  server.post<{ Body: SearchBody }>('/api/v1/search', async (request, reply) => {
    const { producto, tipo_operacion, pais_destino } = request.body;

    if (!producto?.descripcion_comercial || !producto?.uso_previsto) {
      return reply.status(400).send({
        error: 'Los campos "producto.descripcion_comercial" y "producto.uso_previsto" son obligatorios.',
      });
    }

    try {
      const state = await app.invoke({
        inputJson: { producto },
        operationType: tipo_operacion ?? 'Importación',
        destinationCountry: pais_destino ?? 'Venezuela',
      });

      return {
        technical: state.technicalSheet,
        candidates: state.candidates,
        verdict: state.verdict,
      };
    } catch (err) {
      request.log.error({ err }, 'Search pipeline failed');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });
}
