import type { Category, HotspotCell, IncidentPoint } from './types'

/** Metres per degree of latitude — near-constant everywhere on Earth. */
const METRES_PER_DEGREE_LAT = 111_320

/** Default grid resolution. ~40m ≈ one building entrance or path segment. */
export const DEFAULT_CELL_SIZE_M = 40

/** A cell only becomes a hotspot once incidents repeat inside it. */
export const DEFAULT_MIN_COUNT = 2

export interface HotspotOptions {
  cellSizeM?: number
  minCount?: number
  windowDays?: number
  /** Injected so callers (and tests) control "now" instead of the clock. */
  now?: Date
}

interface CellAccumulator {
  latSum: number
  lngSum: number
  count: number
  categories: Partial<Record<Category, number>>
  lastSeenAt: string
}

/**
 * Buckets incidents into a square metric grid and keeps only cells where
 * incidents *repeat*. Repetition is the signal: one report is noise, three
 * reports in the same 40m square is a place with a problem — a dark corridor,
 * a broken lock, a hazardous junction.
 *
 * Longitude degrees shrink toward the poles, so each point's longitude is
 * scaled by cos(lat) before bucketing to keep cells square in metres.
 *
 * @example
 * bucketHotspots(points, { windowDays: 7 })
 * // => [{ id: '5654:23838', centre: {...}, count: 4, dominantCategory: 'harassment', ... }]
 */
export function bucketHotspots(
  points: readonly IncidentPoint[],
  options: HotspotOptions = {},
): HotspotCell[] {
  const cellSizeM = options.cellSizeM ?? DEFAULT_CELL_SIZE_M
  const minCount = options.minCount ?? DEFAULT_MIN_COUNT
  const now = options.now ?? new Date()

  const cutoff =
    options.windowDays !== undefined
      ? now.getTime() - options.windowDays * 24 * 60 * 60 * 1000
      : Number.NEGATIVE_INFINITY

  const cells = new Map<string, CellAccumulator>()

  for (const point of points) {
    if (new Date(point.createdAt).getTime() < cutoff) continue

    const latMetres = point.lat * METRES_PER_DEGREE_LAT
    const lngMetres =
      point.lng * METRES_PER_DEGREE_LAT * Math.cos((point.lat * Math.PI) / 180)
    const key = `${Math.floor(latMetres / cellSizeM)}:${Math.floor(lngMetres / cellSizeM)}`

    const cell = cells.get(key) ?? {
      latSum: 0,
      lngSum: 0,
      count: 0,
      categories: {},
      lastSeenAt: point.createdAt,
    }

    cell.latSum += point.lat
    cell.lngSum += point.lng
    cell.count += 1
    cell.categories[point.category] = (cell.categories[point.category] ?? 0) + 1
    if (point.createdAt > cell.lastSeenAt) cell.lastSeenAt = point.createdAt

    cells.set(key, cell)
  }

  return [...cells.entries()]
    .filter(([, cell]) => cell.count >= minCount)
    .map(([id, cell]) => ({
      id,
      // Mean of member points, not the geometric cell centre — the marker then
      // lands on the actual trouble spot instead of an arbitrary grid corner.
      centre: { lat: cell.latSum / cell.count, lng: cell.lngSum / cell.count },
      count: cell.count,
      dominantCategory: dominantCategory(cell.categories),
      categories: cell.categories,
      lastSeenAt: cell.lastSeenAt,
    }))
    .sort((a, b) => b.count - a.count || b.lastSeenAt.localeCompare(a.lastSeenAt))
}

/** The most frequent category in a cell; ties break toward the first seen. */
function dominantCategory(categories: Partial<Record<Category, number>>): Category {
  let best: Category = 'other'
  let bestCount = -1

  for (const [category, count] of Object.entries(categories) as [Category, number][]) {
    if (count > bestCount) {
      best = category
      bestCount = count
    }
  }

  return best
}
