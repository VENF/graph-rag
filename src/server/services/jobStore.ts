import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const JOBS_DIR = join(process.cwd(), 'jobs');

if (!existsSync(JOBS_DIR)) {
  mkdirSync(JOBS_DIR, { recursive: true });
}

type ProductoInput = {
  descripcion_comercial: string;
  uso_previsto: string;
  item?: number;
  cantidad?: number;
  precio_unitario?: number;
  total_linea?: number;
};

type JobInput = {
  producto: ProductoInput;
  tipo_operacion?: string;
  pais_destino?: string;
};

export type ClassificationResult = {
  technical: unknown;
  candidates: unknown[];
  verdict: unknown;
};

export type JobStatus = 'pending' | 'processing' | 'complete' | 'error';

export type Job = {
  id: string;
  status: JobStatus;
  input: JobInput;
  result: ClassificationResult | null;
  error: string | null;
  createdAt: string;
};

export const createJob = (id: string, input: JobInput): void => {
  const job: Job = {
    id,
    status: 'pending',
    input,
    result: null,
    error: null,
    createdAt: new Date().toISOString(),
  };
  writeFileSync(join(JOBS_DIR, `${id}.json`), JSON.stringify(job, null, 2), 'utf-8');
};

export const getJob = (id: string): Job | null => {
  const path = join(JOBS_DIR, `${id}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8')) as Job;
};

export const updateJob = (id: string, partial: Partial<Pick<Job, 'status' | 'result' | 'error'>>): void => {
  const path = join(JOBS_DIR, `${id}.json`);
  const existing = JSON.parse(readFileSync(path, 'utf-8')) as Job;
  const updated = { ...existing, ...partial };
  writeFileSync(path, JSON.stringify(updated, null, 2), 'utf-8');
};
