import {
  useFetchDiscordUsersMutation,
  useGenerateFactionRankingsMutation,
  useGenerateRankingsSnapshotMutation,
  useGetUnmappedIdentities,
  useHasRole,
  usePostFactionRankingsToDiscordMutation,
  usePostRankingsToDiscordMutation,
} from '@/hooks/useApi'
import { Route as BotChat } from '@/routes/app/_app-pages/bot-chat'
import { Route as EventsAppRoute } from '@/routes/app/_app-pages/events'
import { Route as ImportBotRoute } from '@/routes/app/_app-pages/import-bot'
import { Route as VenuesRoute } from '@/routes/app/_app-pages/venues'
import { Route as IdentitiesRoute } from '@/routes/app/_app-pages/identities'
import { Route as EventsSiteRoute } from '@/routes/site/_site-pages/events'
import { Route as FactionRankingsRoute } from '@/routes/site/_site-pages/faction-rankings'
import { Route as RankingsRoute } from '@/routes/site/_site-pages/rankings'
import {
  Badge,
  Button,
  Divider,
  Group,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core'
import { AppNavLink } from './app-nav-link'

import { modals } from '@mantine/modals'

export const AppNavbar = () => {
  const generateRankings = useGenerateRankingsSnapshotMutation()
  const generateFactionRankings = useGenerateFactionRankingsMutation()
  const fetchDiscordUsers = useFetchDiscordUsersMutation()
  const postPlayerRankingsToDiscord = usePostRankingsToDiscordMutation()
  const postFactionRankingsToDiscord = usePostFactionRankingsToDiscordMutation()

  const unmappedIdentities = useGetUnmappedIdentities()

  return (
    <ScrollArea>
      <Stack>
        <AppNavLink
          to={IdentitiesRoute.to}
          label={
            <Group gap={3}>
              <span>Identities</span>
              {((unmappedIdentities.data && unmappedIdentities.data.length) ||
                0) > 0 && (
                <Badge color="red">{unmappedIdentities.data?.length}</Badge>
              )}
            </Group>
          }
        />

        <AppNavLink to={EventsAppRoute.to} label="Edit Events" />
        <AppNavLink to={VenuesRoute.to} label="Venue" />
        <AppNavLink to={BotChat.to} label="Bot Chat" />
        <AppNavLink to={ImportBotRoute.to} label="Import BOT event" />
        <Button
          disabled={generateRankings.isPending}
          onClick={() => {
            modals.openConfirmModal({
              onConfirm: () => {
                generateRankings.mutate()
              },
              title: 'Generate Rankings Snapshot',
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
          Generate a rankings snapshot
        </Button>

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
                  Are you sure you want to generate faction rankings? Eventually
                  this will be done automatically each week. You probably only
                  need to do this if there's been a new event imported.
                </div>
              ),
              labels: { confirm: 'Generate', cancel: 'Cancel' },
            })
          }}
        >
          Generate Faction Rankings
        </Button>

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
                    This will ping the Event Enthusiast role and might be spammy
                    if you do it a lot. Eventually this will be automated to be
                    done every Monday morning.
                  </Text>
                </div>
              ),
              onConfirm: () => {
                postFactionRankingsToDiscord.mutate(true)
              },
              labels: { confirm: 'Make it so', cancel: 'Wait...' },
            })
          }}
        >
          Post Faction Rankings
        </Button>

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
                    This will ping the Event Enthusiast role and might be spammy
                    if you do it a lot. Eventually this will be automated to be
                    done every Monday morning.
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
          Post Discord Rankings
        </Button>
      </Stack>
    </ScrollArea>
  )
}
