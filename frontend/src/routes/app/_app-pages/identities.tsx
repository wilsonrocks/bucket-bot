import { DiscordLookup } from '@/components/discord-lookup'
import { toOrdinal } from '@/helpers/to-ordinal'
import { useGetUnmappedIdentities, usePostPlayerIdentityIdIgnore } from '@/api/hooks'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { Badge, Button, Card, Divider, Group, List, Stack, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/app/_app-pages/identities')({
  component: () => <RequireRankingReporter><RouteComponent /></RequireRankingReporter>,
  staticData: { title: 'Identities' },
})

function IdentityCard({ identity }: { identity: NonNullable<ReturnType<typeof useGetUnmappedIdentities>['data']>[number] }) {
  const ignoreMutation = usePostPlayerIdentityIdIgnore()
  const [confirmingIgnore, setConfirmingIgnore] = useState(false)

  useEffect(() => {
    if (!confirmingIgnore) return
    const timer = setTimeout(() => setConfirmingIgnore(false), 4000)
    return () => clearTimeout(timer)
  }, [confirmingIgnore])

  const handleIgnore = () => {
    if (!confirmingIgnore) {
      setConfirmingIgnore(true)
      return
    }
    setConfirmingIgnore(false)
    ignoreMutation.mutate({ id: identity.player_identity_id, data: { ignored: true } })
  }

  return (
    <Card withBorder padding="md">
      <Group justify="space-between" mb="xs">
        <Group gap="sm">
          <Badge variant="light">{identity.provider_name}</Badge>
          <Text fw={600}>{identity.name}</Text>
        </Group>
        <Button
          variant="subtle"
          color={confirmingIgnore ? 'yellow' : 'gray'}
          size="compact-sm"
          loading={ignoreMutation.isPending}
          onClick={handleIgnore}
        >
          {confirmingIgnore ? 'Confirm ignore?' : 'Ignore'}
        </Button>
      </Group>

      {identity.results.length > 0 && (
        <List listStyleType="disc" size="sm" mb="sm">
          {identity.results.map(({ place, faction, tourney_name }) => (
            <List.Item key={`${place}-${tourney_name}-${faction}`}>
              {`${toOrdinal(place ?? 0)} place at ${tourney_name} with ${faction}`}
            </List.Item>
          ))}
        </List>
      )}

      <Divider my="sm" />

      <DiscordLookup
        playerIdentityId={identity.player_identity_id}
        initialText={identity.name ?? ''}
      />
    </Card>
  )
}

function RouteComponent() {
  const unmappedIdentities = useGetUnmappedIdentities()

  if (!unmappedIdentities.data) {
    return <div>Loading...</div>
  }

  if (unmappedIdentities.data.length === 0) {
    return <div>All identities are mapped!</div>
  }

  return (
    <Stack>
      <div>
        <Text mb="xs">
          An identity is a player's account with either Longshanks or Bag of
          Tools. A player can have several identities - many players will have one
          for Longshanks <em>and</em> Bag of Tools. It's possible to have more
          than two - in the case of someone making a new Longshanks account.
        </Text>
        <Text>
          Here is where we can take unassigned identities and map them to a player
          on the UK Malifaux Discord.
        </Text>
      </div>

      {unmappedIdentities.data.map((identity) => (
        <IdentityCard key={identity.player_identity_id} identity={identity} />
      ))}
    </Stack>
  )
}
