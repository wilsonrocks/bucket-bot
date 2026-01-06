import { useGetTourneyDetail } from '@/hooks/useApi'
import {
  ActionIcon,
  Button,
  Grid,
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
    categories: {
      name: string
      winners: {
        playerId: number
        model: string
      }[]
    }[]
  }>({
    initialValues: {
      categories: [{ name: 'Totem', winners: [] }],
    },
  })
  if (!tourneyDetail.data) {
    return <div>Loading...</div>
  }
  return (
    <div>
      <Title order={1} mb="md">
        {tourneyDetail.data ? tourneyDetail.data.tourney.name : `Event #${id}`}
      </Title>

      <Paper>
        <Title order={3} mb="md">
          Best Painted
        </Title>

        {form.values.categories.map((category, catIndex) => (
          <Paper key={catIndex} withBorder mb="md" p="md">
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
        <Paper>
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
