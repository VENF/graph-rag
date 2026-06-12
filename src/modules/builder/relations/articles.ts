import type { Nodo, Relacion, ParsedFile } from '../types.js';
import { articleId, regimenId, codeId } from '../ids.js';

const ARTICLES_WITH_PROHIBITION = [25, 27, 28, 29, 30, 31, 32, 33] as const;

function art25to33HasProhibition(num: number): boolean {
  return (ARTICLES_WITH_PROHIBITION as readonly number[]).includes(num);
}

export function buildArticleCrossReferences(file: ParsedFile, nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = [];
  const docId = file.document?.id;

  for (const art of file.articles) {
    const artId = articleId(art.number, docId);
    if (!nodos.has(artId)) continue;

    for (const refNum of art.references) {
      const refId = articleId(refNum, docId);
      if (nodos.has(refId)) {
        relaciones.push({ type: 'refiere_a', origin: artId, target: refId });
      }
    }
  }

  return relaciones;
}

export function buildArticle21Relations(file: ParsedFile, nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = [];
  const docId = file.document?.id;
  const art21 = file.articles.find((a) => a.number === 21);
  if (!art21) return relaciones;

  const art21Id = articleId(21, docId);
  if (!nodos.has(art21Id)) return relaciones;

  for (let i = 1; i <= 21; i++) {
    const regId = regimenId(String(i));
    if (nodos.has(regId)) {
      relaciones.push({ type: 'regula', origin: art21Id, target: regId });
    }
  }

  for (const cod of file.codes) {
    const allRegimes = [...cod.import_regime, ...cod.export_regime];
    const codId = codeId(cod.code);
    if (nodos.has(codId) && allRegimes.length > 0) {
      relaciones.push({ type: 'regula', origin: art21Id, target: codId });
    }
  }

  return relaciones;
}

export function buildArticles22to36Relations(file: ParsedFile, nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = [];
  const docId = file.document?.id;

  for (const art of file.articles) {
    if (art.number < 22 || art.number > 36) continue;
    const artId = articleId(art.number, docId);
    if (!nodos.has(artId)) continue;

    const mentionedRegimes = [...art.content.matchAll(/\b(?:Régimen\s+Legal\s+)?codificado[s]?\s+(\d+)/gi)].map(
      (m) => m[1],
    );
    const mentionedNumbers = [...art.content.matchAll(/\b(\d+)\s*[.)]/g)]
      .map((m) => m[1])
      .filter((n) => parseInt(n) >= 1 && parseInt(n) <= 21);

    const allMentioned = [...new Set([...mentionedRegimes, ...mentionedNumbers])];
    for (const regCode of allMentioned) {
      const regId = regimenId(regCode);
      if (nodos.has(regId)) {
        relaciones.push({ type: 'regula', origin: artId, target: regId });
      }
    }

    if (art25to33HasProhibition(art.number)) {
      const reg1Id = regimenId('1');
      if (nodos.has(reg1Id)) {
        relaciones.push({ type: 'regula', origin: artId, target: reg1Id });
      }
    }
  }

  return relaciones;
}

export function buildArticle37Relations(docId: string | undefined, nodos: Map<string, Nodo>): Relacion[] {
  const relaciones: Relacion[] = [];
  const art37Id = articleId(37, docId);
  if (!nodos.has(art37Id)) return relaciones;

  relaciones.push({ type: 'refiere_a', origin: art37Id, target: articleId(3, docId) });
  relaciones.push({ type: 'refiere_a', origin: art37Id, target: articleId(8, docId) });
  relaciones.push({ type: 'refiere_a', origin: art37Id, target: articleId(11, docId) });
  relaciones.push({ type: 'refiere_a', origin: art37Id, target: articleId(21, docId) });

  return relaciones;
}
