import {
  useDeleteTeamsId,
  useGetTeams,
  usePostCreateTeam,
} from '@/api/hooks'
import { usePermissions } from '@/hooks/usePermissions'
import {
  Anchor,
  Box,
  Button,
  ColorInput,
  Grid,
  Group,
  Paper,
  Table,
  Textarea,
  TextInput,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { modals } from '@mantine/modals'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Route as TeamEditRoute } from './$id'

export const Route = createFileRoute('/app/_app-pages/teams/')({
  component: RouteComponent,
  staticData: { title: 'Teams' },
})

function RouteComponent() {
  const { rankingReporter, isTeamCaptain } = usePermissions()

  const form = useForm<{ name: string; description: string; brand_colour: string }>({
    initialValues: { name: '', description: '', brand_colour: '' },
  })

  const { data: teams } = useGetTeams()
  const createTeam = usePostCreateTeam()
  const deleteTeam = useDeleteTeamsId()

  return (
    <div>
      {rankingReporter && (
        <Paper withBorder p="md" mb="md">
          <form
            onSubmit={form.onSubmit((values) => {
              createTeam.mutate(
                {
                  data: {
                    name: values.name,
                    ...(values.description && { description: values.description }),
                    ...(values.brand_colour && { brand_colour: values.brand_colour }),
                  },
                },
                { onSuccess: () => form.reset() },
              )
            })}
          >
            <Grid>
              <Grid.Col span={{ base: 12, xs: 4 }}>
                <TextInput label="Team Name" required {...form.getInputProps('name')} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, xs: 5 }}>
                <Textarea
                  label="Description"
                  autosize
                  minRows={1}
                  {...form.getInputProps('description')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, xs: 3 }}>
                <ColorInput
                  label="Brand Colour"
                  format="hex"
                  {...form.getInputProps('brand_colour')}
                />
              </Grid.Col>
            </Grid>
            <Box mt="sm">
              <Button type="submit" loading={createTeam.isPending}>
                Create Team
              </Button>
            </Box>
          </form>
        </Paper>
      )}

      {teams && (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Brand Colour</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {teams.map((team) => (
              <Table.Tr key={team.id}>
                <Table.Td>
                  <Anchor component={Link} to={TeamEditRoute.to} params={{ id: String(team.id) }}>
                    {team.name}
                  </Anchor>
                </Table.Td>
                <Table.Td>{team.description ?? ''}</Table.Td>
                <Table.Td>{team.brand_colour ?? ''}</Table.Td>
                <Table.Td w="fit-content">
                  {(rankingReporter || isTeamCaptain(team.id)) && (
                    <Group gap="xs" wrap="nowrap">
                      <Anchor component={Link} to={TeamEditRoute.to} params={{ id: String(team.id) }}>
                        Edit
                      </Anchor>
                      {rankingReporter && (
                        <Anchor
                          c="red"
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            modals.openConfirmModal({
                              title: 'Delete team',
                              centered: true,
                              labels: { confirm: 'Delete', cancel: 'Cancel' },
                              confirmProps: { color: 'red' },
                              children: `Are you sure you want to delete "${team.name}"? This cannot be undone.`,
                              onConfirm: () => deleteTeam.mutate({ id: String(team.id) }),
                            })
                          }}
                        >
                          Delete
                        </Anchor>
                      )}
                    </Group>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </div>
  )
}
