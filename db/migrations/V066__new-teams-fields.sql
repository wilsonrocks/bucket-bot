ALTER TABLE public.team
    ADD COLUMN description text,
    ADD COLUMN venue_id integer REFERENCES public.venue(id),
    ADD COLUMN brand_colour text,
    ADD COLUMN image_key text;

ALTER TABLE public.membership
    ADD COLUMN is_captain boolean NOT NULL DEFAULT false;
