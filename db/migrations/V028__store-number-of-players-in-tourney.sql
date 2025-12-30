ALTER TABLE tourney
    ADD COLUMN number_of_players INTEGER;

UPDATE tourney SET number_of_players = (SELECT COUNT(*) FROM result WHERE result.tourney_id = tourney.id);

ALTER TABLE tourney
    ALTER COLUMN number_of_players SET NOT NULL;