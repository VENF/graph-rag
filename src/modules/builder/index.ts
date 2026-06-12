import fs from 'fs';
import path from 'path';
import { loadConfig } from './config.js';
import type { SourceEntry } from './config.js';
import { readSourceFiles, parseFileSync } from './parser/index.js';
import { extractAllNodes } from './extractor/index.js';
import { buildRelations } from './relations/index.js';
import { writeToNeo4j } from './neo4j/index.js';
import { buildAuditReport } from './audit.js';
import { logger } from './utils/logger.js';

interface CliOptions {
  config?: string;
  input?: string;
  output?: string;
  type?: string;
}

function printHelp(): void {
  process.stdout.write(`Uso: npx tsx src/modules/builder/index.ts [opciones]

Opciones:
  -c, --config <ruta>   Ruta a pipeline_config.yaml (defecto: ./pipeline_config.yaml)
  -i, --input <dir>     Sobrescribe directorio de entrada
  -o, --output <dir>    Sobrescribe directorio de salida (solo markdown)
  -t, --type <TYPE>     Selecciona source por tipo (MATRIZ|REFORMA|EXONERACION)
  --help                Muestra esta ayuda

Ejemplos:
  npx tsx src/modules/builder/index.ts
  npx tsx src/modules/builder/index.ts -t REFORMA
  npx tsx src/modules/builder/index.ts --input ../knowledge-base
  npx tsx src/modules/builder/index.ts -c ./custom_config.yaml
`);
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') {
      printHelp();
      throw new Error('mostrar-ayuda');
    }
    if (arg === '-c' || arg === '--config') {
      opts.config = args[++i];
    } else if (arg === '-i' || arg === '--input') {
      opts.input = args[++i];
    } else if (arg === '-o' || arg === '--output') {
      opts.output = args[++i];
    } else if (arg === '-t' || arg === '--type') {
      opts.type = args[++i];
    }
  }

  return opts;
}

function resolveSource(config: ReturnType<typeof loadConfig>, type?: string): string {
  if (config.input.sources && config.input.sources.length > 0) {
    const matrizCount = config.input.sources.filter((s) => s.type === 'MATRIZ').length;
    if (matrizCount > 1) {
      logger.error('Solo se permite una source de tipo MATRIZ');
      process.exit(1);
    }

    let selected: SourceEntry;
    if (type) {
      const match = config.input.sources.find((s) => s.type === type);
      if (!match) {
        const available = config.input.sources.map((s) => s.type).join(', ');
        logger.error(`Tipo "${type}" no encontrado. Tipos disponibles: ${available}`);
        process.exit(1);
      }
      selected = match;
    } else {
      selected = config.input.sources[0];
    }

    logger.info(`Source seleccionada: ${selected.type} (${selected.strategy}) en ${selected.dir}`);

    if (selected.strategy === 'OVERWRITE_OR_INITIALIZE') {
      config.output.mode = 'create';
    } else {
      config.output.mode = 'merge';
    }

    return selected.dir;
  }

  if (config.input.dir) {
    return config.input.dir;
  }

  logger.error('No se configuró input.dir ni input.sources en pipeline_config.yaml');
  process.exit(1);
}

async function main(): Promise<void> {
  const opts = parseArgs();

  const configPath = opts.config ? path.resolve(opts.config) : path.join(process.cwd(), 'pipeline_config.yaml');

  logger.info(`Cargando config desde: ${configPath}`);
  const config = loadConfig(configPath);

  let inputDir: string;
  if (opts.input) {
    inputDir = path.resolve(opts.input);
    if (!fs.existsSync(inputDir)) {
      logger.error(`Error: directorio de entrada no existe: ${inputDir}`);
      process.exit(1);
    }
  } else {
    inputDir = resolveSource(config, opts.type);
  }

  const sourceFiles = readSourceFiles(inputDir, config.input.patterns);

  if (sourceFiles.length === 0) {
    logger.error('No se encontraron archivos fuente con patrones: ' + config.input.patterns.join(', '));
    logger.error(`En el directorio: ${inputDir}`);
    process.exit(1);
  }

  logger.info(`Encontrados ${sourceFiles.length} archivo(s) fuente:`);
  for (const f of sourceFiles) {
    logger.info(`  - ${path.basename(f)}`);
  }

  let parseErrors = 0;
  const parsedFiles = sourceFiles.flatMap((f) => {
    const filename = path.basename(f);
    logger.info(`Parseando: ${filename}`);
    try {
      const result = parseFileSync(f, filename);
      logger.info(`  Artículos: ${result.articles.length}`);
      logger.info(`  Códigos: ${result.codes.length}`);
      logger.info(`  Regímenes: ${result.regimes.length}`);
      logger.info(`  Capítulos SA: ${result.sa_chapters.length}`);
      return [result];
    } catch (err) {
      parseErrors++;
      logger.error(`Error parseando ${filename}`, err);
      return [];
    }
  });

  if (parseErrors > 0) {
    logger.warn(`${parseErrors}/${sourceFiles.length} archivo(s) fallaron al parsear y fueron omitidos.`);
  }

  logger.info('Extrayendo nodos...');
  const nodos = extractAllNodes(parsedFiles);

  logger.info('Construyendo relaciones...');
  const relaciones = buildRelations(nodos, parsedFiles);

  logger.info('Escribiendo a Neo4j...');
  await writeToNeo4j(config.output, nodos, relaciones);

  logger.info(`Neo4j: ${nodos.size} nodos, ${relaciones.length} relaciones`);

  logger.info('Analizando resultados...');
  buildAuditReport(parsedFiles, nodos);
}

main().catch((err) => {
  if (err instanceof Error && err.message === 'mostrar-ayuda') return;
  logger.error('Error fatal', err);
  process.exit(1);
});
