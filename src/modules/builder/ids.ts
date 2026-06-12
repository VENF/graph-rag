import { slugify } from './utils.js';

export function articleId(numero: number, docId?: string): string {
  const base = `ART-${String(numero).padStart(3, '0')}`;
  return docId ? `${base}-${docId}` : base;
}

export function codeId(codigo: string): string {
  return `COD-${codigo.replace(/\./g, '')}`;
}

export function chapterId(numero: string, titulo: string): string {
  const slug = slugify(titulo).slice(0, 60).replace(/-+$/, '');
  return `CAP-${numero.padStart(2, '0')}-${slug}`;
}

export function regimenId(codigo: string): string {
  return `REG-${codigo.padStart(3, '0')}`;
}

export function subpartidaId(code: string): string {
  return `SUB-${code.replace(/\./g, '')}`;
}

const OMA_TYPES = new Set(['capitulo', 'seccion', 'subpartida', 'subcapitulo']);

export function notaId(chapter: string | null, type: string, index: number, docId?: string): string {
  const prefix = chapter ? `NOTE-${chapter}` : 'NOTE-SECCION';
  if (OMA_TYPES.has(type)) {
    return `${prefix}-OMA-${index}`;
  }
  const base = `${prefix}-NAC-${index}`;
  return docId ? `${base}-${docId}` : base;
}

export function subcapituloId(chapter: string, roman: string): string {
  return `SUBCAP-${chapter}-${roman.toUpperCase()}`;
}
