import { withSession } from '../services/neo4j.js';

export type HierarchyNode = {
  type: 'capitulo' | 'partida' | 'subpartida_sa' | 'subpartida_nacional' | 'codigo_arancelario';
  code: string;
  title: string | null;
  description: string;
  aec_actual?: number;
  physical_unit?: string;
  ex_aec?: number | null;
  ex_aec_legal_refs?: string[] | null;
};

export const getCodeHierarchy = async (code: string): Promise<HierarchyNode[]> =>
  withSession(async (session) => {
    const result = await session.run(
      `MATCH (c:CodigoArancelario {code: $code})
       OPTIONAL MATCH (c)-[:PERTENECE_A]->(ch:CapituloSA)
       OPTIONAL MATCH (c)-[:ES_PARTE_DE]->(s8:Subpartida)
       OPTIONAL MATCH (s8)-[:ES_PARTE_DE]->(s6:Subpartida)
       OPTIONAL MATCH (s6)-[:ES_PARTE_DE]->(s4:Subpartida)
       RETURN
         {type: 'capitulo', code: ch.number, title: ch.title, description: ch.content} AS chapter,
         {type: 'partida', code: s4.code, title: null, description: s4.content} AS heading,
         {type: 'subpartida_sa', code: s6.code, title: null, description: s6.content} AS subheadingSA,
         {type: 'subpartida_nacional', code: s8.code, title: null, description: s8.content} AS subheadingNac,
         {type: 'codigo_arancelario', code: c.code, title: null, description: c.description, aec_actual: c.aec_actual, physical_unit: c.physical_unit, ex_aec: c.ex_aec, ex_aec_legal_refs: c.ex_aec_legal_refs} AS codeNode`,
      { code },
    );

    const record = result.records[0];
    if (!record) return [];

    const hierarchy: HierarchyNode[] = [];

    const chapter = record.get('chapter');
    if (chapter?.code) hierarchy.push(chapter);

    const heading = record.get('heading');
    if (heading?.code) hierarchy.push(heading);

    const subheadingSA = record.get('subheadingSA');
    if (subheadingSA?.code) hierarchy.push(subheadingSA);

    const subheadingNac = record.get('subheadingNac');
    if (subheadingNac?.code) hierarchy.push(subheadingNac);

    const codeNode = record.get('codeNode');
    if (codeNode?.code) hierarchy.push(codeNode);

    return hierarchy;
  });
