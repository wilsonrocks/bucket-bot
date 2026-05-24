import { AspectRatio, Card, Image, Text, Title } from '@mantine/core'
import { Link } from '@/components/link'

type RecentPainting = {
  playerId: number | null
  playerName: string
  tourneyId: number
  tourneyName: string
  categoryName: string
  imageKey: string | null
  model: string | null
} | null

export function PaintingHighlightCard({ data }: { data: RecentPainting }) {
  return (
    <Card withBorder padding="md" h="100%" mih={320} style={{ display: 'flex', flexDirection: 'column' }}>
      <Title order={3} mb="sm">Latest Best Painted</Title>
      <div style={{ flex: 1 }}>
        {data ? (
          <>
            {data.imageKey && (
              <AspectRatio ratio={4 / 3} mb="sm">
                <Image
                  src={`${import.meta.env.VITE_ASSETS_URL}/${data.imageKey}-w800.png`}
                  alt={data.playerName}
                  radius="sm"
                  fit="contain"
                />
              </AspectRatio>
            )}
            <Text fw={600}>
              {data.playerId != null ? (
                <Link to="/player/$id" params={{ id: data.playerId }} search={{ tab: 'painting', typeCode: undefined, painting: undefined }}>
                  {data.playerName}
                </Link>
              ) : (
                data.playerName
              )}
            </Text>
            {data.model && <Text size="sm" c="dimmed">{data.model}</Text>}
            <Text size="sm" c="dimmed" mt={4}>
              <Link to="/event/$id" params={{ id: data.tourneyId }} search={{ tab: 'best-painted', painting: undefined }}>
                {data.tourneyName}
              </Link>
            </Text>
          </>
        ) : null}
      </div>
      <Link to="/best-painted" search={{ painting: undefined }} size="sm" mt="sm">
        All best painted →
      </Link>
    </Card>
  )
}
