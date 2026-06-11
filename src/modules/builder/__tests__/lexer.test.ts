import { describe, it, expect } from 'vitest';
import { tokenize } from '../lexer.js';

describe('tokenize', () => {
  it('tokenizes article headers', () => {
    const lines = ['**Artículo 1.** Título', 'contenido', '**Artículo 2.** Otro título'];
    const tokens = tokenize(lines);
    const articles = tokens.filter((t) => t.type === 'article-header');
    expect(articles).toHaveLength(2);
    expect(articles[0]).toEqual({ type: 'article-header', startLine: 0, endLine: 0, number: 1 });
    expect(articles[1]).toEqual({ type: 'article-header', startLine: 2, endLine: 2, number: 2 });
  });

  it('tokenizes code tables', () => {
    const lines = [
      '| Código | Descripción | AEC |',
      '|--------|-------------|-----|',
      '| Header |             |     |',
      '| 0101.21.00.00 | Caballos | 20 |',
    ];
    const tokens = tokenize(lines);
    const tables = tokens.filter((t) => t.type === 'code-table');
    expect(tables).toHaveLength(1);
    expect(tables[0].startLine).toBe(0);
    expect((tables[0] as { lines: string[] }).lines).toHaveLength(4);
  });

  it('tokenizes sections-region', () => {
    const lines = [
      '## SECCIONES Y CAPÍTULOS',
      '### SECCIÓN I  Animales vivos y productos del reino animal',
      '1. Animales vivos',
      '2. Carne y despojos comestibles',
      '### SECCIÓN II  Productos del reino vegetal',
      '6. Plantas vivas y productos de la floricultura',
    ];
    const tokens = tokenize(lines);
    const regions = tokens.filter((t) => t.type === 'sections-region');
    expect(regions).toHaveLength(1);
    const region = regions[0];
    if (region.type === 'sections-region') {
      expect(region.sections).toHaveLength(2);
      expect(region.sections[0].roman).toBe('I');
      expect(region.chapters[0].number).toBe('01');
      expect(region.chapters[0].title).toBe('Animales vivos');
    }
  });

  it('tokenizes article-notes-region', () => {
    const lines = [
      '## SECCIONES Y CAPÍTULOS',
      '### SECCIÓN I  Test',
      '1. Test',
      '## SOME OTHER HEADING',
      '### **SECCIÓN I**',
      '',
      '##### Notas',
      'Texto de la nota',
      '## NEXT SECTION',
    ];
    const tokens = tokenize(lines);
    const regions = tokens.filter((t) => t.type === 'article-notes-region');
    expect(regions).toHaveLength(1);
    const region = regions[0];
    if (region.type === 'article-notes-region') {
      expect(region.subtokens.length).toBeGreaterThan(0);
      expect(region.subtokens.some((s) => s.type === 'section-header')).toBe(true);
      expect(region.subtokens.some((s) => s.type === 'note-block')).toBe(true);
    }
  });

  it('returns empty for empty input', () => {
    expect(tokenize([])).toEqual([]);
  });

  it('handles mixed content without sections', () => {
    const lines = ['## Some heading', 'plain text'];
    const tokens = tokenize(lines);
    expect(tokens).toEqual([]);
  });
});
