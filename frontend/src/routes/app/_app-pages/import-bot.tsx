import { BookmarkletCode } from '@/components/bookmarklet-code'
import {
  Box,
  Button,
  Card,
  Grid,
  Group,
  Text,
  Textarea,
  Title,
} from '@mantine/core'
import { modals, openConfirmModal, openContextModal } from '@mantine/modals'
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

  return (
    <div>
      <Card shadow="md" mb="md">
        <Grid>
          <Grid.Col span={{ base: 12, sm: 9 }}>
            <Title order={4}>Instructions</Title>
            <Text>
              This is a bit of a weird one, but currently importing from Bag of
              Tools is a bit tricky. Their developers will make this easier for
              us though 🙂
            </Text>
            <Text>
              For now though, you need to drag the bookmarklet to your bookmarks
              bar. Then, when you're on the BOT event page click the bookmark.
              It will copy the data to your clipboard. If it doesn't work try
              clicking the page first, then clicking the bookmark (sometimes you
              aren't allowed to copy to the clipboard via a program if you
              haven't interacted with the page).
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
            modals.open({
              children: (
                <div>Sadly this doesn't DO anything yet, but it will</div>
              ),
            })
          }}
        >
          Create new event with this data
        </Button>
      </Box>
    </div>
  )
}
