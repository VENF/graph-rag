import type { Driver } from 'neo4j-driver';
import type { Nodo, Relacion } from '../types.js';
import { logger } from '../utils/logger.js';
import { NODE_TYPE_TO_LABEL } from './nodes.js';

const BATCH_SIZE = 5000;

const REL_TYPE_ALLOWLIST = new Set([
  'ACLARA',
  'REFIERE_A',
  'MODIFICA_CRITERIO',
  'PERTENECE_A',
  'REGULA',
  'ES_PARTE_DE',
  'CONTIENE',
  'REQUIERE',
  'SUJETO_A',
  'SUBDIVIDE',
  'MODIFICA',
  'SUSPENDE_APLICACION_DE',
  'SUSTITUYE_A',
  'EXONERADO_POR',
  'ACTUALIZA_TARIFA',
  'SUSPENDE_REGIMEN',
]);

function normalizeRelType(type: string): string {
  return type
    .toUpperCase()
    .replace(/-/g, '_')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export async function createRelationshipsOptimized(
  driver: Driver,
  relaciones: Relacion[],
  nodosMap: Map<string, Nodo>,
): Promise<void> {
  const byGroup = new Map<
    string,
    {
      fromLabel: string;
      relType: string;
      toLabel: string;
      rows: Array<{ origin: string; target: string; props?: Record<string, unknown> }>;
    }
  >();

  let skipped = 0;

  for (const rel of relaciones) {
    const relType = normalizeRelType(rel.type);
    if (!REL_TYPE_ALLOWLIST.has(relType)) {
      skipped++;
      continue;
    }
    const nodoOrigen = nodosMap.get(rel.origin);
    const nodoDestino = nodosMap.get(rel.target);

    if (!nodoOrigen || !nodoDestino) {
      skipped++;
      continue;
    }

    const fromLabel = NODE_TYPE_TO_LABEL[nodoOrigen.type] || nodoOrigen.type;
    const toLabel = NODE_TYPE_TO_LABEL[nodoDestino.type] || nodoDestino.type;
    const groupKey = `${fromLabel}-${relType}-${toLabel}`;

    if (!byGroup.has(groupKey)) {
      byGroup.set(groupKey, { fromLabel, relType, toLabel, rows: [] });
    }
    byGroup.get(groupKey)!.rows.push({ origin: rel.origin, target: rel.target, props: rel.props });
  }

  if (skipped > 0) {
    logger.warn(`Neo4j relaciones omitidas (tipo no permitido o nodo faltante): ${skipped}`);
  }

  const session = driver.session();
  try {
    let total = 0;
    for (const group of byGroup.values()) {
      for (let i = 0; i < group.rows.length; i += BATCH_SIZE) {
        const batch = group.rows.slice(i, i + BATCH_SIZE);

        await session.executeWrite((tx) =>
          tx.run(
            `UNWIND $rows AS row
             MATCH (a:${group.fromLabel} {id: row.origin})
             MATCH (b:${group.toLabel} {id: row.target})
             MERGE (a)-[r:${group.relType}]->(b)
             FOREACH (_ IN CASE WHEN row.props IS NOT NULL THEN [1] ELSE [] END |
               SET r = row.props
             )`,
            { rows: batch },
          ),
        );
        total += batch.length;
        logger.info(`Neo4j relaciones procesadas: ${total}/${relaciones.length}`);
      }
    }
  } finally {
    await session.close();
  }
}
