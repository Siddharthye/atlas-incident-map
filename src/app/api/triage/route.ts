import { triageIncident } from '@/domain/triage'
import { ok, parseBody } from '@/lib/http'
import { triageRequestSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

/**
 * `POST /api/triage`
 *
 * Scores a report without storing anything — the triage engine is pure and
 * stateless, which is exactly why it is sellable on its own: call it from any
 * intake pipeline to decide priority before you decide anything else.
 *
 * @example
 * curl -X POST http://localhost:4102/api/triage \
 *   -H 'Content-Type: application/json' \
 *   -d '{"category":"medical","description":"unconscious, not breathing","reportCount":3}'
 */
export async function POST(request: Request) {
  const parsed = await parseBody(request, triageRequestSchema)
  if (!parsed.success) return parsed.response

  const result = triageIncident({
    category: parsed.data.category,
    description: parsed.data.description,
    reportCount: parsed.data.reportCount,
    // Server-local hour when the caller does not say — good enough for a
    // single-campus deployment, and overridable for anything else.
    timeOfDay: parsed.data.timeOfDay ?? new Date().getHours(),
    locationRisk: parsed.data.locationRisk,
  })

  return ok(result)
}
