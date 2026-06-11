import type { Nodo, Relacion, ParsedFile } from '../types.js';
import { codeId } from '../ids.js';
import { buildCapituloMap } from './index.js';

export function buildSubpartidaRelations(file: ParsedFile, nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = [];
  const capMap = buildCapituloMap(nodos);

  const subpartidaNodes = new Map<string, Nodo>();
  for (const nodo of nodos.values()) {
    if (nodo.type === 'subpartida') {
      subpartidaNodes.set(nodo.id, nodo);
    }
  }

  for (const sub of file.subpartidas) {
    if (sub.parent && subpartidaNodes.has(sub.parent)) {
      relaciones.push({ type: 'es_parte_de', origin: sub.id, target: sub.parent });
    }

    if (sub.level === 4) {
      const capNum = sub.code.slice(0, 2);
      const capNodo = capMap.get(capNum);
      if (capNodo) {
        relaciones.push({ type: 'es_parte_de', origin: sub.id, target: capNodo.id });
      }
    }
  }

  for (const cod of file.codes) {
    const codId = codeId(cod.code);
    if (!nodos.has(codId)) continue;
    if (cod.path.length > 0) {
      const parentSubId = cod.path[cod.path.length - 1];
      if (subpartidaNodes.has(parentSubId)) {
        relaciones.push({ type: 'es_parte_de', origin: codId, target: parentSubId });
      }
    }
  }

  return relaciones;
}
