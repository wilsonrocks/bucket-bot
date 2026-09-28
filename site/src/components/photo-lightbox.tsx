import * as Dialog from '@radix-ui/react-dialog'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Image } from '#/components/image'

export type LightboxPhoto = {
  id: number
  imageKey: string
  caption: string | null
  imageWidth: number | null
  imageHeight: number | null
}

/** Shows one photo from `photos` full size, with previous/next navigation. */
export function PhotoLightbox({
  photos,
  activeId,
  title,
  onChange,
}: {
  photos: LightboxPhoto[]
  activeId: number | undefined
  /** Fallback heading and alt text for photos without a caption. */
  title: string
  onChange: (id: number | undefined) => void
}) {
  const index = photos.findIndex((p) => p.id === activeId)
  const photo = index >= 0 ? photos[index] : null
  const prev = index > 0 ? photos[index - 1] : null
  const next = index >= 0 && index < photos.length - 1 ? photos[index + 1] : null

  return (
    <Dialog.Root open={!!photo} onOpenChange={(open) => !open && onChange(undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-fade fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[95vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-surface p-6 shadow-xl"
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' && prev) onChange(prev.id)
            if (e.key === 'ArrowRight' && next) onChange(next.id)
          }}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold">
              {photo?.caption ?? title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          {photo && (
            <>
              <Image
                imageKey={photo.imageKey}
                width={photo.imageWidth}
                height={photo.imageHeight}
                alt={photo.caption ?? title}
                sizes="(max-width: 896px) 95vw, 896px"
                fallbackWidth={1200}
                loading="eager"
                className="max-h-[70vh] w-full rounded-sm object-contain"
              />
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-muted disabled:invisible"
                  disabled={!prev}
                  onClick={() => prev && onChange(prev.id)}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span>
                  {index + 1} of {photos.length}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-muted disabled:invisible"
                  disabled={!next}
                  onClick={() => next && onChange(next.id)}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
