import type { Nodo, Relacion, ParsedFile } from './types.js'
import { articleId, codeId, chapterId, regimenId } from './ids.js'
import { slugify } from './utils.js'

const ARTICLES_WITH_PROHIBITION = [25, 27, 28, 29, 30, 31, 32, 33] as const
// Artículo 26 está excluido porque solo trata sobre definiciones generales del régimen de importación

function art25to33HasProhibition(num: number): boolean {
  return (ARTICLES_WITH_PROHIBITION as readonly number[]).includes(num)
}

function buildDocumentRelations(file: ParsedFile, nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = []
  const docId = file.document?.id
  if (!docId) return relaciones

  for (const art of file.articles) {
    const artId = articleId(art.number)
    if (nodos.has(artId)) {
      relaciones.push({ type: 'contiene', origin: docId, target: artId })
      relaciones.push({ type: 'es_parte_de', origin: artId, target: docId })
    }
  }

  for (const cap of file.sa_chapters) {
    const capId = chapterId(cap.number, cap.title)
    if (nodos.has(capId)) {
      relaciones.push({ type: 'contiene', origin: docId, target: capId })
      relaciones.push({ type: 'es_parte_de', origin: capId, target: docId })
    }
  }

  for (const cod of file.codes) {
    const codId = codeId(cod.code)
    if (nodos.has(codId)) {
      relaciones.push({ type: 'contiene', origin: docId, target: codId })
      relaciones.push({ type: 'es_parte_de', origin: codId, target: docId })
    }
  }

  return relaciones
}

function buildCodeChapterRelations(file: ParsedFile, nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = []
  const capMap = buildCapituloMap(nodos)

  for (const cod of file.codes) {
    const codId = codeId(cod.code)
    if (!nodos.has(codId)) continue
    const capNum = cod.code.slice(0, 2)
    const capNodo = capMap.get(capNum)
    if (capNodo) {
      relaciones.push({ type: 'pertenece_a', origin: codId, target: capNodo.id })
    }
  }

  return relaciones
}

function buildCodeRegimeRelations(file: ParsedFile, nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = []

  for (const cod of file.codes) {
    const codId = codeId(cod.code)
    if (!nodos.has(codId)) continue

    const allRegimes = [...cod.import_regime, ...cod.export_regime]
    for (const regCode of [...new Set(allRegimes)]) {
      const regId = regimenId(regCode)
      if (nodos.has(regId)) {
        relaciones.push({ type: 'requiere', origin: codId, target: regId })
      }
    }
  }

  return relaciones
}

function buildArticleCrossReferences(file: ParsedFile, nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = []

  for (const art of file.articles) {
    const artId = articleId(art.number)
    if (!nodos.has(artId)) continue

    for (const refNum of art.references) {
      const refId = articleId(refNum)
      if (nodos.has(refId)) {
        relaciones.push({ type: 'refiere_a', origin: artId, target: refId })
      }
    }
  }

  return relaciones
}

function buildArticle21Relations(file: ParsedFile, nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = []
  const art21 = file.articles.find((a) => a.number === 21)
  if (!art21) return relaciones

  const art21Id = articleId(21)
  if (!nodos.has(art21Id)) return relaciones

  for (let i = 1; i <= 21; i++) {
    const regId = regimenId(String(i))
    if (nodos.has(regId)) {
      relaciones.push({ type: 'regula', origin: art21Id, target: regId })
    }
  }

  for (const cod of file.codes) {
    const allRegimes = [...cod.import_regime, ...cod.export_regime]
    const codId = codeId(cod.code)
    if (nodos.has(codId) && allRegimes.length > 0) {
      relaciones.push({ type: 'regula', origin: art21Id, target: codId })
    }
  }

  return relaciones
}

function buildArticles22to36Relations(file: ParsedFile, nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = []

  for (const art of file.articles) {
    if (art.number < 22 || art.number > 36) continue
    const artId = articleId(art.number)
    if (!nodos.has(artId)) continue

    const mentionedRegimes = [...art.content.matchAll(/\b(?:Régimen\s+Legal\s+)?codificado[s]?\s+(\d+)/gi)]
      .map((m) => m[1])
    const mentionedNumbers = [...art.content.matchAll(/\b(\d+)\s*[.)]/g)]
      .map((m) => m[1])
      .filter((n) => parseInt(n) >= 1 && parseInt(n) <= 21)

    const allMentioned = [...new Set([...mentionedRegimes, ...mentionedNumbers])]
    for (const regCode of allMentioned) {
      const regId = regimenId(regCode)
      if (nodos.has(regId)) {
        relaciones.push({ type: 'regula', origin: artId, target: regId })
      }
    }

    if (art25to33HasProhibition(art.number)) {
      const reg1Id = regimenId('1')
      if (nodos.has(reg1Id)) {
        relaciones.push({ type: 'regula', origin: artId, target: reg1Id })
      }
    }
  }

  return relaciones
}

function buildArticle37Relations(nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = []
  const art37Id = articleId(37)
  if (!nodos.has(art37Id)) return relaciones

  relaciones.push({ type: 'refiere_a', origin: art37Id, target: articleId(3) })
  relaciones.push({ type: 'refiere_a', origin: art37Id, target: articleId(8) })
  relaciones.push({ type: 'refiere_a', origin: art37Id, target: articleId(11) })
  relaciones.push({ type: 'refiere_a', origin: art37Id, target: articleId(21) })

  return relaciones
}

function buildCapituloMap(nodos: Map<string, Nodo>): Map<string, Nodo> {
  const map = new Map<string, Nodo>()
  for (const nodo of nodos.values()) {
    if (nodo.type === 'capitulo' && typeof nodo.metadata.number === 'string') {
      map.set(nodo.metadata.number, nodo)
    }
  }
  return map
}

export function buildRelations(
  nodos: Map<string, Nodo>,
  files: ParsedFile[]
): Relacion[] {
  const relaciones: Relacion[] = []

  for (const file of files) {
    relaciones.push(
      ...buildDocumentRelations(file, nodos),
      ...buildCodeChapterRelations(file, nodos),
      ...buildCodeRegimeRelations(file, nodos),
      ...buildArticleCrossReferences(file, nodos),
      ...buildArticle21Relations(file, nodos),
      ...buildArticles22to36Relations(file, nodos),
    )
    relaciones.push(...buildArticle37Relations(nodos))
  }

  return relaciones
}
