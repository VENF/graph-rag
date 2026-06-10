# Estructura del Grafo de Conocimiento Legal

## Visión General

El grafo de conocimiento se implementa como una colección de archivos Markdown interconectados mediante `[[wikilinks]]` (formato compatible con Obsidian, Foam, y cualquier herramienta que soporte links entre archivos Markdown).

Cada **nodo** es un archivo `.md` individual. Cada **relación** es un link entre nodos.

```
knowledge-graph/
├── _index.md              # Hub central (mapa del grafo)
├── _schema.md             # Schema y documentación técnica
├── 00-documento/          # Documentos fuente
│   └── doc-gaceta-6804.md
├── 01-capitulos/          # Capítulos del Sistema Armonizado (98)
│   ├── cap-01-animales-vivos.md
│   └── ...
├── 02-articulos/          # Artículos legales (41)
│   ├── art-001.md
│   └── ...
├── 03-codigos/            # Códigos arancelarios 10 dígitos (11.811)
│   ├── cod-0101210010.md
│   └── ...
├── 04-regimenes/          # Regímenes legales (21)
│   ├── reg-001.md
│   └── ...
├── 05-subpartidas/        # Subpartidas SA 4d/6d/8d (17.368)
│   ├── sub-0101.md        # Partida (4 dígitos)
│   ├── sub-010121.md      # Subpartida (6 dígitos)
│   ├── sub-01012100.md    # Subpartida (8 dígitos)
│   └── ...
├── 06-notas-legales/      # Notas legales (243)
│   ├── nota-01-capitulo-0.md
│   └── ...
└── 07-subcapitulos/       # Subcapítulos (4)
    ├── subcap-98-i.md
    └── ...
```

---

## Tipos de Nodo

### `documento` → `00-documento/`

Documento fuente del cual se extrajo la información (Gaceta Oficial, Decreto, Ley).

**Frontmatter:**
```yaml
id: doc-gaceta-6804
type: documento
title: Gaceta Oficial de la República Bolivariana de Venezuela
number: 6.804
gazette_type: Extraordinario
date: 2024-04-25
decree: 4.944
issuer: Presidencia de la República
```

**Relaciones salientes:** `contiene → articulo`, `contiene → codigo`, `contiene → capitulo`

---

### `articulo` → `02-articulos/`

Cada artículo legal del decreto/ley. Extraído mediante el patrón `**Artículo Nº.**`.

**Frontmatter:**
```yaml
id: art-003
type: articulo
number: 3
legal_chapter: I
references: [37, 8, 9, 11, 12, 21]
source: doc-gaceta-6804
```

**Relaciones salientes:**
- `es_parte_de → documento` (pertenece al documento fuente)
- `refiere_a → articulo` (referencias a otros artículos)
- `regula → regimen-legal` (artículo define/excepciona regímenes)
- `regula → codigo` (artículo aplica a códigos arancelarios)

---

### `subpartida` → `05-subpartidas/`

Nodo intermedio en la jerarquía del Sistema Armonizado: partida (4 dígitos), subpartida (6 dígitos), o subpartida regional (8 dígitos). Generado automáticamente a partir de cada código de 10 dígitos. Hasta 3 niveles por código, compartidos entre códigos del mismo grupo.

**Frontmatter:**
```yaml
id: sub-01012100
type: subpartida
code: '01012100'
display: 0101.21.00
level: 8
parent: sub-010121
```

**Relaciones salientes:**
- `es_parte_de → subpartida` (nivel inferior → nivel superior)
- `es_parte_de → capitulo` (nivel 4 dígitos → capítulo SA)

**Relaciones entrantes:**
- `es_parte_de ← codigo` (código 10d → subpartida 8d)

---

### `codigo-arancelario` → `03-codigos/`

Código SA de 10 dígitos (subpartida nacional). Corresponde a la hoja de la tabla arancelaria.

**Frontmatter:**
```yaml
id: cod-0101210010
type: codigo-arancelario
code: 0101.21.00.10
description: Para carreras
sa_chapter: '01'
aec:
  rate: 0
  qualifier: null
ex_aec: null
ex_aec_legal_refs: []
physical_unit: u
import_regime:
  - '5'
  - '6'
export_regime: []
source_document: doc-gaceta-6804
history:
  - document: doc-gaceta-6804
    date: '2024-04-25'
    type: creación
```

**Relaciones salientes:**
- `es_parte_de → documento` (se originó en este documento)
- `pertenece_a → capitulo` (pertenece a un capítulo SA)
- `requiere → regimen-legal` (requiere ciertos permisos/licencias)
- `sujeto_a → articulo` (sujeto a excepción legal del artículo, si aplica)

---

### `capitulo` → `01-capitulos/`

Capítulo del Sistema Armonizado (SA). Nodo padre de los códigos arancelarios.

**Frontmatter:**
```yaml
id: cap-01-animales-vivos
type: capitulo
number: '01'
title: Animales vivos
section: I
section_title: Animales vivos y productos del reino animal
notes:
  - type: capitulo
    text: |
      Este Capítulo comprende todos los animales vivos, excepto:
      - los peces, crustáceos...
  - type: complementaria
    text: |
      Las expresiones "pelajes"...
```

**Relaciones entrantes:** `pertenece_a ← codigo`, `aclara ← nota-legal`, `es_parte_de ← subpartida(4d)`

---

### `regimen-legal` → `04-regimenes/`

Cada régimen legal codificado (permiso, licencia, restricción, prohibición). Definidos en el Artículo 21 del Decreto. El régimen 9 (`is_comex_permit`) está marcado como permiso COMEX para validaciones cruzadas de exoneraciones.

**Frontmatter:**
```yaml
id: reg-005
type: regimen-legal
code: 5
description: Certificado Sanitario del País de Origen
entity: MAT (Ministerio de Agricultura y Tierras)
```

**Relaciones entrantes:** `requiere ← codigo`, `regula ← articulo`

---

### `nota-legal` → `06-notas-legales/`

Cada nota legal de sección, capítulo, subcapítulo, subpartida o complementaria extraída del artículo 37. Antes embebidas como metadatos de capítulo, ahora son nodos independientes con relación `aclara` hacia su capítulo.

**Frontmatter:**
```yaml
id: nota-01-capitulo-0
type: nota-legal
nota_type: capitulo
section: I
chapter: '01'
```

**Relaciones salientes:** `aclara → capitulo` (nota aclara el capítulo al que pertenece)
**Relaciones salientes (si aplica):** `modifica_criterio → subpartida/codigo` (nota de subpartida con scope)

---

### `subcapitulo` → `07-subcapitulos/`

Subcapítulos del Sistema Armonizado dentro de un capítulo SA. Actualmente limitado al Capítulo 98 (Subcapítulos I–IV), que definen regímenes especiales de ensamblaje automotriz e industrial.

**Frontmatter:**
```yaml
id: subcap-98-i
type: subcapitulo
chapter: '98'
roman: I
title: SUBCAPÍTULO I PARTES, PIEZAS Y COMPONENTES PARA EL ENSAMBLAJE DE VEHÍCULOS AUTOMOTORES...
notes:
  - type: subcapitulo
    text: |
      - El Subcapítulo I tiene por objeto...
```

**Relaciones salientes:** `subdivide → capitulo` (subcapítulo subdivide al capítulo SA)

---

## Modelo de Relaciones

### Visu del Grafo

```
DOCUMENTO ──contiene──▶ ARTÍCULO ──refiere_a──▶ ARTÍCULO
DOCUMENTO ──contiene──▶ CAPÍTULO ◀──es_parte_de── SUBPARTIDA(4d)
DOCUMENTO ──contiene──▶ SUBPARTIDA(4d) ──es_parte_de──▶ SUBPARTIDA(6d) ──es_parte_de──▶ SUBPARTIDA(8d)
DOCUMENTO ──contiene──▶ CÓDIGO ──es_parte_de──▶ SUBPARTIDA(8d)
DOCUMENTO ──contiene──▶ CÓDIGO ──pertenece_a──▶ CAPÍTULO
CÓDIGO ──requiere────▶ RÉGIMEN
CÓDIGO ──sujeto_a────▶ ARTÍCULO (11/12)
ARTÍCULO ──regula────▶ RÉGIMEN
ARTÍCULO ──regula────▶ CÓDIGO
NOTA_LEGAL ──aclara──▶ CAPÍTULO
NOTA_LEGAL ──modifica_criterio──▶ SUBPARTIDA / CÓDIGO
SUBCAPÍTULO ──subdivide──▶ CAPÍTULO
```

### Relaciones disponibles

| Tipo | Desde | Hacia | Descripción |
|------|-------|-------|-------------|
| `contiene` | documento | articulo, capitulo, codigo, subpartida | El documento contiene estos elementos |
| `es_parte_de` | articulo, capitulo, codigo, subpartida | documento | Pertenece al documento fuente |
| `es_parte_de` | subpartida (nivel inferior) | subpartida (nivel superior) | Jerarquía de subpartidas (8d → 6d → 4d) |
| `es_parte_de` | subpartida 4d | capitulo | Partida pertenece a capítulo SA |
| `es_parte_de` | codigo | subpartida 8d | Código pertenece a subpartida padre |
| `pertenece_a` | codigo | capitulo | El código pertenece a un capítulo SA |
| `regula` | articulo | regimen, codigo | Base legal que regula ciertos regímenes/códigos |
| `requiere` | codigo | regimen | Requisito legal aplicable al código |
| `refiere_a` | articulo | articulo | Referencia cruzada entre artículos |
| `aclara` | nota-legal | capitulo | Nota legal aclara el contenido del capítulo |
| `modifica_criterio` | nota-legal | subpartida, codigo | Nota de subpartida modifica criterio de clasificación |
| `sujeto_a` | codigo | articulo | Código sujeto a excepción legal del artículo |
| `subdivide` | subcapitulo | capitulo | Subcapítulo subdivide al capítulo SA |

---

## Cómo Expandir el Grafo

### 1. Agregar nuevos documentos fuente

Coloca archivos `.pdf.md` (o el patrón que configures) en el directorio de entrada y ejecuta el pipeline:

```bash
pnpm build-graph --input ./nuevos-docs/ --output ../knowledge-graph/
```

El pipeline:
- Detecta automáticamente nuevos artículos, códigos y regímenes
- Conecta los nuevos nodos con los existentes
- No duplica nodos (se identifican por `id` único)

### 2. Agregar un nuevo tipo de documento (ej: exoneraciones)

**Paso 1:** Registrar el tipo en `pipeline_config.yaml`:
```yaml
node_types:
  exoneracion:
    dir: "05-exoneraciones"
```

**Paso 2:** Agregar el extractor en `src/modules/builder/extractor.ts`:
```typescript
export function extractExoneracionNodes(...): Nodo[] { ... }
```

**Paso 3:** Definir relaciones en `src/modules/builder/relations.ts`:
```typescript
// Ejemplo: exoneración modifica tasa de un código
relaciones.push({ type: 'modifica', origin: exon.id, target: cod.id })
```

### 3. Agregar nuevos tipos de relación

Las relaciones se definen en `src/relations.ts`. Solo agrega un nuevo `Relacion` con el `tipo` deseado. El generador automáticamente creará una sección en el nodo para ese tipo de relación.

El `_schema.md` se actualiza automáticamente para reflejar los tipos de nodo registrados (los tipos de relación se deben documentar manualmente).

### 4. Ejemplos de expansión futura

| Documento nuevo | Tipo de nodo | Relaciones a crear |
|---|---|---|
| Decreto de exoneración de aranceles | `exoneracion` | `modifica_a → codigo` |
| Sentencia del TSJ sobre clasificación | `jurisprudencia` | `interpreta → articulo`, `aplica_a → codigo` |
| Reglamento técnico COVENIN | `norma-tecnica` | `exige → regimen`, `aplica_a → codigo` |
| Ley de Impuesto al Valor Agregado | `ley` | `refiere_a → articulo` |

---

## Convención de IDs

```
documento:  doc-{gaceta|decreto}-{numero}
capitulo:   cap-{numero}-{slug-titulo}              (slug truncado a 60 chars)
articulo:   art-{numero-3-digitos}
codigo:     cod-{codigo-sin-puntos}
subpartida: sub-{codigo-sin-puntos}                 (4d, 6d, u 8d)
regimen:    reg-{codigo-3-digitos}
nota-legal: nota-{chapter}-{tipo}-{n}               (cap 01, tipo capitulo, índice)
subcapitulo: subcap-{chapter}-{roman}               (cap 98, i/ii/iii/iv)
```

## Formato de los Wikilinks

Los links siguen el formato:
```
[[{directorio}/{id-nodo}|texto-opcional]]
```

Ejemplo:
```
- regulado por:: [[02-articulos/art-021]]
- requiere:: [[04-regimenes/reg-005]]
```

Los pipes (`|`) para texto alternativo son opcionales pero recomendados cuando el ID no es descriptivo.
