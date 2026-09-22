import { X } from 'lucide-react'
import { timeFormat } from 'd3-time-format'
import { Link } from '#/components/link'
import type { RegionEvent } from '#/components/animated-regions'

const formatPanelDate = timeFormat('%d %b %Y')

/**
 * The list of events sitting behind a selection on either regions map — a region
 * on the choropleth, or a venue on the point map.
 */
export function RegionEventsPanel({
  title,
  events,
  windowEnd,
  onClose,
}: {
  title: string
  events: RegionEvent[]
  /** YYYY-MM-DD; the window is the year ending here. */
  windowEnd: string
  onClose: () => void
}) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Year up to {formatPanelDate(new Date(windowEnd))}
          </p>
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
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No events here in this period.
        </p>
      ) : (
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
      )}
    </div>
  )
}
