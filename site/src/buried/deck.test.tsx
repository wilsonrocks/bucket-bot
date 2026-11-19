// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, test } from 'vitest'
import fixture from './2026/fixture.json'
import { CardFace, cardTitle } from './2026/card-face'
import type { Card } from './2026/cards'
import { parseCards } from './2026/parse-cards'
import { Deck, indexOfKey } from './deck'

afterEach(cleanup)

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

describe('Deck', () => {
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

  test('deep links open on that card, with a share button', () => {
    render(<Harness initial="EVENTS_WON" />)
    expect(screen.getByText('event won.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Share card' })).toBeTruthy()
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
    expect((container.firstChild as HTMLElement).style.background).toBe('rgb(0, 137, 200)')
  })
})
