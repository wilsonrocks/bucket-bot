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

/**
 * react-image-crop reports the selection as percentages of the displayed image, which
 * survives the element being resized. Scale it back onto the real pixel grid of the
 * (possibly rotated) source before we cut anything.
 */
export function percentCropToPixels(
  percent: { x: number; y: number; width: number; height: number },
  bounds: Size,
): CropArea {
  return {
    x: Math.round((percent.x / 100) * bounds.width),
    y: Math.round((percent.y / 100) * bounds.height),
    width: Math.round((percent.width / 100) * bounds.width),
    height: Math.round((percent.height / 100) * bounds.height),
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

function drawRotated(
  image: HTMLImageElement,
  rotation: number,
): HTMLCanvasElement {
  const bounds = computeRotatedBounds(
    image.naturalWidth,
    image.naturalHeight,
    rotation,
  )
  const canvas = document.createElement('canvas')
  canvas.width = bounds.width
  canvas.height = bounds.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available in this browser')

  ctx.translate(bounds.width / 2, bounds.height / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2)
  ctx.drawImage(image, 0, 0)
  return canvas
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Could not encode the image')),
      type,
      0.92,
    ),
  )
}

/**
 * An object URL showing `file` turned by `rotation`, for the cropper to display.
 * The caller owns the URL and must revoke it. Also hands back the rotated image's
 * dimensions, which is the pixel grid the crop selection will be relative to.
 */
export async function rotateImageToUrl(
  file: File,
  rotation: number,
): Promise<{ url: string; bounds: Size }> {
  const image = await loadImage(file)
  const bounds = computeRotatedBounds(
    image.naturalWidth,
    image.naturalHeight,
    rotation,
  )
  if (rotation === 0) {
    return { url: URL.createObjectURL(file), bounds }
  }
  const blob = await canvasToBlob(
    drawRotated(image, rotation),
    getOutputType(file.type).type,
  )
  return { url: URL.createObjectURL(blob), bounds }
}

/**
 * Apply a rotation and a crop to `file` entirely in the browser, returning a new
 * File ready to hand to the upload endpoint. `crop` is in pixels of the rotated
 * image, matching what `rotateImageToUrl` reports. Nothing is sent anywhere here.
 */
export async function cropImageFile(
  file: File,
  crop: CropArea,
  rotation: number,
): Promise<File> {
  const image = await loadImage(file)
  const rotated = drawRotated(image, rotation)

  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(crop.width))
  out.height = Math.max(1, Math.round(crop.height))
  const outCtx = out.getContext('2d')
  if (!outCtx) throw new Error('Canvas is not available in this browser')

  outCtx.drawImage(rotated, Math.round(-crop.x), Math.round(-crop.y))

  const { type, ext } = getOutputType(file.type)
  const blob = await canvasToBlob(out, type)

  return new File([blob], renameForExt(file.name, ext), { type })
}
