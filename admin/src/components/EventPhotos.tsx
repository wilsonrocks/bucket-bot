import { useState } from 'react'
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone'
import { modals } from '@mantine/modals'
import {
  ActionIcon,
  Card,
  Center,
  Group,
  Image,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconArrowRight,
  IconPhoto,
  IconTrash,
} from '@tabler/icons-react'
import {
  uploadTeamImage,
  useDeleteTourneyIdPhotosPhotoId,
  useGetTourneyIdPhotos,
  usePatchTourneyIdPhotosPhotoId,
  usePostTourneyIdPhotos,
  usePutTourneyIdPhotosOrder,
} from '@/api/hooks'

export function EventPhotos({ tourneyId }: { tourneyId: number }) {
  const photos = useGetTourneyIdPhotos(tourneyId)
  const addPhotos = usePostTourneyIdPhotos(tourneyId)
  const updatePhoto = usePatchTourneyIdPhotosPhotoId(tourneyId)
  const deletePhoto = useDeleteTourneyIdPhotosPhotoId(tourneyId)
  const reorderPhotos = usePutTourneyIdPhotosOrder(tourneyId)
  const [uploading, setUploading] = useState(0)

  const handleDrop = async (files: File[]) => {
    setUploading(files.length)
    try {
      // Upload one at a time so the photos keep the order they were picked in.
      const keys: string[] = []
      for (const file of files) {
        keys.push(await uploadTeamImage(file, 'event'))
        setUploading((n) => n - 1)
      }
      await addPhotos.mutateAsync({
        id: String(tourneyId),
        data: { photos: keys.map((imageKey) => ({ imageKey })) },
      })
    } finally {
      setUploading(0)
    }
  }

  const list = photos.data ?? []

  const move = (index: number, offset: number) => {
    const ids = list.map((p) => p.id)
    const [moved] = ids.splice(index, 1)
    ids.splice(index + offset, 0, moved)
    reorderPhotos.mutate({ id: String(tourneyId), data: { photoIds: ids } })
  }

  const confirmDelete = (photoId: number) =>
    modals.openConfirmModal({
      title: 'Delete photo?',
      children: <Text size="sm">This removes the photo from the event.</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        deletePhoto.mutate({
          id: String(tourneyId),
          photoId: String(photoId),
        }),
    })

  return (
    <Stack>
      <Dropzone
        onDrop={handleDrop}
        accept={IMAGE_MIME_TYPE}
        maxSize={10 * 1024 * 1024}
        multiple
        loading={uploading > 0 || addPhotos.isPending}
      >
        <Center mih={100}>
          <Stack align="center" gap={4}>
            <IconPhoto size={32} color="var(--mantine-color-dimmed)" />
            <Text size="sm" c="dimmed">
              Drop photos here, or click to pick some (max 10 MB each)
            </Text>
          </Stack>
        </Center>
      </Dropzone>

      {photos.isPending ? (
        <Loader />
      ) : list.length === 0 ? (
        <Text c="dimmed">No photos yet.</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }}>
          {list.map((photo, index) => (
            <Card key={photo.id} withBorder padding="xs">
              <Card.Section>
                <Image
                  src={`${import.meta.env.VITE_ASSETS_URL}/${photo.imageKey}-w400.webp`}
                  h={200}
                  fit="cover"
                  alt={photo.caption ?? ''}
                />
              </Card.Section>
              <TextInput
                mt="xs"
                placeholder="Caption"
                // Keyed on the saved caption so it resets after each save.
                key={photo.caption ?? ''}
                defaultValue={photo.caption ?? ''}
                onBlur={(e) => {
                  const caption = e.currentTarget.value.trim() || null
                  if (caption === photo.caption) return
                  updatePhoto.mutate({
                    id: String(tourneyId),
                    photoId: String(photo.id),
                    data: { caption },
                  })
                }}
              />
              <Group justify="space-between" mt="xs">
                <Group gap={4}>
                  <ActionIcon
                    variant="subtle"
                    aria-label="Move earlier"
                    disabled={index === 0 || reorderPhotos.isPending}
                    onClick={() => move(index, -1)}
                  >
                    <IconArrowLeft size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    aria-label="Move later"
                    disabled={
                      index === list.length - 1 || reorderPhotos.isPending
                    }
                    onClick={() => move(index, 1)}
                  >
                    <IconArrowRight size={16} />
                  </ActionIcon>
                </Group>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label="Delete photo"
                  onClick={() => confirmDelete(photo.id)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  )
}
