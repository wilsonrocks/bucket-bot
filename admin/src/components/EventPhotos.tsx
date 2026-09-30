import { useRef, useState } from 'react'
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
  IconCheck,
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
import { ImageCropModal } from './ImageCropModal'

export function EventPhotos({ tourneyId }: { tourneyId: number }) {
  const photos = useGetTourneyIdPhotos(tourneyId)
  const addPhotos = usePostTourneyIdPhotos(tourneyId)
  const updatePhoto = usePatchTourneyIdPhotosPhotoId(tourneyId)
  const deletePhoto = useDeleteTourneyIdPhotosPhotoId(tourneyId)
  const reorderPhotos = usePutTourneyIdPhotosOrder(tourneyId)
  const [uploading, setUploading] = useState(0)
  // Dropped files waiting to go through the crop modal, first one showing.
  const [queue, setQueue] = useState<File[]>([])
  const [queueSize, setQueueSize] = useState(0)
  // Uploads are chained so photos are added in the order they were confirmed.
  const uploadChain = useRef<Promise<void>>(Promise.resolve())

  const upload = (files: File[]) => {
    setUploading((n) => n + files.length)
    uploadChain.current = uploadChain.current.then(async () => {
      for (const file of files) {
        try {
          const imageKey = await uploadTeamImage(file, 'event')
          await addPhotos.mutateAsync({
            id: String(tourneyId),
            data: { photos: [{ imageKey }] },
          })
        } catch {
          // uploadTeamImage and customFetch already show an error notification.
        } finally {
          setUploading((n) => n - 1)
        }
      }
    })
  }

  const handleDrop = (files: File[]) => {
    setQueue((q) => [...q, ...files])
    setQueueSize((n) => (queue.length === 0 ? files.length : n + files.length))
  }

  const next = () => setQueue((q) => q.slice(1))

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
        loading={uploading > 0}
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
                  fit="contain"
                  bg="var(--mantine-color-default-hover)"
                  alt={photo.caption ?? ''}
                />
              </Card.Section>
              <CaptionInput
                // Keyed on the saved caption so it resets after each save.
                key={photo.caption ?? ''}
                saved={photo.caption}
                saving={updatePhoto.isPending}
                onSave={(caption) =>
                  updatePhoto.mutate({
                    id: String(tourneyId),
                    photoId: String(photo.id),
                    data: { caption },
                  })
                }
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

      <ImageCropModal
        file={queue[0] ?? null}
        opened={queue.length > 0}
        title={
          queueSize > 1
            ? `Crop photo ${queueSize - queue.length + 1} of ${queueSize}`
            : 'Crop photo'
        }
        cancelLabel="Skip photo"
        onCancel={next}
        onConfirm={(file) => {
          upload([file])
          next()
        }}
        secondaryAction={
          queue.length > 1
            ? {
                label: `Use all ${queue.length} as-is`,
                onClick: () => {
                  upload(queue)
                  setQueue([])
                },
              }
            : undefined
        }
      />
    </Stack>
  )
}

/** Caption field with an explicit save: a tick appears once edited, Enter saves, Escape reverts. */
function CaptionInput({
  saved,
  saving,
  onSave,
}: {
  saved: string | null
  saving: boolean
  onSave: (caption: string | null) => void
}) {
  const [value, setValue] = useState(saved ?? '')
  const caption = value.trim() || null
  const dirty = caption !== saved

  const save = () => {
    if (dirty) onSave(caption)
  }

  return (
    <TextInput
      mt="xs"
      placeholder="Caption"
      value={value}
      onChange={(e) => setValue(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') save()
        if (e.key === 'Escape') setValue(saved ?? '')
      }}
      rightSection={
        dirty && (
          <ActionIcon
            variant="filled"
            size="sm"
            aria-label="Save caption"
            loading={saving}
            onClick={save}
          >
            <IconCheck size={14} />
          </ActionIcon>
        )
      }
    />
  )
}
