import { useEffect, useState } from 'react'
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone'
import { useHover } from '@mantine/hooks'
import { IconPhoto } from '@tabler/icons-react'
import { Box, Button, Center, Group, Image, Overlay, Text } from '@mantine/core'
import { ImageCropModal } from './ImageCropModal'

interface ImageUploaderProps {
  value: string | null
  onChange: (file: File) => void
  /** The pending local file, if one has been picked but not uploaded yet. */
  previewFile?: File | null
  /** Escape hatch for callers that already have a preview URL of their own. */
  preview?: string | null
  label?: string
  /** Set false to hand the raw picked file straight through, with no crop step. */
  enableCrop?: boolean
}

export function ImageUploader({
  value,
  onChange,
  previewFile,
  preview,
  label,
  enableCrop = true,
}: ImageUploaderProps) {
  const { hovered, ref } = useHover<HTMLDivElement>()
  const [editing, setEditing] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!previewFile) {
      setLocalPreview(null)
      return
    }
    const url = URL.createObjectURL(previewFile)
    setLocalPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [previewFile])

  const effectivePreview =
    preview ??
    localPreview ??
    (value ? `${import.meta.env.VITE_ASSETS_URL}/${value}-w150.webp` : null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    if (enableCrop) {
      setEditing(file)
    } else {
      onChange(file)
    }
  }

  return (
    <Box>
      {label && (
        <Text size="sm" fw={500} mb={4}>
          {label}
        </Text>
      )}
      <Box
        ref={ref}
        tabIndex={0}
        onPaste={(e: React.ClipboardEvent<HTMLDivElement>) => {
          const file = Array.from(e.clipboardData.files).find((f) =>
            f.type.startsWith('image/'),
          )
          if (file) {
            handleFile(file)
            return
          }
          const item = Array.from(e.clipboardData.items).find((i) =>
            i.type.startsWith('image/'),
          )
          if (item) {
            const f = item.getAsFile()
            if (f) handleFile(f)
          }
        }}
      >
        <Dropzone
          onDrop={(files) => {
            if (files[0]) handleFile(files[0])
          }}
          accept={IMAGE_MIME_TYPE}
          maxSize={10 * 1024 * 1024}
          multiple={false}
          style={{
            cursor: 'pointer',
            position: 'relative',
            width: 150,
            minHeight: 150,
            padding: 0,
          }}
        >
          {effectivePreview ? (
            <>
              <Image src={effectivePreview} w={150} h={150} fit="contain" />
              {hovered && (
                <Overlay
                  color="#000"
                  backgroundOpacity={0.5}
                  radius="sm"
                  style={{ borderRadius: 'var(--mantine-radius-sm)' }}
                >
                  <Center h="100%">
                    <Group gap={4}>
                      <Text size="xs" c="white">
                        Change
                      </Text>
                      {enableCrop && previewFile && (
                        <Button
                          size="compact-xs"
                          variant="white"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditing(previewFile)
                          }}
                        >
                          Crop
                        </Button>
                      )}
                    </Group>
                  </Center>
                </Overlay>
              )}
            </>
          ) : (
            <Center h={150}>
              <Box ta="center">
                <Dropzone.Idle>
                  <IconPhoto size={32} color="var(--mantine-color-dimmed)" />
                </Dropzone.Idle>
                <Text size="xs" c="dimmed" mt={4}>
                  Drop, click, or paste
                </Text>
              </Box>
            </Center>
          )}
        </Dropzone>
      </Box>

      <ImageCropModal
        file={editing}
        opened={editing !== null}
        onCancel={() => setEditing(null)}
        onConfirm={(file) => {
          setEditing(null)
          onChange(file)
        }}
      />
    </Box>
  )
}
