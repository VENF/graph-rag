import { withSession } from '../services/neo4j.js';

export type Subpartida = {
  code: string;
  display: string;
  level: number;
  content: string;
  parent: string | null;
};

export const getHeadings = async (chapter: number): Promise<Subpartida[]> =>
  withSession(async (session) => {
    const result = await session.run(
      `MATCH (n:Subpartida)
       WHERE n.code STARTS WITH $chapter AND n.level = 4
       RETURN n.code AS code, n.display AS display, n.level AS level,
              n.content AS content, n.parent AS parent
       ORDER BY n.code`,
      { chapter: String(chapter) },
    );
    return result.records.map((r) => ({
      code: r.get('code'),
      display: r.get('display'),
      level: Number(r.get('level')),
      content: r.get('content'),
      parent: r.get('parent'),
    }));
  });
