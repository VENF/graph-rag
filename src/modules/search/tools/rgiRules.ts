export type RGIRulesLevel = 'chapter' | 'heading' | 'subheading' | 'code';

const RGI_RULES: Record<RGIRulesLevel, string> = {
  chapter: `
## REGLAS GENERALES INTERPRETATIVAS (RGI)
Evalúa las 6 RGI contra el producto y aplica ÚNICAMENTE las relevantes:

1. RGI 1 — Texto de los Capítulos y Notas de Sección/Capítulo (SIEMPRE aplica).
2a. RGI 2a — Productos incompletos o sin terminar (EVALUAR).
2b. RGI 2b — Mezclas, combinaciones (EVALUAR).
3a. RGI 3a — Capítulo más específico (SI hay conflicto entre 2+ capítulos).
3b. RGI 3b — Carácter esencial (SI no hay específico).
3c. RGI 3c — Último por orden (SI no aplica a/b).
4. RGI 4 — Residual (RARO, solo si ninguna otra aplica).
5. RGI 5 — Envases y estuches (EVALUAR).
6. RGI 6 — Subniveles (referencia, se aplica en etapas posteriores).`,

  heading: `
## REGLAS GENERALES INTERPRETATIVAS (RGI)
Evalúa las 6 RGI contra el producto y aplica ÚNICAMENTE las relevantes a nivel de partida (4 dígitos):

1. RGI 1 — Texto de las partidas y Notas de Sección/Capítulo (SIEMPRE aplica).
2a. RGI 2a — Productos incompletos o sin terminar (EVALUAR).
2b. RGI 2b — Mezclas, combinaciones, juegos (EVALUAR).
3a. RGI 3a — Partida más específica (SI hay conflicto entre 2+ partidas).
3b. RGI 3b — Carácter esencial (SI no hay partida específica).
3c. RGI 3c — Última partida por orden (SI no aplica a/b).
4. RGI 4 — Residual (RARO).
5. RGI 5 — Envases y estuches (EVALUAR si el producto los incluye).
6. RGI 6 — La comparación es exclusivamente a nivel de 4 dígitos. No consideres subdivisiones de menor nivel en esta etapa.`,

  subheading: `
## REGLAS GENERALES INTERPRETATIVAS (RGI)
Evalúa las 6 RGI contra el producto y aplica ÚNICAMENTE las relevantes a nivel de subpartida SA (6 dígitos):

1. RGI 1 + RGI 6 — La clasificación se determina por los textos de las subpartidas y de las Notas de Subpartida (SIEMPRE aplica).
2a. RGI 2a — Productos incompletos o sin terminar (EVALUAR).
2b. RGI 2b — Mezclas, combinaciones, juegos (EVALUAR).
3a. RGI 3a — Subpartida más específica (SI hay conflicto entre 2+ subpartidas).
3b. RGI 3b — Carácter esencial (SI no hay subpartida específica).
3c. RGI 3c — Última subpartida por orden (SI no aplica a/b).
4. RGI 4 — Residual (RARO).
5. RGI 5 — Envases y estuches (EVALUAR si el producto los incluye).
6. RGI 6 — La comparación es exclusivamente a nivel de 6 dígitos. No consideres subdivisiones de menor nivel.`,

  code: `
## REGLAS GENERALES INTERPRETATIVAS (RGI)
Evalúa las 6 RGI contra el producto y aplica ÚNICAMENTE las relevantes a nivel de código nacional (10+ dígitos):

1. RGI 1 + RGI 6 — La clasificación se determina por los textos de los códigos nacionales y las notas aplicables (SIEMPRE aplica).
2a. RGI 2a — Productos incompletos o sin terminar (EVALUAR).
2b. RGI 2b — Mezclas, combinaciones, juegos (EVALUAR).
3a. RGI 3a — Código con descripción más específica (SI hay conflicto).
3b. RGI 3b — Carácter esencial (SI no hay código específico).
3c. RGI 3c — Último código por orden (SI no aplica a/b).
4. RGI 4 — Residual (RARO).
5. RGI 5 — Envases y estuches (EVALUAR).
6. RGI 6 — Subniveles (mutatis mutandis, las RGI 1-5 aplican a este nivel).`,
};

export const getRGIRules = (level: RGIRulesLevel): string => RGI_RULES[level];
