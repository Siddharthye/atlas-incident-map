import { fail, ok, parseBody } from '@/lib/http'
import { createPoint, listPoints } from '@/lib/point-service'
import { categorySchema, createPointSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

/** Accepts ISO-8601 or epoch milliseconds; anything else means "no filter". */
const parseSince = (value: string | null): Date | undefined => {
  if (!value) return undefined
  const asNumber = Number(value)
  const date = Number.isFinite(asNumber) && value.trim() !== '' ? new Date(asNumber) : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/**
 * `GET /api/points?since=&category=`
 * Lists incidents, newest first. `since` accepts ISO-8601 or epoch ms.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams

  const rawCategory = params.get('category')
  const category = rawCategory ? categorySchema.safeParse(rawCategory) : null
  if (category && !category.success) {
    return fail(`Unknown category "${rawCategory}"`, 400, categorySchema.options)
  }

  const points = await listPoints({
    since: parseSince(params.get('since')),
    ...(category?.success ? { category: category.data } : {}),
  })

  return ok({ points, count: points.length })
}

/**
 * `POST /api/points`
 * Pins an incident to the map and broadcasts `point.created` to every listener.
 */
export async function POST(request: Request) {
  const parsed = await parseBody(request, createPointSchema)
  if (!parsed.success) return parsed.response

  const point = await createPoint(parsed.data)
  return ok({ point }, 201)
}
