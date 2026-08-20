import type { Category, Severity, TriageFactor, TriageInput, TriageResult } from './types'

/**
 * Category base weights. A fire report is dangerous even when tersely written,
 * while "other" must earn urgency through its content — so the floor differs.
 */
const BASE_WEIGHTS: Record<Category, number> = {
  fire: 52,
  medical: 48,
  security: 40,
  harassment: 38,
  infrastructure: 24,
  other: 14,
}

interface Escalator {
  phrase: string
  weight: number
}

/**
 * Per-category lexicons. Phrases are matched as lowercase substrings, so
 * "not breathing!" and "NOT BREATHING" both hit. Weights encode how strongly a
 * phrase predicts life risk within that category.
 */
const LEXICONS: Record<Category, Escalator[]> = {
  fire: [
    { phrase: 'trapped', weight: 30 },
    { phrase: 'spreading', weight: 24 },
    { phrase: 'explosion', weight: 28 },
    { phrase: 'gas leak', weight: 24 },
    { phrase: 'smoke', weight: 16 },
    { phrase: 'flames', weight: 18 },
  ],
  medical: [
    { phrase: 'not breathing', weight: 34 },
    { phrase: 'unconscious', weight: 30 },
    { phrase: 'cardiac', weight: 30 },
    { phrase: 'seizure', weight: 26 },
    { phrase: 'blood', weight: 20 },
    { phrase: 'collapsed', weight: 16 },
    { phrase: 'allergic', weight: 16 },
  ],
  harassment: [
    { phrase: 'weapon', weight: 30 },
    { phrase: 'cornered', weight: 24 },
    { phrase: 'following me', weight: 18 },
    { phrase: 'followed', weight: 16 },
    { phrase: 'threatened', weight: 18 },
    { phrase: 'group of', weight: 14 },
  ],
  security: [
    { phrase: 'weapon', weight: 30 },
    { phrase: 'knife', weight: 28 },
    { phrase: 'gun', weight: 34 },
    { phrase: 'break-in', weight: 18 },
    { phrase: 'intruder', weight: 20 },
    { phrase: 'fight', weight: 16 },
  ],
  infrastructure: [
    { phrase: 'live wire', weight: 26 },
    { phrase: 'sparking', weight: 18 },
    { phrase: 'collapsed', weight: 22 },
    { phrase: 'flooding', weight: 16 },
    { phrase: 'elevator stuck', weight: 18 },
  ],
  other: [
    { phrase: 'injured', weight: 18 },
    { phrase: 'emergency', weight: 14 },
    { phrase: 'urgent', weight: 10 },
  ],
}

/** Only the strongest phrase matches count, so keyword stuffing cannot inflate a score. */
const MAX_PHRASE_FACTORS = 3

/** Night hours: fewer bystanders, slower discovery, higher real risk. */
export const NIGHT_START_HOUR = 22
export const NIGHT_END_HOUR = 6

/**
 * Whether an hour falls in the higher-risk night window (22:00–06:00).
 *
 * @example
 * isNightHour(23) // => true
 * isNightHour(14) // => false
 */
export function isNightHour(hour: number): boolean {
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/** Score bands chosen so a bare category never reaches P0 without corroboration. */
function toPriority(score: number): Severity {
  if (score >= 80) return 'P0'
  if (score >= 60) return 'P1'
  if (score >= 35) return 'P2'
  return 'P3'
}

/** "'not breathing' (+34), 'unconscious' (+30) and night-time hours (+8)" */
function joinReadably(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/**
 * Scores an incident report and explains itself.
 *
 * Deterministic rules rather than a model, on purpose: a triage decision made
 * during an emergency must be auditable, and a rules table can be reviewed by
 * campus security staff line by line.
 *
 * @example
 * triageIncident({
 *   category: 'medical',
 *   description: 'Student collapsed near the canteen, unconscious and not breathing',
 *   reportCount: 3,
 *   timeOfDay: 23,
 *   locationRisk: 0.3,
 * })
 * // => { priority: 'P0', score: 100, factors: [...], rationale: 'Priority P0 …' }
 */
export function triageIncident(input: TriageInput): TriageResult {
  const factors: TriageFactor[] = []
  const base = BASE_WEIGHTS[input.category]
  factors.push({
    name: 'category',
    weight: base,
    detail: `${input.category} baseline`,
  })

  const text = input.description.toLowerCase()
  const matched = LEXICONS[input.category]
    .filter(({ phrase }) => text.includes(phrase))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_PHRASE_FACTORS)

  for (const { phrase, weight } of matched) {
    factors.push({ name: 'keyword', weight, detail: `phrase "${phrase}"` })
  }

  // Corroboration: each extra independent report adds confidence, capped so a
  // duplicate-heavy feed cannot outrank a genuinely worded emergency.
  if (input.reportCount > 1) {
    const weight = Math.min((input.reportCount - 1) * 5, 20)
    factors.push({
      name: 'corroboration',
      weight,
      detail: `${input.reportCount} independent reports`,
    })
  }

  if (isNightHour(input.timeOfDay)) {
    factors.push({ name: 'time-of-day', weight: 8, detail: 'reported at night (22:00–06:00)' })

    // Harassment and security threats grow materially worse after dark —
    // isolated paths, no witnesses — so they get a second, targeted bump.
    if (input.category === 'harassment' || input.category === 'security') {
      factors.push({ name: 'night-threat', weight: 8, detail: `night-time ${input.category}` })
    }
  }

  if (input.locationRisk > 0) {
    const weight = Math.round(input.locationRisk * 15)
    if (weight > 0) {
      factors.push({
        name: 'location-risk',
        weight,
        detail: `location risk ${input.locationRisk.toFixed(2)}`,
      })
    }
  }

  const score = clamp(
    Math.round(factors.reduce((sum, factor) => sum + factor.weight, 0)),
    0,
    100,
  )
  const priority = toPriority(score)

  const contributors = factors
    .filter((factor) => factor.name !== 'category')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((factor) => `${factor.detail} (+${factor.weight})`)

  const rationale =
    contributors.length === 0
      ? `Priority ${priority} with score ${score}/100 — ${input.category} baseline (${base}) with no escalating factors.`
      : `Priority ${priority} with score ${score}/100 — ${input.category} baseline (${base}) escalated by ${joinReadably(contributors)}.`

  return { priority, score, factors, rationale }
}
