# ATLAS — Live Incident Map + Severity Triage Engine

**A gorgeous live 3D campus map AND an explainable triage brain — buy it for either, get both.**

ATLAS is the situational-awareness module of the AEGIS campus emergency family.
It answers the two questions a control room asks about every report: *where is
it?* (a live, clustered, severity-colored 3D map that animates incidents in as
they happen) and *how bad is it?* (a deterministic triage engine that scores
0–100, assigns P0–P3, and explains its reasoning in one readable sentence).
The map needs zero API keys, zero tile servers, and zero network access — it
demos flawlessly on hotel Wi-Fi and air-gapped judging laptops alike.

---

## 60-second quickstart

```bash
npm install
npm run dev        # http://localhost:4102 — a week of seeded incidents, live hotspots, 2 P0s
```

Then score your first incident:

```bash
curl -X POST http://localhost:4102/api/triage \
  -H 'Content-Type: application/json' \
  -d '{"category":"medical","description":"Student collapsed, unconscious and not breathing","reportCount":3}'
```

```json
{
  "priority": "P0",
  "score": 100,
  "factors": [
    { "name": "category", "weight": 48, "detail": "medical baseline" },
    { "name": "keyword", "weight": 34, "detail": "phrase \"not breathing\"" },
    { "name": "keyword", "weight": 30, "detail": "phrase \"unconscious\"" },
    { "name": "keyword", "weight": 16, "detail": "phrase \"collapsed\"" },
    { "name": "corroboration", "weight": 10, "detail": "3 independent reports" }
  ],
  "rationale": "Priority P0 with score 100/100 — medical baseline (48) escalated by phrase \"not breathing\" (+34), phrase \"unconscious\" (+30) and phrase \"collapsed\" (+16)."
}
```

Verify everything in one go: `npm run smoke` (16 PASS/FAIL checks, every endpoint).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/points` | Pin an incident: `{ lat, lng, category, severity?, label?, meta? }`. Broadcasts `point.created` to every open map. |
| `GET` | `/api/points?since=&category=` | List incidents, newest first. `since` accepts ISO-8601 or epoch ms. |
| `GET` | `/api/events` | Server-sent events (`point.created`). Auto-resume via `Last-Event-ID`; `?since=` for manual cursors. |
| `POST` | `/api/triage` | Score a report: `{ category, description, reportCount?, timeOfDay?, locationRisk? }` → `{ priority, score, factors[], rationale }`. Stateless. |
| `GET` | `/api/hotspots?windowDays=7` | ~40m grid cells where incidents repeat, sorted by count, each with centre + dominant category. |
| `GET` | `/api/stats` | Point counts, by-category, by-severity, hotspot count, storage backend. |
| `GET` | `/api/health` | Liveness probe. |

Categories: `fire · medical · harassment · infrastructure · security · other`.
Severities: `P0` (#ef4444) · `P1` (#f97316) · `P2` (#eab308) · `P3` (#38bdf8) — the AEGIS-wide palette.
Errors always arrive as `{ "error": "...", "details": ... }` with a proper status code.
CORS is open on every `/api/*` route: call ATLAS straight from any browser app.

## Embedding the map

**Any stack — one iframe:**

```html
<iframe src="http://localhost:4102/widget?mode=map"
        style="border:0;width:100%;height:420px"></iframe>
<!-- mode=heat for the severity-weighted heatmap -->
```

**React — copy one file** (`src/components/embed/AtlasMapEmbed.tsx`, no
dependencies beyond React, no maplibre in your bundle):

```tsx
import { AtlasMapEmbed } from './AtlasMapEmbed'

<AtlasMapEmbed
  baseUrl="http://localhost:4102"
  mode="map"
  height={420}
  onPoint={(point) => toast(`${point.severity}: ${point.label}`)}
/>
```

`onPoint` fires for every incident created anywhere on campus, live — your app
gets the data feed even if you never show the map.

## Architecture notes

- **Zero-network map.** The MapLibre style is built inline from bundled campus
  GeoJSON: vector building extrusions colored by kind, no raster tiles, no
  remote style URL, no glyph server (labels are DOM markers, not symbol
  layers). Nothing to rate-limit you mid-demo.
- **Serverless-safe SSE.** `/api/events` deliberately closes each stream after
  ~50s — just under typical serverless function limits — and `EventSource`
  reconnects with `Last-Event-ID`, resuming from an append-only event log with
  zero loss. Live updates that survive Vercel.
- **Storage adapter pair.** One five-method interface, two implementations:
  in-memory with best-effort JSON persistence to `./.data` (the default — clone
  and run), and Upstash Redis (set two env vars, nothing else changes).
- **Pure domain core.** Triage and hotspot bucketing live in `src/domain/` with
  no I/O and no framework imports — auditable line by line, portable to any
  runtime, unit-testable without a server.
- **Explainability as a feature.** Triage is a weighted rules table, not a
  model: per-category keyword lexicons, corroboration capped against duplicate
  floods, a 22:00–06:00 night factor (harassment/security escalate further),
  and location-risk passthrough. Every decision returns its factor list and a
  human sentence — when someone asks "why is this P0?", the API already
  answered.
- **First-read seeding.** A hardcoded week of 40 incidents (clustered around
  Hostel 9 and Block C so hotspots are non-empty from request one) seeds on
  first read, same pattern as its sibling SIREN.

## Why this is hard to rebuild

- **The map is genuinely offline.** Getting a *good-looking* 3D map without
  Mapbox tokens, tile servers, or glyph CDNs means hand-building a vector
  style, extrusion palette, cluster/halo/pulse layer stack, and DOM-marker
  labels from scratch — a full day of MapLibre esoterica already burned here.
- **Live without WebSockets.** The SSE rotation + cursor-resume pattern is
  subtle to get right (heartbeats, `retry:`, `Last-Event-ID` replay, an
  append-only log) and it is what keeps the map real-time on serverless hosts
  where naive sockets die silently.
- **Triage you can defend.** Anyone can call an LLM; a rules engine that a
  security office can audit, that returns its factor math, and that
  deterministically reproduces every decision is a different product — and it
  is already tuned against realistic campus scenarios.
- **It is two products.** Rip out the map, the triage engine stands alone as an
  intake-scoring API. Rip out triage, the map is a drop-in live ops display for
  any incident source. Integrations pay twice.

## Project layout

```
src/domain/      pure logic: triage rules, hotspot bucketing, types
src/lib/         services: schemas, seed, point service, map style/layers
src/app/api/     thin routes (points, events, triage, hotspots, stats, health)
src/app/         console (/) and embeddable widget (/widget)
src/components/  map, console UI, and the copy-paste React embed
src/store/       storage adapter pair (memory + Upstash Redis)
```

All configuration is optional — see `.env.example`.
