import type { NodeType } from '../types.js'

export interface Wikilink {
  target: string
  text: string
}

export interface NodeIndexEntry {
  id: string
  type: NodeType
  path: string
  frontmatter: Record<string, unknown>
  tags: string[]
  wikilinks: Wikilink[]
  description: string
}

export interface SearchResult {
  id: string
  type: NodeType
  snippet: string
  path: string
  score: number
}

export interface GraphIndexData {
  nodes: Record<string, NodeIndexEntry>
  byType: Record<string, string[]>
  metadata: {
    totalNodes: number
    counts: Record<string, number>
    indexedAt: string
  }
}

export interface AgentConfig {
  graphDir: string
  modelName?: string
  maxSteps?: number
}
