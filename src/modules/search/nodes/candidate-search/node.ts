import neo4j from 'neo4j-driver';
import { GraphStateType } from '../../graph/state.js';
import { embeddings } from '../../services/embeddings.js';
import { withSession } from '../../services/neo4j.js';
import { isMock } from '../../config/mock.js';

type HierarchyNode = {
  type: 'capitulo' | 'partida' | 'subpartida_sa' | 'subpartida_nacional' | 'codigo_arancelario';
  code: string;
  title: string | null;
  description: string;
  aec_actual?: number;
  physical_unit?: string;
  ex_aec?: number | null;
  ex_aec_legal_refs?: string[] | null;
};

type RegimeInfo = {
  code: string;
  description: string | null;
  entity: string | null;
};

type ArticleInfo = {
  number: number | null;
  title: string | null;
};

type ChapterNote = {
  id: string;
  type: string;
  content: string;
  scope?: string | null;
};

export type SemanticCandidate = {
  code: string;
  description: string;
  score: number;
  aec_actual: number;
  physical_unit: string;
  sa_chapter: string;
  hierarchy: HierarchyNode[];
  regimes: RegimeInfo[];
  articles: ArticleInfo[];
  chapterNotes: ChapterNote[];
};

type EnrichRow = {
  code: string;
  ch_number: string | null;
  ch_title: string | null;
  ch_content: string | null;
  s4_code: string | null;
  s4_content: string | null;
  s6_code: string | null;
  s6_content: string | null;
  s8_code: string | null;
  s8_content: string | null;
  c_description: string;
  c_aec: number | null;
  c_unit: string | null;
  c_ex_aec: number | null;
  c_ex_refs: string[] | null;
  regimes: RegimeInfo[];
  articles: ArticleInfo[];
};

const VECTOR_QUERY = `CALL db.index.vector.queryNodes('vector_mercancias', $topK, $vector)
 YIELD node, score
 RETURN node.code AS code, node.description AS description, score,
        node.aec_actual AS aec_actual, node.physical_unit AS physical_unit,
        node.sa_chapter AS sa_chapter
 ORDER BY score DESC`;

const ENRICH_QUERY = `UNWIND $codes AS code
MATCH (c:CodigoArancelario {code: code})
OPTIONAL MATCH (c)-[:PERTENECE_A]->(ch:CapituloSA)
OPTIONAL MATCH (c)-[:ES_PARTE_DE]->(s8:Subpartida)
OPTIONAL MATCH (s8)-[:ES_PARTE_DE]->(s6:Subpartida)
OPTIONAL MATCH (s6)-[:ES_PARTE_DE]->(s4:Subpartida)
OPTIONAL MATCH (c)-[:REQUIERE]->(r:RegimenLegal)
OPTIONAL MATCH (c)-[rel]->(a:Articulo)
WITH c, ch, s4, s6, s8,
  COLLECT(DISTINCT {code: r.code, description: r.description, entity: r.entity}) AS regimes,
  COLLECT(DISTINCT {number: a.number, title: a.title}) AS articles
RETURN c.code AS code,
  ch.number AS ch_number, ch.title AS ch_title, ch.content AS ch_content,
  s4.code AS s4_code, s4.content AS s4_content,
  s6.code AS s6_code, s6.content AS s6_content,
  s8.code AS s8_code, s8.content AS s8_content,
  c.description AS c_description,
  c.aec_actual AS c_aec, c.physical_unit AS c_unit,
  c.ex_aec AS c_ex_aec, c.ex_aec_legal_refs AS c_ex_refs,
  regimes, articles`;

const NOTES_QUERY = `UNWIND $chapters AS chapter
MATCH (c:CapituloSA {number: chapter})
OPTIONAL MATCH (n:NotaLegal)
WHERE (n.nota_type IN ['seccion', 'capitulo', 'complementaria', 'subpartida', 'subcapitulo'])
  AND (
    (n.nota_type = 'seccion' AND n.section = c.section)
    OR (n.nota_type IN ['capitulo', 'complementaria', 'subpartida'] AND n.chapter = chapter)
    OR (n)-[:ACLARA]->(c)
  )
RETURN chapter, COLLECT(DISTINCT {
  id: n.id,
  type: n.nota_type,
  content: n.content,
  scope: n.scope
}) AS notes`;

const buildHierarchy = (row: EnrichRow): HierarchyNode[] => {
  const hierarchy: HierarchyNode[] = [];
  if (row.ch_number != null) {
    hierarchy.push({ type: 'capitulo', code: row.ch_number, title: row.ch_title, description: row.ch_content ?? '' });
  }
  if (row.s4_code != null) {
    hierarchy.push({ type: 'partida', code: row.s4_code, title: null, description: row.s4_content ?? '' });
  }
  if (row.s6_code != null) {
    hierarchy.push({ type: 'subpartida_sa', code: row.s6_code, title: null, description: row.s6_content ?? '' });
  }
  if (row.s8_code != null) {
    hierarchy.push({
      type: 'subpartida_nacional',
      code: row.s8_code,
      title: null,
      description: row.s8_content ?? '',
    });
  }
  hierarchy.push({
    type: 'codigo_arancelario',
    code: row.code,
    title: null,
    description: row.c_description,
    aec_actual: row.c_aec ?? undefined,
    physical_unit: row.c_unit ?? undefined,
    ex_aec: row.c_ex_aec,
    ex_aec_legal_refs: row.c_ex_refs,
  });
  return hierarchy;
};

const embedProduct = (state: GraphStateType): string => {
  const sheet = state.technicalSheet;
  return [
    `Nombre técnico: ${sheet?.technical_name}`,
    `Materia constitutiva: ${sheet?.constituent_material}`,
    `Función principal: ${sheet?.primary_function}`,
    `Presentación: ${sheet?.physical_presentation}`,
    sheet?.critical_specifications && Object.keys(sheet.critical_specifications).length > 0
      ? `Especificaciones: ${JSON.stringify(sheet.critical_specifications)}`
      : null,
  ]
    .filter(Boolean)
    .join('. ');
};

export const candidateSearch = async (state: GraphStateType) => {
  const searchAttempt = state.searchAttempt ?? 0;
  const topK = searchAttempt === 0 ? 3 : 15;

  if (isMock()) {
    return {
      candidates: [],
      searchAttempt: searchAttempt + 1,
    };
  }

  const [vector] = await embeddings.embedDocuments([embedProduct(state)]);

  const candidates: SemanticCandidate[] = await withSession(async (session) => {
    const result = await session.run(VECTOR_QUERY, { topK: neo4j.int(topK), vector });
    const records = result.records;
    if (records.length === 0) return [];

    const codes = records.map((r) => r.get('code') as string);

    const enrichResult = await session.run(ENRICH_QUERY, { codes });
    const enrichMap = new Map<
      string,
      Omit<
        SemanticCandidate,
        'code' | 'description' | 'score' | 'aec_actual' | 'physical_unit' | 'sa_chapter' | 'chapterNotes'
      >
    >();

    for (const record of enrichResult.records) {
      const row: EnrichRow = {
        code: record.get('code'),
        ch_number: record.get('ch_number'),
        ch_title: record.get('ch_title'),
        ch_content: record.get('ch_content'),
        s4_code: record.get('s4_code'),
        s4_content: record.get('s4_content'),
        s6_code: record.get('s6_code'),
        s6_content: record.get('s6_content'),
        s8_code: record.get('s8_code'),
        s8_content: record.get('s8_content'),
        c_description: record.get('c_description') ?? '',
        c_aec: record.get('c_aec'),
        c_unit: record.get('c_unit'),
        c_ex_aec: record.get('c_ex_aec'),
        c_ex_refs: record.get('c_ex_refs'),
        regimes: (record.get('regimes') ?? []).filter((r: any) => r?.code != null),
        articles: (record.get('articles') ?? []).filter((a: any) => a?.number != null),
      };
      enrichMap.set(row.code, { hierarchy: buildHierarchy(row), regimes: row.regimes, articles: row.articles });
    }

    const uniqueChapters = [...new Set(records.map((r) => r.get('sa_chapter') as string))];
    const notesResult = await session.run(NOTES_QUERY, { chapters: uniqueChapters });
    const notesMap = new Map<string, ChapterNote[]>();
    for (const record of notesResult.records) {
      notesMap.set(record.get('chapter') as string, (record.get('notes') ?? []) as ChapterNote[]);
    }

    return records.map((r) => {
      const code = r.get('code') as string;
      const e = enrichMap.get(code);
      return {
        code,
        description: r.get('description') as string,
        score: r.get('score') as number,
        aec_actual: Number(r.get('aec_actual')),
        physical_unit: (r.get('physical_unit') as string) ?? '',
        sa_chapter: r.get('sa_chapter') as string,
        hierarchy: e?.hierarchy ?? [],
        regimes: e?.regimes ?? [],
        articles: e?.articles ?? [],
        chapterNotes: notesMap.get(r.get('sa_chapter') as string) ?? [],
      };
    });
  });

  return {
    candidates,
    searchAttempt: searchAttempt + 1,
  };
};
