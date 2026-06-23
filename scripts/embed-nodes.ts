import neo4j from 'neo4j-driver';
import { getDriver } from '../src/modules/search/services/neo4j.js';
import { embeddings } from '../src/modules/search/services/embeddings.js';

const BATCH_SIZE = 50;
const RATE_LIMIT_MS = 60_000; // 1 batch per minute (Google RPM)
const chapter = process.argv.find((a) => a.startsWith('--chapter='))?.split('=')[1];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const driver = getDriver();
  const session = driver.session();

  try {
    await session.run(`CREATE VECTOR INDEX vector_mercancias IF NOT EXISTS
      FOR (n:CodigoArancelario) ON (n.description_vector)
      OPTIONS { indexConfig: {
        \`vector.dimensions\`: 768,
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

    let successCount = 0;
    let failCount = 0;

    for (let offset = 0; offset < total; offset += BATCH_SIZE) {
      const batchStart = Date.now();
      const batchEnd = Math.min(offset + BATCH_SIZE, total);

      try {
        const filter = chapter ? `{sa_chapter: $chapter}` : '';
        const batchResult = await session.run(
          `MATCH (c:CodigoArancelario ${filter})
           WITH c ORDER BY c.code SKIP $skip LIMIT $limit
           WITH c, replace(c.code, '.', '') AS cleanCode
           OPTIONAL MATCH (h:Subpartida {level: 4})
           WHERE cleanCode STARTS WITH h.code
           OPTIONAL MATCH (s:Subpartida {level: 6})
           WHERE cleanCode STARTS WITH s.code
           RETURN c.code, c.description, h.content AS heading_text, s.content AS subheading_text`,
          { ...(chapter ? { chapter } : {}), skip: neo4j.int(offset), limit: neo4j.int(BATCH_SIZE) },
        );

        const texts = batchResult.records.map((r) => {
          const code: string = r.get('c.code');
          const desc: string = r.get('c.description');
          const headingText: string | null = r.get('heading_text');
          const subheadingText: string | null = r.get('subheading_text');
          const cleanCode = code.replace(/\./g, '');
          const parts: string[] = [];
          if (headingText) parts.push(`[heading ${cleanCode.slice(0, 4)}] ${headingText}`);
          if (subheadingText) parts.push(`[subheading ${cleanCode.slice(0, 6)}] ${subheadingText}`);
          parts.push(`[code ${code}] ${desc ?? ''}`);
          return parts.join(' | ');
        });
        const codes = batchResult.records.map((r) => r.get('c.code'));

        console.log(`Embedder lote ${offset + 1}-${batchEnd}/${total} (${texts.length} textos)...`);
        const vectors = await embeddings.embedDocuments(texts);

        const batch = codes.map((code, i) => ({ code, vector: vectors[i] }));
        await session.run(
          `UNWIND $batch AS row
           MATCH (c:CodigoArancelario {code: row.code})
           SET c.description_vector = row.vector`,
          { batch },
        );

        successCount += texts.length;
        const elapsed = Math.round((Date.now() - batchStart) / 1000);
        const min = Math.floor(elapsed / 60);
        const seg = elapsed % 60;
        const chapterInfo = chapter ? ` - Capítulo ${chapter}` : '';
        console.log(
          `Lote completado en ${min}:${String(seg).padStart(2, '0')}. Progreso: ${batchEnd}/${total}${chapterInfo}`,
        );

        const remaining = RATE_LIMIT_MS - (Date.now() - batchStart);
        if (remaining > 0) {
          console.log(`Esperando ${(remaining / 1000).toFixed(0)}s para respetar rate limit...`);
          await sleep(remaining);
        }
      } catch (batchErr) {
        failCount += batchEnd - offset;
        console.error(`Error en lote ${offset + 1}-${batchEnd}:`, batchErr);
        const remaining = RATE_LIMIT_MS - (Date.now() - batchStart);
        if (remaining > 0) await sleep(remaining);
        console.log('Continuando con siguiente lote...');
      }
    }

    console.log(`\nEmbedding completado. Exitosos: ${successCount}. Fallidos: ${failCount}.`);
  } catch (err) {
    console.error('Error en embed-nodes:', err);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();
