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
  return `cap-${numero.padStart(2, '0')}-${slugify(titulo)}`
}

export function regimenId(codigo: string): string {
  return `reg-${codigo.padStart(3, '0')}`
}
