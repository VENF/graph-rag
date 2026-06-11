# Flujo del Builder

### Visión General

El builder transforma documentos fuente (Gacetas Oficiales con el Arancel de Aduanas) en un grafo de conocimiento. El pipeline ejecuta cinco etapas secuenciales: tokenización del Markdown sin procesar, parseo de tokens a estructuras raw, extracción de nodos tipados, construcción de relaciones semánticas, y escritura a Neo4j.

## Diagrama de Flujo

```
+------------------+
|  Pipeline Config |
|  (YAML)          |
+--------+---------+
         |
         v
+------------------+
|  readSourceFiles |
|  (filtra por     |
|   patrón glob)   |
+--------+---------+
         |
         v
+------------------+
|   tokenize       |
|  (Lexer)         |
|  13 tipos de     |
|  token           |
+--------+---------+
         |
         v
+-----------------------------+
|  parseTokens()              |
|  6 handlers                 |
|  - handleArticle            |
|  - handleCodeTable          |
|  - handleSectionsRegion     |
|  - handleArticleNotesRegion |
|  - handleNoteBlock          |
|  - handleSubcapituloHeader  |
+--------+--------------------+
         |
         v
+-----------------------------------------+
| extractAllNodes                         |
| - documento                             |
| - artículos                             |
| - capítulos SA (98)                     |
| - códigos (11.811)                      |
| - subpartidas (4d/6d/8d, ~17.508)       |
| - regímenes (21)                        |
| - notas legales (~243)                  |
| - subcapítulos (4: Cap 98 I-IV)         |
+-----------------------------------------+
         |
         v
+------------------------------------------+
| buildRelations                           |
| - código → capítulo (pertenece_a)        |
| - código → subpartida (es_parte_de)      |
| - subpartida 8d → 6d → 4d (es_parte_de) |
| - subpartida 4d → capítulo (es_parte_de) |
| - código → régimen (requiere)            |
| - artículo → código/régimen (regula)     |
| - referencias entre artículos (refiere_a)|
| - nota-legal → capítulo (aclara)         |
| - nota-legal → sub/código (modifica_criterio)|
| - código → artículo (sujeto_a)           |
| - subcapítulo → capítulo (subdivide)     |
| - documento → todo (contiene)           |
+------------------------------------------+
         |
         v
+---------------------------+
| writeToNeo4j()            |
| - dropAllSafe (mode create)|
| - ensureIndexes           |
| - createNodes (UNWIND)    |
| - createRelationships     |
+---------------------------+
         |
         v
+------------------------------------+
| buildAuditReport                   |
| (cobertura por capítulo, colores)  |
+------------------------------------+
```

### Configuración

El archivo `pipeline_config.yaml` define el directorio de entrada, los patrones de archivo, la conexión Neo4j y la estructura de tipos de nodo.

```yaml
output:
  type: neo4j
  uri: bolt://localhost:7687
  user: neo4j
  password: ${NEO4J_PASSWORD}
  mode: create
```

### Tokenización: Lexer

`tokenize()` en `lexer.ts` transforma las líneas del documento fuente en un array de tokens tipados (13 variantes) mediante un escáner secuencial sin flags booleanos:

| Token                             | Propósito                                 |
| --------------------------------- | ----------------------------------------- |
| `article-header`                  | Cabecera `**Artículo Nº.**`               |
| `section-header`                  | Cabecera `### SECCIÓN N`                  |
| `code-table` / `code-table-clean` | Tabla de códigos arancelarios             |
| `sections-region`                 | Región `## SECCIONES Y CAPÍTULOS`         |
| `article-notes-region`            | Notas legales de sección/capítulo         |
| `note-block`                      | Bloque de nota legal                      |
| `subcapitulo-header`              | Cabecera de subcapítulo (`SUBCAPÍTULO I`) |
| `capitulo-header`                 | Cabecera de capítulo SA                   |
| `regimen-list`                    | Lista numerada de regímenes               |
| `table-row`                       | Fila genérica de tabla                    |
| `other`                           | Texto no estructurado                     |

### Parseo: funciones en `parser/`

`parseTokens()` en `parser/index.ts` recibe los tokens y los procesa mediante 6 handlers (en `parser/handlers.ts`) más extractores puros (en `parser/extractors.ts`):

- **`handleArticle`**: extrae número, título, contenido y referencias a otros artículos
- **`handleCodeTable`**: extrae códigos de 10 dígitos con descripción, aranceles (AEC, Ex.AEC), unidad física, y regímenes de importación/exportación
- **`handleSectionsRegion`**: extrae los 98 capítulos del Sistema Armonizado desde el índice estructural
- **`handleArticleNotesRegion`**: extrae notas legales de sección, capítulo, subpartida y complementarias
- **`handleNoteBlock`**: extrae el contenido de una nota legal individual
- **`handleSubcapituloHeader`**: extrae subcapítulos del Capítulo 98 (I–IV)

### Extracción de nodos

`extractAllNodes` en `extractor/index.ts` convierte las estructuras raw del parseo en nodos del grafo con metadatos tipados, contenido Markdown y tags. Cada tipo de nodo tiene su propio extractor dedicado (`extractor/document.ts`, `extractor/articles.ts`, etc.).

### Construcción de relaciones

`buildRelations` en `relations/index.ts` conecta los nodos según reglas por tipo. Cada categoría de relación reside en su propio archivo (`relations/document.ts`, `relations/codes.ts`, `relations/articles.ts`, etc.).

### Salida Neo4j

`writeToNeo4j()` en `neo4j/index.ts` escribe el grafo completo en una base Neo4j:

- **dropAllSafe**: borra el grafo existente en lotes con `CALL { ... } IN TRANSACTIONS`
- **ensureIndexes**: crea índices por label (`FOR (n:Label) ON (n.id)`)
- **createNodes**: agrupa nodos por label y los envía en lotes de 5000 con `UNWIND` + `MERGE`
- **createRelationships**: agrupa relaciones por (fromLabel, relType, toLabel) y las envía en lotes de 5000 con `UNWIND` + `MATCH` etiquetado + `MERGE`

### Auditoría post-generación

`buildAuditReport` analiza el resultado del pipeline y reporta:

- **Cobertura de códigos**: compara los códigos extraídos contra los del documento fuente mediante regex de 10 dígitos
- **Porcentaje por capítulo SA**: agrupa por capítulo y muestra extraídos/total con colores
- **Conteo por tipo de nodo**: documento, capítulo, artículo, código, subpartida, régimen, nota-legal, subcapítulo

## Logger

Todas las etapas del pipeline usan el logger estructurado en `utils/logger.ts` con niveles `debug/info/warn/error`, timestamps ISO, y salida a stderr para warn/error. El nivel se configura via `LOG_LEVEL` (defecto: `info`).

## Historial Inmutable

Cada nodo incluye un arreglo `history` en sus metadatos que registra el documento y fecha de creación. Cuando una reforma legal modifique un código existente, la nueva versión agregará una entrada al historial sin modificar la original, preservando la trazabilidad completa.
