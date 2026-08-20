import { ok } from '@/lib/http'
import { getStats } from '@/lib/point-service'
import { storageBackend } from '@/store'

export const dynamic = 'force-dynamic'

/** `GET /api/stats` — headline counters for dashboards. */
export async function GET() {
  return ok({ ...(await getStats()), storageBackend })
}
