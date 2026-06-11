import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';
import { logger } from './utils/logger.js';

const NodeTypeSchema = z.object({
  dir: z.string(),
  label: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
});

const Neo4jOutputSchema = z.object({
  type: z.literal('neo4j'),
  uri: z.string(),
  user: z.string(),
  password: z.string(),
  mode: z.enum(['create', 'merge']).optional().default('merge'),
});

export const PipelineConfigSchema = z.object({
  input: z.object({
    patterns: z.array(z.string()),
    dir: z.string(),
  }),
  output: Neo4jOutputSchema,
  node_types: z.record(z.string(), NodeTypeSchema),
  relationships: z.array(z.string()),
});

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;

function loadEnvFile(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // .env file not found, ignore
  }
}

export function loadConfig(configPath: string): PipelineConfig {
  loadEnvFile();
  const absPath = path.resolve(configPath);
  let raw = fs.readFileSync(absPath, 'utf-8');

  const missingVars: string[] = [];
  raw = raw.replace(/\$\{(\w+)\}/g, (_, name) => {
    const val = process.env[name];
    if (!val) missingVars.push(name);
    return val || '';
  });
  if (missingVars.length > 0) {
    logger.warn(`Variables de entorno no definidas: ${missingVars.join(', ')}`);
  }

  const parsed = yaml.load(raw, { schema: yaml.FAILSAFE_SCHEMA });
  const config = PipelineConfigSchema.parse(parsed);

  config.input.dir = path.resolve(path.dirname(absPath), config.input.dir);

  return config;
}
