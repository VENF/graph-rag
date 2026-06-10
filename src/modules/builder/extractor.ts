import type {
  Nodo,
  RawArticulo,
  RawCodigo,
  RawSubpartida,
  RawRegimen,
  RawDocumento,
  RawCapituloSA,
  RawSubcapitulo,
  RawNota,
  ParsedFile,
} from './types.js'
import { slugify } from './utils.js'
import { documentId, articleId, codeId, chapterId, regimenId, subpartidaId, notaId, subcapituloId } from './ids.js'

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
      source_document: doc.id,
      history: [{ document: doc.id, date: doc.date, type: 'creación' }],
    },
    `# ${doc.title}\n\n**Nº:** ${doc.number} ${doc.gazette_type}\n**Fecha:** ${doc.date}\n**Decreto Nº:** ${doc.decree}\n**Emisor:** ${doc.issuer}`,
    ['venezuela', 'arancel-aduanas', 'gaceta-oficial', slugify(doc.gazette_type)],
  )
}

export function extractArticuloNodes(
  articulos: RawArticulo[],
  docId: string | null,
  docDate: string | null = null,
): Nodo[] {
  return articulos.map((art) => {
    const id = articleId(art.number)
    const tags = ['articulo']
    if (art.legal_chapter) {
      tags.push(`capitulo-${slugify(art.legal_chapter)}`)
    }
    const historyEntry = docId ? [{ document: docId, date: docDate || '', type: 'creación' as const }] : []
    return buildNodo(
      id,
      'articulo',
      { number: art.number, title: art.title, legal_chapter: art.legal_chapter, references: art.references, source_document: docId, history: historyEntry },
      art.content,
      tags,
    )
  })
}

export function extractCapituloNodes(
  capitulos: RawCapituloSA[],
  docId: string | null,
  docDate: string | null = null,
): Nodo[] {
  return capitulos.map((cap) => {
    const id = chapterId(cap.number, cap.title)
    const seccionTag = cap.section ? `seccion-${slugify(cap.section)}` : null
    const historyEntry = docId ? [{ document: docId, date: docDate || '', type: 'creación' as const }] : []
    let content = `## CAPÍTULO ${cap.number}\n\n${cap.title}`
    if (cap.section_title) {
      content += `\n\n*Sección ${cap.section}: ${cap.section_title}*`
    }
    if (cap.notes.length > 0) {
      content += `\n\n### Notas\n\n${cap.notes.map((n) => n.text).join('\n\n')}`
    }
    return buildNodo(
      id,
      'capitulo',
      { number: cap.number, title: cap.title, section: cap.section, section_title: cap.section_title, notes: cap.notes.length > 0 ? cap.notes : undefined, source_document: docId, history: historyEntry },
      content,
      ['capitulo-sa', ...(seccionTag ? [seccionTag] : [])],
    )
  })
}

export function extractCodigoNodes(
  codigos: RawCodigo[],
  docId: string | null,
  docDate: string | null = null,
): Nodo[] {
  const total = codigos.length
  return codigos.map((cod, idx) => {
    if ((idx + 1) % 1000 === 0 || idx + 1 === total) {
      console.log(`  Códigos procesados: ${idx + 1}/${total}`)
    }
    const id = codeId(cod.code)
    const capNum = cod.code.slice(0, 2)
    const tags = ['codigo-arancelario', `capitulo-${capNum}`]
    if (cod.aec?.rate === 0) tags.push('tasa-cero')
    if (cod.aec?.qualifier) tags.push(cod.aec.qualifier.toLowerCase())
    if (cod.ex_aec) tags.push('excepcion')
    const historyEntry = docId ? [{ document: docId, date: docDate || '', type: 'creación' as const }] : []

    return buildNodo(
      id,
      'codigo-arancelario',
      {
        code: cod.code,
        description: cod.description,
        sa_chapter: capNum,
        aec: cod.aec,
        ex_aec: cod.ex_aec,
        ex_aec_legal_refs: cod.ex_aec_legal_refs.length > 0 ? cod.ex_aec_legal_refs : undefined,
        physical_unit: cod.physical_unit,
        import_regime: cod.import_regime,
        export_regime: cod.export_regime,
        source_document: docId,
        history: historyEntry,
      },
      `### ${cod.code}\n\n**Descripción:** ${cod.description}\n\n` +
        `**AEC:** ${cod.aec?.rate != null ? cod.aec.rate + '%' : '—'}${cod.aec?.qualifier ? ` (${cod.aec.qualifier})` : ''}\n` +
        `**Ex.AEC:** ${cod.ex_aec || '—'}\n` +
        `**Unidad Física:** ${cod.physical_unit || '—'}\n` +
        `**Régimen Importación:** ${cod.import_regime.join(', ') || 'Ninguno'}\n` +
        `**Régimen Exportación:** ${cod.export_regime.join(', ') || 'Ninguno'}`,
      tags,
    )
  })
}

export function extractSubpartidaNodes(
  subpartidas: RawSubpartida[],
  docId: string | null,
  docDate: string | null = null,
): Nodo[] {
  const seen = new Set<string>()
  const nodos: Nodo[] = []
  for (const sub of subpartidas) {
    if (seen.has(sub.id)) continue
    seen.add(sub.id)
    const historyEntry = docId ? [{ document: docId, date: docDate || '', type: 'creación' as const }] : []
    const tags = ['subpartida', `nivel-${sub.level}`]
    if (sub.level === 4) tags.push('partida-sa')

    const content = `### ${sub.display}\n\n**Nivel:** ${sub.level} dígitos` +
      (sub.description ? `\n\n${sub.description}` : '')

    nodos.push(buildNodo(
      sub.id,
      'subpartida',
      {
        code: sub.code,
        display: sub.display,
        level: sub.level,
        parent: sub.parent,
        source_document: docId,
        history: historyEntry,
      },
      content,
      tags,
    ))
  }
  return nodos
}

export function extractRegimenNodes(
  regimenes: RawRegimen[],
  docId: string | null,
  docDate: string | null = null,
): Nodo[] {
  return regimenes.map((reg) => {
    const id = regimenId(reg.code)
    const tags = ['regimen-legal']
    if (reg.entity) tags.push(slugify(reg.entity))
    const historyEntry = docId ? [{ document: docId, date: docDate || '', type: 'creación' as const }] : []

    return buildNodo(
      id,
      'regimen-legal',
      {
        code: reg.code,
        description: reg.description,
        entity: reg.entity,
        source_document: docId,
        history: historyEntry,
        is_comex_permit: reg.code === '9' ? true : undefined,
      },
      `## Régimen Legal ${reg.code}\n\n${reg.description}` +
        (reg.entity ? `\n\n**Entidad:** ${reg.entity}` : ''),
      tags,
    )
  })
}

export function extractSubcapituloNodes(
  subcapitulos: RawSubcapitulo[],
): Nodo[] {
  return subcapitulos.map((subcap) => {
    const id = subcapituloId(subcap.chapter, subcap.roman)
    const tags = ['subcapitulo', `capitulo-${subcap.chapter}`]
    let content = `## ${subcap.title}`
    if (subcap.notes.length > 0) {
      content += `\n\n### Notas\n\n${subcap.notes.map((n) => n.text).join('\n\n')}`
    }
    return buildNodo(
      id,
      'subcapitulo',
      {
        chapter: subcap.chapter,
        roman: subcap.roman,
        title: subcap.title,
        notes: subcap.notes.length > 0 ? subcap.notes : undefined,
      },
      content,
      tags,
    )
  })
}

export function extractNotaLegalNodes(
  capitulos: RawCapituloSA[],
  sectionNotas: RawNota[],
): Nodo[] {
  const nodos: Nodo[] = []
  let idx = 0

  for (const cap of capitulos) {
    for (const note of cap.notes) {
      const id = notaId(cap.number, note.type, idx)
      const tags = ['nota-legal', `tipo-${note.type}`, `capitulo-${cap.number}`]
      nodos.push(buildNodo(
        id,
        'nota-legal',
        {
          nota_type: note.type,
          section: note.section,
          chapter: cap.number,
          scope: note.scope,
        },
        `### Nota ${note.type} (Capítulo ${cap.number})\n\n${note.text}`,
        tags,
      ))
      idx++
    }
  }

  for (const note of sectionNotas) {
    const id = notaId(null, note.type, idx)
    const tags = ['nota-legal', `tipo-${note.type}`, ...(note.section ? [`seccion-${note.section}`] : [])]
    nodos.push(buildNodo(
      id,
      'nota-legal',
      {
        nota_type: note.type,
        section: note.section,
        chapter: null,
        scope: null,
      },
      `### Nota ${note.type}\n\n${note.text}`,
      tags,
    ))
    idx++
  }

  return nodos
}

function extractFromFile(file: ParsedFile): Nodo[] {
  const docId = file.document?.id || null
  const docDate = file.document?.date || null
  return [
    ...(file.document ? [extractDocumentoNode(file.document)] : []),
    ...extractArticuloNodes(file.articles, docId, docDate),
    ...extractCapituloNodes(file.sa_chapters, docId, docDate),
    ...extractSubpartidaNodes(file.subpartidas, docId, docDate),
    ...extractCodigoNodes(file.codes, docId, docDate),
    ...extractRegimenNodes(file.regimes, docId, docDate),
    ...extractNotaLegalNodes(file.sa_chapters, file.notas),
    ...extractSubcapituloNodes(file.subcapitulos),
  ]
}

export function extractAllNodes(files: ParsedFile[]): Map<string, Nodo> {
  const nodos = new Map<string, Nodo>()
  for (const n of files.filter(Boolean).flatMap(extractFromFile)) {
    nodos.set(n.id, n)
  }
  return nodos
}
