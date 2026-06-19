import { StateGraph, START, END } from '@langchain/langgraph';
import { GraphState } from './state.js';
import { distil } from '../nodes/technical-sheet/node.js';
import { chapterClasification } from '../nodes/chapter-clasification/node.js';

const workflow = new StateGraph(GraphState)
  .addNode('distil_input', distil)
  .addNode('chapter_sa', chapterClasification)
  .addEdge(START, 'distil_input')
  .addEdge('distil_input', 'chapter_sa')
  .addEdge('chapter_sa', END);

export const app = workflow.compile();
