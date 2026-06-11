import type { Driver } from 'neo4j-driver';
import { logger } from '../utils/logger.js';

export async function dropAllSafe(driver: Driver): Promise<void> {
  const session = driver.session();
  try {
    logger.info('Borrando relaciones en lotes...');
    await session.run(`
      MATCH ()-[r]->()
      CALL {
        WITH r
        DELETE r
      } IN TRANSACTIONS;
    `);

    logger.info('Borrando nodos remanentes en lotes...');
    await session.run(`
      MATCH (n)
      CALL {
        WITH n
        DELETE n
      } IN TRANSACTIONS;
    `);
    logger.info('Grafo limpiado con éxito.');
  } catch (error) {
    logger.error('Error en dropAllSafe, intentando fallback destructivo...', error);
    try {
      await session.run('MATCH (n) DETACH DELETE n');
    } catch (fallbackErr) {
      logger.error('Fallback destructivo también falló', fallbackErr);
      throw fallbackErr;
    }
  } finally {
    await session.close();
  }
}
