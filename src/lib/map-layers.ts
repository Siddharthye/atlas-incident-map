import type { GeoJSONSourceSpecification, LayerSpecification } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import type { IncidentPoint } from '@/domain/types'
import { SEVERITY_COLORS } from './map-style'

/** Clustered source drives circles; the raw twin drives heatmap + P0 pulse. */
export const INCIDENTS_SOURCE = 'incidents'
export const INCIDENTS_RAW_SOURCE = 'incidents-raw'

/** Incidents as a GeoJSON FeatureCollection, ready for `setData`. */
export function toFeatureCollection(points: readonly IncidentPoint[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: points.map((point) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
      properties: {
        id: point.id,
        severity: point.severity,
        category: point.category,
        label: point.label ?? '',
      },
    })),
  }
}

export function incidentSource(data: FeatureCollection<Point>, cluster: boolean): GeoJSONSourceSpecification {
  return cluster ? { type: 'geojson', data, cluster: true, clusterRadius: 42 } : { type: 'geojson', data }
}

/** Layers hidden when the heatmap takes over (clusters swallow raw points). */
export const CIRCLE_LAYER_IDS = ['clusters-glow', 'clusters', 'points-halo', 'points-core'] as const

/**
 * Incident layer stack, bottom to top. Circles only — text symbols would need
 * remote glyphs, which would break the zero-network guarantee.
 */
export function incidentLayers(): LayerSpecification[] {
  return [
    {
      // Wide translucent disc beneath clusters: reads as a cyan glow.
      id: 'clusters-glow',
      type: 'circle',
      source: INCIDENTS_SOURCE,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#38bdf8',
        'circle-opacity': 0.16,
        'circle-blur': 0.7,
        'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 12, 30],
      },
    },
    {
      id: 'clusters',
      type: 'circle',
      source: INCIDENTS_SOURCE,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#123047',
        'circle-stroke-color': '#38bdf8',
        'circle-stroke-width': 2,
        'circle-radius': ['step', ['get', 'point_count'], 10, 5, 14, 12, 18],
      },
    },
    {
      // Soft severity-tinted halo under each point makes markers feel lit
      // rather than pasted on — two layers is cheaper than a custom shader.
      id: 'points-halo',
      type: 'circle',
      source: INCIDENTS_SOURCE,
      filter: ['!', ['has', 'point_count']],
      paint: {
        // The severity → color match is inlined (not shared) because maplibre's
        // expression types only narrow tuple literals contextually.
        'circle-color': [
          'match', ['get', 'severity'],
          'P0', SEVERITY_COLORS.P0, 'P1', SEVERITY_COLORS.P1,
          'P2', SEVERITY_COLORS.P2, 'P3', SEVERITY_COLORS.P3,
          SEVERITY_COLORS.P3,
        ],
        'circle-opacity': 0.22,
        'circle-blur': 1,
        'circle-radius': 11,
      },
    },
    {
      id: 'points-core',
      type: 'circle',
      source: INCIDENTS_SOURCE,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'match', ['get', 'severity'],
          'P0', SEVERITY_COLORS.P0, 'P1', SEVERITY_COLORS.P1,
          'P2', SEVERITY_COLORS.P2, 'P3', SEVERITY_COLORS.P3,
          SEVERITY_COLORS.P3,
        ],
        'circle-radius': 4.5,
        'circle-stroke-color': '#05070d',
        'circle-stroke-width': 1.5,
      },
    },
    {
      // Severity-weighted heatmap over the *raw* source: cluster features have
      // no severity property, so weighting through the clustered source would
      // silently flatten the picture.
      id: 'points-heat',
      type: 'heatmap',
      source: INCIDENTS_RAW_SOURCE,
      layout: { visibility: 'none' },
      paint: {
        'heatmap-weight': [
          'match', ['get', 'severity'],
          'P0', 1, 'P1', 0.7, 'P2', 0.45, 'P3', 0.25, 0.3,
        ],
        'heatmap-radius': 42,
        'heatmap-intensity': 1.1,
        'heatmap-opacity': 0.85,
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(5,7,13,0)',
          0.2, '#123047',
          0.4, '#38bdf8',
          0.6, '#eab308',
          0.8, '#f97316',
          1, '#ef4444',
        ],
      },
    },
    {
      // P0 pulse ring — radius/opacity animated from a rAF loop via
      // setPaintProperty. Visible in both map and heat modes on purpose:
      // a life-threatening incident must never be hidden by a view toggle.
      id: 'points-pulse',
      type: 'circle',
      source: INCIDENTS_RAW_SOURCE,
      filter: ['==', ['get', 'severity'], 'P0'],
      paint: {
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-color': SEVERITY_COLORS.P0,
        'circle-stroke-width': 2,
        'circle-stroke-opacity': 0.5,
        'circle-radius': 8,
      },
    },
  ]
}
