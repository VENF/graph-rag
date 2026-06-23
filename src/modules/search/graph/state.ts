import { Annotation } from '@langchain/langgraph';
import { InputJsonSchema, TechnicalSheetSchema } from '../schemas/index.js';
import type { Verdict } from '../nodes/verdict/node.js';
import type { SemanticCandidate } from '../nodes/candidate-search/node.js';
import type { z } from 'zod';

export const GraphState = Annotation.Root({
  inputJson: Annotation<z.infer<typeof InputJsonSchema>>({
    reducer: (_, next) => next,
  }),
  technicalSheet: Annotation<z.infer<typeof TechnicalSheetSchema> | null>({
    reducer: (_, next) => next,
  }),
  candidates: Annotation<SemanticCandidate[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  searchAttempt: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  verdict: Annotation<Verdict | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  operationType: Annotation<string>({
    reducer: (_, next) => next,
    default: () => 'Importación',
  }),
  destinationCountry: Annotation<string>({
    reducer: (_, next) => next,
    default: () => 'Venezuela',
  }),
});

export type GraphStateType = typeof GraphState.State;
