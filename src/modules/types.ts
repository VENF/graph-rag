export type NodeType =
  | 'documento'
  | 'capitulo'
  | 'articulo'
  | 'codigo-arancelario'
  | 'regimen-legal'
  | 'subpartida'

export type RelacionType =
  | 'es_parte_de'
  | 'pertenece_a'
  | 'regula'
  | 'requiere'
  | 'refiere_a'
  | 'contiene'

export interface Frontmatter {
  id: string
  type: NodeType
  [key: string]: unknown
}

export interface Nodo {
  id: string
  type: NodeType
  metadata: Record<string, unknown>
  content: string
  tags: string[]
}

export interface Relacion {
  type: RelacionType
  origin: string
  target: string
}

export interface Grafo {
  nodos: Map<string, Nodo>
  relaciones: Relacion[]
}
