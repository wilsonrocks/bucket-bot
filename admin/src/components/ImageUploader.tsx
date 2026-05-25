import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone'
import { useHover } from '@mantine/hooks'
import { IconPhoto } from '@tabler/icons-react'
import { Box, Center, Image, Overlay, Text } from '@mantine/core'

interface ImageUploaderProps {
  value: string | null
  onChange: (file: File) => void
  preview?: string | null
  label?: string
}

export function ImageUploader({ value, onChange, preview, label }: ImageUploaderProps) {
  const { hovered, ref } = useHover<HTMLDivElement>()
  const effectivePreview = preview ?? (value ? `${import.meta.env.VITE_ASSETS_URL}/${value}-w150.png` : null)

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/')) onChange(file)
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
                    <Text size="xs" c="white">
                      Change
                    </Text>
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
    </Box>
  )
}
