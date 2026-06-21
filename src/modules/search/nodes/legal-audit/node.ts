import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { model } from '../../services/llm.js';
import { GraphStateType } from '../../graph/state.js';
import { getChapterNotes, type ChapterNote } from '../../tools/getChapterNotes.js';
import { AuditDecisionSchema } from '../../schemas/index.js';
import { isMock } from '../../config/mock.js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SYSTEM_PROMPT = readFileSync(join(__dirname, 'prompt.md'), 'utf-8').trim();

export const legalAudit = async (state: GraphStateType) => {
  const currentChapter = state.chapter;
  const product = state.inputJson.producto;
  const sheet = state.technicalSheet;

  if ((state.redirectCount ?? 0) >= 3) {
    console.log('Límite de redirects alcanzado. Abortando.');
    return { auditStatus: 'passed', auditNotes: [] };
  }

  const notes: ChapterNote[] = await getChapterNotes(currentChapter);

  if (isMock()) return { auditStatus: 'passed', auditNotes: notes };

  const notesText = notes
    .map((n) => `--- Nota ${n.type.toUpperCase()} (${n.id})${n.scope ? ` [scope: ${n.scope}]` : ''} ---\n${n.content}`)
    .join('\n\n');

  const input = `
  Producto:
  - Nombre técnico: ${sheet?.technical_name ?? product.descripcion_comercial}
  - Materia constitutiva: ${sheet?.constituent_material ?? 'No especificada'}
  - Función principal: ${sheet?.primary_function ?? product.uso_previsto}
  - Presentación: ${sheet?.physical_presentation ?? 'No especificada'}
  - Especificaciones: ${JSON.stringify(sheet?.critical_specifications ?? {})}

  Capítulo actual: ${currentChapter}

  Notas Legales del capítulo:
  ${notesText || '(Sin notas legales asociadas)'}
`;

  const decision = await model
    .withStructuredOutput(AuditDecisionSchema, { name: 'audit_decision' })
    .invoke([new SystemMessage(SYSTEM_PROMPT), new HumanMessage(input)]);

  if (decision.excluded && decision.redirectChapter) {
    const newChapter = parseInt(decision.redirectChapter, 10);
    if (!isNaN(newChapter) && newChapter !== currentChapter) {
      return {
        chapter: newChapter,
        auditStatus: 'redirected',
        auditNotes: notes,
        redirectCount: (state.redirectCount ?? 0) + 1,
      };
    }
  }

  return {
    auditStatus: 'passed',
    auditNotes: notes,
  };
};
