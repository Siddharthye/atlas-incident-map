'use client'

import { useState } from 'react'
import { CATEGORIES, type Category, type TriageResult } from '@/domain/types'
import { SEVERITY_COLORS } from '@/lib/map-style'
import { SeverityBadge } from './SeverityBadge'

const PRESET = {
  category: 'medical' as Category,
  description: 'Student collapsed near the canteen, unconscious and not breathing',
}

/**
 * Interactive tester for the triage engine — the panel judges poke at when
 * they ask "explain a triage decision". The factor bars and rationale are the
 * engine literally showing its working.
 */
export function TriagePanel() {
  const [category, setCategory] = useState<Category>(PRESET.category)
  const [description, setDescription] = useState(PRESET.description)
  const [reportCount, setReportCount] = useState(3)
  const [result, setResult] = useState<TriageResult | null>(null)
  const [isScoring, setIsScoring] = useState(false)

  const score = async () => {
    setIsScoring(true)
    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, description, reportCount }),
      })
      if (response.ok) setResult((await response.json()) as TriageResult)
    } finally {
      setIsScoring(false)
    }
  }

  const maxWeight = Math.max(1, ...(result?.factors.map((factor) => factor.weight) ?? []))

  return (
    <section className="rounded-lg border border-ops-border bg-ops-panel p-3">
      <h2 className="text-[10px] font-bold uppercase tracking-wider">Triage engine</h2>
      <p className="mt-0.5 text-[10px] text-ops-muted">
        Describe an incident. The rules engine scores it and explains itself.
      </p>

      <div className="mt-2 space-y-2">
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as Category)}
            className="flex-1 rounded border border-ops-border bg-ops-bg px-2 py-1.5 text-xs outline-none focus:border-ops-accent"
          >
            {CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-[10px] text-ops-muted">
            reports
            <input
              type="number"
              min={1}
              max={50}
              value={reportCount}
              onChange={(event) => setReportCount(Math.max(1, Number(event.target.value) || 1))}
              className="w-14 rounded border border-ops-border bg-ops-bg px-2 py-1.5 font-mono text-xs outline-none focus:border-ops-accent"
            />
          </label>
        </div>

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="What is happening?"
          className="w-full resize-none rounded border border-ops-border bg-ops-bg px-2 py-1.5 text-xs leading-relaxed outline-none focus:border-ops-accent"
        />

        <button
          type="button"
          onClick={score}
          disabled={isScoring || description.trim() === ''}
          className="w-full rounded border border-ops-accent/40 bg-ops-accent/10 py-1.5 text-[11px] font-bold tracking-wide text-ops-accent transition hover:bg-ops-accent/20 disabled:opacity-40"
        >
          {isScoring ? 'SCORING…' : 'RUN TRIAGE'}
        </button>
      </div>

      {result && (
        <div className="mt-3 space-y-2 border-t border-ops-border pt-3">
          <div className="flex items-center justify-between">
            <SeverityBadge severity={result.priority} />
            <span className="font-mono text-lg font-bold" style={{ color: SEVERITY_COLORS[result.priority] }}>
              {result.score}
              <span className="text-[10px] text-ops-muted">/100</span>
            </span>
          </div>

          <div className="space-y-1">
            {result.factors.map((factor, index) => (
              <div key={`${factor.name}-${index}`} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-[9px] uppercase tracking-wider text-ops-muted">
                  {factor.name}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ops-bg">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(factor.weight / maxWeight) * 100}%`,
                      background: SEVERITY_COLORS[result.priority],
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right font-mono text-[10px] text-ops-text">
                  +{factor.weight}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[11px] leading-relaxed text-ops-muted">{result.rationale}</p>
        </div>
      )}
    </section>
  )
}
