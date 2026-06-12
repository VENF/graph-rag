import type { Nodo, Relacion, ParsedFile } from '../types.js';
import { chapterId, notaId, subpartidaId } from '../ids.js';

export function buildNotaLegalRelations(file: ParsedFile, nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = [];
  let idx = 0;
  const docId = file.document?.id;

  for (const cap of file.sa_chapters) {
    const capId = chapterId(cap.number, cap.title);
    if (!nodos.has(capId)) continue;
    for (const note of cap.notes) {
      const nid = notaId(cap.number, note.type, idx, docId);
      if (nodos.has(nid)) {
        relaciones.push({ type: 'aclara', origin: nid, target: capId });
      }
      idx++;
    }
  }

  return relaciones;
}

export function buildNotaScopeRelations(file: ParsedFile, nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = [];
  let idx = 0;
  const docId = file.document?.id;

  for (const cap of file.sa_chapters) {
    for (const note of cap.notes) {
      if (note.type !== 'subpartida' || !note.scope) {
        idx++;
        continue;
      }
      const nid = notaId(cap.number, note.type, idx, docId);
      if (!nodos.has(nid)) {
        idx++;
        continue;
      }

      const scopeCodes = note.scope.split(',');
      for (const scopeCode of scopeCodes) {
        const subId = subpartidaId(scopeCode);
        if (nodos.has(subId)) {
          relaciones.push({ type: 'modifica_criterio', origin: nid, target: subId });
        }
        for (const nodo of nodos.values()) {
          if (nodo.type === 'codigo-arancelario') {
            const rawCode = (typeof nodo.metadata.code === 'string' ? nodo.metadata.code : '').replace(/\./g, '');
            if (rawCode.startsWith(scopeCode)) {
              relaciones.push({ type: 'modifica_criterio', origin: nid, target: nodo.id });
            }
          }
        }
      }
      idx++;
    }
  }

  return relaciones;
}
