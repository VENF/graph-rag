import type { Nodo, RawCapituloSA } from '../types.js';
import { slugify } from '../utils.js';
import { chapterId } from '../ids.js';
import { buildNodo } from './index.js';

export function extractCapituloNodes(
  capitulos: RawCapituloSA[],
  docId: string | null,
  docDate: string | null = null,
): Nodo[] {
  return capitulos.map((cap) => {
    const id = chapterId(cap.number, cap.title);
    const seccionTag = cap.section ? `seccion-${slugify(cap.section)}` : null;
    const historyEntry = docId ? [{ document: docId, date: docDate || '', type: 'creación' as const }] : [];
    let content = `## CAPÍTULO ${cap.number}\n\n${cap.title}`;
    if (cap.section_title) {
      content += `\n\n*Sección ${cap.section}: ${cap.section_title}*`;
    }
    if (cap.notes.length > 0) {
      content += `\n\n### Notas\n\n${cap.notes.map((n) => n.text).join('\n\n')}`;
    }
    return buildNodo(
      id,
      'capitulo',
      {
        number: cap.number,
        title: cap.title,
        section: cap.section,
        section_title: cap.section_title,
        notes: cap.notes.length > 0 ? cap.notes : undefined,
        source_document: docId,
        history: historyEntry,
      },
      content,
      ['capitulo-sa', ...(seccionTag ? [seccionTag] : [])],
    );
  });
}
