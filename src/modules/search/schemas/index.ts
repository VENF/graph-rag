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
