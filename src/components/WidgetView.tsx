'use client'

import { usePointStream } from '@/hooks/use-point-stream'
import { CampusMap } from './CampusMap'

/**
 * The bare embeddable map: full viewport, no rail, no controls. Everything is
 * fixed by the URL so a host page cannot end up in a broken UI state.
 */
export function WidgetView({ mode }: { mode: 'map' | 'heat' }) {
  const { points, latestP0 } = usePointStream()
  const focus = latestP0 ? { lat: latestP0.lat, lng: latestP0.lng, key: latestP0.id } : null

  return (
    <div className="fixed inset-0">
      <CampusMap points={points} heatmap={mode === 'heat'} tilted focus={focus} />
      <span className="pointer-events-none absolute bottom-2 right-2 rounded border border-ops-border bg-ops-bg/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ops-muted">
        ATLAS live
      </span>
    </div>
  )
}
