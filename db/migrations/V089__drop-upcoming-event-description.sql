-- Drop the calendar description column; the organiser and venue/location are
-- what matter for an upcoming event, and the description often arrived as HTML.

ALTER TABLE public.upcoming_event DROP COLUMN description;
