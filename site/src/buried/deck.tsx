import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { ShareButton, ShareImageButton, shareFileName } from '#/components/share-button'
import { useMediaQuery } from '#/helpers/use-media-query'

/**
 * A Buried deck. Year-agnostic — each year supplies its own faces.
 *
 * On desktop it's a table: a face-down draw pile on the left and a discard
 * pile on the right. Each flip lifts the top card off the draw pile, turns it
 * over in the air and lands it face up on the discard; going back returns it.
 * On mobile there's no room for two piles, so it's a swipeable slideshow.
 *
 * The face-up card is mirrored in the URL (?card=KEY) so any card can be
 * deep-linked and gets its own share preview.
 */

const ASSETS_URL = import.meta.env.VITE_ASSETS_URL
const SWIPE_PX = 40
/** Card backs drawn under the top of a pile, to give it some depth. */
const MAX_PILE_LAYERS = 4

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
  /** Key of the face-up card, or undefined when nothing has been flipped yet. */
  activeKey: string | undefined
  onChange: (key: string | undefined) => void
  renderFace: (card: C) => ReactNode
  cardTitle: (card: C) => string
}

/** -1 means nothing flipped yet. Unknown keys (e.g. a card that's since been dropped) start there too. */
export function indexOfKey(cards: DeckCard[], key: string | undefined): number {
  if (key === undefined) return -1
  return cards.findIndex((c) => c.key === key)
}

/** The flip in progress: `id` restarts the animation when flips come quickly. */
interface Move {
  id: number
  from: number
  to: number
}

export function Deck<C extends DeckCard>(props: DeckProps<C>) {
  const { cards, year, playerName, url, activeKey, onChange, cardTitle } = props
  const index = indexOfKey(cards, activeKey)
  const card = index >= 0 ? cards[index] : undefined

  const isDesktop = useMediaQuery('(min-width: 768px)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [move, setMove] = useState<Move | null>(null)
  const moveId = useRef(0)

  const go = useCallback(
    (to: number) => {
      const clamped = Math.max(-1, Math.min(cards.length - 1, to))
      if (clamped === index) return
      setMove(reducedMotion ? null : { id: ++moveId.current, from: index, to: clamped })
      onChange(clamped === -1 ? undefined : cards[clamped]!.key)
    },
    [cards, index, onChange, reducedMotion],
  )
  const settle = useCallback(() => setMove(null), [])
  // Straight back to the card back: no flight, since the whole discard pile moves at once.
  const restart = useCallback(() => {
    setMove(null)
    onChange(undefined)
  }, [onChange])

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

  const deckUrl = (key?: string) => (key ? `${url}?card=${encodeURIComponent(key)}` : url)
  const imageUrl = card?.imageKey ? `${ASSETS_URL}/${card.imageKey}` : undefined

  return (
    <div
      className={`mx-auto flex w-full flex-col items-center gap-3 ${
        isDesktop
          ? 'max-w-[min(100%,calc((100dvh-13rem)*1.6+2rem))]'
          : 'max-w-[min(100%,calc((100dvh-12rem)*0.8))]'
      }`}
    >
      {/* Story-style progress */}
      <div className="flex w-full gap-1" aria-hidden>
        {cards.map((c, i) => (
          <span key={c.key} className={`h-1 flex-1 rounded-full transition-colors ${i <= index ? 'bg-foreground' : 'bg-muted'}`} />
        ))}
      </div>

      {isDesktop ? (
        <Table {...props} index={index} move={move} go={go} settle={settle} restart={restart} />
      ) : (
        <Slideshow {...props} index={index} move={move} go={go} settle={settle} restart={restart} />
      )}

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
              {imageUrl && (
                <ShareImageButton
                  imageUrl={imageUrl}
                  fileName={shareFileName(playerName, 'malifaux buried', year, card.key)}
                  title={`${cardTitle(card)} — my Malifaux Buried ${year}`}
                />
              )}
              <ShareButton
                url={deckUrl(card.key)}
                title={`${playerName}'s Malifaux Buried ${year}`}
                text={`${cardTitle(card)} — my Malifaux Buried ${year}`}
                label="Share link"
              />
            </>
          ) : (
            <ShareButton url={deckUrl()} title={`${playerName}'s Malifaux Buried ${year}`} text={`My Malifaux Buried ${year}`} label="Share link" />
          )}
        </div>

        {index === cards.length - 1 ? (
          <button
            type="button"
            onClick={restart}
            className="rounded-full border border-border p-2 hover:bg-muted"
            aria-label="Start again"
          >
            <RotateCcw size={18} aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="rounded-full border border-border p-2 hover:bg-muted"
            aria-label="Next card"
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}

interface LayoutProps<C extends DeckCard> extends DeckProps<C> {
  index: number
  move: Move | null
  go: (to: number) => void
  settle: () => void
  restart: () => void
}

const cardLabel = <C extends DeckCard>(cards: C[], i: number, cardTitle: (c: C) => string) =>
  `${i + 1} of ${cards.length}: ${cardTitle(cards[i]!)}`

/** A card-shaped box whose contents can size themselves in cqw. */
function CardShape({ children, className = '', ...rest }: { children?: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`@container absolute inset-0 overflow-hidden rounded-2xl ${className}`} {...rest}>
      {children}
    </div>
  )
}

// ── Desktop: draw pile → discard pile ──────────────────────────────────────

function Table<C extends DeckCard>({ cards, index, move, go, settle, restart, renderFace, cardTitle, year, playerName, cardBackImageKey }: LayoutProps<C>) {
  const dealing = move && move.to > move.from ? move : null
  const returning = move && move.to < move.from ? move : null

  // The flying card isn't on either pile until it lands.
  const drawCount = cards.length - 1 - index - (returning ? 1 : 0)
  const discardTop = dealing ? dealing.from : index
  const flying = dealing ? cards[dealing.to] : returning ? cards[returning.from] : undefined

  const back = <CardBack year={year} playerName={playerName} imageKey={cardBackImageKey} />

  return (
    <div className="relative grid w-full grid-cols-2 gap-8 select-none [perspective:2000px]">
      {/* Draw pile */}
      <div className="relative aspect-[4/5]">
        <PileLayers count={drawCount - 1} back={back} />
        {drawCount > 0 ? (
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label={index === -1 ? 'Flip the first card' : 'Flip the next card'}
            className="group absolute inset-0 cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <CardShape className="shadow-xl transition-transform duration-200 group-hover:-translate-y-1 group-hover:rotate-[-1deg]">
              {back}
            </CardShape>
          </button>
        ) : (
          <button
            type="button"
            onClick={restart}
            className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <RotateCcw size={28} aria-hidden />
            Start again
          </button>
        )}
        <p className="absolute -bottom-6 w-full text-center text-xs text-muted-foreground">
          {drawCount > 0 ? `${drawCount} to flip` : ''}
        </p>
      </div>

      {/* Discard pile */}
      <div className="relative aspect-[4/5]">
        {discardTop >= 0 ? (
          <>
            <PileLayers count={discardTop} back={<div className="h-full w-full border border-black/10 bg-[#f4ecd8]" />} />
            <CardShape
              key={discardTop}
              className="shadow-xl"
              role="group"
              aria-roledescription="card"
              aria-label={cardLabel(cards, discardTop, cardTitle)}
            >
              {renderFace(cards[discardTop]!)}
            </CardShape>
            {/* Clicking the discard pile puts its top card back on the draw pile. */}
            {!move && (
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label="Put the card back"
                className="absolute inset-0 cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4"
              />
            )}
          </>
        ) : (
          <EmptySlot>Flip a card to begin.</EmptySlot>
        )}
      </div>

      {/* The card in the air, from the draw pile's slot across to the discard's (or back). */}
      {flying && move && (
        <div
          key={move.id}
          aria-hidden
          onAnimationEnd={(e) => e.target === e.currentTarget && settle()}
          className={`pointer-events-none absolute top-0 left-0 aspect-[4/5] w-[calc(50%-1rem)] [transform-style:preserve-3d] ${
            dealing ? 'buried-deal' : 'buried-return'
          }`}
        >
          <CardShape className="shadow-2xl [backface-visibility:hidden]">{back}</CardShape>
          <CardShape className="shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
            {renderFace(flying)}
          </CardShape>
        </div>
      )}
    </div>
  )
}

/** Offset cards under a pile's top card, so a big pile looks thick. */
function PileLayers({ count, back }: { count: number; back: ReactNode }) {
  const layers = Math.max(0, Math.min(count, MAX_PILE_LAYERS))
  return (
    <>
      {Array.from({ length: layers }, (_, i) => {
        const depth = layers - i
        return (
          <CardShape
            key={i}
            aria-hidden
            className="shadow-md brightness-75"
            style={{ transform: `translate(${depth * 3}px, ${depth * 4}px)` }}
          >
            {back}
          </CardShape>
        )
      })}
    </>
  )
}

function EmptySlot({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

// ── Mobile: slideshow ──────────────────────────────────────────────────────

function Slideshow<C extends DeckCard>({ cards, index, move, go, settle, renderFace, cardTitle, year, playerName, cardBackImageKey }: LayoutProps<C>) {
  const card = index >= 0 ? cards[index] : undefined
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

  return (
    <div
      className="relative aspect-[4/5] w-full touch-pan-y overflow-hidden rounded-2xl select-none"
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
      <CardShape
        key={index}
        onAnimationEnd={(e) => e.target === e.currentTarget && settle()}
        className={`shadow-2xl ${move ? (move.to > move.from ? 'buried-slide-next' : 'buried-slide-prev') : ''}`}
        role="group"
        aria-roledescription="card"
        aria-label={card ? cardLabel(cards, index, cardTitle) : 'Card back'}
      >
        {card ? renderFace(card) : <CardBack year={year} playerName={playerName} imageKey={cardBackImageKey} />}
      </CardShape>

      {/* Tap zones: left third goes back, the rest goes forward. */}
      <button
        type="button"
        aria-label="Previous card"
        disabled={index === -1}
        onClick={() => tap(index - 1)}
        className="absolute inset-y-0 left-0 w-1/3 focus-visible:outline-2 disabled:cursor-default"
      />
      <button
        type="button"
        aria-label={index === -1 ? 'Flip the first card' : 'Next card'}
        disabled={index === cards.length - 1}
        onClick={() => tap(index + 1)}
        className="absolute inset-y-0 right-0 w-2/3 focus-visible:outline-2 disabled:cursor-default"
      />
    </div>
  )
}

function CardBack({ year, playerName, imageKey }: { year: number; playerName: string; imageKey: string | null }) {
  return (
    // Card stock rim round the printed back, like the faces.
    <div className="flex h-full w-full p-[3cqw]" style={{ background: '#f4ecd8' }}>
      <div
        className="flex flex-1 flex-col items-center justify-center gap-[4cqw] rounded-[3cqw] border-[0.4cqw] text-center"
        style={{
          borderColor: '#c9a227',
          backgroundColor: '#15110e',
          color: '#f1e9d8',
          backgroundImage:
            'repeating-linear-gradient(45deg, #c9a22714 0 2px, transparent 2px 22px), repeating-linear-gradient(-45deg, #c9a22714 0 2px, transparent 2px 22px)',
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
        <p className="text-[4.4cqw] opacity-80">{playerName}'s year, face down. Flip to begin.</p>
      </div>
    </div>
  )
}
