export type CropArea = {
  x: number
  y: number
  width: number
  height: number
}

export type Size = { width: number; height: number }

/**
 * The backend only accepts PNG, JPEG and WebP (see backend upload route), but
 * Mantine's IMAGE_MIME_TYPE lets gif/avif/heic through the dropzone. Anything
 * we can't keep as-is gets re-encoded as JPEG on the way out of the canvas.
 */
export function getOutputType(inputType: string): { type: string; ext: string } {
  if (inputType === 'image/png') return { type: 'image/png', ext: 'png' }
  if (inputType === 'image/webp') return { type: 'image/webp', ext: 'webp' }
  return { type: 'image/jpeg', ext: 'jpg' }
}

/** Swap a filename's extension so the name matches what we actually encoded. */
export function renameForExt(fileName: string, ext: string): string {
  const base = fileName.replace(/\.[^./\\]+$/, '') || 'image'
  return `${base}.${ext}`
}

/**
 * Size of the axis-aligned box that contains the image once rotated. react-easy-crop
 * reports croppedAreaPixels in this rotated box's coordinate space, so we have to
 * draw the rotated image into a canvas this size before taking the crop out of it.
 */
export function computeRotatedBounds(
  width: number,
  height: number,
  rotation: number,
): Size {
  const rad = (rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  return {
    width: Math.round(cos * width + sin * height),
    height: Math.round(sin * width + cos * height),
  }
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Could not read that image'))
      img.src = url
    })
  } finally {
    // The bitmap is decoded by the time onload fires, so the URL is done with.
    URL.revokeObjectURL(url)
  }
}

/**
 * Apply a rotation and a crop to `file` entirely in the browser, returning a new
 * File ready to hand to the upload endpoint. Nothing is sent anywhere here.
 */
export async function cropImageFile(
  file: File,
  crop: CropArea,
  rotation: number,
): Promise<File> {
  const image = await loadImage(file)

  const bounds = computeRotatedBounds(
    image.naturalWidth,
    image.naturalHeight,
    rotation,
  )

  const rotated = document.createElement('canvas')
  rotated.width = bounds.width
  rotated.height = bounds.height
  const rotatedCtx = rotated.getContext('2d')
  if (!rotatedCtx) throw new Error('Canvas is not available in this browser')

  rotatedCtx.translate(bounds.width / 2, bounds.height / 2)
  rotatedCtx.rotate((rotation * Math.PI) / 180)
  rotatedCtx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2)
  rotatedCtx.drawImage(image, 0, 0)

  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(crop.width))
  out.height = Math.max(1, Math.round(crop.height))
  const outCtx = out.getContext('2d')
  if (!outCtx) throw new Error('Canvas is not available in this browser')

  outCtx.drawImage(rotated, Math.round(-crop.x), Math.round(-crop.y))

  const { type, ext } = getOutputType(file.type)
  const blob = await new Promise<Blob | null>((resolve) =>
    out.toBlob(resolve, type, 0.92),
  )
  if (!blob) throw new Error('Could not encode the cropped image')

  return new File([blob], renameForExt(file.name, ext), { type })
}
