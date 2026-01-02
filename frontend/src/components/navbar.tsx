import { Button, Divider, Stack, Text } from '@mantine/core'
import { AppNavLink } from './app-nav-link'
import {
  useFetchDiscordUsersMutation,
  useGenerateRankingsSnapshotMutation,
  useHasRole,
  usePostRankingsToDiscordMutation,
} from '@/hooks/useApi'
import { Route as EventsSiteRoute } from '@/routes/site/events'
import { Route as EventsAppRoute } from '@/routes/app/_app-pages/events/index.tsx'
import { Route as RankingsRoute } from '@/routes/site/rankings'
import { Route as DiscordMappingRoute } from '@/routes/app/discord-mapping'
import { modals } from '@mantine/modals'

export const Navbar = () => {
  const hasRole = useHasRole()
  const generateRankings = useGenerateRankingsSnapshotMutation()
  const fetchDiscordUsers = useFetchDiscordUsersMutation()
  const postToDiscord = usePostRankingsToDiscordMutation()

  return (
    <Stack>
      <AppNavLink to={EventsSiteRoute.path} label="Events" />
      <AppNavLink to={RankingsRoute.path} label="Rankings" />
      {hasRole && (
        <>
          <Divider />
          <AppNavLink to={EventsAppRoute.path} label="Edit Events" />
          <AppNavLink to={DiscordMappingRoute.path} label="Discord Mapping" />
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
                      This will ping the Event Enthusiast role and might be
                      spammy if you do it a lot. Eventually this will be
                      automated to be done every Monday morning.
                    </Text>
                  </div>
                ),
                onConfirm: () => {
                  postToDiscord.mutate()
                },
                labels: { confirm: 'Make it so', cancel: 'Wait...' },
              })
            }}
          >
            Post Discord Rankings
          </Button>
        </>
      )}
    </Stack>
  )
}
