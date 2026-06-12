import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { parseFrontmatter } from '../src/modules/builder/parser/frontmatter.js';

const GAZETTE_RE = /N[º°]\s*([\d.]+)\s*(Extraordinario)?/;
const DATE_RE = /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/;

const MES_MAP: Record<string, string> = {
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

function extractDate(content: string): string {
  const m = content.match(DATE_RE);
  if (!m) return '';
  const mes = MES_MAP[m[2].toLowerCase()] || '00';
  return `${m[3]}-${mes}-${m[1].padStart(2, '0')}`;
}

function extractGazetteNumber(content: string): string {
  const m = content.match(GAZETTE_RE);
  return m ? m[1].replace(/\./g, '') : '';
}

function inferAmendment(documentId: string): string {
  const m = documentId.match(/HS(\d+)/i);
  return m ? `HS${m[1]}` : 'HS7';
}

function generateFrontmatter(content: string, filename: string): string {
  const docId = path.basename(filename, '.md');
  const amendment = inferAmendment(docId);
  const date = extractDate(content);
  const gazette = extractGazetteNumber(content);

  const fm = { documentId: docId, type: 'MATRIZ', amendment, gazette, date };
  return `---\n${yaml.dump(fm).trim()}\n---\n`;
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Uso: npx tsx scripts/migrate-frontmatter.ts <archivo.md> [archivo.md ...]');
    process.exit(1);
  }

  for (const filePath of args) {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      console.error(`Error: archivo no encontrado: ${resolved}`);
      continue;
    }

    const content = fs.readFileSync(resolved, 'utf-8');

    if (parseFrontmatter(content)) {
      console.log(`  OK (ya tiene frontmatter): ${path.basename(resolved)}`);
      continue;
    }

    const frontmatter = generateFrontmatter(content, resolved);
    const newContent = frontmatter + content;

    fs.writeFileSync(resolved, newContent, 'utf-8');
    console.log(`  ✓ Migrado: ${path.basename(resolved)}`);
  }
}

main();
