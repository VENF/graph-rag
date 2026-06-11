import type { Nodo, ParsedFile } from '../types.js';
import { extractDocumentoNode } from './document.js';
import { extractArticuloNodes } from './articles.js';
import { extractCapituloNodes } from './chapters.js';
import { extractCodigoNodes } from './codes.js';
import { extractSubpartidaNodes } from './subpartidas.js';
import { extractRegimenNodes } from './regimes.js';
import { extractNotaLegalNodes } from './notes.js';
import { extractSubcapituloNodes } from './subchapters.js';

export function buildNodo<T extends Record<string, unknown>>(
  id: string,
  type: Nodo['type'],
  extraMeta: T,
  content: string,
  tags: string[],
): Nodo {
  return {
    id,
    type,
    metadata: { id, type, ...extraMeta },
    content,
    tags,
  };
}

function extractFromFile(file: ParsedFile): Nodo[] {
  const docId = file.document?.id || null;
  const docDate = file.document?.date || null;
  return [
    ...(file.document ? [extractDocumentoNode(file.document)] : []),
    ...extractArticuloNodes(file.articles, docId, docDate),
    ...extractCapituloNodes(file.sa_chapters, docId, docDate),
    ...extractSubpartidaNodes(file.subpartidas, docId, docDate),
    ...extractCodigoNodes(file.codes, docId, docDate),
    ...extractRegimenNodes(file.regimes, docId, docDate),
    ...extractNotaLegalNodes(file.sa_chapters, file.notas),
    ...extractSubcapituloNodes(file.subcapitulos),
  ];
}

export function extractAllNodes(files: ParsedFile[]): Map<string, Nodo> {
  const nodos = new Map<string, Nodo>();
  for (const n of files.filter(Boolean).flatMap(extractFromFile)) {
    nodos.set(n.id, n);
  }
  return nodos;
}
