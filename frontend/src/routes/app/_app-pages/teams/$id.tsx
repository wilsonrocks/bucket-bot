import {
  uploadTeamImage,
  useDeleteTeamsTeamIdMembersMembershipId,
  useGetSearchDiscordUsers,
  useGetTeamsId,
  useGetVenues,
  usePatchTeamsTeamIdMembersMembershipId,
  usePostTeamsTeamIdMembers,
  usePutTeamsId,
} from '@/api/hooks'
import { usePermissions } from '@/hooks/usePermissions'
import { ImageUploader } from '@/components/ImageUploader'
import {
  Alert,
  Badge,
  Box,
  Button,
  ColorInput,
  Grid,
  Group,
  Modal,
  Paper,
  Select,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { IconAlertCircle } from '@tabler/icons-react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import z from 'zod'
import { Route as TeamsRoute } from './index'

export const Route = createFileRoute('/app/_app-pages/teams/$id')({
  component: RouteComponent,
  params: z.object({ id: z.string() }),
  staticData: {},
})

function RouteComponent() {
  const { id } = Route.useParams()
  const {
    rankingReporter,
    isTeamCaptain,
    isLoading: permissionsLoading,
  } = usePermissions()
  const navigate = useNavigate()

  useEffect(() => {
    if (permissionsLoading) return
    if (!rankingReporter && !isTeamCaptain(Number(id))) {
      navigate({ to: TeamsRoute.to })
    }
  }, [permissionsLoading, rankingReporter, id])

  const { data: team } = useGetTeamsId(id)
  const { data: venues } = useGetVenues()

  const updateTeam = usePutTeamsId(Number(id))
  const addMember = usePostTeamsTeamIdMembers(Number(id))
  const updateMember = usePatchTeamsTeamIdMembersMembershipId(Number(id))
  const removeMember = useDeleteTeamsTeamIdMembersMembershipId(Number(id))

  const editForm = useForm<{
    name: string
    description: string
    brand_colour: string
    image_key: string | null
    venue_id: string | null
  }>({
    initialValues: {
      name: '',
      description: '',
      brand_colour: '',
      image_key: null,
      venue_id: null,
    },
  })

  useEffect(() => {
    if (team) {
      editForm.setValues({
        name: team.name,
        description: team.description ?? '',
        brand_colour: team.brand_colour ?? '',
        image_key: team.image_key ?? null,
        venue_id: team.venue_id != null ? String(team.venue_id) : null,
      })
      if (team.image_key) {
        setImagePreview(
          `${import.meta.env.VITE_ASSETS_URL}/${team.image_key}-w150.png`,
        )
      }
    }
  }, [team?.id])

  const [discordSearch, setDiscordSearch] = useState('')
  const [selectedDiscordUserId, setSelectedDiscordUserId] = useState<
    string | null
  >(null)
  const [joinModalOpened, { open: openJoinModal, close: closeJoinModal }] =
    useDisclosure(false)
  const { data: discordResults } = useGetSearchDiscordUsers(
    { text: discordSearch },
    { query: { enabled: discordSearch.trim().length > 0 } },
  )
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  if (!team) return <div>Loading...</div>

  return (
    <div>
      <Title order={3} mb="md">
        {team.name}
      </Title>

      <Paper withBorder p="md" mb="md">
        <Title order={5} mb="sm">
          Edit Details
        </Title>
        <form
          onSubmit={editForm.onSubmit(async (values) => {
            let image_key = values.image_key
            if (imageFile) {
              image_key = await uploadTeamImage(imageFile, 'team')
              setImageFile(null)
            }
            updateTeam.mutate({
              id,
              data: {
                name: values.name || undefined,
                description: values.description || null,
                brand_colour: values.brand_colour || null,
                image_key,
                venue_id: values.venue_id ? Number(values.venue_id) : null,
              },
            })
          })}
        >
          <Grid>
            <Grid.Col span={{ base: 12, xs: 4 }}>
              <TextInput
                label="Team Name"
                required
                {...editForm.getInputProps('name')}
              />
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
            <Grid.Col span={{ base: 12, xs: 4 }}>
              <Select
                label="Venue"
                placeholder="Select venue..."
                searchable
                clearable
                data={
                  venues?.map((v) => ({
                    value: String(v.id),
                    label: `${v.name} (${v.town})`,
                  })) ?? []
                }
                {...editForm.getInputProps('venue_id')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, xs: 4 }}>
              <ImageUploader
                label="Team Image"
                value={editForm.values.image_key}
                preview={imagePreview}
                onChange={(file) => {
                  setImageFile(file)
                  setImagePreview(URL.createObjectURL(file))
                }}
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
        <Title order={5} mb="sm">
          Members
        </Title>

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
            placeholder="Search Discord users..."
            searchable
            data={
              discordResults?.map((u) => {
                return {
                  value: u.discord_user_id,
                  label:
                    u.discord_display_name ||
                    u.discord_username ||
                    u.discord_user_id,
                }
              }) ?? []
            }
            value={selectedDiscordUserId}
            onChange={setSelectedDiscordUserId}
            onSearchChange={setDiscordSearch}
            searchValue={discordSearch}
            w={250}
          />
          <Button
            mb={4}
            disabled={!selectedDiscordUserId}
            onClick={openJoinModal}
          >
            Add
          </Button>
        </Group>
        {addMember.isError && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mt="xs">
            {addMember.error?.message ?? 'Failed to add member'}
          </Alert>
        )}

        <Modal
          opened={joinModalOpened}
          onClose={closeJoinModal}
          title="When did this player join?"
          centered
        >
          <Text size="sm" c="dimmed" mb="md">
            Players added from the start will be included in early 2026 event
            stats.
          </Text>
          <Group>
            <Button
              loading={addMember.isPending}
              onClick={() => {
                if (!selectedDiscordUserId) return
                addMember.mutate(
                  {
                    teamId: String(id),
                    data: {
                      discord_user_id: selectedDiscordUserId,
                      is_captain: false,
                      founding_member: true,
                    },
                  },
                  {
                    onSuccess: () => {
                      setSelectedDiscordUserId(null)
                      setDiscordSearch('')
                      closeJoinModal()
                    },
                  },
                )
              }}
            >
              From the start
            </Button>
            <Button
              variant="default"
              loading={addMember.isPending}
              onClick={() => {
                if (!selectedDiscordUserId) return
                addMember.mutate(
                  {
                    teamId: String(id),
                    data: {
                      discord_user_id: selectedDiscordUserId,
                      is_captain: false,
                      founding_member: false,
                    },
                  },
                  {
                    onSuccess: () => {
                      setSelectedDiscordUserId(null)
                      setDiscordSearch('')
                      closeJoinModal()
                    },
                  },
                )
              }}
            >
              Joining now
            </Button>
          </Group>
        </Modal>
      </Paper>
    </div>
  )
}
