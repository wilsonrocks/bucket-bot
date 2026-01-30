ALTER TABLE tourney
ADD COLUMN organiser_discord_id TEXT;

UPDATE tourney
SET
    organiser_discord_id = (
        SELECT
            discord_user_id
        FROM
            discord_user
            JOIN player ON discord_user.discord_user_id = player.discord_id
        WHERE
            player.id = tourney.organiser_id
    );

ALTER TABLE tourney
DROP COLUMN organiser_id