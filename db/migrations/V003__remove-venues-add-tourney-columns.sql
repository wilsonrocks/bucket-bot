ALTER TABLE tourney DROP COLUMN venue_id;
ALTER TABLE tourney DROP COLUMN best_painted;
ALTER TABLE tourney DROP COLUMN best_sport;
ALTER TABLE tourney ADD COLUMN location TEXT;
ALTER TABLE tourney ADD COLUMN organiser_id INTEGER REFERENCES player(id) ON DELETE SET NULL;


DROP TABLE venue;

