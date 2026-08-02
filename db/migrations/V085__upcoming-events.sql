-- Upcoming Malifaux events synced from a Google Calendar on a daily cron.
-- google_event_id is the calendar item id, used as the upsert key so re-syncs
-- refresh name/date without clobbering the admin-assigned venue_id. Events
-- removed from the calendar (future ones) are deleted by the sync job.

CREATE TABLE public.upcoming_event (
    id              serial PRIMARY KEY,
    google_event_id text NOT NULL UNIQUE,
    name            text NOT NULL,
    starts_at       timestamp with time zone NOT NULL,
    venue_id        integer REFERENCES public.venue(id),
    created_at      timestamp with time zone DEFAULT now() NOT NULL
);
