import type { Driver } from 'neo4j-driver';
import type { Nodo } from '../types.js';
import { logger } from '../utils/logger.js';

const BATCH_SIZE = 5000;

const NODE_TYPE_TO_LABEL: Record<string, string> = {
  documento: 'Documento',
  capitulo: 'CapituloSA',
  articulo: 'Articulo',
  'codigo-arancelario': 'CodigoArancelario',
  'regimen-legal': 'RegimenLegal',
  subpartida: 'Subpartida',
  'nota-legal': 'NotaLegal',
  subcapitulo: 'Subcapitulo',
};

function sanitizeValue(val: unknown): unknown {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val;
  if (Array.isArray(val)) return val.map(sanitizeValue);
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function sanitizeProps(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(props)) {
    result[key] = sanitizeValue(val);
  }
  return result;
}

export async function createNodes(driver: Driver, nodos: Map<string, Nodo>): Promise<void> {
  const byLabel = new Map<string, Array<{ id: string; props: Record<string, unknown> }>>();
  for (const nodo of nodos.values()) {
    const label = NODE_TYPE_TO_LABEL[nodo.type] || nodo.type;
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label)!.push({
      id: nodo.id,
      props: sanitizeProps({
        id: nodo.id,
        ...nodo.metadata,
        content: nodo.content,
        tags: nodo.tags,
      }),
    });
  }

  const session = driver.session();
  try {
    let total = 0;
    for (const [label, nodes] of byLabel) {
      for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
        const batch = nodes.slice(i, i + BATCH_SIZE);
        await session.executeWrite((tx) =>
          tx.run(
            `UNWIND $rows AS row
             MERGE (n:${label} {id: row.id})
             SET n = row.props`,
            { rows: batch },
          ),
        );
        total += batch.length;
        logger.info(`Neo4j nodos: ${total}/${nodos.size}`);
      }
    }
  } finally {
    await session.close();
  }
}

export { NODE_TYPE_TO_LABEL };
