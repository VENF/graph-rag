import type { Token, ParsedFile, RawNota, LineIndex } from '../types.js';
import { extractReferencias, extractCodigosFromTable, extractSectionNotes } from './extractors.js';
import { cleanPageBreaks, extractScopeCodes } from './utils.js';

export interface ParserCtx {
  lines: string[];
  content: string;
  filename: string;
  result: ParsedFile;
}

export function handleArticle(ctx: ParserCtx, token: Token, tokens: Token[], index: number): void {
  if (token.type !== 'article-header') return;

  let endLine = ctx.lines.length;
  for (let j = index + 1; j < tokens.length; j++) {
    if (tokens[j].type === 'article-header') {
      endLine = tokens[j].startLine;
      break;
    }
  }

  const rawContent = cleanPageBreaks(
    ctx.lines
      .slice(token.startLine + 1, endLine)
      .join('\n')
      .trim(),
  );

  const tituloMatch = rawContent.match(/^(.+?)(?:\n|$)/);
  ctx.result.articles.push({
    number: token.number,
    title: tituloMatch ? tituloMatch[1].trim() : '',
    content: rawContent,
    references: extractReferencias(rawContent, token.number),
    legal_chapter: null,
  });
}

export function handleCodeTable(ctx: ParserCtx, token: Token): void {
  let lines: string[];
  if (token.type === 'code-table') {
    lines = token.lines;
  } else if (token.type === 'code-table-clean') {
    const dataLines = token.rows.map((r) => `| ${r.cells.join(' | ')} |`);
    lines = [
      '| Código | Descripción | AEC | Ex AEC | RI | RE | UF |',
      '|--------|-------------|-----|--------|----|----|----|',
      '| Header |             |     |        |    |    |    |',
      ...dataLines,
    ];
  } else {
    return;
  }

  const { codigos, subpartidas } = extractCodigosFromTable(lines, 0, lines.length - 1);
  ctx.result.codes.push(...codigos);

  for (const sub of subpartidas) {
    if (!ctx.result.subpartidas.some((s) => s.id === sub.id)) {
      ctx.result.subpartidas.push(sub);
    }
  }
}

export function handleSectionsRegion(ctx: ParserCtx, token: Token): void {
  if (token.type !== 'sections-region') return;

  for (const ch of token.chapters) {
    ctx.result.sa_chapters.push({
      number: ch.number,
      title: ch.title,
      section: ch.section,
      section_title: ch.sectionTitle,
      notes: [],
    });
  }

  const virtualIndex: LineIndex = {
    articleHeaders: [],
    codeTables: [],
    sectionsRegion: { start: token.startLine, end: token.endLine },
  };
  const sectionNotas = extractSectionNotes(ctx.lines, virtualIndex);
  ctx.result.notas.push(...sectionNotas);
}

export function handleArticleNotesRegion(ctx: ParserCtx, token: Token): void {
  if (token.type !== 'article-notes-region') return;

  const sub = token.subtokens;
  for (let i = 0; i < sub.length; i++) {
    switch (sub[i].type) {
      case 'note-block':
        handleNoteBlock(ctx, sub, i);
        break;
      case 'subcapitulo-header':
        handleSubcapituloHeader(ctx, sub, i);
        break;
    }
  }
}

export function handleNoteBlock(ctx: ParserCtx, subtokens: Token[], index: number): void {
  const token = subtokens[index];
  if (token.type !== 'note-block') return;

  let section: string | null = null;
  let chapter: string | null = null;
  for (let j = index - 1; j >= 0; j--) {
    const prev = subtokens[j];
    if (prev.type === 'section-header') {
      section = prev.roman;
      break;
    }
    if (prev.type === 'chapter-header') {
      chapter = prev.number;
      break;
    }
  }

  let type: RawNota['type'];
  if (/notas?\s+de\s+subpartida/i.test(token.header)) {
    type = 'subpartida';
  } else if (/notas?\s+complementaria/i.test(token.header)) {
    type = 'complementaria';
  } else if (/Notas?\s+de\s+Subcap[íi]tulo/i.test(token.header)) {
    type = 'subcapitulo';
  } else if (section) {
    type = 'seccion';
  } else {
    type = 'capitulo';
  }

  const scope = type === 'subpartida' ? extractScopeCodes(token.body).join(',') || null : null;
  const ch = type === 'capitulo' || type === 'subpartida' || type === 'complementaria' ? chapter : null;

  const nota: RawNota = { type, section, chapter: ch, text: token.body, scope };
  ctx.result.notas.push(nota);

  if (ch) {
    const targetCap = ctx.result.sa_chapters.find((c) => c.number === ch);
    if (targetCap) {
      targetCap.notes.push(nota);
    }
  }
}

export function handleSubcapituloHeader(ctx: ParserCtx, subtokens: Token[], index: number): void {
  const token = subtokens[index];
  if (token.type !== 'subcapitulo-header') return;

  const subcap = {
    chapter: token.chapter,
    roman: token.roman,
    title: token.title,
    notes: [] as RawNota[],
  };

  for (let j = index + 1; j < subtokens.length; j++) {
    const next = subtokens[j];
    if (next.type === 'subcapitulo-header') break;
    if (next.type === 'note-block' && /Notas?\s+de\s+Subcap[íi]tulo/i.test(next.header)) {
      subcap.notes.push({
        type: 'subcapitulo' as const,
        section: null,
        chapter: token.chapter,
        text: next.body,
        scope: null,
      });
    }
  }

  ctx.result.subcapitulos.push(subcap);
}
