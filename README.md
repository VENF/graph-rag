# Graph Rag

Convierte documentos legales en un **grafo de conocimiento** navegable en Neo4j.
Partiendo de documentos en Markdown extraídos de PDF, el pipeline extrae artículos,
capítulos, códigos, subpartidas, regímenes, notas legales y subcapítulos;
construye relaciones semánticas entre ellos (pertenencia, regulación, referencia,
requerimiento, aclaración); y los persiste en Neo4j para consultas trazables.

Caso de uso típico: navegar desde un código normativo hasta su capítulo, los
artículos que lo regulan, los regímenes que requiere y las notas legales que lo
aclaran — todo sin depender de inteligencia artificial.

**Determinista:** mismo input → mismo output en cada ejecución.


### Requisitos

- Node.js 18+
- pnpm
- Docker



### Instalación

```bash
# 1. Clonar
git clone git@github.com:VENF/agentic-rag.git
cd agentic-rag

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar NEO4J_USER y NEO4J_PASSWORD en .env

# 4. Iniciar Neo4j
docker compose up -d

# 5. Construir el grafo
pnpm build-graph
```

### Modo `create` vs `merge`

Configurable en `pipeline_config.yaml`:

```yaml
output:
  type: neo4j
  mode: create # o "merge"
```

| Modo     | Comportamiento                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------- |
| `create` | Borra todo el grafo existente antes de escribir. Garantiza un estado limpio. Ideal para rebuilds. |
| `merge`  | Agrega o actualiza nodos sin eliminar los existentes. Útil para actualizaciones incrementales.    |

---

## Scripts

| Comando             | Descripción                                                  |
| ------------------- | ------------------------------------------------------------ |
| `pnpm build-graph`  | Ejecuta el pipeline completo y escribe en Neo4j              |
| `pnpm start`        | Inicia el servidor Fastify                                   |
| `pnpm dev`          | Inicia el servidor en modo desarrollo con recarga automática |
| `pnpm test`         | Ejecuta los tests unitarios (vitest)                         |
| `pnpm lint`         | Verifica el código con ESLint                                |
| `pnpm format`       | Verifica el formato con Prettier                             |
| `pnpm format:write` | Corrige el formato automáticamente                           |
