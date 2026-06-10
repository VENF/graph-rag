import { slugify } from './utils.js'

export function documentId(numero: string): string {
  return `doc-gaceta-${numero.replace(/\./g, '')}`
}

export function articleId(numero: number): string {
  return `art-${String(numero).padStart(3, '0')}`
}

export function codeId(codigo: string): string {
  return `cod-${codigo.replace(/\./g, '')}`
}

export function chapterId(numero: string, titulo: string): string {
  const slug = slugify(titulo).slice(0, 60).replace(/-+$/, '')
  return `cap-${numero.padStart(2, '0')}-${slug}`
}

export function regimenId(codigo: string): string {
  return `reg-${codigo.padStart(3, '0')}`
}

export function subpartidaId(code: string): string {
  return `sub-${code.replace(/\./g, '')}`
}

export function notaId(chapter: string | null, type: string, index: number): string {
  const prefix = chapter ? `nota-${chapter}` : 'nota-seccion'
  return `${prefix}-${type}-${index}`
}

export function subcapituloId(chapter: string, roman: string): string {
  return `subcap-${chapter}-${roman.toLowerCase()}`
}
