import type { ReactNode } from 'react'
import type { BuriedEvent, Card, CardKey } from '../cards'
import { EventFields, FACTIONS, FactionField, type FormProps, ListField, NumberField, patcher, TextField } from './fields'

/** The fields for each card key. Typed per key, so a new card won't compile without a form. */

type CardOf<K extends CardKey> = Extract<Card, { key: K }>
type Forms = { [K in CardKey]: (props: FormProps<CardOf<K>>) => ReactNode }

const blankEvent = (): BuriedEvent => ({ id: 1, name: 'New event', date: '2026-06-01', players: 16 })

function EventList({ label, events, onChange }: { label: string; events: BuriedEvent[]; onChange: (e: BuriedEvent[]) => void }) {
  return (
    <ListField label={label} items={events} onChange={onChange} blank={blankEvent}>
      {(event, set) => <EventFields value={event} onChange={set} />}
    </ListField>
  )
}

export const FORMS: Forms = {
  INTRO: ({ value, onChange }) => {
    const set = patcher(value, onChange)
    return (
      <>
        <TextField label="Player name" value={value.playerName} onChange={(playerName) => set({ playerName })} />
        <NumberField label="Events played" value={value.eventsPlayed} onChange={(eventsPlayed) => set({ eventsPlayed })} />
        <NumberField label="Games played" value={value.gamesPlayed} onChange={(gamesPlayed) => set({ gamesPlayed })} />
        <NumberField label="Percentile" value={value.percentile} onChange={(percentile) => set({ percentile })} />
      </>
    )
  },

  MOST_PLAYED_FACTION: ({ value, onChange }) => {
    const set = patcher(value, onChange)
    return (
      <>
        <FactionField label="Faction" value={value.faction} onChange={(faction) => set({ faction })} />
        <NumberField label="Events" value={value.events} onChange={(events) => set({ events })} />
        <NumberField label="Share (0–1)" step={0.005} value={value.share} onChange={(share) => set({ share })} />
      </>
    )
  },

  FACTIONS: ({ value, onChange }) => {
    const set = patcher(value, onChange)
    return (
      <ListField
        label="Factions"
        items={value.factions}
        onChange={(factions) => set({ factions })}
        blank={() => ({ faction: FACTIONS[0]!, events: 1 })}
      >
        {(row, onRow) => {
          const setRow = patcher(row, onRow)
          return (
            <>
              <FactionField label="Faction" value={row.faction} onChange={(faction) => setRow({ faction })} />
              <NumberField label="Events" value={row.events} onChange={(events) => setRow({ events })} />
              <NumberField label="Best place" optional value={row.bestPlace} onChange={(bestPlace) => setRow({ bestPlace })} />
              <NumberField label="Faction rank" optional value={row.factionRank} onChange={(factionRank) => setRow({ factionRank })} />
            </>
          )
        }}
      </ListField>
    )
  },

  VENUES: ({ value, onChange }) => {
    const set = patcher(value, onChange)
    return (
      <>
        <NumberField label="Regions" value={value.regions} onChange={(regions) => set({ regions })} />
        <ListField
          label="Venues"
          items={value.venues}
          onChange={(venues) => set({ venues })}
          blank={() => ({ name: 'New venue', town: 'Somewhere', events: 1 })}
        >
          {(row, onRow) => {
            const setRow = patcher(row, onRow)
            return (
              <>
                <TextField label="Name" value={row.name} onChange={(name) => setRow({ name })} />
                <TextField label="Town" value={row.town} onChange={(town) => setRow({ town })} />
                <NumberField label="Events" value={row.events} onChange={(events) => setRow({ events })} />
              </>
            )
          }}
        </ListField>
      </>
    )
  },

  BIGGEST_EVENT: ({ value, onChange }) => (
    <EventFields value={value.event} onChange={(event) => onChange({ ...value, event })} />
  ),

  PODIUMS: ({ value, onChange }) => (
    <EventList label="Podium events" events={value.events} onChange={(events) => onChange({ ...value, events })} />
  ),

  EVENTS_WON: ({ value, onChange }) => (
    <EventList label="Events won" events={value.events} onChange={(events) => onChange({ ...value, events })} />
  ),

  RANKING: ({ value, onChange }) => {
    const set = patcher(value, onChange)
    return (
      <>
        <NumberField label="Final rank" value={value.finalRank} onChange={(finalRank) => set({ finalRank })} />
        <NumberField label="Best rank" value={value.bestRank} onChange={(bestRank) => set({ bestRank })} />
        <TextField label="Best rank date" type="date" value={value.bestRankDate} onChange={(bestRankDate) => set({ bestRankDate })} />
        <NumberField label="Total players" value={value.totalPlayers} onChange={(totalPlayers) => set({ totalPlayers })} />
      </>
    )
  },

  PAINTING: ({ value, onChange }) => {
    const set = patcher(value, onChange)
    return (
      <ListField
        label="Awards"
        items={value.awards}
        onChange={(awards) => set({ awards })}
        blank={() => ({ event: { id: 1, name: 'New event' }, category: 'Best Painted', position: 1 })}
      >
        {(row, onRow) => {
          const setRow = patcher(row, onRow)
          const setEvent = patcher(row.event, (event) => setRow({ event }))
          return (
            <>
              <TextField label="Event name" value={row.event.name} onChange={(name) => setEvent({ name })} />
              <NumberField label="Event id" value={row.event.id} onChange={(id) => setEvent({ id })} />
              <TextField label="Category" value={row.category} onChange={(category) => setRow({ category })} />
              <NumberField label="Position" value={row.position} onChange={(position) => setRow({ position })} />
              <TextField label="Model" optional value={row.model} onChange={(model) => setRow({ model })} />
              <TextField
                label="Painting image key"
                optional
                value={row.paintingImageKey}
                onChange={(paintingImageKey) => setRow({ paintingImageKey })}
              />
            </>
          )
        }}
      </ListField>
    )
  },

  ORGANISED: ({ value, onChange }) => {
    const set = patcher(value, onChange)
    return (
      <>
        <NumberField label="Players hosted" value={value.playersHosted} onChange={(playersHosted) => set({ playersHosted })} />
        <EventList label="Events organised" events={value.events} onChange={(events) => set({ events })} />
      </>
    )
  },

  ACHIEVEMENTS: ({ value, onChange }) => {
    const set = patcher(value, onChange)
    return (
      <ListField
        label="Achievements"
        items={value.achievements}
        onChange={(achievements) => set({ achievements })}
        blank={() => ({ id: 'NEW_ACHIEVEMENT', name: 'New achievement' })}
      >
        {(row, onRow) => {
          const setRow = patcher(row, onRow)
          return (
            <>
              <TextField label="Id" value={row.id} onChange={(id) => setRow({ id })} />
              <TextField label="Name" value={row.name} onChange={(name) => setRow({ name })} />
              <TextField
                label="Image key"
                optional
                value={row.achievementImageKey}
                onChange={(achievementImageKey) => setRow({ achievementImageKey })}
              />
            </>
          )
        }}
      </ListField>
    )
  },

  SUMMARY: ({ value, onChange }) => {
    const set = patcher(value, onChange)
    return (
      <>
        <TextField label="Player name" value={value.playerName} onChange={(playerName) => set({ playerName })} />
        <NumberField label="Events played" value={value.eventsPlayed} onChange={(eventsPlayed) => set({ eventsPlayed })} />
        <NumberField label="Games played" value={value.gamesPlayed} onChange={(gamesPlayed) => set({ gamesPlayed })} />
        <NumberField label="Wins" value={value.wins} onChange={(wins) => set({ wins })} />
        <NumberField label="Podiums" value={value.podiums} onChange={(podiums) => set({ podiums })} />
        <NumberField label="Painting awards" value={value.paintingAwards} onChange={(paintingAwards) => set({ paintingAwards })} />
        <NumberField label="Events organised" value={value.eventsOrganised} onChange={(eventsOrganised) => set({ eventsOrganised })} />
        <NumberField label="Venues" value={value.venues} onChange={(venues) => set({ venues })} />
        <FactionField label="Top faction" optional value={value.topFaction} onChange={(topFaction) => set({ topFaction })} />
        <NumberField label="Final rank" optional value={value.finalRank} onChange={(finalRank) => set({ finalRank })} />
      </>
    )
  },
}

/** The form for whichever card this is. */
export function CardForm({ value, onChange }: FormProps<Card>) {
  const Form = FORMS[value.key] as (props: FormProps<Card>) => ReactNode
  return <Form value={value} onChange={onChange} />
}
