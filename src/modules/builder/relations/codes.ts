import type { Nodo, Relacion, ParsedFile } from '../types.js';
import { codeId, regimenId } from '../ids.js';

export function buildCodeChapterRelations(file: ParsedFile, nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = [];
  const capMap = buildCapituloMap(nodos);

  for (const cod of file.codes) {
    const codId = codeId(cod.code);
    if (!nodos.has(codId)) continue;
    const capNum = cod.code.slice(0, 2);
    const capNodo = capMap.get(capNum);
    if (capNodo) {
      relaciones.push({ type: 'pertenece_a', origin: codId, target: capNodo.id });
    }
  }

  return relaciones;
}

export function buildCodeRegimeRelations(file: ParsedFile, nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = [];

  for (const cod of file.codes) {
    const codId = codeId(cod.code);
    if (!nodos.has(codId)) continue;

    const allRegimes = [...cod.import_regime, ...cod.export_regime];
    for (const regCode of [...new Set(allRegimes)]) {
      const regId = regimenId(regCode);
      if (nodos.has(regId)) {
        relaciones.push({ type: 'requiere', origin: codId, target: regId });
      }
    }
  }

  return relaciones;
}

function buildCapituloMap(nodos: Map<string, Nodo>): Map<string, Nodo> {
  const map = new Map<string, Nodo>();
  for (const nodo of nodos.values()) {
    if (nodo.type === 'capitulo' && typeof nodo.metadata.number === 'string') {
      map.set(nodo.metadata.number, nodo);
    }
  }
  return map;
}
