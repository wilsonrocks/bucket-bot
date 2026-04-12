import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { createFileRoute } from '@tanstack/react-router'

import {
  usePostFetchDiscordUserIds,
  usePostFactionRankings,
  usePostGenerateRankings,
  useGetRankingTypes,
  usePostPostFactionRankings,
  usePostPostDiscordRankings,
  usePostGenerateRegionSnapshot,
} from '@/api/hooks'

import { Button, Card, Grid, List, Text, Title } from '@mantine/core'

import { modals } from '@mantine/modals'

import { Route as IdentitiesRoute } from '../identities'
import { Link } from '@/components/link'

export const Route = createFileRoute('/app/_app-pages/rankings/')({
  component: () => (
    <RequireRankingReporter>
      <RouteComponent />
    </RequireRankingReporter>
  ),
  staticData: {
    title: 'Rankings',
  },
})

function RouteComponent() {
  const generateRankings = usePostGenerateRankings()
  const generateFactionRankings = usePostFactionRankings()
  const generateRegionSnapshot = usePostGenerateRegionSnapshot()
  const fetchDiscordUsers = usePostFetchDiscordUserIds()
  const postPlayerRankingsToDiscord = usePostPostDiscordRankings()
  const postFactionRankingsToDiscord = usePostPostFactionRankings()

  const rankingTypes = useGetRankingTypes()

  return (
    <div>
      <Card withBorder mb="md">
        <Text>
          Our rankings system is based on <em>snapshots</em>. A snapshot is a
          point-in-time capture of all the players and their points. We generate
          a new snapshot each week, which captures any new events that have been
          imported since the last snapshot. We then use these snapshots to
          calculate rankings and post them to Discord.
        </Text>
        <Text>This is for a few reasons:</Text>
        <List listStyleType="disc">
          <List.Item>Show change in ranking since the last snapshot</List.Item>
          <List.Item>
            Generate graphs showing how top players/factions have changed over
            time
          </List.Item>
          <List.Item>
            If we have to amend things, we can just generate a new snapshot
          </List.Item>
        </List>
        <Text>
          Eventually, this process will be automated. For now it's done by
          clicking buttons. Rankings must be generated _before_ they can be
          posted.
        </Text>
      </Card>

      <Grid>
        <Grid.Col span={{ base: 12 }}>
          <Title order={4}>Fetching Discord Users</Title>
          <Text>
            Discord won't let us query the UK server for users very often, so we
            maintain our own database. If new people join the server, we'll have
            to re-synchronise in order to be able to assign{' '}
            <Link to={IdentitiesRoute.to}> player identities</Link> to players.
          </Text>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Button
            onClick={() => {
              modals.openConfirmModal({
                title: 'Fetch Discord Users from the UK Discord server',
                children: (
                  <div>
                    Are you sure you want to fetch Discord users? This will fail
                    if you do it too often. Eventually this will be maintained
                    automatically. You probably only need to do this if someone
                    has joined the Discord and you can't see them to match to a
                    player from an event.
                  </div>
                ),
                onConfirm: () => {
                  fetchDiscordUsers.mutate()
                },
                labels: { confirm: 'Make it so', cancel: 'Wait...' },
              })
            }}
          >
            Fetch Discord Users
          </Button>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }} />
        <Grid.Col span={{ base: 12 }}>
          <Title order={4}>Player Rankings</Title>
          <Text mb="md">
            Player Rankings are keyed to an individual <em>player</em>. There
            are a variety of ranking <em>types</em>:
          </Text>
          {rankingTypes.data && (
            <List listStyleType="disc" mb="md">
              {rankingTypes.data.map((type) => (
                <List.Item key={type.code}>
                  {type.name}: {type.description}
                </List.Item>
              ))}
            </List>
          )}
          <Text mb="md">
            When you generate player rankings you generate all of them.
          </Text>
          <Text mb="md">
            When you post them to discord they will go to the appropriate
            channels, pinging the <strong>@EventEnthusiast</strong> role as well
            as the players. Normally we do this on Monday morning after an
            event.
          </Text>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Button
            disabled={generateRankings.isPending}
            onClick={() => {
              modals.openConfirmModal({
                onConfirm: () => {
                  generateRankings.mutate()
                },
                title: 'Generate a Player Ranking Snapshot',
                children: (
                  <div>
                    Are you sure you want to generate a new rankings snapshot?
                    Eventually this will be done automatically each week. You
                    probably only need to do this if there's been a new event
                    imported.
                  </div>
                ),
                labels: { confirm: 'Generate', cancel: 'Cancel' },
              })
            }}
          >
            Generate a Player Ranking Snapshot
          </Button>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Button
            onClick={() => {
              modals.openConfirmModal({
                title: 'Post Rankings to Discord',
                children: (
                  <div>
                    <Text>
                      Are you sure you want to post rankings to Discord?
                    </Text>

                    <Text>
                      This will ping the Event Enthusiast role and might be
                      spammy if you do it a lot. Eventually this will be
                      automated to be done every Monday morning.
                    </Text>
                  </div>
                ),
                onConfirm: () => {
                  postPlayerRankingsToDiscord.mutate()
                },
                labels: { confirm: 'Make it so', cancel: 'Wait...' },
              })
            }}
          >
            Post Player Rankings to Discord
          </Button>
        </Grid.Col>
        <Grid.Col span={{ base: 12 }}>
          <Title order={4} mb="md">
            Faction Rankings
          </Title>
          <Text mb="md">
            Faction Rankings are keyed to a <em>faction</em> and include stats
            like number of games played, and <em>points per declaration</em>{' '}
            which is the closest we've come to a 'Faction Power Level'.
          </Text>
          <Text mb="md">
            When you post them to discord they will go to the #faction-standings
            channel.
          </Text>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Button
            disabled={generateFactionRankings.isPending}
            onClick={() => {
              modals.openConfirmModal({
                onConfirm: () => {
                  generateFactionRankings.mutate()
                },
                title: 'Generate Faction Rankings',
                children: (
                  <div>
                    Are you sure you want to generate faction rankings?
                    Eventually this will be done automatically each week. You
                    probably only need to do this if there's been a new event
                    imported.
                  </div>
                ),
                labels: { confirm: 'Generate', cancel: 'Cancel' },
              })
            }}
          >
            Generate Faction Rankings
          </Button>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Button
            onClick={() => {
              modals.openConfirmModal({
                title: 'Post Faction Rankings to Discord',
                children: (
                  <div>
                    <Text>
                      Are you sure you want to post faction rankings to Discord?
                    </Text>

                    <Text>
                      This will ping the Event Enthusiast role and might be
                      spammy if you do it a lot. Eventually this will be
                      automated to be done every Monday morning.
                    </Text>
                  </div>
                ),
                onConfirm: () => {
                  postFactionRankingsToDiscord.mutate({
                    params: { live: 'true' },
                  })
                },
                labels: { confirm: 'Make it so', cancel: 'Wait...' },
              })
            }}
          >
            Post Faction Rankings
          </Button>
        </Grid.Col>

        <Grid.Col span={{ base: 12 }}>
          <Title order={4} mb="md">
            Region Rankings
          </Title>
          <Text mb="md">
            Region Rankings capture a snapshot of event activity per region.
            These are used to power the animated choropleth map.
          </Text>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Button
            disabled={generateRegionSnapshot.isPending}
            onClick={() => {
              modals.openConfirmModal({
                onConfirm: () => {
                  generateRegionSnapshot.mutate()
                },
                title: 'Generate a Region Snapshot',
                children: (
                  <div>
                    Are you sure you want to generate a new region snapshot?
                    This captures current event counts per region and is used to
                    animate the choropleth map.
                  </div>
                ),
                labels: { confirm: 'Generate', cancel: 'Cancel' },
              })
            }}
          >
            Generate a Region Snapshot
          </Button>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }} />
      </Grid>
    </div>
  )
}
