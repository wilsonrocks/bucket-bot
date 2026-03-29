import { useGetTeamsId } from '@/api/hooks'
import { Badge, Image, Table, Title } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@/components/link'
import { Route as PlayerRoute } from './player.$id'
import z from 'zod'

export const Route = createFileRoute('/site/_site-pages/team/$id')({
  component: RouteComponent,
  params: z.object({ id: z.string() }),
  staticData: { title: 'Team' },
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: team } = useGetTeamsId(id)

  if (!team) return <div>Loading...</div>

  return (
    <div>
      <Title order={3} mb="xs">
        {team.name}
      </Title>
      {team.description && <p>{team.description}</p>}
      {team.image_key && (
        <Image
          src={`${import.meta.env.VITE_ASSETS_URL}/${team.image_key}-200x200.png`}
          w={200}
          h={200}
          fit="contain"
          radius="sm"
          mb="md"
          alt={`${team.name} logo`}
        />
      )}

      <Table mt="md">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Player</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {team.members.map((member) => (
            <Table.Tr key={member.membership_id}>
              <Table.Td>
                <Link to={PlayerRoute.to} params={{ id: member.player_id }}>
                  {member.player_name}
                </Link>
              </Table.Td>
              <Table.Td>
                {member.is_captain && <Badge color="yellow">Captain</Badge>}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  )
}
