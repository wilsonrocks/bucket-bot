ALTER TABLE player_identity
ADD COLUMN provider_name TEXT;

UPDATE player_identity
SET
    provider_name = (
        SELECT
            name
        FROM
            player
        WHERE
            player.id = player_identity.player_id
    );

ALTER TABLE player_identity
ALTER COLUMN provider_name
SET
    NOT NULL;