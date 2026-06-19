import { getDriver } from '../src/modules/search/services/neo4j.js';

const switchModel = process.argv.includes('--switch-model');
const chapter = process.argv.find((a) => a.startsWith('--chapter='))?.split('=')[1];

async function main() {
  const driver = getDriver();
  const session = driver.session();

  try {
    if (switchModel) {
      console.log('Modo --switch-model: drop index + limpiando vectores...');
      await session.run('DROP INDEX vector_mercancias IF EXISTS');
    }

    if (chapter) {
      const result = await session.run(
        `MATCH (c:CodigoArancelario {sa_chapter: $chapter})
         REMOVE c.description_vector
         RETURN count(c) AS count`,
        { chapter },
      );
      console.log(`Vectores eliminados del capítulo ${chapter}: ${result.records[0].get('count')}`);
    } else {
      const result = await session.run(
        `MATCH (c:CodigoArancelario)
         REMOVE c.description_vector
         RETURN count(c) AS count`,
      );
      console.log(`Vectores eliminados: ${result.records[0].get('count')}`);
    }

    if (switchModel) {
      console.log('Para recrear el índice, ejecuta: pnpm embed-nodes');
    }
  } catch (err) {
    console.error('Error limpiando vectores:', err);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();
