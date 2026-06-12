import fs from 'fs';
import path from 'path';
import type { Token, ParsedFile } from '../types.js';
import { tokenize } from '../lexer.js';
import { extractDocumento, extractRegimenes } from './extractors.js';
import { parseFrontmatter, stripFrontmatter } from './frontmatter.js';
import { cleanPageBreaks } from './utils.js';
import { handleArticle, handleCodeTable, handleSectionsRegion, handleArticleNotesRegion } from './handlers.js';
import type { ParserCtx } from './handlers.js';

export function readSourceFiles(inputDir: string, patterns: string[]): string[] {
  try {
    const files = fs.readdirSync(inputDir);
    return files
      .filter((f) => {
        const base = path.basename(f);
        return patterns.some((p) => {
          const escaped = p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
          const regex = new RegExp('^' + escaped + '$');
          return regex.test(base);
        });
      })
      .map((f) => path.join(inputDir, f));
  } catch (cause) {
    throw new Error(`No se pudo leer el directorio de entrada: ${inputDir}`, { cause });
  }
}

export function parseTokens(ctx: ParserCtx, tokens: Token[]): ParsedFile {
  const content = ctx.frontmatter ? stripFrontmatter(ctx.content) : ctx.content;

  ctx.result.document = extractDocumento(content, ctx.filename, ctx.frontmatter);
  ctx.result.regimes = extractRegimenes(content);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    switch (token.type) {
      case 'article-header':
        handleArticle(ctx, token, tokens, i);
        break;
      case 'code-table':
      case 'code-table-clean':
        handleCodeTable(ctx, token);
        break;
      case 'sections-region':
        handleSectionsRegion(ctx, token);
        break;
      case 'article-notes-region':
        handleArticleNotesRegion(ctx, token);
        break;
    }
  }

  return ctx.result;
}

export function parseFileSync(filePath: string, filename: string): ParsedFile {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const frontmatter = parseFrontmatter(raw);
  const cleaned = frontmatter ? stripFrontmatter(raw) : raw;
  const content = cleanPageBreaks(cleaned);
  const lines = content.split('\n');
  const tokens = tokenize(lines);

  const ctx: ParserCtx = {
    lines,
    content,
    filename,
    frontmatter: frontmatter ?? undefined,
    result: {
      path: filePath,
      filename,
      frontmatter: frontmatter ?? undefined,
      document: null,
      articles: [],
      sa_chapters: [],
      codes: [],
      regimes: [],
      subpartidas: [],
      notas: [],
      subcapitulos: [],
    },
  };

  return parseTokens(ctx, tokens);
}
