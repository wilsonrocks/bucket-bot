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

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Could not encode the image')),
      type,
      quality,
    ),
  )
}

/**
 * What we aim to send. The backend accepts up to 30 MB, but canvas re-encodes can
 * balloon (a photo saved as PNG easily triples), and nothing downstream needs more
 * than a few thousand pixels — the largest served variant is 1200px wide.
 */
export const TARGET_UPLOAD_BYTES = 10 * 1024 * 1024

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/** Encode the current image at `scale` of its full size. */
export type Encoder = (
  scale: number,
  type: string,
  quality: number,
) => Promise<Blob>

const LOSSY_QUALITY = 0.85
const MAX_SHRINK_ATTEMPTS = 8

/**
 * Encode via `encode`, backing off until the result fits in `maxBytes`: first the
 * normal encode, then a lossy format (PNG → WebP, keeping transparency), then
 * progressively smaller dimensions, sized from how far over the last attempt was.
 */
export async function encodeWithinLimit(
  encode: Encoder,
  preferredType: string,
  maxBytes: number,
): Promise<Blob> {
  const first = await encode(1, preferredType, 0.92)
  if (first.size <= maxBytes) return first

  let lossy = preferredType === 'image/png' ? 'image/webp' : preferredType
  let scale = 1
  for (let i = 0; i < MAX_SHRINK_ATTEMPTS; i++) {
    const blob = await encode(scale, lossy, LOSSY_QUALITY)
    // Browsers that can't encode WebP (older Safari) silently hand back a PNG.
    if (blob.type !== lossy && lossy !== 'image/jpeg') {
      lossy = 'image/jpeg'
      continue
    }
    if (blob.size <= maxBytes) return blob
    // Bytes scale roughly with pixel count, i.e. with scale². Aim a little under,
    // and always shrink by at least 10% so we can't stall.
    scale *= Math.min(0.9, Math.sqrt(maxBytes / blob.size) * 0.95)
  }
  throw new Error(
    `Could not shrink that image under ${Math.round(maxBytes / 1024 / 1024)} MB`,
  )
}

function canvasEncoder(
  source: CanvasImageSource,
  width: number,
  height: number,
): Encoder {
  return (scale, type, quality) => {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not available in this browser')
    // JPEG has no alpha; without a backdrop transparent pixels come out black.
    if (type === 'image/jpeg') {
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    return canvasToBlob(canvas, type, quality)
  }
}

function blobToFile(blob: Blob, originalName: string): File {
  const { type, ext } = getOutputType(blob.type)
  return new File([blob], renameForExt(originalName, ext), { type })
}

/**
 * Make sure `file` is something the upload endpoint will take: an accepted type
 * and under `maxBytes`. Files that already are pass through untouched; anything
 * else is re-encoded (and shrunk if need be) in the browser.
 */
export async function fitImageForUpload(
  file: File,
  maxBytes = TARGET_UPLOAD_BYTES,
): Promise<File> {
  if (file.size <= maxBytes && ACCEPTED_TYPES.includes(file.type)) return file
  const image = await loadImage(file)
  const blob = await encodeWithinLimit(
    canvasEncoder(image, image.naturalWidth, image.naturalHeight),
    getOutputType(file.type).type,
    maxBytes,
  )
  return blobToFile(blob, file.name)
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
  maxBytes = TARGET_UPLOAD_BYTES,
): Promise<File> {
  const image = await loadImage(file)
  const rotated = drawRotated(image, rotation)

  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(crop.width))
  out.height = Math.max(1, Math.round(crop.height))
  const outCtx = out.getContext('2d')
  if (!outCtx) throw new Error('Canvas is not available in this browser')

  outCtx.drawImage(rotated, Math.round(-crop.x), Math.round(-crop.y))

  // Always re-encode, even for an untouched full-frame crop: drawing through the
  // canvas bakes in EXIF orientation, which the backend's sharp pipeline ignores.
  const blob = await encodeWithinLimit(
    canvasEncoder(out, out.width, out.height),
    getOutputType(file.type).type,
    maxBytes,
  )
  return blobToFile(blob, file.name)
}
