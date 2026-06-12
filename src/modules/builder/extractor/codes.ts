import type { Nodo, RawCodigo } from '../types.js';
import { codeId } from '../ids.js';
import { buildNodo } from './index.js';
import { logger } from '../utils/logger.js';

export function extractCodigoNodes(codigos: RawCodigo[], docId: string | null, docDate: string | null = null): Nodo[] {
  const total = codigos.length;
  return codigos.map((cod, idx) => {
    if ((idx + 1) % 1000 === 0 || idx + 1 === total) {
      logger.info(`Códigos procesados: ${idx + 1}/${total}`);
    }
    const id = codeId(cod.code);
    const capNum = cod.code.slice(0, 2);
    const tags = ['codigo-arancelario', `capitulo-${capNum}`];
    if (cod.aec?.rate === 0) tags.push('tasa-cero');
    if (cod.aec?.qualifier) tags.push(cod.aec.qualifier.toLowerCase());
    if (cod.ex_aec) tags.push('excepcion');

    const aecActual = cod.aec?.rate != null ? cod.aec.rate : null;
    const historial = docId ? [{ desde: docDate || '', hasta: null, aec: aecActual, documento: docId }] : [];

    return buildNodo(
      id,
      'codigo-arancelario',
      {
        code: cod.code,
        description: cod.description,
        sa_chapter: capNum,
        aec: cod.aec,
        aec_actual: aecActual,
        ex_aec: cod.ex_aec,
        ex_aec_legal_refs: cod.ex_aec_legal_refs.length > 0 ? cod.ex_aec_legal_refs : undefined,
        physical_unit: cod.physical_unit,
        import_regime: cod.import_regime,
        export_regime: cod.export_regime,
        source_document: docId,
        historial,
      },
      `### ${cod.code}\n\n**Descripción:** ${cod.description}\n\n` +
        `**AEC:** ${cod.aec?.rate != null ? cod.aec.rate + '%' : '—'}${cod.aec?.qualifier ? ` (${cod.aec.qualifier})` : ''}\n` +
        `**Ex.AEC:** ${cod.ex_aec || '—'}\n` +
        `**Unidad Física:** ${cod.physical_unit || '—'}\n` +
        `**Régimen Importación:** ${cod.import_regime.join(', ') || 'Ninguno'}\n` +
        `**Régimen Exportación:** ${cod.export_regime.join(', ') || 'Ninguno'}`,
      tags,
    );
  });
}
