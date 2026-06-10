import fs from 'fs'
import path from 'path'
import type {
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

const PAGE_BREAK = /\{\d+\}-{2,}/

const ARTICULO_RE = /[Aa]rt[íi]culo/
const SECCION_RE = /SECCI[OÓ]N/
const CAPITULO_RE = /CAP[IÍ]TULO/
const NUMERO_RE = /N[º°]/

export interface LineIndex {
  articleHeaders: Array<{ line: number; number: number }>
  codeTables: Array<{ start: number; end: number }>
  sectionsRegion?: { start: number; end: number }
  articleNotesRegion?: { start: number; end: number }
}

export function buildLineIndex(lines: string[]): LineIndex {
  const index: LineIndex = { articleHeaders: [], codeTables: [] }
  const artHeaderRe = /\*\*Art[íi]culo\s+(\d+)[º°]?\.?\*\*/
  const tableHeaderRe = /\|\s*Código/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const artMatch = line.match(artHeaderRe)
    if (artMatch) {
      index.articleHeaders.push({ line: i, number: parseInt(artMatch[1], 10) })
      continue
    }

    if (tableHeaderRe.test(line)) {
      const start = i
      i += 3
      while (i < lines.length) {
        const trimmed = lines[i].trim()
        if (trimmed === '' || trimmed.startsWith('---')) { i++; continue }
        if (!lines[i].startsWith('|')) break
        i++
      }
      index.codeTables.push({ start, end: i - 1 })
      continue
    }

    if (line.trim() === '## SECCIONES Y CAPÍTULOS') {
      const start = i
      let end = start + 1
      while (end < lines.length) {
        const nextLine = lines[end].trim()
        if (nextLine.startsWith('## ')) break
        if (nextLine.match(/^###\s+\*{0,2}ABREVIATURAS/)) break
        end++
      }
      index.sectionsRegion = { start, end: end - 1 }
    }
  }

  if (index.sectionsRegion) {
    let articleStart = index.sectionsRegion.end + 1
    while (articleStart < lines.length) {
      const line = lines[articleStart].trim()
      if (line.match(/^###\s*\*{0,2}SECCI[OÓ]N\b/)) break
      articleStart++
    }
    let articleEnd = articleStart + 1
    while (articleEnd < lines.length) {
      if (lines[articleEnd].trim().startsWith('## ')) break
      articleEnd++
    }
    index.articleNotesRegion = { start: articleStart, end: articleEnd - 1 }
  }

  return index
}

const SECTION_HEADER_RE = /###\s*\*{0,2}SECCI[OÓ]N\s+(I{1,3}V?|IV|V?I{0,3})\*{0,2}(?:\s+\*{0,2}(.+)\*{0,2})?/
const CHAPTER_ENTRY_RE = /^(?:[-–]\s*)?(\d{1,2})\.?\s+(.+)/

export function extractSectionsAndChapters(lines: string[], start: number, end: number): RawCapituloSA[] {
  const capitulos: RawCapituloSA[] = []
  let currentSection: { number: string; title: string } | null = null

  for (let i = start; i <= end; i++) {
    const line = lines[i].trim()

    const secMatch = line.match(SECTION_HEADER_RE)
    if (secMatch) {
      const sectionNum = secMatch[1].trim()
      let sectionTitle = (secMatch[2] || '').trim()
      if (!sectionTitle) {
        for (let j = i + 1; j <= Math.min(i + 3, end); j++) {
          const nextLine = (lines[j] || '').trim()
          const headingMatch = nextLine.match(/^#{4}\s+\*{0,2}(.+)\*{0,2}\s*$/)
          if (headingMatch) {
            sectionTitle = headingMatch[1].trim()
            break
          }
        }
      }
      currentSection = { number: sectionNum, title: sectionTitle || `Sección ${sectionNum}` }
      continue
    }

    const capMatch = line.match(CHAPTER_ENTRY_RE)
    if (capMatch && currentSection) {
      const num = parseInt(capMatch[1], 10)
      if (num >= 1 && num <= 99) {
        const title = capMatch[2].replace(/\.$/, '').trim()
        capitulos.push({
          number: String(num).padStart(2, '0'),
          title,
          section: currentSection.number,
          section_title: currentSection.title,
          notes: [],
        })
      }
    }
  }

  return capitulos
}

export function extractSectionNotes(lines: string[], index: LineIndex): RawNota[] {
  if (!index.sectionsRegion) return []
  const notas: RawNota[] = []
  let currentSection: string | null = null

  for (let i = index.sectionsRegion.start; i <= index.sectionsRegion.end; i++) {
    const line = lines[i].trim()

    const secMatch = line.match(SECTION_HEADER_RE)
    if (secMatch) {
      currentSection = secMatch[1].trim()
      continue
    }

    if (line.match(/^Notas? de Secci[oó]n/)) {
      const noteStart = i + 1
      let noteEnd = noteStart
      while (noteEnd <= index.sectionsRegion.end) {
        const nl = lines[noteEnd].trim()
        if (nl.match(SECTION_HEADER_RE) || nl === '') { noteEnd++; continue }
        if (!nl.match(/^\d+\.\s/) && !nl.match(/^[-–]\s*\d+/) && !nl.startsWith('|')) break
        noteEnd++
      }
      for (let j = noteStart; j < noteEnd; j++) {
        const nl = lines[j].trim()
        const textMatch = nl.match(/^(?:\d+\.\s+)?[-–]?\s*(.+)/)
        if (textMatch) {
          notas.push({
            type: 'seccion',
            section: currentSection,
            chapter: null,
            text: textMatch[1],
            scope: null,
          })
        }
      }
    }
  }

  return notas
}

function parseSeccionHeader(line: string): { number: string; title: string } | null {
  const match = line.match(
    /(?:\*\*|###\s*\*\*)SECCI[OÓ]N\s+(I{1,3}V?|IV|V?I*)\*\*\s*\*\*(.*?)\*\*/
  )
  if (match) {
    return { number: match[1].trim(), title: match[2].trim() }
  }
  return null
}

function parseSeccionWithTitle(lines: string[], i: number): { number: string; title: string } | null {
  const match = lines[i].match(
    /^\*\*SECCI[OÓ]N\s+(I{1,3}V?|IV|V?I*)\*\*$/
  )
  if (!match) return null

  const num = match[1].trim()
  const nextLine = (lines[i + 1] || '').trim()
  const titleMatch = nextLine.match(/^\*\*(.*?)\*\*/)
  return { number: num, title: titleMatch ? titleMatch[1].trim() : `Sección ${num}` }
}

function parseCapituloHeader(lines: string[], i: number): RawCapituloSA | null {
  const line = lines[i]
  const match = line.match(
    /(?:\*\*|###\s*\*\*|###\s*)CAP[IÍ]TULO\s+(\d+)\s*\*\*?\s*(?:\*\*(.*?)\*\*)?/
  )
  if (!match) return null

  let num = match[1].trim()
  let titulo = (match[2] || '').trim()

  if (!titulo) {
    const nextLine = (lines[i + 1] || '').trim()
    const tMatch = nextLine.match(/^\*\*(.*?)\*\*/)
    if (tMatch) titulo = tMatch[1].trim()
  }

  return { number: num, title: titulo || `Capítulo ${num}`, section: null, section_title: null, notes: [] }
}

export function readSourceFiles(inputDir: string, patterns: string[]): string[] {
  try {
    const files = fs.readdirSync(inputDir)
    return files.filter((f) => {
      const base = path.basename(f)
      return patterns.some((p) => {
        const escaped = p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
        const regex = new RegExp('^' + escaped + '$')
        return regex.test(base)
      })
    }).map((f) => path.join(inputDir, f))
  } catch {
    throw new Error(`No se pudo leer el directorio de entrada: ${inputDir}`)
  }
}

function cleanPageBreaks(text: string): string {
  return text.replace(PAGE_BREAK, '').trim()
}

function mesToNum(mes: string): string {
  const map: Record<string, string> = {
    enero: '01', febrero: '02', marzo: '03', abril: '04',
    mayo: '05', junio: '06', julio: '07', agosto: '08',
    septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
  }
  return map[mes.toLowerCase()] || '00'
}

function extractDocumento(content: string, filename: string): RawDocumento | null {
  const numMatch = content.match(new RegExp(NUMERO_RE.source + '\\s*([\\d.]+)\\s*(Extraordinario)?'))
  const fechaMatch = content.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/)
  const decretoMatch = content.match(/Decreto\s+N[º°]\s*([\d.]+)/)
  const decretoFechaMatch = content.match(/Decreto\s+N[º°]\s*[\d.]+\s*\n\s*(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/)

  if (!numMatch) return null

  return {
    id: `doc-gaceta-${numMatch[1].replace(/\./g, '')}`,
    title: 'Gaceta Oficial de la República Bolivariana de Venezuela',
    number: numMatch[1],
    gazette_type: numMatch[2]?.trim() || 'Ordinaria',
    date: fechaMatch
      ? `${fechaMatch[3]}-${mesToNum(fechaMatch[2])}-${fechaMatch[1].padStart(2, '0')}`
      : '',
    decree: decretoMatch?.[1] || '',
    decree_date: decretoFechaMatch
      ? `${decretoFechaMatch[3]}-${mesToNum(decretoFechaMatch[2])}-${decretoFechaMatch[1].padStart(2, '0')}`
      : '',
    issuer: 'Presidencia de la República',
  }
}

function extractReferencias(content: string, currentNumber: number): number[] {
  const refs = new Set<number>()
  const pattern = new RegExp(
    ARTICULO_RE.source + 's?\\s+(\\d+)((?:\\s+y\\s+|\\s*,\\s*)(\\d+))?((?:\\s+y\\s+|\\s*,\\s*)(\\d+))?',
    'g'
  )
  let m: RegExpExecArray | null
  while ((m = pattern.exec(content)) !== null) {
    for (let g = 1; g <= 5; g += 2) {
      if (m[g]) {
        const n = parseInt(m[g], 10)
        if (!isNaN(n) && n !== currentNumber) refs.add(n)
      }
    }
  }
  return [...refs]
}

function extractArticulosFromLines(lines: string[], articleHeaders: LineIndex['articleHeaders']): RawArticulo[] {
  const articulos: RawArticulo[] = []
  const fullContent = lines.join('\n')
  const capitulosLegales = findCapitulosLegales(fullContent)

  for (let h = 0; h < articleHeaders.length; h++) {
    const header = articleHeaders[h]
    const startLine = header.line
    const endLine = h + 1 < articleHeaders.length ? articleHeaders[h + 1].line : lines.length

    const num = header.number
    const blockLines = lines.slice(startLine + 1, endLine)
    const rawContent = cleanPageBreaks(blockLines.join('\n').trim())

    const tituloMatch = rawContent.match(/^(.+?)(?:\n|$)/)
    const titulo = tituloMatch ? tituloMatch[1].trim() : ''

    const refs = extractReferencias(rawContent, num)
    const articleBlock = lines.slice(startLine, endLine).join('\n')
    const capMatch = findCapituloLegalAnterior(capitulosLegales, fullContent, articleBlock)

    articulos.push({ number: num, title: titulo, content: rawContent, references: refs, legal_chapter: capMatch })
  }

  return articulos
}

function extractArticulos(content: string, index?: LineIndex): RawArticulo[] {
  if (index && index.articleHeaders.length > 0) {
    return extractArticulosFromLines(content.split('\n'), index.articleHeaders)
  }

  if (index && index.articleHeaders.length === 0) {
    console.warn('fallback: no se encontraron artículos en el índice, escaneando completo')
  }

  const articulos: RawArticulo[] = []
  const artPattern = new RegExp(`(?=\\*\\*${ARTICULO_RE.source}\\s+\\d+[º°]?\\.?\\*\\*)`, 'g')

  const separators = content.split(artPattern)

  const capitulosLegales = findCapitulosLegales(content)

  for (const block of separators) {
    const match = block.match(
      new RegExp(`\\*\\*${ARTICULO_RE.source}\\s+(\\d+)[º°]?\\.?\\*\\*([\\s\\S]*)$`)
    )
    if (!match) continue

    const numero = parseInt(match[1], 10)
    const rawContent = cleanPageBreaks(match[2].trim())

    const tituloMatch = rawContent.match(/^(.+?)(?:\n|$)/)
    const titulo = tituloMatch ? tituloMatch[1].trim() : ''

    const refs = extractReferencias(rawContent, numero)
    const capMatch = findCapituloLegalAnterior(capitulosLegales, content, block)

    articulos.push({ number: numero, title: titulo, content: rawContent, references: refs, legal_chapter: capMatch })
  }

  return articulos
}

function findCapitulosLegales(fullContent: string): Array<{ index: number; value: string }> {
  const romanPattern = new RegExp(`##\\s*${CAPITULO_RE.source}\\s+([IVXLCDM]+)\\b`, 'g')
  const caps: Array<{ index: number; value: string }> = []
  let m: RegExpExecArray | null
  while ((m = romanPattern.exec(fullContent)) !== null) {
    caps.push({ index: m.index, value: m[1] })
  }
  return caps
}

function findCapituloLegalAnterior(
  capitulos: Array<{ index: number; value: string }>,
  _fullContent: string,
  currentBlock: string,
): string | null {
  const beforeIdx = _fullContent.indexOf(currentBlock)
  let last: string | null = null
  for (const cap of capitulos) {
    if (cap.index < beforeIdx) last = cap.value
  }
  return last
}

function extractCapitulosSA(content: string): RawCapituloSA[] {
  const capitulos: RawCapituloSA[] = []
  const cleanContent = content.replace(PAGE_BREAK, '\n')

  let seccionActual: { number: string; title: string } | null = null

  const lines = cleanContent.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    const secHeader = parseSeccionHeader(line)
    if (secHeader) {
      seccionActual = secHeader
      continue
    }

    const secWithTitle = parseSeccionWithTitle(lines, i)
    if (secWithTitle) {
      seccionActual = secWithTitle
      i += 1
      continue
    }

    const capHeader = parseCapituloHeader(lines, i)
    if (capHeader) {
      capitulos.push({
        ...capHeader,
        section: seccionActual?.number || null,
        section_title: seccionActual?.title || null,
      })
      continue
    }
  }

  return capitulos
}

function extractSubpartidaLevels(code: string): RawSubpartida[] {
  const levels: RawSubpartida[] = []
  const clean = code.replace(/\./g, '')

  const parts = [
    { display: clean.slice(0, 4), level: 4 },
    { display: `${clean.slice(0, 4)}.${clean.slice(4, 6)}`, level: 6 },
    { display: `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6, 8)}`, level: 8 },
  ]

  for (const p of parts) {
    const id = `sub-${p.display.replace(/\./g, '')}`
    levels.push({
      id,
      code: p.display.replace(/\./g, ''),
      display: p.display,
      description: '',
      level: p.level,
      parent: levels.length > 0 ? levels[levels.length - 1].id : null,
    })
  }

  return levels
}

function parseAec(raw: string): RawCodigo['aec'] {
  const sanitized = raw.replace(/^O(?=BIT)/, '0')
  const match = sanitized.match(/^([\d.]+)(BK|BIT)?$/)
  if (!match) return { rate: null, qualifier: null }
  return {
    rate: parseFloat(match[1]),
    qualifier: (match[2] as 'BK' | 'BIT') || null,
  }
}

const EX_AEC_LEGAL_MAP: Record<string, string> = {
  E: 'Artículo 11 (Excepción al AEC)',
  A: 'Artículo 12 (Bienes del Sector Aeronáutico)',
  DV: 'Subcapítulo II (Contingente Arancelario — Derecho Variable)',
}

function parseExAec(raw: string): { value: string; refs: string[] } {
  const sanitized = raw.replace(/^O(?=E\b)/, '0')
  const refs: string[] = []
  const bands = sanitized.split(',')
  for (const band of bands) {
    const b = band.trim()
    if (/[Ee]/.test(b) && !refs.includes(EX_AEC_LEGAL_MAP.E)) refs.push(EX_AEC_LEGAL_MAP.E)
    if (/[Aa]/.test(b) && !refs.includes(EX_AEC_LEGAL_MAP.A)) refs.push(EX_AEC_LEGAL_MAP.A)
    if (/±?\s*DV/i.test(b) && !refs.includes(EX_AEC_LEGAL_MAP.DV)) refs.push(EX_AEC_LEGAL_MAP.DV)
  }
  return { value: sanitized, refs }
}

function extractScopeCodes(text: string): string[] {
  const codes: string[] = []
  const re = /subpartida\s+(\d{4}\.\d{2}(?:\.\d{2}(?:\.\d{2})?)?)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    codes.push(m[1].replace(/\./g, ''))
  }
  return codes
}

function extractCodigosFromTable(lines: string[], start: number, end: number): { codigos: RawCodigo[], subpartidas: RawSubpartida[] } {
  const codigos: RawCodigo[] = []
  const subpartidaMap = new Map<string, RawSubpartida>()
  const descOverrides = new Map<string, string>()

  const subPartidaRe = /^(\d{4}\.\d{2}\.\d{2}\.\d{2}(?:\.\d)?)$/

  for (let i = start + 3; i <= end; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '' || trimmed.startsWith('---')) continue
    if (!line.startsWith('|')) continue

    const parts = line.split('|').map((p) => p.trim())
    if (parts.length < 5) continue

    const codeRaw = parts[1]
    const descRaw = parts[2]
    const aecRaw = parts[3] || ''
    const exAecRaw = parts[4] || ''
    const riRaw = parts.length >= 8 ? (parts[5] || '') : ''
    const reRaw = parts.length >= 8 ? (parts[6] || '') : ''
    const ufRaw = parts.length >= 8 ? (parts[7] || '') : (parts[5] || '')

    const cleanCode = codeRaw.replace(/<[^>]*>/g, '').trim()
    const desc = descRaw.replace(/<[^>]*>/g, '').trim().replace(/^[-–\s]+/, '')
    const codeMatch = cleanCode.match(/^(\d{4}\.\d{2}\.\d{2}\.\d{2})$/)

    if (codeMatch) {
      const fullCode = codeMatch[1]

      codigos.push({
        code: fullCode,
        description: desc,
        aec: aecRaw ? parseAec(aecRaw) : null,
        ex_aec: exAecRaw || null,
        ex_aec_legal_refs: exAecRaw ? parseExAec(exAecRaw).refs : [],
        import_regime: riRaw ? riRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
        export_regime: reRaw ? reRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
        physical_unit: ufRaw || null,
        path: [],
      })

      const levels = extractSubpartidaLevels(fullCode)
      for (const sub of levels) {
        if (!subpartidaMap.has(sub.id)) {
          subpartidaMap.set(sub.id, sub)
        }
      }
    }

    if (desc) {
      const boldMatch = codeRaw.match(/<b>(\d{2})\.(\d{2})<\/b>/)
      if (boldMatch) {
        const subId = `sub-${boldMatch[1]}${boldMatch[2]}`
        descOverrides.set(subId, desc)
      }

      const match8d = cleanCode.match(/^(\d{4})\.(\d{2})\.(\d{2})$/)
      if (match8d) {
        const code8d = match8d[1] + match8d[2] + match8d[3]
        const subId6 = `sub-${match8d[1]}${match8d[2]}`
        const subId8 = `sub-${code8d}`
        if (!descOverrides.has(subId6)) descOverrides.set(subId6, desc)
        if (!descOverrides.has(subId8)) descOverrides.set(subId8, desc)
      }

      const match6d = cleanCode.match(/^(\d{4})\.(\d{2})$/)
      if (match6d) {
        const subId = `sub-${match6d[1]}${match6d[2]}`
        if (!descOverrides.has(subId)) descOverrides.set(subId, desc)
      }
    }
  }

  for (const [id, description] of descOverrides) {
    if (subpartidaMap.has(id)) {
      subpartidaMap.get(id)!.description = description
    }
  }


  const subpartidas = [...subpartidaMap.values()]
  for (const cod of codigos) {
    cod.path = extractSubpartidaLevels(cod.code).map((s) => s.id)
  }

  return { codigos, subpartidas }
}

function extractCodigos(content: string, index?: LineIndex): { codigos: RawCodigo[], subpartidas: RawSubpartida[] } {
  if (index && index.codeTables.length > 0) {
    const lines = content.split('\n')
    const result = { codigos: [] as RawCodigo[], subpartidas: [] as RawSubpartida[] }
    for (const table of index.codeTables) {
      const tableResult = extractCodigosFromTable(lines, table.start, table.end)
      result.codigos.push(...tableResult.codigos)

      const seenIds = new Set(result.subpartidas.map((s) => s.id))
      for (const sub of tableResult.subpartidas) {
        if (!seenIds.has(sub.id)) {
          result.subpartidas.push(sub)
          seenIds.add(sub.id)
        }
      }
    }
    return result
  }

  if (index && index.codeTables.length === 0) {
    console.warn('fallback: no se encontraron tablas de códigos en el índice, escaneando completo')
  }

  const codigos: RawCodigo[] = []
  const subpartidaMap = new Map<string, RawSubpartida>()
  const lines = content.split('\n')
  let inTable = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.includes('| Código') && line.includes('Descripción')) {
      inTable = true
      i += 2
      continue
    }

    if (!inTable) continue

    const trimmed = line.trim()

    if (trimmed === '' || trimmed.startsWith('---')) continue

    if (!line.startsWith('|')) {
      if (trimmed.includes('**SECCI') || trimmed.includes('## ') || trimmed.includes('CAPÍTULO')) {
        inTable = false
      }
      continue
    }

    const parts = line.split('|').map((p) => p.trim())
    if (parts.length < 5) continue

    const codeRaw = parts[1]
    const descRaw = parts[2]
    const aecRaw = parts[3] || ''
    const exAecRaw = parts[4] || ''
    const riRaw = parts.length >= 8 ? (parts[5] || '') : ''
    const reRaw = parts.length >= 8 ? (parts[6] || '') : ''
    const ufRaw = parts.length >= 8 ? (parts[7] || '') : (parts[5] || '')

    const cleanCode = codeRaw.replace(/<[^>]*>/g, '').trim()
    const codeMatch = cleanCode.match(/^(\d{4}\.\d{2}\.\d{2}\.\d{2})$/)
    if (!codeMatch) continue

    const fullCode = codeMatch[1]

    codigos.push({
      code: fullCode,
      description: descRaw.replace(/<[^>]*>/g, '').trim(),
      aec: aecRaw ? parseAec(aecRaw) : null,
      ex_aec: exAecRaw || null,
      ex_aec_legal_refs: exAecRaw ? parseExAec(exAecRaw).refs : [],
      import_regime: riRaw ? riRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
      export_regime: reRaw ? reRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
      physical_unit: ufRaw || null,
      path: [],
    })

    const levels = extractSubpartidaLevels(fullCode)
    for (const sub of levels) {
      if (!subpartidaMap.has(sub.id)) {
        subpartidaMap.set(sub.id, sub)
      }
    }
  }

  const subpartidas = [...subpartidaMap.values()]
  for (const cod of codigos) {
    cod.path = extractSubpartidaLevels(cod.code).map((s) => s.id)
  }

  return { codigos, subpartidas }
}

function extractTableNotes(lines: string[], index: LineIndex): RawNota[] {
  const notas: RawNota[] = []
  const complementariaRe = /Nota\s+Complementaria/i

  for (const table of index.codeTables) {
    for (let i = table.start; i <= table.end; i++) {
      const line = lines[i]
      const trimmed = line.trim()
      if (trimmed.includes('|') && trimmed.match(/\|[\s]*\|/)) continue
      if (complementariaRe.test(trimmed)) {
        const noteStart = i
        let noteEnd = i + 1
        while (noteEnd <= table.end) {
          const nl = lines[noteEnd].trim()
          if (nl.startsWith('|') || nl === '' || nl.startsWith('---')) { noteEnd++; continue }
          if (nl.match(/^#{1,5}\s+/) || nl.match(/^\*\*/)) break
          noteEnd++
        }
        const text = lines.slice(noteStart, noteEnd).map((l) => l.trim()).filter(Boolean).join(' ')
        notas.push({
          type: 'complementaria',
          section: null,
          chapter: null,
          text,
          scope: null,
        })
      }
    }
  }

  return notas
}

function extractRegimenes(content: string): RawRegimen[] {
  const regimenes: RawRegimen[] = []

  const articulo21Match = content.match(
    new RegExp(`\\*\\*${ARTICULO_RE.source}\\s+21\\.?\\*\\*([\\s\\S]*?)(?=\\*\\*${ARTICULO_RE.source}\\s+22|\\Z)`)
  )

  if (articulo21Match) {
    const listPattern = /^(\d+)\.\s*(.*?)$/gm
    let listMatch: RegExpExecArray | null
    while ((listMatch = listPattern.exec(articulo21Match[1])) !== null) {
      const codigo = listMatch[1].trim()
      const descripcion = listMatch[2].trim()

      let entidad: string | null = null
      const entidadMatch = descripcion.match(/(?:del|de la|de los|de las)\s+(Ministerio|Servicio|Registro|Banco)[^;,.]+/)
      if (entidadMatch) entidad = entidadMatch[0].trim()

      regimenes.push({ code: codigo, description: descripcion, entity: entidad })
    }
  }

  return regimenes
}

const SECTION_IN_ARTICLE_RE = /^###\s*\*{0,2}SECCI[OÓ]N\s+(I{1,3}V?|IV|V?I{0,3})\b/i
const CHAPTER_IN_ARTICLE_RE = /^####\s*\*{0,2}CAP[IÍ]TULO\s+(\d+)\b/i
const SUBCAPITULO_IN_ARTICLE_RE = /^####\s*\*{0,2}SUBCAP[ÍI]TULO\s+(I{1,3}V?|IV|V?I{0,3})\b/i
const NOTE_HEADER_RE = /^#{5}\s*\*{0,2}(Notas?\s+de\s+subpartida|Notas?\s+Complementarias?(?:\s*\([^)]+\))?|Notas?)[\.:]?\*{0,2}\s*$/i
const SUBCAP_NOTE_RE = /Notas?\s+de\s+Subcap[íi]tulo/i

export function extractArticleChapterNotes(lines: string[], index: LineIndex): RawNota[] {
  if (!index.articleNotesRegion) return []
  const notas: RawNota[] = []
  let currentSection: string | null = null
  let currentChapter: string | null = null
  let afterSectionHeader = true

  for (let i = index.articleNotesRegion.start; i <= index.articleNotesRegion.end; i++) {
    const line = lines[i].trim()

    const secMatch = line.match(SECTION_IN_ARTICLE_RE)
    if (secMatch) {
      currentSection = secMatch[1].trim()
      currentChapter = null
      afterSectionHeader = true
      continue
    }

    const capMatch = line.match(CHAPTER_IN_ARTICLE_RE)
    if (capMatch) {
      currentChapter = String(parseInt(capMatch[1], 10)).padStart(2, '0')
      afterSectionHeader = false
      continue
    }

    if (!line.match(/^#{5}\s+/)) continue

    const header = line.replace(/^\#{5}\s*\*{0,2}/, '').replace(/\*{0,2}\s*$/, '').trim()

    if (SUBCAP_NOTE_RE.test(header)) {
      let ne = i + 1
      while (ne <= index.articleNotesRegion.end) {
        const nl = lines[ne].trim()
        if (nl.match(/^#{1,5}\s+/) || nl.startsWith('| Código') || nl.match(/^\| *Código/)) break
        ne++
      }
      notas.push({
        type: 'subcapitulo',
        section: currentSection,
        chapter: currentChapter,
        text: lines.slice(i + 1, ne).map((l) => l.trim()).filter((l) => l.length > 0).join('\n'),
        scope: null,
      })
      continue
    }
    if (!/^notas?\b/i.test(header)) continue

    let type: RawNota['type']
    if (/notas?\s+de\s+subpartida/i.test(header)) {
      type = 'subpartida'
    } else if (/notas?\s+complementaria/i.test(header)) {
      type = 'complementaria'
    } else {
      type = afterSectionHeader ? 'seccion' : 'capitulo'
    }

    let noteEnd = i + 1
    while (noteEnd <= index.articleNotesRegion.end) {
      const nl = lines[noteEnd].trim()
      if (nl.match(/^#{1,5}\s+/) || nl.startsWith('| Código') || nl.match(/^\| *Código/)) break
      noteEnd++
    }

    const text = lines.slice(i + 1, noteEnd)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join('\n')

    const scope = type === 'subpartida' ? extractScopeCodes(text).join(',') || null : null

    notas.push({
      type,
      section: currentSection,
      chapter: type === 'capitulo' || type === 'subpartida' || type === 'complementaria' ? currentChapter : null,
      text,
      scope,
    })
  }

  return notas
}

export function extractSubcapitulos(lines: string[], index: LineIndex): RawSubcapitulo[] {
  if (!index.articleNotesRegion) return []
  const subcapitulos: RawSubcapitulo[] = []
  let currentSubcap: RawSubcapitulo | null = null
  let currentChapter: string | null = null

  for (let i = index.articleNotesRegion.start; i <= index.articleNotesRegion.end; i++) {
    const line = lines[i].trim()

    const capMatch = line.match(CHAPTER_IN_ARTICLE_RE)
    if (capMatch) {
      currentChapter = String(parseInt(capMatch[1], 10)).padStart(2, '0')
    }

    const subcapMatch = line.match(SUBCAPITULO_IN_ARTICLE_RE)
    if (subcapMatch) {
      const roman = subcapMatch[1].trim()
      currentSubcap = {
        chapter: currentChapter || '',
        roman,
        title: line.replace(/^#{1,5}\s*\*{0,2}/, '').replace(/\*{0,2}\s*$/, '').trim(),
        notes: [],
      }
      subcapitulos.push(currentSubcap)
      continue
    }

    if (!line.match(/^#{5}\s+/) || !currentSubcap) continue
    const header = line.replace(/^\#{5}\s*\*{0,2}/, '').replace(/\*{0,2}\s*$/, '').trim()
    if (!SUBCAP_NOTE_RE.test(header)) continue

    let ne = i + 1
    while (ne <= index.articleNotesRegion.end) {
      const nl = lines[ne].trim()
      if (nl.match(/^#{1,5}\s+/) || nl.startsWith('| Código') || nl.match(/^\| *Código/)) break
      ne++
    }
    currentSubcap.notes.push({
      type: 'subcapitulo',
      section: null,
      chapter: currentSubcap.chapter,
      text: lines.slice(i + 1, ne).map((l) => l.trim()).filter((l) => l.length > 0).join('\n'),
      scope: null,
    })
  }

  return subcapitulos
}

export function parseFile(filePath: string, filename: string): ParsedFile {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const content = cleanPageBreaks(raw)

  const lines = content.split('\n')
  const index = buildLineIndex(lines)

  const documento = extractDocumento(content, filename)
  const articulos = extractArticulos(content, index)
  const capitulos_sa = index.sectionsRegion
    ? extractSectionsAndChapters(lines, index.sectionsRegion.start, index.sectionsRegion.end)
    : extractCapitulosSA(content)
  const { codigos, subpartidas } = extractCodigos(content, index)
  const regimenes = extractRegimenes(content)
  const notas = extractSectionNotes(lines, index)
  const articleNotes = extractArticleChapterNotes(lines, index)

  const sectionNotes = articleNotes.filter((n) => n.type === 'seccion' || (n.type === 'complementaria' && n.chapter === null))
  const chapterNotes = articleNotes.filter((n) => n.chapter !== null)

  for (const cap of capitulos_sa) {
    cap.notes = chapterNotes.filter((n) => n.chapter === cap.number)
  }

  const subcapitulos = extractSubcapitulos(lines, index)

  return {
    path: filePath, filename, document: documento, articles: articulos,
    sa_chapters: capitulos_sa, codes: codigos, regimes: regimenes,
    subpartidas, notas: [...notas, ...sectionNotes],
    subcapitulos,
  }
}
