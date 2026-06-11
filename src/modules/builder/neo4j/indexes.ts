import type { Driver } from 'neo4j-driver';
import { logger } from '../utils/logger.js';
import { NODE_TYPE_TO_LABEL } from './nodes.js';

export async function ensureIndexes(driver: Driver): Promise<void> {
  const session = driver.session();
  try {
    const labels = Object.values(NODE_TYPE_TO_LABEL);
    for (const label of labels) {
      await session.run(`CREATE INDEX idx_${label.toLowerCase()}_id IF NOT EXISTS FOR (n:${label}) ON (n.id)`);
    }
    logger.info('Índices optimizados creados/verificados.');
  } catch (err) {
    logger.error('Error creando índices en Neo4j', err);
    throw err;
  } finally {
    await session.close();
  }
}
