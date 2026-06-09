import type { Nodo, Relacion } from '../types.js'

export type { Nodo, Relacion }

export interface RawArticulo {
  number: number
  title: string
  content: string
  references: number[]
  legal_chapter: string | null
}

export interface RawCodigo {
  code: string
  description: string
  aec: number | null
  ex_aec: string | null
  import_regime: string[]
  export_regime: string[]
  physical_unit: string | null
}

export interface RawRegimen {
  code: string
  description: string
  entity: string | null
}

export interface RawDocumento {
  id: string
  title: string
  number: string
  gazette_type: string
  date: string
  decree: string
  decree_date: string
  issuer: string
}

export interface RawCapituloSA {
  number: string
  title: string
  section: string | null
  section_title: string | null
}

export interface ParsedFile {
  path: string
  filename: string
  document: RawDocumento | null
  articles: RawArticulo[]
  sa_chapters: RawCapituloSA[]
  codes: RawCodigo[]
  regimes: RawRegimen[]
}
