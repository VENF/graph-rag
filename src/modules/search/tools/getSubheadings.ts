import { withSession } from '../services/neo4j.js';
import type { Subpartida } from './getHeadings.js';

export const getSubheadings = async (heading: string): Promise<Subpartida[]> =>
  withSession(async (session) => {
    const result = await session.run(
      `MATCH (n:Subpartida)
       WHERE n.code STARTS WITH $heading AND n.level = 6
       RETURN n.code AS code, n.display AS display, n.level AS level,
              n.content AS content, n.parent AS parent
       ORDER BY n.code`,
      { heading },
    );
    return result.records.map((r) => ({
      code: r.get('code'),
      display: r.get('display'),
      level: Number(r.get('level')),
      content: r.get('content'),
      parent: r.get('parent'),
    }));
  });
