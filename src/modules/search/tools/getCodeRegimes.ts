import { withSession } from '../services/neo4j.js';

export type RegimeInfo = {
  code: string;
  description: string | null;
  entity: string | null;
};

export type ArticleInfo = {
  number: number | null;
  title: string | null;
};

export const getCodeRegimes = async (code: string): Promise<{ regimes: RegimeInfo[]; articles: ArticleInfo[] }> =>
  withSession(async (session) => {
    const result = await session.run(
      `MATCH (c:CodigoArancelario {code: $code})
       OPTIONAL MATCH (c)-[:REQUIERE]->(r:RegimenLegal)
       OPTIONAL MATCH (c)-[rel]->(a:Articulo)
       RETURN
         collect(DISTINCT {code: r.code, description: r.description, entity: r.entity}) AS regimes,
         collect(DISTINCT {number: a.number, title: a.title}) AS articles`,
      { code },
    );

    const record = result.records[0];
    if (!record) return { regimes: [], articles: [] };

    const regimes: RegimeInfo[] = (record.get('regimes') ?? []).filter((r: RegimeInfo | null) => r?.code != null);
    const articles: ArticleInfo[] = (record.get('articles') ?? []).filter((a: ArticleInfo | null) => a?.number != null);

    return { regimes, articles };
  });
