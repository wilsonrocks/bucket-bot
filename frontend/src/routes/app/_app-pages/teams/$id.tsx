import {
  useDeleteTeamsTeamIdMembersMembershipId,
  useGetPlayers,
  useGetTeamsId,
  useGetVenues,
  usePatchTeamsTeamIdMembersMembershipId,
  usePostTeamsTeamIdMembers,
  usePutTeamsId,
  uploadTeamImage,
} from '@/api/hooks'
import { usePermissions } from '@/hooks/usePermissions'
import {
  Badge,
  Box,
  Button,
  Center,
  ColorInput,
  Grid,
  Group,
  Image,
  Overlay,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useHover } from '@mantine/hooks'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import z from 'zod'
import { Route as TeamsRoute } from './index'

export const Route = createFileRoute('/app/_app-pages/teams/$id')({
  component: RouteComponent,
  params: z.object({ id: z.string() }),
  staticData: {},
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { rankingReporter, isTeamCaptain, isLoading: permissionsLoading } = usePermissions()
  const navigate = useNavigate()

  useEffect(() => {
    if (permissionsLoading) return
    if (!rankingReporter && !isTeamCaptain(Number(id))) {
      navigate({ to: TeamsRoute.to })
    }
  }, [permissionsLoading, rankingReporter, id])

  const { data: team } = useGetTeamsId(id)
  const { data: players } = useGetPlayers()
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
    initialValues: { name: '', description: '', brand_colour: '', image_key: null, venue_id: null },
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

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const { hovered: imageHovered, ref: imageHoverRef } = useHover()
  const imageInputRef = useRef<HTMLInputElement>(null)

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
            <Grid.Col span={{ base: 12, xs: 4 }}>
              <Select
                label="Venue"
                placeholder="Select venue..."
                searchable
                clearable
                data={venues?.map((v) => ({ value: String(v.id), label: `${v.name} (${v.town})` })) ?? []}
                {...editForm.getInputProps('venue_id')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, xs: 4 }}>
              <Text size="sm" fw={500} mb={4}>Team Image</Text>
              <Box
                ref={imageHoverRef}
                w={120}
                h={120}
                style={{ position: 'relative', cursor: 'pointer', borderRadius: 'var(--mantine-radius-sm)', border: '1px solid var(--mantine-color-default-border)', overflow: 'hidden' }}
                onClick={() => imageInputRef.current?.click()}
              >
                {imagePreview ? (
                  <Image src={imagePreview} w={120} h={120} fit="contain" />
                ) : (
                  <Center h={120} c="dimmed">
                    <Text size="xs">Click to upload</Text>
                  </Center>
                )}
                {imageHovered && (
                  <Overlay color="#000" backgroundOpacity={0.5} radius="sm">
                    <Center h="100%">
                      <Text size="xs" c="white">{imagePreview ? 'Change' : 'Upload'}</Text>
                    </Center>
                  </Overlay>
                )}
              </Box>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setImageFile(file)
                  if (file) setImagePreview(URL.createObjectURL(file))
                  e.target.value = ''
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
          <Button
            mb={4}
            disabled={!selectedPlayerId}
            loading={addMember.isPending}
            onClick={() => {
              if (!selectedPlayerId) return
              addMember.mutate(
                {
                  teamId: String(id),
                  data: { player_id: Number(selectedPlayerId), is_captain: false },
                },
                {
                  onSuccess: () => {
                    setSelectedPlayerId(null)
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
