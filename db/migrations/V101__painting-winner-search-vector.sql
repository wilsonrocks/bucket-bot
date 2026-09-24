-- Lets the site search find best-painted winners by what they painted (#94),
-- e.g. "sorrows" finds "Alt Sorrows".

ALTER TABLE painting_winner
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(model, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX idx_painting_winner_search_vector ON painting_winner USING gin (search_vector);
