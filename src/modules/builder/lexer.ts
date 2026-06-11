import type { Token } from './types.js';
export type { Token };

const ROMAN_RE = /(X{0,2}(?:IX|IV|V?I{0,3}))/;

const artHeaderRe = /\*\*Art[íi]culo\s+(\d+)[º°]?\.?\*\*/;
const tableHeaderRe = /\|\s*Código/;
const sectionHeaderRe = new RegExp(
  `^###\\s*\\*{0,2}SECCI[OÓ]N\\s+${ROMAN_RE.source}\\*{0,2}(?:\\s+\\*{0,2}(.+)\\*{0,2})?`,
  'i',
);
const chapterEntryRe = /^(?:[-–]\s*)?(\d{1,2})\.?\s+(.+)/;
const chapterInNotesRe = /^####\s*\*{0,2}CAP[IÍ]TULO\s+(\d+)\b/i;
const subcapInNotesRe = /^####\s*\*{0,2}SUBCAP[ÍI]TULO\s+(I{1,3}V?|IV|V?I{0,3})\b/i;
const noteHeaderRe = /^#{5}\s*/;
const sectionInArticleRe = new RegExp(`^###\\s*\\*{0,2}SECCI[OÓ]N\\s+${ROMAN_RE.source}\\b`, 'i');

function parseSectionTitle(lines: string[], i: number, sectionEnd: number, sectionHeaderLine: string): string {
  const inlineMatch = sectionHeaderLine.match(sectionHeaderRe);
  if (inlineMatch?.[2]?.trim()) return inlineMatch[2].trim();
  for (let j = i + 1; j <= Math.min(i + 3, sectionEnd); j++) {
    const nextLine = (lines[j] || '').trim();
    const headingMatch = nextLine.match(/^#{4}\s+\*{0,2}(.+)\*{0,2}\s*$/);
    if (headingMatch) return headingMatch[1].trim();
  }
  return '';
}

export function tokenize(lines: string[]): Token[] {
  const tokens: Token[] = [];
  let sectionsRegionRange: { start: number; end: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const artMatch = line.match(artHeaderRe);
    if (artMatch) {
      tokens.push({
        type: 'article-header',
        startLine: i,
        endLine: i,
        number: parseInt(artMatch[1], 10),
      });
      continue;
    }

    if (tableHeaderRe.test(line)) {
      const start = i;
      i += 3;
      while (i < lines.length) {
        const trimmed = lines[i].trim();
        if (trimmed === '' || trimmed.startsWith('---')) {
          i++;
          continue;
        }
        if (!lines[i].startsWith('|')) break;
        i++;
      }
      tokens.push({
        type: 'code-table',
        startLine: start,
        endLine: i - 1,
        lines: lines.slice(start, i),
      });
      continue;
    }

    if (line.trim() === '## SECCIONES Y CAPÍTULOS') {
      const start = i;
      i++;
      while (i < lines.length) {
        const nextLine = lines[i].trim();
        if (nextLine.startsWith('## ')) break;
        if (nextLine.match(/^###\s+\*{0,2}ABREVIATURAS/)) break;
        i++;
      }
      sectionsRegionRange = { start: start, end: i - 1 };
      i--; // back up — we'll re-enter to scan subtokens
      continue;
    }
  }

  if (sectionsRegionRange) {
    const regionStart = sectionsRegionRange.start;
    const regionEnd = sectionsRegionRange.end;
    const sections: Array<{ roman: string; title: string }> = [];
    const chapters: Array<{ number: string; title: string; section: string | null; sectionTitle: string | null }> = [];
    let currentSection: { roman: string; title: string } | null = null;

    for (let j = regionStart + 1; j <= regionEnd; j++) {
      const line = lines[j].trim();

      const secMatch = line.match(sectionHeaderRe);
      if (secMatch) {
        const roman = secMatch[1].trim();
        const title = parseSectionTitle(lines, j, regionEnd, line);
        currentSection = { roman, title };
        sections.push(currentSection);
        continue;
      }

      const capMatch = line.match(chapterEntryRe);
      if (capMatch && currentSection) {
        const num = parseInt(capMatch[1], 10);
        if (num >= 1 && num <= 99) {
          chapters.push({
            number: String(num).padStart(2, '0'),
            title: capMatch[2].replace(/\.$/, '').trim(),
            section: currentSection.roman,
            sectionTitle: currentSection.title,
          });
        }
      }
    }

    const regionTokenIndex = tokens.findIndex((t) => t.type === 'sections-region' && t.startLine === regionStart);
    const regionToken = {
      type: 'sections-region' as const,
      startLine: regionStart,
      endLine: regionEnd,
      sections,
      chapters,
    };
    if (regionTokenIndex >= 0) {
      tokens[regionTokenIndex] = regionToken;
    } else {
      tokens.push(regionToken);
    }
  }

  if (sectionsRegionRange) {
    let articleStart = sectionsRegionRange.end + 1;
    while (articleStart < lines.length) {
      if (lines[articleStart].trim().match(sectionInArticleRe)) break;
      articleStart++;
    }

    if (articleStart < lines.length) {
      let articleEnd = articleStart + 1;
      while (articleEnd < lines.length) {
        if (lines[articleEnd].trim().startsWith('## ')) break;
        articleEnd++;
      }
      articleEnd--;

      const subtokens: Token[] = [];
      let currentSectionRoman: string | null = null;
      let currentChapterNum: string | null = null;

      for (let j = articleStart; j <= articleEnd; j++) {
        const line = lines[j].trim();

        const secMatch = line.match(sectionInArticleRe);
        if (secMatch) {
          currentSectionRoman = secMatch[1].trim();
          currentChapterNum = null;
          subtokens.push({
            type: 'section-header',
            startLine: j,
            endLine: j,
            roman: currentSectionRoman,
            title: '',
          });
          continue;
        }

        const capMatch = line.match(chapterInNotesRe);
        if (capMatch) {
          currentChapterNum = String(parseInt(capMatch[1], 10)).padStart(2, '0');
          subtokens.push({
            type: 'chapter-header',
            startLine: j,
            endLine: j,
            number: currentChapterNum,
            title: '',
            section: currentSectionRoman,
            sectionTitle: null,
          });
          continue;
        }

        const subMatch = line.match(subcapInNotesRe);
        if (subMatch) {
          subtokens.push({
            type: 'subcapitulo-header',
            startLine: j,
            endLine: j,
            chapter: currentChapterNum || '',
            roman: subMatch[1].trim(),
            title: line
              .replace(/^#{1,5}\s*\*{0,2}/, '')
              .replace(/\*{0,2}\s*$/, '')
              .trim(),
          });
          continue;
        }

        if (!line.match(noteHeaderRe)) continue;

        const header = line
          .replace(noteHeaderRe, '')
          .replace(/\*{0,2}\s*$/, '')
          .trim();
        if (!/^Notas?\b/i.test(header)) continue;

        let ne = j + 1;
        while (ne <= articleEnd) {
          const nl = lines[ne].trim();
          if (nl.match(/^#{1,5}\s+/) || nl.startsWith('| Código') || nl.match(/^\| *Código/)) break;
          ne++;
        }

        const body = lines
          .slice(j + 1, ne)
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
          .join('\n');

        subtokens.push({
          type: 'note-block',
          startLine: j,
          endLine: ne - 1,
          level: 5,
          header,
          body,
        });
      }

      tokens.push({
        type: 'article-notes-region',
        startLine: articleStart,
        endLine: articleEnd,
        subtokens,
      });
    }
  }

  return tokens;
}
