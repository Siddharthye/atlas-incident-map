const readNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Tunables, all overridable from `.env`. Defaults are chosen so that a fresh
 * clone behaves sensibly with no configuration at all.
 */
export const config = {
  /** Hotspot grid resolution in metres. */
  hotspotCellSizeM: readNumber(process.env.ATLAS_HOTSPOT_CELL_M, 40),

  /** Incidents required in one cell before it counts as a hotspot. */
  hotspotMinCount: readNumber(process.env.ATLAS_HOTSPOT_MIN_COUNT, 2),

  /** Default lookback window for `/api/hotspots` when `windowDays` is omitted. */
  hotspotWindowDays: readNumber(process.env.ATLAS_HOTSPOT_WINDOW_DAYS, 7),

  /** Retention cap — oldest points are dropped past this, bounding storage. */
  maxStoredPoints: readNumber(process.env.ATLAS_MAX_POINTS, 2000),
} as const
