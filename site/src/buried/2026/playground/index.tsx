import { useState } from 'react'
import type { PlaygroundProps } from '../../playground'
import type { Card } from '../cards'
import fixture from '../fixture.json'
import { parseCards } from '../parse-cards'
import { CardForm } from './forms'
import { Preview } from './preview'

/** One card per kind, from the fixture shared with the backend (the first, where a kind repeats). */
const FIXTURES: Card[] = parseCards(fixture).filter((c, i, all) => all.findIndex((d) => d.key === c.key) === i)

export function Playground({ year, cardKey, onKeyChange }: PlaygroundProps) {
  const initial = FIXTURES.find((c) => c.key === cardKey) ?? FIXTURES[0]!

  return (
    <div className="flex flex-col gap-4 py-2">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-[0.15em] uppercase">Buried {year} playground</h1>
          <p className="text-sm text-muted-foreground">Dev only. Choose a card, edit its data, and watch the face.</p>
        </div>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Card
          <select
            className="rounded border border-border bg-surface px-2 py-1 text-sm text-foreground"
            value={initial.key}
            onChange={(e) => onKeyChange(e.target.value)}
          >
            {FIXTURES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.key}
              </option>
            ))}
          </select>
        </label>
      </header>
      {/* Keyed so switching cards starts afresh from that card's fixture. */}
      <CardEditor key={initial.key} initial={initial} year={year} />
    </div>
  )
}

export function CardEditor({ initial, year }: { initial: Card; year: number }) {
  const [card, setCard] = useState<Card>(initial)

  return (
    <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
      <form className="grid grid-cols-2 gap-3" onSubmit={(e) => e.preventDefault()}>
        <CardForm value={card} onChange={setCard} />
        <button
          type="button"
          className="col-span-full justify-self-start rounded border border-border px-2 py-1 text-sm hover:bg-muted"
          onClick={() => setCard(initial)}
        >
          Reset to fixture
        </button>
      </form>
      <Preview card={card} year={year} />
    </div>
  )
}
