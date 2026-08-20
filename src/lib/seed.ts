import type { Category, IncidentPoint, Severity } from '@/domain/types'

/**
 * A week of demo incidents, hand-placed against real building footprints.
 *
 * Deliberately clustered around Hostel 9 and Block C so `/api/hotspots` returns
 * repeat zones from the very first request — a buyer sees the hotspot engine
 * working without having to fabricate weeks of data themselves. Hardcoded (not
 * generated) so anyone can read exactly what the demo shows.
 *
 * Row shape: [hoursAgo, category, severity, lat, lng, label]
 */
type SeedRow = [number, Category, Severity, number, number, string]

const ROWS: SeedRow[] = [
  // ── Hostel 9 cluster: night harassment corridor + one live medical P0 ──
  [2, 'medical', 'P0', 20.35192, 85.8203, 'Student unconscious — Hostel 9 stairwell'],
  [9, 'harassment', 'P1', 20.35186, 85.82024, 'Followed on hostel approach road'],
  [27, 'harassment', 'P2', 20.35187, 85.82033, 'Catcalling near Hostel 9 gate'],
  [51, 'harassment', 'P1', 20.35193, 85.82021, 'Group blocking path after midnight'],
  [76, 'security', 'P2', 20.35181, 85.82028, 'Unknown person loitering at cycle stand'],
  [122, 'harassment', 'P2', 20.35195, 85.82036, 'Verbal abuse reported near mess'],
  [148, 'infrastructure', 'P3', 20.35184, 85.82019, 'Streetlight out behind Hostel 9'],

  // ── Block C cluster: fire scare plus the electrical faults that caused it ──
  [5, 'fire', 'P0', 20.35362, 85.81895, 'Smoke on 3rd floor — Block C east wing'],
  [8, 'fire', 'P1', 20.35357, 85.81888, 'Burning smell in Block C corridor'],
  [30, 'infrastructure', 'P2', 20.35355, 85.81899, 'Sparking socket in Lab C-204'],
  [55, 'infrastructure', 'P2', 20.35364, 85.81885, 'Flickering mains — Block C server room'],
  [101, 'fire', 'P2', 20.35368, 85.81893, 'Overheated projector, smoke smell'],
  [140, 'infrastructure', 'P3', 20.35352, 85.8189, 'AC unit leaking onto switchboard'],

  // ── Canteen: food-related medical repeats ──
  [12, 'medical', 'P2', 20.35335, 85.82077, 'Allergic reaction at Main Canteen'],
  [70, 'medical', 'P2', 20.35331, 85.82072, 'Student fainted in lunch queue'],
  [155, 'medical', 'P3', 20.35336, 85.82079, 'Minor burn at serving counter'],

  // ── Central Library ──
  [18, 'security', 'P2', 20.35398, 85.82009, 'Bag theft from reading hall'],
  [88, 'other', 'P3', 20.35393, 85.82003, 'Lost wallet near library entrance'],
  [133, 'security', 'P3', 20.35401, 85.82011, 'Tailgating through library turnstile'],

  // ── Hostel 7 ──
  [21, 'infrastructure', 'P2', 20.35191, 85.81818, 'Elevator stuck between floors'],
  [64, 'infrastructure', 'P3', 20.35186, 85.81812, 'Water leak in Hostel 7 pantry'],
  [126, 'medical', 'P2', 20.35194, 85.81821, 'Sports injury, suspected fracture'],

  // ── Gate 3 security post ──
  [15, 'security', 'P1', 20.35568, 85.82095, 'Unauthorised vehicle at Gate 3'],
  [96, 'security', 'P2', 20.35564, 85.8209, 'Scuffle at gate during fest exit'],

  // ── Utility & Power House ──
  [34, 'infrastructure', 'P1', 20.35262, 85.82143, 'Live wire exposed near power house'],
  [108, 'infrastructure', 'P2', 20.35259, 85.82139, 'Transformer humming loudly'],

  // ── Auditorium ──
  [42, 'medical', 'P2', 20.35478, 85.82018, 'Crowd crush scare at audi exit'],
  [117, 'other', 'P3', 20.35474, 85.82013, 'Projector rig left unsecured'],

  // ── Campus Medical Centre ──
  [47, 'infrastructure', 'P3', 20.35496, 85.81894, 'Ambulance bay blocked by parking'],
  [138, 'other', 'P3', 20.35492, 85.81889, 'Wheelchair ramp railing loose'],

  // ── Block A ──
  [58, 'harassment', 'P2', 20.35469, 85.81779, 'Persistent unwanted messages, met in person'],
  [144, 'infrastructure', 'P3', 20.35465, 85.81774, 'Ceiling tile fell in A-lobby'],

  // ── Sports Pavilion ──
  [37, 'medical', 'P1', 20.35092, 85.822, 'Player collapsed on field, conscious'],
  [110, 'other', 'P3', 20.35088, 85.82195, 'Floodlight glass shattered on track'],

  // ── Hostel 8 ──
  [61, 'fire', 'P2', 20.35191, 85.81922, 'Short circuit smell — Hostel 8 wing B'],
  [130, 'security', 'P3', 20.35187, 85.81917, 'Bicycle theft from Hostel 8 stand'],

  // ── Scattered singles across paths and open ground ──
  [24, 'harassment', 'P1', 20.35279, 85.81964, 'Stalking reported on inner road'],
  [82, 'security', 'P2', 20.35418, 85.82134, 'Drone flying over restricted area'],
  [104, 'other', 'P3', 20.35311, 85.81851, 'Stray dog pack near cycle path'],
  [160, 'infrastructure', 'P2', 20.35505, 85.82063, 'Pothole flooding after rain'],
]

/**
 * Materialises the seed rows into stored points. Timestamps are computed
 * relative to first read, so hotspot windows behave the same on any demo day.
 */
export function buildSeedPoints(now: Date = new Date()): IncidentPoint[] {
  return ROWS.map(([hoursAgo, category, severity, lat, lng, label], index) => ({
    id: `seed-${String(index + 1).padStart(2, '0')}`,
    lat,
    lng,
    category,
    severity,
    label,
    meta: { source: 'seed' },
    createdAt: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString(),
  }))
}
