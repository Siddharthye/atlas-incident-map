'use client'

import type { IncidentPoint } from '@/domain/types'
import type { StreamStatus } from '@/hooks/use-point-stream'
import { SeverityBadge } from './SeverityBadge'

const STATUS_LABEL: Record<StreamStatus, { text: string; className: string }> = {
  connecting: { text: 'connecting', className: 'text-ops-muted' },
  live: { text: 'live', className: 'text-emerald-400' },
  offline: { text: 'reconnecting', className: 'text-sev-p1' },
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/**
 * The right-rail incident ticker. Shares the exact array the map renders, so a
 * point arriving over SSE appears in both surfaces in the same frame.
 */
export function LiveFeed({ points, status }: { points: IncidentPoint[]; status: StreamStatus }) {
  const indicator = STATUS_LABEL[status]
  const visible = points.slice(0, 30)

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-ops-border bg-ops-panel p-3">
      <header className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-[10px] font-bold uppercase tracking-wider">Incident feed</h2>
        <span className={`flex items-center gap-1 text-[10px] ${indicator.className}`}>
          <span
            className={`inline-block size-1.5 rounded-full bg-current ${
              status === 'live' ? 'siren-pulse' : ''
            }`}
          />
          {indicator.text}
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {visible.length === 0 ? (
          <p className="py-8 text-center text-[11px] text-ops-muted">
            Waiting for the first report — POST /api/points to see it land here live.
          </p>
        ) : (
          visible.map((point) => (
            <article
              key={point.id}
              className={`rounded border bg-ops-bg/60 p-2 ${
                point.severity === 'P0' ? 'border-sev-p0/50' : 'border-ops-border'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <SeverityBadge severity={point.severity} compact />
                <span className="font-mono text-[10px] text-ops-muted">
                  {formatTime(point.createdAt)}
                </span>
              </div>
              <p className="mt-1 truncate text-[11px] leading-snug">
                {point.label || `${point.category} incident`}
              </p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-ops-muted">
                {point.category} · {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
