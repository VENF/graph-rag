import type { Nodo, Relacion, ParsedFile } from '../types.js';
import { articleId, chapterId, codeId } from '../ids.js';

export function buildDocumentRelations(file: ParsedFile, nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = [];
  const docId = file.document?.id;
  if (!docId) return relaciones;

  for (const art of file.articles) {
    const artId = articleId(art.number);
    if (nodos.has(artId)) {
      relaciones.push({ type: 'contiene', origin: docId, target: artId });
      relaciones.push({ type: 'es_parte_de', origin: artId, target: docId });
    }
  }

  for (const cap of file.sa_chapters) {
    const capId = chapterId(cap.number, cap.title);
    if (nodos.has(capId)) {
      relaciones.push({ type: 'contiene', origin: docId, target: capId });
      relaciones.push({ type: 'es_parte_de', origin: capId, target: docId });
    }
  }

  for (const cod of file.codes) {
    const codId = codeId(cod.code);
    if (nodos.has(codId)) {
      relaciones.push({ type: 'contiene', origin: docId, target: codId });
      relaciones.push({ type: 'es_parte_de', origin: codId, target: docId });
    }
  }

  return relaciones;
}
