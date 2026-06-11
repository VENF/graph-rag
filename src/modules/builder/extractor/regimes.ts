import type { Nodo, RawRegimen } from '../types.js';
import { slugify } from '../utils.js';
import { regimenId } from '../ids.js';
import { buildNodo } from './index.js';

export function extractRegimenNodes(
  regimenes: RawRegimen[],
  docId: string | null,
  docDate: string | null = null,
): Nodo[] {
  return regimenes.map((reg) => {
    const id = regimenId(reg.code);
    const tags = ['regimen-legal'];
    if (reg.entity) tags.push(slugify(reg.entity));
    const historyEntry = docId ? [{ document: docId, date: docDate || '', type: 'creación' as const }] : [];

    return buildNodo(
      id,
      'regimen-legal',
      {
        code: reg.code,
        description: reg.description,
        entity: reg.entity,
        source_document: docId,
        history: historyEntry,
        is_comex_permit: reg.code === '9' ? true : undefined,
      },
      `## Régimen Legal ${reg.code}\n\n${reg.description}` + (reg.entity ? `\n\n**Entidad:** ${reg.entity}` : ''),
      tags,
    );
  });
}
