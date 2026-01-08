import {
  useGetPlayers,
  useGetTourneyDetail,
  useGetVenues,
} from '@/hooks/useApi'
import {
  ActionIcon,
  Button,
  Grid,
  NumberInput,
  Paper,
  Select,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconTrash } from '@tabler/icons-react'
import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'

const eventParamsValidator = z.object({ id: z.coerce.number() })

export const Route = createFileRoute('/app/_app-pages/events/$id/edit')({
  component: RouteComponent,
  params: eventParamsValidator,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const tourneyDetail = useGetTourneyDetail(id)

  const form = useForm<{
    eventName: string
    organiserId: string
    venueId: string
    rounds: number
    days: number
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
      organiserId: '',
      venueId: '',
      rounds: 3,
      days: 1,
      tier: 'Local',
      categories: [{ name: 'Totem', winners: [] }],
    },
  })

  const playerOptions = useGetPlayers()
  const venues = useGetVenues()

  if (!tourneyDetail.data) {
    return <div>Loading...</div>
  }
  return (
    <div>
      <Title order={1} mb="md">
        {tourneyDetail.data.tourney.name}
      </Title>

      <Title order={3} mb="md">
        Details
      </Title>

      <Paper p="md" m="md">
        <Grid gutter="sm">
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <TextInput
              label="Event Name"
              defaultValue={tourneyDetail.data.tourney.name}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Select
              label="Organiser"
              data={
                playerOptions.data?.map((player) => ({
                  value: player.id.toString(),
                  label: player.name,
                })) ?? []
              }
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Select
              label="Venue"
              data={
                venues.data?.map((venue) => ({
                  value: venue.id.toString(),
                  label: venue.name,
                })) ?? []
              }
            />
          </Grid.Col>

          <Grid.Col span={{ base: 4, sm: 2 }}>
            <NumberInput label="Rounds" min={1} allowDecimal={false} />
          </Grid.Col>

          <Grid.Col span={{ base: 4, sm: 2 }}>
            <NumberInput label="Days" min={1} allowDecimal={false} />
          </Grid.Col>

          <Grid.Col span={{ base: 6, sm: 2 }}>
            <Select label="Tier" />
          </Grid.Col>
        </Grid>
      </Paper>

      <Title order={3} mb="md">
        Best Painted
      </Title>
      <Paper p="md">
        {form.values.categories.map((category, catIndex) => (
          <Paper key={catIndex} withBorder m="md" p="md">
            <Grid align="flex-end">
              <Grid.Col span={{ base: 10, xs: 4 }}>
                <TextInput
                  label="Painting Category"
                  {...form.getInputProps(`categories.${catIndex}.name`)}
                />
              </Grid.Col>
              <Grid.Col span={2}>
                <ActionIcon
                  color="red"
                  onClick={() => form.removeListItem('categories', catIndex)}
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
                      {...form.getInputProps(
                        `categories.${catIndex}.winners.${winIndex}.playerId`,
                      )}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, xs: 4 }}>
                    <TextInput
                      label="Model(s)"
                      {...form.getInputProps(
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
                        form.removeListItem(
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
                    form.insertListItem(`categories.${catIndex}.winners`, {
                      playerId: '',
                      model: '',
                    })
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
                  form.insertListItem('categories', {
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

      {/* 
      {tourneyDetail.data ? (
        <Table
          tabularNums
          data={{
            head: ['Place', 'Name', 'Points', 'Faction'],
            body: tourneyDetail.data.players.map((row) => [
              row.place,
              <Link to={`/site/player/${row.playerId}`}>{row.playerName}</Link>,
              row.points.toFixed(2),
              row.factionName,
            ]),
          }}
        />
      ) : (
        <div>Loading...</div>
      )} */}
    </div>
  )
}
