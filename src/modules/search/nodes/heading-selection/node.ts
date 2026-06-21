import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { model } from '../../services/llm.js';
import { GraphStateType } from '../../graph/state.js';
import { getHeadings } from '../../tools/getHeadings.js';
import { HeadingSelectionSchema } from '../../schemas/index.js';
import type { ChapterNote } from '../../tools/getChapterNotes.js';
import { isMock, MOCK_HEADING } from '../../config/mock.js';
import { getRGIRules } from '../../tools/rgiRules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BASE_PROMPT = readFileSync(join(__dirname, 'prompt.md'), 'utf-8').trim();
const SYSTEM_PROMPT = BASE_PROMPT + '\n\n' + getRGIRules('heading');

const extractDescription = (content: string): string => content.replace(/^###.*\n/, '').trim();

export const headingSelection = async (state: GraphStateType) => {
  const chapter = state.chapter;
  const headings = await getHeadings(chapter);
  const notes: ChapterNote[] = state.auditNotes ?? [];
  if (isMock())
    return {
      headings: headings,
      currentHeading: {
        heading: MOCK_HEADING.heading,
        explanation: MOCK_HEADING.explanation,
      },
    };
  const headingsText = headings.map((h) => `Partida ${h.code}: ${extractDescription(h.content)}`).join('\n\n');

  const notesText = notes
    .map((n) => `--- Nota ${n.type.toUpperCase()} (${n.id})${n.scope ? ` [scope: ${n.scope}]` : ''} ---\n${n.content}`)
    .join('\n\n');

  const sheet = state.technicalSheet;
  const product = state.inputJson.producto;

  const { heading, explanation } = await model
    .withStructuredOutput(HeadingSelectionSchema, { name: 'heading_selection' })
    .invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(
        `Producto:
        - Nombre técnico: ${sheet?.technical_name ?? product.descripcion_comercial}
        - Materia constitutiva: ${sheet?.constituent_material ?? 'No especificada'}
        - Función principal: ${sheet?.primary_function ?? product.uso_previsto}
        - Presentación: ${sheet?.physical_presentation ?? 'No especificada'}
        - Especificaciones críticas: ${JSON.stringify(sheet?.critical_specifications ?? {})}

        Capítulo: ${chapter}

        Partidas disponibles:
        ${headingsText}

        Notas legales aplicables:
        ${notesText || '(Sin notas legales asociadas)'}`,
      ),
    ]);

  return {
    headings,
    currentHeading: {
      heading: heading,
      explanation: explanation,
    },
  };
};
