-- Record the original upload's real file extension (png | jpg | webp) so the
-- raw original is locatable for regeneration. The original is kept in whatever
-- format the user uploaded; on-site variants are served as WebP.

ALTER TABLE public.image ADD COLUMN original_ext text;
