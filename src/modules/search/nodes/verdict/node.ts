import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { model } from '../../services/llm.js';
import { GraphStateType } from '../../graph/state.js';
import { VerdictJustificationSchema } from '../../schemas/index.js';

export type ClassificationLevel = {
  level: 'chapter' | 'heading' | 'subheading_sa' | 'subheading_national' | 'tariff_code';
  code: string;
  description: string;
  justification: string;
};

export type Verdict = {
  code: string;
  description: string;
  date: string;
  aec: number;
  physical_unit: string;
  operation_type: string;
  destination_country: string;
  classification_path: ClassificationLevel[];
  justification: string;
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
    case 'subpartida_nacional':
      return '';
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

  const sections: string[] = [];

  sections.push('=== FICHA TÉCNICA DEL PRODUCTO ===');
  sections.push(`Nombre técnico: ${sheet?.technical_name ?? product.descripcion_comercial}`);
  sections.push(`Materia constitutiva: ${sheet?.constituent_material ?? 'No especificada'}`);
  sections.push(`Función principal: ${sheet?.primary_function ?? product.uso_previsto}`);
  sections.push(`Presentación: ${sheet?.physical_presentation ?? 'No especificada'}`);
  if (sheet?.critical_specifications && Object.keys(sheet.critical_specifications).length > 0) {
    sections.push(`Especificaciones críticas: ${JSON.stringify(sheet.critical_specifications)}`);
  }
  sections.push('');

  sections.push('=== CLASIFICACIÓN ASIGNADA ===');
  sections.push(`Capítulo: ${state.chapter}`);
  sections.push(`Justificación del capítulo: ${state.chapterExplanation || '(no disponible)'}`);
  sections.push('');

  const notes = state.auditNotes ?? [];
  if (notes.length > 0) {
    sections.push('=== NOTAS LEGALES DEL CAPÍTULO ===');
    notes.forEach((n) => {
      const content =
        n.content && n.content.length > 10 && n.content !== '...' ? n.content : '(contenido no disponible)';
      sections.push(`  [${n.type.toUpperCase()} - ${n.id}]: ${content.substring(0, 300)}`);
    });
    sections.push('');
  }

  sections.push('=== PARTIDA SELECCIONADA ===');
  sections.push(`Código: ${state.currentHeading?.heading ?? ''}`);
  sections.push(`Justificación: ${state.currentHeading?.explanation ?? ''}`);
  sections.push('');

  sections.push('=== SUBPARTIDA SA SELECCIONADA ===');
  sections.push(`Código: ${state.currentSubheading?.subheading ?? ''}`);
  sections.push(`Justificación: ${state.currentSubheading?.explanation ?? ''}`);
  sections.push('');

  sections.push('=== CÓDIGO NACIONAL SELECCIONADO ===');
  sections.push(`Código: ${state.currentCode?.code ?? ''}`);
  sections.push(`Justificación: ${state.currentCode?.explanation ?? ''}`);
  sections.push('');

  const headings = state.headings ?? [];
  if (headings.length > 0) {
    sections.push('=== PARTIDAS DISPONIBLES (ALTERNATIVAS) ===');
    headings.forEach((h) => {
      sections.push(`${h.code} | ${h.content?.substring(0, 100) ?? h.display}`);
    });
    sections.push('');
  }

  const subheadings = state.subheadings ?? [];
  if (subheadings.length > 0) {
    sections.push('=== SUBPARTIDAS DISPONIBLES (ALTERNATIVAS) ===');
    subheadings.forEach((s) => {
      sections.push(`${s.code} | ${s.content?.substring(0, 100) ?? s.display}`);
    });
    sections.push('');
  }

  const codes = state.nationalCodes ?? [];
  if (codes.length > 0) {
    sections.push('=== CÓDIGOS NACIONALES DISPONIBLES (ALTERNATIVAS) ===');
    codes.forEach((c) => {
      sections.push(`${c.code} | ${c.description?.substring(0, 100)} | AEC: ${c.aec_actual}%`);
    });
    sections.push('');
  }

  const tb = state.traceback;
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

  const date = formatDate();

  const context = buildContext(state);

  const report = await model
    .withStructuredOutput(VerdictJustificationSchema, { name: 'verdict_justification' })
    .invoke([new SystemMessage(SYSTEM_PROMPT), new HumanMessage(context)]);

  const verdictResult: Verdict = {
    code: code?.code ?? '',
    description: classification_path.find((h) => h.level === 'tariff_code')?.description ?? '',
    date,
    aec: codeNode?.aec_actual ?? 0,
    physical_unit: codeNode?.physical_unit ?? '',
    operation_type: state.operationType,
    destination_country: state.destinationCountry,
    classification_path,
    justification: report.justification,
  };

  return { verdict: verdictResult };
};
