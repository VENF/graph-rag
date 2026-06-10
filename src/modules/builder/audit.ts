import fs from 'fs'
import type { Nodo, ParsedFile } from './types.js'

const CODE_RE = /\b\d{4}\.\d{2}\.\d{2}\.\d{2}\b/g

const c = {
  title: (s: string) => `\x1b[36;1m${s}\x1b[0m`,
  label: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  greenBold: (s: string) => `\x1b[32;1m${s}\x1b[0m`,
  pct: (n: number): string => {
    if (n >= 100) return `\x1b[32;1m${n.toFixed(1)}%\x1b[0m`
    if (n >= 50) return `\x1b[32m${n.toFixed(1)}%\x1b[0m`
    return `\x1b[31m${n.toFixed(1)}%\x1b[0m`
  },
}

function countCodesInSource(sourcePaths: string[]): Set<string> {
  const codes = new Set<string>()
  for (const filePath of sourcePaths) {
    const raw = fs.readFileSync(filePath, 'utf-8')
    let m: RegExpExecArray | null
    while ((m = CODE_RE.exec(raw)) !== null) {
      codes.add(m[0])
    }
  }
  return codes
}

function countExtractedByType(nodos: Map<string, Nodo>): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const nodo of nodos.values()) {
    counts[nodo.type] = (counts[nodo.type] || 0) + 1
  }
  return counts
}

function extractCodeIdFromNodo(nodo: Nodo): string | null {
  const meta = nodo.metadata
  if (nodo.type === 'codigo-arancelario' && typeof meta.code === 'string') {
    const m = meta.code.match(/^(\d{4}\.\d{2}\.\d{2}\.\d{2})$/)
    if (m) return m[1]
  }
  return null
}

function coverageByChapter(
  nodos: Map<string, Nodo>,
  sourcePaths: string[],
): Map<string, { extracted: number; total: number }> {
  const sourceCodes = countCodesInSource(sourcePaths)

  const chapterMap = new Map<string, { extracted: Set<string>; total: Set<string> }>()

  for (const code of sourceCodes) {
    const chap = code.slice(0, 2)
    let entry = chapterMap.get(chap)
    if (!entry) {
      entry = { extracted: new Set(), total: new Set() }
      chapterMap.set(chap, entry)
    }
    entry.total.add(code)
  }

  for (const nodo of nodos.values()) {
    const code = extractCodeIdFromNodo(nodo)
    if (code) {
      const chap = code.slice(0, 2)
      let entry = chapterMap.get(chap)
      if (!entry) {
        entry = { extracted: new Set(), total: new Set() }
        chapterMap.set(chap, entry)
      }
      entry.extracted.add(code)

      if (!sourceCodes.has(code)) {
        entry.total.add(code)
      }
    }
  }

  const result = new Map<string, { extracted: number; total: number }>()
  for (const [chap, sets] of chapterMap) {
    result.set(chap, { extracted: sets.extracted.size, total: sets.total.size })
  }
  return result
}

export function buildAuditReport(parsedFiles: ParsedFile[], nodos: Map<string, Nodo>): void {
  const sourcePaths = parsedFiles.map((f) => f.path)
  const allSourceCodes = countCodesInSource(sourcePaths)
  const typeCounts = countExtractedByType(nodos)
  const chapterStats = coverageByChapter(nodos, sourcePaths)

  const extractedCodes = new Set<string>()
  for (const nodo of nodos.values()) {
    const code = extractCodeIdFromNodo(nodo)
    if (code) extractedCodes.add(code)
  }

  const totalSource = allSourceCodes.size
  const totalExtracted = extractedCodes.size
  const totalMissing = totalSource - totalExtracted
  const coveragePct = totalSource > 0 ? (totalExtracted / totalSource) * 100 : 0

  console.log()
  console.log(c.title('=== Auditoría del Builder ==='))
  console.log()
  console.log(`  ${c.label('Documentos:')}      ${typeCounts['documento'] || 0}`)
  console.log(`  ${c.label('Capítulos SA:')}     ${typeCounts['capitulo'] || 0}`)
  console.log(`  ${c.label('Artículos:')}        ${typeCounts['articulo'] || 0}`)
  console.log(`  ${c.label('Códigos extraídos:')} ${totalExtracted}`)
  console.log(`  ${c.label('Regímenes:')}        ${typeCounts['regimen-legal'] || 0}`)
  console.log()
  console.log(`  ${c.label('Cobertura de códigos:')}`)
  console.log(`    ${c.label('En fuente:')}     ${totalSource}`)
  console.log(`    ${c.label('Extraídos:')}      ${totalExtracted}`)
  console.log(`    ${c.label('Perdidos:')}       ${totalMissing}`)
  console.log(`    ${c.label('Cobertura:')}      ${c.pct(coveragePct)}`)
  console.log()
  console.log(`  ${c.label('Por capítulo:')}`)
  console.log()

  const sortedChaps = [...chapterStats.entries()].sort(([a], [b]) => a.localeCompare(b))

  for (const [chap, stats] of sortedChaps) {
    const pct = stats.total > 0 ? (stats.extracted / stats.total) * 100 : -1
    const line = `  Cap ${chap}:  ${stats.extracted}/${stats.total}  (${pct >= 0 ? c.pct(pct) : '—'})`
    console.log(line)
  }
  console.log()
}
