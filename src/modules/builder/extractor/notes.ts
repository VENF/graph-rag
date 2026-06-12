import type { Nodo, RawCapituloSA, RawNota } from '../types.js';
import { notaId } from '../ids.js';
import { buildNodo } from './index.js';

export function extractNotaLegalNodes(capitulos: RawCapituloSA[], sectionNotas: RawNota[], docId?: string): Nodo[] {
  const nodos: Nodo[] = [];
  let idx = 0;

  for (const cap of capitulos) {
    for (const note of cap.notes) {
      const id = notaId(cap.number, note.type, idx, docId);
      const tags = ['nota-legal', `tipo-${note.type}`, `capitulo-${cap.number}`];
      nodos.push(
        buildNodo(
          id,
          'nota-legal',
          {
            nota_type: note.type,
            section: note.section,
            chapter: cap.number,
            scope: note.scope,
          },
          `### Nota ${note.type} (Capítulo ${cap.number})\n\n${note.text}`,
          tags,
        ),
      );
      idx++;
    }
  }

  for (const note of sectionNotas) {
    if (note.chapter !== null) continue;
    const id = notaId(null, note.type, idx, docId);
    const tags = ['nota-legal', `tipo-${note.type}`, ...(note.section ? [`seccion-${note.section}`] : [])];
    nodos.push(
      buildNodo(
        id,
        'nota-legal',
        {
          nota_type: note.type,
          section: note.section,
          chapter: null,
          scope: null,
        },
        `### Nota ${note.type}\n\n${note.text}`,
        tags,
      ),
    );
    idx++;
  }

  return nodos;
}
