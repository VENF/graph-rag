import type { RawCodigo, RawSubpartida, RawRegimen, RawDocumento } from '../types.js';
import type { Frontmatter } from './frontmatter.js';
import { mesToNum, parseAec, parseExAec, extractSubpartidaLevels } from './utils.js';

const ARTICULO_RE = /[Aa]rt[íi]culo/;
const NUMERO_RE = /[Nº°]/;

export function extractDocumento(content: string, _filename: string, frontmatter?: Frontmatter): RawDocumento | null {
  if (frontmatter) {
    const decretoMatch = content.match(/Decreto\s+N[º°]\s*([\d.]+)/);
    const decretoFechaMatch = content.match(/Decreto\s+N[º°]\s*[\d.]+\s*\n\s*(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/);

    return {
      id: frontmatter.documentId,
      title: `Gaceta Oficial ${frontmatter.gazette} - ${frontmatter.amendment}`,
      number: frontmatter.gazette,
      gazette_type: 'Ordinaria',
      date: frontmatter.date,
      decree: decretoMatch?.[1] || '',
      decree_date: decretoFechaMatch
        ? `${decretoFechaMatch[3]}-${mesToNum(decretoFechaMatch[2])}-${decretoFechaMatch[1].padStart(2, '0')}`
        : '',
      issuer: 'Presidencia de la República',
      amendment: frontmatter.amendment,
    };
  }

  const numMatch = content.match(new RegExp(NUMERO_RE.source + '\\s*([\\d.]+)\\s*(Extraordinario)?'));
  const fechaMatch = content.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/);
  const decretoMatch = content.match(/Decreto\s+N[º°]\s*([\d.]+)/);
  const decretoFechaMatch = content.match(/Decreto\s+N[º°]\s*[\d.]+\s*\n\s*(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/);

  if (!numMatch) return null;

  return {
    id: `doc-gaceta-${numMatch[1].replace(/\./g, '')}`,
    title: 'Gaceta Oficial de la República Bolivariana de Venezuela',
    number: numMatch[1],
    gazette_type: numMatch[2]?.trim() || 'Ordinaria',
    date: fechaMatch ? `${fechaMatch[3]}-${mesToNum(fechaMatch[2])}-${fechaMatch[1].padStart(2, '0')}` : '',
    decree: decretoMatch?.[1] || '',
    decree_date: decretoFechaMatch
      ? `${decretoFechaMatch[3]}-${mesToNum(decretoFechaMatch[2])}-${decretoFechaMatch[1].padStart(2, '0')}`
      : '',
    issuer: 'Presidencia de la República',
    amendment: '',
  };
}

export function extractReferencias(content: string, currentNumber: number): number[] {
  const refs = new Set<number>();
  const phraseRe = /[Aa]rt[íi]culos?\s+(\d+(?:\s*[,y]\s*\d+)*)/g;
  let m: RegExpExecArray | null;
  while ((m = phraseRe.exec(content)) !== null) {
    const numbers = m[1].match(/\d+/g);
    if (numbers) {
      for (const nStr of numbers) {
        const n = parseInt(nStr, 10);
        if (!isNaN(n) && n !== currentNumber) refs.add(n);
      }
    }
  }
  return [...refs];
}

export function extractCodigosFromTable(
  lines: string[],
  start: number,
  end: number,
): { codigos: RawCodigo[]; subpartidas: RawSubpartida[] } {
  const codigos: RawCodigo[] = [];
  const subpartidaMap = new Map<string, RawSubpartida>();
  const descOverrides = new Map<string, string>();

  for (let i = start + 3; i <= end; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '' || trimmed.startsWith('---')) continue;
    if (!line.startsWith('|')) continue;

    const parts = line.split('|').map((p) => p.trim());
    if (parts.length < 5) continue;

    const codeRaw = parts[1];
    const descRaw = parts[2];
    const aecRaw = parts[3] || '';
    const exAecRaw = parts[4] || '';
    const riRaw = parts.length >= 8 ? parts[5] || '' : '';
    const reRaw = parts.length >= 8 ? parts[6] || '' : '';
    const ufRaw = parts.length >= 8 ? parts[7] || '' : parts[5] || '';

    const cleanCode = codeRaw.replace(/<[^>]*>/g, '').trim();
    const desc = descRaw
      .replace(/<[^>]*>/g, '')
      .trim()
      .replace(/^[-–\s]+/, '');
    const codeMatch = cleanCode.match(/^(\d{4}\.\d{2}\.\d{2}\.\d{2})$/);

    if (codeMatch) {
      const fullCode = codeMatch[1];

      codigos.push({
        code: fullCode,
        description: desc,
        aec: aecRaw ? parseAec(aecRaw) : null,
        ex_aec: exAecRaw || null,
        ex_aec_legal_refs: exAecRaw ? parseExAec(exAecRaw).refs : [],
        import_regime: riRaw
          ? riRaw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        export_regime: reRaw
          ? reRaw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        physical_unit: ufRaw || null,
        path: [],
      });

      const levels = extractSubpartidaLevels(fullCode);
      for (const sub of levels) {
        if (!subpartidaMap.has(sub.id)) {
          subpartidaMap.set(sub.id, sub);
        }
      }
    }

    if (desc) {
      const boldMatch = codeRaw.match(/<b>(\d{2})\.(\d{2})<\/b>/);
      if (boldMatch) {
        const subId = `SUB-${boldMatch[1]}${boldMatch[2]}`;
        descOverrides.set(subId, desc);
      }

      const match8d = cleanCode.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
      if (match8d) {
        const code8d = match8d[1] + match8d[2] + match8d[3];
        const subId6 = `SUB-${match8d[1]}${match8d[2]}`;
        const subId8 = `SUB-${code8d}`;
        if (!descOverrides.has(subId6)) descOverrides.set(subId6, desc);
        if (!descOverrides.has(subId8)) descOverrides.set(subId8, desc);
      }

      const match6d = cleanCode.match(/^(\d{4})\.(\d{2})$/);
      if (match6d) {
        const subId = `SUB-${match6d[1]}${match6d[2]}`;
        if (!descOverrides.has(subId)) descOverrides.set(subId, desc);
      }
    }
  }

  for (const [id, description] of descOverrides) {
    if (subpartidaMap.has(id)) {
      subpartidaMap.get(id)!.description = description;
    }
  }

  const subpartidas = [...subpartidaMap.values()];
  for (const cod of codigos) {
    cod.path = extractSubpartidaLevels(cod.code).map((s) => s.id);
  }

  return { codigos, subpartidas };
}

export function extractRegimenes(content: string): RawRegimen[] {
  const regimenes: RawRegimen[] = [];

  const articulo21Match = content.match(
    new RegExp(`\\*\\*${ARTICULO_RE.source}\\s+21\\.?\\*\\*([\\s\\S]*?)(?=\\*\\*${ARTICULO_RE.source}\\s+22|\\Z)`),
  );

  if (articulo21Match) {
    const listPattern = /^(\d+)\.\s*(.*?)$/gm;
    let listMatch: RegExpExecArray | null;
    while ((listMatch = listPattern.exec(articulo21Match[1])) !== null) {
      const codigo = listMatch[1].trim();
      const descripcion = listMatch[2].trim();

      let entidad: string | null = null;
      const entidadMatch = descripcion.match(
        /(?:del|de la|de los|de las)\s+(Ministerio|Servicio|Registro|Banco)[^;,.]+/,
      );
      if (entidadMatch) entidad = entidadMatch[0].trim();

      regimenes.push({ code: codigo, description: descripcion, entity: entidad });
    }
  }

  return regimenes;
}

export { extractSectionNotes } from './utils.js';
