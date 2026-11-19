-- Malifaux Buried: a yearly "Wrapped"-style recap per player.
-- buried_year is one row per edition (card back, cutoff, publish gate);
-- buried_player holds each player's deck of cards as a frozen JSONB snapshot.

CREATE TABLE buried_year (
  year integer PRIMARY KEY,
  -- Data window is [year-01-01, cutoff_date).
  cutoff_date date NOT NULL,
  card_back_image_key text,
  -- The site 404s until this is set.
  published_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE buried_player (
  player_id integer NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  year integer NOT NULL REFERENCES buried_year(year) ON DELETE CASCADE,
  cards jsonb NOT NULL CHECK (jsonb_typeof(cards) = 'array'),
  -- 1200x630 link-preview image.
  summary_image_key text,
  generated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dm_sent_at timestamp without time zone,
  PRIMARY KEY (player_id, year)
);

CREATE INDEX idx_buried_player_year ON buried_player (year);

INSERT INTO buried_year (year, cutoff_date) VALUES (2026, '2026-12-01');
