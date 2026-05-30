-- Dedicated image table storing intrinsic dimensions of uploaded images.
-- Keyed by the existing image key (e.g. "team/<hash>") so team.image_key /
-- painting_winner.image_key keep working as the reference; width/height let the
-- site reserve layout space (no jump) and build responsive srcset.

CREATE TABLE public.image (
    key        text PRIMARY KEY,
    width      integer NOT NULL,
    height     integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
