import neo4j from 'neo4j-driver';
import { getDriver } from '../src/modules/search/services/neo4j.js';
import { embeddings } from '../src/modules/search/services/embeddings.js';

const BATCH_SIZE = 500;
const chapter = process.argv.find((a) => a.startsWith('--chapter='))?.split('=')[1];

async function main() {
  const driver = getDriver();
  const session = driver.session();

  try {
    await session.run(`CREATE VECTOR INDEX vector_mercancias IF NOT EXISTS
      FOR (n:CodigoArancelario) ON (n.description_vector)
      OPTIONS { indexConfig: {
        \`vector.dimensions\`: 1024,
        \`vector.similarity_function\`: 'cosine'
      }}`);

    const conditions = ['c.description_vector IS NULL'];
    if (chapter) conditions.push('c.sa_chapter = $chapter');
    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const countResult = await session.run(
      `MATCH (c:CodigoArancelario)
       ${whereClause}
       RETURN count(c) AS total`,
      chapter ? { chapter } : undefined,
    );
    const total = countResult.records[0].get('total').toNumber();
    console.log(`Nodos por embedder: ${total}`);

    if (total === 0) {
      console.log('No hay nodos pendientes por embedder.');
      return;
    }

    for (let offset = 0; offset < total; offset += BATCH_SIZE) {
      const batchResult = await session.run(
        `MATCH (c:CodigoArancelario)
         ${whereClause}
         RETURN c.code, c.description
         ORDER BY c.code
         SKIP $skip LIMIT $limit`,
        { ...(chapter ? { chapter } : {}), skip: neo4j.int(offset), limit: neo4j.int(BATCH_SIZE) },
      );

      const texts = batchResult.records.map((r) => {
        const code = r.get('c.code');
        const desc = r.get('c.description');
        return `Código: ${code}. ${desc}`;
      });
      const codes = batchResult.records.map((r) => r.get('c.code'));

      console.log(`Embedder lote ${offset + 1}-${offset + texts.length}/${total}...`);
      const vectors = await embeddings.embedDocuments(texts);

      const batch = codes.map((code, i) => ({ code, vector: vectors[i] }));
      await session.run(
        `UNWIND $batch AS row
         MATCH (c:CodigoArancelario {code: row.code})
         SET c.description_vector = row.vector`,
        { batch },
      );

      const done = Math.min(offset + BATCH_SIZE, total);
      const chapterInfo = chapter ? ` - Capítulo ${chapter}` : '';
      console.log(`Progreso: ${done}/${total}${chapterInfo}`);
    }

    console.log('Embedding completado.');
  } catch (err) {
    console.error('Error en embed-nodes:', err);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();
