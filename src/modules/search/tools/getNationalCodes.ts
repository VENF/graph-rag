import { withSession } from '../services/neo4j.js';

export type CodigoArancelario = {
  code: string;
  description: string;
  sa_chapter: string;
  aec_actual: number;
  physical_unit: string;
};

export const getNationalCodes = async (subheading: string): Promise<CodigoArancelario[]> =>
  withSession(async (session) => {
    const result = await session.run(
      `MATCH (n:CodigoArancelario)
       WHERE replace(n.code, '.', '') STARTS WITH $subheading
       RETURN n.code AS code, n.description AS description,
              n.sa_chapter AS sa_chapter, n.aec_actual AS aec_actual,
              n.physical_unit AS physical_unit
       ORDER BY n.code`,
      { subheading },
    );
    return result.records.map((r) => ({
      code: r.get('code'),
      description: r.get('description'),
      sa_chapter: r.get('sa_chapter'),
      aec_actual: Number(r.get('aec_actual')),
      physical_unit: r.get('physical_unit'),
    }));
  });
