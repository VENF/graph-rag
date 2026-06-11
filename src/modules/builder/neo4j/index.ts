import neo4j, { type Driver } from 'neo4j-driver';
import type { Nodo, Relacion } from '../types.js';
import { logger } from '../utils/logger.js';
import { dropAllSafe } from './drop.js';
import { ensureIndexes } from './indexes.js';
import { createNodes } from './nodes.js';
import { createRelationshipsOptimized } from './relations.js';

export interface Neo4jOutputConfig {
  type: 'neo4j';
  uri: string;
  user: string;
  password: string;
  mode?: 'create' | 'merge';
}

export async function writeToNeo4j(
  outputCfg: Neo4jOutputConfig,
  nodos: Map<string, Nodo>,
  relaciones: Relacion[],
): Promise<void> {
  const driver = neo4j.driver(outputCfg.uri, neo4j.auth.basic(outputCfg.user, outputCfg.password), {
    connectionTimeout: 5000,
  });

  try {
    if (outputCfg.mode === 'create') {
      logger.info('Iniciando borrado seguro del grafo existente...');
      await dropAllSafe(driver);
    }

    await ensureIndexes(driver);
    await createNodes(driver, nodos);
    await createRelationshipsOptimized(driver, relaciones, nodos);
  } finally {
    await driver.close();
  }
}

export type { Driver };
