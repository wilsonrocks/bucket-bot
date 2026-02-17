import { createFileRoute, Link } from '@tanstack/react-router'

import { Button, Group, Text } from '@mantine/core'
import { Route as ImportBotRoute } from './import-bot'
import { Route as ImportLongshanksRoute } from './import-longshanks'

export const Route = createFileRoute('/app/_app-pages/import/')({
  component: RouteComponent,
  staticData: {
    title: 'Import Events',
  },
})

function RouteComponent() {
  return (
    <div>
      <Text>
        Currently you can import events from either Longshanks or Bag of Tools.
        The process is slightly different for each.
      </Text>

      <Group gap="md" p="md" justify="center">
        <Button component={Link} to={ImportLongshanksRoute.to}>
          Import Longshanks Event
        </Button>
        <Button component={Link} to={ImportBotRoute.to}>
          Import Bot Event
        </Button>
      </Group>
    </div>
  )
}
