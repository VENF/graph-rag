import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { model } from '../../services/llm.js';
import { GraphStateType } from '../../graph/state.js';
import { getNationalCodes } from '../../tools/getNationalCodes.js';
import { CodeSelectionSchema } from '../../schemas/index.js';
import type { ChapterNote } from '../../tools/getChapterNotes.js';
import { isMock, MOCK_CODE } from '../../config/mock.js';
import { getRGIRules } from '../../tools/rgiRules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BASE_PROMPT = readFileSync(join(__dirname, 'prompt.md'), 'utf-8').trim();
const SYSTEM_PROMPT = BASE_PROMPT + '\n\n' + getRGIRules('code');

export const codeSelection = async (state: GraphStateType) => {
  const subheading = state.currentSubheading;
  if (!subheading?.subheading) return { nationalCodes: [] };

  const codes = await getNationalCodes(subheading.subheading);
  const notes: ChapterNote[] = state.auditNotes ?? [];
  if (isMock())
    return {
      nationalCodes: codes,
      currentCode: {
        code: MOCK_CODE.code,
        explanation: MOCK_CODE.explanation,
      },
    };
  const codesText = codes
    .map((c) => `Código ${c.code}: ${c.description} | AEC: ${c.aec_actual}% | Unidad: ${c.physical_unit}`)
    .join('\n');

  const notesText = notes
    .map((n) => `--- Nota ${n.type.toUpperCase()} (${n.id})${n.scope ? ` [scope: ${n.scope}]` : ''} ---\n${n.content}`)
    .join('\n\n');

  const sheet = state.technicalSheet;
  const product = state.inputJson.producto;

  const { code, explanation } = await model
    .withStructuredOutput(CodeSelectionSchema, { name: 'code_selection' })
    .invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(
        `Producto:
        - Nombre técnico: ${sheet?.technical_name ?? product.descripcion_comercial}
        - Materia constitutiva: ${sheet?.constituent_material ?? 'No especificada'}
        - Función principal: ${sheet?.primary_function ?? product.uso_previsto}
        - Presentación: ${sheet?.physical_presentation ?? 'No especificada'}
        - Especificaciones críticas: ${JSON.stringify(sheet?.critical_specifications ?? {})}

        Subpartida: ${subheading.subheading}

        Códigos disponibles:
        ${codesText || '(Sin códigos nacionales asociados)'}

        Notas legales aplicables:
        ${notesText || '(Sin notas legales asociadas)'}`,
      ),
    ]);

  return {
    nationalCodes: codes,
    currentCode: { code, explanation },
  };
};
