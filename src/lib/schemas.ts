import { z } from 'zod'
import { CATEGORIES } from '@/domain/types'

export const categorySchema = z.enum(CATEGORIES)
const severitySchema = z.enum(['P0', 'P1', 'P2', 'P3'])

export const createPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  category: categorySchema,
  /** Callers that skip triage still get a sane middle-of-the-road severity. */
  severity: severitySchema.default('P2'),
  label: z.string().max(120).optional(),
  /** Free-form passthrough (reporter id, source system, room number, …). */
  meta: z.record(z.string(), z.unknown()).optional(),
})

export type CreatePointInput = z.infer<typeof createPointSchema>

export const triageRequestSchema = z.object({
  category: categorySchema,
  description: z.string().min(1).max(2000),
  reportCount: z.number().int().min(1).max(500).default(1),
  /** Local hour 0–23. Omit to use the server's current hour. */
  timeOfDay: z.number().int().min(0).max(23).optional(),
  /** 0 (benign location) to 1 (known hazardous). Omit for neutral. */
  locationRisk: z.number().min(0).max(1).default(0),
})

export type TriageRequest = z.infer<typeof triageRequestSchema>
