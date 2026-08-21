/**
 * The shapes the Campus 25 map draws on top of the plan.
 *
 * ATLAS renders these overlays; it does not compute them. Pattern detection
 * and route scoring live in the platform that owns the incident history —
 * this module takes the finished result and draws it, which is why only the
 * fields the map actually reads are declared here.
 *
 * They match the wire format AEGIS emits from `GET /api/risk` and
 * `GET /api/safe-walk`, so a host can pass those responses straight through.
 */

import type { Point } from '@/data/campus25'

/** A place that keeps producing reports, in one three-hour band. */
export interface RiskPattern {
  id: string
  centre: Point
  /** Reporter-facing summary, e.g. "North path · 21:00–00:00 · 7 reports". */
  headline: string
  category: string
  /** 0–1. How strongly this pattern should colour the map. */
  weight: number
  /** How many different people reported it — the map labels this. */
  distinctReporters: number
}

/** One walking route, already scored by the host. */
export interface RouteRisk {
  route: { id: string; name: string; lit: boolean; path: readonly Point[] }
  /** 0–1, higher is worse. Drives the route's colour. */
  risk: number
  /** Patterns the route passes through; empty means only lighting counts. */
  passes: readonly RiskPattern[]
  /** Plain-language justification shown when the route is pointed at. */
  reason: string
}

/** A walk in progress, drawn as a live trail. */
export interface SafeWalk {
  id: string
  status: 'walking' | 'escalated' | 'arrived' | 'cancelled'
  /** Position fixes so far; the last one is the live marker. */
  path: readonly Point[]
}
