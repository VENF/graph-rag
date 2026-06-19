import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { model } from '../../services/llm.js';
import { GraphStateType } from '../../graph/state.js';
import { TechnicalSheetSchema } from '../../schemas/index.js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SYSTEM_PROMPT = readFileSync(join(__dirname, 'prompt.md'), 'utf-8').trim();

export const distil = async (state: GraphStateType) => {
  const product = state.inputJson.producto;
  const rawText = `${product.descripcion_comercial}. ${product.uso_previsto}`;

  const response = await model.invoke([new SystemMessage(SYSTEM_PROMPT), new HumanMessage(rawText)]);
  const raw = (response.content as string).trim();

  const parsed = TechnicalSheetSchema.parse(JSON.parse(raw));

  return { technicalSheet: parsed };
};
