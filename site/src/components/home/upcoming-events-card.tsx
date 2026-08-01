import { formatDate } from 'date-fns'
import { Link } from '#/components/link'

type UpcomingEvent = {
  id: number
  name: string
  startsAt: string
  location: string | null
  venueName: string | null
}

export function UpcomingEventsCard({ data }: { data: UpcomingEvent[] }) {
  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-2 text-lg font-semibold">Upcoming Events</h3>
      <div className="flex-1">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No upcoming events scheduled.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.map((event) => {
              const place = event.venueName ?? event.location
              return (
                <div key={event.id}>
                  <Link
                    to="/upcoming-event/$id"
                    params={{ id: event.id }}
                    className="font-semibold"
                  >
                    {event.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(new Date(event.startsAt), 'd MMM yyyy')}
                    {place ? ` · ${place}` : ''}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <Link to="/upcoming-events" className="mt-2 text-sm">
        All upcoming events →
      </Link>
    </div>
  )
}
