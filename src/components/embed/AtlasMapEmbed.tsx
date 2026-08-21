'use client'

/**
 * AtlasMapEmbed — copy THIS ONE FILE into any React app.
 *
 * Deliberately self-contained: no imports from the ATLAS codebase, no maplibre
 * in your bundle. The map renders inside an iframe served by your ATLAS
 * instance, and live incidents are surfaced to your code through `onPoint` via
 * the same SSE stream the map itself uses.
 *
 * @example
 * <AtlasMapEmbed
 *   baseUrl="http://localhost:4102"
 *   mode="map"
 *   height={420}
 *   onPoint={(point) => console.log('incident', point.severity, point.label)}
 * />
 */

import { useEffect } from 'react'

/** Mirror of the ATLAS incident shape, redeclared so this file stands alone. */
export interface AtlasPoint {
  id: string
  lat: number
  lng: number
  category: 'fire' | 'medical' | 'harassment' | 'infrastructure' | 'security' | 'other'
  severity: 'P0' | 'P1' | 'P2' | 'P3'
  label?: string
  meta?: Record<string, unknown>
  createdAt: string
}

export interface AtlasMapEmbedProps {
  /** Origin of your ATLAS instance, e.g. "http://localhost:4102". */
  baseUrl: string
  /** "map" for clustered severity pins, "heat" for the severity heatmap. */
  mode?: 'map' | 'heat'
  /** Pixel height of the embed. Width fills the container. */
  height?: number | string
  /** Called for every incident created anywhere on campus, as it happens. */
  onPoint?: (point: AtlasPoint) => void
  className?: string
}

export function AtlasMapEmbed({
  baseUrl,
  mode = 'map',
  height = 420,
  onPoint,
  className,
}: AtlasMapEmbedProps) {
  const origin = baseUrl.replace(/\/+$/, '')

  useEffect(() => {
    if (!onPoint) return

    // EventSource reconnects on its own and resumes via Last-Event-ID, so the
    // callback survives ATLAS's deliberate 50s stream rotations untouched.
    const source = new EventSource(`${origin}/api/events`)
    source.addEventListener('point.created', (event) => {
      onPoint(JSON.parse((event as MessageEvent<string>).data) as AtlasPoint)
    })

    return () => source.close()
  }, [origin, onPoint])

  return (
    <iframe
      src={`${origin}/widget?mode=${mode}`}
      title="ATLAS live incident map"
      className={className}
      style={{ border: 0, width: '100%', height, display: 'block', background: '#08070c' }}
      loading="lazy"
    />
  )
}
