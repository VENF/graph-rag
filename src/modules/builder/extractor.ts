import type {
  Nodo,
  RawArticulo,
  RawCodigo,
  RawRegimen,
  RawDocumento,
  RawCapituloSA,
  ParsedFile,
} from './types.js'
import { slugify } from './utils.js'
import { documentId, articleId, codeId, chapterId, regimenId } from './ids.js'

function buildNodo<T extends Record<string, unknown>>(
  id: string,
  type: Nodo['type'],
  extraMeta: T,
  content: string,
  tags: string[],
): Nodo {
  return {
    id,
    type,
    metadata: { id, type, ...extraMeta },
    content,
    tags,
  }
}

export function extractDocumentoNode(doc: RawDocumento): Nodo {
  return buildNodo(
    doc.id,
    'documento',
    {
      title: doc.title,
      number: doc.number,
      gazette_type: doc.gazette_type,
      date: doc.date,
      decree: doc.decree,
      decree_date: doc.decree_date,
      issuer: doc.issuer,
    },
    `# ${doc.title}\n\n**Nº:** ${doc.number} ${doc.gazette_type}\n**Fecha:** ${doc.date}\n**Decreto Nº:** ${doc.decree}\n**Emisor:** ${doc.issuer}`,
    ['venezuela', 'arancel-aduanas', 'gaceta-oficial', slugify(doc.gazette_type)],
  )
}

export function extractArticuloNodes(
  articulos: RawArticulo[],
  docId: string | null
): Nodo[] {
  return articulos.map((art) => {
    const id = articleId(art.number)
    const tags = ['articulo']
    if (art.legal_chapter) {
      tags.push(`capitulo-${slugify(art.legal_chapter)}`)
    }
    return buildNodo(
      id,
      'articulo',
      { number: art.number, title: art.title, legal_chapter: art.legal_chapter, references: art.references, source: docId },
      art.content,
      tags,
    )
  })
}

export function extractCapituloNodes(
  capitulos: RawCapituloSA[],
  docId: string | null
): Nodo[] {
  return capitulos.map((cap) => {
    const id = chapterId(cap.number, cap.title)
    const seccionTag = cap.section ? `seccion-${slugify(cap.section)}` : null
    return buildNodo(
      id,
      'capitulo',
      { number: cap.number, title: cap.title, section: cap.section, section_title: cap.section_title, source: docId },
      `## CAPÍTULO ${cap.number}\n\n${cap.title}` +
        (cap.section_title ? `\n\n*Sección ${cap.section}: ${cap.section_title}*` : ''),
      ['capitulo-sa', ...(seccionTag ? [seccionTag] : [])],
    )
  })
}

export function extractCodigoNodes(
  codigos: RawCodigo[],
  docId: string | null
): Nodo[] {
  return codigos.map((cod) => {
    const id = codeId(cod.code)
    const capNum = cod.code.slice(0, 2)
    const tags = ['codigo-arancelario', `capitulo-${capNum}`]
    if (cod.aec === 0) tags.push('tasa-cero')
    if (cod.ex_aec) tags.push('excepcion')

    return buildNodo(
      id,
      'codigo-arancelario',
      {
        code: cod.code,
        description: cod.description,
        sa_chapter: capNum,
        aec: cod.aec,
        ex_aec: cod.ex_aec,
        physical_unit: cod.physical_unit,
        import_regime: cod.import_regime,
        export_regime: cod.export_regime,
        source: docId,
      },
      `### ${cod.code}\n\n**Descripción:** ${cod.description}\n\n` +
        `**AEC:** ${cod.aec !== null ? cod.aec + '%' : '—'}\n` +
        `**Ex.AEC:** ${cod.ex_aec || '—'}\n` +
        `**Unidad Física:** ${cod.physical_unit || '—'}\n` +
        `**Régimen Importación:** ${cod.import_regime.join(', ') || 'Ninguno'}\n` +
        `**Régimen Exportación:** ${cod.export_regime.join(', ') || 'Ninguno'}`,
      tags,
    )
  })
}

export function extractRegimenNodes(
  regimenes: RawRegimen[],
  docId: string | null
): Nodo[] {
  return regimenes.map((reg) => {
    const id = regimenId(reg.code)
    const tags = ['regimen-legal']
    if (reg.entity) tags.push(slugify(reg.entity))

    return buildNodo(
      id,
      'regimen-legal',
      { code: reg.code, description: reg.description, entity: reg.entity, source: docId },
      `## Régimen Legal ${reg.code}\n\n${reg.description}` +
        (reg.entity ? `\n\n**Entidad:** ${reg.entity}` : ''),
      tags,
    )
  })
}

function extractFromFile(file: ParsedFile): Nodo[] {
  const docId = file.document?.id || null
  return [
    ...(file.document ? [extractDocumentoNode(file.document)] : []),
    ...extractArticuloNodes(file.articles, docId),
    ...extractCapituloNodes(file.sa_chapters, docId),
    ...extractCodigoNodes(file.codes, docId),
    ...extractRegimenNodes(file.regimes, docId),
  ]
}

export function extractAllNodes(files: ParsedFile[]): Map<string, Nodo> {
  const nodos = new Map<string, Nodo>()
  for (const n of files.filter(Boolean).flatMap(extractFromFile)) {
    nodos.set(n.id, n)
  }
  return nodos
}
