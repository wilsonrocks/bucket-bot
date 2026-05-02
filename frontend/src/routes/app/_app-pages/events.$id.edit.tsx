import { EventEditPlayerList } from '@/components/event-edit-player-list'
import { Link } from '@/components/link'

type TourneyFields = {
  name: string
  organiser_discord_id: string | null
  venue_id: number | null
  rounds: number | null
  days: number | null
  tier_code: string
  discord_post_id: string | null
}

import {
  uploadTeamImage,
  useGetAllDiscordUsers,
  useGetTiers,
  useGetTourneyId,
  useGetVenues,
  usePostPostDiscordEventTourneyId,
  usePostTourney,
} from '@/api/hooks'
import {
  ActionIcon,
  Button,
  Grid,
  NumberInput,
  Paper,
  Select,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import z from 'zod'
import { Tabs } from '@/components/routed-tabs'
import { IconTrash } from '@tabler/icons-react'
import { ImageUploader } from '@/components/ImageUploader'
import { FeatureFlag } from '@/components/FeatureFlag'

const eventParamsValidator = z.object({ id: z.coerce.number() })

export const Route = createFileRoute('/app/_app-pages/events/$id/edit')({
  component: () => <RequireRankingReporter><RouteComponent /></RequireRankingReporter>,
  params: eventParamsValidator,
})

function RouteComponent() {
  const { id } = Route.useParams()

  const detailsForm = useForm<{
    eventName: string
    organiserDiscordId: string
    venueId: string
    rounds: number | null
    days: number | null
    tier: string
    paintingCategories: {
      id?: number
      name: string
      winners: {
        playerIdentityId: string
        position: number
        model: string
        description: string
        imageKey: string | null
        _pendingFile: File | null
      }[]
    }[]
  }>({
    initialValues: {
      eventName: '',
      organiserDiscordId: '',
      venueId: '',
      rounds: 3,
      days: 1,
      tier: 'Event',
      paintingCategories: [],
    },
  })

  const tourneyDetail = useGetTourneyId(String(id))

  useEffect(() => {
    if (tourneyDetail.data) {
      const tourney = tourneyDetail.data.tourney as TourneyFields
      detailsForm.setValues({
        eventName: tourney.name,
        organiserDiscordId: tourney.organiser_discord_id || '',
        venueId: tourney.venue_id?.toString() || '',
        rounds: tourney.rounds ?? null,
        days: tourney.days ?? null,
        tier: tourney.tier_code,
      })

      const rawCategories = (tourneyDetail.data.paintingCategories as any[]) ?? []
      detailsForm.setFieldValue('paintingCategories', rawCategories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        winners: (cat.winners ?? []).map((w: any) => ({
          playerIdentityId: String(w.playerIdentityId),
          position: w.position,
          model: w.model ?? '',
          description: w.description ?? '',
          imageKey: w.imageKey ?? null,
          _pendingFile: null,
        }))
      })))
    }
  }, [tourneyDetail.isFetched])

  const discordUsers = useGetAllDiscordUsers()
  const venues = useGetVenues()

  const tiers = useGetTiers()
  const updateTourney = usePostTourney(id)
  const postToDiscord = usePostPostDiscordEventTourneyId()

  if (
    !tourneyDetail.data ||
    !tiers.data ||
    !venues.data ||
    !discordUsers.data
  ) {
    return <div>Loading...</div>
  }

  // TODO can these tab panels be their own components?

  return (
    <div>
      <Title order={1} mb="md">
        {(tourneyDetail.data.tourney as TourneyFields).name}
      </Title>

      <Tabs defaultValue="details">
        <Tabs.List>
          <Tabs.Tab value="details">Details</Tabs.Tab>
          <FeatureFlag flag="BEST_PAINTED"><Tabs.Tab value="bestPainted">Best Painted</Tabs.Tab></FeatureFlag>
          <Tabs.Tab value="players">Players</Tabs.Tab>
          <Tabs.Tab value="discord">Discord</Tabs.Tab>
        </Tabs.List>
        <Paper p="md" m="md">
          <Tabs.Panel value="details">
            <form
              onSubmit={detailsForm.onSubmit((values) => {
                const payload = {
                  id,
                  organiserDiscordId: values.organiserDiscordId,
                  venueId: values.venueId ? Number(values.venueId) : undefined,
                  name: values.eventName,
                  rounds: values.rounds ?? 3,
                  days: values.days ?? 1,
                  tierCode: values.tier,
                }
                updateTourney.mutate({ data: payload })
              })}
            >
              <Title order={3} mb="md">
                Details
              </Title>
              <Grid gutter="sm">
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <TextInput
                    label="Event Name"
                    {...detailsForm.getInputProps('eventName')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Select
                    searchable
                    label="Organiser"
                    data={discordUsers.data.map((user) => ({
                      value: String(user.discord_user_id),
                      label: (
                        user.name ||
                        user.discord_display_name ||
                        user.discord_username ||
                        user.discord_user_id
                      ) as string,
                    }))}
                    {...detailsForm.getInputProps('organiserDiscordId')}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Select
                    label="Venue"
                    data={venues.data.map((venue) => ({
                      value: venue.id.toString(),
                      label: `${venue.name} - ${venue.town}` as string,
                    }))}
                    {...detailsForm.getInputProps('venueId')}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 4, sm: 2 }}>
                  <NumberInput
                    label="Rounds"
                    min={1}
                    allowDecimal={false}
                    {...detailsForm.getInputProps('rounds')}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 4, sm: 2 }}>
                  <NumberInput
                    label="Days"
                    min={1}
                    allowDecimal={false}
                    {...detailsForm.getInputProps('days')}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 6, sm: 2 }}>
                  <Select
                    label="Tier"
                    data={tiers.data.map((tier) => ({
                      value: tier.code,
                      label: tier.name,
                    }))}
                    {...detailsForm.getInputProps('tier')}
                  />
                </Grid.Col>
              </Grid>
              <Button color="green" type="submit" mt="md">
                Save Changes
              </Button>
            </form>
          </Tabs.Panel>
        </Paper>
        <Tabs.Panel value="bestPainted">
          <FeatureFlag flag="BEST_PAINTED">
          <Title order={3} mb="md">Best Painted</Title>

          {detailsForm.values.paintingCategories.map((category, catIndex) => (
            <Paper key={catIndex} withBorder m="md" p="md">
              <Grid align="flex-end">
                <Grid.Col span={{ base: 10, xs: 4 }}>
                  <TextInput
                    label="Category Name"
                    {...detailsForm.getInputProps(`paintingCategories.${catIndex}.name`)}
                  />
                </Grid.Col>
                <Grid.Col span={2}>
                  <ActionIcon color="red" onClick={() => detailsForm.removeListItem('paintingCategories', catIndex)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Grid.Col>
              </Grid>

              {category.winners.map((winner, winIndex) => (
                <Paper key={winIndex} withBorder mt="sm" p="sm">
                  <Grid align="flex-end">
                    <Grid.Col span={{ base: 12, xs: 1 }}>
                      <Text size="sm" c="dimmed">#{winner.position}</Text>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, xs: 3 }}>
                      <Select
                        label="Player"
                        searchable
                        data={tourneyDetail.data.players.map((player: any) => ({
                          value: String(player.playerIdentityId),
                          label: player.playerName,
                        }))}
                        {...detailsForm.getInputProps(`paintingCategories.${catIndex}.winners.${winIndex}.playerIdentityId`)}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, xs: 2 }}>
                      <TextInput label="Model(s)" {...detailsForm.getInputProps(`paintingCategories.${catIndex}.winners.${winIndex}.model`)} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, xs: 2 }}>
                      <TextInput label="Description" {...detailsForm.getInputProps(`paintingCategories.${catIndex}.winners.${winIndex}.description`)} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, xs: 2 }}>
                      <ImageUploader
                        value={winner.imageKey}
                        preview={winner._pendingFile ? URL.createObjectURL(winner._pendingFile) : null}
                        onChange={(file) => {
                          detailsForm.setFieldValue(`paintingCategories.${catIndex}.winners.${winIndex}._pendingFile`, file)
                        }}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, xs: 1 }}>
                      <ActionIcon color="red" onClick={() => detailsForm.removeListItem(`paintingCategories.${catIndex}.winners` as any, winIndex)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Grid.Col>
                  </Grid>
                </Paper>
              ))}

              <Button
                mt="sm"
                size="xs"
                variant="light"
                onClick={() => detailsForm.insertListItem(`paintingCategories.${catIndex}.winners`, {
                  playerIdentityId: '',
                  position: category.winners.length + 1,
                  model: '',
                  description: '',
                  imageKey: null,
                  _pendingFile: null,
                })}
              >
                Add Winner
              </Button>
            </Paper>
          ))}

          <Button
            mt="md"
            variant="light"
            onClick={() => detailsForm.insertListItem('paintingCategories', {
              name: '',
              winners: [],
            })}
          >
            Add Category
          </Button>

          <Button
            mt="md"
            ml="sm"
            color="green"
            loading={updateTourney.isPending}
            onClick={async () => {
              let processedCategories
              try {
                processedCategories = await Promise.all(
                detailsForm.values.paintingCategories.map(async (cat) => ({
                  id: cat.id,
                  name: cat.name,
                  winners: await Promise.all(
                    cat.winners.map(async (winner, i) => {
                      let imageKey = winner.imageKey
                      if (winner._pendingFile) {
                        imageKey = await uploadTeamImage(winner._pendingFile, 'painting')
                      }
                      return {
                        playerIdentityId: Number(winner.playerIdentityId),
                        position: i + 1,
                        model: winner.model || null,
                        description: winner.description || null,
                        imageKey,
                      }
                    })
                  )
                }))
              )
              } catch {
                return
              }

              updateTourney.mutate({
                data: {
                  id,
                  organiserDiscordId: detailsForm.values.organiserDiscordId,
                  venueId: detailsForm.values.venueId ? Number(detailsForm.values.venueId) : undefined,
                  name: detailsForm.values.eventName,
                  rounds: detailsForm.values.rounds ?? 3,
                  days: detailsForm.values.days ?? 1,
                  tierCode: detailsForm.values.tier,
                  paintingCategories: processedCategories,
                } as any
              })
            }}
          >
            Save Best Painted
          </Button>
          </FeatureFlag>
        </Tabs.Panel>
        <Tabs.Panel value="players">
          <Title order={3} mb="md">
            Players
          </Title>
          <EventEditPlayerList players={tourneyDetail.data.players as any} />
        </Tabs.Panel>

        <Tabs.Panel value="discord">
          <Title order={3} mb="md">
            Discord
          </Title>
          <Button
            disabled={(tourneyDetail.data.tourney as TourneyFields).discord_post_id !== null}
            onClick={() => {
              postToDiscord.mutate({ tourneyId: String(id) })
            }}
          >
            Post Results to Discord
          </Button>

          {(tourneyDetail.data.tourney as TourneyFields).discord_post_id && (
            <Link to={`${(tourneyDetail.data.tourney as TourneyFields).discord_post_id}`}>
              View Discord Message
            </Link>
          )}
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
