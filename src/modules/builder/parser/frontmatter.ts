import yaml from 'js-yaml';
import { z } from 'zod';

const FrontmatterSchema = z.object({
  documentId: z.string().min(1),
  type: z.enum(['MATRIZ', 'REFORMA', 'EXONERACION']),
  amendment: z.string().min(1),
  gazette: z.string().min(1),
  date: z.string().min(1),
  target: z.string().optional(),
});

export type Frontmatter = z.infer<typeof FrontmatterSchema>;
export type FrontmatterType = Frontmatter['type'];

export function parseFrontmatter(raw: string): Frontmatter | null {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith('---')) return null;

  const endIndex = trimmed.indexOf('---', 3);
  if (endIndex === -1) return null;

  const yamlBlock = trimmed.slice(3, endIndex).trim();

  try {
    const parsed = yaml.load(yamlBlock) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    const result = FrontmatterSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function stripFrontmatter(raw: string): string {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith('---')) return raw;

  const endIndex = trimmed.indexOf('---', 3);
  if (endIndex === -1) return raw;

  const after = trimmed.slice(endIndex + 3);
  return after.trimStart();
}
