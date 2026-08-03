-- created_at has always been populated by its CURRENT_TIMESTAMP default and has
-- no null rows; make that guarantee explicit so queries can order by it.
ALTER TABLE player_identity
    ALTER COLUMN created_at SET NOT NULL;
