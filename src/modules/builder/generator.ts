import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import yaml from "js-yaml";
import type { Nodo, Relacion } from "./types.js";
import type { PipelineConfig } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_TEMPLATE_PATH = path.join(__dirname, "schema-template.md");

const RELATION_LABELS: Record<string, string> = {
  es_parte_de: "Pertenece a",
  pertenece_a: "Capítulo",
  regula: "Regula",
  requiere: "Requiere",
  refiere_a: "Referencia a",
  contiene: "Contiene",
};

function serializeFrontmatter(metadata: Record<string, unknown>): string {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== null && value !== undefined) filtered[key] = value;
  }
  return `---\n${yaml.dump(filtered)}---\n`;
}

function groupRelationsByType(
  relaciones: Relacion[],
  nodoId: string,
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const rel of relaciones) {
    if (rel.origin !== nodoId) continue;
    if (!grouped[rel.type]) grouped[rel.type] = [];
    grouped[rel.type].push(rel.target);
  }
  return grouped;
}

function writeNodoFile(
  outputDir: string,
  subdir: string,
  nodo: Nodo,
  relacionesPorOrigen: Map<string, Relacion[]>,
  typeDirMap: Record<string, string>,
): void {
  const dirPath = path.join(outputDir, subdir);

  const filename = `${nodo.id}.md`;
  const filePath = path.join(dirPath, filename);

  const nodoRelaciones = relacionesPorOrigen.get(nodo.id) || [];
  const grouped = groupRelationsByType(nodoRelaciones, nodo.id);

  let content = serializeFrontmatter(nodo.metadata);
  content += `${nodo.content}\n`;

  if (nodo.tags.length > 0) {
    content += `\n**Tags:** ${nodo.tags.join(", ")}\n`;
  }

  if (Object.keys(grouped).length > 0) {
    content += "\n## Relaciones\n\n";
    for (const [type, destinos] of Object.entries(grouped)) {
      const label = RELATION_LABELS[type] || type;
      content += `### ${label}\n`;
      for (const dest of destinos) {
        const destPath = resolveDestPath(dest, typeDirMap);
        content += `- ${label.toLowerCase()}:: [[${destPath}]]\n`;
      }
      content += "\n";
    }
  }

  content += `\n---\n*Nodo generado: ${nodo.id} (${nodo.type})*\n`;

  fs.writeFileSync(filePath, content, "utf-8");
}

const CONFIG_KEY_TO_TIPO: Record<string, string> = {
  documento: "documento",
  capitulo: "capitulo",
  articulo: "articulo",
  codigo: "codigo-arancelario",
  regimen: "regimen-legal",
  subpartida: "subpartida",
}

const TIPO_TO_CONFIG_KEY = Object.fromEntries(
  Object.entries(CONFIG_KEY_TO_TIPO).map(([k, v]) => [v, k]),
)

const PREFIX_TO_CONFIG_KEY: Record<string, string> = {
  doc: "documento",
  cap: "capitulo",
  art: "articulo",
  cod: "codigo",
  reg: "regimen",
  sub: "subpartida",
};

function resolveDestPath(
  destId: string,
  typeDirMap: Record<string, string>,
): string {
  for (const [prefix, configKey] of Object.entries(PREFIX_TO_CONFIG_KEY)) {
    if (destId.startsWith(`${prefix}-`)) {
      const dir = typeDirMap[configKey];
      if (dir) return path.join(dir, destId);
    }
  }
  return destId;
}

function generateIndexFile(
  outputDir: string,
  nodos: Map<string, Nodo>,
  relaciones: Relacion[],
  nodeTypes: PipelineConfig["node_types"],
): void {
  const counts: Record<string, number> = {};
  for (const nodo of nodos.values()) {
    counts[nodo.type] = (counts[nodo.type] || 0) + 1;
  }

  const relCounts: Record<string, number> = {};
  for (const rel of relaciones) {
    relCounts[rel.type] = (relCounts[rel.type] || 0) + 1;
  }

  let content = "---\n";
  content += "id: index\n";
  content += "type: index\n";
  content += 'title: "Mapa del Grafo de Conocimiento - Arancel de Aduanas"\n';
  content += "version: 1.0\n";
  content += "---\n\n";
  content += "# Grafo de Conocimiento - Arancel de Aduanas\n\n";
  content += "## Resumen del Grafo\n\n";
  content += `| Métrica | Valor |\n`;
  content += `|---------|-------|\n`;
  content += `| Total nodos | ${nodos.size} |\n`;
  content += `| Total relaciones | ${relaciones.length} |\n`;
  content += `| Documentos fuente | ${counts["documento"] || 0} |\n`;
  content += `| Capítulos SA | ${counts["capitulo"] || 0} |\n`;
  content += `| Artículos | ${counts["articulo"] || 0} |\n`;
  content += `| Códigos arancelarios | ${counts["codigo-arancelario"] || 0} |\n`;
  content += `| Subpartidas | ${counts["subpartida"] || 0} |\n`;
  content += `| Regímenes legales | ${counts["regimen-legal"] || 0} |\n\n`;

  content += "## Índice de Nodos\n\n";

  const typeConfig: Array<{ type: string; dir: string; label: string }> = [];
  for (const [key, cfg] of Object.entries(nodeTypes)) {
    const type = CONFIG_KEY_TO_TIPO[key] || key;
    typeConfig.push({ type, dir: cfg.dir, label: cfg.label || key });
  }

  const typeToDir = new Map(typeConfig.map((t) => [t.type, t.dir]));
  const grouped: Record<string, Nodo[]> = {};
  for (const { dir } of typeConfig) grouped[dir] = [];
  for (const nodo of nodos.values()) {
    const dir = typeToDir.get(nodo.type);
    if (dir) grouped[dir].push(nodo);
  }

  for (const { dir, label } of typeConfig) {
    const dirNodos = (grouped[dir] || []).sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    if (dirNodos.length === 0) continue;

    content += `### ${label} (${dirNodos.length})\n\n`;
    for (const n of dirNodos) {
      const disp = n.metadata.title || n.metadata.description || n.id;
      content += `- [[${dir}/${n.id}|${disp}]]\n`;
    }
    content += "\n";
  }

  content += "## Relaciones por Tipo\n\n";
  content += "| Tipo | Cantidad |\n";
  content += "|------|----------|\n";
  for (const [type, count] of Object.entries(relCounts)) {
    content += `| ${type} | ${count} |\n`;
  }

  content += "\n## Leyenda de Relaciones\n\n";
  content += "| Relación | Significado | Ejemplo |\n";
  content += "|----------|-------------|---------|\n";
  content +=
    "| `es_parte_de` | Nodo hijo pertenece a nodo padre | art-001 → doc-gaceta-6804 |\n";
  content +=
    "| `pertenece_a` | Código pertenece a capítulo SA | cod-0101210010 → cap-01 |\n";
  content +=
    "| `regula` | Artículo regula código o régimen | art-021 → cod-0101210010 |\n";
  content +=
    "| `requiere` | Código requiere régimen legal | cod-0101210010 → reg-005 |\n";
  content +=
    "| `refiere_a` | Artículo referencia otro artículo | art-003 → art-008 |\n";
  content +=
    "| `contiene` | Documento contiene elemento | doc-gaceta-6804 → art-001 |\n";

  const indexPath = path.join(outputDir, "_index.md");
  fs.writeFileSync(indexPath, content, "utf-8");
}

function generateNodeTypesTable(
  nodeTypes: PipelineConfig["node_types"],
): string {
  const rows: string[] = [];
  for (const [key, cfg] of Object.entries(nodeTypes)) {
    const type = CONFIG_KEY_TO_TIPO[key] || key;
    const desc = cfg.description || key;
    const tags = cfg.tags || "";
    rows.push(
      `| \`${type}\` | \`${cfg.dir}/\` | ${desc} | ${tags} |`,
    );
  }
  return rows.join("\n");
}

function generateSchemaFile(
  outputDir: string,
  nodeTypes: PipelineConfig["node_types"],
): void {
  const template = fs.readFileSync(SCHEMA_TEMPLATE_PATH, "utf-8");
  const nodeTypesTable = generateNodeTypesTable(nodeTypes);
  const body = template.replace("{{NODE_TYPES_TABLE}}", nodeTypesTable);
  const hash = crypto.createHash("md5").update(body).digest("hex").slice(0, 8);

  const content = `---
id: schema
type: schema
version: "1.0"
last_revision: ${hash}
---

${body}
`;

  const schemaPath = path.join(outputDir, "_schema.md");
  fs.writeFileSync(schemaPath, content, "utf-8");
}

export function generateGraphFiles(
  nodos: Map<string, Nodo>,
  relaciones: Relacion[],
  config: PipelineConfig,
): void {
  const outputDir = path.resolve(config.output.dir);
  fs.mkdirSync(outputDir, { recursive: true });

  const typeDirMap: Record<string, string> = {};
  for (const [typeName, typeCfg] of Object.entries(config.node_types)) {
    typeDirMap[typeName] = typeCfg.dir;
  }

  const seenDirs = new Set<string>()
  for (const nodo of nodos.values()) {
    const configKey = TIPO_TO_CONFIG_KEY[nodo.type] || "";
    const subdir = configKey && typeDirMap[configKey] ? typeDirMap[configKey] : "otros";
    if (!seenDirs.has(subdir)) {
      fs.mkdirSync(path.join(outputDir, subdir), { recursive: true })
      seenDirs.add(subdir)
    }
  }

  const relacionesPorOrigen = new Map<string, Relacion[]>();
  for (const rel of relaciones) {
    if (!relacionesPorOrigen.has(rel.origin)) {
      relacionesPorOrigen.set(rel.origin, []);
    }
    relacionesPorOrigen.get(rel.origin)!.push(rel);
  }

  for (const nodo of nodos.values()) {
    const configKey = TIPO_TO_CONFIG_KEY[nodo.type] || "";
    const subdir =
      configKey && typeDirMap[configKey] ? typeDirMap[configKey] : "otros";
    writeNodoFile(outputDir, subdir, nodo, relacionesPorOrigen, typeDirMap);
  }

  generateIndexFile(outputDir, nodos, relaciones, config.node_types);
  generateSchemaFile(outputDir, config.node_types);
}

