import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { ShareButton } from '#/components/share-button'

/**
 * A Buried deck: starts face-down on the card back, then each tap/swipe/arrow
 * flips to the next card. Year-agnostic — each year supplies its own faces.
 * The current card is mirrored in the URL (?card=KEY) so any card can be
 * deep-linked and gets its own share preview.
 */

const ASSETS_URL = import.meta.env.VITE_ASSETS_URL
const SWIPE_PX = 40

export interface DeckCard {
  key: string
  imageKey?: string
}

export interface DeckProps<C extends DeckCard> {
  cards: C[]
  year: number
  playerName: string
  /** Absolute URL of this deck. */
  url: string
  cardBackImageKey: string | null
  /** Key of the face-up card, or undefined for the card back. */
  activeKey: string | undefined
  onChange: (key: string | undefined) => void
  renderFace: (card: C) => ReactNode
  cardTitle: (card: C) => string
}

/** -1 is the card back. Unknown keys (e.g. a card that's since been dropped) start at the back. */
export function indexOfKey(cards: DeckCard[], key: string | undefined): number {
  if (key === undefined) return -1
  return cards.findIndex((c) => c.key === key)
}

export function Deck<C extends DeckCard>({
  cards,
  year,
  playerName,
  url,
  cardBackImageKey,
  activeKey,
  onChange,
  renderFace,
  cardTitle,
}: DeckProps<C>) {
  const index = indexOfKey(cards, activeKey)
  const card = index >= 0 ? cards[index] : undefined
  // Which way the last flip went, so going back flips the other way.
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')

  const go = useCallback(
    (to: number) => {
      const clamped = Math.max(-1, Math.min(cards.length - 1, to))
      if (clamped === index) return
      setDirection(clamped > index ? 'forward' : 'back')
      onChange(clamped === -1 ? undefined : cards[clamped]!.key)
    },
    [cards, index, onChange],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        go(index + 1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(index - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, index])

  const swipeStart = useRef<number | null>(null)
  // A swipe ends with a click on whichever tap zone it finished over; swallow it.
  const swiped = useRef(false)
  const tap = (to: number) => {
    if (swiped.current) {
      swiped.current = false
      return
    }
    go(to)
  }

  const deckUrl = (key?: string) => (key ? `${url}?card=${encodeURIComponent(key)}` : url)
  const imageUrl = card?.imageKey ? `${ASSETS_URL}/${card.imageKey}` : undefined

  return (
    <div className="mx-auto flex w-full max-w-[min(100%,calc((100dvh-12rem)*0.8))] flex-col items-center gap-3">
      {/* Story-style progress */}
      <div className="flex w-full gap-1" aria-hidden>
        {cards.map((c, i) => (
          <span key={c.key} className={`h-1 flex-1 rounded-full transition-colors ${i <= index ? 'bg-foreground' : 'bg-muted'}`} />
        ))}
      </div>

      <div
        className="relative aspect-[4/5] w-full select-none [perspective:1600px]"
        onPointerDown={(e) => {
          swipeStart.current = e.clientX
        }}
        onPointerUp={(e) => {
          const start = swipeStart.current
          swipeStart.current = null
          if (start === null) return
          const dx = e.clientX - start
          swiped.current = Math.abs(dx) >= SWIPE_PX
          if (swiped.current) go(dx < 0 ? index + 1 : index - 1)
        }}
      >
        <div
          key={index}
          className={`@container absolute inset-0 overflow-hidden rounded-2xl shadow-2xl ${
            direction === 'forward' ? 'buried-flip-forward' : 'buried-flip-back'
          }`}
          role="group"
          aria-roledescription="card"
          aria-label={card ? `${index + 1} of ${cards.length}: ${cardTitle(card)}` : 'Card back'}
        >
          {card ? renderFace(card) : <CardBack year={year} playerName={playerName} imageKey={cardBackImageKey} />}
        </div>

        {/* Tap zones: left third goes back, the rest goes forward. */}
        <button
          type="button"
          aria-label="Previous card"
          disabled={index === -1}
          onClick={() => tap(index - 1)}
          className="absolute inset-y-0 left-0 w-1/3 cursor-w-resize focus-visible:outline-2 disabled:cursor-default"
        />
        <button
          type="button"
          aria-label={index === -1 ? 'Flip the first card' : 'Next card'}
          disabled={index === cards.length - 1}
          onClick={() => tap(index + 1)}
          className="absolute inset-y-0 right-0 w-2/3 cursor-e-resize focus-visible:outline-2 disabled:cursor-default"
        />
      </div>

      <div className="flex w-full items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === -1}
          className="rounded-full border border-border p-2 hover:bg-muted disabled:opacity-30"
          aria-label="Previous card"
        >
          <ChevronLeft size={18} aria-hidden />
        </button>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {card ? (
            <>
              <ShareButton
                url={deckUrl(card.key)}
                title={`${playerName}'s Malifaux Buried ${year}`}
                text={`${cardTitle(card)} — my Malifaux Buried ${year}`}
                imageUrl={imageUrl}
                label="Share card"
              />
              {imageUrl && (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener"
                  download
                  className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-sm hover:bg-muted"
                >
                  <Download size={14} aria-hidden /> Image
                </a>
              )}
            </>
          ) : (
            <ShareButton url={deckUrl()} title={`${playerName}'s Malifaux Buried ${year}`} text={`My Malifaux Buried ${year}`} />
          )}
        </div>

        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === cards.length - 1}
          className="rounded-full border border-border p-2 hover:bg-muted disabled:opacity-30"
          aria-label="Next card"
        >
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>
    </div>
  )
}

function CardBack({ year, playerName, imageKey }: { year: number; playerName: string; imageKey: string | null }) {
  return (
    <div className="flex h-full w-full p-[3.5cqw]" style={{ background: '#15110e', color: '#f1e9d8' }}>
      <div
        className="flex flex-1 flex-col items-center justify-center gap-[4cqw] rounded-[3.5cqw] border-[0.4cqw] text-center"
        style={{
          borderColor: '#c9a227',
          backgroundImage: 'repeating-linear-gradient(45deg, #c9a22714 0 2px, transparent 2px 22px), repeating-linear-gradient(-45deg, #c9a22714 0 2px, transparent 2px 22px)',
        }}
      >
        {imageKey ? (
          <img src={`${ASSETS_URL}/${imageKey}-w400.webp`} alt="" className="w-[45cqw] object-contain" />
        ) : (
          <span className="text-[30cqw] leading-none" aria-hidden>
            🪦
          </span>
        )}
        <p className="font-serif text-[7cqw] font-bold tracking-[0.18em] uppercase" style={{ color: '#c9a227' }}>
          Malifaux Buried
        </p>
        <p className="text-[5cqw] font-bold">{year}</p>
        <p className="text-[3.6cqw] opacity-80">{playerName}'s year, face down. Tap to flip.</p>
      </div>
    </div>
  )
}
