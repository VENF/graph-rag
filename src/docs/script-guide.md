# Guía del Proyecto `agentic-rag`

## Descripción

Pipeline en TypeScript que parsea documentos jurídicos en formato Markdown (extraídos de PDF) y genera un **grafo de conocimiento** en Neo4j, más un **agente de búsqueda** que permite consultar el grafo en lenguaje natural.

**Propósito:** Crear una capa de conocimiento navegable para consultas legales y trazabilidad jurídica, donde un agente de IA pueda navegar desde un código arancelario hasta su base legal, tarifas aplicables, y regímenes requeridos.

---

## Requisitos e Instalación

Necesitas Node.js 18+, pnpm, Docker (para Neo4j), y una API Key de Google Gemini (se obtiene en https://aistudio.google.com/apikey).

Para instalar, clona el repositorio, ejecuta `pnpm install`, copia `config/.env.example` a `.env` y edita este último con tu API key. Las variables requeridas son `GOOGLE_GENERATIVE_AI_API_KEY`, `PORT` (3000 por defecto), `HOST`, `LOG_LEVEL` y `CORS_ORIGIN`. Si usas Neo4j, agrega `NEO4J_URI`, `NEO4J_USER` y `NEO4J_PASSWORD`.

---

## Uso

El proyecto expone varios scripts vía pnpm:

- **`pnpm build-graph`** — Ejecuta el pipeline builder con la configuración de `pipeline_config.yaml`. Lee archivos `*.md` desde `knowledge-base/` y escribe el grafo en Neo4j.
- **`pnpm dev`** — Inicia el servidor Fastify en modo desarrollo con recarga automática.
- **`pnpm start`** — Inicia el servidor Fastify en modo producción.
- **`pnpm run search "consulta"`** — Consulta one-shot al agente de búsqueda desde la terminal.
- **`pnpm run search:repl`** — Modo interactivo REPL para conversar con el agente. Acepta `--reindex` para reconstruir el índice de búsqueda.
- **`docker compose up -d`** — Inicia Neo4j 5-community con APOC y GDS (requiere Docker).

El servidor corre en `http://localhost:3000` por defecto.

---

## Estructura del Proyecto

```
agentic-rag/
├── config/
│   ├── env.ts                  # Validación Zod de variables de entorno
│   └── .env.example            # Template para .env
├── src/
│   ├── modules/
│   │   ├── builder/            # Pipeline de construcción del grafo
│   │   │   ├── index.ts        # Entry point (CLI) — orquestador
│   │   │   ├── config.ts       # Carga de pipeline_config.yaml + env vars
│   │   │   ├── lexer.ts        # Tokenizador (13 tipos de token)
│   │   │   ├── audit.ts        # Reporte de cobertura post-build
│   │   │   ├── ids.ts          # Generación de IDs consistentes
│   │   │   ├── utils.ts        # Utilidades (slugify, etc.)
│   │   │   ├── types.ts        # Tipos del pipeline (Token, Nodo, Relacion, etc.)
│   │   │   ├── parser/         # Parseo funcional de tokens
│   │   │   │   ├── index.ts    # parseFileSync, parseTokens
│   │   │   │   ├── handlers.ts # 6 handlers funcionales
│   │   │   │   ├── extractors.ts # Extractores puros
│   │   │   │   └── utils.ts    # cleanPageBreaks, subpartidaLevels, etc.
│   │   │   ├── extractor/      # Conversión raw → nodos (8 tipos)
│   │   │   │   ├── index.ts
│   │   │   │   ├── document.ts, articles.ts, chapters.ts
│   │   │   │   ├── codes.ts, subpartidas.ts, regimes.ts
│   │   │   │   ├── notes.ts, subchapters.ts
│   │   │   │   └── ...
│   │   │   ├── relations/      # Construcción de relaciones (7 grupos)
│   │   │   │   ├── index.ts
│   │   │   │   ├── document.ts, codes.ts, articles.ts
│   │   │   │   ├── notes.ts, subpartidas.ts, subchapters.ts
│   │   │   │   ├── ex-aec.ts
│   │   │   │   └── ...
│   │   │   ├── neo4j/          # Escritura Neo4j (funcional)
│   │   │   │   ├── index.ts    # writeToNeo4j()
│   │   │   │   ├── drop.ts     # dropAllSafe
│   │   │   │   ├── indexes.ts  # ensureIndexes
│   │   │   │   ├── nodes.ts    # createNodes
│   │   │   │   └── relations.ts # createRelationshipsOptimized
│   │   │   ├── utils/
│   │   │   │   └── logger.ts   # Logger estructurado
│   │   │   └── __tests__/      # Tests unitarios (vitest)
│   │   └── search/             # Agente de búsqueda con IA
│   │       ├── index.ts        # Entry point
│   │       ├── agent.ts        # Integración con Vercel AI SDK + Gemini
│   │       ├── tools.ts        # Tools: glob, grep, read
│   │       ├── prompt.ts       # System prompt del agente
│   │       ├── repl.ts         # REPL interactivo con tool visibility
│   │       ├── graph-index.ts  # Índice de búsqueda por texto
│   │       └── types.ts        # Interfaces y tipos compartidos
│   ├── server/                 # Servidor Fastify
│   │   ├── index.ts            # Entry point del server
│   │   ├── app.ts              # Setup: Pino logger, CORS, rutas
│   │   ├── routes/
│   │   │   ├── search.ts       # POST /search, /search/stream, /reindex, GET /stats
│   │   │   ├── graph.ts        # POST /build-graph, GET /jobs/:id
│   │   │   └── health.ts       # GET /health
│   │   ├── services/
│   │   │   ├── search-service.ts  # Cache del índice + ejecución del agente
│   │   │   └── builder-service.ts # Job queue para build-graph (escribe a Neo4j)
│   │   └── schemas/
│   │       └── api.ts          # Zod schemas de request/response
│   ├── types.ts                # Tipos globales (NodeType)
│   └── docs/
│       ├── graph-structure.md  # Documentación del grafo
│       ├── builder-flow.md     # Flujo del pipeline
│       └── script-guide.md     # Esta guía
├── bruno/                      # Colección Bruno para pruebas de API
├── docker-compose.yml          # Neo4j 5-community con APOC y GDS
├── pipeline_config.yaml        # Configuración del pipeline
├── knowledge-base/             # Documentos fuente
└── pnpm-lock.yaml
```

---

## Pipeline Builder

El builder transforma documentos fuente en un grafo de conocimiento en Neo4j mediante 5 etapas secuenciales:

1. **Lexer** (`lexer.ts`): escanea las líneas del Markdown y produce tokens tipados (13 variantes) sin estado mutable.
2. **Parser** (`parser/`): `parseTokens()` procesa los tokens con 6 handlers funcionales y produce estructuras raw (artículos, códigos, capítulos, regímenes, notas, subcapítulos).
3. **Extractor** (`extractor/`): convierte las estructuras raw en nodos del grafo. Cada tipo de nodo tiene un extractor dedicado.
4. **Relations** (`relations/`): construye las relaciones semánticas entre nodos. Cada categoría de relación reside en su propio archivo.
5. **Neo4j** (`neo4j/`): escribe nodos y relaciones en Neo4j con batches optimizados de `UNWIND`.

El pipeline es determinista: mismo input → mismo output (no usa IA).

La salida se configura en `pipeline_config.yaml`:

```yaml
output:
  type: neo4j
  uri: bolt://localhost:7687
  user: neo4j
  password: ${NEO4J_PASSWORD}
  mode: create
```

---

## Agente de Búsqueda

El agente usa Google Gemini con tres herramientas para navegar el grafo: `glob` para listar archivos por patrón, `grep` para buscar texto en los archivos, y `read` para leer el contenido completo de un nodo. El agente explora el grafo como lo haría un humano, encadenando estas herramientas hasta armar una respuesta. En el modo REPL se muestran las tool calls en tiempo real con sus resultados. También hay un modo one-shot que devuelve la respuesta completa más el historial de herramientas utilizadas.

---

## API Server

El servidor Fastify expone endpoints REST para health check, estadísticas del grafo, búsqueda (JSON y SSE streaming), reindexación, ejecución del builder, y eliminación del grafo. La colección en `bruno/` contiene todos los endpoints pre-configurados con el environment `Local` apuntando a `http://localhost:3000`. Ábrela con la app Bruno para probarlos.
