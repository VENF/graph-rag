# Estructura del Grafo de Conocimiento Legal

### Visión General

El grafo de conocimiento se almacena en Neo4j como nodos y relaciones tipadas. Cada **nodo** representa una entidad legal (documento, artículo, código arancelario, capítulo SA, etc.) con metadatos estructurados. Cada **relación** representa un vínculo semántico entre nodos.

### Tipos de Nodo

### `documento`

Documento fuente del cual se extrajo la información (Gaceta Oficial).

**Propiedades:**

```json
{
  "id": "doc-gaceta-6804",
  "title": "Gaceta Oficial de la República Bolivariana de Venezuela",
  "number": "6.804",
  "gazette_type": "Extraordinario",
  "date": "2024-04-25",
  "decree": "4.944",
  "issuer": "Presidencia de la República"
}
```

**Relaciones salientes:** `contiene → articulo`, `contiene → codigo`, `contiene → capitulo`

---

### `articulo`

Cada artículo legal del decreto/ley. Extraído mediante el patrón `**Artículo Nº.**`.

**Propiedades:**

```json
{
  "id": "art-003",
  "number": 3,
  "legal_chapter": "I",
  "references": [37, 8, 9, 11, 12, 21],
  "source_document": "doc-gaceta-6804"
}
```

**Relaciones salientes:**

- `es_parte_de → documento` (pertenece al documento fuente)
- `refiere_a → articulo` (referencias a otros artículos)
- `regula → regimen-legal` (artículo define/excepciona regímenes)
- `regula → codigo` (artículo aplica a códigos arancelarios)

---

### `subpartida`

Nodo intermedio en la jerarquía del Sistema Armonizado: partida (4 dígitos), subpartida (6 dígitos), o subpartida regional (8 dígitos). Generado automáticamente a partir de cada código de 10 dígitos.

**Propiedades:**

```json
{
  "id": "sub-01012100",
  "code": "01012100",
  "display": "0101.21.00",
  "level": 8,
  "parent": "sub-010121"
}
```

**Relaciones salientes:**

- `es_parte_de → subpartida` (nivel inferior → nivel superior)
- `es_parte_de → capitulo` (nivel 4 dígitos → capítulo SA)

**Relaciones entrantes:**

- `es_parte_de ← codigo` (código 10d → subpartida 8d)

---

### `codigo-arancelario`

Código SA de 10 dígitos (subpartida nacional). Corresponde a la hoja de la tabla arancelaria.

**Propiedades:**

```json
{
  "id": "cod-0101210010",
  "code": "0101.21.00.10",
  "description": "Para carreras",
  "sa_chapter": "01",
  "aec": { "rate": 0, "qualifier": null },
  "ex_aec": null,
  "ex_aec_legal_refs": [],
  "physical_unit": "u",
  "import_regime": ["5", "6"],
  "export_regime": [],
  "source_document": "doc-gaceta-6804"
}
```

**Relaciones salientes:**

- `es_parte_de → documento` (se originó en este documento)
- `pertenece_a → capitulo` (pertenece a un capítulo SA)
- `es_parte_de → subpartida` (pertenece a subpartida 8d padre)
- `requiere → regimen-legal` (requiere ciertos permisos/licencias)
- `sujeto_a → articulo` (sujeto a excepción legal del artículo, si aplica)

---

### `capitulo`

Capítulo del Sistema Armonizado (SA). Nodo padre de los códigos arancelarios.

**Propiedades:**

```json
{
  "id": "cap-01-animales-vivos",
  "number": "01",
  "title": "Animales vivos",
  "section": "I",
  "section_title": "Animales vivos y productos del reino animal"
}
```

**Relaciones entrantes:** `pertenece_a ← codigo`, `aclara ← nota-legal`, `es_parte_de ← subpartida(4d)`

---

### `regimen-legal`

Cada régimen legal codificado (permiso, licencia, restricción, prohibición). Definidos en el Artículo 21 del Decreto. El régimen 9 (`is_comex_permit`) está marcado como permiso COMEX para validaciones cruzadas de exoneraciones.

**Propiedades:**

```json
{
  "id": "reg-005",
  "code": "5",
  "description": "Certificado Sanitario del País de Origen",
  "entity": "MAT (Ministerio de Agricultura y Tierras)"
}
```

**Relaciones entrantes:** `requiere ← codigo`, `regula ← articulo`

---

### `nota-legal`

Cada nota legal de sección, capítulo, subcapítulo, subpartida o complementaria extraída del artículo 37. Nodos independientes con relación `aclara` hacia su capítulo.

**Propiedades:**

```json
{
  "id": "nota-01-capitulo-0",
  "nota_type": "capitulo",
  "section": "I",
  "chapter": "01"
}
```

**Relaciones salientes:** `aclara → capitulo` (nota aclara el capítulo al que pertenece)
**Relaciones salientes (si aplica):** `modifica_criterio → subpartida/codigo` (nota de subpartida con scope)

---

### `subcapitulo`

Subcapítulos del Sistema Armonizado dentro de un capítulo SA. Actualmente limitado al Capítulo 98 (Subcapítulos I–IV), que definen regímenes especiales de ensamblaje automotriz e industrial.

**Propiedades:**

```json
{
  "id": "subcap-98-i",
  "chapter": "98",
  "roman": "I",
  "title": "SUBCAPÍTULO I PARTES, PIEZAS Y COMPONENTES..."
}
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

| Tipo                | Desde                                  | Hacia                                  | Descripción                                           |
| ------------------- | -------------------------------------- | -------------------------------------- | ----------------------------------------------------- |
| `contiene`          | documento                              | articulo, capitulo, codigo, subpartida | El documento contiene estos elementos                 |
| `es_parte_de`       | articulo, capitulo, codigo, subpartida | documento                              | Pertenece al documento fuente                         |
| `es_parte_de`       | subpartida (nivel inferior)            | subpartida (nivel superior)            | Jerarquía de subpartidas (8d → 6d → 4d)               |
| `es_parte_de`       | subpartida 4d                          | capitulo                               | Partida pertenece a capítulo SA                       |
| `es_parte_de`       | codigo                                 | subpartida 8d                          | Código pertenece a subpartida padre                   |
| `pertenece_a`       | codigo                                 | capitulo                               | El código pertenece a un capítulo SA                  |
| `creación`          | documento                              | todo nodo                              | Vínculo de origen documental                          |
| `regula`            | articulo                               | regimen, codigo                        | Base legal que regula ciertos regímenes/códigos       |
| `requiere`          | codigo                                 | regimen                                | Requisito legal aplicable al código                   |
| `refiere_a`         | articulo                               | articulo                               | Referencia cruzada entre artículos                    |
| `aclara`            | nota-legal                             | capitulo                               | Nota legal aclara el contenido del capítulo           |
| `modifica_criterio` | nota-legal                             | subpartida, codigo                     | Nota de subpartida modifica criterio de clasificación |
| `sujeto_a`          | codigo                                 | articulo                               | Código sujeto a excepción legal del artículo          |
| `subdivide`         | subcapitulo                            | capitulo                               | Subcapítulo subdivide al capítulo SA                  |

---

## Salida: Neo4j

El pipeline escribe el grafo completo en Neo4j. Usa `docker compose up -d` para iniciar un contenedor Neo4j 5-community con APOC y GDS. Configura la conexión en `pipeline_config.yaml`:

```yaml
output:
  type: neo4j
  uri: bolt://localhost:7687
  user: neo4j
  password: ${NEO4J_PASSWORD}
  mode: create # o "merge" para upsert
```

La escritura usa:

- **dropAllSafe**: borra nodos y relaciones en lotes con `CALL { ... } IN TRANSACTIONS`
- **Índices**: `CREATE INDEX IF NOT EXISTS FOR (n:CodigoArancelario) ON (n.id)` — uno por label
- **Nodos**: agrupados por label y enviados en batches de 5000 con `UNWIND` + `MERGE`
- **Relaciones**: agrupadas por (fromLabel, relType, toLabel) y enviadas en batches de 5000 con `UNWIND` + `MATCH` etiquetado + `MERGE`
- Las propiedades con objetos se serializan a JSON automáticamente
- Los tipos de relación se normalizan (mayúsculas, sin acentos)

### Cómo Expandir el Grafo

#### 1. Agregar nuevos documentos fuente

Coloca archivos `.md` en el directorio de entrada y ejecuta el pipeline:

```bash
pnpm build-graph
```

El pipeline detecta automáticamente nuevos artículos, códigos y regímenes sin duplicar nodos existentes (identificados por `id` único).

### 2. Agregar un nuevo tipo de nodo

**Paso 1:** Registrar el tipo en `pipeline_config.yaml`:

```yaml
node_types:
  exoneracion:
    dir: '05-exoneraciones'
```

**Paso 2:** Agregar extractor en `extractor/`:

```typescript
export function extractExoneracionNodes(...): Nodo[] { ... }
```

**Paso 3:** Registrar en `extractor/index.ts`:

```typescript
import { extractExoneracionNodes } from './exoneracion.js';
// Agregar a extractFromFile()
```

**Paso 4:** Definir relaciones si aplica.

---

## Convención de IDs

```
documento:  doc-{gaceta|decreto}-{numero}
capitulo:   cap-{numero}-{slug-titulo}              (slug truncado a 60 chars)
articulo:   art-{numero-3-digitos}
codigo:     cod-{codigo-sin-puntos}
subpartida: sub-{codigo-sin-puntos}                 (4d, 6d, u 8d)
regimen:    reg-{codigo-3-digitos}
nota-legal: nota-{chapter}-{tipo}-{n}               (cap 01, tipo capitulo, índice) -> problema de relacion (pendiente)
subcapitulo: subcap-{chapter}-{roman}               (cap 98, i/ii/iii/iv)
```

## Métricas del Grafo (último build)

- 29.507 nodos
- 77.918 relaciones
- 11.811 códigos arancelarios (99,9% de cobertura)
