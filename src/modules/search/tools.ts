import { tool, jsonSchema } from "ai";
import { glob as fastGlob } from "glob";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

function safePath(baseDir: string, target: string): string {
  const resolved = path.resolve(baseDir, target);
  if (!resolved.startsWith(baseDir)) {
    throw new Error(`Path traversal detectado: ${target}`);
  }
  return resolved;
}

const PREVIEW_LENGTH = 80;

export function buildTools(graphDir: string) {
  return {
    glob: tool<{ pattern: string }, string[]>({
      description: `Lista archivos .md en el grafo usando un patrón glob.
Ejemplos:
  "01-capitulos/*.md" → capítulos disponibles
  "03-codigos/*.md" → códigos arancelarios
  "04-regimenes/*.md" → regímenes legales
  "*/*.md" → todo

El patrón es relativo al directorio raíz del grafo.`,
      inputSchema: jsonSchema({
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: "Patrón glob relativo al grafo",
          },
        },
        required: ["pattern"],
      }),
      execute: async ({ pattern }: { pattern: string }) => {
        if (pattern.startsWith('/') || pattern.includes('..')) {
          throw new Error(`Path traversal detectado: ${pattern}`);
        }
        const fullPattern = path.join(graphDir, pattern);
        const files = await fastGlob(fullPattern, { nodir: true });
        return files.map((f) => path.relative(graphDir, f));
      },
    }),

    grep: tool<{ query: string; dir?: string }, string[]>({
      description: `Busca texto en los archivos .md del grafo.
Ejemplos:
  "carreras" → encuentra códigos con "Para carreras"
  "certificado sanitario" en "04-regimenes" → regímenes sanitarios
  "AEC" → menciona aranceles

Usa --include="*.md" y busca case-insensitive. Máximo 15 resultados por seguridad.`,
      inputSchema: jsonSchema({
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Texto a buscar (case-insensitive)",
          },
          dir: {
            type: "string",
            description:
              'Subdirectorio opcional (ej: "03-codigos", "04-regimenes")',
          },
        },
        required: ["query"],
      }),
      execute: async ({ query, dir }: { query: string; dir?: string }) => {
        const searchDir = dir ? path.join(graphDir, dir) : graphDir;
        try {
          const out = spawnSync('grep', ['-r', '-i', '-n', query, searchDir, '--include=*.md', '-m', '5'], {
            encoding: 'utf-8', timeout: 5000,
          });
          if (out.status === 0) {
            return out.stdout.split('\n').filter(Boolean).slice(0, 15);
          }
          const fallback = spawnSync('grep', ['-r', '-i', '-n', '-l', query, searchDir, '--include=*.md'], {
            encoding: 'utf-8', timeout: 5000,
          });
          if (fallback.status === 0) {
            const files = fallback.stdout.split('\n').filter(Boolean).slice(0, 15);
            return files.map((f) => `${f}: (coincidencia encontrada)`);
          }
          return [];
        } catch {
          return [];
        }
      },
    }),

    read: tool<{ file: string }, string>({
      description: `Lee el contenido completo de un archivo .md del grafo.
Devuelve el frontmatter (metadatos), wikilinks [[enlaces]], y el cuerpo del documento.

Ejemplos:
  "03-codigos/cod-0101210010.md" → código arancelario para caballos de carreras
  "04-regimenes/reg-005.md" → régimen legal 5
  "02-articulos/art-021.md" → artículo 21 del decreto

La ruta debe ser relativa al directorio raíz del grafo.`,
      inputSchema: jsonSchema({
        type: "object",
        properties: {
          file: { type: "string", description: "Ruta relativa al archivo .md" },
        },
        required: ["file"],
      }),
      execute: async ({ file }: { file: string }) => {
        try {
          const fullPath = safePath(graphDir, file);
          const raw = fs.readFileSync(fullPath, "utf-8");
          return raw;
        } catch (err) {
          return `Error al leer archivo: ${(err as Error).message}`;
        }
      },
    }),
  };
}

export function getToolsHelp(): string {
  return `Tienes tres herramientas para explorar el grafo:
- glob(patrón) → lista archivos .md
- grep(texto, dir?) → busca contenido en archivos
- read(ruta) → lee archivo completo`;
}
