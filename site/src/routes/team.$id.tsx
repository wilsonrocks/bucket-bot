import { fetchTeam } from '@/queries'
import { Badge, Image, Table, Title } from '@mantine/core'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { Link } from '@/components/link'
import z from 'zod'

export const Route = createFileRoute('/team/$id')({
  params: z.object({ id: z.string() }),
  staticData: { title: 'Team' },
  loader: async ({ params }) => {
    const team = await fetchTeam({ data: { id: Number(params.id) } })
    if (!team) throw notFound()
    return team
  },
  head: ({ loaderData }) => loaderData ? ({
    meta: [
      { title: `${loaderData.name} — b(UK)et bot` },
      { property: 'og:title', content: loaderData.name },
      { property: 'og:description', content: `Team page for ${loaderData.name}` },
    ],
  }) : {},
  component: RouteComponent,
})

function RouteComponent() {
  const team = Route.useLoaderData()
  return (
    <div>
      <Title order={3} mb="xs">{team.name}</Title>
      {team.description && <p>{team.description}</p>}
      {team.image_key && (
        <Image
          src={`${import.meta.env.VITE_ASSETS_URL}/${team.image_key}-w800.png`}
          maw={400} fit="contain" radius="sm" mb="md" alt={`${team.name} logo`}
        />
      )}
      <Table mt="md" tabularNums>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Player</Table.Th>
            <Table.Th>Rolling Year Points</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {(team.members as any[]).map((member: any) => (
            <Table.Tr key={member.membership_id}>
              <Table.Td>
                <Link to="/player/$id" params={{ id: member.player_id }} search={{ tab: undefined, typeCode: undefined, painting: undefined }}>
                  {member.player_name}
                </Link>
              </Table.Td>
              <Table.Td>{member.rolling_year_points != null ? member.rolling_year_points.toFixed(2) : '-'}</Table.Td>
              <Table.Td>{member.is_captain && <Badge color="yellow">Captain</Badge>}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  )
}
