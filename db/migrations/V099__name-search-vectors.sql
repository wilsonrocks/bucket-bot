-- Full-text search over names. Unlike trigram similarity, which compares the
-- query with the whole string, this matches individual words, so "radek" finds
-- "Radek (washed up weak player)". 'simple' means no stemming or stop words,
-- which is right for names.

ALTER TABLE player
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(short_name, ''))
  ) STORED;

CREATE INDEX idx_player_search_vector ON player USING gin (search_vector);

ALTER TABLE discord_user
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce(discord_username, '') || ' ' ||
      coalesce(discord_display_name, '') || ' ' ||
      coalesce(discord_nickname, '')
    )
  ) STORED;

CREATE INDEX idx_discord_user_search_vector ON discord_user USING gin (search_vector);
