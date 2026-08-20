'use client'

import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import { CAMPUS_CENTRE } from '@/data/campus'
import type { IncidentPoint } from '@/domain/types'
import {
  CIRCLE_LAYER_IDS,
  INCIDENTS_RAW_SOURCE,
  INCIDENTS_SOURCE,
  incidentLayers,
  incidentSource,
  toFeatureCollection,
} from '@/lib/map-layers'
import { buildCampusStyle } from '@/lib/map-style'

/** Only the four wayfinding anchors get labels — more would read as clutter. */
const LABELED_BUILDINGS = [
  { name: 'Central Library', lat: 20.353959, lng: 85.820075 },
  { name: 'Hostel 9', lat: 20.351893, lng: 85.820267 },
  { name: 'Block C', lat: 20.3536, lng: 85.818925 },
  { name: 'Medical Centre', lat: 20.354948, lng: 85.818925 },
]

/** Labels appear once buildings are large enough to visually own them. */
const LABEL_MIN_ZOOM = 16
const PULSE_PERIOD_MS = 1500

export interface CampusMapProps {
  points: IncidentPoint[]
  /** Heat view replaces circles; the P0 pulse stays visible in both. */
  heatmap?: boolean
  /** 3D perspective on/off. Off eases to a flat top-down view. */
  tilted?: boolean
  /** When `key` changes the camera eases here — used for arriving P0s. */
  focus?: { lat: number; lng: number; key: string } | null
}

/**
 * The live 3D campus map. Entirely self-contained: vector buildings from
 * bundled GeoJSON, no tile servers, no glyphs, no network at all.
 *
 * @example
 * <CampusMap points={points} heatmap={false} tilted focus={latestP0} />
 */
export function CampusMap({ points, heatmap = false, tilted = true, focus = null }: CampusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const readyRef = useRef(false)

  // Latest props, readable from the one-time 'load' handler without re-running
  // the init effect (recreating the map on every point would be catastrophic).
  const pointsRef = useRef(points)
  pointsRef.current = points
  const heatmapRef = useRef(heatmap)
  heatmapRef.current = heatmap

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = new maplibregl.Map({
      container,
      style: buildCampusStyle(),
      center: [CAMPUS_CENTRE.lng, CAMPUS_CENTRE.lat],
      zoom: 16.1,
      pitch: 55,
      bearing: -18,
      attributionControl: false,
    })
    mapRef.current = map

    let frame = 0
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    map.on('load', () => {
      const data = toFeatureCollection(pointsRef.current)
      map.addSource(INCIDENTS_SOURCE, incidentSource(data, true))
      map.addSource(INCIDENTS_RAW_SOURCE, incidentSource(data, false))
      for (const layer of incidentLayers()) map.addLayer(layer)
      readyRef.current = true
      applyHeatmap(map, heatmapRef.current)

      // Building labels are DOM markers, not symbol layers — symbol text needs
      // remote glyphs, and ATLAS must render with zero network access.
      const markers = LABELED_BUILDINGS.map(({ name, lat, lng }) => {
        const el = document.createElement('div')
        el.className =
          'pointer-events-none rounded border border-ops-border bg-ops-bg/85 px-1.5 py-0.5 ' +
          'text-[9px] font-bold uppercase tracking-wider text-ops-muted'
        el.textContent = name
        return new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map)
      })
      const syncLabels = () => {
        const visible = map.getZoom() >= LABEL_MIN_ZOOM
        for (const marker of markers) marker.getElement().style.visibility = visible ? '' : 'hidden'
      }
      map.on('zoom', syncLabels)
      syncLabels()

      // P0 pulse: an expanding, fading ring. Animating paint properties from a
      // single rAF loop is transform-cheap at this feature count.
      if (!reduceMotion) {
        const animate = (time: number) => {
          const t = (time % PULSE_PERIOD_MS) / PULSE_PERIOD_MS
          if (map.getLayer('points-pulse')) {
            map.setPaintProperty('points-pulse', 'circle-radius', 8 + t * 16)
            map.setPaintProperty('points-pulse', 'circle-stroke-opacity', 0.55 * (1 - t))
          }
          frame = requestAnimationFrame(animate)
        }
        frame = requestAnimationFrame(animate)
      }
    })

    return () => {
      cancelAnimationFrame(frame)
      readyRef.current = false
      mapRef.current = null
      map.remove()
    }
  }, [])

  // Live updates: push new data into both sources instead of touching layers.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return

    const data = toFeatureCollection(points)
    for (const id of [INCIDENTS_SOURCE, INCIDENTS_RAW_SOURCE]) {
      const source = map.getSource(id) as maplibregl.GeoJSONSource | undefined
      source?.setData(data)
    }
  }, [points])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    applyHeatmap(map, heatmap)
  }, [heatmap])

  useEffect(() => {
    mapRef.current?.easeTo({
      pitch: tilted ? 55 : 0,
      bearing: tilted ? -18 : 0,
      duration: 600,
    })
  }, [tilted])

  // A new P0 pulls the camera to it — the operator should never miss one.
  useEffect(() => {
    if (!focus) return
    mapRef.current?.easeTo({
      center: [focus.lng, focus.lat],
      zoom: 16.8,
      duration: 1200,
    })
  }, [focus?.key])

  return <div ref={containerRef} className="h-full w-full" aria-label="Live campus incident map" />
}

function applyHeatmap(map: maplibregl.Map, heatmap: boolean): void {
  map.setLayoutProperty('points-heat', 'visibility', heatmap ? 'visible' : 'none')
  for (const id of CIRCLE_LAYER_IDS) {
    map.setLayoutProperty(id, 'visibility', heatmap ? 'none' : 'visible')
  }
}
