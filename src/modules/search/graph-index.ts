import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import type { NodeType } from '../types.js'
import type { NodeIndexEntry, Wikilink, SearchResult, GraphIndexData } from './types.js'

const YAML_FRONTMATTER = /^---\n([\s\S]*?)\n---\n/
const WIKILINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

function scanGraphDir(graphDir: string): string[] {
  const results: string[] = []
  const entries = fs.readdirSync(graphDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const dirPath = path.join(graphDir, entry.name)
    const files = fs.readdirSync(dirPath)
    for (const file of files) {
      if (!file.endsWith('.md') || file.startsWith('_')) continue
      results.push(path.join(dirPath, file))
    }
  }
  return results.sort()
}

function parseFrontmatter(raw: string): Record<string, unknown> | null {
  const match = raw.match(YAML_FRONTMATTER)
  if (!match) return null
  try {
    return yaml.load(match[1]) as Record<string, unknown>
  } catch {
    return null
  }
}

function parseWikilinks(content: string): Wikilink[] {
  const links: Wikilink[] = []
  let match: RegExpExecArray | null
  WIKILINK.lastIndex = 0
  while ((match = WIKILINK.exec(content)) !== null) {
    links.push({ target: match[1].trim(), text: (match[2] || match[1]).trim() })
  }
  return links
}

function extractDescripcion(frontmatter: Record<string, unknown>): string {
  return (frontmatter.description as string)
    || (frontmatter.title as string)
    || (frontmatter.code as string)
    || ''
}

function readNodeFile(filePath: string): Omit<NodeIndexEntry, 'id'> {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const frontmatter = parseFrontmatter(raw) || {}
  const content = raw.replace(YAML_FRONTMATTER, '')
  const wikilinks = parseWikilinks(content)
  const tags = (frontmatter.tags as string[]) || []
  return {
    type: (frontmatter.type as NodeType) || 'documento',
    path: filePath,
    frontmatter,
    tags: typeof tags === 'string' ? [tags] : tags,
    wikilinks: wikilinks.filter((w) => !w.target.startsWith('_')),
    description: extractDescripcion(frontmatter),
  }
}

export function buildGraphIndex(graphDir: string): GraphIndexData {
  const files = scanGraphDir(graphDir)
  const nodes: Record<string, NodeIndexEntry> = {}
  const byType: Record<string, string[]> = {}

  for (const filePath of files) {
    const info = readNodeFile(filePath)
    const id = info.frontmatter.id as string
    if (!id) continue
    nodes[id] = { id, ...info }
    const type = info.type
    if (!byType[type]) byType[type] = []
    byType[type].push(id)
  }

  const counts: Record<string, number> = {}
  for (const [type, ids] of Object.entries(byType)) {
    counts[type] = ids.length
  }

  return {
    nodes,
    byType,
    metadata: {
      totalNodes: Object.keys(nodes).length,
      counts,
      indexedAt: new Date().toISOString(),
    },
  }
}

export function saveIndex(index: GraphIndexData, cachePath: string): void {
  const dir = path.dirname(cachePath)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(cachePath, JSON.stringify(index, null, 2), 'utf-8')
}

export function loadIndex(cachePath: string): GraphIndexData | null {
  if (!fs.existsSync(cachePath)) return null
  try {
    const raw = fs.readFileSync(cachePath, 'utf-8')
    return JSON.parse(raw) as GraphIndexData
  } catch {
    return null
  }
}

export function getNode(index: GraphIndexData, id: string): NodeIndexEntry | null {
  return index.nodes[id] || null
}

export function getNodesByType(index: GraphIndexData, type: string): NodeIndexEntry[] {
  const ids = index.byType[type] || []
  return ids.map((id) => index.nodes[id]).filter(Boolean)
}

export function searchByText(index: GraphIndexData, query: string): SearchResult[] {
  const q = query.toLowerCase()
  const results: SearchResult[] = []
  for (const node of Object.values(index.nodes)) {
    const code = (node.frontmatter.code as string) || ''
    const searchable = [
      node.id,
      node.description,
      ...node.tags,
      code,
    ].join(' ').toLowerCase()
    if (searchable.includes(q)) {
      let score = 1
      if (node.description.toLowerCase() === q) score = 3
      else if (node.id.toLowerCase() === q) score = 3
      else if (node.description.toLowerCase().startsWith(q)) score = 2
      else if (node.id.toLowerCase().startsWith(q)) score = 2
      else if (code.toLowerCase() === q) score = 3
      results.push({
        id: node.id,
        type: node.type,
        snippet: node.description || node.id,
        path: node.path,
        score,
      })
    }
  }
  results.sort((a, b) => b.score - a.score)
  return results
}

export function getStats(index: GraphIndexData): string {
  const m = index.metadata
  let out = `Total nodos: ${m.totalNodes}\n`
  for (const [type, count] of Object.entries(m.counts)) {
    out += `  ${type}: ${count}\n`
  }
  out += `Indexado: ${m.indexedAt}`
  return out
}
