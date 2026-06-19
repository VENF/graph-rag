import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { model } from '../../services/llm.js';
import { GraphStateType } from '../../graph/state.js';
import { getSections, type Section } from '../../tools/getSections.js';

const formatSections = (sections: Section[]): string =>
  sections
    .map(
      (s) =>
        `Sección ${s.section}: ${s.section_title}\n${s.chapters.map((c) => `  Cap. ${c.chapter}: ${c.title}`).join('\n')}`,
    )
    .join('\n');

const sysPrompt = (sectionsText: string) => `
  Role: Eres un clasificador aduanero experto.
  Funcion: Tu única tarea es determinar el capítulo del Sistema Armonizado al que pertenece un producto.
  A continuación están las 21 secciones con sus capítulos:
  ${sectionsText}
  Responde ÚNICAMENTE con el número de capítulo de dos dígitos
`;

export const chapterClasification = async (state: GraphStateType) => {
  const sheet = state.technicalSheet;
  const product = state.inputJson.producto;
  const sections = await getSections();
  const response = await model.invoke([
    new SystemMessage(sysPrompt(formatSections(sections))),
    new HumanMessage(
      `Nombre técnico: "${sheet?.technical_name ?? product.descripcion_comercial}"
       Materia constitutiva: "${sheet?.constituent_material ?? 'No especificada'}"
       Función principal: "${sheet?.primary_function ?? product.uso_previsto}"
       Presentación: "${sheet?.physical_presentation ?? 'No especificada'}"
       ¿A qué capítulo del SA pertenece?`,
    ),
  ]);
  const chapterNum = (response.content as string).trim();
  return {
    chapter: parseInt(chapterNum, 10) || 0,
  };
};
