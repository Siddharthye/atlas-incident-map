import { randomUUID } from 'node:crypto'
import { bucketHotspots } from '@/domain/hotspots'
import type { Category, HotspotCell, IncidentPoint, Severity } from '@/domain/types'
import { store } from '@/store'
import { config } from './config'
import type { CreatePointInput } from './schemas'
import { buildSeedPoints } from './seed'

const POINTS = 'points'

/**
 * Seeds demo incidents the first time the store is read, so a freshly cloned
 * instance shows a living map immediately instead of an empty ocean of dark.
 */
async function loadPoints(): Promise<IncidentPoint[]> {
  const existing = await store.readCollection<IncidentPoint>(POINTS)
  if (existing.length > 0) return existing

  const seeded = buildSeedPoints()
  await store.writeCollection(POINTS, seeded)
  return seeded
}

export interface ListPointsFilter {
  /** Only points created strictly after this instant. */
  since?: Date
  category?: Category
}

/** All incidents, newest first, optionally filtered. */
export async function listPoints(filter: ListPointsFilter = {}): Promise<IncidentPoint[]> {
  const points = await loadPoints()

  return points
    .filter((point) => {
      if (filter.since && new Date(point.createdAt).getTime() <= filter.since.getTime()) {
        return false
      }
      return !filter.category || point.category === filter.category
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/**
 * Stores a new incident and publishes it to the live event stream, which is
 * what makes every open map animate the point in within half a second.
 *
 * @example
 * await createPoint({
 *   lat: 20.35192, lng: 85.8203,
 *   category: 'medical', severity: 'P0',
 *   label: 'Student unconscious — Hostel 9 stairwell',
 * })
 */
export async function createPoint(input: CreatePointInput): Promise<IncidentPoint> {
  const points = await loadPoints()

  const point: IncidentPoint = {
    id: randomUUID(),
    lat: input.lat,
    lng: input.lng,
    category: input.category,
    severity: input.severity,
    ...(input.label !== undefined ? { label: input.label } : {}),
    ...(input.meta !== undefined ? { meta: input.meta } : {}),
    createdAt: new Date().toISOString(),
  }

  // Retention cap: drop the oldest beyond the limit so storage stays bounded
  // no matter how long an instance runs.
  const next = [...points, point]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-config.maxStoredPoints)

  await store.writeCollection(POINTS, next)
  await store.appendEvent('point.created', point)

  return point
}

/** Repeat-incident zones over the given lookback window. */
export async function getHotspots(windowDays: number): Promise<HotspotCell[]> {
  return bucketHotspots(await loadPoints(), {
    cellSizeM: config.hotspotCellSizeM,
    minCount: config.hotspotMinCount,
    windowDays,
  })
}

/** Headline counters for dashboards and the console header. */
export async function getStats() {
  const points = await loadPoints()

  const byCategory: Partial<Record<Category, number>> = {}
  const bySeverity: Partial<Record<Severity, number>> = {}

  for (const point of points) {
    byCategory[point.category] = (byCategory[point.category] ?? 0) + 1
    bySeverity[point.severity] = (bySeverity[point.severity] ?? 0) + 1
  }

  const hotspots = bucketHotspots(points, {
    cellSizeM: config.hotspotCellSizeM,
    minCount: config.hotspotMinCount,
    windowDays: config.hotspotWindowDays,
  })

  return {
    points: points.length,
    byCategory,
    bySeverity,
    hotspots: hotspots.length,
    hotspotWindowDays: config.hotspotWindowDays,
  }
}
