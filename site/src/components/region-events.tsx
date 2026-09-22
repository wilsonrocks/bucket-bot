import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { timeFormat } from 'd3-time-format'
import { Link } from '#/components/link'
import type { RegionEvent } from '#/components/animated-regions'

const formatPanelDate = timeFormat('%d %b %Y')

/** The events behind a selection, however that selection is being presented. */
function RegionEventsList({ events }: { events: RegionEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No events here in this period.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {events.map((event) => {
        const place = event.venueName ?? event.town
        return (
          <div key={event.id}>
            <Link
              to="/event/$id"
              params={{ id: event.id }}
              search={{ tab: undefined, painting: undefined }}
              className="font-semibold"
            >
              {event.name}
            </Link>
            <p className="text-sm text-muted-foreground">
              {formatPanelDate(new Date(event.date))}
              {place ? ` · ${place}` : ''}
              {event.players ? ` · ${event.players} players` : ''}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function windowLabel(windowEnd: string) {
  return `Year up to ${formatPanelDate(new Date(windowEnd))}`
}

type RegionEventsProps = {
  title: string
  events: RegionEvent[]
  /** YYYY-MM-DD; the window is the year ending here. */
  windowEnd: string
  onClose: () => void
}

/**
 * The events list as a card below the map — used where there's room to show it
 * alongside without covering anything.
 */
export function RegionEventsPanel({
  title,
  events,
  windowEnd,
  onClose,
}: RegionEventsProps) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{windowLabel(windowEnd)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close events list"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded hover:bg-muted"
        >
          <X size={16} />
        </button>
      </div>
      <RegionEventsList events={events} />
    </div>
  )
}

/**
 * The same list as a modal, for narrow screens where a panel below the map would
 * open off-screen and make the dots look like they did nothing.
 */
export function RegionEventsModal({
  title,
  events,
  windowEnd,
  onClose,
}: RegionEventsProps) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-fade fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[80vh] w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-surface p-5 shadow-xl">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                {windowLabel(windowEnd)}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close events list"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded hover:bg-muted"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>
          <RegionEventsList events={events} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
