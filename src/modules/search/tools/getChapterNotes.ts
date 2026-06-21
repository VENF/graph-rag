import { withSession } from '../services/neo4j.js';

export type ChapterNote = {
  id: string;
  type: string;
  content: string;
  scope?: string | null;
};

export const getChapterNotes = async (chapter: number): Promise<ChapterNote[]> =>
  withSession(async (session) => {
    const result = await session.run(
      `
      MATCH (c:CapituloSA {number: $chapter})
      OPTIONAL MATCH (n:NotaLegal)
      WHERE (n.nota_type IN ['seccion', 'capitulo', 'complementaria', 'subpartida'])
        AND (
          (n.nota_type = 'seccion' AND n.section = c.section)
          OR (n.nota_type IN ['capitulo', 'complementaria', 'subpartida'] AND n.chapter = $chapter)
          OR (n)-[:ACLARA]->(c)
        )
      RETURN collect(DISTINCT {
        id: n.id,
        type: n.nota_type,
        content: n.content,
        scope: n.scope
      }) AS notes
      `,
      { chapter: String(chapter) },
    );
    return result.records[0].get('notes') as ChapterNote[];
  });
