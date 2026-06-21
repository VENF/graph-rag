import { StateGraph, START, END } from '@langchain/langgraph';
import { GraphState } from './state.js';
import { distil } from '../nodes/technical-sheet/node.js';
import { chapterClasification } from '../nodes/chapter-clasification/node.js';
import { legalAudit } from '../nodes/legal-audit/node.js';
import { headingSelection } from '../nodes/heading-selection/node.js';
import { subheadingSelection } from '../nodes/subheading-selection/node.js';
import { codeSelection } from '../nodes/code-selection/node.js';
import { traceback } from '../nodes/traceback/node.js';
import { verdict } from '../nodes/verdict/node.js';

const workflow = new StateGraph(GraphState)
  .addNode('distil_input', distil)
  .addNode('chapter_sa', chapterClasification)
  .addNode('legal_audit', legalAudit)
  .addNode('heading_selection', headingSelection)
  .addNode('subheading_selection', subheadingSelection)
  .addNode('code_selection', codeSelection)
  .addNode('traceback_node', traceback)
  .addNode('verdict_node', verdict)
  .addEdge(START, 'distil_input')
  .addEdge('distil_input', 'chapter_sa')
  .addEdge('chapter_sa', 'legal_audit')
  .addConditionalEdges('legal_audit', (state) => {
    if (state.auditStatus === 'redirected') return 'legal_audit';
    return 'heading_selection';
  })
  .addEdge('heading_selection', 'subheading_selection')
  .addEdge('subheading_selection', 'code_selection')
  .addEdge('code_selection', 'traceback_node')
  .addEdge('traceback_node', 'verdict_node')
  .addEdge('verdict_node', END);

export const app = workflow.compile();
