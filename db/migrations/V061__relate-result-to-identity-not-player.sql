ALTER TABLE result
ADD COLUMN player_identity_id INTEGER REFERENCES player_identity (id);

UPDATE result
SET
    player_identity_id = (
        SELECT
            id as player_identity_id
        FROM
            player_identity
        WHERE
            player_identity.player_id = result.player_id
    );

ALTER TABLE result
ALTER COLUMN player_identity_id
SET
    NOT NULL;

ALTER TABLE result
DROP COLUMN player_id;