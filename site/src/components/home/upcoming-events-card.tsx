import { formatDate } from 'date-fns'

type UpcomingEvent = {
  id: number
  name: string
  startsAt: string
  description: string | null
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
                  <p className="font-semibold">{event.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(new Date(event.startsAt), 'd MMM yyyy')}
                    {place ? ` · ${place}` : ''}
                  </p>
                  {event.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {event.description}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
