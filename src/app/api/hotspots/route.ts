import { config } from '@/lib/config'
import { ok } from '@/lib/http'
import { getHotspots } from '@/lib/point-service'

export const dynamic = 'force-dynamic'

/** Lookback window is clamped so a typo cannot scan unbounded history. */
const MAX_WINDOW_DAYS = 90

/**
 * `GET /api/hotspots?windowDays=7`
 * Grid cells (~40m) where incidents repeat, sorted by incident count.
 */
export async function GET(request: Request) {
  const raw = Number(new URL(request.url).searchParams.get('windowDays'))
  const windowDays =
    Number.isFinite(raw) && raw > 0 ? Math.min(raw, MAX_WINDOW_DAYS) : config.hotspotWindowDays

  const hotspots = await getHotspots(windowDays)
  return ok({ hotspots, count: hotspots.length, windowDays })
}
