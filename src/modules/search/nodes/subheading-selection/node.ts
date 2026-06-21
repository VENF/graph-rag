import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { model } from '../../services/llm.js';
import { GraphStateType } from '../../graph/state.js';
import { getSubheadings } from '../../tools/getSubheadings.js';
import { SubheadingSelectionSchema } from '../../schemas/index.js';
import type { ChapterNote } from '../../tools/getChapterNotes.js';
import { isMock, MOCK_SUBHEADING } from '../../config/mock.js';
import { getRGIRules } from '../../tools/rgiRules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BASE_PROMPT = readFileSync(join(__dirname, 'prompt.md'), 'utf-8').trim();
const SYSTEM_PROMPT = BASE_PROMPT + '\n\n' + getRGIRules('subheading');

const extractDescription = (content: string): string => content.replace(/^###.*\n/, '').trim();

export const subheadingSelection = async (state: GraphStateType) => {
  const heading = state.currentHeading;
  if (!heading) return { subheadings: [] };

  const subheadings = await getSubheadings(heading.heading);
  const notes: ChapterNote[] = state.auditNotes ?? [];
  if (isMock())
    return {
      subheadings: subheadings,
      currentSubheading: {
        subheading: MOCK_SUBHEADING.subheading,
        explanation: MOCK_SUBHEADING.explanation,
      },
    };
  const subheadingsText = subheadings.map((s) => `Subpartida ${s.code}: ${extractDescription(s.content)}`).join('\n\n');

  const notesText = notes
    .map((n) => `--- Nota ${n.type.toUpperCase()} (${n.id})${n.scope ? ` [scope: ${n.scope}]` : ''} ---\n${n.content}`)
    .join('\n\n');

  const sheet = state.technicalSheet;
  const product = state.inputJson.producto;

  const { subheading, explanation } = await model
    .withStructuredOutput(SubheadingSelectionSchema, { name: 'subheading_selection' })
    .invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(
        `Producto:
        - Nombre técnico: ${sheet?.technical_name ?? product.descripcion_comercial}
        - Materia constitutiva: ${sheet?.constituent_material ?? 'No especificada'}
        - Función principal: ${sheet?.primary_function ?? product.uso_previsto}
        - Presentación: ${sheet?.physical_presentation ?? 'No especificada'}
        - Especificaciones críticas: ${JSON.stringify(sheet?.critical_specifications ?? {})}

        Capítulo: ${state.chapter} | Partida: ${heading}

        Subpartidas disponibles:
        ${subheadingsText}

        Notas legales aplicables:
        ${notesText || '(Sin notas legales asociadas)'}`,
      ),
    ]);

  return {
    subheadings,
    currentSubheading: {
      subheading: subheading,
      explanation: explanation,
    },
  };
};
