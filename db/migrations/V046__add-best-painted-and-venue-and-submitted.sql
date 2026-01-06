CREATE TABLE painting_winner (
    id SERIAL PRIMARY KEY,
    tourney_id INTEGER NOT NULL REFERENCES tourney(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    CHECK (position > 0),
    model TEXT NOT NULL,
    CONSTRAINT unique_tourney_player UNIQUE (tourney_id, player_id)
);

ALTER TABLE tourney ADD COLUMN is_submitted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tourney ADD COLUMN discord_post_id TEXT UNIQUE;