import { BookmarkletCode } from '@/components/bookmarklet-code'
import { useGetPlayers, useGetVenues } from '@/hooks/useApi'
import {
  Box,
  Button,
  Card,
  Grid,
  NumberInput,
  Select,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import z from 'zod'

export const Route = createFileRoute('/app/_app-pages/import-bot')({
  component: RouteComponent,
  staticData: { title: 'Import BOT Event' },
})

const resultValidator = z.object({
  name: z.string(),
  place: z.number().int(),
  played: z.number().int(),
  faction: z.string(),
})

const pastedTextValidator = z.array(resultValidator)

function RouteComponent() {
  const [status, setStatus] = useState<'AWAITING_DATA' | 'HAS_DATA'>(
    'AWAITING_DATA',
  )
  const [pastedData, setPastedData] = useState<string>('')

  let data: z.infer<typeof pastedTextValidator>
  let isValid = false
  try {
    const json = JSON.parse(pastedData)
    data = pastedTextValidator.parse(json)
    isValid = true
  } catch {
    isValid = false
    data = []
  }

  const detailsForm = useForm<{
    eventName: string
    organiserId: string
    venueId: string
    rounds: number | null
    days: number | null
    tier: string
  }>({
    initialValues: {
      eventName: '',
      organiserId: '',
      venueId: '',
      rounds: 3,
      days: 1,
      tier: 'Event',
    },
  })
  const playerOptions = useGetPlayers()
  const venues = useGetVenues()

  if (status === 'AWAITING_DATA')
    // TODO split this into different components and pass state through with tanstack router
    return (
      <div>
        <Card shadow="md" mb="md">
          <Grid>
            <Grid.Col span={{ base: 12, sm: 9 }}>
              <Title order={4}>Instructions</Title>
              <Text>
                This is a bit of a weird one, but currently importing from Bag
                of Tools is a bit tricky. Their developers will make this easier
                for us though 🙂
              </Text>
              <Text>
                For now though, you need to drag the bookmarklet to your
                bookmarks bar. Then, when you're on the BOT event page click the
                bookmark. It will copy the data to your clipboard. If it doesn't
                work try clicking the page first, then clicking the bookmark
                (sometimes you aren't allowed to copy to the clipboard via a
                program if you haven't interacted with the page).
              </Text>
              <Text>Then, paste it in the text box below.</Text>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 3 }}>
              <BookmarkletCode />
            </Grid.Col>
          </Grid>
        </Card>

        <Textarea
          rows={15}
          value={pastedData}
          style={{ input: { fontFamily: 'monospace' } }}
          onChange={(event) => setPastedData(event.currentTarget.value)}
        />
        {isValid
          ? `Valid data ${data.length} results: ${data
              .slice(0, 3)
              .map((d) => d.name)
              .join(', ')}...`
          : 'Invalid data'}
        <Box>
          <Button
            disabled={!isValid}
            onClick={() => {
              setStatus('HAS_DATA')
            }}
          >
            Create new event with this data
          </Button>
        </Box>
      </div>
    )
  else
    return (
      <div>
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Title order={4}>Tourney Data</Title>

            <form
              onSubmit={detailsForm.onSubmit((values) => {
                // TODO submit the data
                console.log('Submitting', values, data)
              })}
            >
              <TextInput
                label="Event Name"
                required
                {...detailsForm.getInputProps('eventName')}
              />
              <Select
                searchable
                label="Organiser"
                data={
                  playerOptions.data?.map((player) => ({
                    value: player.id.toString(),
                    label: player.name,
                  })) ?? []
                }
                {...detailsForm.getInputProps('organiserId')}
              />
              <Select
                label="Venue"
                data={
                  venues.data?.map((venue) => ({
                    value: venue.id.toString(),
                    label: venue.name,
                  })) ?? []
                }
                {...detailsForm.getInputProps('venueId')}
              />
              <NumberInput
                label="Number of Rounds"
                {...detailsForm.getInputProps('rounds')}
              />
              <NumberInput
                label="Number of Days"
                {...detailsForm.getInputProps('days')}
              />
              <Button type="submit" mt="md">
                Create Event
              </Button>
            </form>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Title order={5}>Imported Results</Title>
            <Table
              title="Results"
              data={{
                head: ['Place', 'Name', 'Played', 'Faction'],
                body: data.map((d) => [d.place, d.name, d.played, d.faction]),
              }}
            />
          </Grid.Col>
        </Grid>
      </div>
    )
}
