'use client'

import { useEffect, useState } from 'react'
import type { IncidentPoint } from '@/domain/types'

export type StreamStatus = 'connecting' | 'live' | 'offline'

/** Kept in memory client-side; the server holds the full history. */
const MAX_CLIENT_POINTS = 500

interface PointStream {
  points: IncidentPoint[]
  status: StreamStatus
  /** The most recently *streamed* P0, for camera focus. Null until one arrives. */
  latestP0: IncidentPoint | null
}

/**
 * Loads current incidents once, then keeps them live over SSE.
 *
 * `EventSource` reconnects by itself and replays `Last-Event-ID`, so a rotated
 * connection is invisible here — that is the whole reason the server closes
 * streams on a timer rather than holding them open indefinitely.
 *
 * @example
 * const { points, status, latestP0 } = usePointStream()
 */
export function usePointStream(): PointStream {
  const [points, setPoints] = useState<IncidentPoint[]>([])
  const [status, setStatus] = useState<StreamStatus>('connecting')
  const [latestP0, setLatestP0] = useState<IncidentPoint | null>(null)

  useEffect(() => {
    let cancelled = false

    // Initial snapshot via REST; the stream then only has to carry deltas.
    fetch('/api/points')
      .then((response) => response.json())
      .then((body: { points?: IncidentPoint[] }) => {
        if (!cancelled && Array.isArray(body.points)) setPoints(body.points)
      })
      .catch(() => {
        // The stream below will still populate new points; the map just starts
        // sparse instead of failing outright.
      })

    const source = new EventSource('/api/events')
    source.onopen = () => setStatus('live')
    source.onerror = () => setStatus('offline')

    source.addEventListener('point.created', (event) => {
      const point = JSON.parse((event as MessageEvent<string>).data) as IncidentPoint
      setStatus('live')
      setPoints((current) =>
        [point, ...current.filter((item) => item.id !== point.id)].slice(0, MAX_CLIENT_POINTS),
      )
      if (point.severity === 'P0') setLatestP0(point)
    })

    return () => {
      cancelled = true
      source.close()
    }
  }, [])

  return { points, status, latestP0 }
}
