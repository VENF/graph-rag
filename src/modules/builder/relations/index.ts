import type { Nodo, Relacion, ParsedFile } from '../types.js';
import { buildDocumentRelations } from './document.js';
import { buildCodeChapterRelations, buildCodeRegimeRelations } from './codes.js';
import {
  buildArticleCrossReferences,
  buildArticle21Relations,
  buildArticles22to36Relations,
  buildArticle37Relations,
} from './articles.js';
import { buildSubpartidaRelations } from './subpartidas.js';
import { buildNotaLegalRelations, buildNotaScopeRelations } from './notes.js';
import { buildExAecRelations } from './ex-aec.js';
import { buildSubcapituloRelations } from './subchapters.js';

export function buildCapituloMap(nodos: Map<string, Nodo>): Map<string, Nodo> {
  const map = new Map<string, Nodo>();
  for (const nodo of nodos.values()) {
    if (nodo.type === 'capitulo' && typeof nodo.metadata.number === 'string') {
      map.set(nodo.metadata.number, nodo);
    }
  }
  return map;
}

export function buildRelations(nodos: Map<string, Nodo>, files: ParsedFile[]): Relacion[] {
  const relaciones: Relacion[] = [];

  for (const file of files) {
    relaciones.push(
      ...buildDocumentRelations(file, nodos),
      ...buildCodeChapterRelations(file, nodos),
      ...buildCodeRegimeRelations(file, nodos),
      ...buildArticleCrossReferences(file, nodos),
      ...buildArticle21Relations(file, nodos),
      ...buildArticles22to36Relations(file, nodos),
      ...buildSubpartidaRelations(file, nodos),
      ...buildNotaLegalRelations(file, nodos),
      ...buildNotaScopeRelations(file, nodos),
      ...buildExAecRelations(file, nodos),
      ...buildSubcapituloRelations(file, nodos),
    );
    relaciones.push(...buildArticle37Relations(nodos));
  }

  return relaciones;
}
