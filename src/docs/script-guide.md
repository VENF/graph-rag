# Guía del Proyecto `agentic-rag`

## Descripción

Pipeline en TypeScript que parsea documentos jurídicos en formato Markdown (extraídos de PDF) y genera un **grafo de conocimiento** como archivos Markdown interconectados con `[[wikilinks]]`, más un **agente de búsqueda** que permite consultar el grafo en lenguaje natural.

**Propósito:** Crear una capa de conocimiento navegable para consultas legales y trazabilidad jurídica, donde un agente de IA pueda navegar desde un código arancelario hasta su base legal, tarifas aplicables, y regímenes requeridos.

---

## Requisitos e Instalación

Necesitas Node.js 18+, pnpm, y una API Key de Google Gemini (se obtiene en https://aistudio.google.com/apikey).

Para instalar, clona el repositorio, ejecuta `pnpm install`, copia `config/.env.example` a `.env` y edita este último con tu API key. Las variables requeridas son `GOOGLE_GENERATIVE_AI_API_KEY`, `PORT` (3000 por defecto), `HOST`, `LOG_LEVEL` y `CORS_ORIGIN`.

---

## Uso

El proyecto expone varios scripts vía pnpm:

- **`pnpm build-graph`** — Ejecuta el pipeline builder con la configuración de `pipeline_config.yaml`. Lee archivos `*.md` desde `knowledge-base/` y genera el grafo en `knowledge-graph/`.
- **`pnpm dev`** — Inicia el servidor Fastify en modo desarrollo con recarga automática.
- **`pnpm start`** — Inicia el servidor Fastify en modo producción.
- **`pnpm run search "consulta"`** — Consulta one-shot al agente de búsqueda desde la terminal.
- **`pnpm run search:repl`** — Modo interactivo REPL para conversar con el agente. Acepta `--reindex` para reconstruir el índice de búsqueda.

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
│   │   │   ├── index.ts        # Entry point (CLI)
│   │   │   ├── config.ts       # Carga de pipeline_config.yaml
│   │   │   ├── parser.ts       # Parseo de archivos .pdf.md
│   │   │   ├── extractor.ts    # Convierte raw data en nodos
│   │   │   ├── relations.ts    # Construye relaciones entre nodos
│   │   │   └── generator.ts    # Genera archivos .md con frontmatter
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
│   │   │   └── builder-service.ts # Job queue para build-graph
│   │   └── schemas/
│   │       └── api.ts          # Zod schemas de request/response
│   ├── types.ts                # Tipos globales (NodeType)
│   └── docs/
│       ├── graph-structure.md  # Documentación del grafo
│       └── script-guide.md     # Esta guía
├── bruno/                      # Colección Bruno para pruebas de API
├── package.json                # Dependencias y scripts
├── tsconfig.json               # Configuración TypeScript
├── pipeline_config.yaml        # Configuración del pipeline
├── knowledge-base/             # Documentos fuente
├── knowledge-graph/            # Grafo generado
└── pnpm-lock.yaml
```

---

## Pipeline Builder

El builder es un pipeline secuencial que transforma documentos fuente en un grafo de conocimiento navegable. Comienza cargando la configuración desde `pipeline_config.yaml`, que define directorios de entrada y salida, tipos de nodo y relaciones. Luego lee los archivos `*.md` del directorio de entrada, los parsea para extraer documentos, artículos, códigos arancelarios, capítulos del Sistema Armonizado y regímenes legales. Cada una de estas entidades se convierte en un nodo con metadatos estructurados (frontmatter YAML) y contenido Markdown. A continuación se construyen las relaciones entre nodos: pertenencia a capítulo, base legal de códigos, referencias cruzadas entre artículos, y requisitos de régimen. Finalmente se generan los archivos Markdown en el directorio de salida, cada nodo en su subdirectorio correspondiente, con wikilinks a sus nodos relacionados. También se genera un `_index.md` con el resumen del grafo y un `_schema.md` con la documentación de tipos de nodo y relaciones.

---

## Agente de Búsqueda

El agente usa Google Gemini con tres herramientas para navegar el grafo: `glob` para listar archivos por patrón, `grep` para buscar texto en los archivos, y `read` para leer el contenido completo de un nodo. El agente explora el grafo como lo haría un humano, encadenando estas herramientas hasta armar una respuesta. En el modo REPL se muestran las tool calls en tiempo real con sus resultados. También hay un modo one-shot que devuelve la respuesta completa más el historial de herramientas utilizadas.

---

## API Server

El servidor Fastify expone endpoints REST para health check, estadísticas del grafo, búsqueda (JSON y SSE streaming), reindexación, ejecución del builder, y eliminación del grafo. La colección en `bruno/` contiene todos los endpoints pre-configurados con el environment `Local` apuntando a `http://localhost:3000`. Ábrela con la app Bruno para probarlos.

