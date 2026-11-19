import { Children, isValidElement, type ReactNode } from 'react'
import { toOrdinal } from '#/helpers/to-ordinal'
import { textOn } from '#/helpers/text-on'
import type { BuriedEvent, Card, SummaryCard } from './cards'
import { fateOf, SUITS, type Fate } from './fate'

/**
 * The face of each 2026 card. All copy lives here (and, for the share
 * images, in backend/logic/buried/2026/images.tsx — keep them in step).
 * Sizes use container-query units, so a card scales with the deck.
 */

const INK = '#15110e'
/** The card stock round the picture, where the corner indices sit. */
export const STOCK = '#f4ecd8'
const BONE = '#f1e9d8'
const GOLD = '#c9a227'
const MUTED = '#a89f8e'
const BLOOD = '#9e1b1b'

const ASSETS_URL = import.meta.env.VITE_ASSETS_URL

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

function Face({
  bg = INK,
  fg = BONE,
  accent = GOLD,
  children,
}: {
  bg?: string
  fg?: string
  accent?: string
  children: ReactNode
}) {
  return (
    <div className="flex h-full w-full rounded-[3cqw] p-[3cqw]" style={{ background: bg, color: fg }}>
      <div
        className="flex flex-1 flex-col justify-center rounded-[2.5cqw] border-[0.4cqw] px-[6cqw] py-[5cqw]"
        style={{ borderColor: accent }}
      >
        {reveal(children)}
      </div>
    </div>
  )
}

// The words fade in one after another, then, after a pause, the stat itself
// (a <Big>, or anything marked data-stat) comes last. Layout order is
// unchanged; only the timing is.
const REVEAL_STEP = 0.25
const STAT_PAUSE = 0.5

function reveal(children: ReactNode) {
  const pieces = Children.toArray(children)
  const isStat = pieces.map(
    (child) => isValidElement<{ 'data-stat'?: boolean }>(child) && (child.type === Big || child.props['data-stat'] === true),
  )
  const words = isStat.filter((stat) => !stat).length
  let wordAt = 0
  let statAt = 0
  return pieces.map((child, i) => {
    const delay = isStat[i]
      ? 0.1 + words * REVEAL_STEP + STAT_PAUSE + statAt++ * REVEAL_STEP
      : 0.1 + wordAt++ * REVEAL_STEP
    return (
      <div key={i} className="buried-fade" style={{ animationDelay: `${delay}s` }}>
        {child}
      </div>
    )
  })
}

const Eyebrow = ({ children, color = MUTED }: { children: ReactNode; color?: string }) => (
  <p className="mb-[1.5cqw] text-[3.6cqw] tracking-[0.12em] uppercase" style={{ color }}>
    {children}
  </p>
)

const Big = ({ children, size = 'text-[24cqw]' }: { children: ReactNode; size?: string }) => (
  <p className={`${size} leading-none font-black tracking-tight`}>{children}</p>
)

const Line = ({ children, small = false }: { children: ReactNode; small?: boolean }) => (
  <p className={`mt-[2cqw] font-bold leading-tight ${small ? 'text-[4cqw]' : 'text-[4.8cqw]'}`}>{children}</p>
)

function EventList({ events, showPlace = false, max = 5 }: { events: BuriedEvent[]; showPlace?: boolean; max?: number }) {
  return (
    <ul className="mt-[3.5cqw] text-[3.4cqw]">
      {events.slice(0, max).map((e) => (
        <li key={e.id} className="flex justify-between gap-[2cqw] border-b py-[1cqw]" style={{ borderColor: `${MUTED}40` }}>
          <span className="truncate">{e.name}</span>
          <span className="shrink-0 font-bold" style={{ color: GOLD }}>
            {showPlace && e.place !== undefined ? toOrdinal(e.place) : `${e.players} players`}
          </span>
        </li>
      ))}
      {events.length > max && (
        <li className="mt-[1cqw]" style={{ color: MUTED }}>
          + {events.length - max} more
        </li>
      )}
    </ul>
  )
}

export function summaryStats(card: SummaryCard): [string, string][] {
  const stats: [string, string][] = [
    ['events', `${card.eventsPlayed}`],
    ['games', `${card.gamesPlayed}`],
  ]
  if (card.finalRank !== undefined) stats.push(['ranking', `#${card.finalRank}`])
  if (card.wins > 0) stats.push(['wins', `${card.wins}`])
  if (card.podiums > 0) stats.push(['podiums', `${card.podiums}`])
  if (card.paintingAwards > 0) stats.push(['painting awards', `${card.paintingAwards}`])
  if (card.eventsOrganised > 0) stats.push(['events organised', `${card.eventsOrganised}`])
  if (card.venues > 0) stats.push(['venues', `${card.venues}`])
  return stats.slice(0, 6)
}

/**
 * A playing card from the Fate Deck: value and suit in two opposite corners
 * of the card stock, and the card's own design as the picture in the middle.
 */
export function CardFace({ card, year }: { card: Card; year: number }) {
  const fate = fateOf(card)
  return (
    <div className="relative h-full w-full" style={{ background: STOCK }}>
      <CornerIndex fate={fate} className="top-[2.4cqw] left-[1.6cqw]" />
      <CornerIndex fate={fate} className="right-[1.6cqw] bottom-[2.4cqw] rotate-180" />
      <div className="@container absolute inset-x-[10.5cqw] inset-y-[3cqw]">
        <CardPicture card={card} year={year} />
      </div>
    </div>
  )
}

// Corner values shrink as they get longer, to stay inside the corner.
const VALUE_SIZE = ['text-[6.5cqw]', 'text-[5cqw]', 'text-[3.6cqw]']

function CornerIndex({ fate, className }: { fate: Fate; className: string }) {
  const suit = SUITS[fate.suit]
  const label = fate.value === undefined ? suit.name : `${fate.value} of ${suit.name}`
  return (
    <div
      className={`absolute flex w-[7.5cqw] flex-col items-center gap-[0.6cqw] ${className}`}
      style={{ color: suit.colour }}
      role="img"
      aria-label={label}
      title={label}
    >
      {fate.value !== undefined ? (
        <span className={`font-serif leading-none font-black ${VALUE_SIZE[Math.min(String(fate.value).length, 3) - 1]}`}>{fate.value}</span>
      ) : (
        <span className="font-serif text-[2.4cqw] leading-none font-black tracking-tight [writing-mode:vertical-rl]">JOKER</span>
      )}
      <img src={suit.icon} alt="" className="w-[6cqw]" />
    </div>
  )
}

function CardPicture({ card, year }: { card: Card; year: number }) {
  switch (card.key) {
    case 'INTRO':
      return (
        <Face>
          <Eyebrow>{year}, flipped</Eyebrow>
          <Big>{card.gamesPlayed}</Big>
          <Line>games across {plural(card.eventsPlayed, 'event')}.</Line>
          {card.percentile >= 50 ? (
            <Line small>More than {card.percentile}% of UK players.</Line>
          ) : card.eventsPlayed === 0 ? (
            <Line small>You didn't flip a card at the table this year — but you kept the tables running.</Line>
          ) : (
            <Line small>Every flip counts. Let's see how they landed.</Line>
          )}
        </Face>
      )

    case 'MOST_PLAYED_FACTION': {
      const fg = textOn(card.faction.hexCode)
      return (
        <Face bg={card.faction.hexCode} fg={fg} accent={fg}>
          <Eyebrow color={fg}>Your faction</Eyebrow>
          <Big size="text-[14cqw]">{card.faction.name}</Big>
          <Line>
            {plural(card.events, 'event')} — {Math.round(card.share * 100)}% of your year.
          </Line>
          <Line small>{card.faction.name} called. You answered.</Line>
        </Face>
      )
    }

    case 'FACTIONS': {
      const max = Math.max(...card.factions.map((f) => f.events))
      return (
        <Face>
          <Eyebrow>Spread your bets</Eyebrow>
          <Big size="text-[16cqw]">{card.factions.length} factions</Big>
          <ul className="mt-[4cqw] space-y-[1.8cqw] text-[3.2cqw]">
            {card.factions.slice(0, 6).map((f) => (
              <li key={f.faction.code} className="flex items-center gap-[2cqw]">
                <span className="w-[32%] truncate font-bold">{f.faction.name}</span>
                <span className="flex-1">
                  <span
                    className="block h-[4cqw] rounded-[1cqw]"
                    style={{ background: f.faction.hexCode, width: `${(f.events / max) * 100}%` }}
                  />
                </span>
                <span className="w-[18%] text-right" title={f.factionRank !== undefined ? `Ranked #${f.factionRank} Best ${f.faction.name}` : undefined}>
                  {f.factionRank !== undefined ? `#${f.factionRank}` : plural(f.events, 'event')}
                </span>
              </li>
            ))}
          </ul>
          {card.factions.some((f) => f.factionRank !== undefined) && (
            <p className="mt-[3cqw] text-[2.8cqw]" style={{ color: MUTED }}>
              # = your rank in that faction's Best-of ranking.
            </p>
          )}
        </Face>
      )
    }

    case 'VENUES':
      return (
        <Face>
          <Eyebrow>Have models, will travel</Eyebrow>
          <Big>{card.venues.length}</Big>
          <Line>
            {card.venues.length === 1 ? 'venue' : 'venues'} across {plural(card.regions, 'region')}.
          </Line>
          <Line small>{card.venues.slice(0, 4).map((v) => v.town).join(' · ')}</Line>
        </Face>
      )

    case 'BIGGEST_EVENT':
      return (
        <Face>
          <Eyebrow>Your biggest crowd</Eyebrow>
          <Big>{card.event.players}</Big>
          <Line>players at {card.event.name}.</Line>
          {card.event.place !== undefined && <Line small>You finished {toOrdinal(card.event.place)}.</Line>}
        </Face>
      )

    case 'PODIUMS':
      return (
        <Face>
          <Eyebrow>On the podium</Eyebrow>
          <Big>{card.events.length}</Big>
          <Line>top-three {card.events.length === 1 ? 'finish' : 'finishes'}.</Line>
          <EventList events={card.events} showPlace />
        </Face>
      )

    case 'EVENTS_WON':
      return (
        <Face bg={BLOOD}>
          <Eyebrow color={GOLD}>Undefeated? Close enough.</Eyebrow>
          <Big>{card.events.length}</Big>
          <Line>{card.events.length === 1 ? 'event won.' : 'events won.'}</Line>
          <EventList events={card.events} />
        </Face>
      )

    case 'RANKING':
      return (
        <Face>
          <Eyebrow>Rolling year ranking</Eyebrow>
          <Big>#{card.finalRank}</Big>
          <Line>of {card.totalPlayers} ranked players.</Line>
          {card.bestRank < card.finalRank && <Line small>Peaked at #{card.bestRank}.</Line>}
        </Face>
      )

    case 'PAINTING': {
      const photo = card.awards.find((a) => a.paintingImageKey)
      return (
        <Face>
          <Eyebrow>Brush with greatness</Eyebrow>
          {photo && (
            <img
              src={`${ASSETS_URL}/${photo.paintingImageKey}-w800.webp`}
              alt={photo.model ?? `${photo.category} at ${photo.event.name}`}
              className="mb-[3cqw] max-h-[42cqw] self-start rounded-[2cqw] object-cover"
            />
          )}
          <Big size={photo ? 'text-[13cqw]' : 'text-[24cqw]'}>{card.awards.length}</Big>
          <Line>{card.awards.length === 1 ? 'painting award.' : 'painting awards.'}</Line>
          <ul className="mt-[2cqw] text-[3cqw]" style={{ color: MUTED }}>
            {card.awards.slice(0, 3).map((a, i) => (
              <li key={i} className="truncate">
                {toOrdinal(a.position)} {a.category} · {a.event.name}
              </li>
            ))}
          </ul>
        </Face>
      )
    }

    case 'ORGANISED':
      return (
        <Face>
          <Eyebrow>Behind the table</Eyebrow>
          <Big>{card.events.length}</Big>
          <Line>
            {card.events.length === 1 ? 'event' : 'events'} organised for {plural(card.playersHosted, 'player')}.
          </Line>
          <Line small>Thank you. Seriously.</Line>
        </Face>
      )

    case 'ACHIEVEMENTS':
      return (
        <Face>
          <Eyebrow>Unlocked</Eyebrow>
          <Big>{card.achievements.length}</Big>
          <Line>{card.achievements.length === 1 ? 'achievement earned.' : 'achievements earned.'}</Line>
          <Line small>{card.achievements.slice(0, 5).map((a) => a.name).join(' · ')}</Line>
        </Face>
      )

    case 'SUMMARY':
      return (
        <Face accent={card.topFaction?.hexCode ?? GOLD}>
          <Eyebrow>
            {card.playerName}'s {year}
          </Eyebrow>
          <dl data-stat className="mt-[2cqw] grid grid-cols-2 gap-x-[4cqw] gap-y-[4cqw]">
            {summaryStats(card).map(([label, value]) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="text-[3.2cqw]" style={{ color: MUTED }}>
                  {label}
                </dt>
                <dd className="text-[11cqw] leading-none font-black">{value}</dd>
              </div>
            ))}
          </dl>
          {card.topFaction && (
            <p className="mt-[5cqw] flex items-center gap-[2cqw] text-[4cqw] font-bold">
              <span className="inline-block size-[4cqw] rounded-full" style={{ background: card.topFaction.hexCode }} />
              {card.topFaction.name}
            </p>
          )}
        </Face>
      )
  }
}

/** Short label per card, for aria and share text. */
export function cardTitle(card: Card): string {
  switch (card.key) {
    case 'INTRO': return 'My year in games'
    case 'MOST_PLAYED_FACTION': return `My faction: ${card.faction.name}`
    case 'FACTIONS': return `${card.factions.length} factions`
    case 'VENUES': return `${card.venues.length} venues`
    case 'BIGGEST_EVENT': return `My biggest event: ${card.event.name}`
    case 'PODIUMS': return `${card.events.length} podiums`
    case 'EVENTS_WON': return `${card.events.length} ${card.events.length === 1 ? 'event' : 'events'} won`
    case 'RANKING': return `Ranked #${card.finalRank}`
    case 'PAINTING': return `${card.awards.length} painting ${card.awards.length === 1 ? 'award' : 'awards'}`
    case 'ORGANISED': return `${card.events.length} ${card.events.length === 1 ? 'event' : 'events'} organised`
    case 'ACHIEVEMENTS': return `${card.achievements.length} achievements`
    case 'SUMMARY': return 'My year, Buried'
  }
}
