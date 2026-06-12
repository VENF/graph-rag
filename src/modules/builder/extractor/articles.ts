import type { Nodo, RawArticulo } from '../types.js';
import { slugify } from '../utils.js';
import { articleId } from '../ids.js';
import { buildNodo } from './index.js';

export function extractArticuloNodes(
  articulos: RawArticulo[],
  docId: string | null,
  docDate: string | null = null,
): Nodo[] {
  return articulos.map((art) => {
    const id = articleId(art.number, docId || undefined);
    const tags = ['articulo'];
    if (art.legal_chapter) {
      tags.push(`capitulo-${slugify(art.legal_chapter)}`);
    }
    const historyEntry = docId ? [{ document: docId, date: docDate || '', type: 'creación' as const }] : [];
    return buildNodo(
      id,
      'articulo',
      {
        number: art.number,
        title: art.title,
        legal_chapter: art.legal_chapter,
        references: art.references,
        source_document: docId,
        history: historyEntry,
      },
      art.content,
      tags,
    );
  });
}
