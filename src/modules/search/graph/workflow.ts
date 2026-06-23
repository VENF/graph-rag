import { StateGraph, START, END } from '@langchain/langgraph';
import { GraphState } from './state.js';
import { distil } from '../nodes/technical-sheet/node.js';
import { candidateSearch } from '../nodes/candidate-search/node.js';
import { verdict } from '../nodes/verdict/node.js';

const workflow = new StateGraph(GraphState)
  .addNode('distil_input', distil)
  .addNode('candidate_search', candidateSearch)
  .addNode('verdict_node', verdict)
  .addEdge(START, 'distil_input')
  .addEdge('distil_input', 'candidate_search')
  .addEdge('candidate_search', 'verdict_node')
  .addConditionalEdges('verdict_node', (state) => {
    if (state.verdict) return END;
    return 'candidate_search';
  });

export const app = workflow.compile();
