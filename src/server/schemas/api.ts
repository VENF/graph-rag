import { z } from 'zod/v4';

export const BuildGraphResponseSchema = z.object({
  jobId: z.string(),
});

export const JobStatusSchema = z.object({
  id: z.string(),
  status: z.enum(['running', 'done', 'failed']),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  error: z.string().nullable(),
});

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  uptime: z.number(),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
});
