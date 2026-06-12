import type { RawCodigo, RawSubpartida, RawNota, LineIndex } from '../types.js';
import { subpartidaId } from '../ids.js';

const PAGE_BREAK = /\{\d+\}-{2,}/;

export function cleanPageBreaks(text: string): string {
  return text.replace(PAGE_BREAK, '').trim();
}

export function mesToNum(mes: string): string {
  const map: Record<string, string> = {
    enero: '01',
    febrero: '02',
    marzo: '03',
    abril: '04',
    mayo: '05',
    junio: '06',
    julio: '07',
    agosto: '08',
    septiembre: '09',
    octubre: '10',
    noviembre: '11',
    diciembre: '12',
  };
  return map[mes.toLowerCase()] || '00';
}

export function parseAec(raw: string): RawCodigo['aec'] {
  const sanitized = raw.replace(/^O(?=BIT)/, '0');
  const match = sanitized.match(/^([\d.]+)(BK|BIT)?$/);
  if (!match) return { rate: null, qualifier: null };
  return {
    rate: parseFloat(match[1]),
    qualifier: (match[2] as 'BK' | 'BIT') || null,
  };
}

const EX_AEC_LEGAL_MAP: Record<string, string> = {
  E: 'Artículo 11 (Excepción al AEC)',
  A: 'Artículo 12 (Bienes del Sector Aeronáutico)',
  DV: 'Subcapítulo II (Contingente Arancelario — Derecho Variable)',
};

export function parseExAec(raw: string): { value: string; refs: string[] } {
  const sanitized = raw.replace(/^O(?=E\b)/, '0');
  const refs: string[] = [];
  const bands = sanitized.split(',');
  for (const band of bands) {
    const b = band.trim();
    if (/[Ee]/.test(b) && !refs.includes(EX_AEC_LEGAL_MAP.E)) refs.push(EX_AEC_LEGAL_MAP.E);
    if (/[Aa]/.test(b) && !refs.includes(EX_AEC_LEGAL_MAP.A)) refs.push(EX_AEC_LEGAL_MAP.A);
    if (/±?\s*DV/i.test(b) && !refs.includes(EX_AEC_LEGAL_MAP.DV)) refs.push(EX_AEC_LEGAL_MAP.DV);
  }
  return { value: sanitized, refs };
}

export function extractScopeCodes(text: string): string[] {
  const codes: string[] = [];
  const re = /subpartida\s+(\d{4}\.\d{2}(?:\.\d{2}(?:\.\d{2})?)?)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    codes.push(m[1].replace(/\./g, ''));
  }
  return codes;
}

const SECTION_HEADER_RE = /###\s*\*{0,2}SECCI[OÓ]N\s+(X{0,2}(?:IX|IV|V?I{0,3}))\*{0,2}(?:\s+\*{0,2}(.+)\*{0,2})?/;

export function extractSectionNotes(lines: string[], index: LineIndex): RawNota[] {
  if (!index.sectionsRegion) return [];
  const notas: RawNota[] = [];
  let currentSection: string | null = null;

  for (let i = index.sectionsRegion.start; i <= index.sectionsRegion.end; i++) {
    const line = lines[i].trim();

    const secMatch = line.match(SECTION_HEADER_RE);
    if (secMatch) {
      currentSection = secMatch[1].trim();
      continue;
    }

    if (line.match(/^Notas? de Secci[oó]n/)) {
      const noteStart = i + 1;
      let noteEnd = noteStart;
      while (noteEnd <= index.sectionsRegion.end) {
        const nl = lines[noteEnd].trim();
        if (nl.match(SECTION_HEADER_RE) || nl === '') {
          noteEnd++;
          continue;
        }
        if (!nl.match(/^\d+\.\s/) && !nl.match(/^[-–]\s*\d+/) && !nl.startsWith('|')) break;
        noteEnd++;
      }
      for (let j = noteStart; j < noteEnd; j++) {
        const nl = lines[j].trim();
        const textMatch = nl.match(/^(?:\d+\.\s+)?[-–]?\s*(.+)/);
        if (textMatch) {
          notas.push({
            type: 'seccion',
            section: currentSection,
            chapter: null,
            text: textMatch[1],
            scope: null,
          });
        }
      }
    }
  }

  return notas;
}

export function extractSubpartidaLevels(code: string): RawSubpartida[] {
  const levels: RawSubpartida[] = [];
  const clean = code.replace(/\./g, '');

  const parts = [
    { display: clean.slice(0, 4), level: 4 },
    { display: `${clean.slice(0, 4)}.${clean.slice(4, 6)}`, level: 6 },
    { display: `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6, 8)}`, level: 8 },
  ];

  for (const p of parts) {
    const id = subpartidaId(p.display);
    levels.push({
      id,
      code: p.display.replace(/\./g, ''),
      display: p.display,
      description: '',
      level: p.level,
      parent: levels.length > 0 ? levels[levels.length - 1].id : null,
    });
  }

  return levels;
}
