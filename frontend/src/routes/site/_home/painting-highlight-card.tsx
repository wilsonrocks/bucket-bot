import { Anchor, AspectRatio, Card, Image, Skeleton, Text, Title } from '@mantine/core'
import { Link } from '@/components/link'
import { useGetPaintingRecent } from '@/api/hooks'
import { Route as PlayerRoute } from '@/routes/site/_site-pages/player.$id'
import { Route as EventRoute } from '@/routes/site/_site-pages/event.$id'

export function PaintingHighlightCard() {
  const { data, isLoading } = useGetPaintingRecent()

  return (
    <Card withBorder padding="md" h="100%" mih={320} style={{ display: 'flex', flexDirection: 'column' }}>
      <Title order={3} mb="sm">Latest Best Painted</Title>
      <div style={{ flex: 1 }}>
        {isLoading || !data ? (
          <>
            <AspectRatio ratio={4 / 3} mb="sm">
              <Skeleton height="100%" />
            </AspectRatio>
            <Skeleton height={16} width="60%" mb={6} />
            <Skeleton height={13} width="40%" />
          </>
        ) : (
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
                <Link to={PlayerRoute.to} params={{ id: data.playerId }} search={{ tab: 'painting' }}>
                  {data.playerName}
                </Link>
              ) : (
                data.playerName
              )}
            </Text>
            {data.model && <Text size="sm" c="dimmed">{data.model}</Text>}
            <Text size="sm" c="dimmed" mt={4}>
              <Link to={EventRoute.to} params={{ id: data.tourneyId }} search={{ tab: 'best-painted' }}>
                {data.tourneyName}
              </Link>
            </Text>
          </>
        )}
      </div>
    </Card>
  )
}
