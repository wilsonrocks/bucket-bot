import { Component, type ReactNode, useState } from 'react'
import { CardFace, cardTitle } from '../card-face'
import type { Card } from '../cards'
import { fateOf, SUITS } from '../fate'
import { parseCard } from '../parse-cards'

/** The card face at an adjustable width, plus what the rest of the site would make of it. */
export function Preview({ card, year }: { card: Card; year: number }) {
  const [width, setWidth] = useState(400)
  // Remounting the face replays its fade-in, which otherwise only runs on mount.
  const [replays, setReplays] = useState(0)
  const valid = parseCard(card) !== null
  const fate = valid ? fateOf(card) : undefined

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2 text-muted-foreground">
          Width
          <input type="range" min={160} max={640} step={10} value={width} onChange={(e) => setWidth(e.target.valueAsNumber)} />
          <span className="w-12 tabular-nums">{width}px</span>
        </label>
        <button type="button" className="rounded border border-border px-2 py-1 hover:bg-muted" onClick={() => setReplays((n) => n + 1)}>
          Replay animation
        </button>
      </div>

      <div className="relative aspect-[4/5] max-w-full" style={{ width }}>
        <div className="@container absolute inset-0 overflow-hidden rounded-2xl shadow-xl">
          <FaceBoundary card={card}>
            <CardFace key={replays} card={card} year={year} />
          </FaceBoundary>
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Parser</dt>
        <dd>
          <span
            data-testid="parser-badge"
            className={`rounded px-1.5 py-0.5 text-xs font-semibold text-white ${valid ? 'bg-green-700' : 'bg-red-700'}`}
          >
            {valid ? 'valid' : 'parser would drop this'}
          </span>
        </dd>
        {valid && (
          <>
            <dt className="text-muted-foreground">Title</dt>
            <dd data-testid="card-title">{cardTitle(card)}</dd>
            <dt className="text-muted-foreground">Fate</dt>
            <dd>
              {fate!.value ?? '—'} of {SUITS[fate!.suit].name}
            </dd>
          </>
        )}
      </dl>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">JSON</summary>
        <pre className="mt-2 max-h-96 overflow-auto rounded border border-border bg-surface p-2 text-xs">{JSON.stringify(card, null, 2)}</pre>
      </details>
    </div>
  )
}

/** Malformed data (the kind the parser drops) can throw in the face; show the error, not a blank page. */
class FaceBoundary extends Component<{ card: Card; children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {}

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidUpdate(prev: { card: Card }) {
    if (prev.card !== this.props.card && this.state.error) this.setState({ error: undefined })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center bg-red-950 p-4 text-center text-sm text-red-100">
          The face threw: {this.state.error.message}
        </div>
      )
    }
    return this.props.children
  }
}
