import { randomUUID } from 'crypto';
import path from 'path';
import { loadConfig } from '../../modules/builder/config.js';
import type { SourceEntry } from '../../modules/builder/config.js';
import { readSourceFiles, parseFileSync } from '../../modules/builder/parser/index.js';
import { extractAllNodes } from '../../modules/builder/extractor/index.js';
import { buildRelations } from '../../modules/builder/relations/index.js';
import { writeToNeo4j } from '../../modules/builder/neo4j/index.js';
import { logger } from '../../modules/builder/utils/logger.js';

const JOB_TTL = 1000 * 60 * 60;
const CLEANUP_INTERVAL = 1000 * 60 * 5;

export interface Job {
  id: string;
  status: 'running' | 'done' | 'failed';
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
}

const jobs = new Map<string, Job>();
let isBuilding = false;

setInterval(() => {
  const cutoff = Date.now() - JOB_TTL;
  for (const [id, job] of jobs) {
    if (job.completedAt && job.completedAt.getTime() < cutoff) {
      jobs.delete(id);
    }
  }
}, CLEANUP_INTERVAL);

export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

export function startBuildJob(): string {
  if (isBuilding) {
    throw new Error('Ya hay un build en curso');
  }

  const id = randomUUID();
  const job: Job = { id, status: 'running', startedAt: new Date(), completedAt: null, error: null };
  jobs.set(id, job);
  isBuilding = true;

  setImmediate(async () => {
    try {
      const configPath = path.join(process.cwd(), 'pipeline_config.yaml');
      const config = loadConfig(configPath);

      let inputDir: string;
      if (config.input.sources && config.input.sources.length > 0) {
        const selected: SourceEntry = config.input.sources[0];
        if (config.input.sources.filter((s) => s.type === 'MATRIZ').length > 1) {
          throw new Error('Solo se permite una source de tipo MATRIZ');
        }
        logger.info(`Source: ${selected.type} (${selected.strategy}) en ${selected.dir}`);
        if (selected.strategy === 'OVERWRITE_OR_INITIALIZE') {
          config.output.mode = 'create';
        } else {
          config.output.mode = 'merge';
        }
        inputDir = selected.dir;
      } else if (config.input.dir) {
        inputDir = config.input.dir;
      } else {
        throw new Error('No se configuró input.dir ni input.sources en pipeline_config.yaml');
      }

      const sourceFiles = readSourceFiles(inputDir, config.input.patterns);

      if (sourceFiles.length === 0) {
        throw new Error(`No se encontraron archivos fuente en: ${inputDir}`);
      }

      const parsedFiles = sourceFiles.map((f) => parseFileSync(f, path.basename(f)));
      const nodos = extractAllNodes(parsedFiles);
      const relaciones = buildRelations(nodos, parsedFiles);
      await writeToNeo4j(config.output, nodos, relaciones);

      job.status = 'done';
      job.completedAt = new Date();
    } catch (err) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.error = (err as Error).message;
    } finally {
      isBuilding = false;
    }
  });

  return id;
}
