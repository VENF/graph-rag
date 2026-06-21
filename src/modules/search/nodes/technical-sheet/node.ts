import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { model } from '../../services/llm.js';
import { GraphStateType } from '../../graph/state.js';
import { TechnicalSheetSchema } from '../../schemas/index.js';
import { isMock, MOCK_TECHNICAL_SHEET } from '../../config/mock.js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SYSTEM_PROMPT = readFileSync(join(__dirname, 'prompt.md'), 'utf-8').trim();

export const distil = async (state: GraphStateType) => {
  if (isMock()) return { technicalSheet: MOCK_TECHNICAL_SHEET };

  const product = state.inputJson.producto;
  const rawText = `${product.descripcion_comercial}. ${product.uso_previsto}`;

  const parsed = await model
    .withStructuredOutput(TechnicalSheetSchema, { name: 'technical_sheet' })
    .invoke([new SystemMessage(SYSTEM_PROMPT), new HumanMessage(rawText)]);

  return { technicalSheet: parsed };
};
