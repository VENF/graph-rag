import { describe, it, expect } from 'vitest';
import { parseTokens } from '../parser/index.js';
import type { ParserCtx } from '../parser/handlers.js';
import { handleNoteBlock, handleSubcapituloHeader } from '../parser/handlers.js';
import {
  extractDocumento,
  extractReferencias,
  extractRegimenes,
  extractCodigosFromTable,
  extractSectionNotes,
} from '../parser/extractors.js';
import type { Token, LineIndex } from '../types.js';

function makeCtx(content: string): ParserCtx {
  const lines = content.split('\n');
  return {
    lines,
    content,
    filename: 'test.md',
    result: {
      path: '/fake/test.md',
      filename: 'test.md',
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
}

describe('extractDocumento', () => {
  it('extracts document from valid content', () => {
    const content = `N° 6.804 Extraordinario
      15 de enero de 2025
      Decreto N° 4.944`;
    const doc = extractDocumento(content, 'test.md');
    expect(doc).not.toBeNull();
    expect(doc!.number).toBe('6.804');
    expect(doc!.gazette_type).toBe('Extraordinario');
    expect(doc!.decree).toBe('4.944');
    expect(doc!.date).toBe('2025-01-15');
  });

  it('returns null when no number found', () => {
    expect(extractDocumento('sin datos', 'test.md')).toBeNull();
  });
});

describe('extractReferencias', () => {
  it('finds article references', () => {
    const refs = extractReferencias('según Artículo 3 y Artículo 5', 1);
    expect(refs).toEqual(expect.arrayContaining([3, 5]));
  });

  it('excludes self-reference', () => {
    const refs = extractReferencias('según Artículo 2', 2);
    expect(refs).not.toContain(2);
  });

  it('returns empty when no references', () => {
    expect(extractReferencias('sin referencias', 1)).toEqual([]);
  });
});

describe('extractRegimenes', () => {
  it('extracts regimes from Article 21 content', () => {
    const content = [
      '**Artículo 21.**',
      'Lista:',
      '1. 001 Descripción del Ministerio de Economía',
      '2. 002 Descripción del Banco Central',
      '**Artículo 22.**',
    ].join('\n');
    const regimes = extractRegimenes(content);
    expect(regimes.length).toBeGreaterThan(0);
  });

  it('returns empty when no Article 21', () => {
    expect(extractRegimenes('Contenido sin artículo 21')).toEqual([]);
  });
});

describe('extractCodigosFromTable', () => {
  const header = '| Código | Descripción | AEC | Ex AEC | RI | RE | UF |';
  const sep = '|--------|-------------|-----|--------|----|----|----|';
  const sub = '| Header |             |     |        |    |    |    |';
  const tableLines = [
    header,
    sep,
    sub,
    '| 0101.21.00.00 | Caballos | 20 | E | | | |',
    '| 0101.29.00.00 | Otros | 15 | A | RI1 | RE1 | uf |',
  ];

  it('parses code table lines', () => {
    const result = extractCodigosFromTable(tableLines, 0, tableLines.length - 1);
    expect(result.codigos).toHaveLength(2);
    expect(result.codigos[0].code).toBe('0101.21.00.00');
    expect(result.codigos[0].aec!.rate).toBe(20);
    expect(result.codigos[0].ex_aec_legal_refs).toContain('Artículo 11 (Excepción al AEC)');
    expect(result.codigos[1].import_regime).toContain('RI1');
    expect(result.codigos[1].physical_unit).toBe('uf');
  });

  it('includes subpartidas', () => {
    const result = extractCodigosFromTable(tableLines, 0, tableLines.length - 1);
    expect(result.subpartidas.length).toBeGreaterThan(0);
    expect(result.subpartidas.some((s) => s.code === '0101')).toBe(true);
  });
});

describe('extractSectionNotes', () => {
  it('extracts section notes', () => {
    const lines = [
      '## SECCIONES Y CAPÍTULOS',
      '### SECCIÓN I',
      'Nota de Sección',
      '1. Primera nota',
      '2. Segunda nota',
    ];
    const index: LineIndex = { articleHeaders: [], codeTables: [], sectionsRegion: { start: 0, end: 4 } };
    const notas = extractSectionNotes(lines, index);
    expect(notas.length).toBeGreaterThan(0);
    expect(notas[0].type).toBe('seccion');
    expect(notas[0].text).toMatch(/Primera nota/);
  });

  it('returns empty without sectionsRegion', () => {
    const index: LineIndex = { articleHeaders: [], codeTables: [] };
    expect(extractSectionNotes([], index)).toEqual([]);
  });
});

describe('parseTokens', () => {
  describe('handleArticle', () => {
    it('adds article to result', () => {
      const content = [
        '**Artículo 1.**',
        'Título del artículo',
        'Contenido del artículo con referencias al Artículo 3.',
      ].join('\n');
      const tokens: Token[] = [{ type: 'article-header', startLine: 0, endLine: 0, number: 1 }];
      const ctx = makeCtx(content);
      parseTokens(ctx, tokens);
      expect(ctx.result.articles).toHaveLength(1);
      expect(ctx.result.articles[0].number).toBe(1);
      expect(ctx.result.articles[0].title).toBe('Título del artículo');
      expect(ctx.result.articles[0].references).toContain(3);
    });
  });

  describe('handleCodeTable', () => {
    it('adds codes from code-table token', () => {
      const lines = [
        '| Código | Descripción | AEC | Ex AEC |',
        '|--------|-------------|-----|--------|',
        '| Header |             |     |        |',
        '| 0101.21.00.00 | Caballos | 20 | |',
      ];
      const tokens: Token[] = [{ type: 'code-table', startLine: 0, endLine: 3, lines }];
      const ctx = makeCtx(lines.join('\n'));
      parseTokens(ctx, tokens);
      expect(ctx.result.codes).toHaveLength(1);
      expect(ctx.result.codes[0].code).toBe('0101.21.00.00');
    });

    it('handles code-table-clean token', () => {
      const tokens: Token[] = [
        {
          type: 'code-table-clean',
          startLine: 0,
          endLine: 2,
          rows: [{ cells: ['0101.21.00.00', 'Caballos', '20', '', '', '', ''] }],
        },
      ];
      const ctx = makeCtx('');
      parseTokens(ctx, tokens);
      expect(ctx.result.codes).toHaveLength(1);
      expect(ctx.result.codes[0].code).toBe('0101.21.00.00');
    });
  });

  describe('handleSectionsRegion', () => {
    it('adds chapters from sections-region token', () => {
      const lines = ['## SECCIONES Y CAPÍTULOS', '### SECCIÓN I  Animales', '1. Animales vivos'];
      const tokens: Token[] = [
        {
          type: 'sections-region',
          startLine: 0,
          endLine: 2,
          sections: [{ roman: 'I', title: 'Animales' }],
          chapters: [{ number: '01', title: 'Animales vivos', section: 'I', sectionTitle: 'Animales' }],
        },
      ];
      const ctx = makeCtx(lines.join('\n'));
      parseTokens(ctx, tokens);
      expect(ctx.result.sa_chapters).toHaveLength(1);
      expect(ctx.result.sa_chapters[0].number).toBe('01');
      expect(ctx.result.sa_chapters[0].section).toBe('I');
    });
  });

  describe('handleNoteBlock', () => {
    it('classifies subpartida notes', () => {
      const ctx = makeCtx('');
      const subtokens: Token[] = [
        { type: 'note-block', startLine: 0, endLine: 2, level: 5, header: 'Notas de Subpartida', body: 'texto' },
      ];
      handleNoteBlock(ctx, subtokens, 0);
      expect(ctx.result.notas[0].type).toBe('subpartida');
    });

    it('classifies section notes', () => {
      const ctx = makeCtx('');
      const subtokens: Token[] = [
        { type: 'section-header', startLine: 0, endLine: 0, roman: 'I', title: '' },
        { type: 'note-block', startLine: 1, endLine: 3, level: 5, header: 'Notas', body: 'texto' },
      ];
      handleNoteBlock(ctx, subtokens, 1);
      expect(ctx.result.notas[0].type).toBe('seccion');
      expect(ctx.result.notas[0].section).toBe('I');
    });

    it('classifies chapter notes', () => {
      const ctx = makeCtx('');
      const subtokens: Token[] = [
        {
          type: 'chapter-header',
          startLine: 0,
          endLine: 0,
          number: '01',
          title: '',
          section: null,
          sectionTitle: null,
        },
        { type: 'note-block', startLine: 1, endLine: 3, level: 5, header: 'Notas', body: 'texto' },
      ];
      handleNoteBlock(ctx, subtokens, 1);
      expect(ctx.result.notas[0].type).toBe('capitulo');
      expect(ctx.result.notas[0].chapter).toBe('01');
    });

    it('classifies complementaria notes', () => {
      const ctx = makeCtx('');
      const subtokens: Token[] = [
        {
          type: 'chapter-header',
          startLine: 0,
          endLine: 0,
          number: '01',
          title: '',
          section: null,
          sectionTitle: null,
        },
        { type: 'note-block', startLine: 1, endLine: 3, level: 5, header: 'Notas Complementarias', body: 'texto' },
      ];
      handleNoteBlock(ctx, subtokens, 1);
      expect(ctx.result.notas[0].type).toBe('complementaria');
    });

    it('extracts scope from subpartida notes', () => {
      const ctx = makeCtx('');
      const subtokens: Token[] = [
        {
          type: 'note-block',
          startLine: 0,
          endLine: 2,
          level: 5,
          header: 'Notas de Subpartida',
          body: 'aplica a subpartida 0101.21.00.00',
        },
      ];
      handleNoteBlock(ctx, subtokens, 0);
      expect(ctx.result.notas[0].scope).not.toBeNull();
    });
  });

  describe('handleSubcapituloHeader', () => {
    it('adds subcapitulo with associated notes', () => {
      const ctx = makeCtx('');
      const subtokens: Token[] = [
        {
          type: 'chapter-header',
          startLine: 0,
          endLine: 0,
          number: '01',
          title: '',
          section: null,
          sectionTitle: null,
        },
        {
          type: 'subcapitulo-header',
          startLine: 1,
          endLine: 1,
          chapter: '01',
          roman: 'I',
          title: 'Subcapítulo I',
        },
        { type: 'note-block', startLine: 2, endLine: 4, level: 5, header: 'Notas de Subcapítulo', body: 'texto notas' },
      ];
      handleSubcapituloHeader(ctx, subtokens, 1);
      expect(ctx.result.subcapitulos).toHaveLength(1);
      expect(ctx.result.subcapitulos[0].roman).toBe('I');
      expect(ctx.result.subcapitulos[0].notes).toHaveLength(1);
    });
  });

  describe('parse', () => {
    it('produces complete ParsedFile', () => {
      const content = [
        'N° 6.804 Extraordinario',
        '15 de enero de 2025',
        'Decreto N° 4.944',
        '**Artículo 1.**',
        'Título del artículo',
        'Contenido con referencias al Artículo 3.',
        '| Código | Descripción | AEC | Ex AEC |',
        '|--------|-------------|-----|--------|',
        '| Header |             |     |        |',
        '| 0101.21.00.00 | Caballos | 20 | |',
      ].join('\n');
      const tokens: Token[] = [
        { type: 'article-header', startLine: 3, endLine: 3, number: 1 },
        { type: 'code-table', startLine: 6, endLine: 9, lines: content.split('\n').slice(6) },
      ];
      const ctx = makeCtx(content);
      const result = parseTokens(ctx, tokens);
      expect(result.document).not.toBeNull();
      expect(result.articles).toHaveLength(1);
      expect(result.codes).toHaveLength(1);
      expect(result.regimes).toEqual([]);
    });
  });
});
