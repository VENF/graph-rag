import { Annotation } from '@langchain/langgraph';
import { InputJsonSchema, TechnicalSheetSchema } from '../schemas/index.js';
import type { z } from 'zod';

export const GraphState = Annotation.Root({
  inputJson: Annotation<z.infer<typeof InputJsonSchema>>({
    reducer: (_, next) => next,
  }),
  technicalSheet: Annotation<z.infer<typeof TechnicalSheetSchema> | null>({
    reducer: (_, next) => next,
  }),
  chapter: Annotation<number>({
    reducer: (_, next) => next,
  }),
});

export type GraphStateType = typeof GraphState.State;
