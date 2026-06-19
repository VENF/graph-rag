import { withSession } from '../services/neo4j.js';

export type Section = {
  section: string;
  section_title: string;
  chapters: Array<{ chapter: string; title: string }>;
};

export const getSections = async (): Promise<Section[]> =>
  withSession(async (session) => {
    const result = await session.run(`
      MATCH (c:CapituloSA)
      WITH c
      ORDER BY c.number
      WITH c.section AS section, c.section_title AS section_title,
           collect({chapter: c.number, title: c.title}) AS chapters,
           min(c.number) AS minChapter
      RETURN section, section_title, chapters
      ORDER BY minChapter
    `);
    return result.records.map((r) => ({
      section: r.get('section'),
      section_title: r.get('section_title'),
      chapters: r.get('chapters'),
    }));
  });
