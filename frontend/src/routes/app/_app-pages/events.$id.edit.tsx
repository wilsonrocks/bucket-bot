import { EventEditPlayerList } from '@/components/event-edit-player-list'
import { Link } from '@/components/link'

import {
  useGetAllDiscordUsers,
  useGetTiers,
  useGetTourneyDetail,
  useGetVenues,
  usePostEventToDiscordMutation,
  useUpdateTourneyMutation,
} from '@/hooks/useApi'
import {
  Alert,
  Button,
  Grid,
  NumberInput,
  Paper,
  Select,
  Tabs,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import z from 'zod'

const eventParamsValidator = z.object({ id: z.coerce.number() })

export const Route = createFileRoute('/app/_app-pages/events/$id/edit')({
  component: RouteComponent,
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
    categories: {
      name: string
      winners: {
        playerId: number
        model: string
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
      categories: [{ name: 'Totem', winners: [] }],
    },
  })

  // TODO implement this, it's being done manually at the momen
  // const bestPaintedForm = useForm<{
  //   categories: {
  //     name: string
  //     winners: {
  //       playerId: number
  //       model: string
  //     }[]
  //   }[]
  // }>({
  //   initialValues: {
  //     categories: [{ name: 'Crew', winners: [] }],
  //   },
  // })

  const tourneyDetail = useGetTourneyDetail(id)

  useEffect(() => {
    if (tourneyDetail.data) {
      detailsForm.setValues({
        eventName: tourneyDetail.data.tourney.name,
        organiserDiscordId:
          tourneyDetail.data.tourney.organiser_discord_id || '',
        venueId: tourneyDetail.data.tourney.venue_id?.toString() || '',
        rounds: tourneyDetail.data.tourney.rounds ?? null,
        days: tourneyDetail.data.tourney.days ?? null,
        tier: tourneyDetail.data.tourney.tier_code,
      })
    }
  }, [tourneyDetail.isFetched])

  const discordUsers = useGetAllDiscordUsers()
  const venues = useGetVenues()

  const tiers = useGetTiers()
  const updateTourney = useUpdateTourneyMutation()
  const postToDiscord = usePostEventToDiscordMutation()

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
        {tourneyDetail.data.tourney.name}
      </Title>

      <Tabs defaultValue="details">
        <Tabs.List>
          <Tabs.Tab value="details">Details</Tabs.Tab>
          <Tabs.Tab value="bestPainted">Best Painted</Tabs.Tab>
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
                  rounds: values.rounds,
                  days: values.days,
                  tierCode: values.tier,
                }
                updateTourney.mutate(payload)
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
                      label:
                        user.name ||
                        user.discord_display_name ||
                        user.discord_username,
                    }))}
                    {...detailsForm.getInputProps('organiserDiscordId')}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Select
                    label="Venue"
                    data={venues.data.map((venue) => ({
                      value: venue.id.toString(),
                      label: venue.name,
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
          <Title order={3} mb="md">
            Best Painted
          </Title>
          <Alert title="Coming Soon">
            This is a work in progress. For the moment speak to James about
            doing this manually in the database.
          </Alert>
          {/* {false && (
            <Paper p="md">
              {detailsForm.values.categories.map((category, catIndex) => (
                <Paper key={catIndex} withBorder m="md" p="md">
                  <Grid align="flex-end">
                    <Grid.Col span={{ base: 10, xs: 4 }}>
                      <TextInput
                        label="Painting Category"
                        {...detailsForm.getInputProps(
                          `categories.${catIndex}.name`,
                        )}
                      />
                    </Grid.Col>
                    <Grid.Col span={2}>
                      <ActionIcon
                        color="red"
                        onClick={() =>
                          detailsForm.removeListItem('categories', catIndex)
                        }
                      >
                        <IconTrash />
                      </ActionIcon>
                    </Grid.Col>
                  </Grid>
                  {category.winners.map((winner, winIndex) => (
                    <Paper>
                      <Grid align="flex-end" key={winIndex}>
                        <Grid.Col span={{ base: 12, xs: 1 }}>
                          {winIndex + 1}.
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, xs: 3 }}>
                          <Select
                            label="Player"
                            searchable
                            data={tourneyDetail.data.players.map((player) => ({
                              value: player.playerId.toString(),
                              label: player.playerName,
                            }))}
                            {...detailsForm.getInputProps(
                              `categories.${catIndex}.winners.${winIndex}.playerId`,
                            )}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, xs: 4 }}>
                          <TextInput
                            label="Model(s)"
                            {...detailsForm.getInputProps(
                              `categories.${catIndex}.winners.${winIndex}.model`,
                            )}
                          />
                        </Grid.Col>
                        <Grid.Col
                          span={{ base: 12, xs: 2 }}
                          offset={{ base: 10, xs: 0 }}
                        >
                          <ActionIcon
                            color="red"
                            onClick={() =>
                              detailsForm.removeListItem(
                                `categories.${catIndex}.winners` as any,
                                winIndex,
                              )
                            }
                          >
                            <IconTrash />
                          </ActionIcon>
                        </Grid.Col>
                      </Grid>
                    </Paper>
                  ))}
                  <Grid>
                    <Grid.Col span={{ base: 12, xs: 2 }}>
                      <Button
                        fullWidth
                        onClick={() => {
                          detailsForm.insertListItem(
                            `categories.${catIndex}.winners`,
                            {
                              playerId: '',
                              model: '',
                            },
                          )
                        }}
                      >
                        Add Winner
                      </Button>
                    </Grid.Col>
                  </Grid>
                </Paper>
              ))}
              <Paper p="xl">
                <Grid>
                  <Grid.Col span={{ base: 12, xs: 2 }}>
                    <Button
                      fullWidth
                      onClick={() =>
                        detailsForm.insertListItem('categories', {
                          name: '',
                          winners: [{ model: '', playerId: null }],
                        })
                      }
                    >
                      Add Category
                    </Button>
                  </Grid.Col>
                </Grid>
              </Paper>
            </Paper>
          )} */}
        </Tabs.Panel>
        <Tabs.Panel value="players">
          <Title order={3} mb="md">
            Players
          </Title>
          <EventEditPlayerList players={tourneyDetail.data.players} />
        </Tabs.Panel>

        <Tabs.Panel value="discord">
          <Title order={3} mb="md">
            Discord
          </Title>
          <Button
            disabled={tourneyDetail.data.tourney.discord_post_id !== null}
            onClick={() => {
              postToDiscord.mutate(id)
            }}
          >
            Post Results to Discord
          </Button>

          {tourneyDetail.data.tourney.discord_post_id && (
            <Link to={`${tourneyDetail.data.tourney.discord_post_id}`}>
              View Discord Message
            </Link>
          )}
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
