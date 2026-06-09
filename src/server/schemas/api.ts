import { z } from "zod/v4";

export const SearchQuerySchema = z.object({
  query: z
    .string()
    .min(1, "query es requerida")
    .max(500, "query demasiado larga"),
});

export const BuildGraphResponseSchema = z.object({
  jobId: z.string(),
});

export const JobStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["running", "done", "failed"]),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  error: z.string().nullable(),
});

export const StatsResponseSchema = z.object({
  totalNodes: z.number(),
  counts: z.record(z.string(), z.number()),
  indexedAt: z.string(),
});

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  uptime: z.number(),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
});
