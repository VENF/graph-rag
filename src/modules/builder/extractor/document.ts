import type { Nodo, RawDocumento } from '../types.js';
import { slugify } from '../utils.js';
import { buildNodo } from './index.js';

export function extractDocumentoNode(doc: RawDocumento): Nodo {
  return buildNodo(
    doc.id,
    'documento',
    {
      title: doc.title,
      number: doc.number,
      gazette_type: doc.gazette_type,
      date: doc.date,
      decree: doc.decree,
      decree_date: doc.decree_date,
      issuer: doc.issuer,
      source_document: doc.id,
      history: [{ document: doc.id, date: doc.date, type: 'creación' }],
    },
    `# ${doc.title}\n\n**Nº:** ${doc.number} ${doc.gazette_type}\n**Fecha:** ${doc.date}\n**Decreto Nº:** ${doc.decree}\n**Emisor:** ${doc.issuer}`,
    ['venezuela', 'arancel-aduanas', 'gaceta-oficial', slugify(doc.gazette_type)],
  );
}
