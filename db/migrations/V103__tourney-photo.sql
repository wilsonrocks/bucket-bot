CREATE TABLE tourney_photo (
  id serial PRIMARY KEY,
  tourney_id integer NOT NULL REFERENCES tourney(id) ON DELETE CASCADE,
  image_key text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tourney_photo_tourney_id ON tourney_photo (tourney_id, sort_order);
