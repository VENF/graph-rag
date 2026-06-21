import { z } from 'zod';

export const ProductoInputSchema = z.object({
  descripcion_comercial: z.string().min(1),
  uso_previsto: z.string().min(1),
  item: z.number().optional(),
  cantidad: z.number().optional(),
  precio_unitario: z.number().optional(),
  total_linea: z.number().optional(),
});

export const InputJsonSchema = z.object({ producto: ProductoInputSchema });

export const TechnicalSheetSchema = z.object({
  technical_name: z.string(),
  constituent_material: z.string(),
  primary_function: z.string(),
  physical_presentation: z.string(),
  critical_specifications: z.record(z.string(), z.unknown()),
});

export type TechnicalSheet = z.infer<typeof TechnicalSheetSchema>;

export const ChapterOutputSchema = z.object({
  chapter: z.number(),
  explanation: z.string(),
});

export const AuditDecisionSchema = z.object({
  excluded: z.boolean(),
  redirectChapter: z.string().nullable(),
  triggerNoteId: z.string().nullable(),
  explanation: z.string(),
});

export const HeadingSelectionSchema = z.object({
  heading: z.string(),
  explanation: z.string(),
});

export type HeadingSelection = z.infer<typeof HeadingSelectionSchema>;

export const SubheadingSelectionSchema = z.object({
  subheading: z.string(),
  explanation: z.string(),
});

export type SubheadingSelection = z.infer<typeof SubheadingSelectionSchema>;

export const CodeSelectionSchema = z.object({
  code: z.string(),
  explanation: z.string(),
});

export type CodeSelection = z.infer<typeof CodeSelectionSchema>;

export type AuditDecision = z.infer<typeof AuditDecisionSchema>;

export const MercologicalSummarySchema = z.object({
  product: z.string(),
  material: z.string(),
  function: z.string(),
  presentation: z.string(),
});

export const TraceabilityEntrySchema = z.object({
  level: z.string(),
  code: z.string(),
  justification: z.string(),
});

export const VerdictReportSchema = z.object({
  mercological_summary: MercologicalSummarySchema,
  taxonomic_traceability: z.array(TraceabilityEntrySchema),
  legal_basis: z.array(z.string()),
  observations: z.string().min(1),
});
