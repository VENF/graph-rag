import type { Nodo, Relacion, ParsedFile } from '../types.js';
import { articleId, codeId } from '../ids.js';

export function buildExAecRelations(file: ParsedFile, nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = [];

  for (const cod of file.codes) {
    if (!cod.ex_aec_legal_refs || cod.ex_aec_legal_refs.length === 0) continue;
    const codId = codeId(cod.code);
    if (!nodos.has(codId)) continue;

    for (const ref of cod.ex_aec_legal_refs) {
      const artMatch = ref.match(/Art[íi]culo\s+(\d+)/);
      if (artMatch) {
        const artId = articleId(parseInt(artMatch[1], 10));
        if (nodos.has(artId)) {
          relaciones.push({ type: 'sujeto_a', origin: codId, target: artId });
        }
      }
    }
  }

  return relaciones;
}
