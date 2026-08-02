-- Free-text description and location pulled from the Google Calendar event,
-- refreshed on each sync. location is the calendar's own location string and is
-- independent of the admin-assigned venue_id.

ALTER TABLE public.upcoming_event
    ADD COLUMN description text,
    ADD COLUMN location text;
