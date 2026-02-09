import { Link } from '@/components/link'
import { Route as RankingsRoute } from '@/routes/site/_site-pages/rankings'
import { Divider, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/site/')({
  component: App,
  staticData: { title: 'Welcome to B(UK)et Bot!' },
})

function App() {
  return (
    <>
      <Text>Welcome to a tool for rankings for the UK Malifaux Community!</Text>

      <Text>
        There's a good chance that you are looking for{' '}
        <Link to={RankingsRoute.path}>the rankings</Link>.
      </Text>
      <Divider m={5} />
      <Text>
        This is very much a Work in Progress, and if you want to help or are
        nosy, the code is on{' '}
        <Link href="https://github.com/wilsonrocks/bucket-bot">github</Link>.
      </Text>

      <Text>
        Feature Requests and Bug Reports are really welcomed - mention it on the
        Discord!
      </Text>
    </>
  )
}
