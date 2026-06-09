import fs from 'fs'
import path from 'path'
import type {
  RawArticulo,
  RawCodigo,
  RawRegimen,
  RawDocumento,
  RawCapituloSA,
  ParsedFile,
} from './types.js'

const PAGE_BREAK = /\{\d+\}-{2,}/

const ARTICULO_RE = /[Aa]rt[íi]culo/
const SECCION_RE = /SECCI[OÓ]N/
const CAPITULO_RE = /CAP[IÍ]TULO/
const NUMERO_RE = /N[º°]/

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

  return { number: num, title: titulo || `Capítulo ${num}`, section: null, section_title: null }
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

function extractArticulos(content: string): RawArticulo[] {
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

function extractCodigos(content: string): RawCodigo[] {
  const codigos: RawCodigo[] = []
  const lines = content.split('\n')
  let inTable = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.includes('| Código') && line.includes('Descripción')) {
      inTable = true
      i += 3
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
    if (parts.length < 8) continue

    const codeRaw = parts[1]
    const descRaw = parts[2]
    const aecRaw = parts[3] || ''
    const exAecRaw = parts[4] || ''
    const riRaw = parts[5] || ''
    const reRaw = parts[6] || ''
    const ufRaw = parts[7] || ''

    const codeMatch = codeRaw.match(/^(\d{4}\.\d{2}\.\d{2}\.\d{2})$/)
    if (!codeMatch) continue

    const fullCode = codeMatch[1]

    codigos.push({
      code: fullCode,
      description: descRaw.replace(/<[^>]*>/g, '').trim(),
      aec: aecRaw ? parseFloat(aecRaw) : null,
      ex_aec: exAecRaw || null,
      import_regime: riRaw ? riRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
      export_regime: reRaw ? reRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
      physical_unit: ufRaw || null,
    })
  }

  return codigos
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

export function parseFile(filePath: string, filename: string): ParsedFile {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const content = cleanPageBreaks(raw)

  const documento = extractDocumento(content, filename)
  const articulos = extractArticulos(content)
  const capitulos_sa = extractCapitulosSA(content)
  const codigos = extractCodigos(content)
  const regimenes = extractRegimenes(content)

  return { path: filePath, filename, document: documento, articles: articulos, sa_chapters: capitulos_sa, codes: codigos, regimes: regimenes }
}
