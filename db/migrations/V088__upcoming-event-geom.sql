-- Geocoded coordinates for an upcoming event, derived by extracting a UK
-- postcode from the calendar location and running it through postcodes.io (the
-- same geocoder used for venues). Mirrors venue.geom / venue.region_id. Left
-- null when no postcode can be extracted or the lookup fails.

ALTER TABLE public.upcoming_event
    ADD COLUMN geom public.geometry(Point,4326),
    ADD COLUMN region_id integer REFERENCES public.region(id);
