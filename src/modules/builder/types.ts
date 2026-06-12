import type { Nodo, Relacion } from '../types.js';

export type { Nodo, Relacion };

export interface TableRow {
  cells: string[];
}

export type Token =
  | { type: 'document-header'; startLine: number; endLine: number }
  | { type: 'section-header'; startLine: number; endLine: number; roman: string; title: string }
  | {
      type: 'chapter-header';
      startLine: number;
      endLine: number;
      number: string;
      title: string;
      section: string | null;
      sectionTitle: string | null;
    }
  | { type: 'subcapitulo-header'; startLine: number; endLine: number; chapter: string; roman: string; title: string }
  | { type: 'article-header'; startLine: number; endLine: number; number: number }
  | { type: 'code-table'; startLine: number; endLine: number; lines: string[] }
  | { type: 'code-table-clean'; startLine: number; endLine: number; rows: TableRow[] }
  | { type: 'note-block'; startLine: number; endLine: number; level: number; header: string; body: string }
  | {
      type: 'sections-region';
      startLine: number;
      endLine: number;
      sections: Array<{ roman: string; title: string }>;
      chapters: Array<{ number: string; title: string; section: string | null; sectionTitle: string | null }>;
    }
  | { type: 'section-notes'; startLine: number; endLine: number; section: string | null; text: string }
  | { type: 'article-notes-region'; startLine: number; endLine: number; subtokens: Token[] }
  | { type: 'abreviaturas'; startLine: number; endLine: number }
  | { type: 'regimen-list'; startLine: number; endLine: number };

export interface LineIndex {
  articleHeaders: Array<{ line: number; number: number }>;
  codeTables: Array<{ start: number; end: number }>;
  sectionsRegion?: { start: number; end: number };
  articleNotesRegion?: { start: number; end: number };
}

export interface RawArticulo {
  number: number;
  title: string;
  content: string;
  references: number[];
  legal_chapter: string | null;
}

export interface AecRate {
  rate: number | null;
  qualifier: 'BK' | 'BIT' | null;
}

export interface RawCodigo {
  code: string;
  description: string;
  aec: AecRate | null;
  ex_aec: string | null;
  ex_aec_legal_refs: string[];
  import_regime: string[];
  export_regime: string[];
  physical_unit: string | null;
  path: string[];
}

export interface RawSubpartida {
  id: string;
  code: string;
  display: string;
  description: string;
  level: number;
  parent: string | null;
}

export interface RawNota {
  type: 'seccion' | 'complementaria' | 'subpartida' | 'capitulo' | 'subcapitulo';
  section: string | null;
  chapter: string | null;
  text: string;
  scope: string | null;
}

export interface RawRegimen {
  code: string;
  description: string;
  entity: string | null;
  is_comex_permit?: boolean;
}

export interface RawDocumento {
  id: string;
  title: string;
  number: string;
  gazette_type: string;
  date: string;
  decree: string;
  decree_date: string;
  issuer: string;
  amendment: string;
}

export interface RawSubcapitulo {
  chapter: string;
  roman: string;
  title: string;
  notes: RawNota[];
}

export interface RawCapituloSA {
  number: string;
  title: string;
  section: string | null;
  section_title: string | null;
  notes: RawNota[];
}

import type { Frontmatter } from './parser/frontmatter.js';

export interface ParsedFile {
  path: string;
  filename: string;
  frontmatter?: Frontmatter;
  document: RawDocumento | null;
  articles: RawArticulo[];
  sa_chapters: RawCapituloSA[];
  codes: RawCodigo[];
  regimes: RawRegimen[];
  subpartidas: RawSubpartida[];
  notas: RawNota[];
  subcapitulos: RawSubcapitulo[];
}
