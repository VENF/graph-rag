import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { z } from 'zod'

const NodeTypeSchema = z.object({
  dir: z.string(),
  label: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
})

export const PipelineConfigSchema = z.object({
  input: z.object({
    patterns: z.array(z.string()),
    dir: z.string(),
  }),
  output: z.object({
    dir: z.string(),
  }),
  node_types: z.record(z.string(), NodeTypeSchema),
  relationships: z.array(z.string()),
})

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>

export function loadConfig(configPath: string): PipelineConfig {
  const absPath = path.resolve(configPath)
  const raw = fs.readFileSync(absPath, 'utf-8')
  const parsed = yaml.load(raw, { schema: yaml.FAILSAFE_SCHEMA })
  const config = PipelineConfigSchema.parse(parsed)

  config.input.dir = path.resolve(path.dirname(absPath), config.input.dir)
  config.output.dir = path.resolve(path.dirname(absPath), config.output.dir)

  return config
}
