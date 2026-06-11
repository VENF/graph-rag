import type { Nodo, Relacion, ParsedFile } from '../types.js';
import { subcapituloId } from '../ids.js';
import { buildCapituloMap } from './index.js';

export function buildSubcapituloRelations(file: ParsedFile, nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = [];
  const capMap = buildCapituloMap(nodos);

  for (const subcap of file.subcapitulos) {
    const id = subcapituloId(subcap.chapter, subcap.roman);
    if (!nodos.has(id)) continue;
    const capNodo = capMap.get(subcap.chapter);
    if (capNodo) {
      relaciones.push({ type: 'subdivide', origin: id, target: capNodo.id });
    }
  }

  return relaciones;
}
