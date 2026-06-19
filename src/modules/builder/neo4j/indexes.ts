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
    logger.info('Índices RANGE creados/verificados.');

    await session.run(`CREATE FULLTEXT INDEX ft_mercancias IF NOT EXISTS
      FOR (n:CodigoArancelario|Subpartida)
      ON EACH [n.description, n.content, n.display, n.code]`);
    logger.info('Full-text index ft_mercancias creado/verificado.');

    await session.run(`CREATE FULLTEXT INDEX ft_normativa IF NOT EXISTS
      FOR (n:Articulo|CapituloSA|Documento|NotaLegal)
      ON EACH [n.title, n.content]`);
    logger.info('Full-text index ft_normativa creado/verificado.');

    await session.run(`CREATE FULLTEXT INDEX ft_regimenes IF NOT EXISTS
      FOR (n:RegimenLegal)
      ON EACH [n.description, n.content]`);
    logger.info('Full-text index ft_regimenes creado/verificado.');

    await session.run(`CREATE VECTOR INDEX vector_mercancias IF NOT EXISTS
      FOR (n:CodigoArancelario)
      ON (n.description_vector)
      OPTIONS { indexConfig: {
        \`vector.dimensions\`: 1024,
        \`vector.similarity_function\`: 'cosine'
      }}`);
    logger.info('Vector index vector_mercancias creado/verificado.');
  } catch (err) {
    logger.error('Error creando índices en Neo4j', err);
    throw err;
  } finally {
    await session.close();
  }
}
