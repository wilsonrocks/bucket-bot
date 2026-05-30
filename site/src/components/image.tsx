// Responsive image for assets stored on assets.malifaux.uk.
//
// Images are pre-resized at upload to a fixed ladder of widths (see
// ASSET_WIDTHS) and the original's intrinsic dimensions are stored in the DB.
// Passing those intrinsic `width`/`height` lets the browser reserve the correct
// aspect-ratio box before the image loads, preventing layout shift. Combine with
// a CSS height of `auto` (e.g. Tailwind `h-auto`) so the displayed size is driven
// by the layout, not the attributes.

const ASSETS_URL = import.meta.env.VITE_ASSETS_URL

// Keep in sync with IMAGE_WIDTHS in backend/routes/v1/v1-routes/upload.ts.
const ASSET_WIDTHS = [35, 150, 400, 800, 1200] as const

/** Build a `srcset` value listing every pre-resized width variant for a key. */
export function buildSrcSet(imageKey: string): string {
  return ASSET_WIDTHS.map((w) => `${ASSETS_URL}/${imageKey}-w${w}.webp ${w}w`).join(', ')
}

type ImageProps = {
  /** Base key, e.g. "team/<hash>". Variants are "<key>-w<width>.png". */
  imageKey: string
  /** Intrinsic dimensions of the original, used to reserve layout space. */
  width?: number | null
  height?: number | null
  alt: string
  /** `sizes` hint for srcset; defaults to 100vw. */
  sizes?: string
  className?: string
  /** Width variant used for the `src` fallback (non-srcset browsers). */
  fallbackWidth?: (typeof ASSET_WIDTHS)[number]
  loading?: 'lazy' | 'eager'
}

export function Image({
  imageKey,
  width,
  height,
  alt,
  sizes = '100vw',
  className,
  fallbackWidth = 800,
  loading = 'lazy',
}: ImageProps) {
  return (
    <img
      src={`${ASSETS_URL}/${imageKey}-w${fallbackWidth}.webp`}
      srcSet={buildSrcSet(imageKey)}
      sizes={sizes}
      width={width ?? undefined}
      height={height ?? undefined}
      alt={alt}
      loading={loading}
      decoding="async"
      className={className}
    />
  )
}
