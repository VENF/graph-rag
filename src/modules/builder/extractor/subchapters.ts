import type { Nodo, RawSubcapitulo } from '../types.js';
import { subcapituloId } from '../ids.js';
import { buildNodo } from './index.js';

export function extractSubcapituloNodes(subcapitulos: RawSubcapitulo[]): Nodo[] {
  return subcapitulos.map((subcap) => {
    const id = subcapituloId(subcap.chapter, subcap.roman);
    const tags = ['subcapitulo', `capitulo-${subcap.chapter}`];
    let content = `## ${subcap.title}`;
    if (subcap.notes.length > 0) {
      content += `\n\n### Notas\n\n${subcap.notes.map((n) => n.text).join('\n\n')}`;
    }
    return buildNodo(
      id,
      'subcapitulo',
      {
        chapter: subcap.chapter,
        roman: subcap.roman,
        title: subcap.title,
        notes: subcap.notes.length > 0 ? subcap.notes : undefined,
      },
      content,
      tags,
    );
  });
}
