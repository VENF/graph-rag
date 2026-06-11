# Flujo del Builder

### Visión General

El pipeline ejecuta cinco etapas secuenciales: tokenización del Markdown, parseo a estructuras raw, 
extracción de nodos tipados, construcción de relaciones semánticas, y escritura a Neo4j.

### Diagrama

```
+------------------+     +------------------+     +-----------------------------+
|  readSourceFiles | --> |    tokenize      | --> |      parseTokens()          |
|  (filtro glob)   |     |  (Lexer, 13 tok) |     |  6 handlers funcionales     |
+------------------+     +------------------+     +-----------------------------+
                                                                |
                                                                v
                                                    +---------------------------+
                                                    |    extractAllNodes        |
                                                    |  8 extractores dedicados  |
                                                    +---------------------------+
                                                                |
                                                                v
                                                    +---------------------------+
                                                    |    buildRelations         |
                                                    |  10 tipos de relación     |
                                                    +---------------------------+
                                                                |
                                                                v
                                                    +---------------------------+
                                                    |    writeToNeo4j()         |
                                                    |  drop → indexes → nodes   |
                                                    |  → relations + audit      |
                                                    +---------------------------+
```

### Tokenización

`tokenize()` en `lexer.ts` produce 13 tipos de token:

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

## Parseo

`parseTokens()` en `parser/index.ts` procesa los tokens con 6 handlers:

| Handler                    | Extrae                                          |
| -------------------------- | ----------------------------------------------- |
| `handleArticle`            | número, título, contenido, referencias a otros  |
| `handleCodeTable`          | código 10d, descripción, AEC, Ex.AEC, regímenes |
| `handleSectionsRegion`     | 98 capítulos del SA desde el índice estructural |
| `handleArticleNotesRegion` | notas legales de sección/capítulo/subpartida    |
| `handleNoteBlock`          | contenido de una nota legal individual          |
| `handleSubcapituloHeader`  | subcapítulos del Cap. 98 (I–IV)                 |

## Extracción de nodos

`extractAllNodes` en `extractor/index.ts` convierte las estructuras raw en nodos del grafo. Cada tipo tiene un extractor dedicado:

| Archivo          | Nodo que produce  |
| ---------------- | ----------------- |
| `document.ts`    | Documento         |
| `chapters.ts`    | CapituloSA        |
| `articles.ts`    | Articulo          |
| `codes.ts`       | CodigoArancelario |
| `subpartidas.ts` | Subpartida        |
| `regimes.ts`     | RegimenLegal      |
| `notes.ts`       | NotaLegal         |
| `subchapters.ts` | Subcapitulo       |

## Construcción de relaciones

`buildRelations` en `relations/index.ts` conecta nodos según reglas por tipo:

| Categoría        | Relaciones que construye                                              |
| ---------------- | --------------------------------------------------------------------- |
| `document.ts`    | documento → contiene → artículo / capítulo / código / subpartida      |
| `codes.ts`       | código → pertenece_a → capítulo, código → requiere → régimen          |
| `articles.ts`    | artículo → regula → código/régimen, artículo → refiere_a → artículo   |
| `subpartidas.ts` | subpartida 8d → es_parte_de → 6d → 4d → capítulo                      |
| `notes.ts`       | nota-legal → aclara → capítulo, nota → modifica_criterio → sub/código |
| `subchapters.ts` | subcapítulo → subdivide → capítulo                                    |
| `ex-aec.ts`      | código → sujeto_a → artículo (excepción AEC)                          |

## Escritura Neo4j

`writeToNeo4j()` en `neo4j/index.ts` ejecuta 4 pasos:

1. **Drop** (solo `create`): borra relaciones y nodos en lotes con `CALL { ... } IN TRANSACTIONS`. Fallback: `DETACH DELETE`.
2. **Índices**: `CREATE INDEX IF NOT EXISTS FOR (n:Label) ON (n.id)` por cada label.
3. **Nodos**: agrupa por label y los inserta en batches de 5000 con `UNWIND` + `MERGE`.
4. **Relaciones**: agrupa por (fromLabel, relType, toLabel) y las inserta en batches de 5000 con `UNWIND` + `MATCH` + `MERGE`.

Las propiedades no primitivas se serializan a JSON automáticamente.

## Auditoría

`buildAuditReport` compara los códigos extraídos contra el documento fuente mediante regex de 10 dígitos, agrupa por capítulo SA y muestra cobertura con colores. También cuenta nodos por tipo.

## Logger

Todas las etapas usan `utils/logger.ts` con niveles `debug/info/warn/error`, timestamps ISO, y salida a stderr para warn/error. El nivel se configura vía `LOG_LEVEL` (defecto: `info`).
