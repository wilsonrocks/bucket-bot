import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/how-it-works')({
  staticData: { title: 'How It Works' },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex flex-col gap-4">
      <p>
        Rankings and earning points are a key driver for many in the community and we want to simplify the process so
        you can set yourself goals and challenges throughout the year. Outlined below are the core requirements for an
        event to be eligible for rankings:
      </p>
      <ul className="list-disc pl-6">
        <li>Must be at least 3 rounds</li>
        <li>Must have at least 8 players</li>
        <li>Should be advertised on at least two platforms (Discord, Facebook, Wyrd Forums, as examples)</li>
      </ul>
      <p>Each player's final score will be made up of their best five events across the year.</p>
      <p>
        Each event will be worth a starting point of 100 points. This is based on 16 players and a 3 round event. The
        person that finishes first will be awarded 100 points, the person in last place will be awarded 5 points. The
        other points will be equally divided amongst all other positions.
      </p>
      <p>
        If there are more than 16 players, the difference in points between places will be smaller. For example, in a
        16-player event the person finishing 8th will be awarded 58.42 points, whereas in a 28-player event they will
        be awarded 76.27 points. If there are fewer than 16 players, there will be a 1 point deduction for each player
        less — so an 8-player event would be worth 92 points to the winner.
      </p>
      <p>
        As a community, we recognise that a bigger commitment should be rewarded and therefore there are some
        modifications to the maximum point scoring listed below, based on a 16-player event:
      </p>
      <ul className="list-disc pl-6">
        <li>1 Day Event with 4 Rounds – 110 points</li>
        <li>2 Day Event with 5 Rounds – 120 points</li>
        <li>2 Day GT Event (typically 6 rounds) – 130 points</li>
        <li>UK Malifaux Nationals (typically 7 rounds) – 140 points</li>
      </ul>
    </div>
  )
}
