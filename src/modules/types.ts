export type NodeType =
  | 'documento'
  | 'capitulo'
  | 'articulo'
  | 'codigo-arancelario'
  | 'regimen-legal'
  | 'subpartida'
  | 'nota-legal'
  | 'subcapitulo';

export type RelacionType =
  | 'es_parte_de'
  | 'pertenece_a'
  | 'regula'
  | 'requiere'
  | 'refiere_a'
  | 'contiene'
  | 'aclara'
  | 'modifica_criterio'
  | 'sujeto_a'
  | 'subdivide'
  | 'modifica'
  | 'suspende_aplicacion_de'
  | 'sustituye_a'
  | 'exonerado_por'
  | 'actualiza_tarifa'
  | 'suspende_regimen';

export interface Frontmatter {
  id: string;
  type: NodeType;
  [key: string]: unknown;
}

export interface Nodo {
  id: string;
  type: NodeType;
  metadata: Record<string, unknown>;
  content: string;
  tags: string[];
}

export interface Relacion {
  type: RelacionType;
  origin: string;
  target: string;
  props?: Record<string, unknown>;
}

export interface Grafo {
  nodos: Map<string, Nodo>;
  relaciones: Relacion[];
}
