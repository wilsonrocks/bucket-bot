-- One BOT event maps to one tourney, as longshanks_id already enforces. The
-- importer checks for an existing row first, but only the constraint stops two
-- concurrent imports of the same event both getting through. The constraint
-- brings its own index, so the plain one is now redundant.
ALTER TABLE tourney ADD CONSTRAINT tourney_bot_id_key UNIQUE (bot_id);

DROP INDEX idx_tourney_bot_id;
