import type { Nodo, RawSubpartida } from '../types.js';
import { buildNodo } from './index.js';

export function extractSubpartidaNodes(
  subpartidas: RawSubpartida[],
  docId: string | null,
  docDate: string | null = null,
): Nodo[] {
  const seen = new Set<string>();
  const nodos: Nodo[] = [];
  for (const sub of subpartidas) {
    if (seen.has(sub.id)) continue;
    seen.add(sub.id);
    const historyEntry = docId ? [{ document: docId, date: docDate || '', type: 'creación' as const }] : [];
    const tags = ['subpartida', `nivel-${sub.level}`];
    if (sub.level === 4) tags.push('partida-sa');

    const content =
      `### ${sub.display}\n\n**Nivel:** ${sub.level} dígitos` + (sub.description ? `\n\n${sub.description}` : '');

    nodos.push(
      buildNodo(
        sub.id,
        'subpartida',
        {
          code: sub.code,
          display: sub.display,
          level: sub.level,
          parent: sub.parent,
          source_document: docId,
          history: historyEntry,
        },
        content,
        tags,
      ),
    );
  }
  return nodos;
}
