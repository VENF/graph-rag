import { StateGraph, START, END } from '@langchain/langgraph';
import { GraphState } from './state.js';
import { distil } from '../nodes/technical-sheet/node.js';
import { chapterClasification } from '../nodes/chapter-clasification/node.js';
import { legalAudit } from '../nodes/legal-audit/node.js';

const workflow = new StateGraph(GraphState)
  .addNode('distil_input', distil)
  .addNode('chapter_sa', chapterClasification)
  .addNode('legal_audit', legalAudit)
  .addEdge(START, 'distil_input')
  .addEdge('distil_input', 'chapter_sa')
  .addEdge('chapter_sa', 'legal_audit')
  .addConditionalEdges('legal_audit', (state) => {
    if (state.auditStatus === 'redirected') return 'legal_audit';
    return END;
  });

export const app = workflow.compile();
