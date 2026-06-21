import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { model } from '../../services/llm.js';
import { GraphStateType } from '../../graph/state.js';
import { VerdictReportSchema } from '../../schemas/index.js';
import type { RegimeInfo } from '../../tools/getCodeRegimes.js';

export type ClassificationLevel = {
  level: 'chapter' | 'heading' | 'subheading_sa' | 'subheading_national' | 'tariff_code';
  code: string;
  description: string;
  justification: string;
};

export type Verdict = {
  ref: string;
  date: string;
  code: string;
  description: string;
  aec: number;
  physical_unit: string;
  classification_path: ClassificationLevel[];
  legal_regimes: RegimeInfo[];
  mercological_summary: {
    product: string;
    material: string;
    function: string;
    presentation: string;
  };
  taxonomic_traceability: Array<{
    level: string;
    code: string;
    justification: string;
  }>;
  legal_basis: string[];
  observations: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SYSTEM_PROMPT = readFileSync(join(__dirname, 'prompt.md'), 'utf-8').trim();

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

const getJustification = (level: string, state: GraphStateType): string => {
  switch (level) {
    case 'capitulo':
      return state.chapterExplanation ?? '';
    case 'partida':
      return state.currentHeading?.explanation ?? '';
    case 'subpartida_sa':
      return state.currentSubheading?.explanation ?? '';
    case 'codigo_arancelario':
      return state.currentCode?.explanation ?? '';
    default:
      return '';
  }
};

const formatDate = (): string => new Date().toISOString().split('T')[0];

const buildContext = (state: GraphStateType): string => {
  const product = state.inputJson.producto;
  const sheet = state.technicalSheet;
  const tb = state.traceback;

  const sections: string[] = [];

  sections.push('=== FICHA TÉCNICA DEL PRODUCTO ===');
  sections.push(`Nombre técnico: ${sheet?.technical_name ?? product.descripcion_comercial}`);
  sections.push(`Materia constitutiva: ${sheet?.constituent_material ?? 'No especificada'}`);
  sections.push(`Función principal: ${sheet?.primary_function ?? product.uso_previsto}`);
  sections.push(`Presentación: ${sheet?.physical_presentation ?? 'No especificada'}`);
  sections.push('');

  sections.push('=== CLASIFICACIÓN ASIGNADA ===');
  sections.push(`Capítulo: ${state.chapter}`);
  sections.push(`Justificación del capítulo: ${state.chapterExplanation || '(no disponible)'}`);
  sections.push('');

  sections.push('=== AUDITORÍA LEGAL ===');
  sections.push(
    `Estado: ${state.auditStatus === 'passed' ? 'APROBADO' : state.auditStatus === 'redirected' ? 'REDIRIGIDO' : state.auditStatus}`,
  );
  const notes = state.auditNotes ?? [];
  if (notes.length > 0) {
    sections.push('Notas del capítulo:');
    notes.forEach((n) => {
      const content =
        n.content && n.content.length > 10 && n.content !== '...' ? n.content : '(contenido no disponible)';
      sections.push(`  [${n.type.toUpperCase()} - ${n.id}]: ${content.substring(0, 300)}`);
    });
  } else {
    sections.push('Notas del capítulo: (ninguna)');
  }
  sections.push('');

  sections.push('=== PARTIDA SELECCIONADA ===');
  sections.push(`Código: ${state.currentHeading?.heading ?? ''}`);
  sections.push(`Justificación RGI: ${state.currentHeading?.explanation ?? ''}`);
  sections.push('');

  sections.push('=== SUBPARTIDA SA SELECCIONADA ===');
  sections.push(`Código: ${state.currentSubheading?.subheading ?? ''}`);
  sections.push(`Justificación RGI: ${state.currentSubheading?.explanation ?? ''}`);
  sections.push('');

  sections.push('=== CÓDIGO NACIONAL SELECCIONADO ===');
  sections.push(`Código: ${state.currentCode?.code ?? ''}`);
  sections.push(`Justificación RGI: ${state.currentCode?.explanation ?? ''}`);
  sections.push('');

  const hierarchy = tb?.hierarchy ?? [];
  if (hierarchy.length > 0) {
    sections.push('=== JERARQUÍA COMPLETA (ÁRBOL DE DECISIÓN) ===');
    sections.push('Nivel | Código | Descripción | AEC');
    hierarchy.forEach((h) => {
      const desc = extractDescription(h.description).substring(0, 80);
      let aecStr = '';
      if (h.type === 'codigo_arancelario') {
        aecStr = `${h.aec_actual ?? 0}%`;
        if (h.ex_aec != null) {
          aecStr += ` (exonerado: ${h.ex_aec}%)`;
        }
      }
      sections.push(`${h.type} | ${h.code} | ${desc} | ${aecStr}`);
    });
    sections.push('');
  }

  const regimes = tb?.regimes ?? [];
  if (regimes.length > 0) {
    sections.push('=== REGÍMENES LEGALES ===');
    sections.push('Código | Descripción | Entidad');
    regimes.forEach((r) => {
      sections.push(`${r.code} | ${r.description ?? '(sin descripción)'} | ${r.entity ?? '-'}`);
    });
  } else {
    sections.push('=== REGÍMENES LEGALES ===');
    sections.push('(ninguno)');
  }

  return sections.join('\n');
};

export const verdict = async (state: GraphStateType) => {
  const code = state.currentCode;
  const tb = state.traceback;
  const hierarchy = tb?.hierarchy ?? [];
  const regimes = tb?.regimes ?? [];
  const codeNode = hierarchy.find((h) => h.type === 'codigo_arancelario');

  const classification_path: ClassificationLevel[] = hierarchy.map((h) => ({
    level: mapLevel(h.type),
    code: h.code,
    description: h.title ?? extractDescription(h.description).substring(0, 120),
    justification: getJustification(h.type, state),
  }));

  const year = new Date().getFullYear();
  const ref = `ADU-${year}-FT${state.chapter}-001`;
  const date = formatDate();

  const context = buildContext(state);

  const report = await model
    .withStructuredOutput(VerdictReportSchema, { name: 'verdict_report' })
    .invoke([new SystemMessage(SYSTEM_PROMPT), new HumanMessage(context)]);

  const verdictResult: Verdict = {
    ref,
    date,
    code: code?.code ?? '',
    description: classification_path.find((h) => h.level === 'tariff_code')?.description ?? '',
    aec: codeNode?.aec_actual ?? 0,
    physical_unit: codeNode?.physical_unit ?? '',
    classification_path,
    legal_regimes: regimes,
    mercological_summary: report.mercological_summary,
    taxonomic_traceability: report.taxonomic_traceability,
    legal_basis: report.legal_basis,
    observations: report.observations,
  };

  return { verdict: verdictResult };
};
