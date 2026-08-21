'use client'

import { useMemo, useState } from 'react'
import type { Severity } from '@/domain/types'
import { usePointStream } from '@/hooks/use-point-stream'
import { SEVERITY_COLORS } from '@/lib/map-style'
import { CampusMap } from './CampusMap'
import { LiveFeed } from './LiveFeed'
import { TriagePanel } from './TriagePanel'

const SEVERITIES: Severity[] = ['P0', 'P1', 'P2', 'P3']

/**
 * The full ops console: map on the left, live feed and triage tester on the
 * right. All live state flows from a single `usePointStream`, so the map, the
 * ticker, and the counters can never disagree with each other.
 */
export function ConsoleShell({ storageBackend }: { storageBackend: string }) {
  const { points, status, latestP0 } = usePointStream()
  const [heatmap, setHeatmap] = useState(false)
  const [tilted, setTilted] = useState(true)

  const bySeverity = useMemo(() => {
    const counts: Record<Severity, number> = { P0: 0, P1: 0, P2: 0, P3: 0 }
    for (const point of points) counts[point.severity] += 1
    return counts
  }, [points])

  const focus = latestP0 ? { lat: latestP0.lat, lng: latestP0.lng, key: latestP0.id } : null

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ops-border px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <h1 className="text-base font-bold tracking-tight">
            ATLAS <span className="font-normal text-ops-muted">/ live incident map + triage</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <span className="font-mono text-ops-muted">{points.length} incidents</span>
          {SEVERITIES.map((severity) => (
            <span
              key={severity}
              className="flex items-center gap-1 rounded border border-ops-border px-1.5 py-0.5 font-mono"
              style={{ color: SEVERITY_COLORS[severity] }}
            >
              {severity} {bySeverity[severity]}
            </span>
          ))}
          <span className="rounded border border-ops-border px-2 py-0.5 font-mono text-ops-muted">
            storage: {storageBackend}
          </span>
          <a
            href="/widget?mode=map"
            className="rounded border border-ops-border px-2 py-0.5 text-ops-muted transition hover:border-ops-accent hover:text-ops-accent"
          >
            /widget ↗
          </a>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative min-h-[55dvh] min-w-0 flex-1 lg:min-h-0">
          <CampusMap points={points} heatmap={heatmap} tilted={tilted} focus={focus} />

          <div className="absolute left-3 top-3 flex gap-1.5">
            <MapToggle active={heatmap} onClick={() => setHeatmap((value) => !value)} label="HEAT" />
            <MapToggle active={tilted} onClick={() => setTilted((value) => !value)} label="3D" />
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto border-t border-ops-border p-3 lg:w-[21.5rem] lg:border-l lg:border-t-0">
          <TriagePanel />
          <LiveFeed points={points} status={status} />
        </aside>
      </div>
    </main>
  )
}

function MapToggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 rounded border px-3 py-1 text-[10px] font-bold tracking-wider transition sm:min-h-0 sm:px-2.5 ${
        active
          ? 'border-ops-accent/60 bg-ops-accent/15 text-ops-accent'
          : 'border-ops-border bg-ops-panel/90 text-ops-muted hover:border-ops-muted'
      }`}
    >
      {label}
    </button>
  )
}
