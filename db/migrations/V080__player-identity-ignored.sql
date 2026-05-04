ALTER TABLE public.player_identity
    ADD COLUMN is_ignored boolean NOT NULL DEFAULT false;
