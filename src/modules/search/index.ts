import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { buildGraphIndex, saveIndex, loadIndex } from './graph-index.js'
import { createAgent } from './agent.js'
import { startRepl } from './repl.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_GRAPH_DIR = path.resolve(__dirname, '../../../knowledge-graph')
const CACHE_PATH = path.join(DEFAULT_GRAPH_DIR, '.graph-index.json')

function loadOrBuildIndex(graphDir: string, forceRebuild: boolean) {
  if (!forceRebuild) {
    const cached = loadIndex(CACHE_PATH)
    if (cached) {
      console.error(`Índice cargado desde caché (${cached.metadata.totalNodes} nodos)`)
      return cached
    }
  }

  console.error(`Escaneando grafo en: ${graphDir}`)
  const index = buildGraphIndex(graphDir)
  console.error(`Índice construido: ${index.metadata.totalNodes} nodos`)
  saveIndex(index, CACHE_PATH)
  return index
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const isRepl = args.includes('--repl')
  const forceReindex = args.includes('--reindex')

  const graphDir = DEFAULT_GRAPH_DIR

  if (!fs.existsSync(graphDir)) {
    console.error(`Error: No se encuentra el directorio del grafo: ${graphDir}`)
    console.error('Ejecuta primero: pnpm build-graph')
    process.exit(1)
  }

  const index = loadOrBuildIndex(graphDir, forceReindex)

  if (isRepl) {
    const agent = createAgent({ graphDir, index })
    startRepl({
      processQuery: async (query, { onText, onToolCall, onToolResult }) => {
        return agent.run(query, { onText, onToolCall, onToolResult })
      },
    })
    return
  }

  if (args.length === 0 && !process.stdin.isTTY) {
    const buffer = fs.readFileSync('/dev/stdin', 'utf-8')
    const query = buffer.trim()
    if (query) {
      const agent = createAgent({ graphDir, index })
      const result = await agent.run(query)
      console.log(result)
    }
    return
  }

  const query = args.filter((a) => !a.startsWith('--')).join(' ')
  if (!query) {
    const agent = createAgent({ graphDir, index })
    startRepl({
      processQuery: async (q, { onText, onToolCall, onToolResult }) => {
        return agent.run(q, { onText, onToolCall, onToolResult })
      },
    })
    return
  }

  const agent = createAgent({ graphDir, index })
  const result = await agent.run(query)
  console.log(result)
}

main().catch((err) => {
  console.error('Error:', (err as Error).message)
  process.exit(1)
})
