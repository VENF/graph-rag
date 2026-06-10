# Flujo del Builder

## Visión General

El builder transforma documentos fuente (Gacetas Oficiales con el Arancel de Aduanas) en un grafo de conocimiento navegable. El pipeline ejecuta cinco etapas secuenciales: lectura y parseo del Markdown sin procesar (two-pass con indexación previa), extracción de nodos tipados, construcción de relaciones semánticas, generación de archivos en formato Obsidian, y auditoría de cobertura.

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
+------------------+     +-------------------------+
|   parseFile      +---->|   buildLineIndex        |
|  (two-pass)      |     |   - artículos           |
+--------+---------+     |   - tablas de códigos   |
         |               |   - secciones y caps.   |
         v               +-------------------------+
+------------------------------------+
| extractSectionsAndChapters         |
| (98 capítulos SA desde índice)     |
+------------------------------------+
         |
         v
+------------------------------------+
| extractAllNodes                    |
| - documento                        |
| - artículos                        |
| - capítulos SA (98)                |
| - códigos (10d)                    |
| - subpartidas (4d/6d/8d)          |
| - regímenes                        |
| - notas legales (243)              |
| - subcapítulos (4: Cap 98 I-IV)    |
+------------------------------------+
         |
         v
+------------------------------------+
| buildRelations                     |
| - código → capítulo                |
| - código → subpartida (jerarquía)  |
| - subpartida 4d → capítulo         |
| - subpartida 8d → 6d → 4d         |
| - código → régimen                 |
| - artículo → código/régimen        |
| - referencias entre artículos      |
| - nota-legal → capítulo (aclara)   |
| - nota-legal → sub/cod (modifica)  |
| - código → artículo (sujeto_a)     |
| - subcapítulo → capítulo (subdv)   |
+------------------------------------+
         |
         v
+------------------------------------+
| generateGraphFiles                  |
| (escribe .md + _index.md           |
|  + _schema.md)                     |
+------------------+-----------------+
         |
         v
+------------------------------------+
| buildAuditReport                   |
| (cobertura por capítulo, colores)  |
+------------------------------------+
```

## Etapas

### Configuración

El archivo `pipeline_config.yaml` define el directorio de entrada, los patrones de archivo, el directorio de salida, y la estructura de tipos de nodo con sus subdirectorios y descripciones.

### Primera pasada — Indexación de líneas

`buildLineIndex` recorre todas las líneas del documento una sola vez en O(N) y registra las posiciones de:
- Cabeceras de artículos (para extracción acotada de artículos)
- Tablas de códigos arancelarios (para extracción acotada de códigos y subpartidas)
- Región `SECCIONES Y CAPÍTULOS` (para extracción de capítulos SA desde el índice estructural)

Esto evita que los extractores escaneen el documento completo repetidamente.

### Segunda pasada — Extracción

Cada extractor recibe el índice de líneas y opera solo sobre las regiones relevantes:

- **documento**: metadatos de la Gaceta Oficial (número, fecha, decreto)
- **artículos**: contenido entre cabeceras de artículo, referencias a otros artículos
- **capítulos SA**: extraídos del índice estructural (`SECCIONES Y CAPÍTULOS`) — 98 capítulos con sección y título asociados
- **códigos arancelarios**: filas dentro de tablas, cada una con código de 10 dígitos, descripción, aranceles y regímenes
- **subpartidas (4d/6d/8d)**: jerarquía derivada de cada código de 10 dígitos, con relaciones padre-hijo
- **regímenes legales**: listado numerado dentro del artículo 21

Si el índice no produce resultados, el extractor cae a escaneo completo con una advertencia.

### Construcción de relaciones

`buildRelations` conecta los nodos según reglas por tipo:
- Códigos a su capítulo SA (dos primeros dígitos) — `pertenece_a`
- Códigos a su subpartida padre (8d) — `es_parte_de`
- Subpartidas entre niveles: 8d → 6d → 4d — `es_parte_de`
- Subpartida 4d a su capítulo SA — `es_parte_de`
- Artículos a su documento contenedor — `es_parte_de`
- Códigos a regímenes legales que los regulan — `requiere`
- Artículos a otros artículos referenciados — `refiere_a`
- Artículos a regímenes y códigos que regulan — `regula`
- Notas legales a su capítulo — `aclara`
- Notas de subpartida con scope a las subpartidas/códigos que modifican — `modifica_criterio`
- Códigos con excepción al AEC al artículo que la fundamenta (Art. 11/12) — `sujeto_a`
- Subcapítulos a su capítulo SA padre — `subdivide`

### Generación de archivos

`generateGraphFiles` escribe cada nodo como un archivo Markdown con frontmatter YAML, enlaces wiki a nodos relacionados, y metadatos de procedencia (`source_document`, `history`). Los directorios se crean una sola vez antes de la escritura masiva. Adicionalmente genera:

- `_index.md` — índice navegable con conteos y enlaces por tipo de nodo
- `_schema.md` — esquema del grafo con tipos, descripciones y etiquetas

### Auditoría post-generación

`buildAuditReport` analiza el resultado del pipeline y reporta:
- **Cobertura de códigos**: compara los códigos extraídos contra los del documento fuente mediante regex de 10 dígitos
- **Porcentaje por capítulo SA**: agrupa por capítulo y muestra extraídos/total con colores:
  - Verde brillante = 100%
  - Verde ≥ 50%
  - Rojo < 50%
- **Conteo por tipo de nodo**: documento, capítulo, artículo, código, subpartida, régimen, nota-legal, subcapítulo

## Historial Inmutable

Cada nodo incluye un arreglo `history` en su frontmatter que registra el documento y fecha de creación. Cuando un reforma legal modifique un código existente, la nueva versión agregará una entrada al historial sin modificar la original, preservando la trazabilidad completa.
