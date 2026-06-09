import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { buildGraphIndex, loadIndex, saveIndex } from '../../modules/search/graph-index.js'
import { createAgent, type AgentRunOptions } from '../../modules/search/agent.js'
import type { GraphIndexData } from '../../modules/search/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_GRAPH_DIR = path.resolve(__dirname, '../../../knowledge-graph')
const CACHE_PATH = path.join(DEFAULT_GRAPH_DIR, '.graph-index.json')

let cachedIndex: GraphIndexData | null = null
let graphDir: string = DEFAULT_GRAPH_DIR

function loadOrBuildIndex(forceRebuild: boolean): GraphIndexData {
  if (!forceRebuild) {
    const cached = loadIndex(CACHE_PATH)
    if (cached) return cached
  }

  if (!fs.existsSync(graphDir)) {
    throw new Error(`Grafo no encontrado en: ${graphDir}. Ejecuta pnpm build-graph primero.`)
  }

  const index = buildGraphIndex(graphDir)
  saveIndex(index, CACHE_PATH)
  return index
}

export function getGraphDir(): string {
  return graphDir
}

export function initSearchService(): void {
  cachedIndex = loadOrBuildIndex(false)
}

export function reindex(): GraphIndexData {
  cachedIndex = loadOrBuildIndex(true)
  return cachedIndex
}

export function clearIndexCache(): void {
  cachedIndex = null
}

export function getIndexSafe(): GraphIndexData {
  if (!cachedIndex) {
    cachedIndex = loadOrBuildIndex(false)
  }
  return cachedIndex
}

export interface SearchResult {
  text: string
  toolCalls: Array<{ name: string; args: unknown; result: unknown }>
}

export async function search(query: string, signal?: AbortSignal): Promise<SearchResult> {
  const index = getIndexSafe()
  const agent = createAgent({ graphDir, index })
  const toolCalls: SearchResult['toolCalls'] = []

  const result = await agent.run(query, {
    signal,
    onToolCall: (name, args) => {
      toolCalls.push({ name, args, result: null })
    },
    onToolResult: (name, result) => {
      const last = toolCalls[toolCalls.length - 1]
      if (last && last.name === name && last.result === null) {
        last.result = result
      }
    },
  })

  return { text: result, toolCalls }
}

export function searchStream(
  query: string,
  callbacks: AgentRunOptions,
  signal?: AbortSignal,
): Promise<string> {
  const index = getIndexSafe()
  const agent = createAgent({ graphDir, index })
  return agent.run(query, { ...callbacks, signal })
}

export function getStatsData() {
  const index = getIndexSafe()
  return index.metadata
}
