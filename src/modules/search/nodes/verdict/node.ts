import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { model } from '../../services/llm.js';
import { GraphStateType } from '../../graph/state.js';
import { QuickVerdictSchema, VerdictJustificationSchema } from '../../schemas/index.js';
import type { SemanticCandidate } from '../candidate-search/node.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SYSTEM_PROMPT = readFileSync(join(__dirname, 'prompt.md'), 'utf-8').trim();

export type ClassificationLevel = {
  level: 'chapter' | 'heading' | 'subheading_sa' | 'subheading_national' | 'tariff_code';
  code: string;
  description: string;
  justification: string;
};

export type Verdict = {
  code: string;
  description: string;
  score: number;
  date: string;
  aec: number;
  physical_unit: string;
  operation_type: string;
  destination_country: string;
  classification_path: ClassificationLevel[];
  justification: string;
};

const mapLevel = (type: string): 'chapter' | 'heading' | 'subheading_sa' | 'subheading_national' | 'tariff_code' => {
  const map: Record<string, 'chapter' | 'heading' | 'subheading_sa' | 'subheading_national' | 'tariff_code'> = {
    capitulo: 'chapter',
    partida: 'heading',
    subpartida_sa: 'subheading_sa',
    subpartida_nacional: 'subheading_national',
    codigo_arancelario: 'tariff_code',
  };
  return map[type] ?? 'tariff_code';
};

const extractDescription = (content: string): string =>
  content
    .replace(/^###.*\n/, '')
    .replace(/\*\*Nivel:.*?\*\*/, '')
    .replace(/\n{2,}/g, ' ')
    .trim();

const buildClassificationPath = (
  selected: SemanticCandidate,
  levelJustifications?: Array<{ code: string; justification: string }>,
): ClassificationLevel[] =>
  selected.hierarchy.map((h) => ({
    level: mapLevel(h.type),
    code: h.code,
    description: h.title ?? extractDescription(h.description).substring(0, 120),
    justification: levelJustifications?.find((lj) => lj.code === h.code)?.justification ?? '',
  }));

const formatDate = (): string => new Date().toISOString().split('T')[0];

const formatCandidate = (c: SemanticCandidate, idx: number): string => {
  const lines: string[] = [];
  lines.push(`[CANDIDATO ${idx + 1}] Código: ${c.code} (score: ${(c.score * 100).toFixed(1)}%)`);
  lines.push(`  Descripción: ${c.description || '(sin descripción)'}`);
  lines.push(`  Capítulo SA: ${c.sa_chapter}`);
  lines.push(`  AEC: ${c.aec_actual}% | Unidad: ${c.physical_unit}`);

  if (c.hierarchy.length > 0) {
    lines.push('  Jerarquía:');
    c.hierarchy.forEach((h) => {
      const desc = extractDescription(h.description).substring(0, 100);
      lines.push(`    ${h.type}: ${h.code} — ${desc}`);
    });
  }

  if (c.regimes.length > 0) {
    lines.push('  Regímenes legales:');
    c.regimes.forEach((r) => {
      lines.push(`    ${r.code} — ${r.description ?? '(sin descripción)'} (${r.entity ?? '-'})`);
    });
  }

  const notes = c.chapterNotes ?? [];
  if (notes.length > 0) {
    lines.push('  Notas legales del capítulo:');
    notes.forEach((n) => {
      const content = n.content && n.content.length > 10 ? n.content.substring(0, 200) : '(contenido no disponible)';
      lines.push(`    [${n.type.toUpperCase()} — ${n.id}]: ${content}`);
    });
  }

  return lines.join('\n');
};

const buildContext = (state: GraphStateType): string => {
  const sheet = state.technicalSheet;
  const product = state.inputJson.producto;
  const sections: string[] = [];

  sections.push('=== FICHA TÉCNICA DEL PRODUCTO ===');
  sections.push(`Nombre técnico: ${sheet?.technical_name ?? product.descripcion_comercial}`);
  sections.push(`Materia constitutiva: ${sheet?.constituent_material ?? 'No especificada'}`);
  sections.push(`Función principal: ${sheet?.primary_function ?? product.uso_previsto}`);
  sections.push(`Presentación: ${sheet?.physical_presentation ?? 'No especificada'}`);
  if (sheet?.critical_specifications && Object.keys(sheet.critical_specifications).length > 0) {
    sections.push(`Especificaciones críticas: ${JSON.stringify(sheet.critical_specifications)}`);
  }
  sections.push(`Tipo de operación: ${state.operationType}`);
  sections.push(`País destino: ${state.destinationCountry}`);
  sections.push('');

  sections.push('=== CANDIDATOS DISPONIBLES ===');
  const candidates = state.candidates ?? [];
  candidates.forEach((c, i) => sections.push(formatCandidate(c, i)));

  return sections.join('\n');
};

export const verdict = async (state: GraphStateType) => {
  const candidates = state.candidates ?? [];
  const searchAttempt = state.searchAttempt ?? 0;

  if (candidates.length === 0) {
    return {};
  }

  const context = buildContext(state);

  if (searchAttempt >= 2) {
    const { justification, levelJustifications } = await model
      .withStructuredOutput(VerdictJustificationSchema, { name: 'verdict_justification' })
      .invoke([new SystemMessage(SYSTEM_PROMPT), new HumanMessage(context)]);

    const top = candidates[0];
    const classificationPath = buildClassificationPath(top, levelJustifications);

    return {
      verdict: {
        code: top.code,
        description: top.description,
        score: top.score,
        date: formatDate(),
        aec: top.aec_actual,
        physical_unit: top.physical_unit,
        operation_type: state.operationType,
        destination_country: state.destinationCountry,
        classification_path: classificationPath,
        justification,
      } satisfies Verdict,
    };
  }

  const decision = await model
    .withStructuredOutput(QuickVerdictSchema, { name: 'quick_verdict' })
    .invoke([new SystemMessage(SYSTEM_PROMPT), new HumanMessage(context)]);

  if (decision.status === 'redirect') {
    return {};
  }

  const selected = candidates.find((c) => c.code === decision.selectedCode) ?? candidates[0];
  const classificationPath = buildClassificationPath(selected, decision.levelJustifications);

  return {
    verdict: {
      code: selected.code,
      description: selected.description,
      score: selected.score,
      date: formatDate(),
      aec: selected.aec_actual,
      physical_unit: selected.physical_unit,
      operation_type: state.operationType,
      destination_country: state.destinationCountry,
      classification_path: classificationPath,
      justification: decision.justification ?? '',
    } satisfies Verdict,
  };
};
