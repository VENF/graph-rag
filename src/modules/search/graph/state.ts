import { Annotation } from '@langchain/langgraph';
import {
  CodeSelection,
  HeadingSelection,
  InputJsonSchema,
  SubheadingSelection,
  TechnicalSheetSchema,
} from '../schemas/index.js';
import type { ChapterNote } from '../tools/getChapterNotes.js';
import type { Subpartida } from '../tools/getHeadings.js';
import type { CodigoArancelario } from '../tools/getNationalCodes.js';
import type { HierarchyNode } from '../tools/getCodeHierarchy.js';
import type { RegimeInfo, ArticleInfo } from '../tools/getCodeRegimes.js';
import type { Verdict } from '../nodes/verdict/node.js';
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
  chapterExplanation: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  auditStatus: Annotation<'pending' | 'passed' | 'redirected'>({
    reducer: (_, next) => next,
    default: () => 'pending',
  }),
  auditNotes: Annotation<ChapterNote[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  redirectCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  headings: Annotation<Subpartida[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  currentHeading: Annotation<HeadingSelection | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  subheadings: Annotation<Subpartida[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  currentSubheading: Annotation<SubheadingSelection | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  nationalCodes: Annotation<CodigoArancelario[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  currentCode: Annotation<CodeSelection | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  traceback: Annotation<{
    hierarchy: HierarchyNode[];
    regimes: RegimeInfo[];
    articles: ArticleInfo[];
  } | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  verdict: Annotation<Verdict | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
});

export type GraphStateType = typeof GraphState.State;
