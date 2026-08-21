'use client'

import { useState } from 'react'
import { CAMPUS_FLOORS, FLOOR_WINGS, type FloorId } from '@/data/floorplan'
import { FloorPlan3D, type FloorSelection } from './FloorPlan3D'

/**
 * The Campus 25 building interior — the same interactive isometric plan the
 * AEGIS report screen uses, byte-for-byte: three floors on one structural
 * grid, wing filters, pointer orbit, zoom/pan/fullscreen, hover readout.
 *
 * Here it demonstrates ATLAS's indoor half: the outdoor map answers "where
 * on campus", this answers "which door on which floor".
 */
export function InteriorPlan() {
  const [floor, setFloor] = useState<FloorId>(2)
  const [wing, setWing] = useState<'A' | 'B' | 'C' | null>(null)
  const [selection, setSelection] = useState<FloorSelection | null>(null)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-3 pt-14">
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <p className="ops-label text-ops-muted">
          Campus 25 · {CAMPUS_FLOORS.find((entry) => entry.id === floor)?.label}
          {selection && <span className="ml-2 text-ops-accent">{selection.label}</span>}
        </p>

        <span className="ml-auto flex flex-wrap items-center gap-2">
          {CAMPUS_FLOORS.map((entry) => (
            <PlanChip
              key={entry.id}
              active={floor === entry.id}
              onClick={() => setFloor(entry.id)}
              title={
                entry.surveyed
                  ? 'Transcribed from the published plan'
                  : 'Same structural grid, room numbers derived'
              }
            >
              F{entry.id}
            </PlanChip>
          ))}
          <span aria-hidden className="mx-0.5 h-4 w-px bg-ops-border" />
          <PlanChip active={wing === null} onClick={() => setWing(null)}>
            All
          </PlanChip>
          {FLOOR_WINGS.map((entry) => (
            <PlanChip
              key={entry.id}
              active={wing === entry.id}
              onClick={() => setWing(wing === entry.id ? null : entry.id)}
              title={entry.hint}
            >
              {entry.label}
            </PlanChip>
          ))}
        </span>
      </div>

      <FloorPlan3D
        floor={floor}
        selectedId={selection?.space.id ?? null}
        onSelect={setSelection}
        wing={wing}
        className="h-[300px] shrink-0 sm:h-[400px] xl:h-[470px]"
      />

    </div>
  )
}

/** The AEGIS chip, exactly: mono label pill, accent-tinted while active. */
function PlanChip({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`ops-label inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-ops-border px-3 py-1 transition-colors hover:bg-ops-panel sm:min-h-0 sm:px-2.5 ${
        active ? 'bg-[#a78bfa26] text-ops-accent' : 'text-ops-muted'
      }`}
    >
      {children}
    </button>
  )
}
