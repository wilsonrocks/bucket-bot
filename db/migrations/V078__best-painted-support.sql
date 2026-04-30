-- Add best-painted feature support to painting_winner table

-- Drop existing foreign key and index for player_id
ALTER TABLE public.painting_winner
DROP CONSTRAINT painting_winner_player_id_fkey;

DROP INDEX idx_painting_winner_player_id;

-- Drop player_id column
ALTER TABLE public.painting_winner
DROP COLUMN player_id;

-- Add player_identity_id column with foreign key
ALTER TABLE public.painting_winner
ADD COLUMN player_identity_id INTEGER NOT NULL REFERENCES player_identity(id) ON DELETE CASCADE;

-- Make model column nullable
ALTER TABLE public.painting_winner
ALTER COLUMN model DROP NOT NULL;

-- Add new columns for best-painted feature
ALTER TABLE public.painting_winner
ADD COLUMN image_key TEXT,
ADD COLUMN description TEXT;

-- Create index on player_identity_id
CREATE INDEX idx_painting_winner_player_identity_id ON public.painting_winner(player_identity_id);
