import { useCallback, useEffect, useRef, useState } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import type { PercentCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import { IconRotate, IconRotateClockwise } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import {
  cropImageFile,
  percentCropToPixels,
  rotateImageToUrl,
} from '@/helpers/crop-image'
import type { Size } from '@/helpers/crop-image'

const ASPECTS: { value: string; label: string; ratio: number | undefined }[] = [
  { value: 'free', label: 'Free', ratio: undefined },
  { value: 'square', label: '1:1', ratio: 1 },
  { value: 'landscape', label: '4:3', ratio: 4 / 3 },
  { value: 'portrait', label: '3:4', ratio: 3 / 4 },
  { value: 'wide', label: '16:9', ratio: 16 / 9 },
]

const FULL_CROP: PercentCrop = {
  unit: '%',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
}

function aspectRatioFor(key: string) {
  return ASPECTS.find((a) => a.value === key)?.ratio
}

/** A centred crop covering as much of the image as the aspect ratio allows. */
function defaultCrop(aspect: number | undefined, box: Size): PercentCrop {
  if (!aspect) return FULL_CROP
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 100 }, aspect, box.width, box.height),
    box.width,
    box.height,
  )
}

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
  const imgRef = useRef<HTMLImageElement>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  // Pixel dimensions of the rotated source — what the crop percentages map onto.
  const [bounds, setBounds] = useState<Size | null>(null)
  const [rotation, setRotation] = useState(0)
  const [aspectKey, setAspectKey] = useState('free')
  const [crop, setCrop] = useState<PercentCrop>(FULL_CROP)
  const [saving, setSaving] = useState(false)

  // A fresh file means a fresh edit — don't carry the last image's framing over.
  useEffect(() => {
    setRotation(0)
    setAspectKey('free')
    setCrop(FULL_CROP)
  }, [file])

  // The cropper is shown an already-rotated image, so the selection the user
  // drags is in the same pixel space we later cut from. No transform maths.
  useEffect(() => {
    if (!file) {
      setImageUrl(null)
      setBounds(null)
      return
    }
    let url: string | null = null
    let cancelled = false
    rotateImageToUrl(file, rotation)
      .then((result) => {
        if (cancelled) {
          URL.revokeObjectURL(result.url)
          return
        }
        url = result.url
        setImageUrl(result.url)
        setBounds(result.bounds)
      })
      .catch((error: unknown) => {
        notifications.show({
          title: 'Error',
          message:
            error instanceof Error ? error.message : 'Could not read that image',
          color: 'red',
        })
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [file, rotation])

  const resetCropTo = useCallback((aspect: number | undefined) => {
    const img = imgRef.current
    setCrop(
      defaultCrop(
        aspect,
        img ? { width: img.width, height: img.height } : { width: 1, height: 1 },
      ),
    )
  }, [])

  const onImageLoad = () => resetCropTo(aspectRatioFor(aspectKey))

  const changeAspect = (key: string) => {
    setAspectKey(key)
    resetCropTo(aspectRatioFor(key))
  }

  const rotateBy = (degrees: number) => {
    setRotation((r) => (((r + degrees) % 360) + 360) % 360)
    // The old selection means nothing once the axes move.
    setCrop(FULL_CROP)
  }

  const handleConfirm = async () => {
    if (!file || !bounds) return
    const pixels = percentCropToPixels(crop, bounds)
    if (pixels.width < 1 || pixels.height < 1) return
    setSaving(true)
    try {
      onConfirm(await cropImageFile(file, pixels, rotation))
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
            onChange={changeAspect}
            data={ASPECTS.map(({ value, label }) => ({ value, label }))}
          />
          <Group gap="xs">
            <Tooltip label="Rotate left">
              <ActionIcon
                variant="default"
                size="lg"
                onClick={() => rotateBy(-90)}
              >
                <IconRotate size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Rotate right">
              <ActionIcon
                variant="default"
                size="lg"
                onClick={() => rotateBy(90)}
              >
                <IconRotateClockwise size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Text size="xs" c="dimmed">
          Drag inside the image to draw a crop, or drag its corners to resize.
        </Text>

        <Group justify="center">
          {imageUrl && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              aspect={aspectRatioFor(aspectKey)}
              ruleOfThirds
              minWidth={16}
              minHeight={16}
              keepSelection
            >
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Crop preview"
                onLoad={onImageLoad}
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: 'clamp(200px, 45dvh, 420px)',
                }}
              />
            </ReactCrop>
          )}
        </Group>

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
            disabled={!bounds}
            onClick={handleConfirm}
          >
            Use image
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
