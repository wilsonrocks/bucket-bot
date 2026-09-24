-- Full-text search vectors for the public site's search box (#94), following
-- V099: 'simple' config (no stemming or stop words) so words match as typed.
-- Events and upcoming events include their venue/location so "leeds" finds
-- events held there.

ALTER TABLE tourney
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(venue, ''))
  ) STORED;

CREATE INDEX idx_tourney_search_vector ON tourney USING gin (search_vector);

ALTER TABLE team
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(name, ''))
  ) STORED;

CREATE INDEX idx_team_search_vector ON team USING gin (search_vector);

ALTER TABLE upcoming_event
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(location, ''))
  ) STORED;

CREATE INDEX idx_upcoming_event_search_vector ON upcoming_event USING gin (search_vector);
