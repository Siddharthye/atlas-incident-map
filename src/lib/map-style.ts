import type { StyleSpecification } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import { campusGeoJSON } from '@/data/campus'

/**
 * Building fills by `kind`. Deliberately desaturated night-tones so incident
 * severity colors stay the only saturated thing on screen — the eye must always
 * land on the emergency first, never on architecture.
 */
export const BUILDING_COLORS = {
  academic: '#1a2436',
  hostel: '#1f2a44',
  public: '#17293a',
  medical: '#2a1f36',
  utility: '#332a1a',
  security: '#331d1d',
} as const

/** The sacred severity palette. Never remap these. */
export const SEVERITY_COLORS = {
  P0: '#ff453a',
  P1: '#ff9f0a',
  P2: '#ffd60a',
  P3: '#a78bfa',
} as const

export const CAMPUS_SOURCE = 'campus'

/**
 * A fully self-contained vector style: no tile servers, no remote style URL,
 * no glyphs. Everything renders from the bundled campus GeoJSON, so the map
 * works on an air-gapped demo laptop — a deliberate sales property.
 *
 * @example
 * new maplibregl.Map({ container, style: buildCampusStyle(), pitch: 55 })
 */
export function buildCampusStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      [CAMPUS_SOURCE]: {
        type: 'geojson',
        // The literal in data/campus.ts types `type` as plain string; the shape
        // is a valid FeatureCollection, so a single cast at this boundary.
        data: campusGeoJSON as unknown as FeatureCollection,
      },
    },
    layers: [
      {
        id: 'ground',
        type: 'background',
        paint: { 'background-color': '#08070c' },
      },
      {
        // Faint cyan footprint outlines read as "blueprint" — they ground the
        // extrusions so buildings never look like they float.
        id: 'building-outline',
        type: 'line',
        source: CAMPUS_SOURCE,
        paint: {
          'line-color': '#a78bfa',
          'line-opacity': 0.15,
          'line-width': 1.2,
        },
      },
      {
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: CAMPUS_SOURCE,
        paint: {
          'fill-extrusion-height': ['get', 'heightM'],
          'fill-extrusion-color': [
            'match',
            ['get', 'kind'],
            'academic', BUILDING_COLORS.academic,
            'hostel', BUILDING_COLORS.hostel,
            'public', BUILDING_COLORS.public,
            'medical', BUILDING_COLORS.medical,
            'utility', BUILDING_COLORS.utility,
            'security', BUILDING_COLORS.security,
            BUILDING_COLORS.academic,
          ],
          'fill-extrusion-opacity': 0.92,
          // Subtle darkening toward the base sells depth without lighting math.
          'fill-extrusion-vertical-gradient': true,
        },
      },
    ],
  }
}
