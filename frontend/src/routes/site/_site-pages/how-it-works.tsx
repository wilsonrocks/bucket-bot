import { createFileRoute } from '@tanstack/react-router'
import { List, Stack, Text, Title } from '@mantine/core'

export const Route = createFileRoute('/site/_site-pages/how-it-works')({
  component: RouteComponent,
  staticData: { title: 'How It Works' },
})

function RouteComponent() {
  return (
    <Stack gap="md">
      <Text>
        Rankings and earning points are a key driver for many in the community
        and we want to simplify the process so you can set yourself goals and
        challenges throughout the year. Outlined below are the core requirements
        for an event to be eligible for rankings:
      </Text>

      <List listStyleType="disc">
        <List.Item>Must be at least 3 rounds</List.Item>
        <List.Item>Must have at least 8 players</List.Item>
        <List.Item>
          Should be advertised on at least two platforms (Discord, Facebook,
          Wyrd Forums, as examples)
        </List.Item>
      </List>

      <Text>
        Each player's final score will be made up of their best five events
        across the year.
      </Text>

      <Text>
        Each event will be worth a starting point of 100 points. This is based
        on 16 players and a 3 round event. The person that finishes first will
        be awarded 100 points, the person in last place will be awarded 5
        points. The other points will be equally divided amongst all other
        positions.
      </Text>

      <Text>
        If there are more than 16 players, the difference in points between
        places will be smaller. For example, in a 16-player event the person
        finishing 8th will be awarded 58.42 points, whereas in a 28-player event
        they will be awarded 76.27 points. If there are fewer than 16 players,
        there will be a 1 point deduction for each player less — so an 8-player
        event would be worth 92 points to the winner.
      </Text>

      <Text>
        As a community, we recognise that a bigger commitment should be rewarded
        and therefore there are some modifications to the maximum point scoring
        listed below, based on a 16-player event:
      </Text>

      <List listStyleType="disc">
        <List.Item>1 Day Event with 4 Rounds – 110 points</List.Item>
        <List.Item>2 Day Event with 5 Rounds – 120 points</List.Item>
        <List.Item>2 Day GT Event (typically 6 rounds) – 130 points</List.Item>
        <List.Item>
          UK Malifaux Nationals (typically 7 rounds) – 140 points
        </List.Item>
      </List>
    </Stack>
  )
}
