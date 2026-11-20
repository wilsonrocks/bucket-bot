import type { ComponentType } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { Playground as Playground2026 } from './2026/playground'

/**
 * Dev-only card playground (/player/test/buried/$year). Each year brings its
 * own, since the cards and their data differ from year to year. This module is
 * only reached through the route's lazy component, so none of it ships in the
 * real pages' bundles.
 */

export interface PlaygroundProps {
  year: number
  cardKey: string | undefined
  onKeyChange: (key: string) => void
}

const PLAYGROUNDS: Record<number, ComponentType<PlaygroundProps>> = {
  2026: Playground2026,
}

const route = getRouteApi('/player_/test/buried/$year')

export default function BuriedPlayground() {
  const { year } = route.useParams()
  const { key } = route.useSearch()
  const navigate = route.useNavigate()
  const Playground = PLAYGROUNDS[year]

  if (!Playground) {
    return <p className="py-8 text-center text-muted-foreground">No Buried playground for {year}.</p>
  }
  return (
    <Playground
      year={year}
      cardKey={key}
      onKeyChange={(next) => navigate({ search: { key: next }, replace: true, resetScroll: false })}
    />
  )
}
