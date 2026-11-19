// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import fixture from './2026/fixture.json'
import { CardFace, cardTitle } from './2026/card-face'
import type { Card } from './2026/cards'
import { parseCards } from './2026/parse-cards'
import { Deck, indexOfKey } from './deck'

afterEach(cleanup)

/** jsdom has no matchMedia; pretend to be a phone or a desktop. */
function screenIs(kind: 'mobile' | 'desktop', { reducedMotion = false } = {}) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width') ? kind === 'desktop' : query.includes('reduce') ? reducedMotion : false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}
afterEach(() => vi.unstubAllGlobals())

/** jsdom has no AnimationEvent, so React listens for the webkit-prefixed name instead. */
const land = (el: Element) => fireEvent(el, new Event('webkitAnimationEnd', { bubbles: true }))

const cards = parseCards(fixture)

function Harness({ initial }: { initial?: string }) {
  const [key, setKey] = useState<string | undefined>(initial)
  return (
    <>
      <output data-testid="key">{key ?? 'BACK'}</output>
      <Deck
        cards={cards}
        year={2026}
        playerName="Alice Example"
        url="https://malifaux.uk/player/1/buried/2026"
        cardBackImageKey={null}
        activeKey={key}
        onChange={setKey}
        renderFace={(c) => <CardFace card={c} year={2026} />}
        cardTitle={cardTitle}
      />
    </>
  )
}

const current = () => screen.getByTestId('key').textContent

describe('indexOfKey', () => {
  test('undefined and unknown keys are the card back', () => {
    expect(indexOfKey(cards, undefined)).toBe(-1)
    expect(indexOfKey(cards, 'NOPE')).toBe(-1)
    expect(indexOfKey(cards, 'RANKING')).toBe(cards.findIndex((c) => c.key === 'RANKING'))
  })
})

describe('Deck on mobile (slideshow)', () => {
  beforeEach(() => screenIs('mobile'))

  test('starts face down, and flipping deals the cards in order', () => {
    render(<Harness />)
    expect(screen.getByRole('group', { name: 'Card back' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Flip the first card' }))
    expect(current()).toBe('INTRO')
    expect(screen.getByRole('group', { name: /^1 of 12: My year in games/ })).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Next card' })[0]!)
    expect(current()).toBe('MOST_PLAYED_FACTION')
  })

  test('arrow keys move both ways and stop at the ends', () => {
    render(<Harness />)
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(current()).toBe('BACK')
    for (let i = 0; i < 20; i++) fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(current()).toBe('SUMMARY')
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(current()).toBe('ACHIEVEMENTS')
  })

  test('a swipe moves one card and swallows the click it ends with', () => {
    render(<Harness initial="RANKING" />)
    const card = screen.getByRole('group', { name: /Ranked #7/ }).parentElement!
    fireEvent.pointerDown(card, { clientX: 300 })
    fireEvent.pointerUp(card, { clientX: 100 })
    fireEvent.click(screen.getAllByRole('button', { name: 'Next card' })[0]!)
    expect(current()).toBe('PAINTING')
  })

  test('the last card offers a restart', () => {
    render(<Harness initial="SUMMARY" />)
    fireEvent.click(screen.getByRole('button', { name: 'Start again' }))
    expect(current()).toBe('BACK')
  })

  test('deep links open on that card, with a share button', () => {
    render(<Harness initial="EVENTS_WON" />)
    expect(screen.getByText('event won.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Share link' })).toBeTruthy()
  })
})

describe('Deck on desktop (draw and discard piles)', () => {
  beforeEach(() => screenIs('desktop'))

  test('flipping the draw pile deals its top card onto the discard pile', () => {
    const { container } = render(<Harness />)
    expect(screen.getByText('Flip a card to begin.')).toBeTruthy()
    expect(screen.getByText(`${cards.length} to flip`)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Flip the first card' }))
    expect(current()).toBe('INTRO')
    // Mid-flight: the card is in the air, not yet on the discard pile.
    const flying = container.querySelector('.buried-deal')!
    expect(flying).toBeTruthy()
    expect(screen.getByText('Flip a card to begin.')).toBeTruthy()

    land(flying)
    expect(container.querySelector('.buried-deal')).toBeNull()
    expect(screen.getByRole('group', { name: /^1 of 12: My year in games/ })).toBeTruthy()
    expect(screen.getByText(`${cards.length - 1} to flip`)).toBeTruthy()
  })

  test("the writing's fades finishing don't count as the card landing", () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Flip the first card' }))
    const flying = container.querySelector('.buried-deal')!
    land(flying.querySelector('.buried-fade')!)
    expect(container.querySelector('.buried-deal')).toBeTruthy()
  })

  test('going back returns the top card to the draw pile', () => {
    const { container } = render(<Harness initial="RANKING" />)
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(current()).toBe('EVENTS_WON')
    const flying = container.querySelector('.buried-return')!
    expect(flying).toBeTruthy()
    land(flying)
    expect(screen.getByRole('group', { name: /won/ })).toBeTruthy()
  })

  test('the last card empties the draw pile, which then starts again', () => {
    render(<Harness initial="SUMMARY" />)
    const [pile] = screen.getAllByRole('button', { name: 'Start again' })
    fireEvent.click(pile!)
    expect(current()).toBe('BACK')
    expect(screen.getByText('Flip a card to begin.')).toBeTruthy()
  })

  test('clicking the discard pile puts its top card back', () => {
    const { container } = render(<Harness initial="RANKING" />)
    fireEvent.click(screen.getByRole('button', { name: 'Put the card back' }))
    expect(current()).toBe('EVENTS_WON')
    expect(container.querySelector('.buried-return')).toBeTruthy()
  })

  test('reduced motion skips the flight', () => {
    screenIs('desktop', { reducedMotion: true })
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Flip the first card' }))
    expect(container.querySelector('.buried-deal')).toBeNull()
    expect(screen.getByRole('group', { name: /^1 of 12/ })).toBeTruthy()
  })
})

describe('CardFace', () => {
  test.each(cards.map((c) => [c.key, c] as const))('%s renders', (_, card) => {
    const { container } = render(<CardFace card={card as Card} year={2026} />)
    expect(container.textContent!.length).toBeGreaterThan(5)
  })

  test('faction cards use the faction colour', () => {
    const card = cards.find((c) => c.key === 'MOST_PLAYED_FACTION') as Card
    const { container } = render(<CardFace card={card} year={2026} />)
    const panels = [...container.querySelectorAll<HTMLElement>('[style]')].map((el) => el.style.background)
    expect(panels).toContain('rgb(0, 137, 200)')
  })

  test('every card is a Fate Deck card, with matching indices in two corners', () => {
    const { getAllByRole } = render(<CardFace card={cards.find((c) => c.key === 'EVENTS_WON') as Card} year={2026} />)
    expect(getAllByRole('img', { name: '1 of Rams' })).toHaveLength(2)
  })

  test('the words fade in one at a time, and the number last after a pause', () => {
    const { container } = render(<CardFace card={cards.find((c) => c.key === 'EVENTS_WON') as Card} year={2026} />)
    const pieces = [...container.querySelectorAll<HTMLElement>('.buried-fade')]
    const delayOf = (el: HTMLElement) => parseFloat(el.style.animationDelay)
    const number = pieces.find((el) => el.textContent === '1')!
    const words = pieces.filter((el) => el !== number).map(delayOf)
    expect(words).toEqual([...words].sort((x, y) => x - y))
    expect(delayOf(number) - Math.max(...words)).toBeGreaterThan(words[1]! - words[0]!)
  })

  test('the summary is the Red Joker', () => {
    const { getAllByRole } = render(<CardFace card={cards.find((c) => c.key === 'SUMMARY') as Card} year={2026} />)
    expect(getAllByRole('img', { name: 'Red Joker' })).toHaveLength(2)
  })
})
