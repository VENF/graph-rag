export type RGIRulesLevel = 'chapter' | 'heading' | 'subheading' | 'code';

const RGI_RULES: Record<RGIRulesLevel, string> = {
  chapter: `
## REGLAS GENERALES INTERPRETATIVAS
Evalúa las 6 Reglas Generales Interpretativas contra el producto y aplica ÚNICAMENTE las relevantes:

1. Regla General Interpretativa 1 — Texto de los Capítulos y Notas de Sección/Capítulo (SIEMPRE aplica).
2a. Regla General Interpretativa 2a — Productos incompletos o sin terminar (EVALUAR).
2b. Regla General Interpretativa 2b — Mezclas, combinaciones (EVALUAR).
3a. Regla General Interpretativa 3a — Capítulo más específico (SI hay conflicto entre 2+ capítulos).
3b. Regla General Interpretativa 3b — Carácter esencial (SI no hay específico).
3c. Regla General Interpretativa 3c — Último por orden (SI no aplica a/b).
4. Regla General Interpretativa 4 — Residual (RARO, solo si ninguna otra aplica).
5. Regla General Interpretativa 5 — Envases y estuches (EVALUAR).
6. Regla General Interpretativa 6 — Subniveles (referencia, se aplica en etapas posteriores).`,

  heading: `
## REGLAS GENERALES INTERPRETATIVAS
Evalúa las 6 Reglas Generales Interpretativas contra el producto y aplica ÚNICAMENTE las relevantes a nivel de partida (4 dígitos):

1. Regla General Interpretativa 1 — Texto de las partidas y Notas de Sección/Capítulo (SIEMPRE aplica).
2a. Regla General Interpretativa 2a — Productos incompletos o sin terminar (EVALUAR).
2b. Regla General Interpretativa 2b — Mezclas, combinaciones, juegos (EVALUAR).
3a. Regla General Interpretativa 3a — Partida más específica (SI hay conflicto entre 2+ partidas).
3b. Regla General Interpretativa 3b — Carácter esencial (SI no hay partida específica).
3c. Regla General Interpretativa 3c — Última partida por orden (SI no aplica a/b).
4. Regla General Interpretativa 4 — Residual (RARO).
5. Regla General Interpretativa 5 — Envases y estuches (EVALUAR si el producto los incluye).
6. Regla General Interpretativa 6 — La comparación es exclusivamente a nivel de 4 dígitos. No consideres subdivisiones de menor nivel en esta etapa.`,

  subheading: `
## REGLAS GENERALES INTERPRETATIVAS
Evalúa las 6 Reglas Generales Interpretativas contra el producto y aplica ÚNICAMENTE las relevantes a nivel de subpartida SA (6 dígitos):

1. Regla General Interpretativa 1 + Regla General Interpretativa 6 — La clasificación se determina por los textos de las subpartidas y de las Notas de Subpartida (SIEMPRE aplica).
2a. Regla General Interpretativa 2a — Productos incompletos o sin terminar (EVALUAR).
2b. Regla General Interpretativa 2b — Mezclas, combinaciones, juegos (EVALUAR).
3a. Regla General Interpretativa 3a — Subpartida más específica (SI hay conflicto entre 2+ subpartidas).
3b. Regla General Interpretativa 3b — Carácter esencial (SI no hay subpartida específica).
3c. Regla General Interpretativa 3c — Última subpartida por orden (SI no aplica a/b).
4. Regla General Interpretativa 4 — Residual (RARO).
5. Regla General Interpretativa 5 — Envases y estuches (EVALUAR si el producto los incluye).
6. Regla General Interpretativa 6 — La comparación es exclusivamente a nivel de 6 dígitos. No consideres subdivisiones de menor nivel.`,

  code: `
## REGLAS GENERALES INTERPRETATIVAS
Evalúa las 6 Reglas Generales Interpretativas contra el producto y aplica ÚNICAMENTE las relevantes a nivel de código nacional (10+ dígitos):

1. Regla General Interpretativa 1 + Regla General Interpretativa 6 — La clasificación se determina por los textos de los códigos nacionales y las notas aplicables (SIEMPRE aplica).
2a. Regla General Interpretativa 2a — Productos incompletos o sin terminar (EVALUAR).
2b. Regla General Interpretativa 2b — Mezclas, combinaciones, juegos (EVALUAR).
3a. Regla General Interpretativa 3a — Código con descripción más específica (SI hay conflicto).
3b. Regla General Interpretativa 3b — Carácter esencial (SI no hay código específico).
3c. Regla General Interpretativa 3c — Último código por orden (SI no aplica a/b).
4. Regla General Interpretativa 4 — Residual (RARO).
5. Regla General Interpretativa 5 — Envases y estuches (EVALUAR).
6. Regla General Interpretativa 6 — Subniveles (mutatis mutandis, las Reglas 1-5 aplican a este nivel).`,
};

export const getRGIRules = (level: RGIRulesLevel): string => RGI_RULES[level];
