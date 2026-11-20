// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { cardTitle } from '../card-face'
import fixture from '../fixture.json'
import { parseCards } from '../parse-cards'
import { CardEditor, Playground } from '.'

afterEach(cleanup)

const cards = parseCards(fixture)
const intro = cards.find((c) => c.key === 'INTRO')!

describe('Buried 2026 playground', () => {
  test.each(cards.map((c) => [c.key, c] as const))('%s renders its form and a valid face', (_, card) => {
    render(<CardEditor initial={card} year={2026} />)
    expect(screen.getByTestId('parser-badge').textContent).toBe('valid')
    expect(screen.getByTestId('card-title').textContent).toBe(cardTitle(card))
  })

  test('the dropdown lists every key and reports a change', () => {
    const chosen: string[] = []
    render(<Playground year={2026} cardKey="RANKING" onKeyChange={(k) => chosen.push(k)} />)
    const select = screen.getByLabelText('Card') as HTMLSelectElement
    expect([...select.options].map((o) => o.value)).toEqual(cards.map((c) => c.key))
    expect(select.value).toBe('RANKING')
    fireEvent.change(select, { target: { value: 'PODIUMS' } })
    expect(chosen).toEqual(['PODIUMS'])
  })

  test('editing a field updates the card', () => {
    render(<CardEditor initial={intro} year={2026} />)
    fireEvent.change(screen.getByLabelText('Games played'), { target: { value: '99' } })
    expect(screen.getByText(/"gamesPlayed": 99/)).toBeTruthy()
    expect(screen.getByText('99 of Crows')).toBeTruthy()
  })

  test('blanking a required number makes the parser drop the card', () => {
    render(<CardEditor initial={intro} year={2026} />)
    fireEvent.change(screen.getByLabelText('Games played'), { target: { value: '' } })
    expect(screen.getByTestId('parser-badge').textContent).toBe('parser would drop this')
  })

  test('list rows can be added and removed', () => {
    const podiums = cards.find((c) => c.key === 'PODIUMS')!
    render(<CardEditor initial={podiums} year={2026} />)
    fireEvent.click(screen.getByText('Add'))
    expect(screen.getByTestId('card-title').textContent).toBe('3 podiums')
    fireEvent.click(screen.getAllByText('Remove')[0]!)
    expect(screen.getByTestId('card-title').textContent).toBe('2 podiums')
  })
})
