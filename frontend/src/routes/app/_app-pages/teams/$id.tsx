import {
  useDeleteTeamsTeamIdMembersMembershipId,
  useGetPlayers,
  useGetTeamsId,
  usePatchTeamsTeamIdMembersMembershipId,
  usePostTeamsTeamIdMembers,
  usePutTeamsId,
} from '@/api/hooks'
import {
  Badge,
  Box,
  Button,
  Checkbox,
  ColorInput,
  Grid,
  Group,
  Paper,
  Select,
  Table,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import z from 'zod'

export const Route = createFileRoute('/app/_app-pages/teams/$id')({
  component: RouteComponent,
  params: z.object({ id: z.string() }),
  staticData: {},
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: team } = useGetTeamsId(id)
  const { data: players } = useGetPlayers()

  const updateTeam = usePutTeamsId(Number(id))
  const addMember = usePostTeamsTeamIdMembers(Number(id))
  const updateMember = usePatchTeamsTeamIdMembersMembershipId(Number(id))
  const removeMember = useDeleteTeamsTeamIdMembersMembershipId(Number(id))

  const editForm = useForm<{ name: string; description: string; brand_colour: string }>({
    initialValues: { name: '', description: '', brand_colour: '' },
  })

  useEffect(() => {
    if (team) {
      editForm.setValues({
        name: team.name,
        description: team.description ?? '',
        brand_colour: team.brand_colour ?? '',
      })
    }
  }, [team?.id])

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [isCaptain, setIsCaptain] = useState(false)

  const existingPlayerIds = new Set(team?.members.map((m) => m.player_id) ?? [])

  const playerOptions =
    players
      ?.filter((p) => !existingPlayerIds.has(p.id))
      .map((p) => ({ value: String(p.id), label: p.name })) ?? []

  if (!team) return <div>Loading...</div>

  return (
    <div>
      <Title order={3} mb="md">
        {team.name}
      </Title>

      <Paper withBorder p="md" mb="md">
        <Title order={5} mb="sm">Edit Details</Title>
        <form
          onSubmit={editForm.onSubmit((values) => {
            updateTeam.mutate({
              id,
              data: {
                name: values.name || undefined,
                description: values.description || null,
                brand_colour: values.brand_colour || null,
              },
            })
          })}
        >
          <Grid>
            <Grid.Col span={{ base: 12, xs: 4 }}>
              <TextInput label="Team Name" required {...editForm.getInputProps('name')} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, xs: 5 }}>
              <Textarea
                label="Description"
                autosize
                minRows={1}
                {...editForm.getInputProps('description')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, xs: 3 }}>
              <ColorInput
                label="Brand Colour"
                format="hex"
                {...editForm.getInputProps('brand_colour')}
              />
            </Grid.Col>
          </Grid>
          <Box mt="sm">
            <Button type="submit" loading={updateTeam.isPending}>
              Save Changes
            </Button>
          </Box>
        </form>
      </Paper>

      <Paper withBorder p="md" mb="md">
        <Title order={5} mb="sm">Members</Title>

        {team.members.length > 0 && (
          <Table mb="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Player</Table.Th>
                <Table.Th>Captain</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {team.members.map((member) => (
                <Table.Tr key={member.membership_id}>
                  <Table.Td>{member.player_name}</Table.Td>
                  <Table.Td>
                    {member.is_captain ? (
                      <Badge
                        color="yellow"
                        rightSection={
                          <Box
                            style={{ cursor: 'pointer', lineHeight: 1 }}
                            onClick={() =>
                              updateMember.mutate({
                                teamId: String(id),
                                membershipId: String(member.membership_id),
                                data: { is_captain: false },
                              })
                            }
                          >
                            ×
                          </Box>
                        }
                      >
                        Captain
                      </Badge>
                    ) : (
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        onClick={() =>
                          updateMember.mutate({
                            teamId: String(id),
                            membershipId: String(member.membership_id),
                            data: { is_captain: true },
                          })
                        }
                      >
                        Make captain
                      </Button>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      color="red"
                      onClick={() =>
                        removeMember.mutate({
                          teamId: String(id),
                          membershipId: String(member.membership_id),
                        })
                      }
                    >
                      Remove
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        <Group align="flex-end">
          <Select
            label="Add member"
            placeholder="Search players..."
            searchable
            data={playerOptions}
            value={selectedPlayerId}
            onChange={setSelectedPlayerId}
            w={250}
          />
          <Checkbox
            label="Captain"
            checked={isCaptain}
            onChange={(e) => setIsCaptain(e.currentTarget.checked)}
            mb={4}
          />
          <Button
            mb={4}
            disabled={!selectedPlayerId}
            loading={addMember.isPending}
            onClick={() => {
              if (!selectedPlayerId) return
              addMember.mutate(
                {
                  teamId: String(id),
                  data: { player_id: Number(selectedPlayerId), is_captain: isCaptain },
                },
                {
                  onSuccess: () => {
                    setSelectedPlayerId(null)
                    setIsCaptain(false)
                  },
                },
              )
            }}
          >
            Add
          </Button>
        </Group>
      </Paper>
    </div>
  )
}
