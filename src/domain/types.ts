/**
 * Core vocabulary for ATLAS. Everything in `domain/` is pure data and pure
 * functions — no I/O, no framework imports — so the triage and hotspot logic
 * can be read, tested, and reused independently of how it is served.
 */

/** Incident priority. P0 is life-threatening; P3 is informational. */
export type Severity = 'P0' | 'P1' | 'P2' | 'P3'

/** Incident categories ATLAS understands. Kept as a value so zod can enum it. */
export const CATEGORIES = [
  'fire',
  'medical',
  'harassment',
  'infrastructure',
  'security',
  'other',
] as const

export type Category = (typeof CATEGORIES)[number]

export interface Coordinates {
  lat: number
  lng: number
}

/** One reported incident pinned to the map. */
export interface IncidentPoint {
  id: string
  lat: number
  lng: number
  category: Category
  severity: Severity
  /** Short human label shown in feeds, e.g. "Smoke — Block C 3rd floor". */
  label?: string
  /** Free-form passthrough for integrators (reporter id, source system, …). */
  meta?: Record<string, unknown>
  createdAt: string
}

/** One scored contribution to a triage decision, kept for explainability. */
export interface TriageFactor {
  name: string
  weight: number
  detail: string
}

export interface TriageInput {
  category: Category
  description: string
  /** How many independent reports describe this incident. */
  reportCount: number
  /** Local hour 0–23 when the report arrived. */
  timeOfDay: number
  /** Known risk of the location, 0 (benign) to 1 (hazardous). */
  locationRisk: number
}

export interface TriageResult {
  priority: Severity
  /** 0–100. Higher is more urgent. */
  score: number
  factors: TriageFactor[]
  /** One readable sentence citing the top factors — the "explain it" answer. */
  rationale: string
}

/** A grid cell where incidents repeat — the output of hotspot detection. */
export interface HotspotCell {
  id: string
  centre: Coordinates
  count: number
  dominantCategory: Category
  /** Per-category counts inside the cell, for tooltips and analytics. */
  categories: Partial<Record<Category, number>>
  lastSeenAt: string
}
