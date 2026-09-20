import { useCallback, useEffect, useMemo, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area, MediaSize, Point } from 'react-easy-crop'
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import { IconRotate, IconRotateClockwise } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { cropImageFile } from '@/helpers/crop-image'

const MIN_ZOOM = 1
// react-easy-crop defaults to a max of 3; keep pinch-zoom and the slider in step.
const MAX_ZOOM = 5

const ASPECTS: { value: string; label: string; ratio: number | null }[] = [
  { value: 'original', label: 'Original', ratio: null },
  { value: 'square', label: '1:1', ratio: 1 },
  { value: 'landscape', label: '4:3', ratio: 4 / 3 },
  { value: 'portrait', label: '3:4', ratio: 3 / 4 },
  { value: 'wide', label: '16:9', ratio: 16 / 9 },
]

interface ImageCropModalProps {
  file: File | null
  opened: boolean
  onCancel: () => void
  onConfirm: (file: File) => void
}

export function ImageCropModal({
  file,
  opened,
  onCancel,
  onConfirm,
}: ImageCropModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [aspectKey, setAspectKey] = useState('original')
  const [mediaAspect, setMediaAspect] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!file) {
      setImageUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // A fresh file means a fresh edit — don't carry the last image's framing over.
  useEffect(() => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setAspectKey('original')
    setCroppedArea(null)
  }, [file])

  const aspect = useMemo(() => {
    const found = ASPECTS.find((a) => a.value === aspectKey)
    return found?.ratio ?? mediaAspect
  }, [aspectKey, mediaAspect])

  const onMediaLoaded = useCallback((mediaSize: MediaSize) => {
    setMediaAspect(mediaSize.naturalWidth / mediaSize.naturalHeight)
  }, [])

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels)
  }, [])

  const rotateBy = (degrees: number) =>
    setRotation((r) => (((r + degrees) % 360) + 360) % 360)

  const handleConfirm = async () => {
    if (!file || !croppedArea) return
    setSaving(true)
    try {
      onConfirm(await cropImageFile(file, croppedArea, rotation))
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Could not crop image',
        color: 'red',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title="Crop image"
      size="lg"
      yOffset="2vh"
      styles={{
        content: {
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '96dvh',
        },
        body: {
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
        },
      }}
    >
      <Stack gap="sm">
        {/* Controls sit above the image so they're never below the fold on a
            tall portrait photo. */}
        <Group justify="space-between" align="center" wrap="wrap" gap="xs">
          <SegmentedControl
            size="xs"
            value={aspectKey}
            onChange={setAspectKey}
            data={ASPECTS.map(({ value, label }) => ({ value, label }))}
          />
          <Group gap="xs">
            <Tooltip label="Rotate left">
              <ActionIcon variant="default" onClick={() => rotateBy(-90)}>
                <IconRotate size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Rotate right">
              <ActionIcon variant="default" onClick={() => rotateBy(90)}>
                <IconRotateClockwise size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Group grow align="flex-start" gap="md">
          <Box>
            <Text size="xs" fw={500} c="dimmed">
              Zoom
            </Text>
            <Slider
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              label={(v) => `${v.toFixed(1)}×`}
              value={zoom}
              onChange={setZoom}
            />
          </Box>
          <Box>
            <Text size="xs" fw={500} c="dimmed">
              Rotation
            </Text>
            <Slider
              min={0}
              max={359}
              step={1}
              label={(v) => `${v}°`}
              value={rotation}
              onChange={setRotation}
            />
          </Box>
        </Group>

        <Box
          style={{
            position: 'relative',
            height: 'clamp(200px, 45dvh, 420px)',
            flexShrink: 0,
            background: 'var(--mantine-color-dark-8)',
          }}
        >
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              rotation={rotation}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              onMediaLoaded={onMediaLoaded}
              showGrid
            />
          )}
        </Box>

        {/* Sticky so Cancel / Use image stay reachable however far the body scrolls. */}
        <Group
          justify="flex-end"
          style={{
            position: 'sticky',
            bottom: 0,
            background: 'var(--mantine-color-body)',
            paddingTop: 'var(--mantine-spacing-xs)',
          }}
        >
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            color="green"
            loading={saving}
            disabled={!croppedArea}
            onClick={handleConfirm}
          >
            Use image
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
